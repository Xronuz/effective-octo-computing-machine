"""
XAVFSIZ XONADON — Muammo xizmati.
Biznes-logika: yaratish, ro'yxat, yangilash, yopish, fotolar.
"""
import logging
from datetime import date, datetime, timedelta, timezone
from math import ceil
from typing import Optional
from uuid import UUID

from sqlalchemy import select, func, and_, or_, case
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.muammo import (
    Muammo, Foto, MuammoStatus, MuammoTuri, XavfDarajasi, FotoTuri, TekshiruvNatijasi,
    TEKSHIRUV_NATIJASI_NOMLARI, SHUBHALI_SABAB_NOMLARI,
)
from app.models.hudud import Xonadon, Kocha, Mfy
from app.models.user import User, UserRole
from app.core.exceptions import (
    NotFoundException, ForbiddenException, ValidationException, ConflictException,
)
from app.services.geo import haversine_m
from app.services.vaqt import TOSHKENT_TZ, bugun_toshkent, kun_boshi_utc
from app.services.xonadon import egasi_korish_huquqi

logger = logging.getLogger("xavfsiz_xonadon")

# EXIF GPS va muammo koordinatasi orasidagi ruxsat etilgan maksimal masofa (metr)
EXIF_MAX_MASOFA_M = 200.0


async def bugungi_tekshiruv(
    db: AsyncSession,
    *,
    xonadon_id: int,
    xodim_id: int,
    kun: date | None = None,
) -> Muammo | None:
    """Shu xodim shu xonadonni berilgan kunda TEKSHIRGAN bo'lsa, o'sha yozuv.

    `kira_olmadi` tashriflar hisobga olinmaydi — ular tekshiruv emas, balki
    qayta urinish (uyda hech kim bo'lmagan), shuning uchun kun davomida
    cheklanmaydi.

    Kun chegaralari Toshkent vaqti bo'yicha (baza UTC saqlaydi).
    """
    kun = kun or bugun_toshkent()
    natija = await db.execute(
        select(Muammo)
        .where(
            Muammo.xonadon_id == xonadon_id,
            Muammo.xodim_id == xodim_id,
            Muammo.tekshiruv_natijasi != TekshiruvNatijasi.kira_olmadi,
            Muammo.sinxron_vaqti >= kun_boshi_utc(kun),
            Muammo.sinxron_vaqti < kun_boshi_utc(kun + timedelta(days=1)),
        )
        .order_by(Muammo.sinxron_vaqti.desc())
        .limit(1)
    )
    return natija.scalar_one_or_none()


async def create_muammo(
    db: AsyncSession,
    xodim: User,
    *,
    xonadon_id: int,
    turi: str | None,
    tavsif: str | None,
    xavf: str,
    lat: float,
    lng: float,
    gps_aniqlik: float | None,
    mock_gps: bool,
    client_uuid: UUID,
    qurilma_vaqti: datetime,
    ornida_bartaraf: bool = False,
    muddat: date | None = None,
    has_keyin_foto: bool = False,
    fotos_sha256_list: list[str] | None = None,
    taklif_etilgan_tadbirlar: str | None = None,
    yoriqnomadan_otkanlar_soni: int | None = None,
    kira_olmadi: bool = False,
    majburiy: bool = False,
) -> tuple[Muammo, bool]:
    """Yangi muammo yoki tekshiruv qayd etish.

    `turi` va `taklif_etilgan_tadbirlar` ikkalasi ham bo'sh bo'lsa, bu
    "tekshirildi, muammo topilmadi" tashrifi hisoblanadi — status darhol
    yopilgan bo'ladi va Telegram/WebSocket bildirishnomalari yuborilmaydi.

    `kira_olmadi=True` — xodim xonadonga kira olmadi (uyda hech kim yo'q,
    eshik ochilmadi va h.k.). Bu ham "muammo topilmadi" kabi darhol
    yopilgan hisoblanadi, lekin alohida `tekshiruv_natijasi` bilan
    belgilanadi — chunki xonadon haqiqatda TEKSHIRILMAGAN va "bugun
    tekshirilganlar" hisobiga kirmasligi kerak (xonadon.py service'da
    filtrlanadi), qayta tashrif uchun navbatda qoladi.

    KUNLIK TAKRORLANISH QOIDASI (yumshoq): bir xonadon bir kunda bir marta
    tekshiriladi. Shu kuni allaqachon haqiqiy tekshiruv (muammo_topildi yoki
    muammo_yoq) qayd etilgan bo'lsa, yangi tekshiruv 409 bilan rad etiladi.
    `majburiy=True` berilsa o'tkaziladi, lekin yozuv `shubhali` deb
    belgilanadi — dala sharoitida istisno bo'ladi (masalan birinchi yozuv
    xato kiritilgan), ammo bu rahbar nazoratidan chetda qolmasligi kerak.
    `kira_olmadi` tashriflar bu qoidaga tushmaydi — ular tekshiruv emas,
    qayta urinish, shuning uchun kun davomida cheklanmaydi.

    Qaytaradi: (muammo, dublikat) — dublikat=True bo'lsa, client_uuid bazada
    mavjud bo'lgani uchun mavjud muammo qaytarilgan (idempotent qayta yuborish).
    """
    # Xonadon mavjudligini tekshirish (manzil uchun kocha/MFY bilan)
    result = await db.execute(
        select(Xonadon)
        .options(selectinload(Xonadon.kocha).selectinload(Kocha.mfy))
        .where(Xonadon.id == xonadon_id)
    )
    xonadon = result.scalar_one_or_none()
    if xonadon is None:
        raise NotFoundException("Xonadon", xonadon_id)

    # Idempotent client_uuid tekshiruvi (offline sinxronlash xavfsizligi):
    # takroriy yuborishda xato tashlamaymiz — mavjud muammoni qaytaramiz
    result = await db.execute(
        select(Muammo).where(Muammo.client_uuid == client_uuid)
    )
    existing = result.scalar_one_or_none()
    if existing is not None:
        logger.info(
            f"Takroriy client_uuid qabul qilindi (idempotent): client_uuid={client_uuid}, "
            f"mavjud muammo_id={existing.id}"
        )
        return existing, True

    # Shubhali tekshiruvi — mock GPS yoki juda tez ketma-ket
    shubhali = False
    shubhali_sabab: str | None = None
    if mock_gps:
        shubhali = True
        shubhali_sabab = "mock_gps"

    # GPS aniqlik juda past bo'lsa
    if gps_aniqlik and gps_aniqlik > 100:  # 100 metrdan yomon
        shubhali = True
        if shubhali_sabab is None:
            shubhali_sabab = "gps_aniqlik_past"

    # Muammo topilganmi? — legacy turi bilan yoki yangi checklist orqali
    # (taklif_etilgan_tadbirlar'da band raqamlari bo'lsa) aniqlanadi.
    # Ikkalasi ham bo'sh bo'lsa — "tekshirildi, muammo yo'q" tashrifi.
    # Kira olmagan tashrifda muammo aniqlanishi mumkin emas — checklist
    # ma'lumotlari e'tiborsiz qoldiriladi.
    muammo_topildi = not kira_olmadi and (
        bool(turi) or bool(taklif_etilgan_tadbirlar and taklif_etilgan_tadbirlar.strip())
    )

    if kira_olmadi:
        turi = None
        taklif_etilgan_tadbirlar = None
        tekshiruv_natijasi = TekshiruvNatijasi.kira_olmadi
    elif muammo_topildi:
        tekshiruv_natijasi = TekshiruvNatijasi.muammo_topildi
    else:
        tekshiruv_natijasi = TekshiruvNatijasi.muammo_yoq

    # Kunlik takrorlanish qoidasi — `kira_olmadi` bundan mustasno
    if not kira_olmadi:
        oldingi = await bugungi_tekshiruv(db, xonadon_id=xonadon_id, xodim_id=xodim.id)
        if oldingi is not None:
            if not majburiy:
                vaqt = (
                    oldingi.sinxron_vaqti.astimezone(TOSHKENT_TZ).strftime("%H:%M")
                    if oldingi.sinxron_vaqti
                    else "?"
                )
                raise ConflictException(
                    f"Bu xonadon bugun allaqachon tekshirilgan ({vaqt}). "
                    f"Baribir yozish kerak bo'lsa, takroriy tekshiruvni tasdiqlang."
                )
            # Majburiy takror — rahbar nazorati uchun belgilab qo'yamiz
            shubhali = True
            if shubhali_sabab is None:
                shubhali_sabab = "kunlik_takror"
            logger.warning(
                "Majburiy takroriy tekshiruv: xonadon_id=%s, xodim=%s, oldingi_muammo_id=%s",
                xonadon_id,
                xodim.guvohnoma_raqami,
                oldingi.id,
            )

    if muammo_topildi:
        # ornida_bartaraf validatsiyasi — faqat haqiqiy muammo uchun
        if ornida_bartaraf and not has_keyin_foto:
            raise ValidationException(
                "O'rnida bartaraf etilgan muammo uchun 'keyin' foto majburiy."
            )
        if not ornida_bartaraf and muddat is None:
            raise ValidationException(
                "Bartaraf etilmagan muammo uchun muddat belgilashingiz majburiy."
            )
    else:
        # Tekshirildi, muammo yo'q — bartaraf/muddat holatiga oid maydonlar
        # ma'nosiz, tozalab qo'yamiz.
        ornida_bartaraf = False
        muddat = None

    # Foto SHA256 dublikat tekshiruvi
    if fotos_sha256_list:
        result_existing = await db.execute(
            select(Foto).where(Foto.sha256.in_(fotos_sha256_list))
        )
        existing_sha = result_existing.scalars().all()
        if existing_sha:
            shubhali = True
            if shubhali_sabab is None:
                shubhali_sabab = "foto_sha256_dublikat"
            logger.warning(
                f"Dublikat foto SHA256 aniqlandi: muammo yaratuvchi={xodim.guvohnoma_raqami}, "
                f"sha256={[f.sha256[:12] for f in existing_sha]}"
            )

    muammo = Muammo(
        xonadon_id=xonadon_id,
        xodim_id=xodim.id,
        turi=MuammoTuri(turi) if turi else None,
        tavsif=tavsif,
        xavf=XavfDarajasi(xavf),
        tekshiruv_natijasi=tekshiruv_natijasi,
        lat=lat,
        lng=lng,
        gps_aniqlik=gps_aniqlik,
        mock_gps=mock_gps,
        shubhali=shubhali,
        shubhali_sabab=shubhali_sabab,
        client_uuid=client_uuid,
        qurilma_vaqti=qurilma_vaqti,
        taklif_etilgan_tadbirlar=taklif_etilgan_tadbirlar,
        yoriqnomadan_otkanlar_soni=yoriqnomadan_otkanlar_soni,
    )

    # ornida_bartaraf bo'lsa — status darhol yopilgan, aks holda muddat belgilansin.
    # Muammo topilmagan (tekshirildi) tashrif ham darhol yopilgan hisoblanadi —
    # kuzatib boriladigan hech narsa yo'q.
    if ornida_bartaraf or not muammo_topildi:
        muammo.ornida_bartaraf = ornida_bartaraf
        muammo.status = MuammoStatus.yopilgan
        muammo.yopilgan_sana = datetime.now(timezone.utc)
        muammo.yopgan_id = xodim.id
    else:
        muammo.status = MuammoStatus.ochiq
        muammo.muddat = muddat

    db.add(muammo)
    await db.flush()
    await db.refresh(muammo)

    logger.info(
        f"Yangi {'muammo' if muammo_topildi else 'tekshiruv (muammo topilmadi)'}: "
        f"id={muammo.id}, turi={turi}, xodim={xodim.guvohnoma_raqami}"
    )

    # Muammo topilmagan (oddiy tekshiruv) tashriflar uchun Telegram/WebSocket
    # bildirishnomalari yuborilmaydi — har kunlik tekshiruvlar oqimi
    # bildirishnomalarni spam qilib qo'ymasligi kerak. Shubhali (mock GPS
    # va h.k.) signal esa firibgarlikni aniqlash uchun muhim bo'lgani sabab
    # muammo topilgan-topilmaganidan qat'i nazar yuboriladi.
    if muammo_topildi:
        # Telegram avtopost — xatolik asosiy oqimni sindirmasligi kerak
        try:
            muammo.xonadon = xonadon
            muammo.xodim = xodim
            from app.services.telegram_xabar import yangi_muammo_xabar
            await yangi_muammo_xabar(muammo)
        except Exception as e:
            logger.error(f"Telegram avtopost (yangi muammo) xatolik: {e}")

    # WebSocket broadcast — o'ng panel jonli yangilanishi (xatolik oqimni sindirmaydi)
    try:
        muammo.fotolar = []  # yangi muammo — lazy load'ga tushmasligi uchun
        if muammo_topildi:
            from app.ws.manager import broadcast_xavfsiz
            await broadcast_xavfsiz({
                "type": "yangi_muammo",
                "muammo": _muammo_to_response(muammo, xodim),
            })
        if shubhali:
            from app.ws.manager import broadcast_xavfsiz
            await broadcast_xavfsiz({
                "type": "shubhali",
                "muammo_id": muammo.id,
                "sabab": shubhali_sabab or "noma'lum",
            })
    except Exception as e:
        logger.error(f"WebSocket broadcast (yangi muammo) xatolik: {e}")

    return muammo, False


async def get_muammo(db: AsyncSession, muammo_id: int) -> Muammo:
    """Muammoni ID bo'yicha olish (barcha fotolar bilan)."""
    result = await db.execute(
        select(Muammo)
        .options(
            selectinload(Muammo.fotolar),
            selectinload(Muammo.xonadon).selectinload(Xonadon.kocha).selectinload(Kocha.mfy),
            selectinload(Muammo.xodim),
        )
        .where(Muammo.id == muammo_id)
    )
    muammo = result.scalar_one_or_none()
    if muammo is None:
        raise NotFoundException("Muammo", muammo_id)
    return muammo


async def list_muammolar(
    db: AsyncSession,
    *,
    status: str | None = None,
    turi: str | None = None,
    xavf: str | None = None,
    mfy_id: int | None = None,
    xonadon_id: int | None = None,
    xodim_id: int | None = None,
    shubhali: bool | None = None,
    shubhali_sabab: str | None = None,
    ornida_bartaraf: bool | None = None,
    tadbirlar_soni_dan: int | None = None,
    tekshiruv_natijasi: str | None = None,
    sana_dan: date | None = None,
    sana_gacha: date | None = None,
    qidiruv: str | None = None,
    page: int = 1,
    size: int = 20,
) -> tuple[list[Muammo], int]:
    """Muammolar (tashriflar) ro'yxati — filtrlash va sahifalash bilan.

    Diqqat: bu jadval har qanday tashrifni saqlaydi — muammo topilgan,
    muammo topilmagan va xonadonga kira olmagan holatlar. Faqat haqiqiy
    muammolarni olish uchun `tekshiruv_natijasi="muammo_topildi"` bering.

    `sana_dan`/`sana_gacha` — Toshkent kunlari bo'yicha yarim ochiq oraliq
    [sana_dan 00:00, sana_gacha 00:00) (baza UTC saqlaydi, o'girib beriladi).
    """
    query = select(Muammo).options(
        selectinload(Muammo.fotolar),
        selectinload(Muammo.xonadon).selectinload(Xonadon.kocha).selectinload(Kocha.mfy),
        selectinload(Muammo.xodim),
    )

    count_query = select(func.count(Muammo.id))

    # Filtrlar
    filters = []

    if status:
        try:
            filters.append(Muammo.status == MuammoStatus(status))
        except ValueError:
            logger.warning("Noto'g'ri status filtri: %s — e'tiborga olinmadi", status)

    if turi:
        try:
            filters.append(Muammo.turi == MuammoTuri(turi))
        except ValueError:
            logger.warning("Noto'g'ri turi filtri: %s — e'tiborga olinmadi", turi)

    if xavf:
        try:
            filters.append(Muammo.xavf == XavfDarajasi(xavf))
        except ValueError:
            logger.warning("Noto'g'ri xavf filtri: %s — e'tiborga olinmadi", xavf)

    if tekshiruv_natijasi:
        try:
            filters.append(Muammo.tekshiruv_natijasi == TekshiruvNatijasi(tekshiruv_natijasi))
        except ValueError:
            logger.warning(
                "Noto'g'ri tekshiruv_natijasi filtri: %s — e'tiborga olinmadi",
                tekshiruv_natijasi,
            )

    if xodim_id is not None:
        filters.append(Muammo.xodim_id == xodim_id)

    if shubhali is not None:
        filters.append(Muammo.shubhali == shubhali)

    if shubhali_sabab:
        filters.append(Muammo.shubhali_sabab == shubhali_sabab)

    if ornida_bartaraf is not None:
        filters.append(Muammo.ornida_bartaraf == ornida_bartaraf)

    # Taklif etilgan tadbirlar soni (vergul bilan ajratilgan ro'yxat) — shundan
    # katta bo'lganlar. Bo'sh/NULL matn 0 ta tadbir deb hisoblanadi.
    if tadbirlar_soni_dan is not None:
        tadbirlar_soni = func.coalesce(
            func.array_length(
                func.string_to_array(
                    func.nullif(func.trim(Muammo.taklif_etilgan_tadbirlar), ''), ','
                ),
                1,
            ),
            0,
        )
        filters.append(tadbirlar_soni > tadbirlar_soni_dan)

    # MFY bo'yicha filtrlash — xonadon → kocha → mfy
    if mfy_id is not None:
        query = query.join(Muammo.xonadon).join(Xonadon.kocha).join(Kocha.mfy)
        count_query = count_query.join(Muammo.xonadon).join(Xonadon.kocha).join(Kocha.mfy)
        filters.append(Mfy.id == mfy_id)

    # Xonadon bo'yicha filtrlash
    if xonadon_id is not None:
        filters.append(Muammo.xonadon_id == xonadon_id)

    # Sana oralig'i
    # Sana chegaralari Toshkent kuni bo'yicha (baza UTC saqlaydi) — aks holda
    # mahalliy 00:00–05:00 oralig'idagi tashriflar oldingi kunga tushib qolardi.
    if sana_dan:
        filters.append(Muammo.sinxron_vaqti >= kun_boshi_utc(sana_dan))
    if sana_gacha:
        filters.append(Muammo.sinxron_vaqti < kun_boshi_utc(sana_gacha))

    # Manzil/tavsif bo'yicha qidiruv
    if qidiruv:
        search_term = f"%{qidiruv}%"
        # Xonadon manzili yoki tavsif bo'yicha
        query = query.outerjoin(Muammo.xonadon).outerjoin(Xonadon.kocha)
        count_query = count_query.outerjoin(Muammo.xonadon).outerjoin(Xonadon.kocha)
        filters.append(
            or_(
                Muammo.tavsif.ilike(search_term),
                Xonadon.uy_raqami.ilike(search_term),
                Kocha.nomi.ilike(search_term),
            )
        )

    # Filtrlarni qo'llash
    if filters:
        query = query.where(and_(*filters))
        count_query = count_query.where(and_(*filters))

    # Saralash: eng yangi avval
    query = query.order_by(Muammo.sinxron_vaqti.desc())

    # Jami son
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # Sahifalash
    query = query.offset((page - 1) * size).limit(size)

    result = await db.execute(query)
    items = result.unique().scalars().all()

    return list(items), total


async def update_muammo(
    db: AsyncSession,
    muammo: Muammo,
    yangilovchi: User,
    *,
    status: str | None = None,
    ornida_bartaraf: bool | None = None,
    muddat: date | None = None,
    xavf: str | None = None,
    tashkilot: str | None = None,
) -> Muammo:
    """Muammo holatini yangilash."""
    yangi_yopilgan = False
    if status is not None:
        try:
            muammo.status = MuammoStatus(status)
        except ValueError:
            raise ValidationException(f"Noto'g'ri status: {status}")

        if status == "yopilgan":
            muammo.yopilgan_sana = datetime.now(timezone.utc)
            muammo.yopgan_id = yangilovchi.id
            yangi_yopilgan = True
        elif status == "muddati_otgan":
            logger.debug("muddati_otgan statusi tizim tomonidan avtomatik belgilanadi — qo'lda o'zgartirish e'tiborga olinmadi")

    if ornida_bartaraf is not None:
        muammo.ornida_bartaraf = ornida_bartaraf

    if muddat is not None:
        muammo.muddat = muddat
        muammo.muddat_belgilagan_id = yangilovchi.id

    if xavf is not None:
        try:
            muammo.xavf = XavfDarajasi(xavf)
        except ValueError:
            raise ValidationException(f"Noto'g'ri xavf darajasi: {xavf}")

    if tashkilot is not None:
        muammo.tashkilot = tashkilot
        muammo.tashkilotga_sana = datetime.now(timezone.utc)

    await db.flush()
    await db.refresh(muammo)

    logger.info(f"Muammo yangilandi: id={muammo.id}, status={muammo.status}")

    # Telegram avtopost — bartaraf etilganda (xatolik asosiy oqimni sindirmaydi)
    if yangi_yopilgan:
        try:
            from app.services.telegram_xabar import bartaraf_xabar
            await bartaraf_xabar(muammo)
        except Exception as e:
            logger.error(f"Telegram avtopost (bartaraf) xatolik: {e}")

    return muammo


async def add_fotos_to_muammo(
    db: AsyncSession,
    muammo: Muammo,
    fotos: list[dict],
) -> list[Foto]:
    """Muammoga fotolar qo'shish.

    sha256 — server upload paytida original baytlardan hisoblagan hash
    (klient yuborgan qiymatga ishonmaymiz, u upload javobidan olingan).
    Boshqa muammoga bog'langan foto bilan bir xil sha256 topilsa yoki
    EXIF GPS muammo koordinatasidan 200 m dan uzoq bo'lsa — shubhali=True.
    """
    # SHA256 dublikat tekshiruvi — boshqa muammolarga bog'langan fotolar bilan
    avval_shubhali = muammo.shubhali
    shubhali_sabab: str | None = None
    sha_list = [f["sha256"] for f in fotos if f.get("sha256")]
    if sha_list:
        result_dup = await db.execute(
            select(Foto.sha256, Foto.muammo_id).where(
                Foto.sha256.in_(sha_list),
                Foto.muammo_id != muammo.id,
            )
        )
        dublikatlar = result_dup.all()
        if dublikatlar:
            muammo.shubhali = True
            shubhali_sabab = "foto_sha256_dublikat"
            logger.warning(
                f"Dublikat foto SHA256 aniqlandi (foto bog'lash): muammo_id={muammo.id}, "
                f"sha256={[d.sha256[:12] for d in dublikatlar]}"
            )

    foto_objs = []
    for f in fotos:
        foto = Foto(
            muammo_id=muammo.id,
            turi=FotoTuri(f["turi"]),
            fayl_yoli=f["fayl_yoli"],
            sha256=f["sha256"],
            exif_lat=f.get("exif_lat"),
            exif_lng=f.get("exif_lng"),
            exif_vaqt=_parse_exif_vaqt(f.get("exif_vaqt")),
            olcham_byte=f.get("olcham_byte"),
        )
        db.add(foto)
        foto_objs.append(foto)

        # EXIF GPS ↔ muammo koordinatasi masofa tekshiruvi (200 m)
        exif_lat = f.get("exif_lat")
        exif_lng = f.get("exif_lng")
        if exif_lat is not None and exif_lng is not None:
            masofa = haversine_m(muammo.lat, muammo.lng, exif_lat, exif_lng)
            if masofa > EXIF_MAX_MASOFA_M:
                muammo.shubhali = True
                if shubhali_sabab is None:
                    shubhali_sabab = "exif_masofa"
                logger.warning(
                    f"EXIF GPS muammo koordinatasidan uzoq: muammo_id={muammo.id}, "
                    f"masofa={masofa:.0f} m (> {EXIF_MAX_MASOFA_M:.0f} m)"
                )

    # Sabab bazaga ham yoziladi — avval faqat WebSocket xabariga qo'yilib
    # yo'qolardi va rahbar "nega shubhali" degan savolga javob topolmasdi.
    # Mavjud sabab qayta yozilmaydi (birinchi aniqlangani saqlanadi).
    if shubhali_sabab is not None and muammo.shubhali_sabab is None:
        muammo.shubhali_sabab = shubhali_sabab

    await db.flush()
    for f in foto_objs:
        await db.refresh(f)

    # WebSocket broadcast — shubhali yangi belgilanganda (xatolik oqimni sindirmaydi)
    if muammo.shubhali and not avval_shubhali and shubhali_sabab is not None:
        try:
            from app.ws.manager import broadcast_xavfsiz
            await broadcast_xavfsiz({
                "type": "shubhali",
                "muammo_id": muammo.id,
                "sabab": shubhali_sabab,
            })
        except Exception as e:
            logger.error(f"WebSocket broadcast (shubhali) xatolik: {e}")

    return foto_objs


async def xarita_muammolar(
    db: AsyncSession,
    *,
    min_lng: float,
    min_lat: float,
    max_lng: float,
    max_lat: float,
    status: str | None = None,
) -> list[dict]:
    """Xarita uchun bbox ichidagi muammolar — yengil GeoJSON feature ro'yxati.

    Faqat kerakli ustunlar tanlanadi, sahifalash qo'llanmaydi.
    """
    query = select(
        Muammo.id,
        Muammo.turi,
        Muammo.status,
        Muammo.xavf,
        Muammo.lat,
        Muammo.lng,
        Muammo.shubhali,
    ).where(
        Muammo.lng >= min_lng,
        Muammo.lng <= max_lng,
        Muammo.lat >= min_lat,
        Muammo.lat <= max_lat,
    )

    if status:
        try:
            query = query.where(Muammo.status == MuammoStatus(status))
        except ValueError:
            logger.warning("Noto'g'ri status filtri (xarita): %s — e'tiborga olinmadi", status)

    result = await db.execute(query)

    features = []
    for row in result.all():
        features.append({
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [row.lng, row.lat],
            },
            "properties": {
                "id": row.id,
                "turi": row.turi.value if row.turi else None,
                "status": row.status.value if row.status else None,
                "xavf": row.xavf.value if row.xavf else None,
                "shubhali": row.shubhali,
            },
        })
    return features


def _parse_exif_vaqt(value) -> datetime | None:
    """EXIF vaqt satrini datetime ga o'tkazish ("2026:07:14 10:00:00" kabi)."""
    if value is None:
        return None
    if isinstance(value, datetime):
        return value
    text = str(value).strip()
    for fmt in ("%Y:%m:%d %H:%M:%S", "%Y-%m-%d %H:%M:%S", "%Y-%m-%dT%H:%M:%S"):
        try:
            return datetime.strptime(text, fmt).replace(tzinfo=timezone.utc)
        except ValueError:
            continue
    logger.debug("EXIF vaqt formati tanilmadi: %s", text)
    return None


# ============ Helpers ============

def _muammo_to_response(muammo: Muammo, current_user: User | None = None) -> dict:
    """Muammo obyektini javob formatiga o'tkazish.

    current_user berilgan bo'lsa, xodim o'ziga biriktirilmagan MFYlardagi
    xonadon egasi ma'lumotlarini (egasi_fio, egasi_tel) ko'rmaydi.
    Rahbar/superadmin barcha ma'lumotlarni ko'radi.
    """
    xonadon = muammo.xonadon
    xodim = muammo.xodim

    manzil = None
    mfy_nomi = None
    kocha_nomi = None
    uy_raqami = None
    if xonadon:
        manzil = xonadon.full_address
        uy_raqami = xonadon.uy_raqami
        if xonadon.kocha:
            kocha_nomi = xonadon.kocha.nomi
            if xonadon.kocha.mfy:
                mfy_nomi = xonadon.kocha.mfy.nomi

    xodim_fio = None
    if xodim:
        xodim_fio = xodim.full_name

    # Egasi ma'lumotlarini ko'rsatish huquqini tekshirish (TZ: rahbar+ yoki
    # shu xonadon MFY'siga biriktirilgan xodim, boshqalarga yashiriladi)
    egasi_fio = None
    egasi_tel = None
    if xonadon and egasi_korish_huquqi(xonadon, current_user):
        egasi_fio = xonadon.egasi_fio
        egasi_tel = xonadon.egasi_tel

    return {
        "id": muammo.id,
        "xonadon_id": muammo.xonadon_id,
        "xodim_id": muammo.xodim_id,
        "turi": muammo.turi.value if muammo.turi else None,
        "turi_nomi": muammo.turi_nomi,
        "tavsif": muammo.tavsif,
        "xavf": muammo.xavf.value if muammo.xavf else None,
        "status": muammo.status.value if muammo.status else None,
        "tekshiruv_natijasi": muammo.tekshiruv_natijasi.value if muammo.tekshiruv_natijasi else None,
        "tekshiruv_natijasi_nomi": TEKSHIRUV_NATIJASI_NOMLARI.get(
            muammo.tekshiruv_natijasi.value if muammo.tekshiruv_natijasi else "", None
        ),
        "ornida_bartaraf": muammo.ornida_bartaraf,
        "muddat": muammo.muddat.isoformat() if muammo.muddat else None,
        "muddat_qolgan_kun": muammo.muddat_qolgan_kun,
        "tashkilot": muammo.tashkilot,
        "tashkilotga_sana": muammo.tashkilotga_sana.isoformat() if muammo.tashkilotga_sana else None,
        "lat": muammo.lat,
        "lng": muammo.lng,
        "gps_aniqlik": muammo.gps_aniqlik,
        "mock_gps": muammo.mock_gps,
        "shubhali": muammo.shubhali,
        "shubhali_sabab": muammo.shubhali_sabab,
        "shubhali_sabab_nomi": SHUBHALI_SABAB_NOMLARI.get(muammo.shubhali_sabab or ""),
        "client_uuid": muammo.client_uuid,
        "qurilma_vaqti": muammo.qurilma_vaqti.isoformat() if muammo.qurilma_vaqti else None,
        "sinxron_vaqti": muammo.sinxron_vaqti.isoformat() if muammo.sinxron_vaqti else None,
        "yopilgan_sana": muammo.yopilgan_sana.isoformat() if muammo.yopilgan_sana else None,
        "fotolar": [
            {
                "id": f.id,
                "muammo_id": f.muammo_id,
                "turi": f.turi.value if f.turi else None,
                "fayl_yoli": f.fayl_yoli,
                # fayl_yoli allaqachon "uploads/..." prefiksi bilan saqlanadi
                # (app/services/upload.py) — StaticFiles "/uploads" mountiga mos.
                "url": f"/{f.fayl_yoli}" if f.fayl_yoli else None,
                "yuklangan": f.yuklangan.isoformat() if f.yuklangan else None,
                "yaratilgan": f.yuklangan.isoformat() if f.yuklangan else None,
            }
            for f in (muammo.fotolar or [])
        ],
        "xonadon_manzili": manzil,
        "xodim_fio": xodim_fio,
        "egasi_fio": egasi_fio,
        "egasi_tel": egasi_tel,
        "mfy_nomi": mfy_nomi,
        "kocha_nomi": kocha_nomi,
        "uy_raqami": uy_raqami,
        "taklif_etilgan_tadbirlar": muammo.taklif_etilgan_tadbirlar,
        "yoriqnomadan_otkanlar_soni": muammo.yoriqnomadan_otkanlar_soni,
    }

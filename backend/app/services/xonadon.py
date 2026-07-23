"""
XAVFSIZ XONADON — Xonadon xizmati.
Biznes-logika: yaratish, ro'yxat, yangilash, qidirish.
"""
import json
import logging
from math import ceil
from typing import Optional

from sqlalchemy import select, func, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.hudud import Xonadon, Kocha, Mfy
from app.models.muammo import Muammo, MuammoStatus
from app.models.user import UserRole
from app.core.exceptions import NotFoundException, ConflictException

logger = logging.getLogger("xavfsiz_xonadon")


async def create_xonadon(
    db: AsyncSession,
    *,
    kocha_id: int,
    uy_raqami: str,
    lat: float | None = None,
    lng: float | None = None,
    egasi_fio: str | None = None,
    egasi_tel: str | None = None,
    izoh: str | None = None,
) -> Xonadon:
    """Yangi xonadon qo'shish."""
    # Ko'cha mavjudligini tekshirish
    result = await db.execute(
        select(Kocha).where(Kocha.id == kocha_id)
    )
    kocha = result.scalar_one_or_none()
    if kocha is None:
        raise NotFoundException("Ko'cha", kocha_id)

    # Duplicate tekshiruvi
    result = await db.execute(
        select(Xonadon).where(
            and_(Xonadon.kocha_id == kocha_id, Xonadon.uy_raqami == uy_raqami)
        )
    )
    if result.scalar_one_or_none():
        raise ConflictException(f"Bu uy allaqachon qo'shilgan: {kocha.nomi}, {uy_raqami}-uy")

    xonadon = Xonadon(
        kocha_id=kocha_id,
        uy_raqami=uy_raqami,
        lat=lat,
        lng=lng,
        egasi_fio=egasi_fio,
        egasi_tel=egasi_tel,
        izoh=izoh,
    )
    db.add(xonadon)
    await db.flush()

    # MFY xonadon sonini yangilash
    await _update_mfy_xonadon_count(db, kocha.mfy_id)

    # Munosabatlarni eager yuklab qayta o'qish — async sessiyada lazy-load
    # (full_address, kocha, muammolar) MissingGreenlet xatosiga olib keladi
    xonadon = await get_xonadon(db, xonadon.id)

    logger.info(f"Yangi xonadon: id={xonadon.id}, manzil={xonadon.full_address}")

    return xonadon


async def get_xonadon(db: AsyncSession, xonadon_id: int) -> Xonadon:
    """Xonadonni ID bo'yicha olish."""
    result = await db.execute(
        select(Xonadon)
        .options(
            selectinload(Xonadon.kocha).selectinload(Kocha.mfy),
            selectinload(Xonadon.muammolar),
        )
        .where(Xonadon.id == xonadon_id)
    )
    xonadon = result.scalar_one_or_none()
    if xonadon is None:
        raise NotFoundException("Xonadon", xonadon_id)
    return xonadon


async def list_xonadonlar(
    db: AsyncSession,
    *,
    mfy_id: int | None = None,
    kocha_id: int | None = None,
    ochiq_muammo: bool | None = None,
    qidiruv: str | None = None,
    page: int = 1,
    size: int = 20,
) -> tuple[list[Xonadon], int]:
    """Xonadonlar ro'yxati — filtr va sahifalash bilan."""
    query = select(Xonadon).options(
        selectinload(Xonadon.kocha).selectinload(Kocha.mfy),
        selectinload(Xonadon.muammolar),  # batch-load for open-problem count
    )
    count_query = select(func.count(Xonadon.id))

    filters = []

    if mfy_id is not None:
        query = query.join(Xonadon.kocha).where(Kocha.mfy_id == mfy_id)
        count_query = count_query.join(Xonadon.kocha).where(Kocha.mfy_id == mfy_id)

    if kocha_id is not None:
        filters.append(Xonadon.kocha_id == kocha_id)

    # Ochiq muammosi bor xonadonlar
    if ochiq_muammo is True:
        subq = (
            select(Muammo.xonadon_id)
            .where(Muammo.status.in_([MuammoStatus.ochiq, MuammoStatus.jarayonda]))
            .distinct()
            .subquery()
        )
        query = query.join(subq, Xonadon.id == subq.c.xonadon_id)
        count_query = count_query.join(subq, Xonadon.id == subq.c.xonadon_id)

    if qidiruv:
        search_term = f"%{qidiruv}%"
        query = query.outerjoin(Xonadon.kocha)
        count_query = count_query.outerjoin(Xonadon.kocha)
        filters.append(
            or_(
                Xonadon.uy_raqami.ilike(search_term),
                Xonadon.egasi_fio.ilike(search_term),
                Kocha.nomi.ilike(search_term),
            )
        )

    if filters:
        query = query.where(and_(*filters))
        count_query = count_query.where(and_(*filters))

    query = query.order_by(Xonadon.id.desc())

    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    query = query.offset((page - 1) * size).limit(size)

    result = await db.execute(query)
    items = result.unique().scalars().all()

    return list(items), total


async def update_xonadon(
    db: AsyncSession,
    xonadon: Xonadon,
    *,
    kocha_id: int | None = None,
    uy_raqami: str | None = None,
    lat: float | None = None,
    lng: float | None = None,
    egasi_fio: str | None = None,
    egasi_tel: str | None = None,
    izoh: str | None = None,
) -> Xonadon:
    """Xonadon ma'lumotlarini yangilash."""
    old_kocha_id = xonadon.kocha_id

    if kocha_id is not None:
        result = await db.execute(select(Kocha).where(Kocha.id == kocha_id))
        if not result.scalar_one_or_none():
            raise NotFoundException("Ko'cha", kocha_id)
        xonadon.kocha_id = kocha_id

    if uy_raqami is not None:
        xonadon.uy_raqami = uy_raqami
    if lat is not None:
        xonadon.lat = lat
    if lng is not None:
        xonadon.lng = lng
    if egasi_fio is not None:
        xonadon.egasi_fio = egasi_fio
    if egasi_tel is not None:
        xonadon.egasi_tel = egasi_tel
    if izoh is not None:
        xonadon.izoh = izoh

    await db.flush()
    await db.refresh(xonadon)

    # Agar ko'cha o'zgargan bo'lsa, MFY xonadon sonini yangilash
    if kocha_id is not None and kocha_id != old_kocha_id:
        old_kocha = await db.get(Kocha, old_kocha_id)
        new_kocha = await db.get(Kocha, kocha_id)
        if old_kocha:
            await _update_mfy_xonadon_count(db, old_kocha.mfy_id)
        if new_kocha:
            await _update_mfy_xonadon_count(db, new_kocha.mfy_id)

    logger.info(f"Xonadon yangilandi: id={xonadon.id}")

    return xonadon


async def delete_xonadon(db: AsyncSession, xonadon: Xonadon) -> None:
    """Xonadonni o'chirish."""
    mfy_id = xonadon.kocha.mfy_id if xonadon.kocha else None
    await db.delete(xonadon)
    await db.flush()
    if mfy_id:
        await _update_mfy_xonadon_count(db, mfy_id)
    logger.info(f"Xonadon o'chirildi: id={xonadon.id}")


async def list_kochalar(
    db: AsyncSession,
    mfy_id: int | None = None,
) -> list[Kocha]:
    """Ko'chalar ro'yxati."""
    query = select(Kocha).options(selectinload(Kocha.xonadonlar))
    if mfy_id is not None:
        query = query.where(Kocha.mfy_id == mfy_id)
    query = query.order_by(Kocha.nomi)

    result = await db.execute(query)
    return list(result.scalars().all())


async def list_mfylar(db: AsyncSession) -> list[Mfy]:
    """Barcha MFY lar ro'yxati.

    Har bir Mfy obyektiga `chegara_geojson` atributi qo'shiladi —
    PostGIS chegara GeoJSON dict ko'rinishida (ST_AsGeoJSON SELECT'da
    hisoblanadi), chegara NULL bo'lsa None.
    """
    query = select(
        Mfy,
        func.ST_AsGeoJSON(Mfy.chegara).label("chegara_geojson"),
    ).options(
        selectinload(Mfy.kochalar).selectinload(Kocha.xonadonlar)
    ).order_by(Mfy.raqami)

    result = await db.execute(query)
    mfylar = []
    for row in result.all():
        mfy = row[0]
        geojson_str = row[1]
        mfy.chegara_geojson = json.loads(geojson_str) if geojson_str else None
        mfylar.append(mfy)
    return mfylar


# ============ MFY CRUD ============

async def create_mfy(
    db: AsyncSession,
    *,
    raqami: int,
    nomi: str,
    markaz_lat: float | None = None,
    markaz_lng: float | None = None,
) -> Mfy:
    """Yangi MFY qo'shish."""
    # Raqam bo'yicha dublikat tekshiruvi
    result = await db.execute(
        select(Mfy).where(Mfy.raqami == raqami)
    )
    if result.scalar_one_or_none():
        raise ConflictException(f"Bu raqamli MFY allaqachon mavjud: {raqami}-son")

    mfy = Mfy(
        raqami=raqami,
        nomi=nomi,
        markaz_lat=markaz_lat,
        markaz_lng=markaz_lng,
    )
    db.add(mfy)
    await db.flush()
    await db.refresh(mfy)

    logger.info(f"Yangi MFY: id={mfy.id}, {raqami}-son — {nomi}")

    return mfy


async def get_mfy(db: AsyncSession, mfy_id: int) -> Mfy:
    """MFY ni ID bo'yicha olish (ko'chalari bilan)."""
    result = await db.execute(
        select(Mfy)
        .options(selectinload(Mfy.kochalar))
        .where(Mfy.id == mfy_id)
    )
    mfy = result.scalar_one_or_none()
    if mfy is None:
        raise NotFoundException("MFY", mfy_id)
    return mfy


async def update_mfy(
    db: AsyncSession,
    mfy: Mfy,
    *,
    raqami: int | None = None,
    nomi: str | None = None,
    markaz_lat: float | None = None,
    markaz_lng: float | None = None,
) -> Mfy:
    """MFY ma'lumotlarini yangilash."""
    if raqami is not None and raqami != mfy.raqami:
        result = await db.execute(
            select(Mfy).where(and_(Mfy.raqami == raqami, Mfy.id != mfy.id))
        )
        if result.scalar_one_or_none():
            raise ConflictException(f"Bu raqamli MFY allaqachon mavjud: {raqami}-son")
        mfy.raqami = raqami

    if nomi is not None:
        mfy.nomi = nomi
    if markaz_lat is not None:
        mfy.markaz_lat = markaz_lat
    if markaz_lng is not None:
        mfy.markaz_lng = markaz_lng

    await db.flush()
    await db.refresh(mfy)

    logger.info(f"MFY yangilandi: id={mfy.id}")

    return mfy


async def delete_mfy(db: AsyncSession, mfy: Mfy) -> None:
    """MFY ni o'chirish — xonadonlari bor MFY ni o'chirish taqiqlanadi."""
    result = await db.execute(
        select(func.count(Xonadon.id))
        .join(Xonadon.kocha)
        .where(Kocha.mfy_id == mfy.id)
    )
    xonadon_soni = result.scalar() or 0
    if xonadon_soni > 0:
        raise ConflictException(
            f"Bu MFY ga {xonadon_soni} ta xonadon biriktirilgan. "
            "Avval xonadonlarni o'chiring yoki boshqa MFY ga ko'chiring."
        )

    await db.delete(mfy)
    await db.flush()

    logger.info(f"MFY o'chirildi: id={mfy.id}")


# ============ Ko'cha CRUD ============

async def create_kocha(
    db: AsyncSession,
    *,
    mfy_id: int,
    nomi: str,
) -> Kocha:
    """Yangi ko'cha qo'shish."""
    # MFY mavjudligini tekshirish
    result = await db.execute(
        select(Mfy).where(Mfy.id == mfy_id)
    )
    if not result.scalar_one_or_none():
        raise NotFoundException("MFY", mfy_id)

    # Shu MFY ichida dublikat tekshiruvi
    result = await db.execute(
        select(Kocha).where(
            and_(Kocha.mfy_id == mfy_id, Kocha.nomi == nomi)
        )
    )
    if result.scalar_one_or_none():
        raise ConflictException(
            f"Bu ko'cha nomi shu MFY da allaqachon mavjud: {nomi}"
        )

    kocha = Kocha(mfy_id=mfy_id, nomi=nomi)
    db.add(kocha)
    await db.flush()
    await db.refresh(kocha)

    logger.info(f"Yangi ko'cha: {kocha.nomi} (mfy_id={mfy_id})")

    return kocha


async def get_kocha(db: AsyncSession, kocha_id: int) -> Kocha:
    """Ko'chani ID bo'yicha olish (xonadonlari bilan)."""
    result = await db.execute(
        select(Kocha)
        .options(selectinload(Kocha.xonadonlar))
        .where(Kocha.id == kocha_id)
    )
    kocha = result.scalar_one_or_none()
    if kocha is None:
        raise NotFoundException("Ko'cha", kocha_id)
    return kocha


async def update_kocha(db: AsyncSession, kocha: Kocha, *, nomi: str) -> Kocha:
    """Ko'cha nomini yangilash."""
    # Shu MFY ichida dublikat tekshiruvi
    result = await db.execute(
        select(Kocha).where(
            and_(
                Kocha.mfy_id == kocha.mfy_id,
                Kocha.nomi == nomi,
                Kocha.id != kocha.id,
            )
        )
    )
    if result.scalar_one_or_none():
        raise ConflictException(f"Bu ko'cha nomi shu MFY da allaqachon mavjud: {nomi}")

    kocha.nomi = nomi
    await db.flush()
    await db.refresh(kocha)

    logger.info(f"Ko'cha yangilandi: id={kocha.id}, nomi={nomi}")

    return kocha


async def delete_kocha(db: AsyncSession, kocha: Kocha) -> None:
    """Ko'chani o'chirish — xonadonlari bor ko'chani o'chirish taqiqlanadi."""
    result = await db.execute(
        select(func.count(Xonadon.id)).where(Xonadon.kocha_id == kocha.id)
    )
    xonadon_soni = result.scalar() or 0
    if xonadon_soni > 0:
        raise ConflictException(
            f"Bu ko'chaga {xonadon_soni} ta xonadon biriktirilgan. "
            "Avval xonadonlarni o'chiring yoki boshqa ko'chaga ko'chiring."
        )

    mfy_id = kocha.mfy_id
    await db.delete(kocha)
    await db.flush()

    # MFY xonadon sonini qayta hisoblash (himoya uchun — 0 bo'lishi kerak)
    await _update_mfy_xonadon_count(db, mfy_id)

    logger.info(f"Ko'cha o'chirildi: id={kocha.id}")


# ============ Helpers ============

async def _update_mfy_xonadon_count(db: AsyncSession, mfy_id: int) -> None:
    """MFY dagi xonadonlar sonini qayta hisoblash."""
    result = await db.execute(
        select(func.count(Xonadon.id))
        .join(Xonadon.kocha)
        .where(Kocha.mfy_id == mfy_id)
    )
    count = result.scalar() or 0

    mfy = await db.get(Mfy, mfy_id)
    if mfy:
        mfy.xonadon_soni = count
        await db.flush()


def egasi_korish_huquqi(xonadon: Xonadon, current_user) -> bool:
    """Egasi shaxsiy ma'lumotlarini (FIO, telefon) ko'rish huquqi.

    TZ: faqat rahbar/superadmin va shu xonadon MFY'siga biriktirilgan
    xodim ko'radi; boshqa barcha holatlarda yashiriladi.
    """
    if current_user is None:
        return False
    if current_user.rol in (UserRole.superadmin, UserRole.rahbar):
        return True
    if current_user.rol == UserRole.xodim:
        mfy_ids = {xm.mfy_id for xm in (current_user.xodim_mfylar or [])}
        xonadon_mfy_id = xonadon.kocha.mfy_id if xonadon.kocha else None
        return xonadon_mfy_id is not None and xonadon_mfy_id in mfy_ids
    return False


def _xonadon_to_response(xonadon: Xonadon, current_user=None) -> dict:
    """Xonadon obyektini javob formatiga o'tkazish.

    egasi_fio/egasi_tel faqat huquqi bor foydalanuvchiga qaytariladi,
    boshqalarga None (shaxsiy ma'lumot maskalash).
    """
    kocha = xonadon.kocha
    ochiq_muammolar = sum(
        1 for m in (xonadon.muammolar or [])
        if m.status in (MuammoStatus.ochiq, MuammoStatus.jarayonda)
    )

    egasi_koradi = egasi_korish_huquqi(xonadon, current_user)

    return {
        "id": xonadon.id,
        "kocha_id": xonadon.kocha_id,
        "uy_raqami": xonadon.uy_raqami,
        "lat": xonadon.lat,
        "lng": xonadon.lng,
        "egasi_fio": xonadon.egasi_fio if egasi_koradi else None,
        "egasi_tel": xonadon.egasi_tel if egasi_koradi else None,
        "izoh": xonadon.izoh,
        "yaratilgan": xonadon.yaratilgan.isoformat() if xonadon.yaratilgan else None,
        "full_address": xonadon.full_address,
        "kocha_nomi": kocha.nomi if kocha else None,
        "mfy_nomi": kocha.mfy.nomi if kocha and kocha.mfy else None,
        "mfy_id": kocha.mfy.id if kocha and kocha.mfy else None,
        "ochiq_muammolar_soni": ochiq_muammolar,
    }

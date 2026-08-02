"""
XAVFSIZ XONADON — Users API marshrutizatori.
Rahbar va superadmin uchun foydalanuvchilar boshqaruvi.
GET / — ro'yxat; PATCH /{id}/tasdiqlash, /{id}/bloklash; MFY biriktirish.
"""
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy import select, func, or_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db, get_current_user, require_role
from app.core.exceptions import NotFoundException, RoyxatException, ConflictException, ValidationException
from app.models.user import User, UserRole, UserStatus, XodimMfy
from app.models.hudud import Mfy
from app.schemas.auth import UserResponse, MfyBiriktirishRequest, UserUpdateRequest
from app.services.audit import audit_yozish

logger = logging.getLogger("xavfsiz_xonadon")
router = APIRouter()

#: Bitta inspektorga biriktirilishi mumkin bo'lgan aktiv MFYlar chegarasi.
#: Aniq biznes-limit hali belgilanmagan — inspektor real ish yukini hisobga
#: olib qo'yilgan boshlang'ich qiymat; kerak bo'lsa keyinchalik aniqlashtiriladi.
MAX_MFY_PER_XODIM = 10


def _ip_ua(request: Request) -> tuple[str | None, str | None]:
    """So'rovdan IP va User-Agent olish (audit uchun)."""
    ip = request.client.host if request.client else None
    return ip, request.headers.get("user-agent")


# ============ GET /api/users ============

@router.get("")
async def foydalanuvchilar(
    rol: str | None = Query(None, description="superadmin, rahbar, xodim"),
    holat: str | None = Query(None, description="kutilmoqda, faol, bloklangan"),
    mfy_id: int | None = Query(None, description="MFY bo'yicha filtrlash"),
    qidiruv: str | None = Query(None, description="F.I.Sh yoki guvohnoma bo'yicha qidiruv"),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(require_role("rahbar", "superadmin")),
    db: AsyncSession = Depends(get_db),
):
    """
    Barcha foydalanuvchilar ro'yxati.
    Rol, holat, MFY va qidiruv bo'yicha filtrlash.
    """
    query = select(User)

    if rol:
        query = query.where(User.rol == rol)
    if holat:
        query = query.where(User.holat == holat)
    if mfy_id:
        query = query.where(
            User.id.in_(
                select(XodimMfy.xodim_id).where(
                    XodimMfy.mfy_id == mfy_id,
                    XodimMfy.faol == True,
                )
            )
        )
    if qidiruv:
        q = f"%{qidiruv}%"
        query = query.where(
            or_(
                User.familiya.ilike(q),
                User.ism.ilike(q),
                User.sharif.ilike(q),
                User.guvohnoma_raqami.ilike(q),
            )
        )

    # Umumiy son
    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar()

    # Sahifalangan ro'yxat
    query = query.order_by(User.id.desc()).offset((page - 1) * size).limit(size)
    result = await db.execute(query)
    users = result.scalars().all()

    # MFY ma'lumotlari bilan birga
    user_items = []
    for u in users:
        user_dict = UserResponse.model_validate(u).model_dump()
        user_dict["mfy_biriktirishlar"] = [
            {"mfy_id": xm.mfy_id, "nomi": xm.mfy.nomi if xm.mfy else None}
            for xm in u.xodim_mfylar if xm.faol
        ]
        user_items.append(user_dict)

    pages = max(1, (total + size - 1) // size)

    return {
        "ok": True,
        "data": {
            "items": user_items,
            "total": total,
            "page": page,
            "size": size,
            "pages": pages,
        },
        "xato": None,
    }


# ============ PATCH /api/users/{id} ============

@router.patch("/{user_id}")
async def foydalanuvchi_tahrirlash(
    user_id: int,
    body: UserUpdateRequest,
    request: Request,
    current_user: User = Depends(require_role("rahbar", "superadmin")),
    db: AsyncSession = Depends(get_db),
):
    """
    Rahbar/superadmin boshqa foydalanuvchining F.I.Sh, lavozim, telefon,
    guvohnoma raqamini tahrirlaydi. Parol bu yerdan o'zgartirilmaydi
    (xodim buni o'z profilida — PATCH /auth/men — qiladi).
    """
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise NotFoundException("Foydalanuvchi", user_id)

    # Superadmin ma'lumotlarini faqat superadmin tahrirlay oladi
    if user.rol == UserRole.superadmin and current_user.rol != UserRole.superadmin:
        raise RoyxatException("Superadmin ma'lumotlarini faqat boshqa superadmin tahrirlashi mumkin.")

    eski_qiymat = {
        "familiya": user.familiya, "ism": user.ism, "sharif": user.sharif,
        "lavozim": user.lavozim, "telefon": user.telefon,
        "guvohnoma_raqami": user.guvohnoma_raqami,
    }

    if body.guvohnoma_raqami:
        yangi_gr = body.guvohnoma_raqami.upper()
        if yangi_gr != user.guvohnoma_raqami:
            dup = await db.execute(
                select(User).where(User.guvohnoma_raqami == yangi_gr, User.id != user.id)
            )
            if dup.scalar_one_or_none():
                raise RoyxatException("Bu guvohnoma raqami allaqachon band.")
            user.guvohnoma_raqami = yangi_gr

    if body.familiya:
        user.familiya = body.familiya
    if body.ism:
        user.ism = body.ism
    if body.sharif is not None:
        user.sharif = body.sharif or None
    if body.lavozim:
        user.lavozim = body.lavozim
    if body.telefon is not None:
        user.telefon = body.telefon or None

    await db.flush()
    await db.refresh(user)

    ip, user_agent = _ip_ua(request)
    await audit_yozish(
        db,
        user_id=current_user.id,
        amal="user.tahrirlash",
        obyekt_turi="users",
        obyekt_id=user.id,
        eski_qiymat=eski_qiymat,
        yangi_qiymat={
            "familiya": user.familiya, "ism": user.ism, "sharif": user.sharif,
            "lavozim": user.lavozim, "telefon": user.telefon,
            "guvohnoma_raqami": user.guvohnoma_raqami,
        },
        ip=ip,
        user_agent=user_agent,
    )

    logger.info(f"Tahrirlandi: user_id={user.id} → {current_user.guvohnoma_raqami} tomonidan")

    return {
        "ok": True,
        "data": {"user": UserResponse.model_validate(user).model_dump()},
        "xato": None,
    }


# ============ PATCH /api/users/{id}/tasdiqlash ============

@router.patch("/{user_id}/tasdiqlash")
async def tasdiqlash(
    user_id: int,
    request: Request,
    current_user: User = Depends(require_role("rahbar", "superadmin")),
    db: AsyncSession = Depends(get_db),
):
    """
    Kutilayotgan foydalanuvchini tasdiqlash.
    holat: kutilmoqda → faol.
    """
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise NotFoundException("Foydalanuvchi", user_id)

    if user.holat != UserStatus.kutilmoqda:
        raise RoyxatException(
            f"Bu foydalanuvchini tasdiqlab bo'lmaydi. Hozirgi holati: {user.holat.value}"
        )

    user.holat = UserStatus.faol
    await db.flush()

    ip, user_agent = _ip_ua(request)
    await audit_yozish(
        db,
        user_id=current_user.id,
        amal="user.tasdiqlash",
        obyekt_turi="users",
        obyekt_id=user.id,
        eski_qiymat={"holat": UserStatus.kutilmoqda.value},
        yangi_qiymat={"holat": UserStatus.faol.value},
        ip=ip,
        user_agent=user_agent,
    )

    logger.info(f"Tasdiqlandi: user_id={user.id} → {current_user.guvohnoma_raqami} tomonidan")

    return {
        "ok": True,
        "data": {"xabar": f"{user.full_name} muvaffaqiyatli tasdiqlandi."},
        "xato": None,
    }


# ============ PATCH /api/users/{id}/bloklash ============

@router.patch("/{user_id}/bloklash")
async def bloklash(
    user_id: int,
    request: Request,
    current_user: User = Depends(require_role("rahbar", "superadmin")),
    db: AsyncSession = Depends(get_db),
):
    """
    Foydalanuvchini bloklash.
    holat → bloklangan.
    """
    if current_user.id == user_id:
        raise RoyxatException("O'zingizni bloklay olmaysiz.")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise NotFoundException("Foydalanuvchi", user_id)

    # Superadmin faqat superadmin tomonidan bloklanadi
    if user.rol == UserRole.superadmin and current_user.rol != UserRole.superadmin:
        raise RoyxatException("Superadmin faqat boshqa superadmin tomonidan bloklanishi mumkin.")

    eski_holat = user.holat.value
    user.holat = UserStatus.bloklangan
    await db.flush()

    ip, user_agent = _ip_ua(request)
    await audit_yozish(
        db,
        user_id=current_user.id,
        amal="user.bloklash",
        obyekt_turi="users",
        obyekt_id=user.id,
        eski_qiymat={"holat": eski_holat},
        yangi_qiymat={"holat": UserStatus.bloklangan.value},
        ip=ip,
        user_agent=user_agent,
    )

    logger.info(f"Bloklandi: user_id={user.id} → {current_user.guvohnoma_raqami} tomonidan")

    return {
        "ok": True,
        "data": {"xabar": f"{user.full_name} bloklandi."},
        "xato": None,
    }


# ============ PATCH /api/users/{id}/faollashtirish ============

@router.patch("/{user_id}/faollashtirish")
async def faollashtirish(
    user_id: int,
    request: Request,
    current_user: User = Depends(require_role("rahbar", "superadmin")),
    db: AsyncSession = Depends(get_db),
):
    """
    Bloklangan foydalanuvchini qayta faollashtirish.
    holat: bloklangan → faol.
    """
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise NotFoundException("Foydalanuvchi", user_id)

    if user.holat != UserStatus.bloklangan:
        raise RoyxatException(
            f"Bu foydalanuvchini faollashtirib bo'lmaydi. Hozirgi holati: {user.holat.value}"
        )

    user.holat = UserStatus.faol
    await db.flush()

    ip, user_agent = _ip_ua(request)
    await audit_yozish(
        db,
        user_id=current_user.id,
        amal="user.faollashtirish",
        obyekt_turi="users",
        obyekt_id=user.id,
        eski_qiymat={"holat": UserStatus.bloklangan.value},
        yangi_qiymat={"holat": UserStatus.faol.value},
        ip=ip,
        user_agent=user_agent,
    )

    logger.info(f"Faollashtirildi: user_id={user.id} → {current_user.guvohnoma_raqami} tomonidan")

    return {
        "ok": True,
        "data": {"xabar": f"{user.full_name} qayta faollashtirildi."},
        "xato": None,
    }


# ============ POST /api/users/{id}/mfy ============

@router.post("/{user_id}/mfy")
async def mfy_biriktirish(
    user_id: int,
    body: MfyBiriktirishRequest,
    request: Request,
    current_user: User = Depends(require_role("rahbar", "superadmin")),
    db: AsyncSession = Depends(get_db),
):
    """
    Xodimga bir yoki bir necha MFY biriktirish.
    """
    # Foydalanuvchi mavjudligini tekshirish
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise NotFoundException("Foydalanuvchi", user_id)

    if user.rol != UserRole.xodim:
        raise RoyxatException("Faqat xodimlarga MFY biriktirish mumkin.")

    # MFY lar mavjudligini tekshirish
    result = await db.execute(select(Mfy).where(Mfy.id.in_(body.mfy_ids)))
    existing_mfys = {m.id for m in result.scalars().all()}
    missing = set(body.mfy_ids) - existing_mfys
    if missing:
        raise NotFoundException(f"MFY lar topilmadi: {missing}")

    # Shu xodimning joriy aktiv biriktirishlari — limit va "yangi qo'shiladi"
    # sonini hisoblash uchun.
    result = await db.execute(
        select(XodimMfy).where(XodimMfy.xodim_id == user_id, XodimMfy.faol.is_(True))
    )
    xodim_faol_biriktirishlari = {row.mfy_id: row for row in result.scalars().all()}

    # Boshqa xodimlarga aktiv biriktirilgan MFYlar — bitta MFY bir vaqtda
    # faqat bitta inspektorga tegishli bo'lishi kerak (aks holda ikkalasi
    # ham "mening xonadonlarim"da bir xil uylarni ko'radi).
    result = await db.execute(
        select(XodimMfy, User.full_name)
        .join(User, User.id == XodimMfy.xodim_id)
        .where(
            XodimMfy.mfy_id.in_(body.mfy_ids),
            XodimMfy.xodim_id != user_id,
            XodimMfy.faol.is_(True),
        )
    )
    boshqalarga_biriktirilgan = {row[0].mfy_id: (row[0], row[1]) for row in result.all()}

    if boshqalarga_biriktirilgan and not body.majburiy:
        ziddiyat = [
            f"MFY #{mfy_id} ({boshqa_fio})"
            for mfy_id, (_, boshqa_fio) in boshqalarga_biriktirilgan.items()
        ]
        raise ConflictException(
            "Quyidagi MFYlar boshqa xodimga biriktirilgan: "
            + ", ".join(ziddiyat)
            + ". Baribir o'tkazish uchun so'rovni qayta yuboring (majburiy=true)."
        )

    yangi_qoshiladigan = [
        mfy_id for mfy_id in body.mfy_ids if mfy_id not in xodim_faol_biriktirishlari
    ]
    boshqa_limit = len(xodim_faol_biriktirishlari) + len(yangi_qoshiladigan)
    if boshqa_limit > MAX_MFY_PER_XODIM:
        raise ValidationException(
            f"Bitta inspektorga ko'pi bilan {MAX_MFY_PER_XODIM} ta aktiv MFY biriktirish mumkin "
            f"(hozir {len(xodim_faol_biriktirishlari)} ta bor, {len(yangi_qoshiladigan)} ta qo'shilmoqchi)."
        )

    # Ziddiyatli MFYlar bo'lsa (majburiy=true) — avvalgi inspektordan olib,
    # shu xodimga o'tkazamiz.
    for mfy_id, (eski_xm, _) in boshqalarga_biriktirilgan.items():
        eski_xm.faol = False

    biriktirilgan = 0
    for mfy_id in body.mfy_ids:
        existing = xodim_faol_biriktirishlari.get(mfy_id)

        if existing:
            continue  # Allaqachon shu xodimga aktiv biriktirilgan

        result = await db.execute(
            select(XodimMfy).where(
                XodimMfy.xodim_id == user_id,
                XodimMfy.mfy_id == mfy_id,
            )
        )
        mavjud_nofaol = result.scalar_one_or_none()

        if mavjud_nofaol:
            mavjud_nofaol.faol = True
            mavjud_nofaol.biriktirgan_id = current_user.id
            mavjud_nofaol.sana = datetime.now(timezone.utc)
            biriktirilgan += 1
        else:
            # Yangi biriktirish
            xm = XodimMfy(
                xodim_id=user_id,
                mfy_id=mfy_id,
                biriktirgan_id=current_user.id,
                faol=True,
            )
            db.add(xm)
            biriktirilgan += 1

    await db.flush()

    ip, user_agent = _ip_ua(request)
    await audit_yozish(
        db,
        user_id=current_user.id,
        amal="user.mfy_biriktirish",
        obyekt_turi="users",
        obyekt_id=user_id,
        yangi_qiymat={"mfy_ids": body.mfy_ids, "biriktirilgan": biriktirilgan},
        ip=ip,
        user_agent=user_agent,
    )

    logger.info(
        f"MFY biriktirildi: xodim_id={user_id}, mfy_ids={body.mfy_ids} "
        f"→ {current_user.guvohnoma_raqami} tomonidan"
    )

    return {
        "ok": True,
        "data": {
            "xabar": f"{user.full_name} ga {biriktirilgan} ta MFY biriktirildi.",
            "mfy_ids": body.mfy_ids,
        },
        "xato": None,
    }


# ============ DELETE /api/users/{id}/mfy/{mfy_id} ============

@router.delete("/{user_id}/mfy/{mfy_id}")
async def mfy_ajratish(
    user_id: int,
    mfy_id: int,
    request: Request,
    current_user: User = Depends(require_role("rahbar", "superadmin")),
    db: AsyncSession = Depends(get_db),
):
    """
    Xodimdan MFY biriktirishni o'chirish (deaktivatsiya qilish).
    """
    result = await db.execute(
        select(XodimMfy).where(
            XodimMfy.xodim_id == user_id,
            XodimMfy.mfy_id == mfy_id,
        )
    )
    xm = result.scalar_one_or_none()
    if xm is None:
        raise NotFoundException("Biriktirish topilmadi")

    xm.faol = False
    await db.flush()

    ip, user_agent = _ip_ua(request)
    await audit_yozish(
        db,
        user_id=current_user.id,
        amal="user.mfy_ajratish",
        obyekt_turi="users",
        obyekt_id=user_id,
        yangi_qiymat={"mfy_id": mfy_id, "faol": False},
        ip=ip,
        user_agent=user_agent,
    )

    logger.info(
        f"MFY ajratildi: xodim_id={user_id}, mfy_id={mfy_id} "
        f"→ {current_user.guvohnoma_raqami} tomonidan"
    )

    return {
        "ok": True,
        "data": {"xabar": "MFY biriktirish bekor qilindi."},
        "xato": None,
    }


# ============ DELETE /api/users/{id} ============

@router.delete("/{user_id}")
async def foydalanuvchi_ochirish(
    user_id: int,
    request: Request,
    current_user: User = Depends(require_role("rahbar", "superadmin")),
    db: AsyncSession = Depends(get_db),
):
    """
    Foydalanuvchini butunlay o'chirish.
    Agar unga bog'liq tarixiy ma'lumotlar (tashriflar, topshiriqlar,
    intizom, audit) bo'lsa — o'chirib bo'lmaydi, buning o'rniga
    bloklash tavsiya etiladi.
    """
    if current_user.id == user_id:
        raise RoyxatException("O'zingizni o'chira olmaysiz.")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise NotFoundException("Foydalanuvchi", user_id)

    if user.rol == UserRole.superadmin and current_user.rol != UserRole.superadmin:
        raise RoyxatException("Superadmin faqat boshqa superadmin tomonidan o'chirilishi mumkin.")

    full_name = user.full_name
    guvohnoma = user.guvohnoma_raqami

    await db.delete(user)
    try:
        await db.flush()
    except IntegrityError:
        raise ConflictException(
            f"{full_name} ni o'chirib bo'lmaydi — unga bog'liq tarixiy ma'lumotlar "
            f"(tashriflar, topshiriqlar yoki intizom yozuvlari) mavjud. "
            f"Buning o'rniga bloklashdan foydalaning."
        )

    ip, user_agent = _ip_ua(request)
    await audit_yozish(
        db,
        user_id=current_user.id,
        amal="user.ochirish",
        obyekt_turi="users",
        obyekt_id=user_id,
        eski_qiymat={"guvohnoma_raqami": guvohnoma, "full_name": full_name},
        ip=ip,
        user_agent=user_agent,
    )

    logger.info(f"O'chirildi: user_id={user_id} ({guvohnoma}) → {current_user.guvohnoma_raqami} tomonidan")

    return {
        "ok": True,
        "data": {"xabar": f"{full_name} o'chirildi."},
        "xato": None,
    }

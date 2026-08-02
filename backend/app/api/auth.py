"""
XAVFSIZ XONADON — Auth API marshrutizatori.
POST /royxat — ro'yxatdan o'tish (multipart: forma maydonlari + majburiy selfi)
POST /kirish — tizimga kirish
POST /yangilash — refresh token
POST /chiqish — chiqish
GET /men — joriy foydalanuvchi
POST /push-token — push token saqlash
"""
import logging
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, File, Form, Request, UploadFile
from fastapi.exceptions import RequestValidationError
from pydantic import ValidationError
from sqlalchemy import select, update, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db, get_current_user
from app.core.ratelimit import limiter
from app.core.exceptions import AuthException, RoyxatException, NotFoundException
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_access_token,
    decode_refresh_token,
)
from app.models.user import User, UserRole, UserStatus, RefreshToken
from app.schemas.auth import (
    RoyxatRequest,
    KirishRequest,
    TokenResponse,
    RefreshRequest,
    PushTokenRequest,
    UserResponse,
    ProfilYangilashRequest,
)
from app.services import upload as upload_service

logger = logging.getLogger("xavfsiz_xonadon")
router = APIRouter()


# ============ POST /api/auth/royxat ============

@router.post("/royxat")
@limiter.limit("3/hour")
async def royxat(
    request: Request,
    guvohnoma_raqami: str = Form(...),
    parol: str = Form(...),
    familiya: str = Form(...),
    ism: str = Form(...),
    sharif: str | None = Form(None),
    lavozim: str = Form(...),
    telefon: str | None = Form(None),
    selfi: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    """
    Xodim o'zini ro'yxatdan o'tkazadi (multipart/form-data).
    selfi MAJBURIY — upload servisi orqali saqlanib, profil_foto_url ga yoziladi.
    holat = 'kutilmoqda' — superadmin/rahbar tasdiqlashi kerak.
    """
    # Forma maydonlarini RoyxatRequest validatsiyasidan o'tkazish
    try:
        body = RoyxatRequest(
            guvohnoma_raqami=guvohnoma_raqami,
            parol=parol,
            familiya=familiya,
            ism=ism,
            sharif=sharif,
            lavozim=lavozim,
            telefon=telefon,
        )
    except ValidationError as exc:
        raise RequestValidationError(exc.errors())

    # Guvohnoma raqami band emasligini tekshirish
    result = await db.execute(
        select(User).where(User.guvohnoma_raqami == body.guvohnoma_raqami.upper())
    )
    existing = result.scalar_one_or_none()
    if existing:
        raise RoyxatException(
            f"Bu guvohnoma raqami allaqachon ro'yxatdan o'tgan. "
            f"Hozirgi holati: {getattr(existing.holat, 'value', existing.holat)}"
        )

    # Selfini saqlash (magic bytes + Pillow validatsiya + siqish)
    foto = await upload_service.save_upload(selfi, subdir="profil")

    # Yangi foydalanuvchi yaratish
    user = User(
        guvohnoma_raqami=body.guvohnoma_raqami.upper(),
        parol_hash=hash_password(body.parol),
        familiya=body.familiya,
        ism=body.ism,
        sharif=body.sharif,
        lavozim=body.lavozim,
        telefon=body.telefon,
        profil_foto_url=foto["fayl_yoli"],
        rol=UserRole.xodim,  # Har doim xodim sifatida ro'yxatdan o'tadi
        holat=UserStatus.kutilmoqda,
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)

    logger.info(f"Yangi ro'yxatdan o'tish: {user.guvohnoma_raqami} — {user.full_name} (id={user.id})")

    return {
        "ok": True,
        "data": {
            "id": user.id,
            "guvohnoma_raqami": user.guvohnoma_raqami,
            "holat": getattr(user.holat, 'value', user.holat),
            "xabar": "Ro'yxatdan o'tdingiz. Administrator tasdiqlashini kuting.",
        },
        "xato": None,
    }


# ============ POST /api/auth/kirish ============

@router.post("/kirish")
@limiter.limit("5/15minutes")
async def kirish(request: Request, body: KirishRequest, db: AsyncSession = Depends(get_db)):
    """
    Tizimga kirish. Access + refresh token qaytaradi.
    """
    # Foydalanuvchini topish
    result = await db.execute(
        select(User).where(User.guvohnoma_raqami == body.guvohnoma_raqami.upper())
    )
    user = result.scalar_one_or_none()

    if not user or not verify_password(body.parol, user.parol_hash):
        raise AuthException("Guvohnoma raqami yoki parol noto'g'ri.")

    # Holat tekshiruvi
    if user.holat == UserStatus.bloklangan:
        raise AuthException("Hisobingiz bloklangan. Administrator bilan bog'laning.", status_code=403)

    if user.holat == UserStatus.kutilmoqda:
        raise AuthException("Hisobingiz hali tasdiqlanmagan. Iltimos administrator tasdiqlashini kuting.", status_code=403)

    # Token yaratish
    rol_str = str(user.rol)  # PG_ENUM string qaytaradi
    access_token = create_access_token(user.id, rol_str)
    refresh_token_str, refresh_jti, refresh_exp = create_refresh_token(user.id)

    # Refresh tokenni bazaga saqlash (revoke/rotation uchun)
    rt = RefreshToken(
        user_id=user.id,
        token_jti=refresh_jti,
        muddati=refresh_exp,
    )
    db.add(rt)

    # Oxirgi kirish vaqtini yangilash
    user.oxirgi_kirish = datetime.now(timezone.utc)
    await db.flush()

    user_data = UserResponse.model_validate(user)

    logger.info(f"Kirish: {user.guvohnoma_raqami} (rol={rol_str}, id={user.id})")

    return {
        "ok": True,
        "data": {
            "access_token": access_token,
            "refresh_token": refresh_token_str,
            "token_type": "bearer",
            "user": user_data.model_dump(),
        },
        "xato": None,
    }


# ============ POST /api/auth/yangilash ============

@router.post("/yangilash")
async def yangilash(body: RefreshRequest, db: AsyncSession = Depends(get_db)):
    """
    Refresh token yordamida yangi access token olish.
    Access token — 30 daqiqa, Refresh token — 30 kun.
    DB'da revoke qilingan tokenlar qabul qilinmaydi.
    """
    payload = decode_refresh_token(body.refresh_token)
    if payload is None:
        raise AuthException("Refresh token muddati o'tgan yoki noto'g'ri.")

    user_id = payload.get("sub")
    jti = payload.get("jti")
    if not user_id:
        raise AuthException("Refresh token ichida foydalanuvchi ID topilmadi.")

    # Token revoke qilinmaganligini tekshirish
    if jti:
        rt_result = await db.execute(
            select(RefreshToken).where(
                RefreshToken.token_jti == jti,
                RefreshToken.revoked == False,
            )
        )
        rt = rt_result.scalar_one_or_none()
        if rt is None:
            raise AuthException("Refresh token bekor qilingan. Iltimos qaytadan kiring.")

    result = await db.execute(select(User).where(User.id == int(user_id)))
    user = result.scalar_one_or_none()

    if user is None:
        raise AuthException("Foydalanuvchi topilmadi.")

    if user.holat == UserStatus.bloklangan:
        raise AuthException("Hisobingiz bloklangan.")

    if user.holat == UserStatus.kutilmoqda:
        raise AuthException("Hisobingiz hali tasdiqlanmagan.")

    new_access = create_access_token(user.id, str(user.rol))

    return {
        "ok": True,
        "data": {
            "access_token": new_access,
            "token_type": "bearer",
        },
        "xato": None,
    }


# ============ POST /api/auth/chiqish ============

@router.post("/chiqish")
async def chiqish(
    body: RefreshRequest | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Chiqish. Frontend tokenlarni o'chirishi kerak.
    Agar refresh token berilsa, DB'da revoke qilinadi.
    """
    if body and body.refresh_token:
        payload = decode_refresh_token(body.refresh_token)
        if payload and payload.get("jti"):
            # Tokenni revoke qilish
            await db.execute(
                update(RefreshToken)
                .where(RefreshToken.token_jti == payload["jti"])
                .values(revoked=True)
            )
            await db.flush()

    logger.info(f"Chiqish: {current_user.guvohnoma_raqami} (id={current_user.id})")
    return {
        "ok": True,
        "data": {"xabar": "Tizimdan chiqdingiz."},
        "xato": None,
    }


# ============ GET /api/auth/men ============

@router.get("/men")
async def men(current_user: User = Depends(get_current_user)):
    """
    Joriy foydalanuvchi ma'lumotlari.
    Har bir rol uchun mos ma'lumotlar qaytariladi.
    """
    user_data = UserResponse.model_validate(current_user)

    # Qo'shimcha: xodim uchun biriktirilgan MFY lar ro'yxati
    extra = {}
    if current_user.rol == UserRole.xodim and current_user.xodim_mfylar:
        extra["mfy_biriktirishlar"] = [
            {
                "mfy_id": xm.mfy_id,
                "nomi": xm.mfy.nomi if xm.mfy else None,
                "raqami": xm.mfy.raqami if xm.mfy else None,
                "xonadon_soni": xm.mfy.xonadon_soni if xm.mfy else 0,
                "kochalar_soni": len(xm.mfy.kochalar) if xm.mfy and xm.mfy.kochalar else 0,
                "faol": xm.faol,
            }
            for xm in current_user.xodim_mfylar
            if xm.faol
        ]

    return {
        "ok": True,
        "data": {
            "user": user_data.model_dump(),
            **extra,
        },
        "xato": None,
    }


# ============ PATCH /api/auth/men ============

@router.patch("/men")
@limiter.limit("30/hour")
async def men_yangilash(
    request: Request,
    ism: str | None = Form(None),
    familiya: str | None = Form(None),
    sharif: str | None = Form(None),
    telefon: str | None = Form(None),
    guvohnoma_raqami: str | None = Form(None),
    joriy_parol: str | None = Form(None),
    yangi_parol: str | None = Form(None),
    rasm: UploadFile | None = File(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Joriy foydalanuvchi o'z profilini yangilaydi: ism, familiya, telefon,
    profil rasmi, guvohnoma raqami, parol.
    Guvohnoma raqami yoki parol o'zgartirilsa — joriy parol tekshiriladi.
    """
    try:
        body = ProfilYangilashRequest(
            ism=ism,
            familiya=familiya,
            sharif=sharif,
            telefon=telefon,
            guvohnoma_raqami=guvohnoma_raqami,
            joriy_parol=joriy_parol,
            yangi_parol=yangi_parol,
        )
    except ValidationError as exc:
        raise RequestValidationError(exc.errors())

    sezgir_ozgarish = bool(body.guvohnoma_raqami or body.yangi_parol)
    if sezgir_ozgarish:
        if not body.joriy_parol or not verify_password(body.joriy_parol, current_user.parol_hash):
            raise AuthException("Joriy parol noto'g'ri.", status_code=400)

    if body.guvohnoma_raqami:
        yangi_gr = body.guvohnoma_raqami.upper()
        if yangi_gr != current_user.guvohnoma_raqami:
            result = await db.execute(
                select(User).where(User.guvohnoma_raqami == yangi_gr, User.id != current_user.id)
            )
            if result.scalar_one_or_none():
                raise RoyxatException("Bu guvohnoma raqami allaqachon band.")
            current_user.guvohnoma_raqami = yangi_gr

    if body.ism:
        current_user.ism = body.ism
    if body.familiya:
        current_user.familiya = body.familiya
    if sharif is not None:
        current_user.sharif = body.sharif or None
    if telefon is not None:
        current_user.telefon = body.telefon or None
    if body.yangi_parol:
        current_user.parol_hash = hash_password(body.yangi_parol)

    if rasm is not None:
        foto = await upload_service.save_upload(rasm, subdir="profil")
        current_user.profil_foto_url = foto["fayl_yoli"]

    await db.flush()
    await db.refresh(current_user)

    user_data = UserResponse.model_validate(current_user)

    logger.info(f"Profil yangilandi: {current_user.guvohnoma_raqami} (id={current_user.id})")

    return {
        "ok": True,
        "data": {"user": user_data.model_dump()},
        "xato": None,
    }


# ============ POST /api/auth/push-token ============

@router.post("/push-token")
async def push_token(
    body: PushTokenRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Expo push token saqlash (mobil ilovadan).
    """
    current_user.push_token = body.push_token
    await db.flush()

    logger.info(f"Push token saqlandi: user_id={current_user.id}")

    return {
        "ok": True,
        "data": {"xabar": "Push token saqlandi."},
        "xato": None,
    }

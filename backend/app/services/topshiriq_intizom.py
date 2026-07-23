"""
XAVFSIZ XONADON — Topshiriq va Intizom xizmati.
Biznes-logika: topshiriq va intizom CRUD operatsiyalari.
"""
import logging
from datetime import date, datetime, timezone
from typing import Optional, Tuple, List

from sqlalchemy import select, func, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.audit import Topshiriq, Intizom, TopshiriqStatus, IntizomTuri
from app.models.user import User
from app.core.exceptions import NotFoundException

logger = logging.getLogger("xavfsiz_xonadon")


async def create_topshiriq(
    db: AsyncSession,
    *,
    rahbar_id: int,
    xodim_id: int,
    mfy_id: Optional[int] = None,
    muammo_id: Optional[int] = None,
    sarlavha: str,
    matn: Optional[str] = None,
    muddat: date,
) -> Topshiriq:
    """Yangi topshiriq yaratish."""
    # Xodim mavjudligini tekshirish
    result = await db.execute(
        select(User).where(User.id == xodim_id)
    )
    xodim = result.scalar_one_or_none()
    if xodim is None:
        raise NotFoundException("Xodim", xodim_id)

    topshiriq = Topshiriq(
        rahbar_id=rahbar_id,
        xodim_id=xodim_id,
        mfy_id=mfy_id,
        muammo_id=muammo_id,
        sarlavha=sarlavha,
        matn=matn,
        muddat=muddat,
        status=TopshiriqStatus.yangi,
    )
    db.add(topshiriq)
    await db.flush()
    await db.refresh(topshiriq)

    logger.info(f"Yangi topshiriq: id={topshiriq.id}, sarlavha='{topshiriq.sarlavha}', xodim={xodim.full_name}")

    return topshiriq


async def get_topshiriq(db: AsyncSession, topshiriq_id: int) -> Topshiriq:
    """Topshiriqni ID bo'yicha olish."""
    result = await db.execute(
        select(Topshiriq)
        .options(
            selectinload(Topshiriq.rahbar),
            selectinload(Topshiriq.xodim),
            selectinload(Topshiriq.mfy),
        )
        .where(Topshiriq.id == topshiriq_id)
    )
    topshiriq = result.scalar_one_or_none()
    if topshiriq is None:
        raise NotFoundException("Topshiriq", topshiriq_id)
    return topshiriq


async def list_topshiriqlar(
    db: AsyncSession,
    *,
    xodim_id: Optional[int] = None,
    mfy_id: Optional[int] = None,
    status: Optional[str] = None,
    muddat_dan: Optional[date] = None,
    muddat_gacha: Optional[date] = None,
    page: int = 1,
    size: int = 20,
) -> Tuple[List[Topshiriq], int]:
    """Topshiriqlar ro'yxati — filtrlash va sahifalash bilan."""
    query = select(Topshiriq).options(
        selectinload(Topshiriq.rahbar),
        selectinload(Topshiriq.xodim),
        selectinload(Topshiriq.mfy),
    )

    count_query = select(func.count(Topshiriq.id))

    # Filtrlar
    filters = []

    if xodim_id is not None:
        filters.append(Topshiriq.xodim_id == xodim_id)

    if mfy_id is not None:
        filters.append(Topshiriq.mfy_id == mfy_id)

    if status:
        try:
            filters.append(Topshiriq.status == TopshiriqStatus(status))
        except ValueError:
            logger.warning("Noto'g'ri topshiriq status filtri: %s — e'tiborga olinmadi", status)

    if muddat_dan:
        filters.append(Topshiriq.muddat >= muddat_dan)

    if muddat_gacha:
        filters.append(Topshiriq.muddat <= muddat_gacha)

    # Filtrlarni qo'llash
    if filters:
        query = query.where(and_(*filters))
        count_query = count_query.where(and_(*filters))

    # Saralash: eng yangi avval (yaratilgan bo'yicha)
    query = query.order_by(Topshiriq.yaratilgan.desc())

    # Jami son
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # Sahifalash
    query = query.offset((page - 1) * size).limit(size)

    result = await db.execute(query)
    items = result.scalars().all()

    return list(items), total


async def update_topshiriq(
    db: AsyncSession,
    topshiriq: Topshiriq,
    *,
    status: str,
) -> Topshiriq:
    """Topshiriq statusini yangilash."""
    try:
        topshiriq.status = TopshiriqStatus(status)
    except ValueError:
        # ValueError ni yuqori darbandda qayta ishlatamiz, lekin xavfsizlik uchun tekshiramiz
        raise ValueError(f"Noto'g'ri status: {status}")

    # Status o'zgartirilganda tegishli vaqtni belgilash
    if status == "bajarildi":
        topshiriq.bajarilgan = datetime.now(timezone.utc)
    elif status == "korildi":
        topshiriq.korilgan = datetime.now(timezone.utc)

    await db.flush()
    await db.refresh(topshiriq)

    logger.info(f"Topshiriq yangilandi: id={topshiriq.id}, status={topshiriq.status}")

    return topshiriq


async def create_intizom(
    db: AsyncSession,
    *,
    xodim_id: int,
    muammo_id: Optional[int] = None,
    turi: str,
    sabab: str,
    bergan_id: int,
) -> Intizom:
    """Yangi intizom yaratish."""
    # Xodim mavjudligini tekshirish
    result = await db.execute(
        select(User).where(User.id == xodim_id)
    )
    xodim = result.scalar_one_or_none()
    if xodim is None:
        raise NotFoundException("Xodim", xodim_id)

    intizom = Intizom(
        xodim_id=xodim_id,
        muammo_id=muammo_id,
        turi=IntizomTuri(turi),
        sabab=sabab,
        bergan_id=bergan_id,
    )
    db.add(intizom)
    await db.flush()
    await db.refresh(intizom)

    logger.info(f"Yangi intizom: id={intizom.id}, turi={intizom.turi.value}, xodim={xodim.full_name}")

    return intizom


async def get_intizom(db: AsyncSession, intizom_id: int) -> Intizom:
    """Intizomni ID bo'yicha olish."""
    result = await db.execute(
        select(Intizom)
        .options(
            selectinload(Intizom.xodim),
            selectinload(Intizom.bergan),
        )
        .where(Intizom.id == intizom_id)
    )
    intizom = result.scalar_one_or_none()
    if intizom is None:
        raise NotFoundException("Intizom", intizom_id)
    return intizom


async def list_intizomlar(
    db: AsyncSession,
    *,
    xodim_id: Optional[int] = None,
    turi: Optional[str] = None,
    sana_dan: Optional[date] = None,
    sana_gacha: Optional[date] = None,
    page: int = 1,
    size: int = 20,
) -> Tuple[List[Intizom], int]:
    """Intizomlar ro'yxati — filtrlash va sahifalash bilan."""
    query = select(Intizom).options(
        selectinload(Intizom.xodim),
        selectinload(Intizom.bergan),
    )

    count_query = select(func.count(Intizom.id))

    # Filtrlar
    filters = []

    if xodim_id is not None:
        filters.append(Intizom.xodim_id == xodim_id)

    if turi:
        try:
            filters.append(Intizom.turi == IntizomTuri(turi))
        except ValueError:
            logger.warning("Noto'g'ri intizom turi filtri: %s — e'tiborga olinmadi", turi)

    if sana_dan:
        filters.append(func.date(Intizom.sana) >= sana_dan)

    if sana_gacha:
        filters.append(func.date(Intizom.sana) <= sana_gacha)

    # Filtrlarni qo'llash
    if filters:
        query = query.where(and_(*filters))
        count_query = count_query.where(and_(*filters))

    # Saralash: eng yangi avval (sana bo'yicha)
    query = query.order_by(Intizom.sana.desc())

    # Jami son
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # Sahifalash
    query = query.offset((page - 1) * size).limit(size)

    result = await db.execute(query)
    items = result.scalars().all()

    return list(items), total


# ============ Helpers ============

def _topshiriq_to_response(topshiriq: Topshiriq) -> dict:
    """Topshiriq obyektini javob formatiga o'tkazish."""
    rahbar = topshiriq.rahbar
    xodim = topshiriq.xodim
    mfy = topshiriq.mfy

    rahbar_fio = rahbar.full_name if rahbar else None
    xodim_fio = xodim.full_name if xodim else None
    mfy_nomi = mfy.nomi if mfy else None

    return {
        "id": topshiriq.id,
        "rahbar_id": topshiriq.rahbar_id,
        "xodim_id": topshiriq.xodim_id,
        "mfy_id": topshiriq.mfy_id,
        "muammo_id": topshiriq.muammo_id,
        "sarlavha": topshiriq.sarlavha,
        "matn": topshiriq.matn,
        "muddat": topshiriq.muddat.isoformat() if topshiriq.muddat else None,
        "status": topshiriq.status.value if topshiriq.status else None,
        "yaratilgan": topshiriq.yaratilgan.isoformat() if topshiriq.yaratilgan else None,
        "korilgan": topshiriq.korilgan.isoformat() if topshiriq.korilgan else None,
        "bajarilgan": topshiriq.bajarilgan.isoformat() if topshiriq.bajarilgan else None,
        "rahbar_fio": rahbar_fio,
        "xodim_fio": xodim_fio,
        "mfy_nomi": mfy_nomi,
    }


def _intizom_to_response(intizom: Intizom) -> dict:
    """Intizom obyektini javob formatiga o'tkazish."""
    xodim = intizom.xodim
    bergan = intizom.bergan

    xodim_fio = xodim.full_name if xodim else None
    bergan_fio = bergan.full_name if bergan else None

    return {
        "id": intizom.id,
        "xodim_id": intizom.xodim_id,
        "muammo_id": intizom.muammo_id,
        "turi": intizom.turi.value if intizom.turi else None,
        "sabab": intizom.sabab,
        "bergan_id": intizom.bergan_id,
        "sana": intizom.sana.isoformat() if intizom.sana else None,
        "xodim_fio": xodim_fio,
        "bergan_fio": bergan_fio,
    }
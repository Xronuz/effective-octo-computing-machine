"""
XAVFSIZ XONADON — Lokatsiya xizmatlari.
GPS log saqlash va aktiv xodimlarni olish.
"""
import logging
from datetime import datetime, timezone, timedelta
from zoneinfo import ZoneInfo

from sqlalchemy import delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.lokatsiya import LokatsiyaLog
from app.schemas.lokatsiya import LokatsiyaKiruvchi, AktivXodimResponse
from app.models.user import User

logger = logging.getLogger("xavfsiz_xonadon")

TOSHKENT_TZ = ZoneInfo("Asia/Tashkent")


def _ish_vaqtida(qurilma_vaqti: datetime) -> bool:
    """Qurilma vaqti ish soatlari oralig'ida (Toshkent vaqti bilan) ekanligini tekshirish."""
    from app.config import settings
    # Naive vaqt Toshkent lokal deb qaraladi, tz-aware esa Toshkentga o'tkaziladi
    lokal_vaqt = (
        qurilma_vaqti
        if qurilma_vaqti.tzinfo is None
        else qurilma_vaqti.astimezone(TOSHKENT_TZ)
    )
    # Ish vaqti: [ISH_BOSHLANISH_SOAT, ISH_TUGASH_SOAT)
    return settings.ISH_BOSHLANISH_SOAT <= lokal_vaqt.hour < settings.ISH_TUGASH_SOAT


async def save_lokatsiya(
    db: AsyncSession,
    xodim_id: int,
    data: LokatsiyaKiruvchi,
) -> LokatsiyaLog | None:
    """GPS nuqtani logga saqlash. Ish vaqtidan tashqari bo'lsa None qaytaradi."""
    # Ish vaqti filtri — 09:00–18:00 tashqarisida saqlanmaydi
    if not _ish_vaqtida(data.qurilma_vaqti):
        logger.debug(
            f"Ish vaqtidan tashqari lokatsiya rad etildi: "
            f"xodim_id={xodim_id}, vaqt={data.qurilma_vaqti}"
        )
        return None

    log = LokatsiyaLog(
        xodim_id=xodim_id,
        lat=data.lat,
        lng=data.lng,
        aniqlik=data.aniqlik,
        tezlik=data.tezlik,
        batareya=data.batareya,
        mock_gps=data.mock_gps,
        qurilma_vaqti=data.qurilma_vaqti,
        qabul_vaqti=datetime.now(timezone.utc),
    )
    db.add(log)
    await db.flush()
    await db.refresh(log)
    return log


async def get_aktiv_xodimlar(
    db: AsyncSession,
    songi_daqiqa: int = 10,
) -> list[AktivXodimResponse]:
    """
    Oxirgi N daqiqa ichida GPS yuborgan faol xodimlar.
    Har bir xodimdan faqat eng so'nggi nuqta.
    """
    cutoff = datetime.now(timezone.utc) - timedelta(minutes=songi_daqiqa)

    # PostgreSQL DISTINCT ON — har xodimdan eng so'nggi nuqta
    from sqlalchemy import text as sa_text

    result = await db.execute(
        sa_text("""
            SELECT DISTINCT ON (ll.xodim_id)
                ll.xodim_id,
                TRIM(CONCAT_WS(' ', u.familiya, u.ism, u.sharif)) as xodim_fio,
                ll.lat,
                ll.lng,
                ll.aniqlik,
                ll.batareya,
                ll.qabul_vaqti as ohirgi_vaqt
            FROM lokatsiya_log ll
            JOIN users u ON u.id = ll.xodim_id
            WHERE ll.qabul_vaqti >= :cutoff
            ORDER BY ll.xodim_id, ll.qabul_vaqti DESC
        """),
        {"cutoff": cutoff},
    )

    rows = result.fetchall()
    return [
        AktivXodimResponse(
            xodim_id=r.xodim_id,
            xodim_fio=r.xodim_fio,
            lat=r.lat,
            lng=r.lng,
            aniqlik=r.aniqlik,
            batareya=r.batareya,
            ohirgi_vaqt=r.ohirgi_vaqt.isoformat() if r.ohirgi_vaqt else "",
        )
        for r in rows
    ]


async def tozalash_eski_loglar(db: AsyncSession, kun: int = 90) -> int:
    """Eski lokatsiya loglarni o'chirish. O'chirilgan sonni qaytaradi."""
    cutoff = datetime.now(timezone.utc) - timedelta(days=kun)
    result = await db.execute(
        delete(LokatsiyaLog).where(LokatsiyaLog.qabul_vaqti < cutoff)
    )
    await db.flush()
    deleted = result.rowcount
    if deleted:
        logger.info(f"{deleted} ta eski lokatsiya logi o'chirildi")
    return deleted
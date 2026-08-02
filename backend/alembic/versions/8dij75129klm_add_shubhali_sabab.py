"""add_shubhali_sabab

Revision ID: 8dij75129klm
Revises: 7chi64018jkl
Create Date: 2026-08-01 18:30:00.000000

XAVFSIZ XONADON — muammolar jadvaliga `shubhali_sabab` ustuni qo'shildi.

Sabab (mock_gps, gps_aniqlik_past, kunlik_takror, foto_sha256_dublikat,
exif_masofa) allaqachon hisoblanardi, lekin faqat WebSocket xabariga
qo'yilib yo'qolardi. Natijada rahbar ro'yxatda "Shubhali" belgisini
ko'rar, ammo NEGA shubhali ekanini bilolmasdi.

Eski yozuvlar uchun backfill yo'q — sabab qayta hisoblab bo'lmaydi
(NULL qoladi, UI'da "sabab ko'rsatilmagan" deb ko'rsatiladi).
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8dij75129klm'
down_revision: Union[str, None] = '7chi64018jkl'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("muammolar", sa.Column("shubhali_sabab", sa.String(40), nullable=True))


def downgrade() -> None:
    op.drop_column("muammolar", "shubhali_sabab")

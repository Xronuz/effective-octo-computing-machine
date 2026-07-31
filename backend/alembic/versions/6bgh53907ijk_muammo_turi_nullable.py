"""muammo_turi_nullable

Revision ID: 6bgh53907ijk
Revises: 4ebf42785ghi
Create Date: 2026-07-31 10:00:00.000000

XAVFSIZ XONADON — muammolar.turi endi ixtiyoriy. Yangi tekshiruv oqimida
xodim 14 bandli yo'riqnoma checklistidan foydalanadi (natija
taklif_etilgan_tadbirlar'ga yoziladi) va eski 9 turdagi tasnifni
tanlamaydi; muammo topilmagan (faqat tekshirilgan) tashriflar uchun ham
turi bo'sh qoladi.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '6bgh53907ijk'
down_revision: Union[str, None] = '4ebf42785ghi'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column("muammolar", "turi", nullable=True)


def downgrade() -> None:
    # Diqqat: turi=NULL bo'lgan qatorlar bo'lsa, downgrade xato beradi —
    # avval o'sha qatorlarni backfill/o'chirish kerak.
    op.alter_column("muammolar", "turi", nullable=False)

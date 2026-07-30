"""add_tadbirlar_yoriqnoma

Revision ID: 3dae31674fgh
Revises: 2cad20563efg
Create Date: 2026-07-30 14:00:00.000000

XAVFSIZ XONADON — muammolar jadvaliga "Taklif etilgan yong'inga qarshi
tadbirlar" va "Yo'riqnomadan o'tkanlar soni" ustunlari qo'shildi.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '3dae31674fgh'
down_revision: Union[str, None] = '2cad20563efg'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("muammolar", sa.Column("taklif_etilgan_tadbirlar", sa.Text(), nullable=True))
    op.add_column("muammolar", sa.Column("yoriqnomadan_otkanlar_soni", sa.Integer(), nullable=True))


def downgrade() -> None:
    op.drop_column("muammolar", "yoriqnomadan_otkanlar_soni")
    op.drop_column("muammolar", "taklif_etilgan_tadbirlar")

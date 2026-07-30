"""add_topshiriq_kocha_id

Revision ID: 4ebf42785ghi
Revises: 3dae31674fgh
Create Date: 2026-07-30 15:00:00.000000

XAVFSIZ XONADON — topshiriqlar jadvaliga ixtiyoriy "ko'cha" bog'lanishi
qo'shildi (rahbar topshiriqni MFY ichidagi aniq ko'chaga qarab yo'naltirishi
uchun).
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '4ebf42785ghi'
down_revision: Union[str, None] = '3dae31674fgh'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("topshiriqlar", sa.Column("kocha_id", sa.Integer(), nullable=True))
    op.create_foreign_key(
        "fk_topshiriqlar_kocha_id", "topshiriqlar", "kochalar", ["kocha_id"], ["id"]
    )


def downgrade() -> None:
    op.drop_constraint("fk_topshiriqlar_kocha_id", "topshiriqlar", type_="foreignkey")
    op.drop_column("topshiriqlar", "kocha_id")

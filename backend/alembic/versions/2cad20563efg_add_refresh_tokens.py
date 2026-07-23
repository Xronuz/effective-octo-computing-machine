"""add_refresh_tokens

Revision ID: 2cad20563efg
Revises: 1cad20562dfd
Create Date: 2026-07-16 12:00:00.000000

XAVFSIZ XONADON — refresh_tokens jadvali qo'shildi.
JWT refresh tokenlarni DB'da saqlash va bekor qilish imkoniyati.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '2cad20563efg'
down_revision: Union[str, None] = '1cad20562dfd'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """refresh_tokens jadvalini yaratish."""
    op.create_table(
        "refresh_tokens",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("token_jti", sa.String(64), unique=True, nullable=False),
        sa.Column("revoked", sa.Boolean(), server_default="false", nullable=False),
        sa.Column("yaratilgan", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("muddati", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_refresh_token_user", "refresh_tokens", ["user_id"])
    op.create_index("idx_refresh_token_jti", "refresh_tokens", ["token_jti"])


def downgrade() -> None:
    """refresh_tokens jadvalini o'chirish."""
    op.drop_index("idx_refresh_token_jti", table_name="refresh_tokens")
    op.drop_index("idx_refresh_token_user", table_name="refresh_tokens")
    op.drop_table("refresh_tokens")

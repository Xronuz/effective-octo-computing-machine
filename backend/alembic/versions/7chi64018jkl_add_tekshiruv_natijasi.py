"""add_tekshiruv_natijasi

Revision ID: 7chi64018jkl
Revises: 6bgh53907ijk
Create Date: 2026-07-31 10:40:00.000000

XAVFSIZ XONADON — muammolar jadvaliga `tekshiruv_natijasi` ustuni qo'shildi:
xodim xonadonga kira olmagan (uyda hech kim yo'q/eshik ochilmagan) tashriflarni
"muammo yo'q" tashriflardan ajratish uchun. Mavjud qatorlar backfill qilinadi:
turi/taklif_etilgan_tadbirlar to'ldirilgan bo'lsa "muammo_topildi", aks holda
"muammo_yoq" (eski yozuvlarda "kira_olmadi" tushunchasi bo'lmagan).
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7chi64018jkl'
down_revision: Union[str, None] = '6bgh53907ijk'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        "CREATE TYPE tekshiruv_natijasi AS ENUM ('muammo_topildi', 'muammo_yoq', 'kira_olmadi')"
    )
    op.add_column(
        "muammolar",
        sa.Column(
            "tekshiruv_natijasi",
            sa.Enum(
                "muammo_topildi", "muammo_yoq", "kira_olmadi",
                name="tekshiruv_natijasi", create_type=False,
            ),
            nullable=True,
        ),
    )
    op.execute(
        """
        UPDATE muammolar
        SET tekshiruv_natijasi = CASE
            WHEN turi IS NOT NULL
                 OR (taklif_etilgan_tadbirlar IS NOT NULL AND trim(taklif_etilgan_tadbirlar) <> '')
            THEN 'muammo_topildi'::tekshiruv_natijasi
            ELSE 'muammo_yoq'::tekshiruv_natijasi
        END
        """
    )
    op.alter_column(
        "muammolar", "tekshiruv_natijasi",
        nullable=False, server_default="muammo_yoq",
    )


def downgrade() -> None:
    op.drop_column("muammolar", "tekshiruv_natijasi")
    op.execute("DROP TYPE IF EXISTS tekshiruv_natijasi")

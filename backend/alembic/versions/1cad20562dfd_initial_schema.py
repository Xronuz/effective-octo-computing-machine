"""initial_schema

Revision ID: 1cad20562dfd
Revises: 
Create Date: 2026-07-14 18:58:18.702088

XAVFSIZ XONADON — To'liq boshlang'ich ma'lumotlar bazasi sxemasi.
Barcha ENUM tiplar, jadvallar, indekslar va cheklovlar.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from geoalchemy2 import Geometry

# revision identifiers, used by Alembic.
revision: str = '1cad20562dfd'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ============ PostGIS kengaytmasi ============
    op.execute("CREATE EXTENSION IF NOT EXISTS postgis")

    # ============ ENUM tiplar ============
    op.execute("CREATE TYPE user_role AS ENUM ('superadmin', 'rahbar', 'xodim')")
    op.execute("CREATE TYPE user_status AS ENUM ('kutilmoqda', 'faol', 'bloklangan')")
    op.execute("CREATE TYPE muammo_turi AS ENUM ("
               "'ochiq_elektr_simi', 'elektr_shchit_nosoz', 'gaz_shlangi_nosoz', "
               "'gaz_hidi', 'isitish_uskunasi', 'mo_ri_tozalanmagan', "
               "'ot_ochirgich_yoq', 'evakuatsiya_yoli_yopiq', 'boshqa')")
    op.execute("CREATE TYPE muammo_status AS ENUM ('ochiq', 'jarayonda', 'yopilgan', 'muddati_otgan')")
    op.execute("CREATE TYPE xavf_darajasi AS ENUM ('past', 'orta', 'yuqori', 'kritik')")
    op.execute("CREATE TYPE foto_turi AS ENUM ('oldin', 'keyin')")
    op.execute("CREATE TYPE topshiriq_status AS ENUM ('yangi', 'korildi', 'bajarildi', 'kechikkan')")
    op.execute("CREATE TYPE intizom_turi AS ENUM ('ogohlantirish', 'hayfsan', 'ragbat')")

    # ============ users ============
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("guvohnoma_raqami", sa.String(20), unique=True, nullable=False),
        sa.Column("parol_hash", sa.String(255), nullable=False),
        sa.Column("familiya", sa.String(60), nullable=False),
        sa.Column("ism", sa.String(60), nullable=False),
        sa.Column("sharif", sa.String(60), nullable=True),
        sa.Column("lavozim", sa.String(120), nullable=False),
        sa.Column("telefon", sa.String(20), nullable=True),
        sa.Column("profil_foto_url", sa.Text(), nullable=True),
        sa.Column("rol", postgresql.ENUM("superadmin", "rahbar", "xodim", name="user_role", create_type=False),
                  nullable=False, server_default="xodim"),
        sa.Column("holat", postgresql.ENUM("kutilmoqda", "faol", "bloklangan", name="user_status", create_type=False),
                  nullable=False, server_default="kutilmoqda"),
        sa.Column("telegram_chat_id", sa.BigInteger(), nullable=True),
        sa.Column("push_token", sa.Text(), nullable=True),
        sa.Column("yaratilgan", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("oxirgi_kirish", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_users_rol", "users", ["rol"])
    op.create_index("idx_users_holat", "users", ["holat"])

    # ============ mfy ============
    op.create_table(
        "mfy",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("raqami", sa.Integer(), unique=True, nullable=False),
        sa.Column("nomi", sa.String(150), nullable=False),
        sa.Column("chegara", Geometry(geometry_type="POLYGON", srid=4326), nullable=True),
        sa.Column("markaz_lat", sa.Float(), nullable=True),
        sa.Column("markaz_lng", sa.Float(), nullable=True),
        sa.Column("xonadon_soni", sa.Integer(), server_default="0", nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    # GIST indeks Geometry ustuni yaratilganda avtomatik yaratiladi


    # ============ kochalar ============
    op.create_table(
        "kochalar",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("mfy_id", sa.Integer(), sa.ForeignKey("mfy.id", ondelete="CASCADE"), nullable=False),
        sa.Column("nomi", sa.String(150), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("mfy_id", "nomi", name="uq_mfy_kocha"),
    )

    # ============ xonadonlar ============
    op.create_table(
        "xonadonlar",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("kocha_id", sa.Integer(), sa.ForeignKey("kochalar.id", ondelete="CASCADE"), nullable=False),
        sa.Column("uy_raqami", sa.String(20), nullable=False),
        sa.Column("lat", sa.Float(), nullable=True),
        sa.Column("lng", sa.Float(), nullable=True),
        sa.Column("egasi_fio", sa.String(180), nullable=True),
        sa.Column("egasi_tel", sa.String(20), nullable=True),
        sa.Column("izoh", sa.Text(), nullable=True),
        sa.Column("yaratilgan", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("kocha_id", "uy_raqami", name="uq_kocha_uy"),
    )
    op.create_index("idx_xonadon_kocha", "xonadonlar", ["kocha_id"])

    # ============ xodim_mfy ============
    op.create_table(
        "xodim_mfy",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("xodim_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("mfy_id", sa.Integer(), sa.ForeignKey("mfy.id", ondelete="CASCADE"), nullable=False),
        sa.Column("biriktirgan_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("sana", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("faol", sa.Boolean(), server_default="true", nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("xodim_id", "mfy_id", name="uq_xodim_mfy"),
    )

    # ============ muammolar ============
    op.create_table(
        "muammolar",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("xonadon_id", sa.Integer(), sa.ForeignKey("xonadonlar.id"), nullable=False),
        sa.Column("xodim_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("turi", postgresql.ENUM(
            "ochiq_elektr_simi", "elektr_shchit_nosoz", "gaz_shlangi_nosoz",
            "gaz_hidi", "isitish_uskunasi", "mo_ri_tozalanmagan",
            "ot_ochirgich_yoq", "evakuatsiya_yoli_yopiq", "boshqa",
            name="muammo_turi", create_type=False), nullable=False),
        sa.Column("tavsif", sa.Text(), nullable=True),
        sa.Column("xavf", postgresql.ENUM("past", "orta", "yuqori", "kritik", name="xavf_darajasi", create_type=False),
                  nullable=False, server_default="orta"),
        sa.Column("status", postgresql.ENUM("ochiq", "jarayonda", "yopilgan", "muddati_otgan",
                                            name="muammo_status", create_type=False),
                  nullable=False, server_default="ochiq"),
        sa.Column("ornida_bartaraf", sa.Boolean(), server_default="false", nullable=False),
        sa.Column("muddat", sa.Date(), nullable=True),
        sa.Column("muddat_belgilagan_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("tashkilot", sa.String(120), nullable=True),
        sa.Column("tashkilotga_sana", sa.DateTime(timezone=True), nullable=True),
        sa.Column("lat", sa.Float(), nullable=False),
        sa.Column("lng", sa.Float(), nullable=False),
        sa.Column("gps_aniqlik", sa.Float(), nullable=True),
        sa.Column("mock_gps", sa.Boolean(), server_default="false", nullable=False),
        sa.Column("shubhali", sa.Boolean(), server_default="false", nullable=False),
        sa.Column("client_uuid", postgresql.UUID(as_uuid=True), unique=True, nullable=False),
        sa.Column("qurilma_vaqti", sa.DateTime(timezone=True), nullable=False),
        sa.Column("sinxron_vaqti", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("yopilgan_sana", sa.DateTime(timezone=True), nullable=True),
        sa.Column("yopgan_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_muammo_status", "muammolar", ["status"])
    op.create_index("idx_muammo_xodim", "muammolar", ["xodim_id"])
    op.create_index("idx_muammo_muddat", "muammolar", ["muddat"],
                    postgresql_where=sa.text("status IN ('ochiq','jarayonda')"))
    op.create_index("idx_muammo_sana", "muammolar", [sa.text("sinxron_vaqti DESC")])

    # ============ fotolar ============
    op.create_table(
        "fotolar",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("muammo_id", sa.Integer(), sa.ForeignKey("muammolar.id", ondelete="CASCADE"), nullable=False),
        sa.Column("turi", postgresql.ENUM("oldin", "keyin", name="foto_turi", create_type=False), nullable=False),
        sa.Column("fayl_yoli", sa.Text(), nullable=False),
        sa.Column("sha256", sa.String(64), nullable=False),
        sa.Column("exif_lat", sa.Float(), nullable=True),
        sa.Column("exif_lng", sa.Float(), nullable=True),
        sa.Column("exif_vaqt", sa.DateTime(timezone=True), nullable=True),
        sa.Column("olcham_byte", sa.Integer(), nullable=True),
        sa.Column("yuklangan", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_foto_muammo", "fotolar", ["muammo_id"])
    op.create_index("idx_foto_sha", "fotolar", ["sha256"])

    # ============ lokatsiya_log ============
    op.create_table(
        "lokatsiya_log",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("xodim_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("lat", sa.Float(), nullable=False),
        sa.Column("lng", sa.Float(), nullable=False),
        sa.Column("aniqlik", sa.Float(), nullable=True),
        sa.Column("tezlik", sa.Float(), nullable=True),
        sa.Column("batareya", sa.SmallInteger(), nullable=True),
        sa.Column("mock_gps", sa.Boolean(), server_default="false", nullable=False),
        sa.Column("qurilma_vaqti", sa.DateTime(timezone=True), nullable=False),
        sa.Column("qabul_vaqti", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_lok_xodim_vaqt", "lokatsiya_log", ["xodim_id", sa.text("qurilma_vaqti DESC")])

    # ============ topshiriqlar ============
    op.create_table(
        "topshiriqlar",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("rahbar_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("xodim_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("mfy_id", sa.Integer(), sa.ForeignKey("mfy.id"), nullable=True),
        sa.Column("muammo_id", sa.Integer(), sa.ForeignKey("muammolar.id"), nullable=True),
        sa.Column("sarlavha", sa.String(200), nullable=False),
        sa.Column("matn", sa.Text(), nullable=True),
        sa.Column("muddat", sa.Date(), nullable=False),
        sa.Column("status", postgresql.ENUM("yangi", "korildi", "bajarildi", "kechikkan",
                                            name="topshiriq_status", create_type=False),
                  nullable=False, server_default="yangi"),
        sa.Column("yaratilgan", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("korilgan", sa.DateTime(timezone=True), nullable=True),
        sa.Column("bajarilgan", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_topshiriq_xodim", "topshiriqlar", ["xodim_id", "status"])

    # ============ intizom ============
    op.create_table(
        "intizom",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("xodim_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("muammo_id", sa.Integer(), sa.ForeignKey("muammolar.id"), nullable=True),
        sa.Column("turi", postgresql.ENUM("ogohlantirish", "hayfsan", "ragbat",
                                          name="intizom_turi", create_type=False), nullable=False),
        sa.Column("sabab", sa.Text(), nullable=False),
        sa.Column("bergan_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("sana", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )

    # ============ audit_log ============
    op.create_table(
        "audit_log",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("amal", sa.String(60), nullable=False),
        sa.Column("obyekt_turi", sa.String(40), nullable=True),
        sa.Column("obyekt_id", sa.Integer(), nullable=True),
        sa.Column("eski_qiymat", postgresql.JSONB(), nullable=True),
        sa.Column("yangi_qiymat", postgresql.JSONB(), nullable=True),
        sa.Column("ip", postgresql.INET(), nullable=True),
        sa.Column("user_agent", sa.Text(), nullable=True),
        sa.Column("vaqt", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_audit_vaqt", "audit_log", [sa.text("vaqt DESC")])
    op.create_index("idx_audit_user", "audit_log", ["user_id"])

    # ============ Trigger: xonadon_soni yangilash ============
    op.execute("""
        CREATE OR REPLACE FUNCTION update_mfy_xonadon_soni()
        RETURNS TRIGGER AS $$
        BEGIN
            IF TG_OP = 'INSERT' THEN
                UPDATE mfy SET xonadon_soni = (
                    SELECT COUNT(*) FROM xonadonlar
                    WHERE kocha_id IN (SELECT id FROM kochalar WHERE mfy_id = (
                        SELECT mfy_id FROM kochalar WHERE id = NEW.kocha_id
                    ))
                )
                WHERE id = (SELECT mfy_id FROM kochalar WHERE id = NEW.kocha_id);
            ELSIF TG_OP = 'DELETE' THEN
                UPDATE mfy SET xonadon_soni = (
                    SELECT COUNT(*) FROM xonadonlar
                    WHERE kocha_id IN (SELECT id FROM kochalar WHERE mfy_id = (
                        SELECT mfy_id FROM kochalar WHERE id = OLD.kocha_id
                    ))
                )
                WHERE id = (SELECT mfy_id FROM kochalar WHERE id = OLD.kocha_id);
            END IF;
            RETURN NULL;
        END;
        $$ LANGUAGE plpgsql;
    """)
    op.execute("DROP TRIGGER IF EXISTS trg_update_xonadon_soni ON xonadonlar")
    op.execute("""
        CREATE TRIGGER trg_update_xonadon_soni
        AFTER INSERT OR DELETE ON xonadonlar
        FOR EACH ROW EXECUTE FUNCTION update_mfy_xonadon_soni()
    """)

    # ============ Trigger: muammolar audit_log ============
    op.execute("""
        CREATE OR REPLACE FUNCTION audit_muammo_changes()
        RETURNS TRIGGER AS $$
        BEGIN
            IF TG_OP = 'INSERT' THEN
                INSERT INTO audit_log (user_id, amal, obyekt_turi, obyekt_id, yangi_qiymat)
                VALUES (NEW.xodim_id, 'muammo.yaratish', 'muammolar', NEW.id,
                        jsonb_build_object('turi', NEW.turi, 'status', NEW.status, 'xonadon_id', NEW.xonadon_id));
            ELSIF TG_OP = 'UPDATE' THEN
                INSERT INTO audit_log (user_id, amal, obyekt_turi, obyekt_id, eski_qiymat, yangi_qiymat)
                VALUES (
                    COALESCE(NEW.yopgan_id, NEW.xodim_id),
                    'muammo.yangilash',
                    'muammolar', NEW.id,
                    jsonb_build_object('status', OLD.status, 'muddat', OLD.muddat),
                    jsonb_build_object('status', NEW.status, 'muddat', NEW.muddat)
                );
            ELSIF TG_OP = 'DELETE' THEN
                INSERT INTO audit_log (user_id, amal, obyekt_turi, obyekt_id, eski_qiymat)
                VALUES (NULL, 'muammo.ochirish', 'muammolar', OLD.id,
                        jsonb_build_object('turi', OLD.turi, 'status', OLD.status));
            END IF;
            RETURN NULL;
        END;
        $$ LANGUAGE plpgsql;
    """)
    op.execute("DROP TRIGGER IF EXISTS trg_audit_muammo ON muammolar")
    op.execute("""
        CREATE TRIGGER trg_audit_muammo
        AFTER INSERT OR UPDATE OR DELETE ON muammolar
        FOR EACH ROW EXECUTE FUNCTION audit_muammo_changes()
    """)


def downgrade() -> None:
    """Teskari tartibda: triggerlar → jadvallar → ENUM tiplar → kengaytma."""

    # Triggerlarni o'chirish
    op.execute("DROP TRIGGER IF EXISTS trg_audit_muammo ON muammolar")
    op.execute("DROP FUNCTION IF EXISTS audit_muammo_changes()")
    op.execute("DROP TRIGGER IF EXISTS trg_update_xonadon_soni ON xonadonlar")
    op.execute("DROP FUNCTION IF EXISTS update_mfy_xonadon_soni()")

    # Jadvallarni o'chirish (bog'liqlik tartibida)
    op.drop_table("audit_log")
    op.drop_table("intizom")
    op.drop_table("topshiriqlar")
    op.drop_table("lokatsiya_log")
    op.drop_table("fotolar")
    op.drop_table("muammolar")
    op.drop_table("xodim_mfy")
    op.drop_table("xonadonlar")
    op.drop_table("kochalar")
    op.drop_table("mfy")
    op.drop_table("users")

    # ENUM tiplarni o'chirish
    op.execute("DROP TYPE IF EXISTS intizom_turi")
    op.execute("DROP TYPE IF EXISTS topshiriq_status")
    op.execute("DROP TYPE IF EXISTS foto_turi")
    op.execute("DROP TYPE IF EXISTS xavf_darajasi")
    op.execute("DROP TYPE IF EXISTS muammo_status")
    op.execute("DROP TYPE IF EXISTS muammo_turi")
    op.execute("DROP TYPE IF EXISTS user_status")
    op.execute("DROP TYPE IF EXISTS user_role")

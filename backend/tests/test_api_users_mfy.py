"""
XAVFSIZ XONADON — POST /api/users/{id}/mfy endpoint testlari.
Limit (MAX_MFY_PER_XODIM) va ziddiyatli biriktirish (bitta MFY ikki
inspektorga aktiv biriktirilmasligi) logikasini tekshiradi.
"""
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi.testclient import TestClient

from app.main import create_app
from app.core.deps import get_current_user, get_db
from app.models.user import User, UserRole, XodimMfy


def _make_user(user_id=1, rol=UserRole.rahbar):
    u = MagicMock(spec=User)
    u.id = user_id
    u.rol = rol
    u.full_name = f"Test User {user_id}"
    return u


def _make_xodim_mfy(mfy_id, faol=True):
    xm = MagicMock(spec=XodimMfy)
    xm.mfy_id = mfy_id
    xm.faol = faol
    return xm


@pytest.fixture
def client_factory():
    """TestClient yaratish — har test o'z override'larini o'rnatadi."""

    def _make_client(user_override=None, db_override=None):
        app = create_app()
        if user_override:
            app.dependency_overrides[get_current_user] = user_override
        if db_override:
            app.dependency_overrides[get_db] = db_override
        return TestClient(app)

    return _make_client


def _result(scalar_one_or_none=None, scalars_all=None, all_rows=None):
    """db.execute(...) natijasi uchun mock — faqat kerakli metod chaqiriladi."""
    r = MagicMock()
    r.scalar_one_or_none = MagicMock(return_value=scalar_one_or_none)
    scalars_mock = MagicMock()
    scalars_mock.all = MagicMock(return_value=scalars_all or [])
    r.scalars = MagicMock(return_value=scalars_mock)
    r.all = MagicMock(return_value=all_rows or [])
    return r


class TestMfyBiriktirishEndpoint:
    def test_limit_dan_oshsa_rad_etiladi(self, client_factory):
        """8 ta aktiv MFYga ega xodimga 3 ta yangi qo'shish (jami 11 > 10) — 422."""
        rahbar = _make_user(user_id=99, rol=UserRole.rahbar)
        xodim = _make_user(user_id=1, rol=UserRole.xodim)
        mfy_ids_yangi = [9, 10, 11]

        eski_biriktirishlar = [_make_xodim_mfy(i, faol=True) for i in range(1, 9)]  # 1..8

        mock_db = AsyncMock()
        mock_db.execute = AsyncMock(
            side_effect=[
                _result(scalar_one_or_none=xodim),  # 1) foydalanuvchi
                _result(scalars_all=[MagicMock(id=i) for i in mfy_ids_yangi]),  # 2) mfylar mavjud
                _result(scalars_all=eski_biriktirishlar),  # 3) shu xodimning aktiv MFYlari (8 ta)
                _result(all_rows=[]),  # 4) boshqalarga biriktirilgan — yo'q
            ]
        )
        mock_db.flush = AsyncMock()
        mock_db.add = MagicMock()

        client = client_factory(
            user_override=lambda: rahbar,
            db_override=lambda: mock_db,
        )

        resp = client.post("/api/users/1/mfy", json={"mfy_ids": mfy_ids_yangi})
        assert resp.status_code == 422
        assert resp.json()["ok"] is False
        mock_db.add.assert_not_called()

    def test_boshqa_xodimga_biriktirilgan_mfy_majburiysiz_rad_etiladi(self, client_factory):
        """MFY #5 boshqa xodimga aktiv biriktirilgan — majburiy=false bo'lsa 409."""
        rahbar = _make_user(user_id=99, rol=UserRole.rahbar)
        xodim = _make_user(user_id=1, rol=UserRole.xodim)

        eski_xm = _make_xodim_mfy(5, faol=True)
        boshqa_user = MagicMock(spec=User)
        boshqa_user.full_name = "Boshqa Inspektor"

        mock_db = AsyncMock()
        mock_db.execute = AsyncMock(
            side_effect=[
                _result(scalar_one_or_none=xodim),  # 1) foydalanuvchi
                _result(scalars_all=[MagicMock(id=5)]),  # 2) mfy mavjud
                _result(scalars_all=[]),  # 3) shu xodimning aktiv MFYlari — yo'q
                _result(all_rows=[(eski_xm, boshqa_user)]),  # 4) boshqaga biriktirilgan
            ]
        )
        mock_db.flush = AsyncMock()
        mock_db.add = MagicMock()

        client = client_factory(
            user_override=lambda: rahbar,
            db_override=lambda: mock_db,
        )

        resp = client.post("/api/users/1/mfy", json={"mfy_ids": [5]})
        assert resp.status_code == 409
        assert "Boshqa Inspektor" in resp.json()["xato"]
        assert eski_xm.faol is True  # majburiy emas — eski biriktirish tegilmaydi
        mock_db.add.assert_not_called()

    def test_majburiy_true_bolsa_eski_inspektordan_otkaziladi(self, client_factory):
        """majburiy=true — MFY #5 eski inspektordan olib, yangisiga biriktiriladi."""
        rahbar = _make_user(user_id=99, rol=UserRole.rahbar)
        xodim = _make_user(user_id=1, rol=UserRole.xodim)

        eski_xm = _make_xodim_mfy(5, faol=True)
        boshqa_user = MagicMock(spec=User)
        boshqa_user.full_name = "Boshqa Inspektor"

        mock_db = AsyncMock()
        mock_db.execute = AsyncMock(
            side_effect=[
                _result(scalar_one_or_none=xodim),  # 1) foydalanuvchi
                _result(scalars_all=[MagicMock(id=5)]),  # 2) mfy mavjud
                _result(scalars_all=[]),  # 3) shu xodimning aktiv MFYlari — yo'q
                _result(all_rows=[(eski_xm, boshqa_user)]),  # 4) boshqaga biriktirilgan
                _result(scalar_one_or_none=None),  # 5) shu xodim uchun mfy_id=5 yozuvi — yo'q
            ]
        )
        mock_db.flush = AsyncMock()
        mock_db.add = MagicMock()

        client = client_factory(
            user_override=lambda: rahbar,
            db_override=lambda: mock_db,
        )

        resp = client.post("/api/users/1/mfy", json={"mfy_ids": [5], "majburiy": True})
        assert resp.status_code == 200
        assert resp.json()["ok"] is True
        assert eski_xm.faol is False  # eski inspektordan olib qo'yildi
        # db.add audit yozuvi uchun ham chaqiriladi — yangi XodimMfy alohida tekshiriladi
        assert any(
            isinstance(c.args[0], XodimMfy) for c in mock_db.add.call_args_list
        )

    def test_muvaffaqiyatli_biriktirish_ziddiyatsiz(self, client_factory):
        """Ziddiyatsiz, limit ichida — oddiy muvaffaqiyatli biriktirish."""
        rahbar = _make_user(user_id=99, rol=UserRole.rahbar)
        xodim = _make_user(user_id=1, rol=UserRole.xodim)

        mock_db = AsyncMock()
        mock_db.execute = AsyncMock(
            side_effect=[
                _result(scalar_one_or_none=xodim),  # 1) foydalanuvchi
                _result(scalars_all=[MagicMock(id=1)]),  # 2) mfy mavjud
                _result(scalars_all=[]),  # 3) shu xodimning aktiv MFYlari — yo'q
                _result(all_rows=[]),  # 4) boshqaga biriktirilgan — yo'q
                _result(scalar_one_or_none=None),  # 5) shu xodim uchun mfy_id=1 yozuvi — yo'q
            ]
        )
        mock_db.flush = AsyncMock()
        mock_db.add = MagicMock()

        client = client_factory(
            user_override=lambda: rahbar,
            db_override=lambda: mock_db,
        )

        resp = client.post("/api/users/1/mfy", json={"mfy_ids": [1]})
        assert resp.status_code == 200
        assert resp.json()["ok"] is True
        assert any(
            isinstance(c.args[0], XodimMfy) for c in mock_db.add.call_args_list
        )

    def test_avval_nofaol_biriktirish_qayta_faollashtiriladi(self, client_factory):
        """MFY oldin shu xodimga biriktirilib, keyin ajratilgan (faol=False) —
        qayta biriktirilganda yangi qator emas, mavjudi qayta faollashtiriladi."""
        rahbar = _make_user(user_id=99, rol=UserRole.rahbar)
        xodim = _make_user(user_id=1, rol=UserRole.xodim)

        eski_nofaol = _make_xodim_mfy(3, faol=False)

        mock_db = AsyncMock()
        mock_db.execute = AsyncMock(
            side_effect=[
                _result(scalar_one_or_none=xodim),  # 1) foydalanuvchi
                _result(scalars_all=[MagicMock(id=3)]),  # 2) mfy mavjud
                _result(scalars_all=[]),  # 3) shu xodimning aktiv MFYlari — yo'q (bu nofaol)
                _result(all_rows=[]),  # 4) boshqaga biriktirilgan — yo'q
                _result(scalar_one_or_none=eski_nofaol),  # 5) mavjud nofaol yozuv topildi
            ]
        )
        mock_db.flush = AsyncMock()
        mock_db.add = MagicMock()

        client = client_factory(
            user_override=lambda: rahbar,
            db_override=lambda: mock_db,
        )

        resp = client.post("/api/users/1/mfy", json={"mfy_ids": [3]})
        assert resp.status_code == 200
        assert resp.json()["ok"] is True
        assert eski_nofaol.faol is True  # qayta faollashtirildi
        # Yangi XodimMfy qator YARATILMAGAN — faqat audit yozuvi qo'shildi
        assert not any(
            isinstance(c.args[0], XodimMfy) for c in mock_db.add.call_args_list
        )

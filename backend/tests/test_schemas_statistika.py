"""
XAVFSIZ XONADON — Statistika schemalari uchun testlar.
"""
from app.schemas.statistika import (
    UmumiyStatistika,
    MuammoTuriStat,
    MuammoXavfStat,
    MuammoStatusStat,
    MFYStatistika,
    TopshiriqStat,
    IntizomStat,
    VaqtDavriStat,
    StatistikaResponse,
    XodimStatistika,
)


class TestUmumiyStatistika:
    """UmumiyStatistika schema testlari."""

    def test_mandatory_fields(self):
        s = UmumiyStatistika(
            xonadon_soni=100, muammo_soni=50, ochiq_muammolar=10,
            yopilgan_muammolar=40, xodim_soni=5, mfy_soni=53,
            kocha_soni=50, tekshirilgan_xonadon=20, foiz=20.0,
        )
        assert s.xonadon_soni == 100
        assert s.muammo_soni == 50
        assert s.ochiq_muammolar == 10
        assert s.yopilgan_muammolar == 40
        assert s.xodim_soni == 5
        assert s.mfy_soni == 53
        assert s.tekshirilgan_xonadon == 20
        assert s.foiz == 20.0

    def test_ozgaruvchilar_nomi_uzbek(self):
        """Barcha maydon nomlari loyiha standartiga mos."""
        s = UmumiyStatistika(
            xonadon_soni=1, muammo_soni=1, ochiq_muammolar=0,
            yopilgan_muammolar=0, xodim_soni=1, mfy_soni=1,
            kocha_soni=50, tekshirilgan_xonadon=0, foiz=0.0,
        )
        d = s.model_dump()
        assert "xonadon_soni" in d
        assert "muammo_soni" in d
        assert "ochiq_muammolar" in d
        assert "yopilgan_muammolar" in d
        assert "xodim_soni" in d
        assert "mfy_soni" in d
        assert "tekshirilgan_xonadon" in d
        assert "foiz" in d

    def test_foiz_0_100_range(self):
        """foiz 0.0 dan 100.0 gacha bo'lishi kerak."""
        for val in (0.0, 50.0, 100.0):
            s = UmumiyStatistika(
                xonadon_soni=1, muammo_soni=0, ochiq_muammolar=0,
                yopilgan_muammolar=0, xodim_soni=1, mfy_soni=1,
                kocha_soni=50, tekshirilgan_xonadon=0, foiz=val,
            )
            assert s.foiz == val


class TestMuammoTuriStat:
    def test_valid(self):
        s = MuammoTuriStat(turi="ochiq_elektr_simi", soni=15)
        assert s.turi == "ochiq_elektr_simi"
        assert s.soni == 15

    def test_serialization(self):
        s = MuammoTuriStat(turi="gaz_hidi", soni=5)
        d = s.model_dump()
        assert d == {"turi": "gaz_hidi", "soni": 5}


class TestMuammoXavfStat:
    def test_valid(self):
        s = MuammoXavfStat(xavf="kritik", soni=3)
        assert s.xavf == "kritik"
        assert s.soni == 3


class TestMuammoStatusStat:
    def test_valid(self):
        s = MuammoStatusStat(status="ochiq", soni=10)
        assert s.status == "ochiq"
        assert s.soni == 10


class TestMFYStatistika:
    def test_valid(self):
        s = MFYStatistika(
            mfy_id=1, mfy_nomi="Barkamol MFY",
            xonadon_soni=200, tekshirilgan=150,
            ochiq_muammo=5, yopilgan_muammo=10, foiz=75.0,
        )
        assert s.mfy_id == 1
        assert s.mfy_nomi == "Barkamol MFY"
        assert s.xonadon_soni == 200
        assert s.tekshirilgan == 150
        assert s.ochiq_muammo == 5
        assert s.yopilgan_muammo == 10
        assert s.foiz == 75.0

    def test_zero_values(self):
        s = MFYStatistika(
            mfy_id=99, mfy_nomi="Bo'sh MFY",
            xonadon_soni=0, tekshirilgan=0,
            ochiq_muammo=0, yopilgan_muammo=0, foiz=0.0,
        )
        assert s.xonadon_soni == 0
        assert s.foiz == 0.0


class TestTopshiriqStat:
    def test_valid(self):
        s = TopshiriqStat(jami=40, yangi=10, korildi=15, bajarildi=12, kechikkan=3)
        assert s.jami == 40
        assert s.yangi == 10
        assert s.korildi == 15
        assert s.bajarildi == 12
        assert s.kechikkan == 3

    def test_sum_equals_jami(self):
        s = TopshiriqStat(jami=40, yangi=10, korildi=15, bajarildi=12, kechikkan=3)
        assert s.yangi + s.korildi + s.bajarildi + s.kechikkan == s.jami


class TestIntizomStat:
    def test_valid(self):
        s = IntizomStat(jami=30, ogohlantirish=20, hayfsan=5, ragbat=5)
        assert s.jami == 30
        assert s.ogohlantirish == 20
        assert s.hayfsan == 5
        assert s.ragbat == 5

    def test_sum_equals_jami(self):
        s = IntizomStat(jami=30, ogohlantirish=20, hayfsan=5, ragbat=5)
        assert s.ogohlantirish + s.hayfsan + s.ragbat == s.jami


class TestVaqtDavriStat:
    def test_valid(self):
        s = VaqtDavriStat(davr="2026-01", ochilgan=15, yopilgan=12)
        assert s.davr == "2026-01"
        assert s.ochilgan == 15
        assert s.yopilgan == 12


class TestStatistikaResponse:
    def test_full_response(self):
        u = UmumiyStatistika(
            xonadon_soni=100, muammo_soni=50, ochiq_muammolar=10,
            yopilgan_muammolar=40, xodim_soni=5, mfy_soni=53,
            kocha_soni=50, tekshirilgan_xonadon=20, foiz=20.0,
        )
        turlar = [MuammoTuriStat(turi="gaz_hidi", soni=5)]
        xavf = [MuammoXavfStat(xavf="yuqori", soni=3)]
        status = [MuammoStatusStat(status="ochiq", soni=10)]
        mfylar = [MFYStatistika(
            mfy_id=1, mfy_nomi="Test MFY", xonadon_soni=100,
            tekshirilgan=50, ochiq_muammo=3, yopilgan_muammo=7, foiz=50.0,
        )]
        topshiriqlar = TopshiriqStat(jami=10, yangi=3, korildi=4, bajarildi=2, kechikkan=1)
        intizom = IntizomStat(jami=10, ogohlantirish=7, hayfsan=2, ragbat=1)
        dinamika = [VaqtDavriStat(davr="2026-07", ochilgan=8, yopilgan=6)]

        resp = StatistikaResponse(
            umumiy=u,
            muammo_turlari=turlar,
            muammo_xavf=xavf,
            muammo_status=status,
            mfylar=mfylar,
            topshiriqlar=topshiriqlar,
            intizom=intizom,
            vaqt_dinamika=dinamika,
        )
        assert resp.umumiy.xonadon_soni == 100
        assert len(resp.muammo_turlari) == 1
        assert resp.vaqt_dinamika[0].davr == "2026-07"

    def test_model_dump(self):
        u = UmumiyStatistika(
            xonadon_soni=1, muammo_soni=1, ochiq_muammolar=0,
            yopilgan_muammolar=0, xodim_soni=1, mfy_soni=1,
            kocha_soni=50, tekshirilgan_xonadon=0, foiz=0.0,
        )
        resp = StatistikaResponse(
            umumiy=u, muammo_turlari=[], muammo_xavf=[], muammo_status=[],
            mfylar=[], topshiriqlar=TopshiriqStat(jami=0, yangi=0, korildi=0, bajarildi=0, kechikkan=0),
            intizom=IntizomStat(jami=0, ogohlantirish=0, hayfsan=0, ragbat=0),
            vaqt_dinamika=[],
        )
        d = resp.model_dump()
        assert "umumiy" in d
        assert "muammo_turlari" in d
        assert "topshiriqlar" in d
        assert "intizom" in d


class TestXodimStatistika:
    def test_valid(self):
        s = XodimStatistika(
            xodim_id=1, xodim_fio="Karimov Akmal Alievich",
            jami_muammo=20, ochiq_muammo=3, yopilgan_muammo=17,
            jami_tekshirish=20, oxirgi_faollik="2026-07-14T10:30:00",
        )
        assert s.xodim_id == 1
        assert s.xodim_fio == "Karimov Akmal Alievich"
        assert s.jami_muammo == 20
        assert s.ochiq_muammo == 3
        assert s.yopilgan_muammo == 17
        assert s.oxirgi_faollik == "2026-07-14T10:30:00"

    def test_oxirgi_faollik_none(self):
        s = XodimStatistika(
            xodim_id=2, xodim_fio="Aliyev Botir",
            jami_muammo=0, ochiq_muammo=0, yopilgan_muammo=0,
            jami_tekshirish=0, oxirgi_faollik=None,
        )
        assert s.oxirgi_faollik is None

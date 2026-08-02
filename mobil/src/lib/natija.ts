// Tashrif natijasi — yagona manba.
//
// Natijani `turi`/`taklif_etilgan_tadbirlar` bo'yicha taxmin qilish XATO:
// xonadonga kira olmagan tashrifda ikkalasi ham bo'sh bo'ladi va yozuv
// "muammo topilmadi" bo'lib ko'rinardi (aslida inspektor uyga kirmagan).
// Shuning uchun `tekshiruv_natijasi` maydoni birinchi o'rinda tekshiriladi.

import { bandlarniParse } from '../constants/yoriqnoma';
import type { MuammoSummary } from '../types';
import type { NavbatYozuvi } from '../services/db';

export type Natija = 'muammo_topildi' | 'muammo_yoq' | 'kira_olmadi';

export const NATIJA_MATNI: Record<Natija, { toliq: string; qisqa: string }> = {
  muammo_topildi: { toliq: 'Muammo topildi', qisqa: 'Muammoli' },
  muammo_yoq: { toliq: 'Tekshirildi — muammo topilmadi', qisqa: 'Muammosiz' },
  kira_olmadi: { toliq: 'Kira olmadi — uyda hech kim yo‘q', qisqa: 'Kira olmadi' },
};

/** Serverdan kelgan tashrif natijasi. */
export function muammoNatijasi(m: MuammoSummary): Natija {
  if (m.tekshiruv_natijasi === 'kira_olmadi') return 'kira_olmadi';
  if (m.tekshiruv_natijasi === 'muammo_topildi') return 'muammo_topildi';
  if (m.tekshiruv_natijasi === 'muammo_yoq') return 'muammo_yoq';
  // Eski (tekshiruv_natijasi to'ldirilmagan) yozuvlar uchun zaxira mantiq
  const bandlar = bandlarniParse(m.taklif_etilgan_tadbirlar);
  return m.turi || bandlar.length > 0 ? 'muammo_topildi' : 'muammo_yoq';
}

/** Qurilmadagi navbat yozuvi natijasi (hali serverga yuborilmagan). */
export function navbatNatijasi(y: NavbatYozuvi): Natija {
  if (y.kira_olmadi) return 'kira_olmadi';
  const bandlar = bandlarniParse(y.taklif_etilgan_tadbirlar);
  return y.turi || bandlar.length > 0 ? 'muammo_topildi' : 'muammo_yoq';
}

/**
 * Ro'yxatlarda ko'rsatiladigan sarlavha: muammo bo'lsa yo'riqnoma bandlari,
 * aks holda natija matni.
 */
/**
 * Xonadon uchun keyingi mantiqiy amal.
 *
 * Bitta "Tekshiruv qilish" tugmasi o'rniga kontekstga mos amal taklif
 * qilinadi — avval inspektor muammoli uyga qaytganda ham faqat yangi
 * tekshiruv yoza olardi, natijada asl muammo ochiq qolib, statistika
 * shishardi.
 */
export type XonadonAmali =
  | { turi: 'tekshirish' }
  | { turi: 'muammoni_yopish'; muammoId: number; sarlavha: string }
  | { turi: 'bugun_tekshirilgan'; vaqt: string };

function bugungiMi(isoVaqt: string | null, bugun: string): boolean {
  if (!isoVaqt) return false;
  const d = new Date(isoVaqt);
  if (Number.isNaN(d.getTime())) return false;
  const oy = String(d.getMonth() + 1).padStart(2, '0');
  const kun = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${oy}-${kun}` === bugun;
}

export function xonadonAmali(muammolar: MuammoSummary[], bugun: string): XonadonAmali {
  // 1) Ochiq muammo bor — uni yopish kerak, yangi tekshiruv emas
  const ochiq = muammolar.find(
    (m) => muammoNatijasi(m) === 'muammo_topildi' && m.status !== 'yopilgan',
  );
  if (ochiq) {
    return {
      turi: 'muammoni_yopish',
      muammoId: ochiq.id,
      sarlavha: natijaSarlavhasi('muammo_topildi', {
        turi: ochiq.turi,
        turiNomi: ochiq.turi_nomi,
        bandlarCsv: ochiq.taklif_etilgan_tadbirlar,
      }),
    };
  }

  // 2) Bugun allaqachon tekshirilgan (kira olmadi hisobga olinmaydi)
  const bugungi = muammolar.find(
    (m) => muammoNatijasi(m) !== 'kira_olmadi' && bugungiMi(m.sinxron_vaqti, bugun),
  );
  if (bugungi) {
    const d = new Date(bugungi.sinxron_vaqti);
    const soat = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    return { turi: 'bugun_tekshirilgan', vaqt: soat };
  }

  return { turi: 'tekshirish' };
}

export function natijaSarlavhasi(
  natija: Natija,
  opts: { turi?: string | null; turiNomi?: string | null; bandlarCsv?: string | null } = {},
): string {
  if (natija !== 'muammo_topildi') return NATIJA_MATNI[natija].toliq;
  if (opts.turi) return opts.turiNomi || opts.turi;
  const bandlar = bandlarniParse(opts.bandlarCsv);
  return bandlar.length > 0 ? `Yo'riqnoma bandlari: ${bandlar.join(', ')}` : 'Muammo topildi';
}

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
export function natijaSarlavhasi(
  natija: Natija,
  opts: { turi?: string | null; turiNomi?: string | null; bandlarCsv?: string | null } = {},
): string {
  if (natija !== 'muammo_topildi') return NATIJA_MATNI[natija].toliq;
  if (opts.turi) return opts.turiNomi || opts.turi;
  const bandlar = bandlarniParse(opts.bandlarCsv);
  return bandlar.length > 0 ? `Yo'riqnoma bandlari: ${bandlar.join(', ')}` : 'Muammo topildi';
}

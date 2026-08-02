import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import api from '../services/api';
import { getNavbatYozuvlari } from '../services/db';
import { isoVaqtningKuni } from '../lib/sana';
import { navbatNatijasi, muammoNatijasi, type Natija } from '../lib/natija';
import type { ApiResponse, MuammoSummary, Paginated } from '../types';

/** ISO sanaga 1 kun qo'shadi (mahalliy vaqt zonasidan mustaqil). */
function ertangiKun(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
}

export interface XonadonRoyxatItem {
  xonadon_id: number;
  manzil: string | null;
}

/** Kunlik statistika kartochkalaridagi 4 toifa. */
export type KunlikToifa = 'jami' | 'muammosiz' | 'muammoli' | 'kiraOlmadi';

export interface KunlikStat {
  jami: number;
  muammosiz: number;
  muammoli: number;
  kiraOlmadi: number;
  /** Shu kunda hali serverga yuborilmagan (navbatdagi) tashriflar soni. */
  yuborilmagan: number;
  /** Har toifa uchun xonadonlar ro'yxati — kartochkani bosganda pastda ko'rsatish uchun. */
  royxatlar: Record<KunlikToifa, XonadonRoyxatItem[]>;
}

const BOSH: KunlikStat = {
  jami: 0,
  muammosiz: 0,
  muammoli: 0,
  kiraOlmadi: 0,
  yuborilmagan: 0,
  royxatlar: { jami: [], muammosiz: [], muammoli: [], kiraOlmadi: [] },
};

function boshQiymat(): KunlikStat {
  return { ...BOSH, royxatlar: { jami: [], muammosiz: [], muammoli: [], kiraOlmadi: [] } };
}

interface KunlikJavob {
  jami: number;
  muammosiz: number;
  muammoli: number;
  kira_olmadi: number;
}

/** Bitta tashrif — toifalash va "kira olmadi" bosqichini aniqlash uchun. */
interface TashrifYozuvi {
  xonadon_id: number;
  manzil: string | null;
  natija: Natija;
  /** Tashrif haqiqatda sodir bo'lgan payt (qurilma vaqti) — millisekundda. */
  vaqtMs: number;
}

/**
 * "Kira olmadi" ro'yxati — faqat shu kunda ALI ham qaytib borilmagan
 * xonadonlarni ko'rsatishi kerak. Agar xonadonga "kira olmadi" dan keyin
 * shu kuniyoq qayta tashrif buyurilib, haqiqiy tekshiruv o'tkazilgan bo'lsa
 * (muammosiz yoki muammoli), u endi "kutilayotgan" emas — ro'yxatdan
 * chiqarib tashlanadi. Har xonadon bo'yicha eng oxirgi tashrif hal qiluvchi.
 */
function kiraOlmadiRoyxatiniHisobla(hamma: TashrifYozuvi[]): XonadonRoyxatItem[] {
  const oxirgi = new Map<number, TashrifYozuvi>();
  for (const t of hamma) {
    const mavjud = oxirgi.get(t.xonadon_id);
    if (!mavjud || t.vaqtMs >= mavjud.vaqtMs) oxirgi.set(t.xonadon_id, t);
  }
  const natija: XonadonRoyxatItem[] = [];
  for (const t of oxirgi.values()) {
    if (t.natija === 'kira_olmadi') natija.push({ xonadon_id: t.xonadon_id, manzil: t.manzil });
  }
  return natija;
}

/**
 * Tanlangan kunda joriy xodimning tekshiruv statistikasi.
 *
 * Serverdagi (sinxronlangan) yozuvlar `/statistika/kunlik` dan olinadi va
 * ustiga qurilmada hali yuborilmagan navbat yozuvlari qo'shiladi — aks holda
 * offline ishlagan xodim o'z ishini "0" deb ko'rardi. Har toifa (jami,
 * muammosiz, muammoli, kira olmadi) uchun xonadonlar ro'yxati ham
 * yig'iladi — statistika kartochkasida har birini alohida ochib ko'rish
 * mumkin bo'lishi uchun.
 */
export function useKunlikTekshiruv(sanaIso: string): {
  stat: KunlikStat;
  loading: boolean;
  yangila: () => void;
} {
  const [stat, setStat] = useState<KunlikStat>(boshQiymat);
  const [loading, setLoading] = useState(false);

  const yuklash = useCallback(async () => {
    setLoading(true);

    // 1) Qurilmadagi navbat (server bilan bog'liq emas — doim hisoblanadi).
    const navbatTashriflar: TashrifYozuvi[] = [];
    let yuborilmagan = 0;
    try {
      const yozuvlar = await getNavbatYozuvlari();
      for (const y of yozuvlar) {
        if (y.status === 'yuborilgan' || y.status === 'xato') continue;
        if (isoVaqtningKuni(y.yaratilgan) !== sanaIso) continue;
        yuborilmagan += 1;
        navbatTashriflar.push({
          xonadon_id: y.xonadon_id,
          manzil: null,
          natija: navbatNatijasi(y),
          vaqtMs: new Date(y.yaratilgan).getTime() || 0,
        });
      }
    } catch {
      // e'tiborsiz qoldiriladi — navbat bo'sh holicha qoladi
    }

    const hisoblaVaSaqla = (serverTashriflar: TashrifYozuvi[], serverJavob: KunlikJavob | null) => {
      const hamma = [...serverTashriflar, ...navbatTashriflar];

      const royxatlar: Record<KunlikToifa, XonadonRoyxatItem[]> = {
        jami: hamma.map((t) => ({ xonadon_id: t.xonadon_id, manzil: t.manzil })),
        muammosiz: hamma
          .filter((t) => t.natija === 'muammo_yoq')
          .map((t) => ({ xonadon_id: t.xonadon_id, manzil: t.manzil })),
        muammoli: hamma
          .filter((t) => t.natija === 'muammo_topildi')
          .map((t) => ({ xonadon_id: t.xonadon_id, manzil: t.manzil })),
        kiraOlmadi: kiraOlmadiRoyxatiniHisobla(hamma),
      };

      const navbatSoni = {
        jami: navbatTashriflar.length,
        muammosiz: navbatTashriflar.filter((t) => t.natija === 'muammo_yoq').length,
        muammoli: navbatTashriflar.filter((t) => t.natija === 'muammo_topildi').length,
      };

      setStat({
        jami: (serverJavob?.jami ?? 0) + navbatSoni.jami,
        muammosiz: (serverJavob?.muammosiz ?? 0) + navbatSoni.muammosiz,
        muammoli: (serverJavob?.muammoli ?? 0) + navbatSoni.muammoli,
        kiraOlmadi: royxatlar.kiraOlmadi.length,
        yuborilmagan,
        royxatlar,
      });
    };

    // 2) Serverdagi sinxronlangan yozuvlar
    try {
      const { data } = await api.get<ApiResponse<KunlikJavob>>(
        `/statistika/kunlik?sana=${sanaIso}`,
      );
      const s = data.ok && data.data ? data.data : null;

      let serverTashriflar: TashrifYozuvi[] = [];
      if ((s?.jami ?? 0) > 0) {
        try {
          const params = new URLSearchParams({
            sana_dan: sanaIso,
            sana_gacha: ertangiKun(sanaIso),
            size: '100',
          });
          const { data: royxat } = await api.get<ApiResponse<Paginated<MuammoSummary>>>(
            `/muammolar?${params}`,
          );
          const items = royxat.ok ? (royxat.data?.items ?? []) : [];
          serverTashriflar = items.map((m) => ({
            xonadon_id: m.xonadon_id,
            manzil: m.xonadon_manzili,
            natija: muammoNatijasi(m),
            vaqtMs: new Date(m.qurilma_vaqti || m.sinxron_vaqti).getTime() || 0,
          }));
        } catch {
          // Ro'yxat olinmasa ham sonlar ko'rsatiladi
        }
      }

      hisoblaVaSaqla(serverTashriflar, s);
    } catch {
      // Tarmoq yo'q — hech bo'lmasa qurilmadagi ish ko'rinib tursin
      hisoblaVaSaqla([], null);
    } finally {
      setLoading(false);
    }
  }, [sanaIso]);

  useEffect(() => {
    yuklash();
  }, [yuklash]);

  // Tekshiruv saqlab qaytilganda ko'rsatkich darhol yangilanadi
  useFocusEffect(
    useCallback(() => {
      yuklash();
    }, [yuklash]),
  );

  return { stat, loading, yangila: yuklash };
}

import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import api from '../services/api';
import { getNavbatYozuvlari } from '../services/db';
import { isoVaqtningKuni } from '../lib/sana';
import { navbatNatijasi, muammoNatijasi } from '../lib/natija';
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
    const navbat = boshQiymat();
    try {
      const yozuvlar = await getNavbatYozuvlari();
      for (const y of yozuvlar) {
        if (y.status === 'yuborilgan' || y.status === 'xato') continue;
        if (isoVaqtningKuni(y.yaratilgan) !== sanaIso) continue;
        navbat.jami += 1;
        navbat.yuborilmagan += 1;
        const item: XonadonRoyxatItem = { xonadon_id: y.xonadon_id, manzil: null };
        navbat.royxatlar.jami.push(item);
        const natija = navbatNatijasi(y);
        if (natija === 'kira_olmadi') {
          navbat.kiraOlmadi += 1;
          navbat.royxatlar.kiraOlmadi.push(item);
        } else if (natija === 'muammo_topildi') {
          navbat.muammoli += 1;
          navbat.royxatlar.muammoli.push(item);
        } else {
          navbat.muammosiz += 1;
          navbat.royxatlar.muammosiz.push(item);
        }
      }
    } catch {
      // e'tiborsiz qoldiriladi — navbat bo'sh holicha qoladi
    }

    // 2) Serverdagi sinxronlangan yozuvlar
    try {
      const { data } = await api.get<ApiResponse<KunlikJavob>>(
        `/statistika/kunlik?sana=${sanaIso}`,
      );
      const s = data.ok && data.data ? data.data : null;

      // Shu kunning barcha tashriflari — toifalarga ajratib, ro'yxat sifatida
      const serverRoyxatlar: Record<KunlikToifa, XonadonRoyxatItem[]> = {
        jami: [],
        muammosiz: [],
        muammoli: [],
        kiraOlmadi: [],
      };
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
          for (const m of items) {
            const elem: XonadonRoyxatItem = { xonadon_id: m.xonadon_id, manzil: m.xonadon_manzili };
            serverRoyxatlar.jami.push(elem);
            const natija = muammoNatijasi(m);
            if (natija === 'kira_olmadi') serverRoyxatlar.kiraOlmadi.push(elem);
            else if (natija === 'muammo_topildi') serverRoyxatlar.muammoli.push(elem);
            else serverRoyxatlar.muammosiz.push(elem);
          }
        } catch {
          // Ro'yxat olinmasa ham sonlar ko'rsatiladi
        }
      }

      setStat({
        jami: (s?.jami ?? 0) + navbat.jami,
        muammosiz: (s?.muammosiz ?? 0) + navbat.muammosiz,
        muammoli: (s?.muammoli ?? 0) + navbat.muammoli,
        kiraOlmadi: (s?.kira_olmadi ?? 0) + navbat.kiraOlmadi,
        yuborilmagan: navbat.yuborilmagan,
        royxatlar: {
          jami: [...serverRoyxatlar.jami, ...navbat.royxatlar.jami],
          muammosiz: [...serverRoyxatlar.muammosiz, ...navbat.royxatlar.muammosiz],
          muammoli: [...serverRoyxatlar.muammoli, ...navbat.royxatlar.muammoli],
          kiraOlmadi: [...serverRoyxatlar.kiraOlmadi, ...navbat.royxatlar.kiraOlmadi],
        },
      });
    } catch {
      // Tarmoq yo'q — hech bo'lmasa qurilmadagi ish ko'rinib tursin
      setStat(navbat);
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

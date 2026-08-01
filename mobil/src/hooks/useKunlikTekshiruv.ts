import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import api from '../services/api';
import { getNavbatYozuvlari } from '../services/db';
import { isoVaqtningKuni } from '../lib/sana';
import { navbatNatijasi } from '../lib/natija';
import type { ApiResponse, MuammoSummary, Paginated } from '../types';

/** ISO sanaga 1 kun qo'shadi (mahalliy vaqt zonasidan mustaqil). */
function ertangiKun(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
}

export interface KiraOlmadiXonadon {
  xonadon_id: number;
  manzil: string | null;
}

export interface KunlikStat {
  jami: number;
  muammosiz: number;
  muammoli: number;
  kiraOlmadi: number;
  /** Shu kunda hali serverga yuborilmagan (navbatdagi) tashriflar soni. */
  yuborilmagan: number;
  /** Kira olinmagan xonadonlar — qayta tashrif uchun ro'yxat. */
  kiraOlmadiRoyxat: KiraOlmadiXonadon[];
}

const BOSH: KunlikStat = {
  jami: 0,
  muammosiz: 0,
  muammoli: 0,
  kiraOlmadi: 0,
  yuborilmagan: 0,
  kiraOlmadiRoyxat: [],
};

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
 * offline ishlagan xodim o'z ishini "0" deb ko'rardi.
 */
export function useKunlikTekshiruv(sanaIso: string): {
  stat: KunlikStat;
  loading: boolean;
  yangila: () => void;
} {
  const [stat, setStat] = useState<KunlikStat>(BOSH);
  const [loading, setLoading] = useState(false);

  const yuklash = useCallback(async () => {
    setLoading(true);

    // 1) Qurilmadagi navbat (server bilan bog'liq emas — doim hisoblanadi).
    // Diqqat: massiv ALOHIDA yaratiladi — `{...BOSH}` uni havola bo'yicha
    // nusxalar va push() modul darajasidagi BOSH'ni o'zgartirib yuborardi.
    let navbat: KunlikStat = { ...BOSH, kiraOlmadiRoyxat: [] };
    try {
      const yozuvlar = await getNavbatYozuvlari();
      for (const y of yozuvlar) {
        if (y.status === 'yuborilgan' || y.status === 'xato') continue;
        if (isoVaqtningKuni(y.yaratilgan) !== sanaIso) continue;
        navbat.jami += 1;
        navbat.yuborilmagan += 1;
        const natija = navbatNatijasi(y);
        if (natija === 'kira_olmadi') {
          navbat.kiraOlmadi += 1;
          navbat.kiraOlmadiRoyxat.push({ xonadon_id: y.xonadon_id, manzil: null });
        } else if (natija === 'muammo_topildi') navbat.muammoli += 1;
        else navbat.muammosiz += 1;
      }
    } catch {
      navbat = { ...BOSH, kiraOlmadiRoyxat: [] };
    }

    // 2) Serverdagi sinxronlangan yozuvlar
    try {
      const { data } = await api.get<ApiResponse<KunlikJavob>>(
        `/statistika/kunlik?sana=${sanaIso}`,
      );
      const s = data.ok && data.data ? data.data : null;

      // Kira olinmagan xonadonlar ro'yxati — qayta tashrif uchun
      let serverKiraOlmadi: KiraOlmadiXonadon[] = [];
      if ((s?.kira_olmadi ?? 0) > 0) {
        try {
          const params = new URLSearchParams({
            tekshiruv_natijasi: 'kira_olmadi',
            sana_dan: sanaIso,
            sana_gacha: ertangiKun(sanaIso),
            size: '100',
          });
          const { data: royxat } = await api.get<ApiResponse<Paginated<MuammoSummary>>>(
            `/muammolar?${params}`,
          );
          serverKiraOlmadi = (royxat.ok ? (royxat.data?.items ?? []) : []).map((m) => ({
            xonadon_id: m.xonadon_id,
            manzil: m.xonadon_manzili,
          }));
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
        kiraOlmadiRoyxat: [...serverKiraOlmadi, ...navbat.kiraOlmadiRoyxat],
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

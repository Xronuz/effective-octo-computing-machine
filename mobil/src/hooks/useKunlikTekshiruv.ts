import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import api from '../services/api';
import { getNavbatYozuvlari, type NavbatYozuvi } from '../services/db';
import { isoVaqtningKuni } from '../lib/sana';
import type { ApiResponse } from '../types';

export interface KunlikStat {
  jami: number;
  muammosiz: number;
  muammoli: number;
  kiraOlmadi: number;
  /** Shu kunda hali serverga yuborilmagan (navbatdagi) tashriflar soni. */
  yuborilmagan: number;
}

const BOSH: KunlikStat = { jami: 0, muammosiz: 0, muammoli: 0, kiraOlmadi: 0, yuborilmagan: 0 };

interface KunlikJavob {
  jami: number;
  muammosiz: number;
  muammoli: number;
  kira_olmadi: number;
}

/**
 * Navbatdagi yozuv natijasi — backend `create_muammo` mantig'ining nusxasi:
 * kira olmadi > checklist bandlari bor (muammo) > muammo yo'q.
 */
function navbatNatijasi(y: NavbatYozuvi): 'kira_olmadi' | 'muammoli' | 'muammosiz' {
  if (y.kira_olmadi) return 'kira_olmadi';
  const bandlar = y.taklif_etilgan_tadbirlar?.trim();
  return y.turi || bandlar ? 'muammoli' : 'muammosiz';
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

    // 1) Qurilmadagi navbat (server bilan bog'liq emas — doim hisoblanadi)
    let navbat: KunlikStat = { ...BOSH };
    try {
      const yozuvlar = await getNavbatYozuvlari();
      for (const y of yozuvlar) {
        if (y.status === 'yuborilgan' || y.status === 'xato') continue;
        if (isoVaqtningKuni(y.yaratilgan) !== sanaIso) continue;
        navbat.jami += 1;
        navbat.yuborilmagan += 1;
        const natija = navbatNatijasi(y);
        if (natija === 'kira_olmadi') navbat.kiraOlmadi += 1;
        else if (natija === 'muammoli') navbat.muammoli += 1;
        else navbat.muammosiz += 1;
      }
    } catch {
      navbat = { ...BOSH };
    }

    // 2) Serverdagi sinxronlangan yozuvlar
    try {
      const { data } = await api.get<ApiResponse<KunlikJavob>>(
        `/statistika/kunlik?sana=${sanaIso}`,
      );
      const s = data.ok && data.data ? data.data : null;
      setStat({
        jami: (s?.jami ?? 0) + navbat.jami,
        muammosiz: (s?.muammosiz ?? 0) + navbat.muammosiz,
        muammoli: (s?.muammoli ?? 0) + navbat.muammoli,
        kiraOlmadi: (s?.kira_olmadi ?? 0) + navbat.kiraOlmadi,
        yuborilmagan: navbat.yuborilmagan,
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

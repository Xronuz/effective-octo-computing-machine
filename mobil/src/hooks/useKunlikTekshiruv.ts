import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import type { ApiResponse, MuammoSummary, Paginated } from '../types';

export interface KunlikStat {
  jami: number;
  muammosiz: number;
  muammoli: number;
  kiraOlmadi: number;
}

const BOSH: KunlikStat = { jami: 0, muammosiz: 0, muammoli: 0, kiraOlmadi: 0 };

function isoSana(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function ertangiKun(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return isoSana(d);
}

/**
 * Tanlangan kunda joriy xodimning tekshiruv statistikasi:
 * nechta xonadon tekshirildi, nechtasi muammosiz/muammoli/kira olmadi.
 * Yagona manba — GET /muammolar (xodim_id + sana_dan/sana_gacha filtri),
 * alohida backend agregat kerak emas.
 */
export function useKunlikTekshiruv(sanaIso: string): { stat: KunlikStat; loading: boolean } {
  const { user } = useAuth();
  const [stat, setStat] = useState<KunlikStat>(BOSH);
  const [loading, setLoading] = useState(false);

  const yuklash = useCallback(async () => {
    if (!user?.id) {
      setStat(BOSH);
      return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams({
        xodim_id: String(user.id),
        sana_dan: sanaIso,
        sana_gacha: ertangiKun(sanaIso),
        size: '100',
      });
      const { data } = await api.get<ApiResponse<Paginated<MuammoSummary>>>(`/muammolar?${params}`);
      const items = data.ok ? (data.data?.items ?? []) : [];
      setStat({
        jami: data.data?.total ?? items.length,
        muammosiz: items.filter((m) => m.tekshiruv_natijasi === 'muammo_yoq').length,
        muammoli: items.filter((m) => m.tekshiruv_natijasi === 'muammo_topildi').length,
        kiraOlmadi: items.filter((m) => m.tekshiruv_natijasi === 'kira_olmadi').length,
      });
    } catch {
      setStat(BOSH);
    } finally {
      setLoading(false);
    }
  }, [user?.id, sanaIso]);

  useEffect(() => {
    yuklash();
  }, [yuklash]);

  return { stat, loading };
}

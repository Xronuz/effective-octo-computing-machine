import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { getKutilmaganSoni } from '../services/db';
import type { ApiResponse, Paginated, Topshiriq } from '../types';

interface MfyBiriktirish {
  mfy_id: number;
  nomi: string | null;
  faol: boolean;
}

export interface MaydonData {
  /** Hozir bajarilishi kerak bo'lgan eng dolzarb topshiriq */
  nextTask: Topshiriq | null;
  activeCount: number;
  overdueCount: number;
  /** Kritik ochiq muammolar soni; null — serverdan aniqlanmadi */
  kritikCount: number | null;
  pendingCount: number;
  mfylar: MfyBiriktirish[];
  ochiqMuammolar: number;
}

const INITIAL: MaydonData = {
  nextTask: null,
  activeCount: 0,
  overdueCount: 0,
  kritikCount: null,
  pendingCount: 0,
  mfylar: [],
  ochiqMuammolar: 0,
};

function isOverdue(t: Topshiriq): boolean {
  if (t.status === 'kechikkan') return true;
  if (!t.muddat) return false;
  return new Date(t.muddat).getTime() < Date.now();
}

/** Dolzarblik tartibi: kechikkan → eng yaqin muddat → yangi */
function pickNext(tasks: Topshiriq[]): Topshiriq | null {
  const active = tasks.filter((t) => t.status !== 'bajarildi');
  if (active.length === 0) return null;
  const sorted = [...active].sort((a, b) => {
    const ao = isOverdue(a) ? 0 : 1;
    const bo = isOverdue(b) ? 0 : 1;
    if (ao !== bo) return ao - bo;
    const ad = a.muddat ? new Date(a.muddat).getTime() : Infinity;
    const bd = b.muddat ? new Date(b.muddat).getTime() : Infinity;
    return ad - bd;
  });
  return sorted[0];
}

export function useMaydonData(): {
  data: MaydonData;
  loading: boolean;
  refresh: () => void;
  /** Topshiriqni "bajarildi" qilish; xatoda exception tashlaydi */
  markDone: (id: number) => Promise<void>;
} {
  const { user } = useAuth();
  const [data, setData] = useState<MaydonData>(INITIAL);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [tasks, men, pendingCount, ochiqMuammo, kritikTotal] = await Promise.all([
        user?.id
          ? api
              .get<ApiResponse<Paginated<Topshiriq>>>(`/topshiriqlar?xodim_id=${user.id}&size=50`)
              .then((res) => (res.data.ok ? (res.data.data?.items ?? []) : []))
              .catch(() => [] as Topshiriq[])
          : ([] as Topshiriq[]),
        api
          .get<ApiResponse<{ mfy_biriktirishlar?: MfyBiriktirish[] }>>('/auth/men')
          .then((res) => (res.data.ok ? (res.data.data?.mfy_biriktirishlar ?? []) : []))
          .catch(() => [] as MfyBiriktirish[]),
        getKutilmaganSoni().catch(() => 0),
        api
          .get<ApiResponse<Paginated<unknown>>>('/muammolar?status=ochiq&size=1')
          .then((res) => res.data.data?.total ?? 0)
          .catch(() => 0),
        api
          .get<ApiResponse<Paginated<unknown>>>('/muammolar?status=ochiq&xavf=kritik&size=1')
          .then((res) => res.data.data?.total ?? null)
          .catch(() => null),
      ]);

      const active = tasks.filter((t) => t.status !== 'bajarildi');
      setData({
        nextTask: pickNext(tasks),
        activeCount: active.length,
        overdueCount: active.filter(isOverdue).length,
        kritikCount: typeof kritikTotal === 'number' ? kritikTotal : null,
        pendingCount,
        mfylar: men,
        ochiqMuammolar: ochiqMuammo,
      });
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const markDone = useCallback(
    async (id: number) => {
      const { data: res } = await api.patch<ApiResponse<Topshiriq>>(`/topshiriqlar/${id}`, {
        status: 'bajarildi',
      });
      if (!res.ok) throw new Error(res.xato || 'Server xatosi');
      await fetchData();
    },
    [fetchData],
  );

  return { data, loading, refresh: fetchData, markDone };
}

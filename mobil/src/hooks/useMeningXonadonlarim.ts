import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import api from '../services/api';
import { getNavbatYozuvlari } from '../services/db';
import { bugunIso, isoVaqtningKuni } from '../lib/sana';
import type { ApiResponse, Paginated, XonadonSummary } from '../types';

export interface MfyBiriktirish {
  mfy_id: number;
  nomi: string | null;
  faol: boolean;
}

const PAGE_SIZE = 50;

/**
 * Inspektorning "mening xonadonlarim" navbati: o'ziga biriktirilgan
 * MFY(lar) ichidagi barcha xonadonlar, bugun tekshirilmaganlari birinchi
 * bo'lib chiqadigan tartibda. Yangi assignment infratuzilmasi kerak emas —
 * mavjud MFY biriktirish (XodimMfy) asosida ishlaydi.
 */
export function useMeningXonadonlarim() {
  const [mfylar, setMfylar] = useState<MfyBiriktirish[]>([]);
  const [tanlanganMfyId, setTanlanganMfyId] = useState<number | null>(null);
  const [items, setItems] = useState<XonadonSummary[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadMfylar = useCallback(async () => {
    try {
      const { data } =
        await api.get<ApiResponse<{ mfy_biriktirishlar?: MfyBiriktirish[] }>>('/auth/men');
      const list = data.ok ? (data.data?.mfy_biriktirishlar ?? []).filter((m) => m.faol) : [];
      setMfylar(list);
      setTanlanganMfyId((prev) => (prev != null ? prev : (list[0]?.mfy_id ?? null)));
      if (list.length === 0) setLoading(false);
    } catch {
      setMfylar([]);
      setLoading(false);
    }
  }, []);

  const fetchXonadonlar = useCallback(async (mfyId: number, pg: number) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('page', String(pg));
      params.append('size', String(PAGE_SIZE));
      params.append('mfy_id', String(mfyId));

      const { data } = await api.get<ApiResponse<Paginated<XonadonSummary>>>(
        `/xonadonlar?${params}`,
      );
      if (data.ok && data.data) {
        // Hali sinxronlanmagan (offline navbatdagi) bugungi tashriflarni ham
        // "tekshirilgan" deb hisoblaymiz — aks holda ro'yxat ularni yana
        // "tekshirilmagan" qilib ko'rsatib, chalkashlik yaratadi.
        const bugun = bugunIso();
        const pending = await getNavbatYozuvlari().catch(() => []);
        // `kira_olmadi` yozuvlar bundan mustasno — xonadon haqiqatda
        // tekshirilmagan (backend'dagi xuddi shu qoidaga mos).
        const bugungiPendingIds = new Set(
          pending
            .filter(
              (p) =>
                p.status !== 'xato' && !p.kira_olmadi && isoVaqtningKuni(p.yaratilgan) === bugun,
            )
            .map((p) => p.xonadon_id),
        );

        const merged = data.data.items.map((x) => ({
          ...x,
          tekshirilgan_bugun: x.tekshirilgan_bugun || bugungiPendingIds.has(x.id),
        }));

        setItems((prev) => (pg === 1 ? merged : [...prev, ...merged]));
        setTotal(data.data.total);
      }
    } catch {
      // Offline — ro'yxat bo'sh/eski holatda qoladi, refresh bilan qayta urinish mumkin
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadMfylar();
  }, [loadMfylar]);

  useEffect(() => {
    if (tanlanganMfyId != null) {
      setPage(1);
      fetchXonadonlar(tanlanganMfyId, 1);
    }
  }, [tanlanganMfyId, fetchXonadonlar]);

  // Ekran qayta fokusga kelganda (masalan Tekshiruv ekranidan "Saqlash"
  // bosib orqaga qaytilganda) ro'yxatni yangilaymiz — aks holda "tekshirildi"
  // belgisi darhol ko'rinmay, faqat qo'lda pull-to-refresh qilgandan keyin chiqadi.
  const birinchiFokusRef = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (birinchiFokusRef.current) {
        birinchiFokusRef.current = false;
        return;
      }
      if (tanlanganMfyId != null) {
        setPage(1);
        fetchXonadonlar(tanlanganMfyId, 1);
      }
    }, [tanlanganMfyId, fetchXonadonlar]),
  );

  const loadMore = () => {
    if (loading || tanlanganMfyId == null || items.length >= total) return;
    const nextPage = page + 1;
    setPage(nextPage);
    fetchXonadonlar(tanlanganMfyId, nextPage);
  };

  const refresh = () => {
    if (tanlanganMfyId == null) return;
    setRefreshing(true);
    setPage(1);
    fetchXonadonlar(tanlanganMfyId, 1);
  };

  // Bugun tekshirilmaganlar birinchi
  const sortedItems = [...items].sort(
    (a, b) => Number(a.tekshirilgan_bugun) - Number(b.tekshirilgan_bugun),
  );

  // Hozircha yuklangan sahifalar bo'yicha bugun tekshirilganlar soni
  // (barcha sahifa yuklanmagan bo'lsa taxminiy, lekin foydali indikator).
  const tekshirilganSoni = items.filter((x) => x.tekshirilgan_bugun).length;

  return {
    mfylar,
    tanlanganMfyId,
    setTanlanganMfyId,
    items: sortedItems,
    total,
    tekshirilganSoni,
    loading,
    refreshing,
    loadMore,
    refresh,
  };
}

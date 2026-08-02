// XAVFSIZ XONADON — Topshiriqlar (rahbar / superadmin)
// Forma: xodim + ixtiyoriy MFY + sarlavha + matn + muddat → POST /api/topshiriqlar
// Pastda: yuborilgan topshiriqlar ro'yxati (GET /api/topshiriqlar)

import { useEffect, useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight, ClipboardList, Send, ShieldAlert } from 'lucide-react';
import { apiGet, apiPost } from '@/api';
import { useAuth } from '@/auth';
import { useAlifbo } from '@/alifbo';
import type { Foydalanuvchi, MfyBrief, KochaBrief, Paginated } from '@/types';
import DateInput from '@/components/DateInput';
import MfySelect from '@/components/MfySelect';
import StatusSelect from '@/components/StatusSelect';

// Backend TopshiriqResponse (app/schemas/topshiriq_intizom.py) bilan mos
interface TopshiriqItem {
  id: number;
  rahbar_id: number;
  xodim_id: number;
  mfy_id: number | null;
  kocha_id: number | null;
  muammo_id: number | null;
  sarlavha: string;
  matn: string | null;
  muddat: string;
  status: 'yangi' | 'korildi' | 'bajarildi' | 'kechikkan';
  yaratilgan: string;
  korilgan: string | null;
  bajarilgan: string | null;
  rahbar_fio: string | null;
  xodim_fio: string | null;
  mfy_nomi: string | null;
  kocha_nomi: string | null;
}

const statusLabels: Record<string, string> = {
  yangi: 'Yangi',
  korildi: "Ko'rildi",
  bajarildi: 'Bajarildi',
  kechikkan: 'Kechikkan',
};

const statusRangi: Record<string, string> = {
  yangi: 'badge-blue',
  korildi: 'badge-yellow',
  bajarildi: 'badge-green',
  kechikkan: 'badge-red',
};

const sanaFormat = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('uz-UZ');
};

export default function TopshiriqPage() {
  const { isRahbar } = useAuth();
  const { tr } = useAlifbo();

  // Forma holati
  const [xodimId, setXodimId] = useState('');
  const [mfyId, setMfyId] = useState('');
  const [kochaId, setKochaId] = useState('');
  const [sarlavha, setSarlavha] = useState('');
  const [matn, setMatn] = useState('');
  const [muddat, setMuddat] = useState('');
  const [yuborilmoqda, setYuborilmoqda] = useState(false);
  const [formaXato, setFormaXato] = useState<string | null>(null);
  const [formaXabar, setFormaXabar] = useState<string | null>(null);

  // Tanlov ro'yxatlari
  const [xodimlar, setXodimlar] = useState<Foydalanuvchi[]>([]);
  const [mfylar, setMfylar] = useState<MfyBrief[]>([]);
  const [kochalar, setKochalar] = useState<KochaBrief[]>([]);

  // Topshiriqlar ro'yxati
  const [topshiriqlar, setTopshiriqlar] = useState<TopshiriqItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // ── xodimlar va MFY lar (forma uchun) ────────────────────────────
  useEffect(() => {
    if (!isRahbar) return;
    let cancelled = false;
    (async () => {
      const [xodimRes, mfyRes, kochaRes] = await Promise.all([
        apiGet<Paginated<Foydalanuvchi>>('/users?rol=xodim&holat=faol&size=100'),
        // GET /api/mfylar va /api/kochalar oddiy massiv qaytaradi (sahifalanmaydi)
        apiGet<MfyBrief[]>('/mfylar'),
        apiGet<KochaBrief[]>('/kochalar'),
      ]);
      if (cancelled) return;
      if (xodimRes.ok && xodimRes.data) setXodimlar(xodimRes.data.items);
      if (mfyRes.ok && Array.isArray(mfyRes.data)) setMfylar(mfyRes.data);
      if (kochaRes.ok && Array.isArray(kochaRes.data)) setKochalar(kochaRes.data);
    })();
    return () => { cancelled = true; };
  }, [isRahbar]);

  // MFY tanlanganda faqat shu MFY ko'chalari ko'rsatiladi ("Barchasi" — barcha ko'chalar)
  const filtrlanganKochalar = mfyId ? kochalar.filter((k) => String(k.mfy_id) === mfyId) : kochalar;

  // MFY o'zgarganda avval tanlangan ko'cha shu MFY ga tegishli bo'lmasa — tozalash
  useEffect(() => {
    if (kochaId && !filtrlanganKochalar.some((k) => String(k.id) === kochaId)) {
      setKochaId('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mfyId]);

  // ── topshiriqlar ro'yxati ────────────────────────────────────────
  const fetchTopshiriqlar = useCallback(async () => {
    setLoading(true);
    const res = await apiGet<Paginated<TopshiriqItem>>(`/topshiriqlar?page=${page}&size=20`);
    if (res.ok && res.data) {
      setTopshiriqlar(res.data.items);
      setTotalPages(res.data.pages);
      setTotal(res.data.total);
    } else {
      setTopshiriqlar([]);
      setTotalPages(1);
      setTotal(0);
    }
    setLoading(false);
  }, [page]);

  useEffect(() => {
    if (isRahbar) fetchTopshiriqlar();
  }, [isRahbar, fetchTopshiriqlar]);

  // ── forma yuborish ───────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormaXato(null);
    setFormaXabar(null);

    if (!xodimId) return setFormaXato(tr('Xodimni tanlang.'));
    if (!sarlavha.trim()) return setFormaXato(tr('Sarlavhani kiriting.'));
    if (!muddat) return setFormaXato(tr('Muddatni tanlang.'));

    setYuborilmoqda(true);
    // TopshiriqCreate: xodim_id, mfy_id?, kocha_id?, muammo_id?, sarlavha, matn?, muddat (YYYY-MM-DD)
    const res = await apiPost('/topshiriqlar', {
      xodim_id: Number(xodimId),
      mfy_id: mfyId ? Number(mfyId) : null,
      kocha_id: kochaId ? Number(kochaId) : null,
      sarlavha: sarlavha.trim(),
      matn: matn.trim() || null,
      muddat,
    });
    setYuborilmoqda(false);

    if (res.ok) {
      setFormaXabar(tr('Topshiriq muvaffaqiyatli yuborildi.'));
      setXodimId('');
      setMfyId('');
      setKochaId('');
      setSarlavha('');
      setMatn('');
      setMuddat('');
      setPage(1);
      fetchTopshiriqlar();
    } else {
      setFormaXato(res.xato || tr('Yuborishda xatolik yuz berdi.'));
    }
  };

  // ── ruxsat tekshiruvi ────────────────────────────────────────────
  if (!isRahbar) {
    return (
      <div className="empty-state card">
        <ShieldAlert className="mx-auto h-8 w-8 text-slate-300" />
        <p className="mt-2 text-sm text-slate-500">
          {tr('Bu sahifa faqat rahbar va superadmin uchun.')}
        </p>
      </div>
    );
  }

  const bugun = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
      {/* Yangi topshiriq formasi */}
      <div className="card p-6">
        <h2 className="mb-4 text-base font-semibold text-[#0F2033]">{tr('Yangi topshiriq')}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {/* Xodim */}
            <div>
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <span className="whitespace-nowrap font-medium">
                  {tr('Xodim')} <span className="text-[#C0392B]">*</span>:
                </span>
                <StatusSelect
                  options={xodimlar.map((x) => ({ value: String(x.id), label: tr(x.full_name) }))}
                  value={xodimId}
                  onChange={setXodimId}
                  barchasiLabel={tr('— Xodimni tanlang —')}
                  searchable
                  qidiruvPlaceholder={tr('Inspektor F.I.Sh...')}
                  className="select sm:!w-[200px]"
                />
              </label>
            </div>

            {/* MFY (ixtiyoriy) — qidiruvli tanlov */}
            <div>
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <span className="whitespace-nowrap font-medium">{tr('MFY (ixtiyoriy)')}:</span>
                <MfySelect
                  mfylar={mfylar}
                  value={mfyId}
                  onChange={setMfyId}
                  barchasiLabel={tr('— Barcha MFY lar —')}
                  className="select sm:!w-[200px]"
                />
              </label>
            </div>

            {/* Ko'cha (ixtiyoriy) */}
            <div>
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <span className="whitespace-nowrap font-medium">{tr("Ko'cha (ixtiyoriy)")}:</span>
                <StatusSelect
                  options={filtrlanganKochalar.map((k) => ({ value: String(k.id), label: tr(k.nomi) }))}
                  value={kochaId}
                  onChange={setKochaId}
                  barchasiLabel={tr('— Barchasi —')}
                  searchable
                  className="select sm:!w-[200px]"
                />
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Sarlavha */}
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">
                {tr('Sarlavha')} <span className="text-[#C0392B]">*</span>
              </label>
              <input
                className="input"
                type="text"
                maxLength={200}
                placeholder={tr("Masalan: 12-son MFY bo'yicha gaz tekshiruvini yakunlash")}
                value={sarlavha}
                onChange={(e) => setSarlavha(e.target.value)}
                required
              />
            </div>

            {/* Muddat */}
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">
                {tr('Muddat')} <span className="text-[#C0392B]">*</span>
              </label>
              <DateInput
                className="input"
                min={bugun}
                value={muddat}
                onChange={setMuddat}
                required
              />
            </div>
          </div>

          {/* Matn */}
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">
              {tr('Topshiriq matni (ixtiyoriy)')}
            </label>
            <textarea
              className="input min-h-[100px] resize-y"
              maxLength={2000}
              placeholder={tr('Batafsil tavsif, talablar va izohlar...')}
              value={matn}
              onChange={(e) => setMatn(e.target.value)}
            />
          </div>

          <div className="flex justify-end">
            <button type="submit" className="btn-primary gap-2" disabled={yuborilmoqda}>
              <Send className="h-4 w-4" />
              {yuborilmoqda ? tr('Yuborilmoqda...') : tr('Topshiriqni yuborish')}
            </button>
          </div>

          {formaXato && (
            <p className="text-sm text-[#C0392B]">{formaXato}</p>
          )}
          {formaXabar && (
            <p className="text-sm text-[#2E9E6B]">{formaXabar}</p>
          )}
        </form>
      </div>

      {/* Yuborilgan topshiriqlar */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-base font-semibold text-[#0F2033]">{tr('Yuborilgan topshiriqlar')}</h2>
          <span className="text-sm text-slate-500">
            Jami <span className="font-semibold tabular-nums text-[#0F2033]">{total}</span> ta
          </span>
        </div>
        {loading ? (
          <p className="px-6 py-12 text-center text-sm text-slate-400">{tr('Yuklanmoqda...')}</p>
        ) : topshiriqlar.length === 0 ? (
          <div className="empty-state">
            <ClipboardList className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-2 text-sm font-medium text-slate-600">{tr('Hali topshiriq yuborilmagan')}</p>
            <p className="mt-1 text-xs text-slate-400">{tr('Yuqoridagi forma orqali birinchi topshiriqni yuboring')}</p>
          </div>
        ) : (
        <div className="max-h-[60vh] overflow-auto">
          <table className="table">
            <thead className="sticky top-0 z-10 bg-white">
              <tr>
                <th className="w-10">#</th>
                <th>{tr('Sarlavha')}</th>
                <th className="hidden lg:table-cell">{tr('Xodim')}</th>
                <th className="hidden xl:table-cell">{tr('MFY')}</th>
                <th className="hidden xl:table-cell">{tr("Ko'cha")}</th>
                <th className="hidden lg:table-cell">{tr('Muddat')}</th>
                <th>{tr('Holat')}</th>
              </tr>
            </thead>
            <tbody>
              {topshiriqlar.map((t, idx) => (
                <tr key={t.id}>
                  <td className="whitespace-nowrap text-slate-400 tabular-nums">
                    {(page - 1) * 20 + idx + 1}
                  </td>
                  <td className="font-medium text-[#0F2033]">
                    {tr(t.sarlavha)}
                    {t.matn && (
                      <span className="block max-w-[300px] truncate text-xs font-normal text-slate-400">
                        {tr(t.matn)}
                      </span>
                    )}
                  </td>
                  <td className="hidden whitespace-nowrap text-slate-500 lg:table-cell">
                    {t.xodim_fio ? tr(t.xodim_fio) : `#${t.xodim_id}`}
                  </td>
                  <td className="hidden whitespace-nowrap text-slate-500 xl:table-cell">
                    {t.mfy_nomi ? tr(t.mfy_nomi) : '—'}
                  </td>
                  <td className="hidden whitespace-nowrap text-slate-500 xl:table-cell">
                    {t.kocha_nomi ? tr(t.kocha_nomi) : '—'}
                  </td>
                  <td className="hidden whitespace-nowrap text-slate-500 lg:table-cell">
                    {sanaFormat(t.muddat)}
                  </td>
                  <td className="whitespace-nowrap">
                    <span className={statusRangi[t.status] || 'badge-gray'}>
                      {tr(statusLabels[t.status]) || t.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-500">
            {total} tadan {(page - 1) * 20 + 1}–{Math.min(page * 20, total)} ko'rsatilmoqda
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="btn-soft px-3 py-1.5 text-xs"
              aria-label="Oldingi sahifa"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-3 text-sm tabular-nums text-slate-600">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="btn-soft px-3 py-1.5 text-xs"
              aria-label="Keyingi sahifa"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

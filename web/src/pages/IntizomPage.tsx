// XAVFSIZ XONADON — Intizom va rag'bat (rahbar / superadmin)
// 1) Muddati o'tgan muammolar: GET /api/muammolar?status=muddati_otgan
// 2) Ogohlantirish / Hayfsan: POST /api/intizom {xodim_id, muammo_id, turi, sabab}
// 3) Rag'bat: GET /api/statistika/xodimlar → eng yaxshi 3 xodim → POST /api/intizom turi=ragbat
// 4) Intizom tarixi: GET /api/intizom

import { useEffect, useState, useCallback } from 'react';
import {
  AlertTriangle,
  Award,
  ChevronLeft,
  ChevronRight,
  ScrollText,
  ShieldAlert,
  X,
} from 'lucide-react';
import { apiGet, apiPost } from '@/api';
import { useAuth } from '@/auth';
import { useAlifbo } from '@/alifbo';
import type { MuammoBrief, Paginated, XodimStatistika } from '@/types';

// Backend IntizomResponse (app/schemas/topshiriq_intizom.py) bilan mos
interface IntizomItem {
  id: number;
  xodim_id: number;
  muammo_id: number | null;
  turi: 'ogohlantirish' | 'hayfsan' | 'ragbat';
  sabab: string;
  bergan_id: number;
  sana: string;
  xodim_fio: string | null;
  bergan_fio: string | null;
}

const turiLabels: Record<string, string> = {
  ogohlantirish: 'Ogohlantirish',
  hayfsan: 'Hayfsan',
  ragbat: "Rag'bat",
};

const turiRangi: Record<string, string> = {
  ogohlantirish: 'badge-yellow',
  hayfsan: 'badge-red',
  ragbat: 'badge-green',
};

const sanaFormat = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('uz-UZ');
};

// Muddatdan necha kun o'tganini hisoblash
const kechikkanKun = (muddat: string | null): number | null => {
  if (!muddat) return null;
  const m = new Date(muddat);
  if (Number.isNaN(m.getTime())) return null;
  const bugun = new Date();
  bugun.setHours(0, 0, 0, 0);
  m.setHours(0, 0, 0, 0);
  return Math.floor((bugun.getTime() - m.getTime()) / 86_400_000);
};

// ── Sabab kiritish modali ──────────────────────────────────────────

interface SababModalProps {
  sarlavha: string;
  turi: 'ogohlantirish' | 'hayfsan' | 'ragbat';
  xodimId: number;
  muammoId?: number;
  onClose: () => void;
  onSaved: () => void;
}

function SababModal({ sarlavha, turi, xodimId, muammoId, onClose, onSaved }: SababModalProps) {
  const { tr } = useAlifbo();
  const [sabab, setSabab] = useState('');
  const [saving, setSaving] = useState(false);
  const [xato, setXato] = useState<string | null>(null);

  const handleSave = async () => {
    if (!sabab.trim()) {
      setXato(tr('Sababni kiriting.'));
      return;
    }
    setSaving(true);
    setXato(null);
    // IntizomCreate: xodim_id, muammo_id?, turi, sabab (bergan_id serverdan olinadi)
    const res = await apiPost('/intizom', {
      xodim_id: xodimId,
      muammo_id: muammoId ?? null,
      turi,
      sabab: sabab.trim(),
    });
    setSaving(false);
    if (res.ok) {
      onSaved();
      onClose();
    } else {
      setXato(tr(res.xato || 'Saqlashda xatolik yuz berdi.'));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="card mx-4 w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h3 className="text-base font-semibold text-[#0F2033]">{sarlavha}</h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            aria-label={tr('Yopish')}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4">
          <label className="mb-1 block text-xs font-medium text-slate-500">
            {tr('Sabab')} <span className="text-[#C0392B]">*</span>
          </label>
          <textarea
            className="input min-h-[100px] resize-y"
            maxLength={2000}
            placeholder={tr('Sababni batafsil yozing...')}
            value={sabab}
            onChange={(e) => setSabab(e.target.value)}
            autoFocus
          />
          {xato && <p className="mt-2 text-sm text-[#C0392B]">{xato}</p>}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-6 py-4">
          <button onClick={onClose} className="btn-ghost" disabled={saving}>
            {tr('Bekor qilish')}
          </button>
          <button
            onClick={handleSave}
            className={turi === 'ragbat' ? 'btn-primary' : 'btn-danger'}
            disabled={saving}
          >
            {saving ? tr('Saqlanmoqda...') : tr('Saqlash')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── asosiy sahifa ──────────────────────────────────────────────────

export default function IntizomPage() {
  const { isRahbar } = useAuth();
  const { tr } = useAlifbo();

  // Muddati o'tgan muammolar
  const [muammolar, setMuammolar] = useState<MuammoBrief[]>([]);
  const [mPage, setMPage] = useState(1);
  const [mTotalPages, setMTotalPages] = useState(1);
  const [mTotal, setMTotal] = useState(0);
  const [mLoading, setMLoading] = useState(true);
  // "Sababli deb hisoblash" — backendda bunday endpoint yo'q,
  // shuning uchun faqat shu sahifadagi lokal ro'yxatdan yashiriladi
  const [sababliIds, setSababliIds] = useState<Set<number>>(new Set());

  // Rag'bat bo'limi
  const [engYaxshi, setEngYaxshi] = useState<XodimStatistika[]>([]);

  // Intizom tarixi
  const [tarix, setTarix] = useState<IntizomItem[]>([]);
  const [tPage, setTPage] = useState(1);
  const [tTotalPages, setTTotalPages] = useState(1);
  const [tLoading, setTLoading] = useState(true);

  // Modal
  const [modal, setModal] = useState<{
    turi: 'ogohlantirish' | 'hayfsan' | 'ragbat';
    xodimId: number;
    muammoId?: number;
    sarlavha: string;
  } | null>(null);

  const [xabar, setXabar] = useState<string | null>(null);

  // ── muddati o'tgan muammolar ─────────────────────────────────────
  const fetchMuammolar = useCallback(async () => {
    setMLoading(true);
    const res = await apiGet<Paginated<MuammoBrief>>(
      `/muammolar?status=muddati_otgan&page=${mPage}&size=20`,
    );
    if (res.ok && res.data) {
      setMuammolar(res.data.items);
      setMTotalPages(res.data.pages);
      setMTotal(res.data.total);
    } else {
      setMuammolar([]);
      setMTotalPages(1);
      setMTotal(0);
    }
    setMLoading(false);
  }, [mPage]);

  // ── eng yaxshi xodimlar (rag'bat uchun) ──────────────────────────
  const fetchXodimlar = useCallback(async () => {
    const res = await apiGet<Paginated<XodimStatistika>>('/statistika/xodimlar?page=1&size=100');
    if (res.ok && res.data) {
      // Yopilgan muammolar soni bo'yicha eng yaxshi 3 xodim
      const tartiblangan = [...res.data.items].sort(
        (a, b) => b.yopilgan_muammo - a.yopilgan_muammo,
      );
      setEngYaxshi(tartiblangan.slice(0, 3));
    }
  }, []);

  // ── intizom tarixi ───────────────────────────────────────────────
  const fetchTarix = useCallback(async () => {
    setTLoading(true);
    const res = await apiGet<Paginated<IntizomItem>>(`/intizom?page=${tPage}&size=20`);
    if (res.ok && res.data) {
      setTarix(res.data.items);
      setTTotalPages(res.data.pages);
    } else {
      setTarix([]);
      setTTotalPages(1);
    }
    setTLoading(false);
  }, [tPage]);

  useEffect(() => {
    if (!isRahbar) return;
    fetchMuammolar();
    fetchXodimlar();
  }, [isRahbar, fetchMuammolar, fetchXodimlar]);

  useEffect(() => {
    if (isRahbar) fetchTarix();
  }, [isRahbar, fetchTarix]);

  const onIntizomSaved = () => {
    setXabar(tr('Intizom yozuvi muvaffaqiyatli saqlandi.'));
    fetchTarix();
    fetchMuammolar();
    setTimeout(() => setXabar(null), 4000);
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

  const koRinadigan = muammolar.filter((m) => !sababliIds.has(m.id));

  return (
    <div className="space-y-6">
      {xabar && (
        <div className="rounded-xl border border-[#2E9E6B]/20 bg-[#2E9E6B]/5 p-3 text-sm text-[#2E9E6B]">
          {xabar}
        </div>
      )}

      {/* Muddati o'tgan muammolar */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-base font-semibold text-[#0F2033]">{tr("Muddati o'tgan muammolar")}</h2>
          <span className="text-sm text-slate-500">
            {tr('Jami')} <span className="font-semibold tabular-nums text-[#0F2033]">{mTotal}</span> {tr('ta')}
          </span>
        </div>
        {mLoading ? (
          <p className="px-6 py-12 text-center text-sm text-slate-400">{tr('Yuklanmoqda...')}</p>
        ) : koRinadigan.length === 0 ? (
          <div className="empty-state">
            <AlertTriangle className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-2 text-sm font-medium text-slate-600">
              {tr("Muddati o'tgan muammolar topilmadi")}
            </p>
          </div>
        ) : (
        <div className="max-h-[60vh] overflow-auto">
          <table className="table">
            <thead className="sticky top-0 z-10 bg-white">
              <tr>
                <th>{tr('Muammo')}</th>
                <th className="hidden lg:table-cell">{tr('Xodim')}</th>
                <th className="hidden xl:table-cell">{tr('Manzil')}</th>
                <th className="hidden lg:table-cell">{tr('Muddat')}</th>
                <th>{tr('Kechikish')}</th>
                <th>{tr('Amallar')}</th>
              </tr>
            </thead>
            <tbody>
              {koRinadigan.map((m) => {
                const kun = kechikkanKun(m.muddat);
                return (
                  <tr key={m.id}>
                    <td className="font-medium text-[#0F2033]">
                      #{m.id}
                      <span className="block max-w-[220px] truncate text-xs font-normal text-slate-400">
                        {tr(m.tavsif || m.turi || 'Tekshiruv')}
                      </span>
                    </td>
                    <td className="hidden whitespace-nowrap text-slate-500 lg:table-cell">
                      {m.xodim_fio ? tr(m.xodim_fio) : `#${m.xodim_id}`}
                    </td>
                    <td className="hidden max-w-[220px] text-slate-500 xl:table-cell">
                      <span className="block truncate">{m.xonadon_manzili ? tr(m.xonadon_manzili) : '—'}</span>
                    </td>
                    <td className="hidden whitespace-nowrap text-slate-500 lg:table-cell">
                      {m.muddat ? sanaFormat(m.muddat) : '—'}
                    </td>
                    <td className="whitespace-nowrap">
                      {kun !== null && kun > 0 ? (
                        <span className="badge-red">{kun} kun</span>
                      ) : (
                        <span className="text-sm text-slate-400">—</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() =>
                            setModal({
                              turi: 'ogohlantirish',
                              xodimId: m.xodim_id,
                              muammoId: m.id,
                              sarlavha: `${tr('Ogohlantirish')} — ${m.xodim_fio ? tr(m.xodim_fio) : `#${m.xodim_id}`}`,
                            })
                          }
                          className="btn-soft px-3 py-1.5 text-xs"
                        >
                          {tr('Ogohlantirish')}
                        </button>
                        <button
                          onClick={() =>
                            setModal({
                              turi: 'hayfsan',
                              xodimId: m.xodim_id,
                              muammoId: m.id,
                              sarlavha: `${tr('Hayfsan')} — ${m.xodim_fio ? tr(m.xodim_fio) : `#${m.xodim_id}`}`,
                            })
                          }
                          className="btn-danger px-3 py-1.5 text-xs"
                        >
                          {tr('Hayfsan')}
                        </button>
                        <button
                          onClick={() =>
                            setSababliIds((prev) => new Set(prev).add(m.id))
                          }
                          className="btn-ghost px-3 py-1.5 text-xs"
                        >
                          {tr('Sababli')}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        )}
      </div>

      {/* Muammolar pagination */}
      {mTotalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-500">
            {mTotal} {tr('tadan')} {(mPage - 1) * 20 + 1}–{Math.min(mPage * 20, mTotal)} {tr("ko'rsatilmoqda")}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setMPage((p) => Math.max(1, p - 1))}
              disabled={mPage <= 1}
              className="btn-soft px-3 py-1.5 text-xs"
              aria-label={tr('Oldingi sahifa')}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-3 text-sm tabular-nums text-slate-600">
              {mPage} / {mTotalPages}
            </span>
            <button
              onClick={() => setMPage((p) => Math.min(mTotalPages, p + 1))}
              disabled={mPage >= mTotalPages}
              className="btn-soft px-3 py-1.5 text-xs"
              aria-label={tr('Keyingi sahifa')}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Rag'bat bo'limi */}
      <div className="card p-6">
        <h2 className="text-base font-semibold text-[#0F2033]">{tr("Rag'batlantirish")}</h2>
        <p className="mb-4 mt-1 text-sm text-slate-500">
          {tr("Yopilgan muammolar soni bo'yicha eng yaxshi 3 xodim")}
        </p>
        {engYaxshi.length === 0 ? (
          <div className="empty-state">
            <Award className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-2 text-sm text-slate-400">{tr("Ma'lumot topilmadi")}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {engYaxshi.map((x, idx) => (
              <div
                key={x.xodim_id}
                className="flex flex-col gap-2 rounded-xl border border-slate-200 p-4"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-[#0F2033]">{tr(x.xodim_fio)}</span>
                  <span className="badge-yellow">{idx + 1}-{tr("o'rin")}</span>
                </div>
                <div className="space-y-0.5 text-xs text-slate-500">
                  <p>{tr('Yopilgan muammolar')}: <span className="font-medium tabular-nums text-slate-700">{x.yopilgan_muammo}</span></p>
                  <p>{tr('Jami tekshirishlar')}: <span className="font-medium tabular-nums text-slate-700">{x.jami_tekshirish}</span></p>
                </div>
                <button
                  onClick={() =>
                    setModal({
                      turi: 'ragbat',
                      xodimId: x.xodim_id,
                      sarlavha: `${tr("Rag'bat")} — ${tr(x.xodim_fio)}`,
                    })
                  }
                  className="btn-primary mt-auto gap-2 self-start px-3 py-1.5 text-xs"
                >
                  <Award className="h-4 w-4" />
                  {tr("Rag'bat")}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Intizom tarixi */}
      <div className="card overflow-hidden">
        <div className="border-b border-slate-100 px-6 py-4">
          <h2 className="text-base font-semibold text-[#0F2033]">{tr('Intizom tarixi')}</h2>
        </div>
        {tLoading ? (
          <p className="px-6 py-12 text-center text-sm text-slate-400">{tr('Yuklanmoqda...')}</p>
        ) : tarix.length === 0 ? (
          <div className="empty-state">
            <ScrollText className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-2 text-sm font-medium text-slate-600">{tr('Intizom yozuvlari topilmadi')}</p>
          </div>
        ) : (
        <div className="max-h-[60vh] overflow-auto">
          <table className="table">
            <thead className="sticky top-0 z-10 bg-white">
              <tr>
                <th>{tr('Sana')}</th>
                <th>{tr('Xodim')}</th>
                <th>{tr('Turi')}</th>
                <th className="hidden lg:table-cell">{tr('Sabab')}</th>
                <th className="hidden xl:table-cell">{tr('Kim bergan')}</th>
              </tr>
            </thead>
            <tbody>
              {tarix.map((i) => (
                <tr key={i.id}>
                  <td className="whitespace-nowrap text-slate-500">
                    {sanaFormat(i.sana)}
                  </td>
                  <td className="whitespace-nowrap font-medium text-[#0F2033]">
                    {i.xodim_fio ? tr(i.xodim_fio) : `#${i.xodim_id}`}
                  </td>
                  <td className="whitespace-nowrap">
                    <span className={turiRangi[i.turi] || 'badge-gray'}>
                      {tr(turiLabels[i.turi]) || i.turi}
                    </span>
                  </td>
                  <td className="hidden max-w-[320px] text-slate-500 lg:table-cell">
                    <span className="block truncate">{tr(i.sabab)}</span>
                  </td>
                  <td className="hidden whitespace-nowrap text-slate-500 xl:table-cell">
                    {i.bergan_fio ? tr(i.bergan_fio) : `#${i.bergan_id}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}
      </div>

      {/* Tarix pagination */}
      {tTotalPages > 1 && (
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={() => setTPage((p) => Math.max(1, p - 1))}
            disabled={tPage <= 1}
            className="btn-soft px-3 py-1.5 text-xs"
            aria-label={tr('Oldingi sahifa')}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="px-3 text-sm tabular-nums text-slate-600">
            {tPage} / {tTotalPages}
          </span>
          <button
            onClick={() => setTPage((p) => Math.min(tTotalPages, p + 1))}
            disabled={tPage >= tTotalPages}
            className="btn-soft px-3 py-1.5 text-xs"
            aria-label={tr('Keyingi sahifa')}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Sabab modali */}
      {modal && (
        <SababModal
          sarlavha={modal.sarlavha}
          turi={modal.turi}
          xodimId={modal.xodimId}
          muammoId={modal.muammoId}
          onClose={() => setModal(null)}
          onSaved={onIntizomSaved}
        />
      )}
    </div>
  );
}

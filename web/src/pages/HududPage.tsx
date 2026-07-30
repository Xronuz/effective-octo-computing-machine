import { useCallback, useEffect, useMemo, useState } from 'react';
import { Home, Landmark, Pencil, Plus, Route, Search, Trash2, X } from 'lucide-react';
import { apiGet } from '@/api';
import { useAuth } from '@/auth';
import { useAlifbo } from '@/alifbo';
import { krilldanLotinga, mfyNomiTozala } from '@/lib/alifbo';
import type { MfyBrief, MfyDetail, KochaBrief } from '@/types';
import MfySelect from '@/components/MfySelect';
import {
  Toast,
  MfyForma,
  KochaForma,
  OchirishTasdiq,
  type Xabar,
  type MfyModal,
  type KochaModal,
  type OchirishModal,
} from '@/components/hudud-admin';

export default function HududPage() {
  const { tr } = useAlifbo();
  const { isRahbar, isSuperadmin } = useAuth();
  // POST/PATCH mfylar va kochalar: rahbar + superadmin
  const canManage = isRahbar || isSuperadmin;
  // DELETE mfylar va kochalar: faqat superadmin
  const canDelete = isSuperadmin;

  const [mfylar, setMfylar] = useState<MfyBrief[]>([]);
  const [loadingMfy, setLoadingMfy] = useState(true);
  const [mfyQidiruv, setMfyQidiruv] = useState('');

  // Bottom-sheet holati: null = yopiq, 'loading' yuklanmoqda
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedMfy, setSelectedMfy] = useState<MfyDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState('');

  // All ko'chalar
  const [allKochalar, setAllKochalar] = useState<KochaBrief[]>([]);
  const [kochaFilterMfyId, setKochaFilterMfyId] = useState('');

  // Xabarlar va modallar
  const [xabar, setXabar] = useState<Xabar>(null);
  const [mfyModal, setMfyModal] = useState<MfyModal>(null);
  const [kochaModal, setKochaModal] = useState<KochaModal>(null);
  const [ochirishModal, setOchirishModal] = useState<OchirishModal>(null);

  // Toast avtomatik yopilishi (5 soniya)
  useEffect(() => {
    if (!xabar) return;
    const t = setTimeout(() => setXabar(null), 5000);
    return () => clearTimeout(t);
  }, [xabar]);

  const fetchMfylar = useCallback(async () => {
    const res = await apiGet<MfyBrief[]>('/mfylar');
    if (res.ok) setMfylar(Array.isArray(res.data) ? res.data : []);
    setLoadingMfy(false);
  }, []);

  const fetchKochalar = useCallback(async () => {
    const params = new URLSearchParams();
    if (kochaFilterMfyId) params.set('mfy_id', kochaFilterMfyId);
    const res = await apiGet<KochaBrief[]>(`/kochalar?${params}`);
    if (res.ok) setAllKochalar(Array.isArray(res.data) ? res.data : []);
  }, [kochaFilterMfyId]);

  useEffect(() => {
    fetchMfylar();
  }, [fetchMfylar]);

  useEffect(() => {
    fetchKochalar();
  }, [fetchKochalar]);

  // ESC bilan sheet yopish
  useEffect(() => {
    if (!sheetOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeSheet();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sheetOpen]);

  // Sheet ochiq payt body scroll qulflash
  useEffect(() => {
    document.body.style.overflow = sheetOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [sheetOpen]);

  const filteredMfylar = useMemo(() => {
    const q = krilldanLotinga(mfyQidiruv.trim().toLowerCase());
    if (!q) return mfylar;
    return mfylar.filter(
      m => krilldanLotinga(m.nomi.toLowerCase()).includes(q) || String(m.raqami).includes(q),
    );
  }, [mfylar, mfyQidiruv]);

  const loadMfyDetail = async (mfyId: number) => {
    setSheetOpen(true);
    setLoadingDetail(true);
    setDetailError('');
    setSelectedMfy(null);
    const res = await apiGet<MfyDetail>(`/mfylar/${mfyId}`);
    setLoadingDetail(false);
    if (res.ok) {
      setSelectedMfy(res.data);
    } else {
      setDetailError(res.xato || tr("MFY ma'lumotlarini yuklashda xatolik"));
    }
  };

  const closeSheet = () => {
    setSheetOpen(false);
    setSelectedMfy(null);
    setDetailError('');
  };

  // ── saqlangandan keyingi yangilanishlar ───────────────────────────
  const mfySaqlandi = () => {
    const tahrirlanganId = mfyModal?.rejim === 'tahrirlash' ? mfyModal.mfy.id : null;
    setXabar({
      turi: 'yaxshi',
      matn: tahrirlanganId ? tr('MFY muvaffaqiyatli yangilandi.') : tr('Yangi MFY qo\'shildi.'),
    });
    setMfyModal(null);
    fetchMfylar();
    if (tahrirlanganId && sheetOpen && selectedMfy?.id === tahrirlanganId) {
      loadMfyDetail(tahrirlanganId);
    }
  };

  const kochaSaqlandi = () => {
    setXabar({
      turi: 'yaxshi',
      matn: kochaModal?.rejim === 'tahrirlash' ? tr('Ko\'cha muvaffaqiyatli yangilandi.') : tr('Yangi ko\'cha qo\'shildi.'),
    });
    setKochaModal(null);
    if (selectedMfy) loadMfyDetail(selectedMfy.id);
    fetchMfylar(); // kochalar_soni yangilanishi uchun
    fetchKochalar();
  };

  const ochirildi = () => {
    const ochirilganMfyId = ochirishModal?.tur === 'mfy' ? ochirishModal.id : null;
    setXabar({ turi: 'yaxshi', matn: tr('Muvaffaqiyatli o\'chirildi.') });
    setOchirishModal(null);
    if (ochirilganMfyId) {
      closeSheet();
      // O'ng ustun filtri o'chirilgan MFY ga ishora qilsa, tozalash
      if (kochaFilterMfyId === String(ochirilganMfyId)) setKochaFilterMfyId('');
    } else if (selectedMfy) {
      loadMfyDetail(selectedMfy.id);
    }
    fetchMfylar();
    fetchKochalar();
  };

  const ochirishXatosi = (matn: string) => {
    setOchirishModal(null);
    setXabar({ turi: 'xato', matn });
  };

  return (
    <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[2fr_1fr]">
      {/* MFY ro'yxati + qidiruv */}
      <div className="card p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-[#0F2033]">
            {tr("Mahalla fuqarolar yig'inlari")}{' '}
            <span className="tabular-nums text-slate-400">({filteredMfylar.length})</span>
          </h2>
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                className="input pl-10 text-sm"
                value={mfyQidiruv}
                onChange={e => setMfyQidiruv(e.target.value)}
                placeholder={tr('MFY nomi yoki raqami...')}
              />
            </div>
            {canManage && (
              <button onClick={() => setMfyModal({ rejim: 'qoshish' })} className="btn-primary gap-2 text-sm">
                <Plus className="h-4 w-4" />
                {tr('Yangi MFY')}
              </button>
            )}
          </div>
        </div>

        {loadingMfy ? (
          <p className="text-sm text-slate-400">{tr('Yuklanmoqda...')}</p>
        ) : filteredMfylar.length === 0 ? (
          <div className="empty-state">
            <Landmark className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-2 text-sm text-slate-400">
              {mfyQidiruv ? tr('Qidiruv bo\'yicha MFY topilmadi') : tr('MFY lar topilmadi')}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {filteredMfylar.map(m => (
              <button
                key={m.id}
                onClick={() => loadMfyDetail(m.id)}
                className="group flex w-full items-center justify-between gap-x-4 rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-left transition hover:border-[#3D6FB4]/40 hover:shadow-sm"
              >
                <div className="flex min-w-0 flex-1 items-baseline gap-1.5">
                  <span className="truncate text-sm font-medium text-[#0F2033] group-hover:text-[#3D6FB4]">
                    {tr(mfyNomiTozala(m.nomi))} {tr('MFY')}
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-x-4 text-xs text-slate-500">
                  <span className="inline-flex items-center gap-1 whitespace-nowrap">
                    <Home className="h-3.5 w-3.5 shrink-0" />
                    <span className="tabular-nums">{m.xonadon_soni}</span> {tr('xonadon')}
                  </span>
                  <span className="inline-flex items-center gap-1 whitespace-nowrap">
                    <Route className="h-3.5 w-3.5 shrink-0" />
                    <span className="tabular-nums">{m.kochalar_soni}</span> {tr("ko'cha")}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Barcha ko'chalar */}
      <div className="card space-y-4 p-6 xl:sticky xl:top-24">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-[#0F2033]">
            {tr("Barcha ko'chalar")}{' '}
            <span className="tabular-nums text-slate-400">({allKochalar.length})</span>
          </h2>
          <div className="w-full sm:w-auto sm:min-w-[180px]">
            <MfySelect
              mfylar={mfylar}
              value={kochaFilterMfyId}
              onChange={setKochaFilterMfyId}
              barchasiLabel={tr('Barcha MFY')}
              className="select text-sm"
            />
          </div>
        </div>

        {allKochalar.length === 0 ? (
          <div className="empty-state">
            <Route className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-2 text-sm text-slate-400">{tr("Ko'chalar topilmadi")}</p>
          </div>
        ) : (
          <div className="max-h-[60vh] overflow-auto rounded-xl border border-slate-200">
            <table className="table">
              <thead className="sticky top-0">
                <tr>
                  <th>#</th>
                  <th>{tr("Ko'cha nomi")}</th>
                  <th className="text-center">{tr('Xonadonlar')}</th>
                </tr>
              </thead>
              <tbody>
                {allKochalar.map((k, i) => (
                  <tr key={k.id}>
                    <td className="text-slate-400 tabular-nums">{i + 1}</td>
                    <td className="font-medium text-[#0F2033]">{tr(k.nomi)}</td>
                    <td className="text-center tabular-nums">{k.xonadon_soni}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── MFY tafsilot — bottom-sheet modal ─────────────────────── */}
      {sheetOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:p-6" role="dialog" aria-modal="true">
          {/* Backdrop */}
          <button
            type="button"
            aria-label="Yopish"
            onClick={closeSheet}
            className="sheet-backdrop absolute inset-0 bg-[#0A1E3C]/40 backdrop-blur-[2px]"
          />
          {/* Panel — suzuvchi karta, barcha tomoni ko'rinadigan */}
          <div className="sheet-panel relative flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-[28px] bg-white shadow-lift">
            {/* Tutqich chiziq */}
            <div className="flex justify-center pb-1 pt-3">
              <span className="h-1.5 w-12 rounded-full bg-slate-200" aria-hidden />
            </div>

            {/* Sarlavha */}
            <div className="flex items-start justify-between gap-4 px-6 pb-4 pt-2">
              <div className="min-w-0">
                {selectedMfy ? (
                  <>
                    <h2 className="truncate text-lg font-semibold text-[#0F2033]">{tr('MFY')} #{selectedMfy.raqami}: {tr(selectedMfy.nomi)}
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      {selectedMfy.kochalar.length} {tr('ta ko\'cha')}, {selectedMfy.xonadon_soni} {tr('ta xonadon')}
                    </p>
                  </>
                ) : (
                  <h2 className="text-lg font-semibold text-[#0F2033]">{tr("MFY ma'lumotlari")}</h2>
                )}
              </div>
              <div className="flex flex-shrink-0 items-center gap-2">
                {selectedMfy && canManage && (
                  <button
                    onClick={() => setMfyModal({ rejim: 'tahrirlash', mfy: selectedMfy })}
                    aria-label="MFY ni tahrirlash"
                    title="Tahrirlash"
                    className="rounded-xl p-2.5 text-slate-400 transition-colors hover:bg-[#3D6FB4]/10 hover:text-[#2a5489]"
                  >
                    <Pencil className="h-5 w-5" />
                  </button>
                )}
                {selectedMfy && canDelete && (
                  <button
                    onClick={() =>
                      setOchirishModal({
                        tur: 'mfy',
                        id: selectedMfy.id,
                        nomi: `${selectedMfy.raqami}-son — ${tr(selectedMfy.nomi)}`,
                        kochalarSoni: selectedMfy.kochalar.length,
                        xonadonSoni: selectedMfy.xonadon_soni,
                      })
                    }
                    aria-label="MFY ni o'chirish"
                    title="O'chirish"
                    className="rounded-xl p-2.5 text-slate-400 transition-colors hover:bg-[#C0392B]/10 hover:text-[#96291f]"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                )}
                {canManage && selectedMfy && (
                  <button onClick={() => setKochaModal({ rejim: 'qoshish' })} className="btn-primary gap-2 text-sm">
                    <Plus className="h-4 w-4" />
                    {tr('Yangi ko\'cha')}
                  </button>
                )}
                <button
                  type="button"
                  onClick={closeSheet}
                  aria-label="Yopish"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Kontent */}
            <div className="flex-1 space-y-4 overflow-y-auto px-6 pb-6">
              {loadingDetail && (
                <p className="py-8 text-center text-sm text-slate-400">{tr('Yuklanmoqda...')}</p>
              )}
              {detailError && (
                <div className="rounded-xl border border-[#C0392B]/20 bg-[#C0392B]/5 p-4 text-sm text-[#C0392B]">
                  {detailError}
                </div>
              )}

              {selectedMfy && (
                <>
                  {/* Kochalar jadvali */}
                  {selectedMfy.kochalar.length === 0 ? (
                    <div className="empty-state py-8">
                      <Route className="mx-auto h-8 w-8 text-slate-300" />
                      <p className="mt-2 text-sm text-slate-400">{tr("Ko'chalar mavjud emas")}</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-xl border border-slate-200">
                      <table className="table">
                        <thead>
                          <tr>
                            <th>#</th>
                            <th>{tr("Ko'cha nomi")}</th>
                            <th className="text-center">{tr('Xonadonlar soni')}</th>
                            {canManage && <th className="text-center">{tr('Amallar')}</th>}
                          </tr>
                        </thead>
                        <tbody>
                          {selectedMfy.kochalar.map((k, i) => (
                            <tr key={k.id}>
                              <td className="text-slate-400 tabular-nums">{i + 1}</td>
                              <td className="font-medium text-[#0F2033]">{tr(k.nomi)}</td>
                              <td className="text-center tabular-nums">{k.xonadon_soni}</td>
                              {canManage && (
                                <td className="text-center">
                                  <div className="inline-flex items-center gap-1">
                                    <button
                                      onClick={() => setKochaModal({ rejim: 'tahrirlash', kocha: k })}
                                      aria-label={`${tr(k.nomi)} ni tahrirlash`}
                                      title="Tahrirlash"
                                      className="rounded-xl p-2.5 text-slate-400 transition-colors hover:bg-[#3D6FB4]/10 hover:text-[#2a5489]"
                                    >
                                      <Pencil className="h-5 w-5" />
                                    </button>
                                    {canDelete && (
                                      <button
                                        onClick={() =>
                                          setOchirishModal({
                                            tur: 'kocha',
                                            id: k.id,
                                            nomi: tr(k.nomi),
                                            xonadonSoni: k.xonadon_soni,
                                          })
                                        }
                                        aria-label={`${tr(k.nomi)} ni o'chirish`}
                                        title="O'chirish"
                                        className="rounded-xl p-2.5 text-slate-400 transition-colors hover:bg-[#C0392B]/10 hover:text-[#96291f]"
                                      >
                                        <Trash2 className="h-5 w-5" />
                                      </button>
                                    )}
                                  </div>
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Modallar ─────────────────────────────────────────────────── */}
      {mfyModal && (
        <MfyForma
          modal={mfyModal}
          onYopish={() => setMfyModal(null)}
          onSaqlandi={mfySaqlandi}
        />
      )}

      {kochaModal && selectedMfy && (
        <KochaForma
          modal={kochaModal}
          mfyId={selectedMfy.id}
          mfyNomi={tr(selectedMfy.nomi)}
          onYopish={() => setKochaModal(null)}
          onSaqlandi={kochaSaqlandi}
        />
      )}

      {ochirishModal && (
        <OchirishTasdiq
          modal={ochirishModal}
          onYopish={() => setOchirishModal(null)}
          onOchirildi={ochirildi}
          onXato={ochirishXatosi}
        />
      )}

      {xabar && <Toast xabar={xabar} onYopish={() => setXabar(null)} />}
    </div>
  );
}

import { useEffect, useState, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, FilterX, Home, Plus, Search } from 'lucide-react';
import { apiGet, apiPost, apiDelete } from '@/api';
import { useAuth } from '@/auth';
import { SkeletonTable } from '@/components/Skeleton';
import type { Paginated, XonadonBrief, MfyBrief, KochaBrief, XonadonCreatePayload } from '@/types';

export default function XonadonlarPage() {
  const { isSuperadmin, isRahbar } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState<Paginated<XonadonBrief> | null>(null);
  const [loading, setLoading] = useState(true);
  const [mfylar, setMfylar] = useState<MfyBrief[]>([]);
  const [kochalar, setKochalar] = useState<KochaBrief[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState<XonadonCreatePayload>({ kocha_id: 0, uy_raqami: '' });
  const [createError, setCreateError] = useState('');
  const [creating, setCreating] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const page = Number(searchParams.get('page') || '1');
  const size = Number(searchParams.get('size') || '20');
  const mfy_id = searchParams.get('mfy_id') || '';
  const kocha_id = searchParams.get('kocha_id') || '';
  const ochiq_muammo = searchParams.get('ochiq_muammo') || '';
  const qidiruv = searchParams.get('qidiruv') || '';

  const updateFilter = (key: string, value: string) => {
    const p = new URLSearchParams(searchParams);
    if (value) p.set(key, value); else p.delete(key);
    if (key !== 'page') p.set('page', '1');
    setSearchParams(p);
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), size: String(size) });
    if (mfy_id) params.set('mfy_id', mfy_id);
    if (kocha_id) params.set('kocha_id', kocha_id);
    if (ochiq_muammo) params.set('ochiq_muammo', ochiq_muammo);
    if (qidiruv) params.set('qidiruv', qidiruv);
    const res = await apiGet<Paginated<XonadonBrief>>(`/xonadonlar?${params}`);
    if (res.ok) setData(res.data);
    setLoading(false);
  }, [page, size, mfy_id, kocha_id, ochiq_muammo, qidiruv]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => {
    apiGet<MfyBrief[]>('/mfylar').then(r => { if (Array.isArray((r as any).data)) setMfylar((r as any).data); });
  }, []);
  useEffect(() => {
    const p = new URLSearchParams();
    if (mfy_id) p.set('mfy_id', mfy_id);
    apiGet<KochaBrief[]>(`/kochalar?${p}`).then(r => {
      if (Array.isArray((r as any).data)) setKochalar((r as any).data);
    });
  }, [mfy_id]);

  const handleCreate = async () => {
    if (!createForm.kocha_id || !createForm.uy_raqami.trim()) {
      setCreateError('Ko\'cha va uy raqami majburiy');
      return;
    }
    setCreating(true);
    setCreateError('');
    const res = await apiPost<XonadonBrief>('/xonadonlar', createForm);
    setCreating(false);
    if (res.ok) {
      setShowCreate(false);
      setCreateForm({ kocha_id: 0, uy_raqami: '' });
      fetchData();
    } else {
      setCreateError(res.xato || 'Xatolik yuz berdi');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const res = await apiDelete(`/xonadonlar/${deleteId}`);
    if (res.ok) { setDeleteId(null); fetchData(); }
  };

  const totalPages = data?.pages || 0;
  const hasActiveFilters = Boolean(mfy_id || kocha_id || ochiq_muammo || qidiruv);

  return (
    <div className="space-y-6">
      {/* Create form */}
      {showCreate && (
        <div className="card space-y-4 p-6">
          <h3 className="text-base font-semibold text-[#0F2033]">Yangi xonadon qo'shish</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Ko'cha *</label>
              <select className="select" value={createForm.kocha_id || ''} onChange={e => setCreateForm({...createForm, kocha_id: Number(e.target.value)})}>
                <option value="">Tanlang</option>
                {kochalar.map(k => <option key={k.id} value={k.id}>{k.nomi}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Uy raqami *</label>
              <input className="input" value={createForm.uy_raqami} onChange={e => setCreateForm({...createForm, uy_raqami: e.target.value})} placeholder="15A" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Egasi F.I.Sh</label>
              <input className="input" value={createForm.egasi_fio || ''} onChange={e => setCreateForm({...createForm, egasi_fio: e.target.value})} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Egasi tel</label>
              <input className="input" value={createForm.egasi_tel || ''} onChange={e => setCreateForm({...createForm, egasi_tel: e.target.value})} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Lat</label>
              <input className="input" type="number" step="any" value={createForm.lat ?? ''} onChange={e => setCreateForm({...createForm, lat: e.target.value ? Number(e.target.value) : undefined})} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Lng</label>
              <input className="input" type="number" step="any" value={createForm.lng ?? ''} onChange={e => setCreateForm({...createForm, lng: e.target.value ? Number(e.target.value) : undefined})} />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Izoh</label>
            <textarea className="input" rows={2} value={createForm.izoh || ''} onChange={e => setCreateForm({...createForm, izoh: e.target.value})} />
          </div>
          {createError && <p className="text-sm text-[#C0392B]">{createError}</p>}
          <div className="flex gap-3">
            <button onClick={handleCreate} disabled={creating} className="btn-primary">{creating ? 'Saqlanmoqda...' : 'Saqlash'}</button>
            <button onClick={() => { setShowCreate(false); setCreateError(''); }} className="btn-ghost">Bekor qilish</button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card p-4">
        <div className="grid grid-cols-1 items-end gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1.3fr]">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">MFY</label>
            <select className="select" value={mfy_id} onChange={e => updateFilter('mfy_id', e.target.value)}>
              <option value="">Barcha MFY</option>
              {mfylar.map(m => <option key={m.id} value={m.id}>{m.nomi}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Ko'cha</label>
            <select className="select" value={kocha_id} onChange={e => updateFilter('kocha_id', e.target.value)}>
              <option value="">Barcha ko'chalar</option>
              {kochalar.map(k => <option key={k.id} value={k.id}>{k.nomi}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Ochiq muammo</label>
            <select className="select" value={ochiq_muammo} onChange={e => updateFilter('ochiq_muammo', e.target.value)}>
              <option value="">Barchasi</option>
              <option value="true">Faqat ochiq muammosi bor</option>
              <option value="false">Muammosiz</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Qidiruv</label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                className="input pl-9"
                value={qidiruv}
                onChange={e => updateFilter('qidiruv', e.target.value)}
                placeholder="Manzil yoki egasi..."
              />
            </div>
          </div>
        </div>
        {hasActiveFilters && (
          <div className="mt-4 flex justify-end border-t border-slate-100 pt-3">
            <button onClick={() => setSearchParams({})} className="btn-soft gap-2 text-xs">
              <FilterX className="h-4 w-4" />
              Filtrlarni tozalash
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {/* Card header — sarlavha, natijalar soni va asosiy amal */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-[#0F2033]">Xonadonlar ro'yxati</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Jami{' '}
              <span className="font-semibold tabular-nums text-[#0F2033]">
                {data?.total ?? 0}
              </span>{' '}
              ta xonadon
            </p>
          </div>
          {isRahbar && (
            <button onClick={() => setShowCreate(!showCreate)} className="btn-primary gap-2">
              <Plus className="h-4 w-4" />
              Yangi xonadon
            </button>
          )}
        </div>
        {loading ? (
          <SkeletonTable rows={8} cols={6} className="border-0 shadow-none" />
        ) : !data || data.items.length === 0 ? (
          <div className="empty-state">
            <Home className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-2 text-sm font-medium text-slate-600">Xonadonlar topilmadi</p>
            <p className="mt-1 text-xs text-slate-400">Filtrlarni o'zgartirib qayta urinib ko'ring</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Manzil</th>
                  <th>MFY</th>
                  <th>Egasi</th>
                  <th>Tel</th>
                  <th className="text-center">Ochiq muammolar</th>
                  <th className="text-right">Amallar</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((x, i) => (
                  <tr key={x.id}>
                    <td className="text-slate-400 tabular-nums">{(page-1)*size + i + 1}</td>
                    <td className="font-medium text-[#0F2033]">{x.full_address || `${x.uy_raqami}, ${x.kocha_nomi || ''}`}</td>
                    <td className="text-slate-500">{x.mfy_nomi || '—'}</td>
                    <td>{x.egasi_fio || '—'}</td>
                    <td className="text-slate-500">{x.egasi_tel || '—'}</td>
                    <td className="text-center">
                      {x.ochiq_muammolar_soni > 0 ? (
                        <span className="badge-red">{x.ochiq_muammolar_soni}</span>
                      ) : (
                        <span className="badge-green">0</span>
                      )}
                    </td>
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link to={`/xonadonlar/${x.id}`} className="btn-soft px-2 py-1 text-xs">Ko'rish</Link>
                        {isSuperadmin && (
                          <button onClick={() => setDeleteId(x.id)} className="btn-danger px-2 py-1 text-xs">O'chirish</button>
                        )}
                      </div>
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
        <div className="flex items-center justify-center gap-4">
          <button disabled={page <= 1} onClick={() => updateFilter('page', String(page-1))} className="btn-soft gap-1.5 text-sm">
            <ChevronLeft className="h-4 w-4" />
            Oldingi
          </button>
          <span className="text-sm text-slate-500">
            Sahifa <span className="font-medium tabular-nums text-[#0F2033]">{page}</span> / {totalPages}
          </span>
          <button disabled={page >= totalPages} onClick={() => updateFilter('page', String(page+1))} className="btn-soft gap-1.5 text-sm">
            Keyingi
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Delete confirm modal */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="card mx-4 w-full max-w-sm space-y-4 p-6">
            <h3 className="text-lg font-semibold text-[#0F2033]">Xonadonni o'chirish</h3>
            <p className="text-sm text-slate-500">Rostdan ham bu xonadonni o'chirmoqchimisiz?</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteId(null)} className="btn-ghost">Bekor qilish</button>
              <button onClick={handleDelete} className="btn-danger">O'chirish</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

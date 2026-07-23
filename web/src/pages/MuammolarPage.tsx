import { useEffect, useState, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, ClipboardList, FilterX } from 'lucide-react';
import { apiGet } from '@/api';
import { SkeletonTable } from '@/components/Skeleton';
import { sanaVaqt } from '@/lib/sana';
import type { Paginated, MuammoBrief } from '@/types';

const STATUS_OPTIONS = ['ochiq', 'jarayonda', 'yopilgan', 'muddati_otgan'] as const;
const STATUS_LABELS: Record<string, string> = {
  ochiq: 'Ochiq', jarayonda: 'Jarayonda', yopilgan: 'Yopilgan', muddati_otgan: 'Muddati oʼtgan',
};

export default function MuammolarPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState<Paginated<MuammoBrief> | null>(null);
  const [loading, setLoading] = useState(true);

  const page = Number(searchParams.get('page') || '1');
  const size = Number(searchParams.get('size') || '20');
  const holat = searchParams.get('holat') || '';
  const shubhali = searchParams.get('shubhali') || '';
  const hudud_id = searchParams.get('hudud_id') || '';
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
    if (holat) params.set('status', holat);
    if (shubhali) params.set('shubhali', shubhali);
    if (hudud_id) params.set('hudud_id', hudud_id);
    if (qidiruv) params.set('qidiruv', qidiruv);
    const res = await apiGet<Paginated<MuammoBrief>>(`/muammolar?${params}`);
    if (res.ok) setData(res.data);
    setLoading(false);
  }, [page, size, holat, shubhali, hudud_id, qidiruv]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const totalPages = data?.pages || 0;

  const statusBadge = (h: string) => {
    const colors: Record<string, string> = {
      ochiq: 'badge-blue', jarayonda: 'badge-yellow',
      yopilgan: 'badge-green', muddati_otgan: 'badge-red',
    };
    return <span className={colors[h] || 'badge-gray'}>{STATUS_LABELS[h] || h}</span>;
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="card flex flex-wrap items-end gap-3 p-4">
        <div className="min-w-[140px]">
          <label className="mb-1 block text-xs font-medium text-slate-500">Holat</label>
          <select className="select" value={holat} onChange={e => updateFilter('holat', e.target.value)}>
            <option value="">Barcha holatlar</option>
            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
          </select>
        </div>
        <div className="min-w-[130px]">
          <label className="mb-1 block text-xs font-medium text-slate-500">Shubhalilik</label>
          <select className="select" value={shubhali} onChange={e => updateFilter('shubhali', e.target.value)}>
            <option value="">Barchasi</option>
            <option value="true">Shubhali</option>
            <option value="false">Oddiy</option>
          </select>
        </div>
        <div className="min-w-[180px] flex-1">
          <label className="mb-1 block text-xs font-medium text-slate-500">Qidiruv</label>
          <input className="input" value={qidiruv} onChange={e => updateFilter('qidiruv', e.target.value)} placeholder="Tavsif yoki manzil..." />
        </div>
        <button onClick={() => setSearchParams({})} className="btn-soft gap-2 text-xs">
          <FilterX className="h-4 w-4" />
          Tozalash
        </button>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-base font-semibold text-[#0F2033]">Muammolar ro'yxati</h2>
          {data && (
            <span className="text-sm text-slate-500">
              Jami <span className="font-semibold tabular-nums text-[#0F2033]">{data.total}</span> ta
            </span>
          )}
        </div>
        {loading ? (
          <SkeletonTable rows={8} cols={6} className="border-0 shadow-none" />
        ) : !data || data.items.length === 0 ? (
          <div className="empty-state">
            <ClipboardList className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-2 text-sm font-medium text-slate-600">Muammolar topilmadi</p>
            <p className="mt-1 text-xs text-slate-400">Filtrlarni o'zgartirib qayta urinib ko'ring</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Tavsif</th>
                  <th>Manzil</th>
                  <th className="text-center">Holat</th>
                  <th className="text-center">Shubhali</th>
                  <th>Sana</th>
                  <th className="text-right">Amallar</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((m, i) => (
                  <tr key={m.id}>
                    <td className="text-slate-400 tabular-nums">{(page-1)*size + i + 1}</td>
                    <td className="max-w-[300px]">
                      <Link to={`/muammolar/${m.id}`} className="line-clamp-2 font-medium text-[#3D6FB4] hover:underline">
                        {m.tavsif || `${m.turi} — #${m.id}`}
                      </Link>
                      {m.shubhali && <span className="badge-purple ml-2 text-[10px]">Shubhali</span>}
                    </td>
                    <td className="text-xs text-slate-500">{m.xonadon_manzil || '—'}</td>
                    <td className="text-center">{statusBadge(m.status)}</td>
                    <td className="text-center">
                      {m.shubhali ? <span className="badge-purple">Shubhali</span> : <span className="badge-green">Oddiy</span>}
                    </td>
                    <td className="whitespace-nowrap text-xs text-slate-500">{sanaVaqt(m.yaratilgan)}</td>
                    <td className="text-right">
                      <Link to={`/muammolar/${m.id}`} className="btn-soft px-2 py-1 text-xs">Batafsil</Link>
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
    </div>
  );
}

import { useEffect, useState, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, ClipboardList, FilterX } from 'lucide-react';
import { apiGet } from '@/api';
import { SkeletonTable } from '@/components/Skeleton';
import DateInput from '@/components/DateInput';
import { ddMmYyyy } from '@/lib/sana';
import { useAlifbo } from '@/alifbo';
import { krilldanLotinga } from '@/lib/alifbo';
import type { Paginated, MuammoBrief } from '@/types';

const STATUS_OPTIONS = ['ochiq', 'jarayonda', 'yopilgan', 'muddati_otgan'] as const;
const STATUS_LABELS: Record<string, string> = {
  ochiq: 'Ochiq', jarayonda: 'Jarayonda', yopilgan: 'Yopilgan', muddati_otgan: 'Muddati oʼtgan',
};

export default function MuammolarPage() {
  const { tr } = useAlifbo();
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState<Paginated<MuammoBrief> | null>(null);
  const [loading, setLoading] = useState(true);

  const page = Number(searchParams.get('page') || '1');
  const size = Number(searchParams.get('size') || '20');
  const holat = searchParams.get('holat') || '';
  const sana = searchParams.get('sana') || '';
  const tadbirlarSoni = searchParams.get('tadbirlar_soni') || '';
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
    if (sana) {
      params.set('sana_dan', sana);
      const ertasi = new Date(`${sana}T00:00:00`);
      ertasi.setDate(ertasi.getDate() + 1);
      params.set('sana_gacha', ertasi.toISOString().slice(0, 10));
    }
    if (tadbirlarSoni) params.set('tadbirlar_soni_dan', tadbirlarSoni);
    if (hudud_id) params.set('hudud_id', hudud_id);
    if (qidiruv) params.set('qidiruv', krilldanLotinga(qidiruv));
    const res = await apiGet<Paginated<MuammoBrief>>(`/muammolar?${params}`);
    if (res.ok) setData(res.data);
    setLoading(false);
  }, [page, size, holat, sana, tadbirlarSoni, hudud_id, qidiruv]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const totalPages = data?.pages || 0;

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="card flex flex-wrap items-end gap-3 p-4">
        <div className="min-w-[140px]">
          <label className="mb-1 block text-xs font-medium text-slate-500">{tr('Holat')}</label>
          <select className="select" value={holat} onChange={e => updateFilter('holat', e.target.value)}>
            <option value="">{tr('Barcha holatlar')}</option>
            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{tr(STATUS_LABELS[s])}</option>)}
          </select>
        </div>
        <div className="min-w-[150px]">
          <label className="mb-1 block text-xs font-medium text-slate-500">{tr('Sana')}</label>
          <DateInput
            className="input"
            value={sana}
            onChange={iso => updateFilter('sana', iso)}
          />
        </div>
        <div className="min-w-[150px]">
          <label className="mb-1 block text-xs font-medium text-slate-500">{tr("Yong'inga qarshi tadbirlar soni")}</label>
          <input
            type="number"
            min={0}
            className="input"
            value={tadbirlarSoni}
            onChange={e => updateFilter('tadbirlar_soni', e.target.value)}
            placeholder={tr('masalan, 4')}
          />
        </div>
        <div className="min-w-[180px] flex-1">
          <label className="mb-1 block text-xs font-medium text-slate-500">{tr('Qidiruv')}</label>
          <input className="input" value={qidiruv} onChange={e => updateFilter('qidiruv', e.target.value)} placeholder={tr('Tavsif yoki manzil...')} />
        </div>
        <button onClick={() => setSearchParams({})} className="btn-soft gap-2 py-2.5 text-sm">
          <FilterX className="h-4 w-4" />
          {tr('Tozalash')}
        </button>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-base font-semibold text-[#0F2033]">
            {tr('Bugungi muammolar ro\'yxati')}{' '}
            <span className="font-normal text-slate-400">({ddMmYyyy()})</span>
          </h2>
          {data && (
            <span className="text-sm text-slate-500">
              {tr('Jami')} <span className="font-semibold tabular-nums text-[#0F2033]">{data.total}</span> {tr('ta')}
            </span>
          )}
        </div>
        {loading ? (
          <SkeletonTable rows={8} cols={9} className="border-0 shadow-none" />
        ) : !data || data.items.length === 0 ? (
          <div className="empty-state">
            <ClipboardList className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-2 text-sm font-medium text-slate-600">{tr('Muammolar topilmadi')}</p>
            <p className="mt-1 text-xs text-slate-400">{tr("Filtrlarni o'zgartirib qayta urinib ko'ring")}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th className="text-center">#</th>
                  <th className="text-center">{tr('MFY')}</th>
                  <th className="text-center">{tr("Ko'cha")}</th>
                  <th className="text-center">{tr('Uy raqam')}</th>
                  <th className="text-center">{tr('Xonadon egasi')}</th>
                  <th className="text-center">{tr('Telefon raqam')}</th>
                  <th className="text-center">{tr("Taklif etilgan yong'inga qarshi tadbirlar")}</th>
                  <th className="text-center">{tr("Yo'riqnomadan o'tkanlar soni")}</th>
                  <th className="text-center">{tr('Inspector')}</th>
                  <th className="text-center">{tr('Amallar')}</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((m, i) => (
                  <tr key={m.id}>
                    <td className="text-center text-slate-400 tabular-nums">{(page-1)*size + i + 1}</td>
                    <td className="text-center font-medium text-[#0F2033]">{m.mfy_nomi ? tr(m.mfy_nomi) : '—'}</td>
                    <td className="text-center text-slate-600">{m.kocha_nomi ? tr(m.kocha_nomi) : '—'}</td>
                    <td className="text-center text-slate-600">{m.uy_raqami || '—'}</td>
                    <td className="text-center text-slate-600">{m.egasi_fio ? tr(m.egasi_fio) : '—'}</td>
                    <td className="text-center text-slate-600">{m.egasi_tel || '—'}</td>
                    <td className="max-w-[260px] text-center text-xs text-slate-500">
                      <span className="line-clamp-2">{m.taklif_etilgan_tadbirlar ? tr(m.taklif_etilgan_tadbirlar) : '—'}</span>
                    </td>
                    <td className="text-center tabular-nums">{m.yoriqnomadan_otkanlar_soni ?? '—'}</td>
                    <td className="text-center text-slate-600">{m.xodim_fio ? tr(m.xodim_fio) : '—'}</td>
                    <td className="text-center">
                      <Link to={`/muammolar/${m.id}`} className="btn-soft px-2 py-1 text-xs">{tr('Batafsil')}</Link>
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

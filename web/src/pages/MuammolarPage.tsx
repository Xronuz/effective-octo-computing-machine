import { useEffect, useState, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, ClipboardList, FilterX } from 'lucide-react';
import { apiGet } from '@/api';
import { SkeletonTable } from '@/components/Skeleton';
import DateInput from '@/components/DateInput';
import StatusSelect from '@/components/StatusSelect';
import NatijaBadge from '@/components/NatijaBadge';
import { ddMmYyyy } from '@/lib/sana';
import { useAlifbo } from '@/alifbo';
import { krilldanLotinga } from '@/lib/alifbo';
import type { Paginated, MuammoBrief, UserBrief } from '@/types';

const STATUS_OPTIONS = ['ochiq', 'jarayonda', 'yopilgan', 'muddati_otgan'] as const;
const STATUS_LABELS: Record<string, string> = {
  ochiq: 'Ochiq', jarayonda: 'Jarayonda', yopilgan: 'Yopilgan', muddati_otgan: 'Muddati oʼtgan',
};

/** Natija bo'yicha tezkor tablar — sahifa mazmunini bir tegishda ajratadi. */
const TABLAR: { key: string; label: string }[] = [
  { key: '', label: 'Barcha tashriflar' },
  { key: 'muammo_topildi', label: 'Muammolar' },
  { key: 'muammo_yoq', label: 'Muammosiz' },
  { key: 'kira_olmadi', label: 'Kira olmadi' },
];

/** ISO sanaga 1 kun qo'shadi (mahalliy vaqt zonasidan mustaqil). */
function ertangiKun(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const keyingi = new Date(Date.UTC(y, m - 1, d + 1));
  return keyingi.toISOString().slice(0, 10);
}

export default function MuammolarPage() {
  const { tr } = useAlifbo();
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState<Paginated<MuammoBrief> | null>(null);
  const [loading, setLoading] = useState(true);
  const [xodimlar, setXodimlar] = useState<UserBrief[]>([]);

  const page = Number(searchParams.get('page') || '1');
  const size = Number(searchParams.get('size') || '20');
  const holat = searchParams.get('holat') || '';
  const sana = searchParams.get('sana') || '';
  const natija = searchParams.get('natija') || '';
  const tadbirlarSoni = searchParams.get('tadbirlar_soni') || '';
  const mfyId = searchParams.get('mfy_id') || '';
  const xodimId = searchParams.get('xodim_id') || '';
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
      // Backend sana chegaralarini Toshkent kuni bo'yicha hisoblaydi
      params.set('sana_dan', sana);
      params.set('sana_gacha', ertangiKun(sana));
    }
    if (natija) params.set('tekshiruv_natijasi', natija);
    if (tadbirlarSoni) params.set('tadbirlar_soni_dan', tadbirlarSoni);
    // Diqqat: backend parametri `mfy_id` (avval `hudud_id` yuborilardi va
    // e'tiborsiz qolardi — filtr umuman ishlamasdi).
    if (mfyId) params.set('mfy_id', mfyId);
    if (xodimId) params.set('xodim_id', xodimId);
    if (qidiruv) params.set('qidiruv', krilldanLotinga(qidiruv));
    const res = await apiGet<Paginated<MuammoBrief>>(`/muammolar?${params}`);
    if (res.ok) setData(res.data);
    setLoading(false);
  }, [page, size, holat, sana, natija, tadbirlarSoni, mfyId, xodimId, qidiruv]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Inspektor filtri uchun xodimlar ro'yxati (bir marta yuklanadi)
  useEffect(() => {
    let cancelled = false;
    apiGet<Paginated<UserBrief>>('/users?page=1&size=100')
      .then(res => {
        if (cancelled || !res.ok) return;
        setXodimlar(res.data.items.filter(u => u.rol === 'xodim'));
      })
      .catch(() => { /* filtr ixtiyoriy — xatolik sahifani buzmasin */ });
    return () => { cancelled = true; };
  }, []);

  const totalPages = data?.pages || 0;

  const faolTab = TABLAR.find((t) => t.key === natija) ?? TABLAR[0];

  return (
    <div className="space-y-6">
      {/* Natija tablari */}
      <div className="flex flex-wrap gap-2">
        {TABLAR.map((t) => {
          const faol = t.key === natija;
          return (
            <button
              key={t.key || 'barchasi'}
              onClick={() => updateFilter('natija', t.key)}
              aria-pressed={faol}
              className={
                faol
                  ? 'rounded-full bg-[#0F2033] px-4 py-2 text-sm font-medium text-white'
                  : 'rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 transition-colors hover:bg-slate-50'
              }
            >
              {tr(t.label)}
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="card flex flex-wrap items-center gap-3 p-4">
        <div>
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <span className="whitespace-nowrap font-medium">{tr('Holat')}:</span>
            <StatusSelect
              options={STATUS_OPTIONS.map(s => ({ value: s, label: tr(STATUS_LABELS[s]) }))}
              value={holat}
              onChange={(v) => updateFilter('holat', v)}
              barchasiLabel={tr('Barcha holatlar')}
              className="select sm:!w-[160px]"
            />
          </label>
        </div>
        <div>
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <span className="whitespace-nowrap font-medium">{tr('Sana')}:</span>
            <DateInput
              className="input sm:!w-[150px]"
              value={sana}
              onChange={iso => updateFilter('sana', iso)}
            />
          </label>
        </div>
        <div>
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <span className="whitespace-nowrap font-medium">{tr('Inspektor')}:</span>
            <StatusSelect
              options={xodimlar.map(x => ({ value: String(x.id), label: tr(x.full_name) }))}
              value={xodimId}
              onChange={(v) => updateFilter('xodim_id', v)}
              barchasiLabel={tr('Barcha inspektorlar')}
              searchable
              qidiruvPlaceholder={tr('Inspektor F.I.Sh...')}
              className="select sm:!w-[260px]"
            />
          </label>
        </div>
        <div>
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <span className="whitespace-nowrap font-medium">{tr('YQ tadbirlar soni')}:</span>
            <input
              type="number"
              min={0}
              className="input sm:!w-[110px]"
              value={tadbirlarSoni}
              onChange={e => updateFilter('tadbirlar_soni', e.target.value)}
              placeholder={tr('masalan, 4')}
            />
          </label>
        </div>
        <div className="min-w-[140px] flex-1">
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <span className="whitespace-nowrap font-medium">{tr('Qidiruv')}:</span>
            <input className="input" value={qidiruv} onChange={e => updateFilter('qidiruv', e.target.value)} placeholder={tr('Tavsif yoki manzil...')} />
          </label>
        </div>
        <button onClick={() => setSearchParams({})} className="btn-soft shrink-0 gap-2 py-2.5 text-sm">
          <FilterX className="h-4 w-4" />
          {tr('Tozalash')}
        </button>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          {/* Sarlavha faol filtrga mos bo'lishi shart — avval sana filtri
              qo'llanmagan bo'lsa ham "Bugungi..." deb yozilardi. */}
          <h2 className="text-base font-semibold text-[#0F2033]">
            {tr(faolTab.label)}{' '}
            <span className="font-normal text-slate-400">
              ({sana ? ddMmYyyy(new Date(`${sana}T00:00:00`)) : tr('barcha sanalar')})
            </span>
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
            <p className="mt-2 text-sm font-medium text-slate-600">{tr('Yozuv topilmadi')}</p>
            <p className="mt-1 text-xs text-slate-400">{tr("Filtrlarni o'zgartirib qayta urinib ko'ring")}</p>
          </div>
        ) : (
          <div className="max-h-[60vh] overflow-auto">
            <table className="table">
              <thead className="sticky top-0 z-10 bg-white">
                <tr>
                  <th className="text-center">#</th>
                  <th className="text-center">{tr('Natija')}</th>
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
                    <td className="text-center whitespace-nowrap">
                      <NatijaBadge natija={m.tekshiruv_natijasi} qisqa />
                    </td>
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

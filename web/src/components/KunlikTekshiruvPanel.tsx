import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, CheckCircle2, ClipboardCheck, DoorClosed, Users } from 'lucide-react';
import { apiGet } from '@/api';
import { useAlifbo } from '@/alifbo';
import DateInput from '@/components/DateInput';
import { soatDaqiqa } from '@/lib/sana';
import type { KunlikStatistika, Paginated, UserBrief } from '@/types';

/** Inspektorlar jadvalini ustun bo'yicha kesish uchun — har biri mos son maydoniga ishora qiladi. */
const HOLATI_OPTIONS: { key: 'muammosiz' | 'muammoli' | 'kira_olmadi'; label: string }[] = [
  { key: 'muammosiz', label: 'Muammosiz' },
  { key: 'muammoli', label: 'Muammoli' },
  { key: 'kira_olmadi', label: 'Kira olmadi' },
];

/** Toshkent (UTC+5) bo'yicha bugungi sana — YYYY-MM-DD. */
function bugunToshkent(): string {
  const hozir = new Date();
  const toshkent = new Date(hozir.getTime() + (5 * 60 + hozir.getTimezoneOffset()) * 60_000);
  return `${toshkent.getFullYear()}-${String(toshkent.getMonth() + 1).padStart(2, '0')}-${String(
    toshkent.getDate(),
  ).padStart(2, '0')}`;
}

function Tile({
  Icon,
  label,
  value,
  tint,
  chip,
  to,
}: {
  Icon: typeof AlertCircle;
  label: string;
  value: number;
  tint: string;
  chip: string;
  to?: string;
}) {
  const { tr } = useAlifbo();
  const ichki = (
    <>
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${chip}`}>
        <Icon className="h-5 w-5" strokeWidth={1.8} />
      </span>
      <div className="min-w-0">
        <div className={`text-2xl font-bold leading-tight tabular-nums ${tint}`}>{value}</div>
        <div className="truncate text-xs text-slate-500">{tr(label)}</div>
      </div>
    </>
  );
  const cls = 'flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/60 p-3';
  return to ? (
    <Link to={to} className={`${cls} transition-colors hover:bg-slate-100`}>
      {ichki}
    </Link>
  ) : (
    <div className={cls}>{ichki}</div>
  );
}

/**
 * Kunlik tashrif hisoboti: nechta xonadon tekshirildi, natijalar taqsimoti
 * va "kim nechta tekshirdi" kesimi. Avval bu ma'lumot admin uchun umuman
 * ko'rinmasdi — faqat muammolar ro'yxati bor edi.
 */
export default function KunlikTekshiruvPanel() {
  const { tr } = useAlifbo();
  const [sana, setSana] = useState<string>(bugunToshkent());
  const [data, setData] = useState<KunlikStatistika | null>(null);
  const [loading, setLoading] = useState(true);
  const [holatiFilter, setHolatiFilter] = useState<'' | 'muammosiz' | 'muammoli' | 'kira_olmadi'>('');
  const [xodimFilter, setXodimFilter] = useState('');
  const [xodimlar, setXodimlar] = useState<UserBrief[]>([]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    apiGet<KunlikStatistika>(`/statistika/kunlik?sana=${sana}`)
      .then((res) => {
        if (cancelled) return;
        setData(res.ok ? res.data : null);
      })
      .catch(() => {
        if (!cancelled) setData(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [sana]);

  // Inspektor filtri uchun xodimlar ro'yxati — yangi qo'shilgan xodim ham shu yerda chiqadi
  useEffect(() => {
    let cancelled = false;
    apiGet<Paginated<UserBrief>>('/users?page=1&size=100')
      .then((res) => {
        if (cancelled || !res.ok) return;
        setXodimlar(res.data.items.filter((u) => u.rol === 'xodim'));
      })
      .catch(() => {
        // Filtr ixtiyoriy — xatolik panelni buzmasin
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const bugunmi = sana === bugunToshkent();

  const korsatilganXodimlar = useMemo(() => {
    if (!data) return [];
    return data.xodimlar.filter((x) => {
      if (xodimFilter && String(x.xodim_id) !== xodimFilter) return false;
      if (holatiFilter && x[holatiFilter] <= 0) return false;
      return true;
    });
  }, [data, xodimFilter, holatiFilter]);

  return (
    <section className="card overflow-hidden" aria-label={tr('Kunlik tekshiruvlar')}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-6 py-4">
        <div>
          <h2 className="text-base font-semibold text-[#0F2033]">
            {bugunmi ? tr('Bugungi tekshiruvlar') : tr('Kunlik tekshiruvlar')}
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            {tr('Tashriflar natijasi va inspektorlar kesimi')}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <span className="font-medium">{tr('Tashriflar holati:')}</span>
            <select
              className="select !w-auto !py-1.5 text-sm"
              value={holatiFilter}
              onChange={(e) => setHolatiFilter(e.target.value as typeof holatiFilter)}
            >
              <option value="">{tr('Barchasi')}</option>
              {HOLATI_OPTIONS.map((o) => (
                <option key={o.key} value={o.key}>
                  {tr(o.label)}
                </option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-2 text-sm text-gray-600">
            <span className="font-medium">{tr('Inspektorlar:')}</span>
            <select
              className="select !w-auto !py-1.5 text-sm"
              value={xodimFilter}
              onChange={(e) => setXodimFilter(e.target.value)}
            >
              <option value="">{tr('Barcha inspektorlar')}</option>
              {xodimlar.map((x) => (
                <option key={x.id} value={String(x.id)}>
                  {tr(x.full_name)}
                </option>
              ))}
            </select>
          </label>

          <div className="w-[150px]">
            <DateInput className="input" value={sana} onChange={(iso) => setSana(iso || bugunToshkent())} />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="p-6 text-center text-sm text-slate-400">{tr('Yuklanmoqda...')}</div>
      ) : !data ? (
        <div className="empty-state">
          <p className="text-sm text-slate-400">{tr("Ma'lumot yuklanmadi")}</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 p-4 lg:grid-cols-4">
            <Tile
              Icon={ClipboardCheck}
              label="Jami tashrif"
              value={data.jami}
              tint="text-[#0F2033]"
              chip="bg-[#3D6FB4]/10 text-[#3D6FB4]"
              to={`/muammolar?sana=${sana}`}
            />
            <Tile
              Icon={CheckCircle2}
              label="Muammosiz"
              value={data.muammosiz}
              tint="text-[#2E9E6B]"
              chip="bg-[#2E9E6B]/10 text-[#2E9E6B]"
              to={`/muammolar?sana=${sana}&natija=muammo_yoq`}
            />
            <Tile
              Icon={AlertCircle}
              label="Muammoli"
              value={data.muammoli}
              tint="text-[#C0392B]"
              chip="bg-[#C0392B]/10 text-[#C0392B]"
              to={`/muammolar?sana=${sana}&natija=muammo_topildi`}
            />
            <Tile
              Icon={DoorClosed}
              label="Kira olmadi"
              value={data.kira_olmadi}
              tint="text-[#C9A227]"
              chip="bg-[#C9A227]/10 text-[#C9A227]"
              to={`/muammolar?sana=${sana}&natija=kira_olmadi`}
            />
          </div>

          <div className="border-t border-slate-100 px-6 py-3">
            <div className="flex items-center gap-2 text-sm font-medium text-[#0F2033]">
              <Users className="h-4 w-4 text-slate-400" />
              {tr('Inspektorlar')}
            </div>
          </div>

          {data.xodimlar.length === 0 ? (
            <div className="px-6 pb-6 pt-1 text-sm text-slate-400">
              {bugunmi
                ? tr('Bugun hali hech kim tekshiruv qaydnomasini yubormagan')
                : tr('Bu kuni tekshiruv qayd etilmagan')}
            </div>
          ) : korsatilganXodimlar.length === 0 ? (
            <div className="px-6 pb-6 pt-1 text-sm text-slate-400">
              {tr('Filtrga mos inspektor topilmadi')}
            </div>
          ) : (
            <div className="max-h-80 overflow-y-auto overflow-x-auto">
              <table className="table">
                <thead className="sticky top-0 z-10 bg-white">
                  <tr>
                    <th>{tr('Inspektor')}</th>
                    <th className="text-center">{tr('Tashrif')}</th>
                    <th className="text-center">{tr('Muammosiz')}</th>
                    <th className="text-center">{tr('Muammoli')}</th>
                    <th className="text-center">{tr('Kira olmadi')}</th>
                    <th className="text-center">{tr('Oxirgi faollik')}</th>
                  </tr>
                </thead>
                <tbody>
                  {korsatilganXodimlar.map((x) => (
                    <tr key={x.xodim_id}>
                      <td className="font-medium text-[#0F2033]">{tr(x.xodim_fio)}</td>
                      <td className="text-center font-semibold tabular-nums">{x.jami}</td>
                      <td className="text-center tabular-nums text-[#2E9E6B]">{x.muammosiz}</td>
                      <td className="text-center tabular-nums text-[#C0392B]">{x.muammoli}</td>
                      <td className="text-center tabular-nums text-[#C9A227]">{x.kira_olmadi}</td>
                      <td className="text-center text-xs text-slate-500">
                        {x.oxirgi_faollik ? soatDaqiqa(x.oxirgi_faollik) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </section>
  );
}

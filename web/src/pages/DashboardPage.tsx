import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  AlertTriangle,
  BarChart3,
  ClipboardList,
  Clock,
  Flame,
  Home,
  Inbox,
  Map,
  Siren,
  Users,
  Zap,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { apiGet } from '@/api';
import { useAlifbo } from '@/alifbo';
import { SkeletonCards } from '@/components/Skeleton';
import { sanaVaqt } from '@/lib/sana';
import type {
  MuammoBrief,
  MuammoStatus,
  MuammoTuri,
  Paginated,
  StatistikaResponse,
  XonadonBrief,
} from '@/types';

const STATUS_LABEL: Record<string, string> = {
  ochiq: 'Ochiq',
  jarayonda: 'Jarayonda',
  yopilgan: 'Yopilgan',
  muddati_otgan: "Muddati o'tgan",
  qayta_ochilgan: 'Qayta ochilgan',
};

const STATUS_BADGE: Record<string, string> = {
  ochiq: 'badge-blue',
  jarayonda: 'badge-yellow',
  yopilgan: 'badge-green',
  muddati_otgan: 'badge-red',
  qayta_ochilgan: 'badge-blue',
};

const TURI_LABEL: Record<MuammoTuri, string> = {
  gaz: 'Gaz',
  elektr: 'Elektr',
  yongin: "Yong'in",
  boshqa: 'Boshqa',
};

const TURI_ICON: Record<MuammoTuri, typeof Flame> = {
  gaz: Flame,
  elektr: Zap,
  yongin: Siren,
  boshqa: AlertCircle,
};

export default function DashboardPage() {
  const { tr } = useAlifbo();

  /** "5 daqiqa oldin" / "3 soat oldin" / "2 kun oldin" — eski sanalar uchun sanaVaqt. */
  function qanchaVaqtOldin(iso: string | null | undefined): string {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    const farqSec = (Date.now() - d.getTime()) / 1000;
    if (farqSec < 3600) return `${Math.max(1, Math.floor(farqSec / 60))} ${tr('daqiqa oldin')}`;
    if (farqSec < 86400) return `${Math.floor(farqSec / 3600)} ${tr('soat oldin')}`;
    if (farqSec < 7 * 86400) return `${Math.floor(farqSec / 86400)} ${tr('kun oldin')}`;
    return sanaVaqt(iso);
  }
  const [xonadonTotal, setXonadonTotal] = useState<number>(0);
  const [statistika, setStatistika] = useState<StatistikaResponse | null>(null);
  const [songgiMuammolar, setSonggiMuammolar] = useState<MuammoBrief[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadStats() {
      setLoading(true);
      setError(null);
      try {
        const [xonadonRes, statRes, muammoRes] = await Promise.all([
          apiGet<Paginated<XonadonBrief>>('/xonadonlar?page=1&size=1'),
          apiGet<StatistikaResponse>('/statistika'),
          apiGet<Paginated<MuammoBrief>>('/muammolar?page=1&size=5'),
        ]);

        if (cancelled) return;

        setXonadonTotal(xonadonRes.data.total);
        setStatistika(statRes.data);
        setSonggiMuammolar(muammoRes.data.items);
      } catch (err) {
        if (cancelled) return;
        const message =
          err instanceof Error ? err.message : tr('Maʼlumotlarni yuklashda xatolik yuz berdi');
        setError(message);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadStats();

    return () => {
      cancelled = true;
    };
  }, []);

  const muddatiOtgan =
    statistika?.muammo_status.find((s) => s.status === 'muddati_otgan')?.soni ?? 0;

  const stats = [
    {
      label: 'Jami xonadonlar',
      value: statistika?.umumiy.xonadon_soni ?? xonadonTotal,
      icon: Home,
      chip: 'bg-[#3D6FB4]/10 text-[#3D6FB4]',
      tint: 'text-[#3D6FB4]',
    },
    {
      label: 'Ochiq muammolar',
      value: statistika?.umumiy.ochiq_muammolar ?? 0,
      icon: AlertTriangle,
      chip: 'bg-[#C9A227]/10 text-[#C9A227]',
      tint: 'text-[#C9A227]',
    },
    {
      label: "Muddati o'tgan",
      value: muddatiOtgan,
      icon: Clock,
      chip: 'bg-[#C0392B]/10 text-[#C0392B]',
      tint: 'text-[#C0392B]',
    },
    {
      label: 'Xodimlar',
      value: statistika?.umumiy.xodim_soni ?? 0,
      icon: Users,
      chip: 'bg-[#2E9E6B]/10 text-[#2E9E6B]',
      tint: 'text-[#2E9E6B]',
    },
  ];

  return (
    <div className="space-y-6">
      {error ? (
        <div
          role="alert"
          className="rounded-xl border border-[#C0392B]/20 bg-[#C0392B]/5 p-6 text-[#C0392B]"
        >
          <h2 className="text-base font-semibold">{tr('Xatolik yuz berdi')}</h2>
          <p className="mt-1 text-sm">{error}</p>
        </div>
      ) : loading ? (
        <SkeletonCards count={4} />
      ) : (
        <>
          {/* Statistik kartalar */}
          <section
            aria-label={tr('Asosiy statistika')}
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
          >
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="stat-card group relative overflow-hidden transition-shadow duration-200 hover:shadow-md"
              >
                <span
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${stat.chip} transition-transform duration-200 group-hover:scale-105`}
                >
                  <stat.icon className="h-5 w-5" strokeWidth={1.8} />
                </span>
                <div className="min-w-0">
                  <div className="truncate text-sm text-slate-500">{tr(stat.label)}</div>
                  <div className="mt-0.5 text-3xl font-bold leading-tight tabular-nums text-[#0F2033]">
                    {stat.value}
                  </div>
                </div>
                <stat.icon
                  className={`pointer-events-none absolute -bottom-4 -right-4 h-24 w-24 opacity-[0.05] ${stat.tint}`}
                  strokeWidth={1.2}
                  aria-hidden="true"
                />
              </div>
            ))}
          </section>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Oylik dinamika */}
            <section className="card lg:col-span-2" aria-label={tr('Oylik dinamika')}>
              <div className="flex items-center justify-between gap-3 px-6 pt-5">
                <div>
                  <h2 className="text-base font-semibold text-[#0F2033]">
                    {tr('Muammolar dinamikasi')}
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {tr('Ochilgan va yopilgan muammolar — oylar kesimida')}
                  </p>
                </div>
                <Link
                  to="/analitika"
                  className="text-sm font-medium text-[#3D6FB4] hover:underline"
                >
                  {tr('Batafsil analitika')}
                </Link>
              </div>
              <div className="px-4 pb-4 pt-4">
                {!statistika || statistika.vaqt_dinamika.length === 0 ? (
                  <div className="empty-state">
                    <BarChart3 className="mx-auto h-8 w-8 text-slate-300" />
                    <p className="mt-2 text-sm text-slate-400">{tr("Ma'lumot hali mavjud emas")}</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <AreaChart data={statistika.vaqt_dinamika} margin={{ left: -12, right: 8 }}>
                      <defs>
                        <linearGradient id="gradOchilgan" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#3D6FB4" stopOpacity={0.24} />
                          <stop offset="100%" stopColor="#3D6FB4" stopOpacity={0.02} />
                        </linearGradient>
                        <linearGradient id="gradYopilgan" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#C9A227" stopOpacity={0.24} />
                          <stop offset="100%" stopColor="#C9A227" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
                      <XAxis
                        dataKey="davr"
                        tick={{ fontSize: 11, fill: '#64748b' }}
                        stroke="#cbd5e1"
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 12, fill: '#64748b' }}
                        stroke="#cbd5e1"
                        tickLine={false}
                        axisLine={false}
                        allowDecimals={false}
                      />
                      <Tooltip />
                      <Legend />
                      <Area
                        type="monotone"
                        dataKey="ochilgan"
                        name={tr('Ochilgan')}
                        stroke="#3D6FB4"
                        strokeWidth={2}
                        fill="url(#gradOchilgan)"
                        dot={{ r: 3, fill: '#3D6FB4' }}
                      />
                      <Area
                        type="monotone"
                        dataKey="yopilgan"
                        name={tr('Yopilgan')}
                        stroke="#C9A227"
                        strokeWidth={2}
                        fill="url(#gradYopilgan)"
                        dot={{ r: 3, fill: '#C9A227' }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </section>

            {/* Tezkor amallar */}
            <section className="card p-6" aria-label={tr('Tezkor amallar')}>
              <h2 className="text-base font-semibold text-[#0F2033]">{tr('Tezkor amallar')}</h2>
              <p className="mt-0.5 text-xs text-slate-500">{tr("Asosiy bo'limlarga o'tish")}</p>
              <div className="mt-4 flex flex-col gap-2.5">
                <Link to="/muammolar" className="btn-soft justify-start gap-2.5">
                  <ClipboardList className="h-4 w-4" />
                  {tr("Muammolar ro'yxati")}
                </Link>
                <Link to="/xarita" className="btn-soft justify-start gap-2.5">
                  <Map className="h-4 w-4" />
                  {tr('Xarita')}
                </Link>
                <Link to="/analitika" className="btn-soft justify-start gap-2.5">
                  <BarChart3 className="h-4 w-4" />
                  {tr('Analitika')}
                </Link>
              </div>
            </section>
          </div>

          {/* So'nggi faollik */}
          <section className="card overflow-hidden" aria-label={tr("So'nggi faollik")}>
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-6 py-4">
              <h2 className="text-base font-semibold text-[#0F2033]">{tr("So'nggi faollik")}</h2>
              <Link
                to="/muammolar"
                className="text-sm font-medium text-[#3D6FB4] hover:underline"
              >
                {tr("Barchasini ko'rish")}
              </Link>
            </div>
            {songgiMuammolar.length === 0 ? (
              <div className="empty-state">
                <Inbox className="mx-auto h-8 w-8 text-slate-300" />
                <p className="mt-2 text-sm text-slate-400">{tr("Hozircha muammolar qayd etilmagan")}</p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {songgiMuammolar.map((m) => {
                  const Icon = m.turi ? (TURI_ICON[m.turi] ?? AlertCircle) : AlertCircle;
                  return (
                    <li key={m.id}>
                      <Link
                        to={`/muammolar/${m.id}`}
                        className="flex items-center gap-4 px-6 py-3.5 transition-colors hover:bg-slate-50"
                      >
                        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#3D6FB4]/10 text-[#3D6FB4]">
                          <Icon className="h-5 w-5" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-[#0F2033]">
                            {m.tavsif || `${tr(m.turi ? (TURI_LABEL[m.turi] || m.turi) : "Tekshiruv")} — #${m.id}`}
                          </p>
                          <p className="mt-0.5 truncate text-xs text-slate-500">
                            {m.xonadon_manzili ? tr(m.xonadon_manzili) : tr("Manzil ko‘rsatilmagan")}
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1">
                          <span className={STATUS_BADGE[m.status as MuammoStatus] || 'badge-gray'}>
                            {tr(STATUS_LABEL[m.status] || m.status)}
                          </span>
                          <span className="text-xs text-slate-400">
                            {qanchaVaqtOldin(m.sinxron_vaqti)}
                          </span>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}

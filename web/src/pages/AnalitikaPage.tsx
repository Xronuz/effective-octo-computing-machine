import { useEffect, useState, useCallback } from 'react';
import { apiGet } from '@/api';
import { MapContainer, TileLayer, Circle, Popup } from 'react-leaflet';
import {
  AlertTriangle,
  BarChart3,
  Building,
  Building2,
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  Flame,
  Landmark,
  Percent,
  RefreshCw,
  Route,
  Users,
} from 'lucide-react';
import { sanaVaqt } from '@/lib/sana';
import { useAlifbo } from '@/alifbo';
import KunlikTekshiruvPanel from '@/components/KunlikTekshiruvPanel';
import type { StatistikaResponse, XodimStatistika, MfyBrief } from '@/types';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
} from 'recharts';

const MUAMMO_TURI_LABELS: Record<string, string> = {
  gaz: 'Gaz',
  elektr: 'Elektr',
  yongin: "Yong'in",
  boshqa: 'Boshqa',
};

const MUAMMO_STATUS_LABELS: Record<string, string> = {
  ochiq: 'Ochiq',
  jarayonda: 'Jarayonda',
  yopilgan: 'Yopilgan',
  muddati_otgan: "Muddati o'tgan",
};

const XAVF_LABELS: Record<string, string> = {
  past: 'Past',
  orta: "O'rta",
  yuqori: 'Yuqori',
};

// Brend palitra — navy / oltin / status ranglari
const BLUE = '#3D6FB4';
const GOLD = '#C9A227';
const GREEN = '#2E9E6B';
const YELLOW = '#D9A441';
const RED = '#C0392B';
const PURPLE = '#8E44AD';

const COLORS = [BLUE, GOLD, RED, GREEN, PURPLE, YELLOW];

const STATUS_COLORS: Record<string, string> = {
  ochiq: BLUE,
  jarayonda: YELLOW,
  yopilgan: GREEN,
  muddati_otgan: RED,
};

// MFY zichlik xaritasi rang shkalasi — och navy → to'q qizil (5 gradatsiya)
const HEAT_COLORS = ['#DCE7F4', '#9DBBDD', BLUE, YELLOW, RED];

export default function AnalitikaPage() {
  const { tr } = useAlifbo();
  const [data, setData] = useState<StatistikaResponse | null>(null);
  const [xodimlar, setXodimlar] = useState<XodimStatistika[]>([]);
  const [mfyMarkazlar, setMfyMarkazlar] = useState<MfyBrief[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [statRes, xodimRes, mfyRes] = await Promise.all([
        apiGet<StatistikaResponse>('/statistika'),
        apiGet<XodimStatistika[] | { items: XodimStatistika[] }>('/statistika/xodimlar'),
        apiGet<MfyBrief[] | { items: MfyBrief[] }>('/mfylar'),
      ]);
      setData(statRes.data);
      // Backend sahifalangan obyekt qaytaradi ({items, total, ...}), massiv emas —
      // avval faqat massiv holati tekshirilib, jadval doim bo'sh qolardi.
      const xodimData = xodimRes.data;
      setXodimlar(Array.isArray(xodimData) ? xodimData : (xodimData?.items ?? []));
      const mfyData = mfyRes.data;
      setMfyMarkazlar(Array.isArray(mfyData) ? mfyData : mfyData.items ?? []);
    } catch (err) {
      const msg = err instanceof Error ? err.message : tr("Ma'lumotlarni yuklashda xatolik");
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [tr]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleExport = async (format: 'excel' | 'pdf') => {
    setExporting(format);
    try {
      const res = await fetch(`/api/statistika/${format}`);
      if (!res.ok) throw new Error('Eksportda xatolik');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `statistika.${format === 'excel' ? 'xlsx' : 'pdf'}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      alert(`${format.toUpperCase()} ${tr('eksportda xatolik yuz berdi')}`);
    } finally {
      setExporting(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#0F2033]" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="card p-8 text-center">
        <AlertTriangle className="mx-auto h-8 w-8 text-[#C0392B]" />
        <h2 className="mt-3 text-lg font-semibold text-[#0F2033]">{tr('Xatolik yuz berdi')}</h2>
        <p className="mt-1 text-sm text-slate-500">{error || tr("Ma'lumot topilmadi")}</p>
        <button onClick={loadData} className="btn-primary mt-5 gap-2">
          <RefreshCw className="h-4 w-4" />
          {tr('Qayta urinish')}
        </button>
      </div>
    );
  }

  const { umumiy, muammo_turlari, muammo_xavf, muammo_status, mfylar, topshiriqlar, intizom, vaqt_dinamika } = data;

  const turiChart = muammo_turlari.map((t) => ({
    name: MUAMMO_TURI_LABELS[t.turi] ? tr(MUAMMO_TURI_LABELS[t.turi]) : t.turi,
    soni: t.soni,
  }));

  const xavfChart = muammo_xavf.map((x) => ({
    name: XAVF_LABELS[x.xavf] ? tr(XAVF_LABELS[x.xavf]) : x.xavf,
    value: x.soni,
  }));

  const statusChart = muammo_status.map((s) => ({
    name: MUAMMO_STATUS_LABELS[s.status] ? tr(MUAMMO_STATUS_LABELS[s.status]) : s.status,
    soni: s.soni,
    rang: STATUS_COLORS[s.status] || BLUE,
  }));

  // ── MFY heatmap ma'lumotlari ─────────────────────────────────────
  // Backend MFY modelida chegara geometriyasi yo'q (faqat markaz lat/lng),
  // shuning uchun barcha MFY lar markaz doirasi bilan chiziladi.
  const markazMap = new Map(mfyMarkazlar.map((m) => [m.id, m]));
  const heatItems = mfylar
    .map((s) => {
      const markaz = markazMap.get(s.mfy_id);
      if (!markaz || markaz.markaz_lat == null || markaz.markaz_lng == null) return null;
      return { ...s, lat: markaz.markaz_lat, lng: markaz.markaz_lng };
    })
    .filter((h): h is NonNullable<typeof h> => h !== null);

  const maxOchiq = Math.max(0, ...heatItems.map((h) => h.ochiq_muammo));
  const maxXonadon = Math.max(1, ...heatItems.map((h) => h.xonadon_soni));

  const heatColor = (ochiq: number) => {
    if (maxOchiq === 0 || ochiq === 0) return HEAT_COLORS[0];
    const g = Math.min(
      HEAT_COLORS.length - 1,
      Math.ceil((ochiq / maxOchiq) * HEAT_COLORS.length) - 1,
    );
    return HEAT_COLORS[g];
  };
  const heatRadius = (xonadonSoni: number) =>
    250 + 350 * Math.sqrt(xonadonSoni / maxXonadon);
  const mapCenter: [number, number] = heatItems.length
    ? [
        heatItems.reduce((a, h) => a + h.lat, 0) / heatItems.length,
        heatItems.reduce((a, h) => a + h.lng, 0) / heatItems.length,
      ]
    : [40.98, 71.67]; // Uychi tumani markazi (fallback)

  return (
    <div className="space-y-6">
      {/* Umumiy statistika kartalari */}
      <section>
        <div className="mb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h2 className="text-base font-semibold text-[#0F2033]">{tr("Umumiy ko'rsatkichlar")}</h2>
          <div className="flex gap-2">
            <button
              onClick={() => handleExport('excel')}
              disabled={exporting !== null}
              className="btn-soft gap-2"
            >
              <FileSpreadsheet className="h-4 w-4" />
              {exporting === 'excel' ? tr('Yuklanmoqda...') : 'Excel'}
            </button>
            <button
              onClick={() => handleExport('pdf')}
              disabled={exporting !== null}
              className="btn-soft gap-2"
            >
              <FileText className="h-4 w-4" />
              {exporting === 'pdf' ? tr('Yuklanmoqda...') : 'PDF'}
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          <StatCard label={tr("Jami ko'chalar")} value={umumiy.kocha_soni} icon={Route} chip="bg-[#3D6FB4]/10 text-[#3D6FB4]" tint="text-[#3D6FB4]" />
          <StatCard label={tr('Jami muammolar')} value={umumiy.muammo_soni} icon={BarChart3} chip="bg-[#C9A227]/10 text-[#C9A227]" tint="text-[#C9A227]" />
          <StatCard label={tr('Ochiq muammolar')} value={umumiy.ochiq_muammolar} icon={AlertTriangle} chip="bg-[#D9A441]/10 text-[#D9A441]" tint="text-[#D9A441]" />
          <StatCard label={tr('Yopilgan')} value={umumiy.yopilgan_muammolar} icon={CheckCircle2} chip="bg-[#2E9E6B]/10 text-[#2E9E6B]" tint="text-[#2E9E6B]" />
          <StatCard label={tr('Xodimlar')} value={umumiy.xodim_soni} icon={Users} chip="bg-[#8E44AD]/10 text-[#8E44AD]" tint="text-[#8E44AD]" />
          <StatCard label={tr('MFY lar')} value={umumiy.mfy_soni} icon={Building} chip="bg-[#3D6FB4]/10 text-[#3D6FB4]" tint="text-[#3D6FB4]" />
          <StatCard label={tr('Tekshirilgan xonadon')} value={umumiy.tekshirilgan_xonadon} icon={Building2} chip="bg-[#2E9E6B]/10 text-[#2E9E6B]" tint="text-[#2E9E6B]" />
          <StatCard label={tr('Tekshirish foizi')} value={`${umumiy.foiz.toFixed(1)}%`} icon={Percent} chip="bg-[#C9A227]/10 text-[#C9A227]" tint="text-[#C9A227]" />
        </div>
      </section>

      {/* Diagrammalar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Muammo turlari */}
        <section className="card p-5">
          <h2 className="mb-4 text-base font-semibold text-[#0F2033]">{tr('Muammo turlari')}</h2>
          {turiChart.length === 0 ? (
            <div className="empty-state">
              <BarChart3 className="mx-auto h-8 w-8 text-slate-300" />
              <p className="mt-2 text-sm text-slate-400">{tr("Ma'lumot yo'q")}</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={turiChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} stroke="#cbd5e1" tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#64748b' }} stroke="#cbd5e1" tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="soni" fill={BLUE} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </section>

        {/* Xavf darajalari */}
        <section className="card p-5">
          <h2 className="mb-4 text-base font-semibold text-[#0F2033]">{tr("Xavf darajalari bo'yicha")}</h2>
          {xavfChart.length === 0 ? (
            <div className="empty-state">
              <Flame className="mx-auto h-8 w-8 text-slate-300" />
              <p className="mt-2 text-sm text-slate-400">{tr("Ma'lumot yo'q")}</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={xavfChart}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={90}
                  paddingAngle={4}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {xavfChart.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </section>

        {/* Status bo'yicha */}
        <section className="card p-5">
          <h2 className="mb-4 text-base font-semibold text-[#0F2033]">{tr("Status bo'yicha")}</h2>
          {statusChart.length === 0 ? (
            <div className="empty-state">
              <BarChart3 className="mx-auto h-8 w-8 text-slate-300" />
              <p className="mt-2 text-sm text-slate-400">{tr("Ma'lumot yo'q")}</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={statusChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} stroke="#cbd5e1" tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#64748b' }} stroke="#cbd5e1" tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="soni" radius={[6, 6, 0, 0]}>
                  {statusChart.map((s, i) => (
                    <Cell key={i} fill={s.rang} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </section>

        {/* Vaqt dinamikasi */}
        <section className="card p-5">
          <h2 className="mb-4 text-base font-semibold text-[#0F2033]">{tr('Vaqt dinamikasi')}</h2>
          {vaqt_dinamika.length === 0 ? (
            <div className="empty-state">
              <BarChart3 className="mx-auto h-8 w-8 text-slate-300" />
              <p className="mt-2 text-sm text-slate-400">{tr("Ma'lumot yo'q")}</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={vaqt_dinamika}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
                <XAxis dataKey="davr" tick={{ fontSize: 11, fill: '#64748b' }} stroke="#cbd5e1" tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#64748b' }} stroke="#cbd5e1" tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="ochilgan" stroke={BLUE} strokeWidth={2} dot={{ r: 3 }} name={tr('Ochilgan')} />
                <Line type="monotone" dataKey="yopilgan" stroke={GOLD} strokeWidth={2} dot={{ r: 3 }} name={tr('Yopilgan')} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </section>
      </div>

      {/* Topshiriqlar + Intizom */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <section className="card p-5">
          <h2 className="mb-3 text-base font-semibold text-[#0F2033]">{tr('Topshiriqlar')}</h2>
          <div className="grid grid-cols-3 gap-3">
            <MiniStat label={tr('Jami')} value={topshiriqlar.jami} tone="slate" />
            <MiniStat label={tr('Yangi')} value={topshiriqlar.yangi} tone="blue" />
            <MiniStat label={tr("Ko'rilgan")} value={topshiriqlar.korildi} tone="yellow" />
            <MiniStat label={tr('Bajarilgan')} value={topshiriqlar.bajarildi} tone="green" />
            <MiniStat label={tr('Kechikkan')} value={topshiriqlar.kechikkan} tone="red" />
          </div>
        </section>

        <section className="card p-5">
          <h2 className="mb-3 text-base font-semibold text-[#0F2033]">{tr('Intizom')}</h2>
          <div className="grid grid-cols-2 gap-3">
            <MiniStat label={tr('Jami')} value={intizom.jami} tone="slate" />
            <MiniStat label={tr('Ogohlantirish')} value={intizom.ogohlantirish} tone="yellow" />
            <MiniStat label={tr('Hayfsan')} value={intizom.hayfsan} tone="red" />
            <MiniStat label={tr("Rag'bat")} value={intizom.ragbat} tone="green" />
          </div>
        </section>
      </div>

      {/* MFY bo'yicha jadval */}
      <section className="card overflow-hidden">
        <div className="border-b border-slate-100 px-6 py-4">
          <h2 className="text-base font-semibold text-[#0F2033]">{tr("MFY bo'yicha kesim")}</h2>
        </div>
        {mfylar.length === 0 ? (
          <div className="empty-state">
            <Landmark className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-2 text-sm text-slate-400">{tr("Ma'lumot yo'q")}</p>
          </div>
        ) : (
          <div className="max-h-[60vh] overflow-auto">
            <table className="table">
              <thead className="sticky top-0 z-10 bg-white">
                <tr>
                  <th>{tr('MFY')}</th>
                  <th className="hidden text-center lg:table-cell">{tr('Xonadon')}</th>
                  <th className="hidden text-center lg:table-cell">{tr('Tekshirilgan')}</th>
                  <th className="text-center">{tr('Ochiq muammo')}</th>
                  <th className="hidden text-center lg:table-cell">{tr('Yopilgan')}</th>
                  <th className="text-center">{tr('Foiz')}</th>
                </tr>
              </thead>
              <tbody>
                {mfylar.map((m) => (
                  <tr key={m.mfy_id}>
                    <td className="max-w-[200px] truncate font-medium text-[#0F2033]">{tr(m.mfy_nomi)}</td>
                    <td className="hidden text-center tabular-nums lg:table-cell">{m.xonadon_soni}</td>
                    <td className="hidden text-center tabular-nums lg:table-cell">{m.tekshirilgan}</td>
                    <td className="text-center font-medium text-[#D9A441] tabular-nums">{m.ochiq_muammo}</td>
                    <td className="hidden text-center text-[#2E9E6B] tabular-nums lg:table-cell">{m.yopilgan_muammo}</td>
                    <td className="text-center">
                      <span
                        className={
                          m.foiz >= 80 ? 'badge-green' : m.foiz >= 50 ? 'badge-yellow' : 'badge-red'
                        }
                      >
                        {m.foiz.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* MFY muammo zichligi xaritasi (TZ ⑥) */}
      <section className="card p-5">
        <h2 className="text-base font-semibold text-[#0F2033]">
          MFY bo'yicha muammo zichligi
        </h2>
        <p className="mb-3 mt-1 text-xs text-slate-500">
          {tr('Ochiq muammolar soniga qarab rang: och ko\'k (kam) → to\'q qizil (ko\'p).')}
          {tr('Doira radiusi xonadonlar soniga mutanosib.')}
        </p>
        {heatItems.length === 0 ? (
          <div className="empty-state">
            <Landmark className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-2 text-sm text-slate-400">{tr("Koordinatalari ma'lum MFY topilmadi")}</p>
          </div>
        ) : (
          <>
            <div
              className="overflow-hidden rounded-xl border border-slate-200"
              style={{ height: 380 }}
            >
              <MapContainer
                center={mapCenter}
                zoom={12}
                style={{ width: '100%', height: '100%' }}
                scrollWheelZoom={false}
              >
                {/* Analitika yorug' sahifada — och rangli tile */}
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
                  url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                />
                {heatItems.map((h) => {
                  const rang = heatColor(h.ochiq_muammo);
                  return (
                    <Circle
                      key={h.mfy_id}
                      center={[h.lat, h.lng]}
                      radius={heatRadius(h.xonadon_soni)}
                      pathOptions={{
                        color: rang,
                        weight: 1.5,
                        fillColor: rang,
                        fillOpacity: 0.55,
                      }}
                    >
                      <Popup>
                        <div style={{ minWidth: 170 }}>
                          <div style={{ fontWeight: 700, marginBottom: 4 }}>{tr(h.mfy_nomi)}</div>
                          <div style={{ fontSize: 12, lineHeight: 1.6 }}>
                            <div>{tr('Ochiq muammo')}: <b>{h.ochiq_muammo}</b></div>
                            <div>{tr('Yopilgan')}: {h.yopilgan_muammo}</div>
                            <div>
                              {tr('Xonadon')}: {h.xonadon_soni} ({tr('tekshirilgan')} {h.tekshirilgan})
                            </div>
                          </div>
                        </div>
                      </Popup>
                    </Circle>
                  );
                })}
              </MapContainer>
            </div>
            {/* Legend */}
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
              <span className="font-medium">{tr('Ochiq muammolar:')}</span>
              {HEAT_COLORS.map((c, i) => (
                <span key={c} className="inline-flex items-center gap-1.5">
                  <span
                    className="inline-block h-3 w-3 rounded-sm border border-slate-300"
                    style={{ backgroundColor: c }}
                  />
                  {maxOchiq >= HEAT_COLORS.length
                    ? i === 0
                      ? '0'
                      : `${Math.floor((maxOchiq * i) / HEAT_COLORS.length) + 1}–${Math.round(
                          (maxOchiq * (i + 1)) / HEAT_COLORS.length,
                        )}`
                    : i === 0
                      ? tr('Kam')
                      : i === HEAT_COLORS.length - 1
                        ? tr("Ko'p")
                        : ''}
                </span>
              ))}
            </div>
          </>
        )}
      </section>

      {/* Kunlik kesim — sana tanlab, kim nechta tekshirganini ko'rish */}
      <KunlikTekshiruvPanel />

      {/* Xodimlar statistikasi — butun davr bo'yicha */}
      <section className="card overflow-hidden">
        <div className="border-b border-slate-100 px-6 py-4">
          <h2 className="text-base font-semibold text-[#0F2033]">{tr('Xodimlar faoliyati')}</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            {tr('Butun davr bo‘yicha jami — kunlik kesim yuqorida')}
          </p>
        </div>
        {xodimlar.length === 0 ? (
          <div className="empty-state">
            <Users className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-2 text-sm text-slate-400">{tr("Ma'lumot yo'q")}</p>
          </div>
        ) : (
          <div className="max-h-[60vh] overflow-auto">
            <table className="table">
              <thead className="sticky top-0 z-10 bg-white">
                <tr>
                  <th>{tr('Xodim')}</th>
                  <th className="text-right">{tr('Jami tashrif')}</th>
                  <th className="hidden text-right lg:table-cell">{tr('Muammo topilgan')}</th>
                  <th className="text-right">{tr('Ochiq')}</th>
                  <th className="hidden text-right lg:table-cell">{tr('Yopilgan')}</th>
                  <th className="hidden text-right xl:table-cell">{tr('Oxirgi faollik')}</th>
                </tr>
              </thead>
              <tbody>
                {xodimlar.map((x) => (
                  <tr key={x.xodim_id}>
                    <td className="font-medium text-[#0F2033]">{tr(x.xodim_fio)}</td>
                    <td className="text-right font-semibold tabular-nums">{x.jami_tekshirish}</td>
                    <td className="hidden text-right tabular-nums lg:table-cell">{x.jami_muammo}</td>
                    <td className="text-right text-[#D9A441] tabular-nums">{x.ochiq_muammo}</td>
                    <td className="hidden text-right text-[#2E9E6B] tabular-nums lg:table-cell">{x.yopilgan_muammo}</td>
                    <td className="hidden text-right text-xs text-slate-400 whitespace-nowrap xl:table-cell">
                      {sanaVaqt(x.oxirgi_faollik)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

/* ---------- small reusable components ---------- */

function StatCard({
  label,
  value,
  icon: Icon,
  chip,
  tint,
}: {
  label: string;
  value: number | string;
  icon: typeof Route;
  chip: string;
  tint: string;
}) {
  return (
    <div className="stat-card group relative overflow-hidden transition-shadow duration-200 hover:shadow-md">
      <span
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${chip} transition-transform duration-200 group-hover:scale-105`}
      >
        <Icon className="h-5 w-5" strokeWidth={1.8} />
      </span>
      <div className="min-w-0">
        <div className="mt-0.5 text-2xl font-bold tabular-nums text-[#0F2033]">{value}</div>
        <div className="mt-1 truncate text-xs text-slate-500">{label}</div>
      </div>
      <Icon
        className={`pointer-events-none absolute -bottom-4 -right-4 h-24 w-24 opacity-[0.05] ${tint}`}
        strokeWidth={1.2}
        aria-hidden="true"
      />
    </div>
  );
}

function MiniStat({ label, value, tone }: { label: string; value: number; tone: string }) {
  const toneMap: Record<string, string> = {
    slate: 'bg-slate-50 border-slate-200 text-slate-700',
    blue: 'bg-[#3D6FB4]/5 border-[#3D6FB4]/20 text-[#3D6FB4]',
    yellow: 'bg-[#D9A441]/5 border-[#D9A441]/20 text-[#D9A441]',
    green: 'bg-[#2E9E6B]/5 border-[#2E9E6B]/20 text-[#2E9E6B]',
    red: 'bg-[#C0392B]/5 border-[#C0392B]/20 text-[#C0392B]',
  };

  return (
    <div className={`rounded-xl border p-3 ${toneMap[tone] || toneMap.slate}`}>
      <div className="text-xl font-bold tabular-nums">{value}</div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  );
}

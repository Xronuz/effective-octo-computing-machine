// XAVFSIZ XONADON — Jonli xarita sahifasi (TZ 9.5-①)
// Dark tile (CartoDB Dark Matter) + MFY poligonlari + muammo nuqtalari (bbox, klaster)
// + faol xodimlar (WS, pulsatsiya) + chap/o'ng panellar + filtr chizig'i.

import { useEffect, useState, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, useMapEvents, useMap, Marker, Tooltip } from 'react-leaflet';
import { divIcon } from 'leaflet';
import type { Map as LeafletMap, LatLngBounds } from 'leaflet';
import { RefreshCw, Users, Activity, ChevronLeft, ChevronRight } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import { apiGet, getAccessToken } from '@/api';
import { useAlifbo } from '@/alifbo';
import { MfyQatlami } from '@/components/xarita/MfyQatlami';
import { MuammoQatlami } from '@/components/xarita/MuammoQatlami';
import { XodimQatlami } from '@/components/xarita/XodimQatlami';
import MfySelect from '@/components/MfySelect';
import StatusSelect from '@/components/xarita/StatusSelect';
import {
  STATUS_RANGLARI,
  STATUS_NOMLARI,
  TURI_NOMLARI,
  vaqtOldin,
  boshHarflar,
  batareyaRangi,
  type XaritaXodim,
  type MfyXarita,
  type MuammoFeature,
  type XaritaHodisa,
} from '@/components/xarita/xaritaTypes';

const DEFAULT_CENTER: [number, number] = [40.98, 71.67]; // Uychi tumani markazi

// Xarita uchun lokal CSS (index.css'ga tegilmaydi)
const XARITA_CSS = `
  .xarita-xodim-icon { background: transparent; border: none; }
  @keyframes xarita-pulse-ring {
    0%   { box-shadow: 0 2px 8px rgba(0,0,0,0.45), 0 0 0 0 rgba(125,167,232,0.7); }
    70%  { box-shadow: 0 2px 8px rgba(0,0,0,0.45), 0 0 0 14px rgba(125,167,232,0); }
    100% { box-shadow: 0 2px 8px rgba(0,0,0,0.45), 0 0 0 0 rgba(125,167,232,0); }
  }
  .xarita-pulse { animation: xarita-pulse-ring 1.2s ease-out 2; }
  @keyframes xarita-fade {
    from { opacity: 0; transform: translateY(-4px); }
    to   { opacity: 1; transform: none; }
  }
  .xarita-hodisa { animation: xarita-fade 0.35s ease-out; }
  .xarita-map .leaflet-control-attribution {
    background: rgba(17,24,39,0.7); color: #9ca3af; font-size: 10px;
  }
  .xarita-map .leaflet-control-attribution a { color: #c7d2fe; }
  .xarita-map .marker-cluster-small,
  .xarita-map .marker-cluster-medium,
  .xarita-map .marker-cluster-large { background-clip: padding-box; }
  .xarita-map .marker-cluster-small { background-color: rgba(76,125,191,0.35); }
  .xarita-map .marker-cluster-small div { background-color: rgba(76,125,191,0.9); color: #fff; }
  .xarita-map .marker-cluster-medium { background-color: rgba(217,164,65,0.35); }
  .xarita-map .marker-cluster-medium div { background-color: rgba(217,164,65,0.9); color: #fff; }
  .xarita-map .marker-cluster-large { background-color: rgba(192,57,43,0.35); }
  .xarita-map .marker-cluster-large div { background-color: rgba(192,57,43,0.9); color: #fff; }
  /* Tanlangan MFY — oltin pulsli pin */
  .mfy-tanlangan { background: transparent; border: none; }
  .mfy-tanlangan-pin {
    width: 18px; height: 18px; border-radius: 50%;
    background: #C9A227; border: 3px solid #fff;
    box-shadow: 0 2px 8px rgba(0,0,0,0.5);
    animation: mfy-pin-pulse 1.6s ease-out infinite;
  }
  @keyframes mfy-pin-pulse {
    0%   { box-shadow: 0 2px 8px rgba(0,0,0,0.5), 0 0 0 0 rgba(201,162,39,0.55); }
    70%  { box-shadow: 0 2px 8px rgba(0,0,0,0.5), 0 0 0 16px rgba(201,162,39,0); }
    100% { box-shadow: 0 2px 8px rgba(0,0,0,0.5), 0 0 0 0 rgba(201,162,39,0); }
  }
  .mfy-tooltip {
    background: #0A1E3C; color: #fff; border: none; border-radius: 8px;
    font-size: 12px; font-weight: 600; padding: 4px 10px;
    box-shadow: 0 4px 14px rgba(10,30,60,0.35);
  }
  .mfy-tooltip::before { border-top-color: #0A1E3C; }
`;

const HODISA_IKONLARI: Record<string, string> = {
  lokatsiya_yangilandi: '📍',
  yangi_muammo: '⚠️',
  muddat_otdi: '⏰',
  shubhali: '🟣',
};

/** moveend hodisasini kuzatib, bbox o'zgarishini yuqoriga xabar qiladi */
function BboxKuzatuvchi({ onMove }: { onMove: (b: LatLngBounds) => void }) {
  const map = useMapEvents({
    moveend: () => onMove(map.getBounds()),
  });
  useEffect(() => {
    onMove(map.getBounds());
  }, [map, onMove]);
  return null;
}

/** Flex layout va shriftlar o'tirgach xarita o'lchamini qayta hisoblash */
function XaritaOlchemi() {
  const map = useMap();
  useEffect(() => {
    const timers = [100, 400, 1000].map((ms) => setTimeout(() => map.invalidateSize(), ms));
    const onResize = () => map.invalidateSize();
    window.addEventListener('resize', onResize);
    return () => {
      timers.forEach(clearTimeout);
      window.removeEventListener('resize', onResize);
    };
  }, [map]);
  return null;
}

const TANLANGAN_MFY_ICON = divIcon({
  className: 'mfy-tanlangan',
  html: '<div class="mfy-tanlangan-pin"></div>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

/** Tanlangan MFY — oltin pulsli pin + doimiy nom yorlig'i */
function TanlanganMfyMarker({ mfy }: { mfy: MfyXarita }) {
  const { tr } = useAlifbo();
  if (mfy.markaz_lat === null || mfy.markaz_lng === null) return null;
  return (
    <Marker position={[mfy.markaz_lat, mfy.markaz_lng]} icon={TANLANGAN_MFY_ICON}>
      <Tooltip permanent direction="top" offset={[0, -12]} className="mfy-tooltip">
        {tr('MFY')} #{mfy.raqami} — {tr(mfy.nomi)}
      </Tooltip>
    </Marker>
  );
}

export default function XaritaPage() {
  const { tr } = useAlifbo();
  const token = getAccessToken();
  const [aktivlar, setAktivlar] = useState<XaritaXodim[]>([]);
  const [mfylar, setMfylar] = useState<MfyXarita[]>([]);
  const [features, setFeatures] = useState<MuammoFeature[]>([]);
  const [selectedMfyId, setSelectedMfyId] = useState<number | null>(null);
  const [chapOchiq, setChapOchiq] = useState(true);
  const [ongOchiq, setOngOchiq] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [hodisalar, setHodisalar] = useState<XaritaHodisa[]>([]);
  const [pulsingIds, setPulsingIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const mapRef = useRef<LeafletMap | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>();
  const debounceTimer = useRef<ReturnType<typeof setTimeout>>();
  const boundsRef = useRef<LatLngBounds | null>(null);
  const pulseTimers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());
  const hodisaIdRef = useRef(0);
  // Vaqt label'larini yangilab turish uchun
  const [, setTick] = useState(0);

  // ============ REST yuklash ============

  const fetchAktivlar = useCallback(async () => {
    try {
      const res = await apiGet<XaritaXodim[]>('/lokatsiya?songi_daqiqa=15');
      if (res.ok && Array.isArray(res.data)) {
        setAktivlar(res.data);
      }
    } catch {
      // WS ulansa, REST orqali yuklash shart emas
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMfylar = useCallback(async () => {
    try {
      const res = await apiGet<MfyXarita[]>('/mfylar');
      if (res.ok && Array.isArray(res.data)) {
        setMfylar(res.data);
      }
    } catch {
      // MFY ro'yxati yuklanmasa ham xarita ishlayveradi
    }
  }, []);

  const fetchMuammolar = useCallback(
    async (b: LatLngBounds) => {
      try {
        const bbox = `${b.getWest()},${b.getSouth()},${b.getEast()},${b.getNorth()}`;
        const statusQ = statusFilter
          ? `&status=${encodeURIComponent(statusFilter)}`
          : '';
        const res = await apiGet<{ features: MuammoFeature[] }>(
          `/muammolar/xarita?bbox=${bbox}${statusQ}`,
        );
        if (res.ok && res.data?.features) {
          setFeatures(res.data.features);
        }
      } catch {
        // Tarmoq xatosi — eski nuqtalar ekranda qoladi
      }
    },
    [statusFilter],
  );
  const fetchMuammolarRef = useRef(fetchMuammolar);
  useEffect(() => {
    fetchMuammolarRef.current = fetchMuammolar;
  }, [fetchMuammolar]);

  useEffect(() => {
    fetchAktivlar();
    fetchMfylar();
  }, [fetchAktivlar, fetchMfylar]);

  // Status filtri o'zgarsa — joriy bbox bo'yicha qayta yuklash
  useEffect(() => {
    if (boundsRef.current) fetchMuammolar(boundsRef.current);
  }, [fetchMuammolar]);

  // bbox o'zgarishi — 400ms debounce bilan muammolarni yuklash
  const handleBounds = useCallback((b: LatLngBounds) => {
    boundsRef.current = b;
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      fetchMuammolarRef.current(b);
    }, 400);
  }, []);

  // ============ Hodisalar oqimi ============

  const addHodisa = useCallback((turi: string, matn: string) => {
    hodisaIdRef.current += 1;
    const hodisa: XaritaHodisa = {
      id: hodisaIdRef.current,
      vaqt: new Date(),
      turi,
      matn,
    };
    setHodisalar((prev) => [hodisa, ...prev].slice(0, 20));
  }, []);

  // ============ Pulsatsiya ============

  const pulse = useCallback((xodimId: number) => {
    setPulsingIds((prev) => new Set(prev).add(xodimId));
    const eski = pulseTimers.current.get(xodimId);
    if (eski) clearTimeout(eski);
    pulseTimers.current.set(
      xodimId,
      setTimeout(() => {
        setPulsingIds((prev) => {
          const next = new Set(prev);
          next.delete(xodimId);
          return next;
        });
        pulseTimers.current.delete(xodimId);
      }, 2500),
    );
  }, []);

  // ============ WebSocket ============

  const connectWS = useCallback(() => {
    if (!token) return;
    // Prod'da (fvv.xron.uz) API bir xil origin orqali beriladi — shuning uchun
    // sahifa origin'idan olamiz, aks holda https sahifada ws:// aralash kontent
    // sifatida bloklanadi. Dev'da Vite proxy ham shu origin'ni ishlatadi.
    const baseUrl = import.meta.env.VITE_API_URL || window.location.origin;
    const wsUrl =
      baseUrl.replace(/^http/, 'ws') + `/api/ws/lokatsiya?token=${token}`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      setError(null);
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        const d = msg.data ?? {};

        if (msg.type === 'lokatsiya_yangilandi') {
          const xodim: XaritaXodim = {
            xodim_id: d.xodim_id,
            xodim_fio: d.xodim_fio ?? tr("Noma'lum"),
            lat: d.lat,
            lng: d.lng,
            aniqlik: d.aniqlik ?? null,
            batareya: d.batareya ?? null,
            ohirgi_vaqt: d.qabul_vaqti ?? new Date().toISOString(),
            profil_foto_url: d.profil_foto_url ?? null,
          };
          setAktivlar((prev) => [
            ...prev.filter((a) => a.xodim_id !== xodim.xodim_id),
            xodim,
          ]);
          pulse(xodim.xodim_id);
          addHodisa(msg.type, `${tr(xodim.xodim_fio)} ${tr('joylashuvi yangilandi')}`);
        } else if (msg.type === 'yangi_muammo') {
          const turiNomi = TURI_NOMLARI[d.turi ?? ''] ?? d.turi ?? 'muammo';
          addHodisa(msg.type, `${tr('Yangi muammo')}: #${d.id ?? d.muammo_id ?? '?'} — ${tr(turiNomi)}`);
          // Yangi nuqta xaritada darhol ko'rinishi uchun
          if (boundsRef.current) fetchMuammolarRef.current(boundsRef.current);
        } else if (msg.type === 'muddat_otdi') {
          addHodisa(msg.type, `#${d.muammo_id ?? d.id ?? '?'} ${tr("muammo muddati o'tdi")}`);
          if (boundsRef.current) fetchMuammolarRef.current(boundsRef.current);
        } else if (msg.type === 'shubhali') {
          addHodisa(msg.type, `#${d.muammo_id ?? d.id ?? '?'} ${tr('shubhali deb belgilandi')}`);
          if (boundsRef.current) fetchMuammolarRef.current(boundsRef.current);
        }
        // ping/pong va noma'lum type'lar — e'tiborsiz
      } catch {
        // ping/pong — ignore
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      // 5 soniyada qayta ulanish
      reconnectTimer.current = setTimeout(connectWS, 5000);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [token, pulse, addHodisa]);

  useEffect(() => {
    connectWS();
    return () => {
      wsRef.current?.close();
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
    };
  }, [connectWS]);

  // "N daqiqa oldin" label'lari uchun 30s lik tick
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 30_000);
    return () => clearInterval(t);
  }, []);

  // Pulse timerlarini tozalash
  useEffect(() => {
    const timers = pulseTimers.current;
    return () => {
      timers.forEach((t) => clearTimeout(t));
      timers.clear();
    };
  }, []);

  // ============ Navigatsiya ============

  const flyToXodim = (x: XaritaXodim) => {
    mapRef.current?.flyTo([x.lat, x.lng], 16, {
      duration: 0.3,
      easeLinearity: 0.25,
    });
  };

  const handleMfyTanlash = (mfyId: string) => {
    if (!mfyId) {
      setSelectedMfyId(null);
      return;
    }
    const mfy = mfylar.find((m) => m.id === Number(mfyId));
    const map = mapRef.current;
    if (!mfy || !map) return;
    setSelectedMfyId(mfy.id);

    if (mfy.chegara) {
      const latlngs =
        mfy.chegara.type === 'Polygon'
          ? mfy.chegara.coordinates.flat()
          : mfy.chegara.coordinates.flat(2);
      if (latlngs.length > 0) {
        const lats = latlngs.map(([, lat]) => lat);
        const lngs = latlngs.map(([lng]) => lng);
        map.flyToBounds(
          [
            [Math.min(...lats), Math.min(...lngs)],
            [Math.max(...lats), Math.max(...lngs)],
          ],
          { duration: 0.7, easeLinearity: 0.25 },
        );
        return;
      }
    }
    if (mfy.markaz_lat !== null && mfy.markaz_lng !== null) {
      map.flyTo([mfy.markaz_lat, mfy.markaz_lng], 15, {
        duration: 0.7,
        easeLinearity: 0.25,
      });
    }
  };

  // ============ Render ============

  const saralanganAktivlar = [...aktivlar].sort(
    (a, b) => new Date(b.ohirgi_vaqt).getTime() - new Date(a.ohirgi_vaqt).getTime(),
  );

  return (
    <div className="flex flex-col" style={{ height: 'calc(100dvh - 120px)' }}>
      <style>{XARITA_CSS}</style>

      {error && (
        <div className="mb-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Filtr chizig'i — sarlavha va statistika shu yerga ixcham ko'chirildi */}
      <div className="relative z-[1200] card px-4 py-2.5 mb-2 flex flex-wrap items-center gap-3">
        <span className="text-sm font-semibold text-[var(--text-primary)]">{tr('Jonli xarita')}</span>
        <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
          <span
            className={`inline-block w-2 h-2 rounded-full ${isConnected ? 'bg-[#2E9E6B]' : 'bg-[#C0392B]'}`}
          />
          {isConnected ? tr('Ulangan') : tr('Uzilgan')}
        </span>
        <span className="hidden sm:inline text-xs text-[var(--text-muted)] tabular-nums">
          {tr('Faol')}: {aktivlar.length} · {tr('Nuqta')}: {features.length}
        </span>
        <button
          onClick={fetchAktivlar}
          className="btn-ghost !p-1.5 text-[var(--text-muted)]"
          title={tr('Yangilash')}
          aria-label={tr('Yangilash')}
        >
          <RefreshCw size={14} strokeWidth={1.8} />
        </button>

        <span className="w-px h-5 bg-[var(--border)] hidden sm:block" aria-hidden />
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <span className="font-medium">{tr('Holati:')}</span>
          <StatusSelect
            options={Object.entries(STATUS_NOMLARI).map(([value, nomi]) => ({ value, label: nomi }))}
            value={statusFilter}
            onChange={setStatusFilter}
            barchasiLabel={tr('Barchasi')}
            className="select !w-auto !py-1.5 text-sm max-w-[200px]"
          />
        </label>

        <label className="flex items-center gap-2 text-sm text-gray-600">
          <span className="font-medium">{tr('MFY:')}</span>
          <MfySelect
            mfylar={mfylar}
            value={selectedMfyId !== null ? String(selectedMfyId) : ''}
            onChange={handleMfyTanlash}
            barchasiLabel={tr('Tanlang…')}
            className="select !w-auto !py-1.5 text-sm max-w-[380px]"
          />
        </label>

        {/* Rang legendasi */}
        <div className="ml-auto hidden md:flex items-center gap-3 text-xs text-gray-500">
          {Object.entries(STATUS_NOMLARI).map(([value, nomi]) => (
            <span key={value} className="flex items-center gap-1">
              <span
                className="inline-block w-2.5 h-2.5 rounded-full"
                style={{ background: STATUS_RANGLARI[value] }}
              />
              {nomi}
            </span>
          ))}
        </div>
      </div>

      {/* Xarita + panellar */}
      <div
        className="relative flex-1 rounded-xl overflow-hidden border border-gray-200 shadow-sm"
        style={{ minHeight: 320 }}
      >
        {loading ? (
          <div className="flex items-center justify-center h-full bg-gray-900">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600" />
          </div>
        ) : (
          <MapContainer
            ref={mapRef}
            center={DEFAULT_CENTER}
            zoom={13}
            style={{ width: '100%', height: '100%' }}
            className="xarita-map"
            scrollWheelZoom
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            />
            <BboxKuzatuvchi onMove={handleBounds} />
            <XaritaOlchemi />
            <MfyQatlami mfylar={mfylar} tanlanganId={selectedMfyId} />
            <MuammoQatlami features={features} />
            <XodimQatlami aktivlar={aktivlar} pulsingIds={pulsingIds} />
            {selectedMfyId !== null &&
              (() => {
                const mfy = mfylar.find((m) => m.id === selectedMfyId);
                return mfy ? <TanlanganMfyMarker mfy={mfy} /> : null;
              })()}
          </MapContainer>
        )}

        {/* Chap panel — faol xodimlar (yig'iladigan) */}
        {chapOchiq ? (
          <div className="absolute left-3 top-3 bottom-3 w-[300px] max-w-[calc(100%-24px)] z-[1001] card flex flex-col overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <Users size={15} strokeWidth={1.8} className="text-gray-500" />
                {tr('Faol xodimlar')}
              </h2>
              <div className="flex items-center gap-1.5">
                <span className="badge-blue">{aktivlar.length}</span>
                <button
                  onClick={() => setChapOchiq(false)}
                  className="btn-ghost !p-1 text-gray-400 hover:text-gray-700"
                  title={tr("Yig'ish")}
                  aria-label={tr("Panelni yig'ish")}
                >
                  <ChevronLeft size={15} strokeWidth={2} />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {saralanganAktivlar.length === 0 ? (
                <p className="px-4 py-6 text-sm text-gray-400 text-center">
                    {tr("Hozircha faol xodim yo'q")}
                </p>
              ) : (
                saralanganAktivlar.map((x) => (
                  <button
                    key={x.xodim_id}
                    onClick={() => flyToXodim(x)}
                    className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-gray-50 text-left transition-colors"
                  >
                    {x.profil_foto_url ? (
                      <img
                        src={x.profil_foto_url}
                        alt=""
                        className="w-9 h-9 rounded-full object-cover flex-shrink-0"
                        style={{ border: `2px solid ${batareyaRangi(x.batareya)}` }}
                      />
                    ) : (
                      <span
                        className="w-9 h-9 rounded-full bg-gray-800 text-white flex items-center justify-center text-xs font-bold flex-shrink-0"
                        style={{ border: `2px solid ${batareyaRangi(x.batareya)}` }}
                      >
                        {boshHarflar(tr(x.xodim_fio))}
                      </span>
                    )}
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-gray-900 truncate">
                        {tr(x.xodim_fio)}
                      </span>
                      <span className="block text-xs text-gray-500">
                        {vaqtOldin(x.ohirgi_vaqt)}
                        {x.batareya !== null && ` · 🔋 ${x.batareya}%`}
                      </span>
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        ) : (
          <button
            onClick={() => setChapOchiq(true)}
            className="absolute left-3 top-3 z-[1001] card !p-2.5 flex items-center gap-2 text-gray-600 hover:text-gray-900"
            title={tr("Faol xodimlar panelini ochish")}
            aria-label={tr("Faol xodimlar panelini ochish")}
          >
            <Users size={16} strokeWidth={1.8} />
            <span className="text-xs font-semibold tabular-nums">{aktivlar.length}</span>
            <ChevronRight size={14} strokeWidth={2} />
          </button>
        )}

        {/* O'ng panel — hodisalar oqimi (yig'iladigan) */}
        {ongOchiq ? (
          <div className="absolute right-3 top-3 bottom-3 w-[300px] max-w-[calc(100%-24px)] z-[1001] card flex-col overflow-hidden hidden lg:flex">
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <Activity size={15} strokeWidth={1.8} className="text-gray-500" />
                {tr('Hodisalar oqimi')}
              </h2>
              <button
                onClick={() => setOngOchiq(false)}
                className="btn-ghost !p-1 text-gray-400 hover:text-gray-700"
                title={tr("Yig'ish")}
                aria-label={tr("Panelni yig'ish")}
              >
                <ChevronRight size={15} strokeWidth={2} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {hodisalar.length === 0 ? (
                <p className="px-4 py-6 text-sm text-gray-400 text-center">
                    {tr("Hozircha hodisa yo'q")}
                </p>
              ) : (
                hodisalar.map((h) => (
                  <div
                    key={h.id}
                    className="xarita-hodisa px-4 py-2.5 border-b border-gray-100 flex items-start gap-2"
                  >
                    <span className="text-sm flex-shrink-0">
                      {HODISA_IKONLARI[h.turi] ?? '🔔'}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-xs text-gray-800 leading-snug">
                        {h.matn}
                      </span>
                      <span className="block text-[11px] text-gray-400 mt-0.5">
                        {h.vaqt.toLocaleTimeString('uz-UZ')}
                      </span>
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          <button
            onClick={() => setOngOchiq(true)}
            className="absolute right-3 top-3 z-[1001] card !p-2.5 hidden lg:flex items-center gap-2 text-gray-600 hover:text-gray-900"
            title={tr("Hodisalar panelini ochish")}
            aria-label={tr("Hodisalar panelini ochish")}
          >
            <ChevronLeft size={14} strokeWidth={2} />
            <Activity size={16} strokeWidth={1.8} />
          </button>
        )}
      </div>
    </div>
  );
}

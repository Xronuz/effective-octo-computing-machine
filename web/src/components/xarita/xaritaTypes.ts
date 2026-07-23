// XAVFSIZ XONADON — Xarita sahifasi uchun umumiy tiplar va konstantalar

import type { AktivXodim } from '@/types';

/** WS/REST dan keladigan xodim — profil_foto_url backend qo'shishi mumkin */
export interface XaritaXodim extends AktivXodim {
  profil_foto_url?: string | null;
}

/** GeoJSON geometriya (backend /mfylar chegara maydoni — ko'pincha NULL) */
export interface GeoJsonPolygon {
  type: 'Polygon';
  coordinates: number[][][];
}
export interface GeoJsonMultiPolygon {
  type: 'MultiPolygon';
  coordinates: number[][][][];
}

/** GET /api/mfylar elementi (chegara hozircha qaytarilmaydi, lekin qo'llab-quvvatlanadi) */
export interface MfyXarita {
  id: number;
  raqami: number;
  nomi: string;
  markaz_lat: number | null;
  markaz_lng: number | null;
  xonadon_soni: number;
  kochalar_soni?: number;
  chegara?: GeoJsonPolygon | GeoJsonMultiPolygon | null;
}

/** GET /api/muammolar/xarita — GeoJSON Feature */
export interface MuammoFeatureProps {
  id: number;
  turi: string | null;
  status: string | null;
  xavf: string | null;
  shubhali: boolean;
}
export interface MuammoFeature {
  type: 'Feature';
  geometry: { type: 'Point'; coordinates: [number, number] }; // [lng, lat]
  properties: MuammoFeatureProps;
}

/** O'ng paneldagi real-time hodisa */
export interface XaritaHodisa {
  id: number;
  vaqt: Date;
  turi: string; // ws type
  matn: string;
}

export const STATUS_RANGLARI: Record<string, string> = {
  ochiq: '#4C7DBF',
  jarayonda: '#D9A441',
  yopilgan: '#2E9E6B',
  muddati_otgan: '#C0392B',
};

export const SHUBHALI_RANG = '#8E44AD';

export const STATUS_NOMLARI: Record<string, string> = {
  ochiq: 'Ochiq',
  jarayonda: 'Jarayonda',
  yopilgan: 'Yopilgan',
  muddati_otgan: 'Muddati o\'tgan',
};

export const TURI_NOMLARI: Record<string, string> = {
  ochiq_elektr_simi: 'Ochiq elektr simi',
  elektr_shchit_nosoz: 'Elektr shchit nosozligi',
  gaz_shlangi_nosoz: 'Gaz shlangi nosozligi',
  gaz_hidi: 'Gaz hidi',
  isitish_uskunasi: 'Isitish uskunasi nosozligi',
  mo_ri_tozalanmagan: "Mo'ri tozalanmagan",
  ot_ochirgich_yoq: "O't o'chirgich yo'q",
  evakuatsiya_yoli_yopiq: "Evakuatsiya yo'li yopiq",
  boshqa: 'Boshqa',
};

/** "5 daqiqa oldin" ko'rinishida */
export function vaqtOldin(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1) return 'hozirgina';
  if (min < 60) return `${min} daqiqa oldin`;
  const soat = Math.floor(min / 60);
  if (soat < 24) return `${soat} soat oldin`;
  return `${Math.floor(soat / 24)} kun oldin`;
}

/** FIO dan bosh harflar: "Palonchiyev Pismo" → "PP" */
export function boshHarflar(fio: string): string {
  const harflar = fio
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? '')
    .join('');
  return harflar || '—';
}

export function batareyaRangi(level: number | null): string {
  if (level === null) return '#6b7280';
  if (level > 50) return '#22c55e';
  if (level > 20) return '#eab308';
  return '#ef4444';
}

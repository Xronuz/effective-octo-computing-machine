// Offline-first ma'lumotlar keshi: SQLite orqali tezkor, tarmoqsiz o'qish
// Generic setCacheItem / getCacheItem dan foydalanadi.

import { getCacheItem, setCacheItem, removeCacheItem, clearCache, type CachedItem } from './db';
import type { MfyBrief, KochaBrief, XonadonSummary, MuammoSummary } from '../types';

// ── Cache kalitlari ─────────────────────────────────────
const KEYS = {
  mfylar: 'mfylar',
  kochalar: (mfyId: number) => `kochalar:${mfyId}`,
  xonadonlar: 'xonadonlar',
  muammolar: 'muammolar',
  topshiriqlar: 'topshiriqlar',
} as const;

// ── MFY ─────────────────────────────────────────────────
export async function cacheMfylar(data: MfyBrief[]): Promise<void> {
  await setCacheItem<CachedItem<MfyBrief[]>>(KEYS.mfylar, {
    key: KEYS.mfylar,
    data,
    updatedAt: new Date().toISOString(),
  });
}

export async function getCacheMfylar(): Promise<MfyBrief[] | null> {
  const item = await getCacheItem<CachedItem<MfyBrief[]>>(KEYS.mfylar);
  return item?.data ?? null;
}

// ── Ko'chalar ───────────────────────────────────────────
export async function cacheKochalar(mfyId: number, data: KochaBrief[]): Promise<void> {
  const key = KEYS.kochalar(mfyId);
  await setCacheItem<CachedItem<KochaBrief[]>>(key, {
    key,
    data,
    updatedAt: new Date().toISOString(),
  });
}

export async function getCacheKochalar(mfyId: number): Promise<KochaBrief[] | null> {
  const item = await getCacheItem<CachedItem<KochaBrief[]>>(KEYS.kochalar(mfyId));
  return item?.data ?? null;
}

// ── Xonadonlar ──────────────────────────────────────────
const xonadonlarKey = (kochaId?: number) =>
  kochaId ? `xonadonlar:kocha:${kochaId}` : KEYS.xonadonlar;

export async function cacheXonadonlar(data: XonadonSummary[], kochaId?: number): Promise<void> {
  const key = xonadonlarKey(kochaId);
  await setCacheItem<CachedItem<XonadonSummary[]>>(key, {
    key,
    data,
    updatedAt: new Date().toISOString(),
  });
}

export async function getCacheXonadonlar(kochaId?: number): Promise<XonadonSummary[] | null> {
  const item = await getCacheItem<CachedItem<XonadonSummary[]>>(xonadonlarKey(kochaId));
  return item?.data ?? null;
}

// ── Muammolar (ochiq muammolar ro'yxati) ────────────────
const muammolarKey = (xonadonId?: number) =>
  xonadonId ? `muammolar:xonadon:${xonadonId}` : KEYS.muammolar;

export async function cacheMuammolar(data: MuammoSummary[], xonadonId?: number): Promise<void> {
  const key = muammolarKey(xonadonId);
  await setCacheItem<CachedItem<MuammoSummary[]>>(key, {
    key,
    data,
    updatedAt: new Date().toISOString(),
  });
}

export async function getCacheMuammolar(xonadonId?: number): Promise<MuammoSummary[] | null> {
  const item = await getCacheItem<CachedItem<MuammoSummary[]>>(muammolarKey(xonadonId));
  return item?.data ?? null;
}

// ── Topshiriqlar (generic, chunki hali alohida turi yo'q) ─
export async function cacheTopshiriqlar<T>(data: T[]): Promise<void> {
  await setCacheItem<CachedItem<T[]>>(KEYS.topshiriqlar, {
    key: KEYS.topshiriqlar,
    data,
    updatedAt: new Date().toISOString(),
  });
}

export async function getCacheTopshiriqlar<T>(): Promise<T[] | null> {
  const item = await getCacheItem<CachedItem<T[]>>(KEYS.topshiriqlar);
  return item?.data ?? null;
}

// ── Yordamchi funksiyalar ───────────────────────────────
export async function removeKochaCache(mfyId: number): Promise<void> {
  await removeCacheItem(KEYS.kochalar(mfyId));
}

export async function removeXonadonlarCache(): Promise<void> {
  await removeCacheItem(KEYS.xonadonlar);
}

export { clearCache as clearAllDataCache };

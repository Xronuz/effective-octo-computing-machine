// Offline-first sinxronizatsiya xizmati
// Yagona navbat manbai — src/services/db.ts (SQLite, muammo_navbat jadvali)

import NetInfo from '@react-native-community/netinfo';
import { isAxiosError } from 'axios';
import api from './api';
import {
  getNavbatYozuvlari,
  getKutilmaganSoni,
  setNavbatStatus,
  urinishniQaydEt,
  urinishniTozalash,
  type NavbatYozuvi,
} from './db';
import { getLastSync, setLastSync } from './storage';
import type { ApiResponse, MuammoSummary } from '../types';
import { flushPendingLocations } from './location';

// Exponential backoff: urinishlar soniga qarab keyingi urinish kechikishi
const BACKOFF_MS = [5_000, 15_000, 60_000, 300_000];

export interface SyncProgress {
  total: number;
  processed: number;
  failed: number;
}

export interface SyncStatus {
  syncing: boolean;
  pendingCount: number;
  lastSync: string | null;
  progress: SyncProgress | null;
}

type SyncCallback = (status: SyncStatus) => void;
let onStatusChange: SyncCallback | null = null;

export function setSyncCallback(cb: SyncCallback): void {
  onStatusChange = cb;
}

async function notifyStatus(syncing: boolean, progress: SyncProgress | null = null): Promise<void> {
  onStatusChange?.({
    syncing,
    pendingCount: await getKutilmaganSoni(),
    lastSync: await getLastSyncTime(),
    progress,
  });
}

export async function getLastSyncTime(): Promise<string | null> {
  return getLastSync();
}

async function setLastSyncTime(): Promise<void> {
  const now = new Date().toLocaleString('uz-UZ');
  await setLastSync(now);
}

interface UploadFotoJavob {
  fayl_yoli: string;
  sha256: string;
  olcham_byte: number;
  exif_lat: number | null;
  exif_lng: number | null;
  exif_vaqt: string | null;
}

// Xato xabarini axios javobidan ajratib olish
function xatoXabari(err: unknown): string {
  if (isAxiosError(err)) {
    const data = err.response?.data as { xato?: string; detail?: string } | undefined;
    return data?.xato || data?.detail || err.message;
  }
  return err instanceof Error ? err.message : "Noma'lum xatolik";
}

// 4xx (422 kabi validatsiya xatolari) — qayta urinib bo'lmaydigan xato
function qaytaribBolmasXato(err: unknown): boolean {
  if (!isAxiosError(err) || !err.response) return false;
  const s = err.response.status;
  return s >= 400 && s < 500 && s !== 408 && s !== 429;
}

async function fotoYukla(faylYoli: string): Promise<UploadFotoJavob> {
  const form = new FormData();
  const name = faylYoli.split('/').pop() || 'foto.jpg';
  form.append('file', { uri: faylYoli, name, type: 'image/jpeg' } as unknown as Blob);

  const { data } = await api.post<ApiResponse<UploadFotoJavob>>('/upload/foto', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 60_000,
  });
  if (!data.ok || !data.data) throw new Error(data.xato || 'Foto yuklashda xatolik');
  return data.data;
}

// Bitta navbat yozuvini backend oqimi bo'yicha yuborish:
// 1) POST /api/muammolar (client_uuid — idempotent, dublikat ham muvaffaqiyat)
// 2) har bir foto uchun POST /api/upload/foto (multipart)
// 3) POST /api/muammolar/{id}/fotolar — bog'lash
async function yozuvniYubor(y: NavbatYozuvi): Promise<void> {
  const { data } = await api.post<ApiResponse<MuammoSummary & { dublikat?: boolean }>>(
    '/muammolar',
    {
      xonadon_id: y.xonadon_id,
      turi: y.turi,
      tavsif: y.tavsif,
      xavf: y.xavf,
      lat: y.lat,
      lng: y.lng,
      gps_aniqlik: y.gps_aniqlik,
      mock_gps: y.mock_gps,
      client_uuid: y.client_uuid,
      qurilma_vaqti: y.yaratilgan,
      ornida_bartaraf: y.ornida_bartaraf,
      muddat: y.ornida_bartaraf ? null : y.muddat,
      has_keyin_foto: y.ornida_bartaraf && y.foto_paths.length > 0,
      taklif_etilgan_tadbirlar: y.taklif_etilgan_tadbirlar,
      // Backend endi bu maydonni majburiy deb talab qiladi — eski
      // navbatga tushib qolgan (yangilanishdan oldingi) yozuvlarda bo'sh
      // bo'lishi mumkin, shuning uchun zaxira qiymat beriladi.
      yoriqnomadan_otkanlar_soni: y.yoriqnomadan_otkanlar_soni ?? 0,
      // Eski (yangilanishdan oldingi) navbat yozuvlarida bu maydon bo'lmagan —
      // zaxira qiymat `false`.
      kira_olmadi: y.kira_olmadi ?? false,
    },
  );
  // dublikat: true — backend'da client_uuid bilan yozuv allaqachon bor, id sini olamiz
  if (!data.ok || !data.data?.id) throw new Error(data.xato || 'Muammo yaratishda xatolik');
  const muammoId = data.data.id;

  if (y.foto_paths.length > 0) {
    const fotolar: UploadFotoJavob[] = [];
    for (const path of y.foto_paths) {
      fotolar.push(await fotoYukla(path));
    }
    const { data: boglash } = await api.post<ApiResponse<unknown>>(
      `/muammolar/${muammoId}/fotolar`,
      {
        fotolar: fotolar.map((f) => ({
          fayl_yoli: f.fayl_yoli,
          sha256: f.sha256,
          exif_lat: f.exif_lat,
          exif_lng: f.exif_lng,
          exif_vaqt: f.exif_vaqt,
          olcham_byte: f.olcham_byte,
        })),
      },
    );
    if (!boglash.ok) throw new Error(boglash.xato || "Fotolarni bog'lashda xatolik");
  }
}

let syncing = false;

export async function syncNow(): Promise<{ yuborildi: number; xato: number }> {
  if (syncing) return { yuborildi: 0, xato: 0 };

  // NetInfo holatiga UMUMAN tayanmaymiz — ba'zi qurilma/tarmoqlarda
  // (shu jumladan `isConnected`ning o'zi ham) internet aslida ishlayotgan
  // bo'lsa ham noto'g'ri "false" qaytarishi kuzatildi, bu esa sinxronlashni
  // butunlay to'xtatib qo'yardi (navbat cheksiz o'sib borardi). Endi doim
  // urinamiz — haqiqiy tarmoq xatosi bo'lsa, so'rovning o'zi xato beradi va
  // pastdagi backoff logikasi ishlaydi.
  syncing = true;
  await notifyStatus(true);

  let yuborildi = 0;
  let xato = 0;

  try {
    let yozuvlar: NavbatYozuvi[] = [];
    try {
      yozuvlar = await getNavbatYozuvlari();
    } catch {
      // SQLite ishga tushmaganda/yozuvlar olinmaganda navbatni bo'sh deb hisoblaymiz
      return { yuborildi: 0, xato: 0 };
    }

    const hozir = Date.now();
    const kutilmoqda = yozuvlar.filter(
      (y) =>
        y.status === 'kutilmoqda' &&
        (!y.keyingi_urinish || new Date(y.keyingi_urinish).getTime() <= hozir),
    );
    const total = kutilmoqda.length;
    let processed = 0;
    let failed = 0;

    for (const y of kutilmoqda) {
      try {
        await yozuvniYubor(y);
        await setNavbatStatus(y.client_uuid, 'yuborilgan');
        await urinishniTozalash(y.client_uuid);
        yuborildi++;
        processed++;
      } catch (err) {
        if (qaytaribBolmasXato(err)) {
          // 4xx — ma'lumot noto'g'ri, qayta urinmaysiz: 'xato' statusga o'tkazamiz
          await setNavbatStatus(y.client_uuid, 'xato', xatoXabari(err));
          xato++;
          failed++;
        } else {
          // 5xx / timeout / tarmoq — 'kutilmoqda' qoladi, exponential backoff
          const kechikish = BACKOFF_MS[Math.min(y.urinishlar_soni, BACKOFF_MS.length - 1)];
          await urinishniQaydEt(y.client_uuid, new Date(Date.now() + kechikish).toISOString());
          xato++;
          failed++;
        }
      }
      await notifyStatus(true, { total, processed, failed });
    }

    await setLastSyncTime();
    return { yuborildi, xato };
  } finally {
    syncing = false;
    await notifyStatus(false);
  }
}

let autoSyncStarted = false;

export function setupAutoSync(): void {
  if (autoSyncStarted) return;
  autoSyncStarted = true;

  // Tarmoq holati o'zgarganda darhol urinib ko'ramiz (muammolar + to'plangan
  // GPS nuqtalar) — `isConnected` qiymatiga shart qo'ymaymiz, chunki u ham
  // ba'zan ishonchsiz (yuqoridagi izohga qarang). Haqiqatda oflayn bo'lsa,
  // so'rovning o'zi xato beradi.
  NetInfo.addEventListener(() => {
    syncNow();
    flushPendingLocations().catch(() => {});
  });

  // 30 soniyalik davriy sinxronlash
  setInterval(() => {
    syncNow();
    flushPendingLocations().catch(() => {});
  }, 30_000);

  // Dastur ochilganda birinchi urinish
  syncNow();
  flushPendingLocations().catch(() => {});
}

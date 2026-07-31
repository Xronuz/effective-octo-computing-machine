// Muammo rasmlarini lokal saqlash va offline ko'rish xizmati
// Expo SDK 54 / expo-file-system ~19 — yangi FileSystem.Directory/File API
// Metadata SQLite o'rniga faqat fayl tizimida saqlanadi (expo-sqlite prepareAsync muammosi oldini olinadi).

import * as FileSystem from 'expo-file-system';
import { ENV } from '../config/env';
import type { MuammoSummary, FotoResponse } from '../types';

const fotoDir = new FileSystem.Directory(FileSystem.Paths.document, 'fotolar');

function fotoFileName(faylYoli: string): string {
  const parts = faylYoli.split('/');
  return parts[parts.length - 1] || `foto_${Date.now()}.jpg`;
}

function remoteFotoUrl(faylYoli: string): string {
  if (faylYoli.startsWith('http')) return faylYoli;
  return `${ENV.API_URL.replace(/\/$/, '')}/${faylYoli.replace(/^\//, '')}`;
}

function fotoFile(foto: FotoResponse): FileSystem.File {
  return new FileSystem.File(fotoDir, fotoFileName(foto.fayl_yoli));
}

function localFile(faylYoli: string): FileSystem.File {
  return new FileSystem.File(fotoDir, fotoFileName(faylYoli));
}

async function ensureDir(): Promise<void> {
  await fotoDir.create({ intermediates: true });
}

/**
 * Bitta rasmni lokalga yuklaydi.
 * @returns lokal fayl yo'li yoki null (xatolikda).
 */
export async function downloadFoto(_muammoId: number, foto: FotoResponse): Promise<string | null> {
  try {
    await ensureDir();
    const file = fotoFile(foto);
    const info = await file.info();
    if (!info.exists) {
      await FileSystem.File.downloadFileAsync(remoteFotoUrl(foto.fayl_yoli), file, {
        idempotent: true,
      });
    }
    return file.uri;
  } catch (err) {
    console.warn('Foto yuklashda xatolik:', foto.fayl_yoli, err);
    return null;
  }
}

/**
 * Muammo uchun barcha rasmlarni lokalga yuklaydi.
 */
export async function downloadMuammoFotolar(muammo: MuammoSummary): Promise<void> {
  if (!muammo.fotolar || muammo.fotolar.length === 0) return;
  await Promise.all(muammo.fotolar.map((f) => downloadFoto(muammo.id, f)));
}

/**
 * Bir nechta muammolarning rasmlarini fonda yuklaydi (offline uchun isitish).
 */
export async function warmFotoCache(muammolar: MuammoSummary[]): Promise<void> {
  await Promise.all(muammolar.map((m) => downloadMuammoFotolar(m)));
}

/**
 * Offline ko'rish uchun lokal rasm yo'lini qaytaradi.
 * Agar lokal nusxa mavjud bo'lmasa, remote URL qaytariladi.
 */
export async function resolveFotoSource(_muammoId: number, faylYoli: string): Promise<string> {
  const file = localFile(faylYoli);
  const info = await file.info();
  if (info.exists) return file.uri;
  return remoteFotoUrl(faylYoli);
}

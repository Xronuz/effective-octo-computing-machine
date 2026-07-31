/**
 * XAVFSIZ XONADON — Background GPS kuzatuv servisi.
 *
 * ULASH (boshqa agent qiladi):
 * - Login muvaffaqiyatli bo'lgach (xodim roli uchun) AuthContext ichida
 *   `startTracking()` chaqiriladi, logout'da esa `stopTracking()`.
 * - App.tsx yoki sync servisi ilova ochilganda `flushPendingLocations()` ni
 *   chaqirishi mumkin — tarmoq paydo bo'lganda yig'ilib qolgan nuqtalar ketadi.
 *
 * Ish vaqti filtri: Asia/Tashkent 09:00–18:00. Toshkent doimiy UTC+5
 * (yozgi vaqtga o'tish yo'q), shuning uchun oddiy UTC+5 siljitish kifoya.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Battery from 'expo-battery';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import api from './api';

export const LOCATION_TASK_NAME = 'xavfsiz-xonadon-background-location';

// AsyncStorage kaliti — SecureStore emas, chunki navbat 2048 baytdan oshishi mumkin
const PENDING_KEY = 'pending_location_points';

// Backend batch limiti: POST /api/lokatsiya/batch max 500 nuqta
const BATCH_SIZE = 500;
// Navbat shu songa yetganda darhol yuborishga uriniladi
const FLUSH_THRESHOLD = 10;
// Tarmoq uzoq muddat bo'lmasa navbat cheksiz o'sib ketmasligi uchun cheksiz emas
const MAX_PENDING = 5000;

// Backend schema: app/schemas/lokatsiya.py → LokatsiyaKiruvchi
export interface LocationPoint {
  lat: number;
  lng: number;
  aniqlik: number | null;
  tezlik: number | null;
  batareya: number | null;
  mock_gps: boolean;
  qurilma_vaqti: string; // ISO 8601
}

/** Asia/Tashkent (doimiy UTC+5) bo'yicha hozirgi soat — 0..23. */
function getTashkentHour(date: Date = new Date()): number {
  const tashkentMillis = date.getTime() + 5 * 60 * 60 * 1000;
  return new Date(tashkentMillis).getUTCHours();
}

/** Ish vaqti: 09:00–18:00 Toshkent vaqti bilan (18:00 kirmaydi). */
export function isWorkHours(date: Date = new Date()): boolean {
  const hour = getTashkentHour(date);
  return hour >= 9 && hour < 18;
}

async function readPending(): Promise<LocationPoint[]> {
  try {
    const raw = await AsyncStorage.getItem(PENDING_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as LocationPoint[]) : [];
  } catch (err) {
    console.warn("Lokatsiya navbatini o'qishda xato:", err);
    return [];
  }
}

async function writePending(points: LocationPoint[]): Promise<void> {
  try {
    if (points.length === 0) {
      await AsyncStorage.removeItem(PENDING_KEY);
    } else {
      await AsyncStorage.setItem(PENDING_KEY, JSON.stringify(points));
    }
  } catch (err) {
    console.warn('Lokatsiya navbatini yozishda xato:', err);
  }
}

async function appendPending(newPoints: LocationPoint[]): Promise<void> {
  const existing = await readPending();
  let merged = existing.concat(newPoints);
  // Chegaradan oshsa eng eski nuqtalar tashlab yuboriladi
  if (merged.length > MAX_PENDING) {
    merged = merged.slice(merged.length - MAX_PENDING);
  }
  await writePending(merged);
}

async function getBatteryPercent(): Promise<number | null> {
  try {
    const level = await Battery.getBatteryLevelAsync(); // 0..1 yoki -1 (noma'lum)
    if (level < 0) return null;
    return Math.round(level * 100);
  } catch {
    return null;
  }
}

/**
 * Navbatdagi nuqtalarni backendga batch qilib yuborish.
 * Har bir so'rov max 500 nuqta; muvaffaqiyatsiz bo'lsa nuqtalar navbatda qoladi.
 */
export async function flushPendingLocations(): Promise<void> {
  const pending = await readPending();
  if (pending.length === 0) return;

  let sent = 0;
  try {
    while (sent < pending.length) {
      const chunk = pending.slice(sent, sent + BATCH_SIZE);
      await api.post('/lokatsiya/batch', { items: chunk });
      sent += chunk.length;
    }
  } catch (err) {
    console.warn('Lokatsiya batch yuborishda xato, nuqtalar navbatda qoladi:', err);
  } finally {
    // Yuborilgan nuqtalarni navbatdan o'chirish, qolgani keyingi batchga qo'shiladi.
    // E'tibor bering: flush davomida yangi nuqtalar qo'shilgan bo'lishi mumkin —
    // shuning uchun joriy navbatni qayta o'qib, faqat yuborilganlarni ayiramiz.
    const current = await readPending();
    const remaining = current.slice(sent);
    await writePending(remaining);
  }
}

// TaskManager task modul darajasida (ilova yuklanishidan oldin) aniqlanishi shart
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.warn('Background lokatsiya task xatosi:', error);
    return;
  }
  const { locations } = (data ?? {}) as { locations?: Location.LocationObject[] };
  if (!locations || locations.length === 0) return;

  // Ish vaqtidan tashqarida kuzatuvni to'xtatamiz — batareya tejaladi,
  // nuqtalar esa saqlanmaydi ham (server ham rad etadi).
  if (!isWorkHours()) {
    try {
      await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
    } catch (err) {
      console.warn("Lokatsiya kuzatuvini to'xtatishda xato:", err);
    }
    return;
  }

  const battery = await getBatteryPercent();
  const points: LocationPoint[] = locations.map((loc) => ({
    lat: loc.coords.latitude,
    lng: loc.coords.longitude,
    aniqlik: loc.coords.accuracy ?? null,
    tezlik: loc.coords.speed != null && loc.coords.speed >= 0 ? loc.coords.speed : null,
    batareya: battery,
    mock_gps: loc.mocked ?? false,
    qurilma_vaqti: new Date(loc.timestamp).toISOString(),
  }));

  await appendPending(points);

  const count = await getPendingLocationCount();
  if (count >= FLUSH_THRESHOLD) {
    await flushPendingLocations();
  }
});

/** Kuzatuv hozir faolmi. */
export async function isTracking(): Promise<boolean> {
  try {
    return await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
  } catch {
    return false;
  }
}

/**
 * Background GPS kuzatuvni ishga tushirish.
 * Login'dan keyin xodim uchun AuthContext'dan chaqiriladi.
 * Ish vaqtidan tashqarida boshlanmaydi (soat 09:00–18:00 Toshkent).
 */
export async function startTracking(): Promise<boolean> {
  try {
    if (!isWorkHours()) {
      return false;
    }

    const foreground = await Location.requestForegroundPermissionsAsync();
    if (foreground.status !== 'granted') {
      console.warn('Lokatsiya (foreground) ruxsati berilmadi');
      return false;
    }
    const background = await Location.requestBackgroundPermissionsAsync();
    if (background.status !== 'granted') {
      console.warn('Lokatsiya (background) ruxsati berilmadi');
      return false;
    }

    if (await isTracking()) {
      return true;
    }

    // Batareya tejash (TZ): Balanced aniqlik, 60s interval, 30m masofa
    await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: 60000,
      distanceInterval: 30,
      // Android'da background kuzatuv foreground service orqali ishlaydi
      foregroundService: {
        notificationTitle: 'Xavfsiz Xonadon',
        notificationBody: 'Ish vaqtida joylashuvingiz kuzatilmoqda',
        notificationColor: '#0A1E3C',
      },
    });
    return true;
  } catch (err) {
    console.warn('Lokatsiya kuzatuvini boshlashda xato:', err);
    return false;
  }
}

/**
 * Background GPS kuzatuvni to'xtatish.
 * Logout'da AuthContext'dan chaqiriladi.
 */
export async function stopTracking(): Promise<void> {
  try {
    if (await isTracking()) {
      await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
    }
  } catch (err) {
    console.warn("Lokatsiya kuzatuvini to'xtatishda xato:", err);
  }
}

/** Hali backendga yuborilmagan nuqtalar soni (UI indikator uchun). */
export async function getPendingLocationCount(): Promise<number> {
  const pending = await readPending();
  return pending.length;
}

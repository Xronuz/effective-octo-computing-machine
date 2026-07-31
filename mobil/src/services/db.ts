// Offline-first SQLite database layer for XAVFSIZ XONADON mobil ilovasi
// Yagona navbat manbai: muammolar avval shu yerga yoziladi, sync.ts yuboradi

import * as SQLite from 'expo-sqlite';

export type NavbatStatus = 'kutilmoqda' | 'yuborilgan' | 'xato';

export interface NavbatYozuvi {
  client_uuid: string;
  xonadon_id: number;
  /** Checklist oqimida (yo'riqnoma bandlari orqali) tekshiruvlarda bo'sh bo'ladi. */
  turi: string | null;
  xavf: string;
  tavsif: string;
  lat: number;
  lng: number;
  gps_aniqlik: number;
  mock_gps: boolean;
  ornida_bartaraf: boolean;
  muddat: string | null; // YYYY-MM-DD
  taklif_etilgan_tadbirlar: string | null;
  yoriqnomadan_otkanlar_soni: number | null;
  /** Xodim xonadonga kira olmadi (uyda hech kim yo'q/eshik ochilmadi). */
  kira_olmadi: boolean;
  foto_paths: string[];
  status: NavbatStatus;
  urinishlar_soni: number;
  xato: string | null;
  yaratilgan: string; // ISO vaqt — backend'ga qurilma_vaqti sifatida ketadi
  keyingi_urinish?: string | null; // exponential backoff uchun ISO vaqt
}

export interface CachedItem<T> {
  key: string;
  data: T;
  updatedAt: string;
}

let db: SQLite.SQLiteDatabase | null = null;
let initPromise: Promise<void> | null = null;

export async function initDB(): Promise<void> {
  if (db) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const database = await SQLite.openDatabaseAsync('xavfsiz_xonadon.db');

    await database.execAsync(`
    CREATE TABLE IF NOT EXISTS muammo_navbat (
      client_uuid TEXT PRIMARY KEY,
      xonadon_id INTEGER NOT NULL,
      turi TEXT NOT NULL,
      xavf TEXT NOT NULL,
      tavsif TEXT NOT NULL,
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      gps_aniqlik REAL DEFAULT 0,
      mock_gps INTEGER DEFAULT 0,
      ornida_bartaraf INTEGER DEFAULT 0,
      muddat TEXT,
      taklif_etilgan_tadbirlar TEXT,
      yoriqnomadan_otkanlar_soni INTEGER,
      kira_olmadi INTEGER DEFAULT 0,
      foto_paths TEXT DEFAULT '[]',
      status TEXT DEFAULT 'kutilmoqda',
      urinishlar_soni INTEGER DEFAULT 0,
      xato TEXT,
      keyingi_urinish TEXT,
      yaratilgan TEXT NOT NULL
    );

    -- Umumiy kesh saqlash jadvali: kalit-qiymat (JSON) shaklida
    CREATE TABLE IF NOT EXISTS cache_store (
      key TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- Eski jadvallarni yangi sxemaga o'tkazish (agar mavjud bo'lsa, o'chiramiz)
    DROP TABLE IF EXISTS cached_xonadonlar;
    DROP TABLE IF EXISTS cached_mfylar;
    DROP TABLE IF EXISTS cached_fotolar;
  `);

    // Eski o'rnatishlarda mavjud jadvalga yangi ustunlarni qo'shish
    // (CREATE TABLE IF NOT EXISTS eski sxemani o'zgartirmaydi).
    for (const alter of [
      'ALTER TABLE muammo_navbat ADD COLUMN taklif_etilgan_tadbirlar TEXT',
      'ALTER TABLE muammo_navbat ADD COLUMN yoriqnomadan_otkanlar_soni INTEGER',
      'ALTER TABLE muammo_navbat ADD COLUMN kira_olmadi INTEGER DEFAULT 0',
    ]) {
      try {
        await database.execAsync(alter);
      } catch {
        // Ustun allaqachon mavjud — e'tiborsiz qoldiriladi
      }
    }

    // Eski o'rnatishlarda `turi TEXT NOT NULL` bo'lishi mumkin — yangi
    // checklist oqimida (muammo turi tanlanmaydi) turi bo'sh (NULL) bo'lishi
    // kerak. SQLite ustunni "NOT NULL"dan chiqarib bo'lmaydi, shuning uchun
    // jadvalni bir martalik qayta quramiz (faqat kerak bo'lsa).
    try {
      const ustunlar = await database.getAllAsync<{ name: string; notnull: number }>(
        'PRAGMA table_info(muammo_navbat)',
      );
      const turiUstuni = ustunlar.find((u) => u.name === 'turi');
      if (turiUstuni && turiUstuni.notnull === 1) {
        await database.execAsync(`
          BEGIN TRANSACTION;
          ALTER TABLE muammo_navbat RENAME TO muammo_navbat_v1;
          CREATE TABLE muammo_navbat (
            client_uuid TEXT PRIMARY KEY,
            xonadon_id INTEGER NOT NULL,
            turi TEXT,
            xavf TEXT NOT NULL,
            tavsif TEXT NOT NULL,
            lat REAL NOT NULL,
            lng REAL NOT NULL,
            gps_aniqlik REAL DEFAULT 0,
            mock_gps INTEGER DEFAULT 0,
            ornida_bartaraf INTEGER DEFAULT 0,
            muddat TEXT,
            taklif_etilgan_tadbirlar TEXT,
            yoriqnomadan_otkanlar_soni INTEGER,
            kira_olmadi INTEGER DEFAULT 0,
            foto_paths TEXT DEFAULT '[]',
            status TEXT DEFAULT 'kutilmoqda',
            urinishlar_soni INTEGER DEFAULT 0,
            xato TEXT,
            keyingi_urinish TEXT,
            yaratilgan TEXT NOT NULL
          );
          INSERT INTO muammo_navbat (client_uuid, xonadon_id, turi, xavf, tavsif, lat, lng,
            gps_aniqlik, mock_gps, ornida_bartaraf, muddat, taklif_etilgan_tadbirlar,
            yoriqnomadan_otkanlar_soni, foto_paths, status, urinishlar_soni, xato,
            keyingi_urinish, yaratilgan)
          SELECT client_uuid, xonadon_id, turi, xavf, tavsif, lat, lng, gps_aniqlik, mock_gps,
            ornida_bartaraf, muddat, taklif_etilgan_tadbirlar, yoriqnomadan_otkanlar_soni,
            foto_paths, status, urinishlar_soni, xato, keyingi_urinish, yaratilgan
          FROM muammo_navbat_v1;
          DROP TABLE muammo_navbat_v1;
          COMMIT;
        `);
      }
    } catch (err) {
      // Rebuild muvaffaqiyatsiz bo'lsa ham ilova ishlashda davom etishi kerak —
      // eski qatorlarda turi baribir to'ldirilgan bo'ladi, faqat yangi
      // checklist-asosli (turi=null) yozuvlar bu holatda saqlanmaydi.
      console.warn('muammo_navbat turi ustunini nullable qilishda xatolik:', err);
    }

    db = database;
  })();

  try {
    await initPromise;
  } finally {
    initPromise = null;
  }
}

async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!db) await initDB();
  if (!db) throw new Error('SQLite bazasi ishga tushirilmadi');
  return db;
}

function assertFinite(value: number, name: string): void {
  if (!Number.isFinite(value)) {
    throw new Error(`${name} noto'g'ri qiymat (NaN yoki cheksiz)`);
  }
}

// ── Generic cache ──────────────────────────────────────

export async function setCacheItem<T>(key: string, data: T): Promise<void> {
  const d = await getDb();
  await d.runAsync('INSERT OR REPLACE INTO cache_store (key, data, updated_at) VALUES (?, ?, ?)', [
    key,
    JSON.stringify(data),
    new Date().toISOString(),
  ]);
}

export async function getCacheItem<T>(key: string): Promise<T | null> {
  const d = await getDb();
  const row = await d.getFirstAsync<{ data: string }>(
    'SELECT data FROM cache_store WHERE key = ?',
    [key],
  );
  if (!row?.data) return null;
  try {
    return JSON.parse(row.data) as T;
  } catch {
    return null;
  }
}

export async function removeCacheItem(key: string): Promise<void> {
  const d = await getDb();
  await d.runAsync('DELETE FROM cache_store WHERE key = ?', [key]);
}

export async function clearCache(): Promise<void> {
  const d = await getDb();
  await d.runAsync("DELETE FROM cache_store WHERE key NOT LIKE 'muammo_%'");
}

// ── Muammo navbati ─────────────────────────────────────

interface NavbatRow {
  client_uuid: string;
  xonadon_id: number;
  turi: string | null;
  xavf: string;
  tavsif: string;
  lat: number;
  lng: number;
  gps_aniqlik: number;
  mock_gps: number;
  ornida_bartaraf: number;
  muddat: string | null;
  taklif_etilgan_tadbirlar: string | null;
  yoriqnomadan_otkanlar_soni: number | null;
  kira_olmadi: number;
  foto_paths: string;
  status: string;
  urinishlar_soni: number;
  xato: string | null;
  keyingi_urinish: string | null;
  yaratilgan: string;
}

function rowToYozuv(r: NavbatRow): NavbatYozuvi {
  return {
    client_uuid: r.client_uuid,
    xonadon_id: r.xonadon_id,
    turi: r.turi,
    xavf: r.xavf,
    tavsif: r.tavsif,
    lat: r.lat,
    lng: r.lng,
    gps_aniqlik: r.gps_aniqlik,
    mock_gps: r.mock_gps === 1,
    ornida_bartaraf: r.ornida_bartaraf === 1,
    muddat: r.muddat,
    taklif_etilgan_tadbirlar: r.taklif_etilgan_tadbirlar,
    yoriqnomadan_otkanlar_soni: r.yoriqnomadan_otkanlar_soni,
    kira_olmadi: r.kira_olmadi === 1,
    foto_paths: JSON.parse(r.foto_paths || '[]'),
    status: r.status as NavbatStatus,
    urinishlar_soni: r.urinishlar_soni,
    xato: r.xato,
    yaratilgan: r.yaratilgan,
    keyingi_urinish: r.keyingi_urinish,
  };
}

export async function muammoniNavbatgaQosh(yozuv: NavbatYozuvi): Promise<void> {
  assertFinite(yozuv.xonadon_id, 'xonadon_id');
  assertFinite(yozuv.lat, 'lat');
  assertFinite(yozuv.lng, 'lng');
  assertFinite(yozuv.gps_aniqlik, 'gps_aniqlik');

  const d = await getDb();
  await d.runAsync(
    `INSERT OR REPLACE INTO muammo_navbat
      (client_uuid, xonadon_id, turi, xavf, tavsif, lat, lng, gps_aniqlik, mock_gps,
       ornida_bartaraf, muddat, taklif_etilgan_tadbirlar, yoriqnomadan_otkanlar_soni,
       kira_olmadi, foto_paths, status, urinishlar_soni, xato, keyingi_urinish, yaratilgan)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      yozuv.client_uuid,
      yozuv.xonadon_id,
      yozuv.turi,
      yozuv.xavf,
      yozuv.tavsif,
      yozuv.lat,
      yozuv.lng,
      yozuv.gps_aniqlik,
      yozuv.mock_gps ? 1 : 0,
      yozuv.ornida_bartaraf ? 1 : 0,
      yozuv.muddat,
      yozuv.taklif_etilgan_tadbirlar,
      yozuv.yoriqnomadan_otkanlar_soni,
      yozuv.kira_olmadi ? 1 : 0,
      JSON.stringify(yozuv.foto_paths),
      yozuv.status,
      yozuv.urinishlar_soni,
      yozuv.xato,
      yozuv.keyingi_urinish ?? null,
      yozuv.yaratilgan,
    ],
  );
}

export async function getNavbatYozuvlari(): Promise<NavbatYozuvi[]> {
  const d = await getDb();
  const rows = await d.getAllAsync<NavbatRow>(
    'SELECT * FROM muammo_navbat ORDER BY yaratilgan ASC',
  );
  return rows.map(rowToYozuv);
}

export async function getKutilmaganSoni(): Promise<number> {
  const d = await getDb();
  const row = await d.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) as count FROM muammo_navbat WHERE status = 'kutilmoqda'",
  );
  return row?.count ?? 0;
}

export async function setNavbatStatus(
  clientUuid: string,
  status: NavbatStatus,
  xato?: string,
): Promise<void> {
  const d = await getDb();
  await d.runAsync('UPDATE muammo_navbat SET status = ?, xato = ? WHERE client_uuid = ?', [
    status,
    xato ?? null,
    clientUuid,
  ]);
}

// Backoff uchun: urinishlar sonini oshirib, keyingi urinish vaqtini belgilash (faqat sync ichida)
export async function urinishniQaydEt(
  clientUuid: string,
  keyingiUrinishIso: string,
): Promise<void> {
  const d = await getDb();
  await d.runAsync(
    'UPDATE muammo_navbat SET urinishlar_soni = urinishlar_soni + 1, keyingi_urinish = ? WHERE client_uuid = ?',
    [keyingiUrinishIso, clientUuid],
  );
}

// Muvaffaqiyatli yuborilganda backoff holatini tozalash
export async function urinishniTozalash(clientUuid: string): Promise<void> {
  const d = await getDb();
  await d.runAsync('UPDATE muammo_navbat SET keyingi_urinish = NULL WHERE client_uuid = ?', [
    clientUuid,
  ]);
}

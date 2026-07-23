// Offline-first SQLite database layer for XAVFSIZ XONADON mobil ilovasi
// Yagona navbat manbai: muammolar avval shu yerga yoziladi, sync.ts yuboradi

import * as SQLite from 'expo-sqlite';

export type NavbatStatus = 'kutilmoqda' | 'yuborilgan' | 'xato';

export interface NavbatYozuvi {
  client_uuid: string;
  xonadon_id: number;
  turi: string;
  xavf: string;
  tavsif: string;
  lat: number;
  lng: number;
  gps_aniqlik: number;
  mock_gps: boolean;
  ornida_bartaraf: boolean;
  muddat: string | null; // YYYY-MM-DD
  foto_paths: string[];
  status: NavbatStatus;
  urinishlar_soni: number;
  xato: string | null;
  yaratilgan: string; // ISO vaqt — backend'ga qurilma_vaqti sifatida ketadi
  keyingi_urinish?: string | null; // exponential backoff uchun ISO vaqt
}

let db: SQLite.SQLiteDatabase | null = null;

export async function initDB(): Promise<void> {
  if (db) return;
  db = await SQLite.openDatabaseAsync('xavfsiz_xonadon.db');

  await db.execAsync(`
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
      foto_paths TEXT DEFAULT '[]',
      status TEXT DEFAULT 'kutilmoqda',
      urinishlar_soni INTEGER DEFAULT 0,
      xato TEXT,
      keyingi_urinish TEXT,
      yaratilgan TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS cached_xonadonlar (
      id INTEGER PRIMARY KEY,
      data TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS cached_mfylar (
      id INTEGER PRIMARY KEY,
      data TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
}

async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!db) await initDB();
  return db!;
}

interface NavbatRow {
  client_uuid: string;
  xonadon_id: number;
  turi: string;
  xavf: string;
  tavsif: string;
  lat: number;
  lng: number;
  gps_aniqlik: number;
  mock_gps: number;
  ornida_bartaraf: number;
  muddat: string | null;
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
    foto_paths: JSON.parse(r.foto_paths || '[]'),
    status: r.status as NavbatStatus,
    urinishlar_soni: r.urinishlar_soni,
    xato: r.xato,
    yaratilgan: r.yaratilgan,
    keyingi_urinish: r.keyingi_urinish,
  };
}

export async function muammoniNavbatgaQosh(yozuv: NavbatYozuvi): Promise<void> {
  const d = await getDb();
  await d.runAsync(
    `INSERT OR REPLACE INTO muammo_navbat
      (client_uuid, xonadon_id, turi, xavf, tavsif, lat, lng, gps_aniqlik, mock_gps,
       ornida_bartaraf, muddat, foto_paths, status, urinishlar_soni, xato, keyingi_urinish, yaratilgan)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
  await d.runAsync(
    'UPDATE muammo_navbat SET status = ?, xato = ? WHERE client_uuid = ?',
    [status, xato ?? null, clientUuid],
  );
}

// Backoff uchun: urinishlar sonini oshirib, keyingi urinish vaqtini belgilash (faqat sync ichida)
export async function urinishniQaydEt(clientUuid: string, keyingiUrinishIso: string): Promise<void> {
  const d = await getDb();
  await d.runAsync(
    'UPDATE muammo_navbat SET urinishlar_soni = urinishlar_soni + 1, keyingi_urinish = ? WHERE client_uuid = ?',
    [keyingiUrinishIso, clientUuid],
  );
}

// Muvaffaqiyatli yuborilganda backoff holatini tozalash
export async function urinishniTozalash(clientUuid: string): Promise<void> {
  const d = await getDb();
  await d.runAsync(
    'UPDATE muammo_navbat SET keyingi_urinish = NULL WHERE client_uuid = ?',
    [clientUuid],
  );
}

export async function cacheXonadonlar(id: number, data: string): Promise<void> {
  const d = await getDb();
  await d.runAsync(
    'INSERT OR REPLACE INTO cached_xonadonlar (id, data, updated_at) VALUES (?, ?, ?)',
    [id, data, new Date().toISOString()],
  );
}

export async function getCachedXonadon(id: number): Promise<string | null> {
  const d = await getDb();
  const row = await d.getFirstAsync<{ data: string }>(
    'SELECT data FROM cached_xonadonlar WHERE id = ?',
    [id],
  );
  return row?.data || null;
}

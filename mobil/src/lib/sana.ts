// Sana yordamchilari.
//
// DIQQAT: `new Date().toISOString().slice(0, 10)` ISHLATMANG — u UTC kunini
// qaytaradi. Toshkent UTC+5 bo'lgani uchun mahalliy 00:00–05:00 oralig'ida
// bu bir kun oldingi sanani beradi va kalendar yorlig'i (mahalliy `getDate()`)
// bilan mos kelmay qoladi.

/** Date obyektidan MAHALLIY kun bo'yicha "YYYY-MM-DD" hosil qiladi. */
export function isoSana(d: Date = new Date()): string {
  const oy = String(d.getMonth() + 1).padStart(2, '0');
  const kun = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${oy}-${kun}`;
}

/** Mahalliy bugungi kun — "YYYY-MM-DD". */
export function bugunIso(): string {
  return isoSana();
}

/** Bugundan `n` kun oldingi sana (n=0 — bugun). */
export function kunOldin(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

/**
 * ISO vaqt satri (masalan `yaratilgan`) qaysi mahalliy kunga tegishli.
 * Satrni kesish o'rniga Date orqali o'giriladi — UTC/mahalliy farqi hisobga olinadi.
 */
export function isoVaqtningKuni(isoVaqt: string): string {
  const d = new Date(isoVaqt);
  return Number.isNaN(d.getTime()) ? '' : isoSana(d);
}

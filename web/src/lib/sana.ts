// XAVFSIZ XONADON — Sana formatlash helperlari (date-fns + o'zbek locale)

import { format } from 'date-fns';
import { uz } from 'date-fns/locale';

/** "10-iyul, 10:15" — sana va vaqt (jadvallar, ro'yxatlar uchun). */
export function sanaVaqt(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return format(d, 'd-MMMM, HH:mm', { locale: uz });
}

/** "10-iyul, 2025" — faqat sana. */
export function faqatSana(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return format(d, 'd-MMMM, yyyy', { locale: uz });
}

// XAVFSIZ XONADON — Skeleton loader komponentlari
// Yangi dizayn tokenlariga mos: .card (radius 20, tintli soya) va
// --bg-subtle / --border asosidagi animate-pulse bloklar.

interface SkeletonProps {
  className?: string;
}

/** Yagona blok — matn qatori, karta, rasm va hokazo uchun. */
export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div
      aria-hidden
      className={`animate-pulse rounded-[var(--radius-inner)] bg-[#e4eaf2] ${className}`}
    />
  );
}

interface SkeletonTableProps {
  rows?: number;
  cols?: number;
  className?: string;
}

/** Jadval ko'rinishidagi skeleton — "card overflow-hidden" ichida ishlatiladi. */
export function SkeletonTable({ rows = 6, cols = 5, className = '' }: SkeletonTableProps) {
  return (
    <div
      role="status"
      aria-label="Yuklanmoqda"
      className={`card overflow-hidden p-0 ${className}`}
    >
      {/* Sarlavha qatori */}
      <div className="flex gap-4 border-b border-[var(--border)] bg-[var(--bg-subtle)] px-4 py-3">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className={`h-3 ${i === 0 ? 'w-10' : 'flex-1'}`} />
        ))}
      </div>
      {/* Qatorlar */}
      <div className="divide-y divide-[var(--border)]">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex items-center gap-4 px-4 py-3.5">
            {Array.from({ length: cols }).map((_, c) => (
              <Skeleton
                key={c}
                className={`h-4 ${c === 0 ? 'w-8' : 'flex-1'} ${c === cols - 1 ? 'max-w-[72px]' : ''}`}
              />
            ))}
          </div>
        ))}
      </div>
      <span className="sr-only">Yuklanmoqda...</span>
    </div>
  );
}

interface SkeletonCardsProps {
  count?: number;
  className?: string;
}

/** Statistika kartalari ko'rinishidagi skeleton (stat-card uslubida). */
export function SkeletonCards({ count = 4, className = '' }: SkeletonCardsProps) {
  return (
    <div
      role="status"
      aria-label="Yuklanmoqda"
      className={`grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 ${className}`}
    >
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card flex animate-pulse items-center gap-4 p-5">
          <div className="h-12 w-12 flex-shrink-0 rounded-[var(--radius-inner)] bg-[#e4eaf2]" />
          <div className="flex-1">
            <div className="h-3 w-20 rounded-md bg-[#e4eaf2]" />
            <div className="mt-2 h-6 w-16 rounded-md bg-[#e4eaf2]" />
          </div>
        </div>
      ))}
      <span className="sr-only">Yuklanmoqda...</span>
    </div>
  );
}

// XAVFSIZ XONADON — Global qidiruv (Cmd+K / Ctrl+K)
//
// INTEGRATSIYA: bu komponentni App.tsx ichida, Router ichkarisida (masalan,
// AppLayout yoki ProtectedRoute darajasida) bir marta mount qilish kerak:
//     import GlobalSearch from '@/components/GlobalSearch';
//     ...
//     <GlobalSearch />
// (Mount qilish yakuniy integratsiya qadamida bajariladi.)

import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiGet } from '@/api';
import type { Paginated, XonadonBrief, MuammoBrief } from '@/types';

const DEBOUNCE_MS = 300;
const LIMIT = 5;

type Natija =
  | { tur: 'xonadon'; id: number; sarlavha: string; osti: string }
  | { tur: 'muammo'; id: number; sarlavha: string; osti: string };

export default function GlobalSearch() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [sorov, setSorov] = useState('');
  const [xonadonlar, setXonadonlar] = useState<XonadonBrief[]>([]);
  const [muammolar, setMuammolar] = useState<MuammoBrief[]>([]);
  const [qidiryapti, setQidiryapti] = useState(false);
  const [aktiv, setAktiv] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // ── Klaviatura: Cmd/Ctrl+K yoki "/" ochadi, Escape yopadi ──────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
        return;
      }
      if (e.key === '/' && !open) {
        const t = e.target as HTMLElement | null;
        const yozilyapti =
          t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
        if (!yozilyapti) {
          e.preventDefault();
          setOpen(true);
        }
        return;
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  // Ochilganda: fokus + holatni tozalash
  useEffect(() => {
    if (open) {
      setSorov('');
      setXonadonlar([]);
      setMuammolar([]);
      setAktiv(0);
      // Render tugagach fokus
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  // ── Qidiruv (debounce 300ms) ───────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    const q = sorov.trim();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!q) {
      setXonadonlar([]);
      setMuammolar([]);
      setQidiryapti(false);
      return;
    }
    setQidiryapti(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const enc = encodeURIComponent(q);
        const [xonRes, muamRes] = await Promise.all([
          apiGet<Paginated<XonadonBrief>>(`/xonadonlar?qidiruv=${enc}&page=1&size=${LIMIT}`),
          apiGet<Paginated<MuammoBrief>>(`/muammolar?qidiruv=${enc}&page=1&size=${LIMIT}`),
        ]);
        setXonadonlar(xonRes.ok ? xonRes.data.items : []);
        setMuammolar(muamRes.ok ? muamRes.data.items : []);
        setAktiv(0);
      } catch {
        setXonadonlar([]);
        setMuammolar([]);
      } finally {
        setQidiryapti(false);
      }
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [sorov, open]);

  // ── Natijalarni yagona ro'yxatga yig'ish ───────────────────────────
  const natijalar: Natija[] = [
    ...xonadonlar.map((x) => ({
      tur: 'xonadon' as const,
      id: x.id,
      sarlavha: x.full_address || `${x.uy_raqami}-uy, ${x.kocha_nomi || ''}`,
      osti: [x.mfy_nomi, x.egasi_fio].filter(Boolean).join(' · ') || '—',
    })),
    ...muammolar.map((m) => ({
      tur: 'muammo' as const,
      id: m.id,
      sarlavha: m.tavsif || `${m.turi} muammosi — #${m.id}`,
      osti: m.xonadon_manzil || '—',
    })),
  ];

  const tanlash = useCallback(
    (n: Natija) => {
      setOpen(false);
      navigate(n.tur === 'xonadon' ? `/xonadonlar/${n.id}` : `/muammolar/${n.id}`);
    },
    [navigate],
  );

  const onInputKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setAktiv((a) => Math.min(a + 1, natijalar.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setAktiv((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Enter' && natijalar[aktiv]) {
      e.preventDefault();
      tanlash(natijalar[aktiv]);
    }
  };

  if (!open) return null;

  const xonadonSoni = xonadonlar.length;
  let qator = -1;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center bg-black/40 px-4 pt-[15vh]"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-xl bg-white shadow-2xl border border-gray-200"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Global qidiruv"
      >
        {/* Input */}
        <div className="flex items-center gap-3 border-b border-gray-200 px-4">
          <span aria-hidden className="text-gray-400 text-lg">⌕</span>
          <input
            ref={inputRef}
            value={sorov}
            onChange={(e) => setSorov(e.target.value)}
            onKeyDown={onInputKey}
            placeholder="Xonadon yoki muammo qidirish..."
            className="w-full py-3.5 text-sm outline-none placeholder:text-gray-400"
          />
          <kbd className="hidden sm:inline-block rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-[10px] text-gray-400">
            ESC
          </kbd>
        </div>

        {/* Natijalar */}
        <div className="max-h-[50vh] overflow-y-auto p-2">
          {sorov.trim() === '' ? (
            <p className="px-3 py-6 text-center text-sm text-gray-400">
              Qidirish uchun yozing — xonadon manzili, egasi yoki muammo tavsifi
            </p>
          ) : qidiryapti ? (
            <p className="px-3 py-6 text-center text-sm text-gray-400">Qidirilmoqda...</p>
          ) : natijalar.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-gray-400">Hech narsa topilmadi</p>
          ) : (
            <>
              {xonadonlar.length > 0 && (
                <div className="mb-2">
                  <p className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                    Xonadonlar
                  </p>
                  {xonadonlar.map((x) => {
                    qator += 1;
                    const i = qator;
                    return (
                      <button
                        key={`x-${x.id}`}
                        onClick={() => tanlash(natijalar[i])}
                        onMouseEnter={() => setAktiv(i)}
                        className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left ${
                          aktiv === i ? 'bg-blue-50' : ''
                        }`}
                      >
                        <span aria-hidden>🏠</span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium text-gray-900">
                            {natijalar[i].sarlavha}
                          </span>
                          <span className="block truncate text-xs text-gray-500">
                            {natijalar[i].osti}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
              {muammolar.length > 0 && (
                <div>
                  <p className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                    Muammolar
                  </p>
                  {muammolar.map((m) => {
                    qator += 1;
                    const i = qator;
                    return (
                      <button
                        key={`m-${m.id}`}
                        onClick={() => tanlash(natijalar[i])}
                        onMouseEnter={() => setAktiv(i)}
                        className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left ${
                          aktiv === i ? 'bg-blue-50' : ''
                        }`}
                      >
                        <span aria-hidden>⚠️</span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium text-gray-900">
                            {natijalar[i].sarlavha}
                          </span>
                          <span className="block truncate text-xs text-gray-500">
                            {natijalar[i].osti}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-4 border-t border-gray-200 px-4 py-2 text-[11px] text-gray-400">
          <span>↑↓ tanlash</span>
          <span>Enter ochish</span>
          <span>Esc yopish</span>
          <span className="ml-auto">{xonadonSoni + muammolar.length} ta natija</span>
        </div>
      </div>
    </div>
  );
}

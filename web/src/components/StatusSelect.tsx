// XAVFSIZ XONADON — status/inspektor filtri uchun MfySelect bilan bir xil
// ko'rinishdagi ochiladigan ro'yxat (native <select> o'rniga, dizayn
// izchilligi uchun). `searchable` — uzun ro'yxatlar (masalan, 200+ xodim)
// uchun tepada qidiruv maydoni chiqaradi.

import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { krilldanLotinga } from '@/lib/alifbo';

interface StatusOption {
  value: string;
  label: string;
}

interface StatusSelectProps {
  options: StatusOption[];
  value: string;
  onChange: (value: string) => void;
  /** Ro'yxat tepasidagi "hammasi/tozalash" tugmasi — berilmasa (majburiy
   *  maydonlar uchun), tugma umuman chiqmaydi va faqat variantlar ko'rinadi. */
  barchasiLabel?: string;
  className?: string;
  searchable?: boolean;
  qidiruvPlaceholder?: string;
}

export default function StatusSelect({
  options,
  value,
  onChange,
  barchasiLabel,
  className,
  searchable = false,
  qidiruvPlaceholder,
}: StatusSelectProps) {
  const [ochiq, setOchiq] = useState(false);
  const [qidiruv, setQidiruv] = useState('');
  const qutiRef = useRef<HTMLDivElement>(null);
  const qidiruvRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!ochiq) return;
    const onMouseDown = (e: MouseEvent) => {
      if (qutiRef.current && !qutiRef.current.contains(e.target as Node)) setOchiq(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOchiq(false);
    };
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('keydown', onKey);
    if (searchable) setTimeout(() => qidiruvRef.current?.focus(), 0);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [ochiq, searchable]);

  useEffect(() => {
    if (!ochiq) setQidiruv('');
  }, [ochiq]);

  const filtrlangan = useMemo(() => {
    if (!searchable) return options;
    const q = krilldanLotinga(qidiruv.trim().toLowerCase());
    if (!q) return options;
    return options.filter((o) => krilldanLotinga(o.label.toLowerCase()).includes(q));
  }, [options, qidiruv, searchable]);

  const tanlangan = options.find((o) => o.value === value);
  const tanlanganMatn = tanlangan ? tanlangan.label : (barchasiLabel ?? '');

  return (
    <div ref={qutiRef} className="relative">
      <button
        type="button"
        onClick={() => setOchiq((o) => !o)}
        className={`${className || 'select'} flex items-center justify-between text-left`}
      >
        <span className="truncate">{tanlanganMatn}</span>
        <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
      </button>

      {ochiq && (
        <div className="absolute z-[1200] mt-1 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lift">
          {searchable && (
            <div className="relative border-b border-slate-100 p-2">
              <Search className="pointer-events-none absolute left-4.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                ref={qidiruvRef}
                className="input pl-9 text-sm"
                value={qidiruv}
                onChange={(e) => setQidiruv(e.target.value)}
                placeholder={qidiruvPlaceholder}
              />
            </div>
          )}
          <div className="max-h-64 overflow-y-auto p-1">
            {barchasiLabel !== undefined && (
              <button
                type="button"
                onClick={() => {
                  onChange('');
                  setOchiq(false);
                }}
                className={`block w-full rounded-lg px-3 py-2 text-left text-sm ${
                  value === '' ? 'bg-[#3D6FB4]/10 font-medium text-[#2a5489]' : 'text-[#0F2033] hover:bg-slate-50'
                }`}
              >
                {barchasiLabel}
              </button>
            )}
            {filtrlangan.length === 0 ? (
              <p className="px-3 py-4 text-center text-sm text-slate-400">Topilmadi</p>
            ) : (
              filtrlangan.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => {
                    onChange(o.value);
                    setOchiq(false);
                  }}
                  className={`block w-full truncate rounded-lg px-3 py-2 text-left text-sm ${
                    o.value === value ? 'bg-[#3D6FB4]/10 font-medium text-[#2a5489]' : 'text-[#0F2033] hover:bg-slate-50'
                  }`}
                >
                  {o.label}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

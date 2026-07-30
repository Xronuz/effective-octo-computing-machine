// XAVFSIZ XONADON — dd/mm/yyyy formatidagi sana input
// Native <input type="date"> brauzer/OS lokaliga qarab mm/dd/yyyy ko'rsatishi
// mumkin — shu componentda ko'rinish har doim dd/mm/yyyy, qiymat esa
// tashqariga ISO (yyyy-mm-dd) formatida uzatiladi.

import { useEffect, useRef, useState } from 'react';
import { Calendar } from 'lucide-react';

function isoToDdMmYyyy(iso: string): string {
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return '';
  const [, y, m, d] = match;
  return `${d}/${m}/${y}`;
}

function ddMmYyyyToIso(matn: string): string {
  const match = matn.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return '';
  const [, d, m, y] = match;
  const sana = new Date(`${y}-${m}-${d}T00:00:00`);
  const yaroqli =
    !Number.isNaN(sana.getTime()) &&
    sana.getDate() === Number(d) &&
    sana.getMonth() + 1 === Number(m) &&
    sana.getFullYear() === Number(y);
  return yaroqli ? `${y}-${m}-${d}` : '';
}

function terishniFormatlash(raw: string): string {
  const raqamlar = raw.replace(/\D/g, '').slice(0, 8);
  const qismlar = [raqamlar.slice(0, 2), raqamlar.slice(2, 4), raqamlar.slice(4, 8)].filter(Boolean);
  return qismlar.join('/');
}

interface DateInputProps {
  value: string; // ISO yyyy-mm-dd yoki ''
  onChange: (iso: string) => void;
  className?: string;
  placeholder?: string;
  min?: string; // ISO yyyy-mm-dd — shundan oldingi sanalar rad etiladi
  required?: boolean;
}

export default function DateInput({ value, onChange, className, placeholder, min, required }: DateInputProps) {
  const [matn, setMatn] = useState(() => isoToDdMmYyyy(value));
  const nativeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMatn(isoToDdMmYyyy(value));
  }, [value]);

  const openCalendar = () => {
    const el = nativeRef.current;
    if (!el) return;
    if (typeof (el as HTMLInputElement & { showPicker?: () => void }).showPicker === 'function') {
      (el as HTMLInputElement & { showPicker: () => void }).showPicker();
    } else {
      el.focus();
      el.click();
    }
  };

  return (
    <div className="relative">
      <input
        type="text"
        inputMode="numeric"
        className={`${className || ''} pr-9`}
        value={matn}
        placeholder={placeholder || 'dd/mm/yyyy'}
        maxLength={10}
        required={required}
        onChange={(e) => {
          const formatlangan = terishniFormatlash(e.target.value);
          setMatn(formatlangan);
          if (formatlangan.length === 10) {
            const iso = ddMmYyyyToIso(formatlangan);
            if (iso && (!min || iso >= min)) onChange(iso);
          } else if (formatlangan === '') {
            onChange('');
          }
        }}
      />
      <button
        type="button"
        onClick={openCalendar}
        tabIndex={-1}
        aria-label="Kalendar"
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-[#3D6FB4]"
      >
        <Calendar className="h-4 w-4" />
      </button>
      <input
        ref={nativeRef}
        type="date"
        tabIndex={-1}
        min={min}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className="pointer-events-none absolute inset-0 h-full w-full opacity-0"
        aria-hidden="true"
      />
    </div>
  );
}

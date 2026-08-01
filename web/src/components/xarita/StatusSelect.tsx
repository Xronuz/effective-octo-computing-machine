// XAVFSIZ XONADON — status filtri uchun MfySelect bilan bir xil ko'rinishdagi
// ochiladigan ro'yxat (native <select> o'rniga, dizayn izchilligi uchun)

import { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface StatusOption {
  value: string;
  label: string;
}

interface StatusSelectProps {
  options: StatusOption[];
  value: string;
  onChange: (value: string) => void;
  barchasiLabel: string;
  className?: string;
}

export default function StatusSelect({ options, value, onChange, barchasiLabel, className }: StatusSelectProps) {
  const [ochiq, setOchiq] = useState(false);
  const qutiRef = useRef<HTMLDivElement>(null);

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
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [ochiq]);

  const tanlangan = options.find((o) => o.value === value);
  const tanlanganMatn = tanlangan ? tanlangan.label : barchasiLabel;

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
          <div className="max-h-64 overflow-y-auto p-1">
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
            {options.map((o) => (
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
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

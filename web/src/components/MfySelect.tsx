// XAVFSIZ XONADON — qidiruvli MFY tanlash (native <select> o'rniga,
// ro'yxat uzun bo'lgani uchun tepada qidiruv maydoni bilan)

import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { useAlifbo } from '@/alifbo';
import { krilldanLotinga, mfyNomiTozala } from '@/lib/alifbo';

interface MfySelectItem {
  id: number;
  raqami: number;
  nomi: string;
}

interface MfySelectProps {
  mfylar: MfySelectItem[];
  value: string;
  onChange: (mfyId: string) => void;
  barchasiLabel: string;
  className?: string;
}

export default function MfySelect({ mfylar, value, onChange, barchasiLabel, className }: MfySelectProps) {
  const { tr } = useAlifbo();
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
    setTimeout(() => qidiruvRef.current?.focus(), 0);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [ochiq]);

  useEffect(() => {
    if (!ochiq) setQidiruv('');
  }, [ochiq]);

  const filtrlangan = useMemo(() => {
    const q = krilldanLotinga(qidiruv.trim().toLowerCase());
    if (!q) return mfylar;
    return mfylar.filter(
      (m) => krilldanLotinga(m.nomi.toLowerCase()).includes(q) || String(m.raqami).includes(q),
    );
  }, [mfylar, qidiruv]);

  const mfyNomiKorsat = (nomi: string) => `${tr(mfyNomiTozala(nomi))} ${tr('MFY')}`;

  const tanlangan = mfylar.find((m) => String(m.id) === value);
  const tanlanganMatn = tanlangan ? mfyNomiKorsat(tanlangan.nomi) : barchasiLabel;

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
        <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lift">
          <div className="relative border-b border-slate-100 p-2">
            <Search className="pointer-events-none absolute left-4.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              ref={qidiruvRef}
              className="input pl-9 text-sm"
              value={qidiruv}
              onChange={(e) => setQidiruv(e.target.value)}
              placeholder={tr('MFY nomi yoki raqami...')}
            />
          </div>
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
            {filtrlangan.length === 0 ? (
              <p className="px-3 py-4 text-center text-sm text-slate-400">{tr('Topilmadi')}</p>
            ) : (
              filtrlangan.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    onChange(String(m.id));
                    setOchiq(false);
                  }}
                  className={`block w-full truncate rounded-lg px-3 py-2 text-left text-sm ${
                    String(m.id) === value ? 'bg-[#3D6FB4]/10 font-medium text-[#2a5489]' : 'text-[#0F2033] hover:bg-slate-50'
                  }`}
                >
                  {mfyNomiKorsat(m.nomi)}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

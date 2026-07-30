// XAVFSIZ XONADON — Alifbo tanlovi (lotin/krill) context
// auth.tsx bilan bir xil pattern: Provider + useAlifbo() hook.
// tr() — krill rejim tanlangan bo'lsa matnni krillga o'tkazadi.

import React, { createContext, useContext, useState, useCallback } from 'react';
import { krillMatnmi, krilldanLotinga, lotindanKrillga } from '@/lib/alifbo';

interface AlifboState {
  krill: boolean;
  setKrill: (v: boolean) => void;
  tr: (matn: string) => string;
}

const AlifboContext = createContext<AlifboState | null>(null);

const KALIT = 'alifbo';

export function AlifboProvider({ children }: { children: React.ReactNode }) {
  const [krill, setKrillState] = useState<boolean>(() => {
    try {
      return localStorage.getItem(KALIT) === 'krill';
    } catch {
      return false;
    }
  });

  const setKrill = useCallback((v: boolean) => {
    setKrillState(v);
    try {
      localStorage.setItem(KALIT, v ? 'krill' : 'lotin');
    } catch {
      // localStorage mavjud bo'lmasa — faqat sessiyada saqlanadi
    }
  }, []);

  // Statik UI matnlari lotin, ba'zi bazadan kelgan matnlar (MFY/ko'cha
  // nomlari) esa krillda saqlanadi — manba alifbosini avtomatik aniqlab,
  // kerakli yo'nalishda o'giradi.
  const tr = useCallback(
    (matn: string) => {
      const krillMatn = krillMatnmi(matn);
      if (krill) return krillMatn ? matn : lotindanKrillga(matn);
      return krillMatn ? krilldanLotinga(matn) : matn;
    },
    [krill],
  );

  return (
    <AlifboContext.Provider value={{ krill, setKrill, tr }}>{children}</AlifboContext.Provider>
  );
}

export function useAlifbo() {
  const ctx = useContext(AlifboContext);
  if (!ctx) throw new Error('useAlifbo must be inside AlifboProvider');
  return ctx;
}

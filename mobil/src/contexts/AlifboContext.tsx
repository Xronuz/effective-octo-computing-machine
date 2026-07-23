// XAVFSIZ XONADON — Alifbo tanlovi (lotin/krill) context (mobil)
// Web'dagi alifbo.tsx bilan bir xil pattern: Provider + useAlifbo() hook.
// AsyncStorage orqali tanlov saqlanadi.

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lotindanKrillga } from '../lib/alifbo';

interface AlifboState {
  krill: boolean;
  setKrill: (v: boolean) => void;
  tr: (matn: string) => string;
}

const AlifboContext = createContext<AlifboState | null>(null);

const KALIT = 'alifbo';

export function AlifboProvider({ children }: { children: React.ReactNode }) {
  const [krill, setKrillState] = useState<boolean>(false);
  const [yuklandi, setYuklandi] = useState(false);

  // AsyncStorage dan yuklash
  useEffect(() => {
    (async () => {
      try {
        const qiymat = await AsyncStorage.getItem(KALIT);
        if (qiymat === 'krill') setKrillState(true);
      } catch {
        // AsyncStorage xatosi — lotin rejim qoladi
      } finally {
        setYuklandi(true);
      }
    })();
  }, []);

  const setKrill = useCallback((v: boolean) => {
    setKrillState(v);
    try {
      AsyncStorage.setItem(KALIT, v ? 'krill' : 'lotin').catch(() => {});
    } catch {
      // saqlash imkoni bo'lmasa — faqat sessiyada
    }
  }, []);

  const tr = useCallback(
    (matn: string) => (krill ? lotindanKrillga(matn) : matn),
    [krill],
  );

  if (!yuklandi) return <>{children}</>; // AsyncStorage yuklanmaguncha default lotin

  return (
    <AlifboContext.Provider value={{ krill, setKrill, tr }}>
      {children}
    </AlifboContext.Provider>
  );
}

export function useAlifbo() {
  const ctx = useContext(AlifboContext);
  if (!ctx) throw new Error('useAlifbo must be inside AlifboProvider');
  return ctx;
}

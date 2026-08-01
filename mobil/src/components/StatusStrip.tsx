import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import NetInfo from '@react-native-community/netinfo';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useAlifbo } from '../contexts/AlifboContext';
import { getKutilmaganSoni } from '../services/db';
import { setSyncCallback, syncNow } from '../services/sync';
import { Colors, Fonts, FontSizes, FontWeights } from '../theme';

type StripState = 'offline' | 'yuborilmoqda' | 'pending' | 'synced';

/**
 * Yagona "rasmiy holat" satri: tarmoq + sinxronlash navbati.
 * Global OfflineBanner va dublikat sync qatorlarini almashtiradi.
 * Har doim ko'rinadi — xodim 3 soniyada holatni bilishi kerak.
 */
export default function StatusStrip() {
  const navigation = useNavigation();
  const { tr } = useAlifbo();
  const [isOffline, setIsOffline] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);

  useEffect(() => {
    // `isInternetReachable`ga tayanmaymiz — ba'zi tarmoqlarda internet
    // ishlayotgan bo'lsa ham noto'g'ri "false" bo'lib qolishi mumkin
    // (services/sync.ts dagi izohga qarang). `isConnected`ning o'zi ham
    // bir lahzalik noto'g'ri "false" berishi mumkin — shuning uchun holat
    // bir necha soniya davom etsagina "oflayn" deb belgilanadi (debounce).
    let oflaynTaymer: ReturnType<typeof setTimeout> | null = null;
    const unsubscribe = NetInfo.addEventListener((state) => {
      if (oflaynTaymer) clearTimeout(oflaynTaymer);
      if (state.isConnected === true) {
        setIsOffline(false);
      } else {
        oflaynTaymer = setTimeout(() => setIsOffline(true), 2500);
      }
    });

    const refreshCount = async () => {
      try {
        setPendingCount(await getKutilmaganSoni());
      } catch {
        // DB hali tayyor emas
      }
    };
    refreshCount();
    const interval = setInterval(refreshCount, 5000);

    // Jonli sinxronlash holati — "nima bo'layotgani" ko'rinib tursin
    setSyncCallback((s) => {
      setSyncing(s.syncing);
      setPendingCount(s.pendingCount);
      setLastSync(s.lastSync);
    });

    return () => {
      if (oflaynTaymer) clearTimeout(oflaynTaymer);
      unsubscribe();
      clearInterval(interval);
      setSyncCallback(() => {});
    };
  }, []);

  const state: StripState = isOffline
    ? 'offline'
    : syncing && pendingCount > 0
      ? 'yuborilmoqda'
      : pendingCount > 0
        ? 'pending'
        : 'synced';

  // Matnlar harakatga yo'naltirilgan: xodim "nima bo'lyapti va men nima
  // qilishim kerak" degan savolga darhol javob olishi kerak. Avvalgi
  // "{n} ta yozuv navbatda" holatni tushuntirmasdi.
  const nQator = (matn: string) => tr(matn).replace('{n}', String(pendingCount));

  const config: Record<StripState, { color: string; label: string }> = {
    synced: {
      color: Colors.success,
      label: lastSync
        ? tr('Hammasi yuborilgan · {vaqt}').replace('{vaqt}', lastSync)
        : tr('Hammasi yuborilgan'),
    },
    yuborilmoqda: {
      color: Colors.info,
      label: nQator('{n} ta tekshiruv yuborilmoqda...'),
    },
    pending: {
      color: Colors.warning,
      label: nQator('{n} ta tekshiruv yuborilishi kutilmoqda'),
    },
    offline: {
      color: Colors.textMuted,
      label:
        pendingCount > 0
          ? nQator("Internet yo'q · {n} ta tekshiruv saqlangan")
          : tr("Internet yo'q · tekshiruvlar qurilmada saqlanadi"),
    },
  };

  const c = config[state];

  return (
    <TouchableOpacity
      style={styles.strip}
      onPress={() => navigation.navigate('Navbat' as never)}
      onLongPress={() => {
        // Uzoq bosish — darhol yuborishga urinish (kutib turishga majbur qilmaslik)
        if (!isOffline) syncNow();
      }}
      accessibilityRole="button"
      accessibilityLabel={c.label}
      accessibilityHint={tr('Sinxronlash navbatini ochish; uzoq bosilsa darhol yuboriladi')}
    >
      <View style={[styles.dot, { backgroundColor: c.color }]} />
      <Text style={[styles.label, { color: c.color }]}>{c.label}</Text>
      <MaterialCommunityIcons name="chevron-right" size={16} color={Colors.textMuted} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  strip: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
    paddingHorizontal: 16,
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  label: {
    flex: 1,
    fontSize: FontSizes.sm,
    fontFamily: Fonts.body,
    fontWeight: FontWeights.medium,
  },
});

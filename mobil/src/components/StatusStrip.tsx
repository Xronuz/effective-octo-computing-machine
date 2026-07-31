import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import NetInfo from '@react-native-community/netinfo';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useAlifbo } from '../contexts/AlifboContext';
import { getKutilmaganSoni } from '../services/db';
import { Colors, Fonts, FontSizes, FontWeights } from '../theme';

type StripState = 'offline' | 'pending' | 'synced';

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

  useEffect(() => {
    // `isInternetReachable`ga tayanmaymiz — ba'zi tarmoqlarda internet
    // ishlayotgan bo'lsa ham noto'g'ri "false" bo'lib qolishi mumkin
    // (services/sync.ts dagi izohga qarang).
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOffline(state.isConnected !== true);
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

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const state: StripState = isOffline ? 'offline' : pendingCount > 0 ? 'pending' : 'synced';

  const config: Record<StripState, { color: string; icon: string; label: string }> = {
    synced: {
      color: Colors.success,
      icon: 'check-circle',
      label: tr('Onlayn · Sinxronlangan'),
    },
    pending: {
      color: Colors.warning,
      icon: 'sync-alert',
      label: tr('{count} ta yozuv navbatda').replace('{count}', String(pendingCount)),
    },
    offline: {
      color: Colors.textMuted,
      icon: 'cloud-off-outline',
      label: tr("Offlayn · yozuvlar navbatga qo'shiladi"),
    },
  };

  const c = config[state];

  return (
    <TouchableOpacity
      style={styles.strip}
      onPress={() => navigation.navigate('Navbat' as never)}
      accessibilityRole="button"
      accessibilityLabel={c.label}
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

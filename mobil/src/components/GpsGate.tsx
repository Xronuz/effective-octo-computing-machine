// Xodim GPS ruxsati/GPS holatini o'chirib ilovadan "chetlab o'tib" (soxta
// joylashuv/joylashuvsiz) tekshiruv topshirmasligi uchun to'liq ekranli
// bloklovchi qatlam. Faqat rol=xodim uchun ishlaydi — superadmin/rahbar
// joyda tekshiruv o'tkazmaydi, ularga bu shart emas.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  AppState,
  Platform,
  Linking,
} from 'react-native';
import * as Location from 'expo-location';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useAuth } from '../contexts/AuthContext';
import { useAlifbo } from '../contexts/AlifboContext';
import { useTheme } from '../contexts/ThemeContext';
import { Fonts, FontSizes, FontWeights, Radius } from '../theme';
import type { ColorPalette } from '../theme/colors';

const POLL_MS = 3000;

type Holat = 'tekshirilmoqda' | 'ruxsat_yoq' | 'gps_ochiq_emas' | 'ok';

async function holatniAniqla(): Promise<Holat> {
  try {
    const perm = await Location.getForegroundPermissionsAsync();
    if (perm.status !== 'granted') return 'ruxsat_yoq';
    const yoqilgan = await Location.hasServicesEnabledAsync();
    if (!yoqilgan) return 'gps_ochiq_emas';
    return 'ok';
  } catch {
    // Aniqlab bo'lmasa, ilovani bloklab qo'ymaymiz — soxta pozitiv xato
    // haqiqiy ishlashni to'xtatishdan yomonroq emas.
    return 'ok';
  }
}

export default function GpsGate() {
  const { user } = useAuth();
  const { tr } = useAlifbo();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [holat, setHolat] = useState<Holat>('tekshirilmoqda');
  const [requesting, setRequesting] = useState(false);
  const kerakmi = user?.rol === 'xodim';

  const tekshir = useCallback(async () => {
    if (!kerakmi) return;
    setHolat(await holatniAniqla());
  }, [kerakmi]);

  useEffect(() => {
    if (!kerakmi) return;
    tekshir();

    // Foydalanuvchi Sozlamalarga o'tib qaytganda darhol qayta tekshiramiz.
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') tekshir();
    });
    // Qo'shimcha: ba'zi qurilmalarda GPS tez tugmasi ilovadan chiqmasdan
    // ham o'zgartirilishi mumkin — shu uchun bloklangan holatda davriy
    // tekshiruv ham ishlaydi.
    const interval = setInterval(tekshir, POLL_MS);

    return () => {
      sub.remove();
      clearInterval(interval);
    };
  }, [kerakmi, tekshir]);

  if (!kerakmi || holat === 'ok' || holat === 'tekshirilmoqda') return null;

  const ruxsatSoralmagan = holat === 'ruxsat_yoq';

  const handleRuxsatBerish = async () => {
    setRequesting(true);
    try {
      const res = await Location.requestForegroundPermissionsAsync();
      if (res.status === 'granted') {
        setHolat(await holatniAniqla());
      } else if (!res.canAskAgain) {
        // Android'da "qayta so'ramaslik" belgilansa, tizim dialogi endi
        // chiqmaydi — foydalanuvchini to'g'ridan-to'g'ri sozlamalarga
        // yo'naltiramiz.
        Linking.openSettings();
      }
    } finally {
      setRequesting(false);
    }
  };

  const handleGpsniYoqish = async () => {
    if (Platform.OS === 'android') {
      try {
        await Location.enableNetworkProviderAsync();
        setHolat(await holatniAniqla());
        return;
      } catch {
        // Foydalanuvchi Google'ning GPS yoqish dialogini rad etdi —
        // sozlamalar sahifasiga yo'naltiramiz.
      }
      Linking.sendIntent('android.settings.LOCATION_SOURCE_SETTINGS').catch(() => {
        Linking.openSettings();
      });
    } else {
      Linking.openSettings();
    }
  };

  return (
    <View style={styles.overlay}>
      <View style={styles.card}>
        <View style={styles.iconCircle}>
          <MaterialCommunityIcons
            name={ruxsatSoralmagan ? 'map-marker-off-outline' : 'crosshairs-gps'}
            size={40}
            color={colors.danger}
          />
        </View>
        <Text style={styles.title}>
          {ruxsatSoralmagan ? tr('GPS ruxsati kerak') : tr("GPS o'chirilgan")}
        </Text>
        <Text style={styles.desc}>
          {ruxsatSoralmagan
            ? tr(
                "Tekshiruv joylashuvini tasdiqlash uchun ilovaga GPS'dan foydalanish ruxsatini bering. Ruxsatsiz ilova ishlamaydi.",
              )
            : tr(
                "Telefoningizda GPS (joylashuv xizmati) o'chirilgan. Tekshiruv joylashuvini tasdiqlash uchun uni yoqing.",
              )}
        </Text>

        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={ruxsatSoralmagan ? handleRuxsatBerish : handleGpsniYoqish}
          activeOpacity={0.85}
          disabled={requesting}
        >
          <MaterialCommunityIcons name="crosshairs-gps" size={18} color={colors.textInverse} />
          <Text style={styles.primaryBtnText}>
            {ruxsatSoralmagan ? tr('Ruxsat berish') : tr("GPS'ni yoqish")}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => Linking.openSettings()}
          activeOpacity={0.7}
        >
          <Text style={styles.secondaryBtnText}>{tr('Sozlamalarga o‘tish')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    overlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(10, 30, 60, 0.92)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      zIndex: 999,
      elevation: 999,
    },
    card: {
      width: '100%',
      maxWidth: 360,
      backgroundColor: colors.surface,
      borderRadius: Radius.lg,
      padding: 24,
      alignItems: 'center',
      gap: 10,
    },
    iconCircle: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: colors.dangerSurface,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 4,
    },
    title: {
      fontSize: FontSizes.lg,
      fontFamily: Fonts.heading,
      fontWeight: FontWeights.bold,
      color: colors.textPrimary,
      textAlign: 'center',
    },
    desc: {
      fontSize: FontSizes.sm,
      fontFamily: Fonts.body,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
      marginBottom: 8,
    },
    primaryBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: colors.primary,
      borderRadius: Radius.md,
      paddingVertical: 14,
      width: '100%',
    },
    primaryBtnText: {
      fontSize: FontSizes.base,
      fontFamily: Fonts.heading,
      fontWeight: FontWeights.bold,
      color: colors.textInverse,
    },
    secondaryBtn: {
      paddingVertical: 12,
      width: '100%',
      alignItems: 'center',
    },
    secondaryBtnText: {
      fontSize: FontSizes.sm,
      fontFamily: Fonts.body,
      fontWeight: FontWeights.semibold,
      color: colors.primary,
    },
  });
}

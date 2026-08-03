import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import NetInfo from '@react-native-community/netinfo';
import { muammoniNavbatgaQosh, getKutilmaganSoni, type NavbatYozuvi } from '../services/db';
import { syncNow, setSyncCallback } from '../services/sync';
import api from '../services/api';
import OfflineBanner from '../components/OfflineBanner';
import SectionLabel from '../components/SectionLabel';
import Button from '../components/Button';
import PhotoPreview from '../components/PhotoPreview';
import KameraModal, { useKameraRuxsati } from '../components/KameraModal';
import { Fonts, FontSizes, FontWeights, Spacing, Radius, Shadows } from '../theme';
import type { ApiResponse, Xonadon } from '../types';
import { YORIQNOMA_BANDLARI } from '../constants/yoriqnoma';
import { useAlifbo } from '../contexts/AlifboContext';
import { useTheme } from '../contexts/ThemeContext';
import type { ColorPalette } from '../theme/colors';
import { useAppNavigation, useAppRoute } from '../navigation/hooks';
import * as Location from 'expo-location';

const GPS_YAXSHI_ANIQLIK_M = 50;
const GPS_QULF_TIMEOUT_MS = 20_000;
const MUDDAT_RE = /^(\d{2})\/(\d{2})\/(\d{4})$/;
const MUDDAT_PRESETLAR = [3, 7, 15, 30] as const;

function generateUuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Bugungi kundan boshlab N kun keyingi sanani ISO ("yyyy-mm-dd") shaklida qaytaradi
function bugundanKunQoshib(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Foydalanuvchi kiritgan "dd/mm/yyyy" ni ISO "yyyy-mm-dd" ga o'giradi.
// Yaroqsiz bo'lsa null qaytaradi.
function ddMmYyyyToIso(s: string): string | null {
  const match = s.match(MUDDAT_RE);
  if (!match) return null;
  const [, d, m, y] = match;
  const date = new Date(`${y}-${m}-${d}T00:00:00`);
  const yaroqli =
    !isNaN(date.getTime()) &&
    date.getDate() === Number(d) &&
    date.getMonth() + 1 === Number(m) &&
    date.getFullYear() === Number(y);
  return yaroqli ? `${y}-${m}-${d}` : null;
}

// Raqamlarni "dd/mm/yyyy" ko'rinishida avtomatik "/" bilan formatlaydi
function muddatTerishniFormatlash(raw: string): string {
  const raqamlar = raw.replace(/\D/g, '').slice(0, 8);
  const qismlar = [raqamlar.slice(0, 2), raqamlar.slice(2, 4), raqamlar.slice(4, 8)].filter(
    Boolean,
  );
  return qismlar.join('/');
}

interface Photo {
  uri: string;
}

export default function TekshiruvScreen() {
  const route = useAppRoute<'Tekshiruv'>();
  const navigation = useAppNavigation();
  const { tr } = useAlifbo();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  // `majburiy` — oldingi ekranda "Baribir qayta tekshirish" tasdiqlangan
  const { xonadonId, majburiy = false } = route.params;

  // ── Xonadon ma'lumoti (route param orqali, o'zgartirib bo'lmaydi) ──
  const [xonadonInfo, setXonadonInfo] = useState<Xonadon | null>(null);
  const [xonadonYuklanmoqda, setXonadonYuklanmoqda] = useState(true);
  const [xonadonXato, setXonadonXato] = useState('');

  // ── Tashrif natijasi: muammo bor/yo'q, yoki xonadonga kira olmadi ──
  const [natija, setNatija] = useState<'ha' | 'yoq' | 'kira_olmadi' | null>(null);
  const muammoBormi = natija === 'ha' ? true : natija === 'yoq' ? false : null;
  const [tanlanganBandlar, setTanlanganBandlar] = useState<number[]>([]);
  const [tavsif, setTavsif] = useState('');
  const [yoriqnomadanOtkanlarSoni, setYoriqnomadanOtkanlarSoni] = useState(0);
  const [ornidaBartaraf, setOrnidaBartaraf] = useState(false);
  const [muddatTanlovi, setMuddatTanlovi] = useState<number | 'boshqa' | null>(null);
  const [muddatQoliplangan, setMuddatQoliplangan] = useState('');

  const [location, setLocation] = useState<{ lat: number; lon: number; accuracy: number } | null>(
    null,
  );
  const [gpsLocked, setGpsLocked] = useState(false);
  const [gpsTimedOut, setGpsTimedOut] = useState(false);
  const [mockGps, setMockGps] = useState(false);
  // Muammo topilmagan/kira olmadi tashriflarda — ixtiyoriy, umumiy hujjatlashtirish fotosi.
  const [photos, setPhotos] = useState<Photo[]>([]);
  // Muammo topilganda: "oldin" — muammoning holati (har doim majburiy),
  // "keyin" — o'rnida bartaraf etilgan holat (faqat ornidaBartaraf bo'lsa majburiy).
  const [oldinPhotos, setOldinPhotos] = useState<Photo[]>([]);
  const [keyinPhotos, setKeyinPhotos] = useState<Photo[]>([]);
  const [kameraNishoni, setKameraNishoni] = useState<'umumiy' | 'oldin' | 'keyin'>('umumiy');
  const [submitting, setSubmitting] = useState(false);
  const [locError, setLocError] = useState('');
  const [cameraVisible, setCameraVisible] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const locSubRef = useRef<{ remove: () => void } | null>(null);
  const mockWarnedRef = useRef(false);
  const kameraRuxsati = useKameraRuxsati();

  const stopWatch = () => {
    locSubRef.current?.remove();
    locSubRef.current = null;
  };

  // ── Xonadon ma'lumotini yuklash ──
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setXonadonYuklanmoqda(true);
      try {
        const { data } = await api.get<ApiResponse<Xonadon>>(`/xonadonlar/${xonadonId}`);
        if (!cancelled && data.ok && data.data) {
          setXonadonInfo(data.data);
          setXonadonXato('');
        } else if (!cancelled) {
          setXonadonXato(tr('Xonadon topilmadi'));
        }
      } catch {
        if (!cancelled) setXonadonXato(tr("Xonadon ma'lumotini yuklab bo'lmadi"));
      } finally {
        if (!cancelled) setXonadonYuklanmoqda(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [xonadonId, tr]);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      if (!cancelled) setGpsTimedOut(true);
    }, GPS_QULF_TIMEOUT_MS);

    (async () => {
      if (!Location) {
        setLocError('GPS moduli mavjud emas');
        return;
      }
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setLocError('GPS ruxsati berilmadi');
          return;
        }
        locSubRef.current = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.High, timeInterval: 1000, distanceInterval: 1 },
          (loc: any) => {
            if (cancelled) return;
            const rawAccuracy = loc.coords.accuracy;
            const rawLat = loc.coords.latitude;
            const rawLon = loc.coords.longitude;

            const accuracy = Number.isFinite(rawAccuracy) ? Number(rawAccuracy) : 9999;
            const lat = Number.isFinite(rawLat) ? Number(rawLat) : NaN;
            const lon = Number.isFinite(rawLon) ? Number(rawLon) : NaN;

            if (Number.isNaN(lat) || Number.isNaN(lon)) {
              setLocError(tr('GPS koordinatalari aniqlanmadi'));
              return;
            }

            setLocation((prev) =>
              !prev || accuracy <= prev.accuracy ? { lat, lon, accuracy } : prev,
            );
            if (loc.mocked) {
              setMockGps(true);
              if (!mockWarnedRef.current) {
                mockWarnedRef.current = true;
                Alert.alert(
                  tr('Diqqat'),
                  tr('Soxta (mock) GPS aniqlandi. Yozuv shubhali deb belgilanadi.'),
                );
              }
            }
            if (accuracy < GPS_YAXSHI_ANIQLIK_M) {
              setGpsLocked(true);
              setGpsTimedOut(false);
              stopWatch();
              clearTimeout(timer);
            }
          },
        );
      } catch (err: any) {
        setLocError(err.message || tr('GPS xatoligi'));
      }
    })();

    return () => {
      cancelled = true;
      clearTimeout(timer);
      stopWatch();
    };
  }, [tr]);

  useEffect(() => {
    // `isInternetReachable`ga tayanmaymiz — u ba'zi tarmoqlarda internet
    // ishlayotgan bo'lsa ham noto'g'ri "false" bo'lib qolishi mumkin
    // (services/sync.ts dagi izohga qarang). `isConnected`ning o'zi ham
    // ba'zan bir lahzalik noto'g'ri "false" berishi kuzatildi — shuning
    // uchun "oflayn" belgisini darhol emas, bir necha soniya shu holat
    // davom etsagina qo'yamiz (debounce), aks holda foydalanuvchi haqiqiy
    // internet bo'lsa ham qo'rqinchli banner ko'rib chalg'iydi.
    let oflaynTaymer: ReturnType<typeof setTimeout> | null = null;
    const unsubNet = NetInfo.addEventListener((state) => {
      if (oflaynTaymer) clearTimeout(oflaynTaymer);
      if (state.isConnected === true) {
        setIsOffline(false);
      } else {
        oflaynTaymer = setTimeout(() => setIsOffline(true), 2500);
      }
    });
    setSyncCallback((s) => {
      setPendingCount(s.pendingCount);
    });
    getKutilmaganSoni()
      .then(setPendingCount)
      .catch(() => {});
    return () => {
      if (oflaynTaymer) clearTimeout(oflaynTaymer);
      unsubNet();
      setSyncCallback(() => {});
    };
  }, []);

  const continueWithLowAccuracy = () => {
    setGpsLocked(true);
    setGpsTimedOut(false);
    stopWatch();
  };

  const toggleBand = (id: number) => {
    setTanlanganBandlar((prev) =>
      prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id],
    );
  };

  const takePhoto = async (nishon: 'umumiy' | 'oldin' | 'keyin' = 'umumiy') => {
    setKameraNishoni(nishon);
    if (await kameraRuxsati.soraw()) setCameraVisible(true);
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const removeOldinPhoto = (index: number) => {
    setOldinPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const removeKeyinPhoto = (index: number) => {
    setKeyinPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const finalMuddatIso = (): string | null => {
    if (muddatTanlovi === 'boshqa') return ddMmYyyyToIso(muddatQoliplangan.trim());
    if (typeof muddatTanlovi === 'number') return bugundanKunQoshib(muddatTanlovi);
    return null;
  };

  const kiraOlmadi = natija === 'kira_olmadi';

  const formTayyor =
    xonadonInfo !== null &&
    gpsLocked &&
    natija !== null &&
    (natija !== 'ha' || tanlanganBandlar.length > 0);

  const handleSubmit = async () => {
    if (!xonadonInfo) {
      Alert.alert(tr('Xatolik'), tr("Xonadon ma'lumoti hali yuklanmadi"));
      return;
    }
    if (natija === null) {
      Alert.alert(tr('Xatolik'), tr('Tashrif natijasini tanlang'));
      return;
    }
    if (muammoBormi && tanlanganBandlar.length === 0) {
      Alert.alert(tr('Xatolik'), tr("Kamida bitta yo'riqnoma bandini belgilang"));
      return;
    }
    if (muammoBormi && oldinPhotos.length === 0) {
      Alert.alert(tr('Xatolik'), tr("Muammo uchun 'oldin' (muammoning holati) fotosi majburiy."));
      return;
    }
    if (muammoBormi && ornidaBartaraf && keyinPhotos.length === 0) {
      Alert.alert(
        tr('Xatolik'),
        tr("O'rnida bartaraf etilgan muammo uchun 'keyin' foto majburiy."),
      );
      return;
    }
    const muddatIso = muammoBormi && !ornidaBartaraf ? finalMuddatIso() : null;
    if (muammoBormi && !ornidaBartaraf && !muddatIso) {
      Alert.alert(tr('Xatolik'), tr('Bartaraf etish muddatini tanlang.'));
      return;
    }
    if (!location) {
      Alert.alert(tr('Xatolik'), tr('GPS koordinatalari hali aniqlanmadi. Iltimos, kuting.'));
      return;
    }
    if (!Number.isFinite(location.lat) || !Number.isFinite(location.lon)) {
      Alert.alert(
        tr('Xatolik'),
        tr('GPS koordinatalari noto‘g‘ri. Iltimos, qayta urinib ko‘ring.'),
      );
      return;
    }
    if (!gpsLocked) {
      Alert.alert(
        tr('Xatolik'),
        gpsTimedOut
          ? tr(
              'GPS aniqligi past. Davom etish uchun "Shu aniqlik bilan davom etish" tugmasini bosing.',
            )
          : tr("GPS qulflanishi kutilmoqda (aniqlik 50 m dan yaxshi bo'lishi kerak)."),
      );
      return;
    }

    setSubmitting(true);
    try {
      const yozuv: NavbatYozuvi = {
        client_uuid: generateUuid(),
        xonadon_id: xonadonId,
        turi: null,
        xavf: 'orta',
        tavsif: tavsif.trim(),
        lat: location.lat,
        lng: location.lon,
        gps_aniqlik: Number.isFinite(location.accuracy) ? location.accuracy : 9999,
        mock_gps: mockGps,
        ornida_bartaraf: muammoBormi ? ornidaBartaraf : false,
        muddat: muddatIso,
        taklif_etilgan_tadbirlar: muammoBormi
          ? [...tanlanganBandlar].sort((a, b) => a - b).join(',')
          : null,
        yoriqnomadan_otkanlar_soni: yoriqnomadanOtkanlarSoni,
        kira_olmadi: kiraOlmadi,
        majburiy,
        foto_paths: muammoBormi ? oldinPhotos.map((p) => p.uri) : photos.map((p) => p.uri),
        keyin_foto_paths: muammoBormi ? keyinPhotos.map((p) => p.uri) : [],
        status: 'kutilmoqda',
        urinishlar_soni: 0,
        xato: null,
        yaratilgan: new Date().toISOString(),
      };

      await muammoniNavbatgaQosh(yozuv);
      setPendingCount(await getKutilmaganSoni());

      // Xabar haqiqiy holatga mos bo'lsin — "internet bo'lsa yuboriladi"
      // degan umumiy matn xodimni ish yuborildimi yoki yo'qmi degan
      // savolda qoldirardi.
      Alert.alert(
        tr('Tekshiruv qabul qilindi'),
        isOffline
          ? tr('Internet yo‘q — qurilmada saqlandi va aloqa tiklanishi bilan avtomatik yuboriladi.')
          : tr('Serverga yuborilmoqda. Yuborilgani «Asosiy» ekranidagi holat satrida ko‘rinadi.'),
        [{ text: 'OK', onPress: () => navigation.goBack() }],
      );
      syncNow();
    } catch (err: any) {
      Alert.alert(tr('Xatolik'), err.message || tr('Saqlashda xatolik yuz berdi'));
    } finally {
      setSubmitting(false);
    }
  };

  const gpsStatusColor = locError
    ? colors.danger
    : gpsLocked
      ? colors.success
      : gpsTimedOut
        ? colors.warning
        : colors.primary;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <OfflineBanner isOffline={isOffline} pendingCount={pendingCount} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Xonadon (o'zgarmas) */}
        <SectionLabel title={tr('Xonadon')} />
        {xonadonYuklanmoqda ? (
          <View style={styles.xonadonHeader}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        ) : xonadonXato ? (
          <View style={styles.xonadonHeader}>
            <MaterialCommunityIcons name="alert-circle" size={22} color={colors.danger} />
            <Text style={[styles.xonadonAddress, { marginLeft: Spacing.sm }]}>{xonadonXato}</Text>
          </View>
        ) : (
          <View style={styles.xonadonHeader}>
            <View style={styles.xonadonIcon}>
              <MaterialCommunityIcons name="home-map-marker" size={26} color={colors.primary} />
            </View>
            <View style={styles.xonadonInfo}>
              <Text style={styles.xonadonAddress} numberOfLines={2}>
                {xonadonInfo?.full_address || tr('Manzil mavjud emas')}
              </Text>
              {xonadonInfo?.mfy_nomi ? (
                <Text style={styles.xonadonMfy} numberOfLines={1}>
                  {xonadonInfo.mfy_nomi}
                </Text>
              ) : null}
            </View>
          </View>
        )}

        {/* Muammo bormi? */}
        <SectionLabel title={tr('Ushbu xonadonda muammo aniqlandimi?')} />
        <View style={styles.muammoBormiRow}>
          <TouchableOpacity
            style={[styles.muammoBormiBtn, natija === 'yoq' && styles.muammoBormiBtnActiveYoq]}
            onPress={() => setNatija('yoq')}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityState={{ selected: natija === 'yoq' }}
          >
            <MaterialCommunityIcons
              name="check-circle-outline"
              size={24}
              color={natija === 'yoq' ? colors.textInverse : colors.success}
            />
            <Text
              style={[styles.muammoBormiText, natija === 'yoq' && styles.muammoBormiTextActive]}
            >
              {tr("Yo'q")}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.muammoBormiBtn, natija === 'ha' && styles.muammoBormiBtnActiveHa]}
            onPress={() => setNatija('ha')}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityState={{ selected: natija === 'ha' }}
          >
            <MaterialCommunityIcons
              name="alert-circle-outline"
              size={24}
              color={natija === 'ha' ? colors.textInverse : colors.danger}
            />
            <Text style={[styles.muammoBormiText, natija === 'ha' && styles.muammoBormiTextActive]}>
              {tr('Ha')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.muammoBormiBtn,
              natija === 'kira_olmadi' && styles.muammoBormiBtnActiveKira,
            ]}
            onPress={() => setNatija('kira_olmadi')}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityState={{ selected: natija === 'kira_olmadi' }}
          >
            <MaterialCommunityIcons
              name="door-closed-lock"
              size={22}
              color={natija === 'kira_olmadi' ? colors.textInverse : colors.warning}
            />
            <Text
              style={[
                styles.muammoBormiText,
                styles.muammoBormiTextSmall,
                natija === 'kira_olmadi' && styles.muammoBormiTextActive,
              ]}
            >
              {tr('Kira olmadim')}
            </Text>
          </TouchableOpacity>
        </View>

        {muammoBormi === true && (
          <>
            {/* Yo'riqnoma checklist */}
            <SectionLabel
              title={tr("Yo'riqnoma bandlari")}
              trailing={tanlanganBandlar.length > 0 ? `${tanlanganBandlar.length}` : undefined}
            />
            <View style={styles.checklist}>
              {YORIQNOMA_BANDLARI.map((b) => {
                const active = tanlanganBandlar.includes(b.id);
                return (
                  <TouchableOpacity
                    key={b.id}
                    style={[styles.checklistRow, active && styles.checklistRowActive]}
                    onPress={() => toggleBand(b.id)}
                    activeOpacity={0.7}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: active }}
                  >
                    <MaterialCommunityIcons
                      name={active ? 'checkbox-marked' : 'checkbox-blank-outline'}
                      size={22}
                      color={active ? colors.primary : colors.textMuted}
                      style={styles.checklistIcon}
                    />
                    <Text style={styles.checklistNum}>{b.id}.</Text>
                    <Text style={[styles.checklistText, active && styles.checklistTextActive]}>
                      {tr(b.matn)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Izoh */}
            <SectionLabel title={tr('Izoh (ixtiyoriy)')} />
            <View style={[styles.inputWrapper, styles.textareaWrapper]}>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={tavsif}
                onChangeText={setTavsif}
                placeholder={tr("Qo'shimcha izoh...")}
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            {/* Yo'riqnomadan o'tkanlar soni */}
            <SectionLabel title={tr("Yo'riqnomadan o'tkanlar soni")} />
            <Stepper value={yoriqnomadanOtkanlarSoni} onChange={setYoriqnomadanOtkanlarSoni} />

            {/* O'rnida bartaraf */}
            <View style={styles.toggleRow}>
              <View style={{ flex: 1, marginRight: Spacing.md }}>
                <Text style={styles.toggleTitle}>{tr("O'rnida bartaraf etildimi?")}</Text>
                <Text style={styles.toggleHint}>
                  {ornidaBartaraf
                    ? tr("'Keyin' foto majburiy, muddat kerak emas")
                    : tr('Bartaraf etish muddati majburiy')}
                </Text>
              </View>
              <Switch
                value={ornidaBartaraf}
                onValueChange={(v) => {
                  setOrnidaBartaraf(v);
                  if (v) {
                    setMuddatTanlovi(null);
                    setMuddatQoliplangan('');
                  }
                }}
                trackColor={{ false: colors.border, true: colors.primaryLight }}
                thumbColor={colors.textInverse}
              />
            </View>

            {/* Muddat */}
            {!ornidaBartaraf && (
              <View style={{ marginTop: Spacing.md }}>
                <View style={styles.muddatChipRow}>
                  {MUDDAT_PRESETLAR.map((kun) => {
                    const active = muddatTanlovi === kun;
                    return (
                      <TouchableOpacity
                        key={kun}
                        style={[styles.muddatChip, active && styles.muddatChipActive]}
                        onPress={() => setMuddatTanlovi(kun)}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[styles.muddatChipText, active && styles.muddatChipTextActive]}
                        >
                          {kun} {tr('kun')}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                  <TouchableOpacity
                    style={[
                      styles.muddatChip,
                      muddatTanlovi === 'boshqa' && styles.muddatChipActive,
                    ]}
                    onPress={() => setMuddatTanlovi('boshqa')}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.muddatChipText,
                        muddatTanlovi === 'boshqa' && styles.muddatChipTextActive,
                      ]}
                    >
                      {tr('Boshqa sana')}
                    </Text>
                  </TouchableOpacity>
                </View>
                {muddatTanlovi === 'boshqa' && (
                  <View style={[styles.inputWrapper, { marginTop: Spacing.sm }]}>
                    <MaterialCommunityIcons
                      name="calendar-clock"
                      size={22}
                      color={colors.textMuted}
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={styles.input}
                      value={muddatQoliplangan}
                      onChangeText={(v) => setMuddatQoliplangan(muddatTerishniFormatlash(v))}
                      placeholder="DD/MM/YYYY"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="number-pad"
                      maxLength={10}
                      autoCapitalize="none"
                    />
                  </View>
                )}
              </View>
            )}

            {/* "Oldin" foto — muammoning topilgan holati, har doim majburiy */}
            <SectionLabel title={tr('Muammo holati (Oldin)')} trailing={tr('majburiy')} />
            <Text style={styles.fotoIzoh}>
              {tr('Aniqlangan muammoni suratga oling — bu dalil sifatida saqlanadi.')}
            </Text>
            <PhotoPreview
              photos={oldinPhotos}
              onAdd={() => takePhoto('oldin')}
              onRemove={removeOldinPhoto}
              maxPhotos={5}
            />

            {/* "Keyin" foto — faqat o'rnida bartaraf etilganda (darhol yopilganda) */}
            {ornidaBartaraf && (
              <>
                <SectionLabel
                  title={tr('Bartaraf qilingan holat (Keyin)')}
                  trailing={tr('majburiy')}
                />
                <Text style={styles.fotoIzoh}>
                  {tr('Bartaraf etilgan holatni suratga oling — bu dalil sifatida saqlanadi.')}
                </Text>
                <PhotoPreview
                  photos={keyinPhotos}
                  onAdd={() => takePhoto('keyin')}
                  onRemove={removeKeyinPhoto}
                  maxPhotos={5}
                />
              </>
            )}
          </>
        )}

        {muammoBormi === false && (
          <>
            {/* Yo'riqnomadan o'tkanlar soni */}
            <SectionLabel title={tr("Yo'riqnomadan o'tkanlar soni")} />
            <Stepper value={yoriqnomadanOtkanlarSoni} onChange={setYoriqnomadanOtkanlarSoni} />

            {/* Izoh */}
            <SectionLabel title={tr('Izoh (ixtiyoriy)')} />
            <View style={[styles.inputWrapper, styles.textareaWrapper]}>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={tavsif}
                onChangeText={setTavsif}
                placeholder={tr("Qo'shimcha izoh...")}
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            {/* Fotolar (ixtiyoriy) */}
            <SectionLabel title={tr('Fotolar (ixtiyoriy)')} trailing={`${photos.length}`} />
            <PhotoPreview
              photos={photos}
              onAdd={() => takePhoto('umumiy')}
              onRemove={removePhoto}
              maxPhotos={5}
            />
          </>
        )}

        {natija === 'kira_olmadi' && (
          <>
            <View style={styles.kiraOlmadiNote}>
              <MaterialCommunityIcons name="information-outline" size={18} color={colors.warning} />
              <Text style={styles.kiraOlmadiNoteText}>
                {tr(
                  "Bu xonadon bugun 'tekshirilgan' deb hisoblanmaydi — qayta tashrif uchun navbatda qoladi.",
                )}
              </Text>
            </View>

            {/* Izoh */}
            <SectionLabel title={tr('Sabab (ixtiyoriy)')} />
            <View style={[styles.inputWrapper, styles.textareaWrapper]}>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={tavsif}
                onChangeText={setTavsif}
                placeholder={tr("Masalan: eshik ochilmadi, uyda hech kim yo'q edi...")}
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            {/* Fotolar (ixtiyoriy) */}
            <SectionLabel title={tr('Fotolar (ixtiyoriy)')} trailing={`${photos.length}`} />
            <PhotoPreview
              photos={photos}
              onAdd={() => takePhoto('umumiy')}
              onRemove={removePhoto}
              maxPhotos={5}
            />
          </>
        )}

        {/* GPS holati */}
        <SectionLabel title={tr('GPS')} />
        <View style={[styles.gpsBox, { borderLeftColor: gpsStatusColor }]}>
          {locError ? (
            <View style={styles.gpsContent}>
              <MaterialCommunityIcons
                name="crosshairs-off"
                size={22}
                color={colors.danger}
                style={{ marginRight: 10 }}
              />
              <Text style={styles.gpsError}>{locError}</Text>
            </View>
          ) : location ? (
            <View style={{ width: '100%' }}>
              <View style={styles.gpsContent}>
                <MaterialCommunityIcons
                  name={gpsLocked ? 'crosshairs-gps' : 'crosshairs-question'}
                  size={22}
                  color={gpsStatusColor}
                  style={{ marginRight: 10 }}
                />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.gpsText, { color: gpsStatusColor }]}>
                    {location.lat.toFixed(6)}, {location.lon.toFixed(6)} · ±
                    {location.accuracy.toFixed(0)} m
                  </Text>
                  <Text style={styles.gpsAccuracy}>
                    {gpsLocked ? tr('qulflangan') : tr('aniqlanmoqda...')}
                  </Text>
                </View>
                {!gpsLocked && <ActivityIndicator size="small" color={colors.primary} />}
              </View>
              {mockGps && (
                <View style={[styles.gpsContent, { marginTop: Spacing.sm }]}>
                  <MaterialCommunityIcons
                    name="alert"
                    size={16}
                    color={colors.danger}
                    style={{ marginRight: 8 }}
                  />
                  <Text style={styles.gpsError}>{tr('Soxta (mock) GPS aniqlandi')}</Text>
                </View>
              )}
              {gpsTimedOut && !gpsLocked && (
                <View style={styles.gpsTimeoutBox}>
                  <Text style={styles.gpsTimeoutText}>
                    {tr('20 soniyada yuqori aniqlikka erishilmadi.')}
                  </Text>
                  <TouchableOpacity
                    style={styles.gpsTimeoutBtn}
                    onPress={continueWithLowAccuracy}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.gpsTimeoutBtnText}>
                      {tr('Shu aniqlik bilan davom etish')}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.gpsContent}>
              <ActivityIndicator size="small" color={colors.primary} style={{ marginRight: 10 }} />
              <Text style={styles.gpsAccuracy}>{tr('GPS aniqlanmoqda...')}</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Sticky submit paneli */}
      <View
        style={[
          styles.submitBar,
          { paddingBottom: Math.max(insets.bottom, Spacing.md) },
          Shadows.md,
        ]}
      >
        <Button
          title={tr('Saqlash')}
          icon="content-save"
          onPress={handleSubmit}
          loading={submitting}
          disabled={!formTayyor || submitting}
        />
      </View>

      <KameraModal
        visible={cameraVisible}
        onClose={() => setCameraVisible(false)}
        onCapture={(uri) => {
          if (kameraNishoni === 'oldin') setOldinPhotos((prev) => [...prev, { uri }]);
          else if (kameraNishoni === 'keyin') setKeyinPhotos((prev) => [...prev, { uri }]);
          else setPhotos((prev) => [...prev, { uri }]);
        }}
      />
    </SafeAreaView>
  );
}

// ── Oddiy +/- soni tanlovchi (klaviatura kerak emas) ──
function Stepper({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const { colors } = useTheme();
  const stepperStyles = useMemo(() => createStepperStyles(colors), [colors]);
  return (
    <View style={stepperStyles.row}>
      <TouchableOpacity
        style={stepperStyles.btn}
        onPress={() => onChange(Math.max(0, value - 1))}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="Kamaytirish"
      >
        <MaterialCommunityIcons name="minus" size={22} color={colors.primary} />
      </TouchableOpacity>
      <Text style={stepperStyles.value}>{value}</Text>
      <TouchableOpacity
        style={stepperStyles.btn}
        onPress={() => onChange(value + 1)}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="Ko'paytirish"
      >
        <MaterialCommunityIcons name="plus" size={22} color={colors.primary} />
      </TouchableOpacity>
    </View>
  );
}

function createStepperStyles(colors: ColorPalette) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      backgroundColor: colors.surface,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    btn: {
      width: 48,
      height: 48,
      alignItems: 'center',
      justifyContent: 'center',
    },
    value: {
      minWidth: 40,
      textAlign: 'center',
      fontSize: FontSizes.lg,
      fontWeight: FontWeights.semibold,
      fontFamily: Fonts.heading,
      color: colors.textPrimary,
    },
  });
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    content: { paddingHorizontal: Spacing.base, paddingBottom: Spacing['3xl'] },
    inputWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: Radius.md,
      backgroundColor: colors.surface,
    },
    textareaWrapper: { alignItems: 'flex-start' },
    inputIcon: { marginLeft: Spacing.md },
    input: {
      flex: 1,
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.md,
      fontSize: FontSizes.base,
      fontFamily: Fonts.body,
      color: colors.textPrimary,
    },
    textArea: { height: 90 },
    // ── Xonadon ──
    xonadonHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: Spacing.md,
      ...Shadows.sm,
    },
    xonadonIcon: {
      width: 48,
      height: 48,
      borderRadius: Radius.md,
      backgroundColor: colors.primarySurface,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: Spacing.sm,
    },
    xonadonInfo: { flex: 1 },
    xonadonAddress: {
      fontSize: FontSizes.base,
      fontWeight: FontWeights.semibold,
      fontFamily: Fonts.body,
      color: colors.textPrimary,
    },
    xonadonMfy: {
      fontSize: FontSizes.sm,
      fontFamily: Fonts.body,
      color: colors.textSecondary,
      marginTop: Spacing.xxs,
    },
    // ── Muammo bormi? ──
    muammoBormiRow: { flexDirection: 'row', gap: Spacing.sm },
    muammoBormiBtn: {
      flex: 1,
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 64,
      paddingVertical: Spacing.sm,
      paddingHorizontal: 4,
      borderRadius: Radius.lg,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      gap: 4,
    },
    muammoBormiBtnActiveYoq: { backgroundColor: colors.success, borderColor: colors.success },
    muammoBormiBtnActiveHa: { backgroundColor: colors.danger, borderColor: colors.danger },
    muammoBormiBtnActiveKira: { backgroundColor: colors.warning, borderColor: colors.warning },
    muammoBormiText: {
      fontSize: FontSizes.md,
      fontWeight: FontWeights.semibold,
      fontFamily: Fonts.heading,
      color: colors.textPrimary,
      textAlign: 'center',
    },
    muammoBormiTextSmall: { fontSize: FontSizes.sm },
    muammoBormiTextActive: { color: colors.textInverse },
    kiraOlmadiNote: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: Spacing.sm,
      backgroundColor: colors.accentSurface,
      borderRadius: Radius.md,
      padding: Spacing.md,
      marginBottom: Spacing.md,
    },
    kiraOlmadiNoteText: {
      flex: 1,
      fontSize: FontSizes.sm,
      fontFamily: Fonts.body,
      color: colors.textSecondary,
      lineHeight: 18,
    },
    // ── Checklist ──
    checklist: {
      backgroundColor: colors.surface,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    checklistRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderLight,
    },
    checklistRowActive: { backgroundColor: colors.primarySurface },
    checklistIcon: { marginTop: 1, marginRight: Spacing.sm },
    checklistNum: {
      fontSize: FontSizes.sm,
      fontFamily: Fonts.body,
      fontWeight: FontWeights.semibold,
      color: colors.textMuted,
      marginRight: Spacing.xs,
    },
    checklistText: {
      flex: 1,
      fontSize: FontSizes.sm,
      fontFamily: Fonts.body,
      color: colors.textSecondary,
      lineHeight: 20,
    },
    checklistTextActive: { color: colors.textPrimary, fontWeight: FontWeights.medium },
    // ── O'rnida bartaraf ──
    toggleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.surface,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: Spacing.base,
      marginTop: Spacing['2xl'],
    },
    toggleTitle: {
      fontSize: FontSizes.base,
      fontWeight: FontWeights.semibold,
      fontFamily: Fonts.heading,
      color: colors.textPrimary,
    },
    toggleHint: {
      fontSize: FontSizes.sm,
      fontFamily: Fonts.body,
      color: colors.textMuted,
      marginTop: Spacing.xxs,
    },
    // ── Muddat presetlari ──
    muddatChipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
    muddatChip: {
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
      minHeight: 44,
      justifyContent: 'center',
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    muddatChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    muddatChipText: {
      fontSize: FontSizes.sm,
      fontWeight: FontWeights.medium,
      fontFamily: Fonts.body,
      color: colors.textSecondary,
    },
    muddatChipTextActive: { color: colors.textInverse },
    // ── GPS ──
    gpsBox: {
      backgroundColor: colors.surface,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      borderLeftWidth: 4,
      padding: Spacing.md,
      alignItems: 'center',
    },
    gpsContent: { flexDirection: 'row', alignItems: 'center' },
    gpsText: {
      fontSize: FontSizes.sm,
      fontFamily: Fonts.mono || Fonts.body,
      fontWeight: FontWeights.semibold,
    },
    gpsAccuracy: {
      fontSize: FontSizes.xs,
      fontFamily: Fonts.body,
      color: colors.textSecondary,
      marginTop: Spacing.xxs,
    },
    gpsError: { fontSize: FontSizes.sm, fontFamily: Fonts.body, color: colors.danger },
    fotoIzoh: {
      fontSize: FontSizes.sm,
      fontFamily: Fonts.body,
      color: colors.textMuted,
      marginBottom: Spacing.sm,
    },
    gpsTimeoutBox: {
      marginTop: Spacing.sm,
      backgroundColor: colors.accentSurface,
      borderRadius: Radius.md,
      padding: Spacing.md,
    },
    gpsTimeoutText: {
      fontSize: FontSizes.sm,
      fontFamily: Fonts.body,
      color: colors.textPrimary,
      marginBottom: Spacing.sm,
    },
    gpsTimeoutBtn: {
      backgroundColor: colors.accent,
      borderRadius: Radius.md,
      minHeight: 44,
      justifyContent: 'center',
      alignItems: 'center',
    },
    gpsTimeoutBtnText: {
      color: colors.primaryDark,
      fontSize: FontSizes.sm,
      fontWeight: FontWeights.semibold,
      fontFamily: Fonts.body,
    },
    // ── Sticky submit ──
    submitBar: {
      backgroundColor: colors.surface,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingHorizontal: Spacing.base,
      paddingTop: Spacing.md,
    },
    // ── Kamera ──
  });
}

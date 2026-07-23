import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView,
  Alert, ActivityIndicator, Image, Modal, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImageManipulator from 'expo-image-manipulator';
import NetInfo from '@react-native-community/netinfo';
import { muammoniNavbatgaQosh, getKutilmaganSoni, type NavbatYozuvi } from '../services/db';
import { syncNow, setSyncCallback, getLastSyncTime } from '../services/sync';
import OfflineBanner from '../components/OfflineBanner';
import SyncIndicator from '../components/SyncIndicator';
import { Colors, Fonts, FontSizes, FontWeights, Spacing, Radius, Shadows, XavfColors } from '../theme';
import type { MuammoTuri, XavfDarajasi } from '../types';
import { useAlifbo } from '../contexts/AlifboContext';

// GPS is loaded dynamically since it requires a native module
let Location: any = null;
try { Location = require('expo-location'); } catch {}

const GPS_YAXSHI_ANIQLIK_M = 50;
const GPS_QULF_TIMEOUT_MS = 20_000;
const FOTO_MAX_PX = 1600;
const MUDDAT_RE = /^\d{4}-\d{2}-\d{2}$/;

// Idempotency uchun qurilma tomonida generatsiya qilinadigan UUID v4
function generateUuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Suratni uzun tomoni 1600px gacha kichraytirish, JPEG 0.75 sifatda
async function compressPhoto(uri: string): Promise<string> {
  try {
    const { width, height } = await new Promise<{ width: number; height: number }>(
      (resolve, reject) => Image.getSize(uri, (w, h) => resolve({ width: w, height: h }), reject),
    );
    const actions: ImageManipulator.Action[] = [];
    if (Math.max(width, height) > FOTO_MAX_PX) {
      actions.push({ resize: width >= height ? { width: FOTO_MAX_PX } : { height: FOTO_MAX_PX } });
    }
    const result = await ImageManipulator.manipulateAsync(uri, actions, {
      compress: 0.75,
      format: ImageManipulator.SaveFormat.JPEG,
    });
    return result.uri;
  } catch {
    return uri; // siqish ishlamasa original fayl yo'li qoladi
  }
}

function isValidMuddat(s: string): boolean {
  if (!MUDDAT_RE.test(s)) return false;
  const d = new Date(`${s}T00:00:00`);
  return !isNaN(d.getTime());
}

const TUR_OPTIONS = (tr: (s: string) => string): { key: MuammoTuri; label: string; icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'] }[] => [
  { key: 'ochiq_elektr_simi', label: tr('Ochiq elektr simi'), icon: 'lightning-bolt-outline' },
  { key: 'elektr_shchit_nosoz', label: tr('Elektr shchit nosoz'), icon: 'electric-switch' },
  { key: 'gaz_shlangi_nosoz', label: tr('Gaz shlangi nosoz'), icon: 'gas-cylinder' },
  { key: 'gaz_hidi', label: tr('Gaz hidi'), icon: 'smoke-detector' },
  { key: 'isitish_uskunasi', label: tr('Isitish uskunasi'), icon: 'radiator' },
  { key: 'mo_ri_tozalanmagan', label: tr("Mo'ri tozalanmagan"), icon: 'air-filter' },
  { key: 'ot_ochirgich_yoq', label: tr("O't o'chirgich yo'q"), icon: 'fire-extinguisher' },
  { key: 'evakuatsiya_yoli_yopiq', label: tr("Evakuatsiya yo'li yopiq"), icon: 'exit-run' },
  { key: 'boshqa', label: tr('Boshqa'), icon: 'dots-horizontal-circle-outline' },
];

const XAVF_OPTIONS = (tr: (s: string) => string): { value: XavfDarajasi; label: string; color: string; icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'] }[] => [
  { value: 'past', label: tr('Past'), color: XavfColors.past.text, icon: 'circle-small' },
  { value: 'orta', label: tr("O'rta"), color: '#D9A441', icon: 'circle-medium' },
  { value: 'yuqori', label: tr('Yuqori'), color: XavfColors.yuqori.text, icon: 'circle' },
  { value: 'kritik', label: tr('Kritik'), color: XavfColors.kritik.text, icon: 'alert-circle' },
];

interface Photo {
  uri: string;
}

export default function MuammoYaratishScreen({ route, navigation }: any) {
  const { tr } = useAlifbo();
  const xonadonId = route.params?.xonadonId as number | undefined;

  const [selectedXonadonId, setSelectedXonadonId] = useState<string>(xonadonId ? String(xonadonId) : '');
  const [turi, setTuri] = useState<MuammoTuri>('boshqa');
  const [xavf, setXavf] = useState<XavfDarajasi>('orta');
  const [tavsif, setTavsif] = useState('');
  const [ornidaBartaraf, setOrnidaBartaraf] = useState(false);
  const [muddat, setMuddat] = useState('');
  const [location, setLocation] = useState<{ lat: number; lon: number; accuracy: number } | null>(null);
  const [gpsLocked, setGpsLocked] = useState(false);
  const [gpsTimedOut, setGpsTimedOut] = useState(false);
  const [mockGps, setMockGps] = useState(false);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [locError, setLocError] = useState('');
  const [cameraVisible, setCameraVisible] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const cameraRef = useRef<CameraView>(null);
  const locSubRef = useRef<{ remove: () => void } | null>(null);
  const mockWarnedRef = useRef(false);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();

  const stopWatch = () => {
    locSubRef.current?.remove();
    locSubRef.current = null;
  };

  // GPS qulflash: accuracy < 50m kutiladi; 20s dan oshsa ogohlantirish chiqadi
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      if (!cancelled) setGpsTimedOut(true);
    }, GPS_QULF_TIMEOUT_MS);

    (async () => {
      if (!Location) { setLocError('GPS moduli mavjud emas'); return; }
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') { setLocError('GPS ruxsati berilmadi'); return; }
        locSubRef.current = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.High, timeInterval: 1000, distanceInterval: 1 },
          (loc: any) => {
            if (cancelled) return;
            const accuracy = typeof loc.coords.accuracy === 'number' ? loc.coords.accuracy : 9999;
            setLocation((prev) =>
              !prev || accuracy <= prev.accuracy
                ? { lat: loc.coords.latitude, lon: loc.coords.longitude, accuracy }
                : prev,
            );
            if (loc.mocked) {
              setMockGps(true);
              if (!mockWarnedRef.current) {
                mockWarnedRef.current = true;
                Alert.alert(tr('Diqqat'), tr('Soxta (mock) GPS aniqlandi. Yozuv shubhali deb belgilanadi.'));
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
  }, []);

  // Tarmoq holati + sinxronizatsiya indikatori
  useEffect(() => {
    const unsubNet = NetInfo.addEventListener((state) => {
      setIsOffline(!(state.isConnected === true && state.isInternetReachable !== false));
    });
    setSyncCallback((s) => {
      setIsSyncing(s.syncing);
      setPendingCount(s.pendingCount);
      setLastSync(s.lastSync);
    });
    getKutilmaganSoni().then(setPendingCount);
    getLastSyncTime().then(setLastSync);
    return () => {
      unsubNet();
      setSyncCallback(() => {});
    };
  }, []);

  const continueWithLowAccuracy = () => {
    setGpsLocked(true);
    setGpsTimedOut(false);
    stopWatch();
  };

  const takePhoto = async () => {
    if (!cameraPermission?.granted) {
      const perm = await requestCameraPermission();
      if (!perm.granted) {
        Alert.alert(
          tr("Ruxsat yo'q"),
          tr('Rasm olish uchun kamera ruxsati kerak. Iltimos, qurilma sozlamalaridan kamera ruxsatini yoqing.')
        );
        return;
      }
    }
    setCameraVisible(true);
  };

  const capturePhoto = async () => {
    if (!cameraRef.current || capturing) return;
    setCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.75 });
      if (photo?.uri) {
        const compressedUri = await compressPhoto(photo.uri);
        setPhotos(prev => [...prev, { uri: compressedUri }]);
        setCameraVisible(false);
      }
    } catch (err: any) {
      Alert.alert(tr('Kamera xatoligi'), err.message || tr('Rasm olishda xatolik yuz berdi'));
    } finally {
      setCapturing(false);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!selectedXonadonId.trim()) { Alert.alert(tr('Xatolik'), tr('Xonadon ID sini kiriting')); return; }
    if (!tavsif.trim()) { Alert.alert(tr('Xatolik'), tr('Tavsifni kiriting')); return; }
    if (!location) { Alert.alert(tr('Xatolik'), tr('GPS koordinatalari hali aniqlanmadi. Iltimos, kuting.')); return; }
    if (!gpsLocked) {
      Alert.alert(
        tr('Xatolik'),
        gpsTimedOut
          ? tr('GPS aniqligi past. Davom etish uchun "Shu aniqlik bilan davom etish" tugmasini bosing.')
          : tr("GPS qulflanishi kutilmoqda (aniqlik 50 m dan yaxshi bo'lishi kerak).")
      );
      return;
    }
    if (ornidaBartaraf && photos.length === 0) {
      Alert.alert(tr('Xatolik'), tr("O'rnida bartaraf etilgan muammo uchun 'keyin' foto majburiy."));
      return;
    }
    if (!ornidaBartaraf && !isValidMuddat(muddat.trim())) {
      Alert.alert(tr('Xatolik'), tr("Bartaraf etish muddatini YYYY-MM-DD formatida kiriting (masalan, 2025-01-31)."));
      return;
    }

    setSubmitting(true);
    try {
      const yozuv: NavbatYozuvi = {
        client_uuid: generateUuid(),
        xonadon_id: parseInt(selectedXonadonId, 10),
        turi,
        xavf,
        tavsif: tavsif.trim(),
        lat: location.lat,
        lng: location.lon,
        gps_aniqlik: location.accuracy,
        mock_gps: mockGps,
        ornida_bartaraf: ornidaBartaraf,
        muddat: ornidaBartaraf ? null : muddat.trim(),
        foto_paths: photos.map(p => p.uri),
        status: 'kutilmoqda',
        urinishlar_soni: 0,
        xato: null,
        yaratilgan: new Date().toISOString(),
      };

      // Avval lokal navbatga yoziladi — internet bo'lmasa ham yozuv yo'qolmaydi
      await muammoniNavbatgaQosh(yozuv);
      setPendingCount(await getKutilmaganSoni());

      Alert.alert(
        tr('Saqlandi'),
        tr("Muammo qurilmaga saqlandi. Internet bo'lsa avtomatik yuboriladi."),
        [{ text: 'OK', onPress: () => navigation.goBack() }],
      );
      // Net bo'lsa darhol yuborishga urinamiz (natijani kutmagan holda)
      syncNow();
    } catch (err: any) {
      Alert.alert(tr('Xatolik'), err.message || tr('Saqlashda xatolik yuz berdi'));
    } finally {
      setSubmitting(false);
    }
  };

  const gpsStatusColor = locError ? Colors.danger : gpsLocked ? Colors.success : gpsTimedOut ? Colors.accent : Colors.primary;

  return (
    <SafeAreaView style={styles.safe}>
      <OfflineBanner isOffline={isOffline} pendingCount={pendingCount} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Xonadon ID */}
        <Text style={styles.label}>{tr('Xonadon ID')}</Text>
        <View style={styles.inputWrapper}>
          <MaterialCommunityIcons name="identifier" size={20} color={Colors.textMuted} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            value={selectedXonadonId}
            onChangeText={setSelectedXonadonId}
            placeholder="123"
            placeholderTextColor={Colors.textMuted}
            keyboardType="numeric"
            editable={!xonadonId}
          />
        </View>

        {/* Turi */}
        <Text style={styles.label}>{tr('Muammo turi')}</Text>
        <View style={styles.chipRow}>
          {TUR_OPTIONS(tr).map(t => {
            const active = turi === t.key;
            return (
              <TouchableOpacity
                key={t.key}
                style={[
                  styles.chip,
                  active && { backgroundColor: Colors.primary, borderColor: Colors.primary },
                ]}
                onPress={() => setTuri(t.key)}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons
                  name={t.icon}
                  size={15}
                  color={active ? Colors.textInverse : Colors.textSecondary}
                  style={{ marginRight: 4 }}
                />
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{t.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Xavf */}
        <Text style={styles.label}>{tr('Xavf darajasi')}</Text>
        <View style={styles.xavfRow}>
          {XAVF_OPTIONS(tr).map(x => {
            const active = xavf === x.value;
            return (
              <TouchableOpacity
                key={x.value}
                style={[
                  styles.xavfChip,
                  active && { backgroundColor: x.color, borderColor: x.color },
                ]}
                onPress={() => setXavf(x.value)}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons
                  name={x.icon}
                  size={16}
                  color={active ? Colors.textInverse : x.color}
                  style={{ marginRight: 4 }}
                />
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{x.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Tavsif */}
        <Text style={styles.label}>{tr('Tavsif')}</Text>
        <View style={[styles.inputWrapper, styles.textareaWrapper]}>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={tavsif}
            onChangeText={setTavsif}
            placeholder={tr('Muammo haqida batafsil yozing...')}
            placeholderTextColor={Colors.textMuted}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* O'rnida bartaraf */}
        <View style={styles.toggleRow}>
          <View style={{ flex: 1, marginRight: 12 }}>
            <Text style={styles.label}>{tr("O'rnida bartaraf etildimi?")}</Text>
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
              if (v) setMuddat('');
            }}
            trackColor={{ false: Colors.border, true: Colors.primaryLight }}
            thumbColor={Colors.textInverse}
          />
        </View>

        {/* Muddat */}
        {!ornidaBartaraf && (
          <>
            <Text style={styles.label}>{tr('Bartaraf etish muddati')}</Text>
            <View style={styles.inputWrapper}>
              <MaterialCommunityIcons name="calendar-clock" size={20} color={Colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={muddat}
                onChangeText={setMuddat}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={Colors.textMuted}
                keyboardType="numbers-and-punctuation"
                maxLength={10}
                autoCapitalize="none"
              />
            </View>
          </>
        )}

        {/* GPS */}
        <Text style={styles.label}>{tr('GPS koordinatalari')}</Text>
        <View style={[styles.gpsBox, { borderLeftColor: gpsStatusColor }]}>
          {locError ? (
            <View style={styles.gpsContent}>
              <MaterialCommunityIcons name="crosshairs-off" size={18} color={Colors.danger} style={{ marginRight: 8 }} />
              <Text style={styles.gpsError}>{locError}</Text>
            </View>
          ) : location ? (
            <View style={{ width: '100%' }}>
              <View style={styles.gpsContent}>
                <MaterialCommunityIcons
                  name={gpsLocked ? 'crosshairs-gps' : 'crosshairs-question'}
                  size={18}
                  color={gpsStatusColor}
                  style={{ marginRight: 8 }}
                />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.gpsText, { color: gpsStatusColor }]}>
                    Lat: {location.lat.toFixed(6)}, Lon: {location.lon.toFixed(6)}
                  </Text>
                  <Text style={styles.gpsAccuracy}>
                    Aniqlik: ±{location.accuracy.toFixed(0)} m —{' '}
                    {gpsLocked ? tr('qulflangan') : tr('aniqlanmoqda...')}
                  </Text>
                </View>
                {!gpsLocked && <ActivityIndicator size="small" color={Colors.primary} />}
              </View>
              {mockGps && (
                <View style={[styles.gpsContent, { marginTop: 6 }]}>
                  <MaterialCommunityIcons name="alert" size={14} color={Colors.danger} style={{ marginRight: 6 }} />
                  <Text style={styles.gpsError}>{tr('Soxta (mock) GPS aniqlandi')}</Text>
                </View>
              )}
              {gpsTimedOut && !gpsLocked && (
                <View style={styles.gpsTimeoutBox}>
                  <Text style={styles.gpsTimeoutText}>
                    {tr('20 soniyada yuqori aniqlikka erishilmadi.')}
                  </Text>
                  <TouchableOpacity style={styles.gpsTimeoutBtn} onPress={continueWithLowAccuracy} activeOpacity={0.8}>
                    <Text style={styles.gpsTimeoutBtnText}>{tr('Shu aniqlik bilan davom etish')}</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.gpsContent}>
              <ActivityIndicator size="small" color={Colors.primary} style={{ marginRight: 8 }} />
              <Text style={styles.gpsAccuracy}>{tr('GPS aniqlanmoqda...')}</Text>
            </View>
          )}
        </View>

        {/* Photos */}
        <Text style={styles.label}>
          {tr('Fotosuratlar')} ({photos.length}){ornidaBartaraf ? tr(' — majburiy') : ''}
        </Text>
        <View style={styles.photoRow}>
          {photos.map((p, i) => (
            <TouchableOpacity key={i} onPress={() => removePhoto(i)} activeOpacity={0.7}>
              <View>
                <Image source={{ uri: p.uri }} style={styles.thumb} />
                <View style={styles.removeBadge}>
                  <MaterialCommunityIcons name="close" size={10} color={Colors.textInverse} />
                </View>
              </View>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.cameraBtn} onPress={takePhoto} activeOpacity={0.7}>
            <MaterialCommunityIcons name="camera-plus" size={26} color={Colors.primary} />
            <Text style={styles.cameraLabel}>{tr('Rasm olish')}</Text>
          </TouchableOpacity>
        </View>

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitBtn, submitting && { opacity: 0.65 }]}
          onPress={handleSubmit}
          disabled={submitting}
          activeOpacity={0.8}
        >
          {submitting ? (
            <ActivityIndicator color={Colors.textInverse} />
          ) : (
            <View style={styles.submitContent}>
              <MaterialCommunityIcons name="content-save" size={20} color={Colors.textInverse} style={{ marginRight: 8 }} />
              <Text style={styles.submitText}>{tr('Muammoni saqlash')}</Text>
            </View>
          )}
        </TouchableOpacity>

        <SyncIndicator isSyncing={isSyncing} lastSync={lastSync} />
      </ScrollView>

      {/* Fullscreen camera modal */}
      <Modal
        visible={cameraVisible}
        animationType="slide"
        onRequestClose={() => setCameraVisible(false)}
      >
        <View style={styles.cameraContainer}>
          <CameraView ref={cameraRef} style={styles.cameraPreview} facing="back" />
          <SafeAreaView style={styles.cameraOverlay}>
            <View style={styles.cameraTopBar}>
              <TouchableOpacity
                style={styles.cameraCloseBtn}
                onPress={() => setCameraVisible(false)}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons name="close" size={24} color={Colors.textInverse} />
              </TouchableOpacity>
            </View>
            <View style={styles.cameraControls}>
              <TouchableOpacity
                style={styles.shutterBtn}
                onPress={capturePhoto}
                disabled={capturing}
                activeOpacity={0.8}
              >
                {capturing ? (
                  <ActivityIndicator color={Colors.primary} />
                ) : (
                  <View style={styles.shutterInner} />
                )}
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, paddingBottom: 50, gap: 10 },
  label: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semibold,
    fontFamily: Fonts.heading,
    color: Colors.textPrimary,
    marginTop: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
  },
  textareaWrapper: { alignItems: 'flex-start' },
  inputIcon: { marginLeft: Spacing.md },
  input: {
    flex: 1,
    paddingVertical: 13,
    paddingHorizontal: Spacing.md,
    fontSize: FontSizes.base,
    fontFamily: Fonts.body,
    color: Colors.textPrimary,
  },
  textArea: { height: 110 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  chipText: { fontSize: FontSizes.xs, fontWeight: FontWeights.medium, fontFamily: Fonts.body, color: Colors.textSecondary },
  chipTextActive: { color: Colors.textInverse },
  xavfRow: { flexDirection: 'row', gap: 8 },
  xavfChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    marginTop: 4,
  },
  toggleHint: {
    fontSize: FontSizes.xs,
    fontFamily: Fonts.body,
    color: Colors.textMuted,
    marginTop: 2,
  },
  gpsBox: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    borderLeftWidth: 4,
    padding: 14,
    alignItems: 'center',
  },
  gpsContent: { flexDirection: 'row', alignItems: 'center' },
  gpsText: { fontSize: FontSizes.sm, fontFamily: Fonts.mono || Fonts.body, fontWeight: FontWeights.medium },
  gpsAccuracy: { fontSize: FontSizes.xs, fontFamily: Fonts.body, color: Colors.textSecondary, marginTop: 2 },
  gpsError: { fontSize: FontSizes.sm, fontFamily: Fonts.body, color: Colors.danger },
  gpsTimeoutBox: {
    marginTop: 10,
    backgroundColor: Colors.accentSurface,
    borderRadius: Radius.sm,
    padding: 10,
  },
  gpsTimeoutText: { fontSize: FontSizes.xs, fontFamily: Fonts.body, color: Colors.textPrimary, marginBottom: 8 },
  gpsTimeoutBtn: {
    backgroundColor: Colors.accent,
    borderRadius: Radius.sm,
    paddingVertical: 8,
    alignItems: 'center',
  },
  gpsTimeoutBtnText: { color: Colors.primary, fontSize: FontSizes.xs, fontWeight: FontWeights.semibold, fontFamily: Fonts.body },
  photoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  thumb: { width: 76, height: 76, borderRadius: Radius.md },
  removeBadge: {
    position: 'absolute', top: -6, right: -6,
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: Colors.danger, alignItems: 'center', justifyContent: 'center',
    ...Shadows.sm,
  },
  cameraBtn: {
    width: 76, height: 76, borderRadius: Radius.md,
    borderWidth: 1.5, borderColor: Colors.border, borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surface,
  },
  cameraLabel: { fontSize: 10, fontFamily: Fonts.body, color: Colors.textMuted, marginTop: 2 },
  cameraContainer: { flex: 1, backgroundColor: '#000' },
  cameraPreview: { flex: 1 },
  cameraOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
  },
  cameraTopBar: { alignItems: 'flex-end', padding: Spacing.md },
  cameraCloseBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center', justifyContent: 'center',
  },
  cameraControls: { alignItems: 'center', paddingBottom: Spacing.xl },
  shutterBtn: {
    width: 72, height: 72, borderRadius: 36,
    borderWidth: 4, borderColor: Colors.textInverse,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  shutterInner: {
    width: 54, height: 54, borderRadius: 27,
    backgroundColor: Colors.textInverse,
  },
  submitBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    padding: 17,
    alignItems: 'center',
    marginTop: 14,
    ...Shadows.md,
  },
  submitContent: { flexDirection: 'row', alignItems: 'center' },
  submitText: { color: Colors.textInverse, fontSize: FontSizes.md, fontWeight: FontWeights.bold, fontFamily: Fonts.heading },
});

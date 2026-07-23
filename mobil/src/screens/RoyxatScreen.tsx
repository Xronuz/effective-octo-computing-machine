import React, { useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, Image,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import api from '../services/api';
import FormField from '../components/FormField';
import Button from '../components/Button';
import { Colors, Fonts, FontSizes, FontWeights, Spacing, Radius, Shadows } from '../theme';
import type { ApiResponse } from '../types';
import { useAlifbo } from '../contexts/AlifboContext';

interface RoyxatResponse {
  id: number;
  guvohnoma_raqami: string;
  holat: string;
  xabar: string;
}

interface FormState {
  familiya: string;
  ism: string;
  sharif: string;
  lavozim: string;
  telefon: string;
  guvohnoma_raqami: string;
  parol: string;
  parol_tasdiq: string;
}

const INITIAL_FORM: FormState = {
  familiya: '',
  ism: '',
  sharif: '',
  lavozim: '',
  telefon: '',
  guvohnoma_raqami: '',
  parol: '',
  parol_tasdiq: '',
};

export default function RoyxatScreen({ navigation }: any) {
  const { tr } = useAlifbo();
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [errors, setErrors] = useState<Partial<FormState>>({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Selfi — faqat oldingi kamera
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraOpen, setCameraOpen] = useState(false);
  const [selfiUri, setSelfiUri] = useState<string | null>(null);
  const cameraRef = useRef<CameraView>(null);

  const setField = (key: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const validate = (): boolean => {
    const e: Partial<FormState> = {};
    if (!form.familiya.trim()) e.familiya = tr('Familiyani kiriting');
    if (!form.ism.trim()) e.ism = tr('Ismingizni kiriting');
    if (form.lavozim.trim().length < 2) e.lavozim = tr('Lavozimingizni kiriting');
    if (!/^[A-Z0-9]{3,20}$/.test(form.guvohnoma_raqami.trim().toUpperCase())) {
      e.guvohnoma_raqami = tr("Guvohnoma raqami 3-20 ta harf/raqamdan iborat bo'lsin");
    }
    if (form.parol.length < 8) e.parol = tr("Parol kamida 8 ta belgidan iborat bo'lsin");
    else if (!/[A-Za-z]/.test(form.parol) || !/[0-9]/.test(form.parol)) {
      e.parol = tr("Parol kamida bitta harf va bitta raqamdan iborat bo'lsin");
    }
    if (form.parol !== form.parol_tasdiq) e.parol_tasdiq = tr('Parollar bir xil emas');
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const openCamera = async () => {
    if (!permission?.granted) {
      const res = await requestPermission();
      if (!res.granted) {
        setServerError("Selfi olish uchun kamera ruxsati kerak");
        return;
      }
    }
    setServerError('');
    setCameraOpen(true);
  };

  const takeSelfi = async () => {
    try {
      const photo = await cameraRef.current?.takePictureAsync({ quality: 0.7 });
      if (photo?.uri) {
        setSelfiUri(photo.uri);
        setCameraOpen(false);
      }
    } catch {
      setServerError('Selfi olishda xatolik yuz berdi');
    }
  };

  const handleSubmit = async () => {
    setServerError('');
    if (!validate()) return;
    if (!selfiUri) {
      setServerError("Iltimos, oldingi kamera orqali selfi oling");
      return;
    }

    setLoading(true);
    try {
      // Backend /api/auth/royxat multipart/form-data qabul qiladi (selfi majburiy)
      const formData = new FormData();
      formData.append('familiya', form.familiya.trim());
      formData.append('ism', form.ism.trim());
      if (form.sharif.trim()) formData.append('sharif', form.sharif.trim());
      formData.append('lavozim', form.lavozim.trim());
      if (form.telefon.trim()) formData.append('telefon', form.telefon.trim());
      formData.append('guvohnoma_raqami', form.guvohnoma_raqami.trim().toUpperCase());
      formData.append('parol', form.parol);
      formData.append('selfi', {
        uri: selfiUri,
        name: 'selfi.jpg',
        type: 'image/jpeg',
      } as any);

      const { data } = await api.post<ApiResponse<RoyxatResponse>>('/auth/royxat', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (data.ok) {
        setSuccess(true);
      } else {
        setServerError(data.xato || "Ro'yxatdan o'tishda xatolik");
      }
    } catch (err: any) {
      const msg =
        err?.response?.data?.xato ||
        err?.response?.data?.detail ||
        "Server bilan bog'lanishda xatolik. Qaytadan urinib ko'ring.";
      setServerError(typeof msg === 'string' ? msg : "Ro'yxatdan o'tishda xatolik");
    } finally {
      setLoading(false);
    }
  };

  // ── Muvaffaqiyat holati ──────────────────────────
  if (success) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.successBox}>
          <View style={styles.successIcon}>
            <MaterialCommunityIcons name="clock-check-outline" size={56} color={Colors.success} />
          </View>
          <Text style={styles.successTitle}>So'rovingiz qabul qilindi</Text>
          <Text style={styles.successText}>
            Hisobingiz tasdiqlanishini kuting. Administrator tasdiqlagach, guvohnoma raqamingiz va parolingiz bilan tizimga kirishingiz mumkin.
          </Text>
          <Button
            title="Kirish sahifasiga qaytish"
            icon="login"
            onPress={() => navigation.navigate('Login')}
            style={{ alignSelf: 'stretch' }}
          />
        </View>
      </SafeAreaView>
    );
  }

  // ── Kamera oynasi (faqat oldingi kamera) ─────────
  if (cameraOpen) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.cameraContainer}>
          <CameraView ref={cameraRef} style={styles.camera} facing="front" />
          <View style={styles.cameraOverlay}>
            <Text style={styles.cameraHint}>Yuzingizni kameraga qarating</Text>
            <View style={styles.cameraButtons}>
              <TouchableOpacity style={styles.cameraCancel} onPress={() => setCameraOpen(false)} activeOpacity={0.8}>
                <MaterialCommunityIcons name="close" size={22} color={Colors.textInverse} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.shutter} onPress={takeSelfi} activeOpacity={0.8}>
                <View style={styles.shutterInner} />
              </TouchableOpacity>
              <View style={styles.cameraCancel} />
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {/* Sarlavha */}
          <View style={styles.headerArea}>
            <View style={styles.logoCircle}>
              <MaterialCommunityIcons name="account-plus" size={36} color={Colors.accent} />
            </View>
            <Text style={styles.title}>{tr("Ro'yxatdan o'tish")}</Text>
            <Text style={styles.subtitle}>{tr('Yangi xodim hisobi yarating')}</Text>
          </View>

          <View style={styles.card}>
            <FormField
              label="Familiya *"
              value={form.familiya}
              onChangeText={(v) => setField('familiya', v)}
              placeholder={tr('Familiyangiz')}
              autoCapitalize="words"
              error={errors.familiya}
              editable={!loading}
            />
            <FormField
              label="Ism *"
              value={form.ism}
              onChangeText={(v) => setField('ism', v)}
              placeholder={tr('Ismingiz')}
              autoCapitalize="words"
              error={errors.ism}
              editable={!loading}
            />
            <FormField
              label="Sharif"
              value={form.sharif}
              onChangeText={(v) => setField('sharif', v)}
              placeholder={tr('Otangizning ismi')}
              autoCapitalize="words"
              editable={!loading}
            />
            <FormField
              label="Lavozim *"
              value={form.lavozim}
              onChangeText={(v) => setField('lavozim', v)}
              placeholder={tr('Masalan: MFY inspektori')}
              error={errors.lavozim}
              editable={!loading}
            />
            <FormField
              label="Telefon"
              value={form.telefon}
              onChangeText={(v) => setField('telefon', v)}
              placeholder={tr('+998 90 123 45 67')}
              keyboardType="phone-pad"
              editable={!loading}
            />
            <FormField
              label="Guvohnoma raqami *"
              value={form.guvohnoma_raqami}
              onChangeText={(v) => setField('guvohnoma_raqami', v)}
              placeholder={tr('Masalan: AB1234567')}
              autoCapitalize="characters"
              autoCorrect={false}
              error={errors.guvohnoma_raqami}
              editable={!loading}
            />
            <FormField
              label="Parol *"
              value={form.parol}
              onChangeText={(v) => setField('parol', v)}
              placeholder={tr('Kamida 8 belgi, harf va raqam')}
              secureTextEntry
              error={errors.parol}
              editable={!loading}
            />
            <FormField
              label="Parolni tasdiqlang *"
              value={form.parol_tasdiq}
              onChangeText={(v) => setField('parol_tasdiq', v)}
              placeholder={tr('Parolni qayta kiriting')}
              secureTextEntry
              error={errors.parol_tasdiq}
              editable={!loading}
            />

            {/* Selfi bloki */}
            <View style={styles.selfiBlock}>
              <Text style={styles.selfiLabel}>{tr('Selfi (oldingi kamera) *')}</Text>
              {selfiUri ? (
                <View style={styles.selfiPreviewRow}>
                  <Image source={{ uri: selfiUri }} style={styles.selfiPreview} />
                  <TouchableOpacity style={styles.selfiRetake} onPress={openCamera} activeOpacity={0.8}>
                    <MaterialCommunityIcons name="camera-retake" size={18} color={Colors.primary} />
                    <Text style={styles.selfiRetakeText}>{tr('Qayta olish')}</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity style={styles.selfiButton} onPress={openCamera} activeOpacity={0.8}>
                  <MaterialCommunityIcons name="camera-front" size={28} color={Colors.primary} />
                  <Text style={styles.selfiButtonText}>{tr('Selfi olish')}</Text>
                  <Text style={styles.selfiButtonHint}>{tr('Faqat oldingi kamera orqali')}</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Server xatosi */}
            {serverError ? (
              <View style={styles.errorBox}>
                <MaterialCommunityIcons name="alert-circle" size={18} color={Colors.danger} style={{ marginRight: 6 }} />
                <Text style={styles.errorText}>{serverError}</Text>
              </View>
            ) : null}

            <Button
              title={tr("Ro'yxatdan o'tish")}
              icon="account-check"
              loading={loading}
              onPress={handleSubmit}
            />

            <TouchableOpacity
              style={styles.backLink}
              onPress={() => navigation.goBack()}
              disabled={loading}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons name="arrow-left" size={16} color={Colors.textLink} />
              <Text style={styles.backLinkText}>{tr('Kirish sahifasiga qaytish')}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  content: { flexGrow: 1, padding: Spacing.xl, paddingBottom: Spacing['4xl'] },
  headerArea: { alignItems: 'center', marginBottom: Spacing.xl },
  logoCircle: {
    width: 72, height: 72, borderRadius: 20,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.md,
    ...Shadows.lg,
  },
  title: {
    fontSize: FontSizes['2xl'], fontWeight: FontWeights.extrabold,
    fontFamily: Fonts.heading, color: Colors.textPrimary,
  },
  subtitle: { fontSize: FontSizes.base, fontFamily: Fonts.body, color: Colors.textSecondary, marginTop: 4 },
  card: {
    backgroundColor: Colors.surface, borderRadius: Radius.xl,
    padding: Spacing.xl, gap: Spacing.base,
    ...Shadows.md,
  },
  selfiBlock: { gap: Spacing.xs },
  selfiLabel: {
    fontSize: FontSizes.sm, fontWeight: FontWeights.semibold,
    fontFamily: Fonts.heading, color: Colors.textPrimary,
  },
  selfiButton: {
    borderWidth: 1.5, borderColor: Colors.primary, borderStyle: 'dashed',
    borderRadius: Radius.md, padding: Spacing.xl,
    alignItems: 'center', gap: Spacing.xs,
    backgroundColor: Colors.primarySurface,
  },
  selfiButtonText: {
    fontSize: FontSizes.base, fontWeight: FontWeights.semibold,
    fontFamily: Fonts.heading, color: Colors.primary,
  },
  selfiButtonHint: {
    fontSize: FontSizes.xs, fontFamily: Fonts.body, color: Colors.textMuted,
  },
  selfiPreviewRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.base },
  selfiPreview: {
    width: 96, height: 96, borderRadius: Radius.md,
    borderWidth: 2, borderColor: Colors.success,
  },
  selfiRetake: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md,
    borderWidth: 1, borderColor: Colors.primary, borderRadius: Radius.md,
  },
  selfiRetakeText: {
    fontSize: FontSizes.sm, fontWeight: FontWeights.semibold,
    fontFamily: Fonts.body, color: Colors.primary,
  },
  errorBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.dangerSurface,
    paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md,
    borderRadius: Radius.sm,
  },
  errorText: {
    flex: 1, fontSize: FontSizes.sm, fontFamily: Fonts.body,
    color: Colors.danger, fontWeight: FontWeights.medium,
  },
  backLink: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: Spacing.sm,
  },
  backLinkText: {
    fontSize: FontSizes.sm, fontFamily: Fonts.body,
    color: Colors.textLink, fontWeight: FontWeights.medium,
  },
  // Kamera
  cameraContainer: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
  cameraOverlay: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    paddingBottom: Spacing['3xl'], paddingTop: Spacing.xl,
    alignItems: 'center', gap: Spacing.xl,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  cameraHint: {
    fontSize: FontSizes.base, fontFamily: Fonts.body, color: Colors.textInverse,
  },
  cameraButtons: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing['3xl'],
  },
  cameraCancel: {
    width: 48, height: 48, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center',
  },
  shutter: {
    width: 76, height: 76, borderRadius: 38,
    borderWidth: 4, borderColor: Colors.textInverse,
    alignItems: 'center', justifyContent: 'center',
  },
  shutterInner: {
    width: 58, height: 58, borderRadius: 29,
    backgroundColor: Colors.textInverse,
  },
  // Muvaffaqiyat
  successBox: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    padding: Spacing['2xl'], gap: Spacing.base,
  },
  successIcon: {
    width: 104, height: 104, borderRadius: 52,
    backgroundColor: Colors.successSurface,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  successTitle: {
    fontSize: FontSizes.xl, fontWeight: FontWeights.bold,
    fontFamily: Fonts.heading, color: Colors.textPrimary,
  },
  successText: {
    fontSize: FontSizes.base, fontFamily: Fonts.body,
    color: Colors.textSecondary, textAlign: 'center',
    lineHeight: 22, marginBottom: Spacing.md,
  },
});

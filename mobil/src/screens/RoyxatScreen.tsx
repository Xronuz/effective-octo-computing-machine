import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '../services/api';
import FormField from '../components/FormField';
import Button from '../components/Button';
import { Fonts, FontSizes, FontWeights, Spacing, Radius, Shadows } from '../theme';
import type { ApiResponse } from '../types';
import { useAlifbo } from '../contexts/AlifboContext';
import { useAppNavigation } from '../navigation/hooks';
import { useTheme } from '../contexts/ThemeContext';

interface RoyxatResponse {
  id: number;
  guvohnoma_raqami: string;
  holat: string;
  xabar: string;
}

const registerSchema = z
  .object({
    familiya: z.string().min(1, 'Familiyani kiriting'),
    ism: z.string().min(1, 'Ismingizni kiriting'),
    sharif: z.string().optional(),
    lavozim: z.string().min(2, 'Lavozimingizni kiriting'),
    telefon: z.string().optional(),
    guvohnoma_raqami: z
      .string()
      .min(3, "Guvohnoma raqami 3-20 ta harf/raqamdan iborat bo'lsin")
      .max(20, "Guvohnoma raqami 3-20 ta harf/raqamdan iborat bo'lsin")
      .regex(/^[A-Za-z0-9]+$/, 'Faqat harf va raqamlar ruxsat etiladi'),
    parol: z
      .string()
      .min(8, "Parol kamida 8 ta belgidan iborat bo'lsin")
      .regex(/[A-Za-z]/, "Parol kamida bitta harfdan iborat bo'lsin")
      .regex(/[0-9]/, "Parol kamida bitta raqamdan iborat bo'lsin"),
    parol_tasdiq: z.string().min(1, 'Parolni tasdiqlang'),
  })
  .refine((data) => data.parol === data.parol_tasdiq, {
    message: 'Parollar bir xil emas',
    path: ['parol_tasdiq'],
  });

type RegisterForm = z.infer<typeof registerSchema>;

export default function RoyxatScreen() {
  const navigation = useAppNavigation();
  const { tr } = useAlifbo();
  const { colors } = useTheme();

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      familiya: '',
      ism: '',
      sharif: '',
      lavozim: '',
      telefon: '',
      guvohnoma_raqami: '',
      parol: '',
      parol_tasdiq: '',
    },
  });

  const [success, setSuccess] = useState(false);

  const [permission, requestPermission] = useCameraPermissions();
  const [cameraOpen, setCameraOpen] = useState(false);
  const [selfiUri, setSelfiUri] = useState<string | null>(null);
  const cameraRef = useRef<CameraView>(null);

  const openCamera = async () => {
    if (!permission?.granted) {
      const res = await requestPermission();
      if (!res.granted) {
        setError('root', { message: 'Selfi olish uchun kamera ruxsati kerak' });
        return;
      }
    }
    setError('root', { message: '' });
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
      setError('root', { message: 'Selfi olishda xatolik yuz berdi' });
    }
  };

  const onSubmit = async (data: RegisterForm) => {
    if (!selfiUri) {
      setError('root', { message: 'Iltimos, oldingi kamera orqali selfi oling' });
      return;
    }

    try {
      const formData = new FormData();
      formData.append('familiya', data.familiya.trim());
      formData.append('ism', data.ism.trim());
      if (data.sharif?.trim()) formData.append('sharif', data.sharif.trim());
      formData.append('lavozim', data.lavozim.trim());
      if (data.telefon?.trim()) formData.append('telefon', data.telefon.trim());
      formData.append('guvohnoma_raqami', data.guvohnoma_raqami.trim().toUpperCase());
      formData.append('parol', data.parol);
      formData.append('selfi', {
        uri: selfiUri,
        name: 'selfi.jpg',
        type: 'image/jpeg',
      } as unknown as Blob);

      const response = await api.post<ApiResponse<RoyxatResponse>>('/auth/royxat', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (response.data.ok) {
        setSuccess(true);
      } else {
        setError('root', { message: response.data.xato || "Ro'yxatdan o'tishda xatolik" });
      }
    } catch (err: any) {
      const msg =
        err?.response?.data?.xato ||
        err?.response?.data?.detail ||
        "Server bilan bog'lanishda xatolik. Qaytadan urinib ko'ring.";
      setError('root', { message: typeof msg === 'string' ? msg : "Ro'yxatdan o'tishda xatolik" });
    }
  };

  if (success) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
        <View style={styles.successBox}>
          <View style={[styles.successIcon, { backgroundColor: colors.successSurface }]}>
            <MaterialCommunityIcons name="clock-check-outline" size={64} color={colors.success} />
          </View>
          <Text style={[styles.successTitle, { color: colors.textPrimary }]}>
            So'rovingiz qabul qilindi
          </Text>
          <Text style={[styles.successText, { color: colors.textSecondary }]}>
            Hisobingiz tasdiqlanishini kuting. Administrator tasdiqlagach, guvohnoma raqamingiz va
            parolingiz bilan tizimga kirishingiz mumkin.
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

  if (cameraOpen) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
        <View style={styles.cameraContainer}>
          <CameraView ref={cameraRef} style={styles.camera} facing="front" />
          <View style={styles.cameraOverlay}>
            <Text style={[styles.cameraHint, { color: colors.textInverse }]}>
              Yuzingizni kameraga qarating
            </Text>
            <View style={styles.cameraButtons}>
              <TouchableOpacity
                style={styles.cameraCancel}
                onPress={() => setCameraOpen(false)}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons name="close" size={24} color={colors.textInverse} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.shutter} onPress={takeSelfi} activeOpacity={0.8}>
                <View style={[styles.shutterInner, { backgroundColor: colors.textInverse }]} />
              </TouchableOpacity>
              <View style={styles.cameraCancel} />
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {/* Sarlavha */}
          <View style={styles.headerArea}>
            <View style={[styles.logoCircle, { backgroundColor: colors.primary }, Shadows.lg]}>
              <MaterialCommunityIcons name="account-plus" size={40} color={colors.accent} />
            </View>
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              {tr("Ro'yxatdan o'tish")}
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {tr('Yangi xodim hisobi yarating')}
            </Text>
          </View>

          <View style={[styles.card, { backgroundColor: colors.surface }, Shadows.md]}>
            <Controller
              control={control}
              name="familiya"
              render={({ field: { onChange, onBlur, value } }) => (
                <FormField
                  label="Familiya *"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder={tr('Familiyangiz')}
                  autoCapitalize="words"
                  error={errors.familiya?.message}
                  editable={!isSubmitting}
                />
              )}
            />
            <Controller
              control={control}
              name="ism"
              render={({ field: { onChange, onBlur, value } }) => (
                <FormField
                  label="Ism *"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder={tr('Ismingiz')}
                  autoCapitalize="words"
                  error={errors.ism?.message}
                  editable={!isSubmitting}
                />
              )}
            />
            <Controller
              control={control}
              name="sharif"
              render={({ field: { onChange, onBlur, value } }) => (
                <FormField
                  label="Sharif"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder={tr('Otangizning ismi')}
                  autoCapitalize="words"
                  editable={!isSubmitting}
                />
              )}
            />
            <Controller
              control={control}
              name="lavozim"
              render={({ field: { onChange, onBlur, value } }) => (
                <FormField
                  label="Lavozim *"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder={tr('Masalan: MFY inspektori')}
                  error={errors.lavozim?.message}
                  editable={!isSubmitting}
                />
              )}
            />
            <Controller
              control={control}
              name="telefon"
              render={({ field: { onChange, onBlur, value } }) => (
                <FormField
                  label="Telefon"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder={tr('+998 90 123 45 67')}
                  keyboardType="phone-pad"
                  editable={!isSubmitting}
                />
              )}
            />
            <Controller
              control={control}
              name="guvohnoma_raqami"
              render={({ field: { onChange, onBlur, value } }) => (
                <FormField
                  label="Guvohnoma raqami *"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder={tr('Masalan: AB1234567')}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  error={errors.guvohnoma_raqami?.message}
                  editable={!isSubmitting}
                />
              )}
            />
            <Controller
              control={control}
              name="parol"
              render={({ field: { onChange, onBlur, value } }) => (
                <FormField
                  label="Parol *"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder={tr('Kamida 8 belgi, harf va raqam')}
                  secureTextEntry
                  error={errors.parol?.message}
                  editable={!isSubmitting}
                />
              )}
            />
            <Controller
              control={control}
              name="parol_tasdiq"
              render={({ field: { onChange, onBlur, value } }) => (
                <FormField
                  label="Parolni tasdiqlang *"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder={tr('Parolni qayta kiriting')}
                  secureTextEntry
                  error={errors.parol_tasdiq?.message}
                  editable={!isSubmitting}
                />
              )}
            />

            {/* Selfi bloki */}
            <View style={styles.selfiBlock}>
              <Text style={[styles.selfiLabel, { color: colors.textPrimary }]}>
                {tr('Selfi (oldingi kamera) *')}
              </Text>
              {selfiUri ? (
                <View style={styles.selfiPreviewRow}>
                  <Image source={{ uri: selfiUri }} style={styles.selfiPreview} />
                  <TouchableOpacity
                    style={[styles.selfiRetake, { borderColor: colors.primary }]}
                    onPress={openCamera}
                    activeOpacity={0.8}
                  >
                    <MaterialCommunityIcons name="camera-retake" size={20} color={colors.primary} />
                    <Text style={[styles.selfiRetakeText, { color: colors.primary }]}>
                      {tr('Qayta olish')}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={[
                    styles.selfiButton,
                    { borderColor: colors.primary, backgroundColor: colors.primarySurface },
                  ]}
                  onPress={openCamera}
                  activeOpacity={0.8}
                >
                  <MaterialCommunityIcons name="camera-front" size={32} color={colors.primary} />
                  <Text style={[styles.selfiButtonText, { color: colors.primary }]}>
                    {tr('Selfi olish')}
                  </Text>
                  <Text style={[styles.selfiButtonHint, { color: colors.textMuted }]}>
                    {tr('Faqat oldingi kamera orqali')}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Server xatosi */}
            {errors.root?.message ? (
              <View style={[styles.errorBox, { backgroundColor: colors.dangerSurface }]}>
                <MaterialCommunityIcons
                  name="alert-circle"
                  size={20}
                  color={colors.danger}
                  style={{ marginRight: 8 }}
                />
                <Text style={[styles.errorText, { color: colors.danger }]}>
                  {errors.root.message}
                </Text>
              </View>
            ) : null}

            <Button
              title={tr("Ro'yxatdan o'tish")}
              icon="account-check"
              loading={isSubmitting}
              onPress={handleSubmit(onSubmit)}
            />

            <TouchableOpacity
              style={styles.backLink}
              onPress={() => navigation.goBack()}
              disabled={isSubmitting}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons name="arrow-left" size={18} color={colors.textLink} />
              <Text style={[styles.backLinkText, { color: colors.textLink }]}>
                {tr('Kirish sahifasiga qaytish')}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  content: { flexGrow: 1, padding: Spacing.xl, paddingBottom: Spacing['4xl'] },
  headerArea: { alignItems: 'center', marginBottom: Spacing.xl },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: FontSizes['2xl'],
    fontWeight: FontWeights.extrabold,
    fontFamily: Fonts.heading,
  },
  subtitle: {
    fontSize: FontSizes.base,
    fontFamily: Fonts.body,
    marginTop: 6,
  },
  card: {
    borderRadius: Radius['2xl'],
    padding: Spacing.xl,
    gap: Spacing.lg,
  },
  selfiBlock: { gap: Spacing.xs },
  selfiLabel: {
    fontSize: FontSizes.base,
    fontWeight: FontWeights.semibold,
    fontFamily: Fonts.heading,
  },
  selfiButton: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: Radius.md,
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.xs,
  },
  selfiButtonText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    fontFamily: Fonts.heading,
  },
  selfiButtonHint: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.body,
  },
  selfiPreviewRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.base },
  selfiPreview: {
    width: 104,
    height: 104,
    borderRadius: Radius.md,
    borderWidth: 2,
    borderColor: '#2E9E6B',
  },
  selfiRetake: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.base,
    borderWidth: 1,
    borderRadius: Radius.md,
  },
  selfiRetakeText: {
    fontSize: FontSizes.base,
    fontWeight: FontWeights.semibold,
    fontFamily: Fonts.body,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.base,
    borderRadius: Radius.md,
  },
  errorText: {
    flex: 1,
    fontSize: FontSizes.base,
    fontFamily: Fonts.body,
    fontWeight: FontWeights.medium,
  },
  backLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: Spacing.sm,
  },
  backLinkText: {
    fontSize: FontSizes.base,
    fontFamily: Fonts.body,
    fontWeight: FontWeights.medium,
  },
  // Kamera
  cameraContainer: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
  cameraOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingBottom: Spacing['3xl'],
    paddingTop: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.xl,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  cameraHint: {
    fontSize: FontSizes.base,
    fontFamily: Fonts.body,
  },
  cameraButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['3xl'],
  },
  cameraCancel: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  // Muvaffaqiyat
  successBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing['2xl'],
    gap: Spacing.base,
  },
  successIcon: {
    width: 112,
    height: 112,
    borderRadius: 56,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  successTitle: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    fontFamily: Fonts.heading,
  },
  successText: {
    fontSize: FontSizes.base,
    fontFamily: Fonts.body,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: Spacing.md,
  },
});

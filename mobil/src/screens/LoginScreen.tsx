import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../contexts/AuthContext';
import { useAppNavigation } from '../navigation/hooks';
import { useAlifbo } from '../contexts/AlifboContext';
import { useTheme } from '../contexts/ThemeContext';
import { Fonts, FontSizes, FontWeights, Spacing, Radius, Shadows } from '../theme';
import FormField from '../components/FormField';

const loginSchema = z.object({
  guvohnoma: z.string().min(1, 'Guvohnoma raqamini kiriting'),
  parol: z.string().min(1, 'Parolni kiriting'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginScreen() {
  const navigation = useAppNavigation();
  const { login } = useAuth();
  const { tr } = useAlifbo();
  const { colors } = useTheme();

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { guvohnoma: '', parol: '' },
  });

  const onSubmit = async (data: LoginForm) => {
    const err = await login(data.guvohnoma.toUpperCase().trim(), data.parol);
    if (err) {
      setError('root', { message: err });
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {/* Logo */}
          <View style={styles.logoArea}>
            <Image
              source={require('../../assets/fvv-icon.png')}
              style={[styles.logoImage, Shadows.xl]}
              resizeMode="contain"
            />
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              {tr('XAVFSIZ XONADON')}
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {tr("Yong'in va gaz xavfsizligi nazorati tizimi")}
            </Text>
          </View>

          {/* Form */}
          <View style={[styles.card, { backgroundColor: colors.surface }, Shadows.md]}>
            <Controller
              control={control}
              name="guvohnoma"
              render={({ field: { onChange, onBlur, value } }) => (
                <FormField
                  label={tr('Guvohnoma raqami')}
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder={tr('Guvohnoma raqami')}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  editable={!isSubmitting}
                  returnKeyType="next"
                  error={errors.guvohnoma?.message}
                />
              )}
            />

            <Controller
              control={control}
              name="parol"
              render={({ field: { onChange, onBlur, value } }) => (
                <FormField
                  label={tr('Parol')}
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder={tr('Parol')}
                  secureTextEntry
                  editable={!isSubmitting}
                  returnKeyType="go"
                  onSubmitEditing={handleSubmit(onSubmit)}
                  error={errors.parol?.message}
                />
              )}
            />

            {/* Error */}
            {errors.root?.message ? (
              <View style={[styles.errorBox, { backgroundColor: colors.dangerSurface }]}>
                <MaterialCommunityIcons
                  name="alert-circle"
                  size={20}
                  color={colors.danger}
                  style={{ marginRight: 8 }}
                />
                <Text style={[styles.error, { color: colors.danger }]}>{errors.root.message}</Text>
              </View>
            ) : null}

            {/* Submit */}
            <TouchableOpacity
              style={[
                styles.button,
                { backgroundColor: colors.primary },
                isSubmitting && styles.buttonDisabled,
                Shadows.md,
              ]}
              onPress={handleSubmit(onSubmit)}
              disabled={isSubmitting}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={tr('Kirish')}
            >
              {isSubmitting ? (
                <ActivityIndicator color={colors.textInverse} />
              ) : (
                <>
                  <MaterialCommunityIcons
                    name="login"
                    size={22}
                    color={colors.textInverse}
                    style={{ marginRight: 10 }}
                  />
                  <Text style={[styles.buttonText, { color: colors.textInverse }]}>
                    {tr('Kirish')}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {/* Ro'yxatdan o'tish linki */}
            <TouchableOpacity
              style={styles.registerLink}
              onPress={() => navigation.navigate('Royxat')}
              disabled={isSubmitting}
              activeOpacity={0.7}
            >
              <Text style={[styles.registerLinkText, { color: colors.textSecondary }]}>
                {tr("Hisobingiz yo'qmi? ")}
                <Text style={[styles.registerLinkBold, { color: colors.textLink }]}>
                  {tr("Ro'yxatdan o'tish")}
                </Text>
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
  content: { flexGrow: 1, justifyContent: 'center', padding: Spacing.xl },
  logoArea: { alignItems: 'center', marginBottom: Spacing['3xl'] },
  logoImage: {
    width: 96,
    height: 96,
    borderRadius: 28,
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: FontSizes['2xl'],
    fontWeight: FontWeights.extrabold,
    fontFamily: Fonts.heading,
    letterSpacing: 1.5,
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
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.base,
    borderRadius: Radius.md,
  },
  error: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.body,
    fontWeight: FontWeights.medium,
  },
  button: {
    borderRadius: Radius.md,
    paddingVertical: 17,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.xs,
  },
  buttonDisabled: { opacity: 0.55 },
  buttonText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    fontFamily: Fonts.heading,
  },
  registerLink: { alignItems: 'center', paddingVertical: Spacing.sm },
  registerLinkText: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.body,
  },
  registerLinkBold: {
    fontWeight: FontWeights.semibold,
  },
});

import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useAuth } from '../contexts/AuthContext';
import { Colors, Fonts, FontSizes, FontWeights, Spacing, Radius, Shadows } from '../theme';

export default function LoginScreen({ navigation }: any) {
  const { login } = useAuth();
  const [gr, setGr] = useState('');
  const [parol, setParol] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const parolRef = useRef<TextInput>(null);

  const handleLogin = async () => {
    setError('');
    if (!gr.trim() || !parol.trim()) {
      setError("Guvohnoma raqami va parolni kiriting");
      return;
    }
    setLoading(true);
    const err = await login(gr.toUpperCase().trim(), parol);
    setLoading(false);
    if (err) setError(err);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {/* Logo */}
          <View style={styles.logoArea}>
            <View style={styles.logoBlock}>
              <MaterialCommunityIcons name="shield-home" size={44} color={Colors.accent} />
            </View>
            <Text style={styles.title}>XAVFSIZ XONADON</Text>
            <Text style={styles.subtitle}>Yong'in va gaz xavfsizligi nazorati tizimi</Text>
          </View>

          {/* Form */}
          {/* GR Input */}
          <View style={styles.card}>
            <View style={styles.inputWrapper}>
              <MaterialCommunityIcons name="card-account-details-outline" size={20} color={Colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={gr}
                onChangeText={setGr}
                placeholder="Guvohnoma raqami"
                placeholderTextColor={Colors.textMuted}
                autoCapitalize="characters"
                autoCorrect={false}
                editable={!loading}
                returnKeyType="next"
                onSubmitEditing={() => parolRef.current?.focus()}
              />
            </View>

            {/* Password Input */}
            <View style={styles.inputWrapper}>
              <MaterialCommunityIcons name="lock-outline" size={20} color={Colors.textMuted} style={styles.inputIcon} />
              <TextInput
                ref={parolRef}
                style={styles.input}
                value={parol}
                onChangeText={setParol}
                placeholder="Parol"
                placeholderTextColor={Colors.textMuted}
                secureTextEntry
                editable={!loading}
                returnKeyType="go"
                onSubmitEditing={handleLogin}
              />
            </View>

            {/* Error */}
            {error ? (
              <View style={styles.errorBox}>
                <MaterialCommunityIcons name="alert-circle" size={18} color={Colors.danger} style={{ marginRight: 6 }} />
                <Text style={styles.error}>{error}</Text>
              </View>
            ) : null}

            {/* Submit */}
            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color={Colors.textInverse} />
              ) : (
                <>
                  <MaterialCommunityIcons name="login" size={20} color={Colors.textInverse} style={{ marginRight: 8 }} />
                  <Text style={styles.buttonText}>Kirish</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Ro'yxatdan o'tish linki */}
            <TouchableOpacity
              style={styles.registerLink}
              onPress={() => navigation.navigate('Royxat')}
              disabled={loading}
              activeOpacity={0.7}
            >
              <Text style={styles.registerLinkText}>
                Hisobingiz yo'qmi? <Text style={styles.registerLinkBold}>Ro'yxatdan o'tish</Text>
              </Text>
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
  content: { flexGrow: 1, justifyContent: 'center', padding: Spacing.xl },
  logoArea: { alignItems: 'center', marginBottom: Spacing['3xl'] },
  logoBlock: {
    width: 88,
    height: 88,
    borderRadius: 24,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.base,
    ...Shadows.lg,
  },
  title: {
    fontSize: FontSizes['2xl'],
    fontWeight: FontWeights.extrabold,
    fontFamily: Fonts.heading,
    color: Colors.textPrimary,
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: FontSizes.base,
    fontFamily: Fonts.body,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    ...Shadows.md,
    gap: Spacing.base,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    backgroundColor: Colors.background,
  },
  inputIcon: { marginLeft: Spacing.md },
  input: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: Spacing.md,
    fontSize: FontSizes.base,
    fontFamily: Fonts.body,
    color: Colors.textPrimary,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.dangerSurface,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.sm,
  },
  error: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.body,
    color: Colors.danger,
    fontWeight: FontWeights.medium,
  },
  button: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.sm,
    ...Shadows.sm,
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: {
    color: Colors.textInverse,
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    fontFamily: Fonts.heading,
  },
  registerLink: { alignItems: 'center', paddingVertical: Spacing.sm },
  registerLinkText: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.body,
    color: Colors.textSecondary,
  },
  registerLinkBold: {
    color: Colors.textLink,
    fontWeight: FontWeights.semibold,
  },
});

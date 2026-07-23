import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Constants from 'expo-constants';
import { useAuth } from '../contexts/AuthContext';
import { useAlifbo } from '../contexts/AlifboContext';
import { Colors, Fonts, FontSizes, FontWeights, Spacing, Radius, Shadows, tabBarContentPadding } from '../theme';

interface InfoRow {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  label: string;
  value: string;
}

export default function SettingsScreen() {
  const { user, logout } = useAuth();
  const { krill, setKrill, tr } = useAlifbo();
  const [loggingOut, setLoggingOut] = useState(false);
  const insets = useSafeAreaInsets();

  const handleLogout = () => {
    Alert.alert(tr('Tizimdan chiqish'), tr('Chiqmoqchimisiz?'), [
      { text: tr("Yo'q"), style: 'cancel' },
      {
        text: tr('Ha, chiqish'),
        style: 'destructive',
        onPress: async () => {
          setLoggingOut(true);
          await logout();
        },
      },
    ]);
  };

  const infoRows: InfoRow[] = [
    { icon: 'card-account-details-outline', label: tr('Guvohnoma raqami'), value: user?.guvohnoma_raqami || '-' },
    { icon: 'briefcase-outline', label: tr('Lavozim'), value: user?.lavozim || '-' },
    { icon: 'phone-outline', label: tr('Telefon'), value: user?.telefon || '-' },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: tabBarContentPadding(insets.bottom) }]}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{tr('Sozlamalar')}</Text>
        </View>

        {/* Profile card */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.full_name?.charAt(0)?.toUpperCase() || 'X'}
            </Text>
          </View>
          <Text style={styles.name}>{user?.full_name || 'Xodim'}</Text>
          <View style={styles.roleBadge}>
            <MaterialCommunityIcons name="shield-account-outline" size={14} color={Colors.primary} style={{ marginRight: 4 }} />
            <Text style={styles.role}>{user?.rol || 'xodim'}</Text>
          </View>
        </View>

        {/* Info Section */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{tr("Shaxsiy ma'lumotlar")}</Text>
          {infoRows.map((row, i) => (
            <View key={row.label}>
              <View style={styles.infoRow}>
                <View style={styles.infoIcon}>
                  <MaterialCommunityIcons name={row.icon} size={18} color={Colors.primary} />
                </View>
                <Text style={styles.infoLabel}>{row.label}</Text>
                <Text style={styles.infoValue} numberOfLines={1}>{row.value}</Text>
              </View>
              {i < infoRows.length - 1 && <View style={styles.divider} />}
            </View>
          ))}
        </View>

        {/* Alifbo tanlovi */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{tr('Alifbo')}</Text>
          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <MaterialCommunityIcons name="translate" size={18} color={Colors.primary} />
            </View>
            <Text style={styles.infoLabel}>{tr('Rejim')}</Text>
            <View style={styles.alifboToggle}>
              <TouchableOpacity
                style={[styles.alifboBtn, !krill && styles.alifboBtnActive]}
                onPress={() => setKrill(false)}
                activeOpacity={0.7}
              >
                <Text style={[styles.alifboBtnText, !krill && styles.alifboBtnTextActive]}>
                  Lotin
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.alifboBtn, krill && styles.alifboBtnActive]}
                onPress={() => setKrill(true)}
                activeOpacity={0.7}
              >
                <Text style={[styles.alifboBtnText, krill && styles.alifboBtnTextActive]}>
                  Кирилл
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* App Info */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{tr('Ilova haqida')}</Text>
          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <MaterialCommunityIcons name="information-outline" size={18} color={Colors.textMuted} />
            </View>
            <Text style={styles.infoLabel}>{tr('Versiya')}</Text>
            <Text style={styles.infoValue}>1.0.0</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <MaterialCommunityIcons name="devices" size={18} color={Colors.textMuted} />
            </View>
            <Text style={styles.infoLabel}>{tr('Platforma')}</Text>
            <Text style={styles.infoValue}>Expo SDK {Constants.expoConfig?.sdkVersion?.split('.')[0] || '54'}</Text>
          </View>
        </View>

        {/* Logout */}
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={handleLogout}
          disabled={loggingOut}
          activeOpacity={0.8}
        >
          {loggingOut ? (
            <ActivityIndicator color={Colors.textInverse} />
          ) : (
            <View style={styles.logoutContent}>
              <MaterialCommunityIcons name="logout" size={20} color={Colors.textInverse} style={{ marginRight: 8 }} />
              <Text style={styles.logoutText}>{tr('Tizimdan chiqish')}</Text>
            </View>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.base, gap: Spacing.base, flexGrow: 1 },
  header: { paddingTop: Spacing.md, paddingBottom: Spacing.xs },
  headerTitle: {
    fontSize: FontSizes['2xl'], fontWeight: FontWeights.bold,
    fontFamily: Fonts.heading, color: Colors.textPrimary,
  },
  profileCard: {
    alignItems: 'center', backgroundColor: Colors.surface,
    borderRadius: Radius.xl, padding: Spacing.xl, ...Shadows.md,
  },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  avatarText: {
    fontSize: FontSizes['3xl'], fontWeight: FontWeights.extrabold,
    fontFamily: Fonts.heading, color: Colors.textInverse,
  },
  name: {
    fontSize: FontSizes.xl, fontWeight: FontWeights.bold,
    fontFamily: Fonts.heading, color: Colors.textPrimary, marginBottom: 4,
  },
  roleBadge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.primarySurface, paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: Radius.full,
  },
  role: {
    fontSize: FontSizes.xs, fontWeight: FontWeights.semibold,
    fontFamily: Fonts.body, color: Colors.primary, textTransform: 'uppercase',
  },
  card: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    paddingHorizontal: Spacing.base, ...Shadows.sm,
  },
  sectionTitle: {
    fontSize: FontSizes.md, fontWeight: FontWeights.bold, fontFamily: Fonts.heading,
    color: Colors.textPrimary, paddingTop: Spacing.base, marginBottom: Spacing.sm,
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
  infoIcon: {
    width: 34, height: 34, borderRadius: 8,
    backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center',
    marginRight: Spacing.md,
  },
  infoLabel: { fontSize: FontSizes.sm, fontFamily: Fonts.body, color: Colors.textSecondary, width: 125 },
  infoValue: { fontSize: FontSizes.sm, fontFamily: Fonts.body, color: Colors.textPrimary, flex: 1, fontWeight: FontWeights.medium, textAlign: 'right' },
  divider: { height: 1, backgroundColor: Colors.borderLight, marginLeft: 46 },
  alifboToggle: {
    flexDirection: 'row',
    backgroundColor: Colors.background,
    borderRadius: Radius.full,
    padding: 2,
  },
  alifboBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: Radius.full,
  },
  alifboBtnActive: {
    backgroundColor: Colors.primary,
  },
  alifboBtnText: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semibold,
    fontFamily: Fonts.body,
    color: Colors.textSecondary,
  },
  alifboBtnTextActive: {
    color: Colors.textInverse,
  },
  logoutBtn: {
    backgroundColor: Colors.danger, borderRadius: Radius.lg,
    padding: 17, alignItems: 'center', ...Shadows.md, marginTop: Spacing.sm,
  },
  logoutContent: { flexDirection: 'row', alignItems: 'center' },
  logoutText: { color: Colors.textInverse, fontSize: FontSizes.md, fontWeight: FontWeights.bold, fontFamily: Fonts.heading },
});

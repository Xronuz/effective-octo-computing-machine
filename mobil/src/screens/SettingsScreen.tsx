import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  Modal,
  Pressable,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Constants from 'expo-constants';
import { useAuth } from '../contexts/AuthContext';
import { useAlifbo } from '../contexts/AlifboContext';
import { useTheme, type ThemeMode } from '../contexts/ThemeContext';
import { useTabScreenNavigation } from '../navigation/hooks';
import {
  Fonts,
  FontSizes,
  FontWeights,
  Spacing,
  Radius,
  Shadows,
  tabBarContentPadding,
} from '../theme';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

interface InfoRowProps {
  icon: IconName;
  iconColor?: string;
  label: string;
  value: string;
  last?: boolean;
}

interface SelectOption {
  key: ThemeMode;
  label: string;
  icon: IconName;
}

function SettingsRow({ icon, iconColor, label, value, last }: InfoRowProps) {
  const { colors } = useTheme();
  return (
    <View>
      <View style={styles.row}>
        <View style={[styles.iconBox, { backgroundColor: colors.background }]}>
          <MaterialCommunityIcons name={icon} size={18} color={iconColor ?? colors.primary} />
        </View>
        <Text style={[styles.rowLabel, { color: colors.textSecondary }]}>{label}</Text>
        <Text style={[styles.rowValue, { color: colors.textPrimary }]} numberOfLines={1}>
          {value}
        </Text>
      </View>
      {!last && <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />}
    </View>
  );
}

export default function SettingsScreen() {
  const { user, logout } = useAuth();
  const { krill, setKrill, tr } = useAlifbo();
  const { colors, mode, setMode } = useTheme();
  const navigation = useTabScreenNavigation();
  const [loggingOut, setLoggingOut] = useState(false);
  const [themeModalOpen, setThemeModalOpen] = useState(false);
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

  const themeOptions: SelectOption[] = [
    { key: 'light', label: tr('Kunduzgi'), icon: 'white-balance-sunny' },
    { key: 'dark', label: tr('Tungi'), icon: 'weather-night' },
  ];

  const currentThemeLabel = themeOptions.find((o) => o.key === mode)?.label ?? tr('Kunduzgi');

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: tabBarContentPadding(insets.bottom) },
        ]}
      >
        {/* Header */}
        <Text style={[styles.header, { color: colors.textPrimary }]}>{tr('Sozlamalar')}</Text>

        {/* Profile */}
        <View style={[styles.card, { backgroundColor: colors.surface }, Shadows.sm]}>
          <View style={styles.profileRow}>
            <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
              <Text style={[styles.avatarText, { color: colors.textInverse }]}>
                {user?.full_name?.charAt(0)?.toUpperCase() || 'X'}
              </Text>
            </View>
            <View style={styles.profileText}>
              <Text style={[styles.name, { color: colors.textPrimary }]} numberOfLines={1}>
                {user?.full_name || tr('Xodim')}
              </Text>
              <View style={[styles.roleBadge, { backgroundColor: colors.primarySurface }]}>
                <MaterialCommunityIcons
                  name="shield-account-outline"
                  size={12}
                  color={colors.primary}
                  style={{ marginRight: 4 }}
                />
                <Text style={[styles.role, { color: colors.primary }]}>
                  {user?.lavozim || user?.rol || tr('Xodim')}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Personal info */}
        <View style={[styles.card, { backgroundColor: colors.surface }, Shadows.sm]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            {tr("Shaxsiy ma'lumotlar")}
          </Text>
          <SettingsRow
            icon="card-account-details-outline"
            label={tr('Guvohnoma')}
            value={user?.guvohnoma_raqami || '-'}
          />
          <SettingsRow
            icon="briefcase-outline"
            label={tr('Lavozim')}
            value={user?.lavozim || '-'}
          />
          <SettingsRow
            icon="phone-outline"
            label={tr('Telefon')}
            value={user?.telefon || '-'}
            last
          />
        </View>

        {/* App settings */}
        <View style={[styles.card, { backgroundColor: colors.surface }, Shadows.sm]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{tr('Ilova')}</Text>

          {/* Alifbo */}
          <View>
            <View style={styles.row}>
              <View style={[styles.iconBox, { backgroundColor: colors.background }]}>
                <MaterialCommunityIcons name="translate" size={18} color={colors.primary} />
              </View>
              <Text style={[styles.rowLabel, { color: colors.textSecondary }]}>{tr('Alifbo')}</Text>
              <View style={[styles.segment, { backgroundColor: colors.background }]}>
                <TouchableOpacity
                  style={[styles.segmentBtn, !krill && { backgroundColor: colors.primary }]}
                  onPress={() => setKrill(false)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      { color: !krill ? colors.textInverse : colors.textSecondary },
                    ]}
                  >
                    Lotin
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.segmentBtn, krill && { backgroundColor: colors.primary }]}
                  onPress={() => setKrill(true)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      { color: krill ? colors.textInverse : colors.textSecondary },
                    ]}
                  >
                    Кирилл
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
            <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />
          </View>

          {/* Theme */}
          <TouchableOpacity
            style={styles.row}
            onPress={() => setThemeModalOpen(true)}
            activeOpacity={0.7}
          >
            <View style={[styles.iconBox, { backgroundColor: colors.background }]}>
              <MaterialCommunityIcons name="theme-light-dark" size={18} color={colors.primary} />
            </View>
            <Text style={[styles.rowLabel, { color: colors.textSecondary }]}>{tr('Mavzu')}</Text>
            <View style={styles.rowValueGroup}>
              <Text style={[styles.rowValue, { color: colors.textPrimary }]} numberOfLines={1}>
                {currentThemeLabel}
              </Text>
              <MaterialCommunityIcons name="chevron-right" size={18} color={colors.textMuted} />
            </View>
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />

          {/* Sinxronlash navbati */}
          <TouchableOpacity
            style={styles.row}
            onPress={() => navigation.navigate('Navbat')}
            activeOpacity={0.7}
          >
            <View style={[styles.iconBox, { backgroundColor: colors.background }]}>
              <MaterialCommunityIcons name="sync" size={18} color={colors.primary} />
            </View>
            <Text style={[styles.rowLabel, { color: colors.textSecondary }]}>
              {tr('Sinxronlash navbati')}
            </Text>
            <View style={styles.rowValueGroup}>
              <MaterialCommunityIcons name="chevron-right" size={18} color={colors.textMuted} />
            </View>
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />

          {/* About */}
          <View style={styles.row}>
            <View style={[styles.iconBox, { backgroundColor: colors.background }]}>
              <MaterialCommunityIcons
                name="information-outline"
                size={18}
                color={colors.textMuted}
              />
            </View>
            <Text style={[styles.rowLabel, { color: colors.textSecondary }]}>
              {tr('Ilova haqida')}
            </Text>
            <Text style={[styles.rowValue, { color: colors.textPrimary }]} numberOfLines={1}>
              v1.0.0 · Expo SDK {Constants.expoConfig?.sdkVersion?.split('.')[0] || '54'}
            </Text>
          </View>
        </View>

        {/* Logout */}
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={handleLogout}
          disabled={loggingOut}
          activeOpacity={0.7}
        >
          {loggingOut ? (
            <ActivityIndicator color={colors.danger} />
          ) : (
            <View style={styles.logoutContent}>
              <MaterialCommunityIcons
                name="logout"
                size={20}
                color={colors.danger}
                style={{ marginRight: 8 }}
              />
              <Text style={[styles.logoutText, { color: colors.danger }]}>
                {tr('Tizimdan chiqish')}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Theme picker modal */}
      <Modal
        visible={themeModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setThemeModalOpen(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setThemeModalOpen(false)}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>{tr('Mavzu')}</Text>
            {themeOptions.map((opt) => (
              <TouchableOpacity
                key={opt.key}
                style={styles.modalOption}
                onPress={() => {
                  setMode(opt.key);
                  setThemeModalOpen(false);
                }}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons
                  name={opt.icon}
                  size={20}
                  color={mode === opt.key ? colors.primary : colors.textMuted}
                  style={{ marginRight: 12 }}
                />
                <Text
                  style={[
                    styles.modalOptionText,
                    { color: mode === opt.key ? colors.primary : colors.textPrimary },
                  ]}
                >
                  {opt.label}
                </Text>
                {mode === opt.key && (
                  <MaterialCommunityIcons name="check" size={20} color={colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: Spacing.base, paddingTop: Spacing.sm, gap: Spacing.md, flexGrow: 1 },
  header: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    fontFamily: Fonts.heading,
    marginBottom: Spacing.xs,
  },
  card: {
    borderRadius: Radius.lg,
    padding: Spacing.md,
  },
  sectionTitle: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.bold,
    fontFamily: Fonts.heading,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
    opacity: 0.85,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    fontFamily: Fonts.heading,
  },
  profileText: { flex: 1, gap: 4 },
  name: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.bold,
    fontFamily: Fonts.heading,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  role: {
    fontSize: FontSizes['2xs'],
    fontWeight: FontWeights.semibold,
    fontFamily: Fonts.body,
    textTransform: 'uppercase',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  iconBox: {
    width: 34,
    height: 34,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  rowLabel: {
    flexShrink: 0,
    fontSize: FontSizes.sm,
    fontFamily: Fonts.body,
    marginRight: Spacing.sm,
  },
  rowValue: {
    flex: 1,
    fontSize: FontSizes.sm,
    fontFamily: Fonts.body,
    fontWeight: FontWeights.semibold,
    textAlign: 'right',
  },
  rowValueGroup: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
  },
  divider: {
    height: 1,
    marginLeft: 46,
  },
  segment: {
    flexDirection: 'row',
    borderRadius: Radius.full,
    padding: 2,
    marginLeft: 'auto',
  },
  segmentBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: Radius.full,
  },
  segmentText: {
    fontSize: FontSizes['2xs'],
    fontWeight: FontWeights.semibold,
    fontFamily: Fonts.body,
  },
  logoutBtn: {
    borderRadius: Radius.lg,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  logoutContent: { flexDirection: 'row', alignItems: 'center' },
  logoutText: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.bold,
    fontFamily: Fonts.heading,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(10, 30, 60, 0.45)',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  modalCard: {
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: Spacing.xs,
    ...Shadows.lg,
  },
  modalTitle: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.bold,
    fontFamily: Fonts.heading,
    marginBottom: Spacing.sm,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: Radius.md,
  },
  modalOptionText: {
    flex: 1,
    fontSize: FontSizes.base,
    fontFamily: Fonts.body,
    fontWeight: FontWeights.medium,
  },
});

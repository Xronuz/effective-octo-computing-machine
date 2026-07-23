import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useAuth } from '../contexts/AuthContext';
import { useAlifbo } from '../contexts/AlifboContext';
import api from '../services/api';
import { getKutilmaganSoni } from '../services/db';
import { Colors, Fonts, FontSizes, FontWeights, Spacing, Radius, Shadows, tabBarContentPadding } from '../theme';
import type { ApiResponse, Paginated, XonadonSummary, MuammoSummary } from '../types';

interface MfyBiriktirish {
  mfy_id: number;
  nomi: string | null;
  faol: boolean;
}

interface DashboardStats {
  jami_xonadonlar: number;
  jami_muammolar: number;
  ochiq_muammolar: number;
  yopilgan_muammolar: number;
}

interface StatItem {
  key: string;
  label: string;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  color: string;
  bg: string;
  valueKey: keyof DashboardStats;
}

export default function HomeScreen({ navigation }: any) {
  const { user } = useAuth();
  const { tr } = useAlifbo();
  const insets = useSafeAreaInsets();

  const STATS: StatItem[] = [
    { key: 'xonadon', label: tr('Jami xonadonlar'), icon: 'home-city', color: Colors.primary, bg: Colors.primarySurface, valueKey: 'jami_xonadonlar' },
    { key: 'muammo', label: tr('Jami muammolar'), icon: 'alert-octagon', color: Colors.secondary, bg: Colors.secondarySurface, valueKey: 'jami_muammolar' },
    { key: 'ochiq', label: tr('Ochiq muammolar'), icon: 'alert-circle', color: Colors.info, bg: Colors.infoSurface, valueKey: 'ochiq_muammolar' },
    { key: 'yopilgan', label: tr('Yopilgan muammolar'), icon: 'check-circle', color: Colors.success, bg: Colors.successSurface, valueKey: 'yopilgan_muammolar' },
  ];

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [navbatSoni, setNavbatSoni] = useState(0);
  const [mfylar, setMfylar] = useState<MfyBiriktirish[]>([]);

  const fetchStats = useCallback(async () => {
    try {
      const [allXon, allMua, ochiqMua, yopiqMua] = await Promise.all([
        api.get<ApiResponse<Paginated<XonadonSummary>>>('/xonadonlar?size=1'),
        api.get<ApiResponse<Paginated<MuammoSummary>>>('/muammolar?size=1'),
        api.get<ApiResponse<Paginated<MuammoSummary>>>('/muammolar?status=ochiq&size=1'),
        api.get<ApiResponse<Paginated<MuammoSummary>>>('/muammolar?status=yopilgan&size=1'),
      ]);
      setStats({
        jami_xonadonlar: allXon.data.data?.total || 0,
        jami_muammolar: allMua.data.data?.total || 0,
        ochiq_muammolar: ochiqMua.data.data?.total || 0,
        yopilgan_muammolar: yopiqMua.data.data?.total || 0,
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const fetchMfylar = useCallback(async () => {
    try {
      const { data } = await api.get<ApiResponse<{ mfy_biriktirishlar?: MfyBiriktirish[] }>>('/auth/men');
      if (data.ok && data.data?.mfy_biriktirishlar) {
        setMfylar(data.data.mfy_biriktirishlar);
      }
    } catch {
      // Offline — MFY ro'yxati ko'rsatilmaydi
    }
  }, []);

  const fetchNavbatSoni = useCallback(async () => {
    try {
      const soni = await getKutilmaganSoni();
      setNavbatSoni(soni);
    } catch {
      // DB hali tayyor bo'lmasa
    }
  }, []);

  useEffect(() => { fetchStats(); fetchMfylar(); }, [fetchStats, fetchMfylar]);

  // Fokusda sinxronlanmagan yozuvlar sonini yangilash
  useFocusEffect(
    useCallback(() => {
      fetchNavbatSoni();
    }, [fetchNavbatSoni]),
  );

  const onRefresh = () => { setRefreshing(true); fetchStats(); fetchMfylar(); fetchNavbatSoni(); };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: tabBarContentPadding(insets.bottom) }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} colors={[Colors.primary]} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greeting}>{tr('Assalomu alaykum,')}</Text>
            <Text style={styles.name}>{user?.full_name || 'Xodim'}</Text>
            <Text style={styles.role}>{user?.lavozim || tr("FVV xodimi — yong'in/gaz xavfsizligi nazorati")}</Text>
          </View>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.full_name?.charAt(0)?.toUpperCase() || 'X'}
            </Text>
          </View>
        </View>

        {/* Stats */}
        <Text style={styles.sectionTitle}>{tr('Statistika')}</Text>
        {loading && !stats ? (
          <ActivityIndicator size="large" color={Colors.primary} style={{ marginVertical: Spacing['3xl'] }} />
        ) : (
          <View style={styles.statsGrid}>
            {STATS.map((s) => (
              <View key={s.key} style={styles.statCard}>
                <View style={[styles.statIconBox, { backgroundColor: s.bg }]}>
                  <MaterialCommunityIcons name={s.icon} size={22} color={s.color} />
                </View>
                <View style={styles.statTextBox}>
                  <Text style={styles.statValue}>{stats?.[s.valueKey] || 0}</Text>
                  <Text style={styles.statLabel} numberOfLines={2}>{s.label}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>{tr('Tezkor amallar')}</Text>
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: Colors.primary }]}
            onPress={() => navigation.navigate('Xonadonlar')}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name="home-city" size={28} color={Colors.textInverse} />
            <Text style={styles.actionText}>{tr("Xonadonlarni ko'rish")}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: Colors.danger }]}
            onPress={() => navigation.navigate('MuammoYaratish', {})}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name="plus-circle" size={28} color={Colors.textInverse} />
            <Text style={styles.actionText}>{tr('Yangi muammo qo\'shish')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: Colors.secondary }]}
            onPress={() => navigation.navigate('Topshiriqlar')}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name="clipboard-check" size={28} color={Colors.textInverse} />
            <Text style={styles.actionText}>{tr('Mening topshiriqlarim')}</Text>
          </TouchableOpacity>
        </View>

        {/* Sinxronlanmagan yozuvlar */}
        <TouchableOpacity
          style={[styles.syncCard, navbatSoni > 0 && styles.syncCardWarn]}
          onPress={() => navigation.navigate('Navbat')}
          activeOpacity={0.8}
        >
          <View style={[styles.syncIconBox, { backgroundColor: navbatSoni > 0 ? Colors.accentSurface : Colors.successSurface }]}>
            <MaterialCommunityIcons
              name={navbatSoni > 0 ? 'cloud-upload-outline' : 'cloud-check-outline'}
              size={24}
              color={navbatSoni > 0 ? Colors.accent : Colors.success}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.syncTitle}>{tr('Sinxronlash navbati')}</Text>
            <Text style={styles.syncSubtitle}>
              {navbatSoni > 0
                ? tr('{count} ta yozuv yuborilishi kutilmoqda').replace('{count}', String(navbatSoni))
                : tr("Barcha yozuvlar sinxronlangan")}
            </Text>
          </View>
          <Text style={[styles.syncCount, { color: navbatSoni > 0 ? Colors.accent : Colors.success }]}>
            {navbatSoni}
          </Text>
          <MaterialCommunityIcons name="chevron-right" size={22} color={Colors.textMuted} />
        </TouchableOpacity>

        {/* Biriktirilgan MFY lar */}
        <Text style={styles.sectionTitle}>{tr('Biriktirilgan MFY lar')}</Text>
        {mfylar.length === 0 ? (
          <View style={styles.mfyEmpty}>
            <MaterialCommunityIcons name="map-marker-off-outline" size={22} color={Colors.textMuted} />
            <Text style={styles.mfyEmptyText}>{tr('Sizga MFY biriktirilmagan')}</Text>
          </View>
        ) : (
          <View style={styles.mfyList}>
            {mfylar.map((m) => (
              <View key={m.mfy_id} style={styles.mfyRow}>
                <View style={styles.mfyIcon}>
                  <MaterialCommunityIcons name="map-marker" size={18} color={Colors.primary} />
                </View>
                <Text style={styles.mfyName}>{m.nomi || `MFY #${m.mfy_id}`}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xl,
    marginTop: Spacing.sm,
  },
  greeting: { fontSize: FontSizes.sm, fontFamily: Fonts.body, color: Colors.textSecondary },
  name: {
    fontSize: FontSizes['2xl'],
    fontWeight: FontWeights.bold,
    fontFamily: Fonts.heading,
    color: Colors.textPrimary,
    marginTop: 2,
  },
  role: { fontSize: FontSizes.sm, fontFamily: Fonts.body, color: Colors.textMuted, marginTop: 2 },
  avatar: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: FontSizes.xl, fontWeight: FontWeights.bold, fontFamily: Fonts.heading, color: Colors.accent },
  sectionTitle: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.bold,
    fontFamily: Fonts.heading,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
    marginTop: Spacing.sm,
  },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: Spacing.sm },
  statCard: {
    flex: 1, minWidth: '46%',
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    padding: Spacing.base,
    ...Shadows.sm,
  },
  statIconBox: {
    width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
  },
  statTextBox: { flex: 1 },
  statValue: {
    fontSize: FontSizes['2xl'], fontWeight: FontWeights.extrabold,
    fontFamily: Fonts.heading, color: Colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  statLabel: { fontSize: FontSizes.xs, fontFamily: Fonts.body, color: Colors.textSecondary, marginTop: 1 },
  actions: { gap: Spacing.md },
  actionBtn: {
    borderRadius: Radius.lg, padding: Spacing.xl,
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    ...Shadows.sm,
  },
  actionText: { fontSize: FontSizes.md, fontWeight: FontWeights.semibold, fontFamily: Fonts.heading, color: Colors.textInverse },
  syncCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    padding: Spacing.base, marginTop: Spacing.xl,
    ...Shadows.sm,
  },
  syncCardWarn: {
    borderWidth: 1,
    borderColor: Colors.accent,
  },
  syncIconBox: {
    width: 44, height: 44, borderRadius: Radius.md,
    alignItems: 'center', justifyContent: 'center',
  },
  syncTitle: {
    fontSize: FontSizes.base, fontWeight: FontWeights.semibold,
    fontFamily: Fonts.heading, color: Colors.textPrimary,
  },
  syncSubtitle: { fontSize: FontSizes.xs, fontFamily: Fonts.body, color: Colors.textSecondary, marginTop: 2 },
  syncCount: { fontSize: FontSizes['2xl'], fontWeight: FontWeights.extrabold, fontFamily: Fonts.heading },
  mfyEmpty: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
    backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.xl,
    ...Shadows.sm,
  },
  mfyEmptyText: { fontSize: FontSizes.sm, fontFamily: Fonts.body, color: Colors.textMuted },
  mfyList: { gap: Spacing.sm },
  mfyRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    padding: Spacing.base,
    ...Shadows.sm,
  },
  mfyIcon: {
    width: 36, height: 36, borderRadius: Radius.md,
    backgroundColor: Colors.primarySurface, alignItems: 'center', justifyContent: 'center',
  },
  mfyName: {
    flex: 1, fontSize: FontSizes.base, fontWeight: FontWeights.semibold,
    fontFamily: Fonts.body, color: Colors.textPrimary,
  },
});

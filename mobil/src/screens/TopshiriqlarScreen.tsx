import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { Colors, Fonts, FontSizes, FontWeights, Spacing, Radius, Shadows, StatusColors, tabBarContentPadding } from '../theme';
import type { ApiResponse, Paginated } from '../types';
import { useAlifbo } from '../contexts/AlifboContext';

interface Topshiriq {
  id: number;
  rahbar_id: number;
  xodim_id: number;
  mfy_id: number | null;
  muammo_id: number | null;
  sarlavha: string;
  matn: string | null;
  muddat: string;
  status: string;
  yaratilgan: string;
  korilgan: string | null;
  bajarilgan: string | null;
  rahbar_fio: string | null;
  xodim_fio: string | null;
  mfy_nomi: string | null;
}

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

const STATUS_CFG = (tr: (s: string) => string): Record<string, { label: string; bg: string; text: string; icon: IconName }> => ({
  yangi: { label: tr('Yangi'), bg: Colors.infoSurface, text: Colors.info, icon: 'star-circle-outline' },
  korildi: { label: tr("Ko'rildi"), bg: StatusColors.jarayonda.bg, text: StatusColors.jarayonda.text, icon: 'eye-outline' },
  bajarildi: { label: tr('Bajarildi'), bg: Colors.successSurface, text: Colors.success, icon: 'check-circle' },
  kechikkan: { label: tr('Kechikkan'), bg: Colors.dangerSurface, text: Colors.danger, icon: 'clock-alert-outline' },
});

function formatDate(iso: string | null): string {
  if (!iso) return '-';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return iso;
  }
}

export default function TopshiriqlarScreen() {
  const { tr } = useAlifbo();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<Topshiriq[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionId, setActionId] = useState<number | null>(null);

  const fetchTopshiriqlar = useCallback(async () => {
    if (!user?.id) { setLoading(false); setRefreshing(false); return; }
    try {
      const { data } = await api.get<ApiResponse<Paginated<Topshiriq>>>(
        `/topshiriqlar?xodim_id=${user.id}&size=100`,
      );
      if (data.ok && data.data) {
        setItems(data.data.items);
      }
    } catch {
      // Tarmoq xatosi — eski ro'yxat saqlanadi
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      fetchTopshiriqlar();
    }, [fetchTopshiriqlar]),
  );

  const onRefresh = () => { setRefreshing(true); fetchTopshiriqlar(); };

  const updateStatus = async (item: Topshiriq, status: 'korildi' | 'bajarildi') => {
    setActionId(item.id);
    try {
      const { data } = await api.patch<ApiResponse<Topshiriq>>(`/topshiriqlar/${item.id}`, { status });
      if (data.ok && data.data) {
        setItems((prev) => prev.map((t) => (t.id === item.id ? { ...t, ...data.data! } : t)));
      } else {
        Alert.alert(tr('Xatolik'), data.xato || tr('Statusni yangilashda xatolik'));
      }
    } catch (err: any) {
      const msg = err?.response?.data?.xato || err?.response?.data?.detail || tr('Server bilan bog\'lanishda xatolik');
      Alert.alert(tr('Xatolik'), typeof msg === 'string' ? msg : tr('Statusni yangilashda xatolik'));
    } finally {
      setActionId(null);
    }
  };

  const confirmBajarildi = (item: Topshiriq) => {
    Alert.alert(
      tr('Topshiriqni yakunlash'),
      tr(`"${item.sarlavha}" topshirig'ini bajarildi deb belgilaysizmi?`),
      [
        { text: tr('Bekor qilish'), style: 'cancel' },
        { text: tr('Bajarildi'), onPress: () => updateStatus(item, 'bajarildi') },
      ],
    );
  };

  const renderItem = ({ item }: { item: Topshiriq }) => {
    const cfg = STATUS_CFG(tr)[item.status] || { label: item.status, bg: Colors.borderLight, text: Colors.textMuted, icon: 'help-circle-outline' as IconName };
    const busy = actionId === item.id;
    const isLate = item.status !== 'bajarildi' && item.muddat && new Date(item.muddat) < new Date(new Date().toDateString());

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
            <MaterialCommunityIcons name={cfg.icon} size={14} color={cfg.text} style={{ marginRight: 4 }} />
            <Text style={[styles.badgeText, { color: cfg.text }]}>{cfg.label}</Text>
          </View>
          <View style={styles.muddatBox}>
            <MaterialCommunityIcons
              name="calendar-clock"
              size={13}
              color={isLate ? Colors.danger : Colors.textMuted}
            />
            <Text style={[styles.muddatText, isLate && { color: Colors.danger }]}>
              {formatDate(item.muddat)}
            </Text>
          </View>
        </View>

        <Text style={styles.title}>{item.sarlavha}</Text>
        {item.matn ? <Text style={styles.matn} numberOfLines={3}>{item.matn}</Text> : null}

        <View style={styles.metaRow}>
          {item.mfy_nomi ? (
            <View style={styles.metaItem}>
              <MaterialCommunityIcons name="map-marker-outline" size={13} color={Colors.textMuted} />
              <Text style={styles.metaText}>{item.mfy_nomi}</Text>
            </View>
          ) : null}
          {item.rahbar_fio ? (
            <View style={styles.metaItem}>
              <MaterialCommunityIcons name="account-tie-outline" size={13} color={Colors.textMuted} />
              <Text style={styles.metaText}>{item.rahbar_fio}</Text>
            </View>
          ) : null}
        </View>

        {(item.status === 'yangi' || item.status === 'korildi' || item.status === 'kechikkan') && (
          <View style={styles.actionsRow}>
            {item.status === 'yangi' && (
              <TouchableOpacity
                style={[styles.actionBtn, styles.actionOutline]}
                onPress={() => updateStatus(item, 'korildi')}
                disabled={busy}
                activeOpacity={0.75}
              >
                {busy ? (
                  <ActivityIndicator size="small" color={Colors.primary} />
                ) : (
                  <>
                    <MaterialCommunityIcons name="eye-check-outline" size={18} color={Colors.primary} style={{ marginRight: 6 }} />
                    <Text style={styles.actionOutlineText}>{tr("Ko'rildi")}</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionPrimary]}
              onPress={() => confirmBajarildi(item)}
              disabled={busy}
              activeOpacity={0.75}
            >
              {busy ? (
                <ActivityIndicator size="small" color={Colors.textInverse} />
              ) : (
                <>
                  <MaterialCommunityIcons name="check-bold" size={18} color={Colors.textInverse} style={{ marginRight: 6 }} />
                  <Text style={styles.actionPrimaryText}>{tr('Bajarildi')}</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{tr('Topshiriqlarim')}</Text>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={[styles.list, { paddingBottom: tabBarContentPadding(insets.bottom) }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} colors={[Colors.primary]} />
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 80 }} />
          ) : (
            <View style={styles.emptyBox}>
              <View style={styles.emptyIcon}>
                <MaterialCommunityIcons name="clipboard-check-outline" size={36} color={Colors.textMuted} />
              </View>
              <Text style={styles.emptyTitle}>{tr("Topshiriqlar yo'q")}</Text>
              <Text style={styles.emptyText}>{tr('Sizga biriktirilgan topshiriqlar hali mavjud emas')}</Text>
            </View>
          )
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: Spacing.base, paddingTop: Spacing.md, paddingBottom: Spacing.sm },
  headerTitle: {
    fontSize: FontSizes['2xl'], fontWeight: FontWeights.bold,
    fontFamily: Fonts.heading, color: Colors.textPrimary,
  },
  list: { padding: Spacing.base, paddingTop: Spacing.xs, flexGrow: 1 },
  card: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    padding: Spacing.base, marginBottom: 10,
    ...Shadows.sm,
  },
  cardHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  badge: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full,
  },
  badgeText: { fontSize: FontSizes.xs, fontWeight: FontWeights.semibold, fontFamily: Fonts.body },
  muddatBox: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  muddatText: { fontSize: FontSizes.xs, fontFamily: Fonts.body, color: Colors.textMuted },
  title: {
    fontSize: FontSizes.md, fontWeight: FontWeights.bold,
    fontFamily: Fonts.heading, color: Colors.textPrimary,
  },
  matn: {
    fontSize: FontSizes.sm, fontFamily: Fonts.body,
    color: Colors.textSecondary, marginTop: 4, lineHeight: 19,
  },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: Spacing.sm },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaText: { fontSize: FontSizes.xs, fontFamily: Fonts.body, color: Colors.textSecondary },
  actionsRow: {
    flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md,
    borderTopWidth: 1, borderTopColor: Colors.borderLight, paddingTop: Spacing.md,
  },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 10, borderRadius: Radius.md,
  },
  actionOutline: { borderWidth: 1.5, borderColor: Colors.primary },
  actionOutlineText: {
    fontSize: FontSizes.sm, fontWeight: FontWeights.semibold,
    fontFamily: Fonts.heading, color: Colors.primary,
  },
  actionPrimary: { backgroundColor: Colors.success },
  actionPrimaryText: {
    fontSize: FontSizes.sm, fontWeight: FontWeights.semibold,
    fontFamily: Fonts.heading, color: Colors.textInverse,
  },
  emptyBox: { alignItems: 'center', marginTop: 80, paddingHorizontal: Spacing['2xl'] },
  emptyIcon: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: Colors.surfaceSubtle, alignItems: 'center', justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: FontSizes.md, fontWeight: FontWeights.bold, fontFamily: Fonts.heading,
    color: Colors.textPrimary, marginTop: Spacing.md,
  },
  emptyText: {
    fontSize: FontSizes.sm, fontFamily: Fonts.body, color: Colors.textMuted,
    marginTop: 4, textAlign: 'center',
  },
});

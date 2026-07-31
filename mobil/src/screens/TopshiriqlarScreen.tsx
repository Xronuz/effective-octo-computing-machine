import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useAuth } from '../contexts/AuthContext';
import PullToRefresh from '../components/PullToRefresh';
import Button from '../components/Button';
import api from '../services/api';
import { cacheTopshiriqlar, getCacheTopshiriqlar } from '../services/cache';
import {
  Colors,
  Fonts,
  FontSizes,
  FontWeights,
  Spacing,
  Radius,
  StatusColors,
  tabBarContentPadding,
} from '../theme';
import type { ApiResponse, Paginated, Topshiriq } from '../types';
import { useAlifbo } from '../contexts/AlifboContext';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];
type Segment = 'faol' | 'bajarildi';

const STATUS_CFG: Record<string, { label: string; color: string; icon: IconName }> = {
  yangi: { label: 'Yangi', color: Colors.info, icon: 'star-circle-outline' },
  korildi: { label: "Ko'rildi", color: StatusColors.jarayonda.text, icon: 'eye-outline' },
  bajarildi: { label: 'Bajarildi', color: Colors.success, icon: 'check-circle' },
  kechikkan: { label: 'Kechikkan', color: Colors.danger, icon: 'clock-alert-outline' },
};

function formatDate(iso: string | null): string {
  if (!iso) return '-';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return iso;
  }
}

function isOverdue(item: Topshiriq): boolean {
  if (item.status === 'bajarildi') return false;
  if (item.status === 'kechikkan') return true;
  return Boolean(item.muddat) && new Date(item.muddat) < new Date(new Date().toDateString());
}

export default function TopshiriqlarScreen() {
  const { tr } = useAlifbo();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<Topshiriq[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionId, setActionId] = useState<number | null>(null);
  const [segment, setSegment] = useState<Segment>('faol');
  const [selected, setSelected] = useState<Topshiriq | null>(null);

  const fetchTopshiriqlar = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      const cached = await getCacheTopshiriqlar<Topshiriq>();
      if (cached) setItems(cached);
      const { data } = await api.get<ApiResponse<Paginated<Topshiriq>>>(
        `/topshiriqlar?xodim_id=${user.id}&size=100`,
      );
      if (data.ok && data.data) {
        setItems(data.data.items);
        await cacheTopshiriqlar<Topshiriq>(data.data.items);
      }
    } catch {
      // Tarmoq xatosi — eski ro'yxat saqlanadi
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      fetchTopshiriqlar();
    }, [fetchTopshiriqlar]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchTopshiriqlar();
  };

  const updateStatus = useCallback(
    async (
      item: Topshiriq,
      status: 'korildi' | 'bajarildi',
      opts: { silent?: boolean; onSuccess?: () => void } = {},
    ) => {
      if (!opts.silent) setActionId(item.id);
      try {
        const { data } = await api.patch<ApiResponse<Topshiriq>>(`/topshiriqlar/${item.id}`, {
          status,
        });
        if (data.ok && data.data) {
          setItems((prev) => prev.map((t) => (t.id === item.id ? { ...t, ...data.data! } : t)));
          opts.onSuccess?.();
        } else if (!opts.silent) {
          Alert.alert(tr('Xatolik'), data.xato || tr('Statusni yangilashda xatolik'));
        }
      } catch (err: any) {
        if (opts.silent) return; // korildi belgisi — fon rejimida, UI bezovta qilmaydi
        const msg =
          err?.response?.data?.xato ||
          err?.response?.data?.detail ||
          tr("Server bilan bog'lanishda xatolik");
        Alert.alert(
          tr('Xatolik'),
          typeof msg === 'string' ? msg : tr('Statusni yangilashda xatolik'),
          [
            { text: tr('Bekor qilish'), style: 'cancel' },
            { text: tr('Qayta urinish'), onPress: () => updateStatus(item, status, opts) },
          ],
        );
      } finally {
        if (!opts.silent) setActionId(null);
      }
    },
    [tr],
  );

  const confirmBajarildi = (item: Topshiriq) => {
    Alert.alert(
      tr('Topshiriqni yakunlash'),
      tr(`"${item.sarlavha}" topshirig'ini bajarildi deb belgilaysizmi?`),
      [
        { text: tr('Bekor qilish'), style: 'cancel' },
        {
          text: tr('Bajarildi'),
          onPress: () => updateStatus(item, 'bajarildi', { onSuccess: () => setSelected(null) }),
        },
      ],
    );
  };

  const openDetail = (item: Topshiriq) => {
    setSelected(item);
    if (item.status === 'yangi') {
      updateStatus(item, 'korildi', { silent: true });
    }
  };

  const { faol, bajarildi } = useMemo(() => {
    const done: Topshiriq[] = [];
    const active: Topshiriq[] = [];
    for (const t of items) {
      if (t.status === 'bajarildi') done.push(t);
      else active.push(t);
    }
    active.sort((a, b) => {
      const od = Number(isOverdue(b)) - Number(isOverdue(a));
      if (od !== 0) return od;
      return new Date(a.muddat).getTime() - new Date(b.muddat).getTime();
    });
    done.sort((a, b) => new Date(b.muddat).getTime() - new Date(a.muddat).getTime());
    return { faol: active, bajarildi: done };
  }, [items]);

  const data = segment === 'faol' ? faol : bajarildi;

  const renderItem = ({ item, index }: { item: Topshiriq; index: number }) => {
    const cfg = STATUS_CFG[item.status] || {
      label: item.status,
      color: Colors.textMuted,
      icon: 'help-circle-outline' as IconName,
    };
    const late = isOverdue(item);
    const done = item.status === 'bajarildi';

    return (
      <TouchableOpacity
        style={[styles.row, index > 0 && styles.rowBorder, done && styles.rowDone]}
        onPress={() => openDetail(item)}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`${item.sarlavha}, ${tr(cfg.label)}`}
      >
        <MaterialCommunityIcons
          name={done ? 'check-circle' : cfg.icon}
          size={22}
          color={done ? Colors.success : cfg.color}
          style={styles.rowIcon}
        />
        <View style={styles.rowBody}>
          <Text style={[styles.rowTitle, done && styles.rowTitleDone]} numberOfLines={2}>
            {item.sarlavha}
          </Text>
          <View style={styles.rowMeta}>
            <MaterialCommunityIcons
              name="calendar-clock"
              size={13}
              color={late ? Colors.danger : Colors.textMuted}
            />
            <Text style={[styles.rowMetaText, late && styles.rowMetaLate]}>
              {formatDate(item.muddat)}
            </Text>
            {late && (
              <View style={styles.latePill}>
                <Text style={styles.latePillText}>{tr('Kechikkan')}</Text>
              </View>
            )}
            {item.mfy_nomi ? (
              <>
                <Text style={styles.rowMetaDot}>·</Text>
                <Text style={styles.rowMetaText} numberOfLines={1}>
                  {item.mfy_nomi}
                </Text>
              </>
            ) : null}
          </View>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={18} color={Colors.textMuted} />
      </TouchableOpacity>
    );
  };

  const selectedLate = selected ? isOverdue(selected) : false;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{tr('Topshiriqlarim')}</Text>
        <Text style={styles.headerCount}>
          {faol.length} {tr('faol')}
        </Text>
      </View>

      {/* Segmented control */}
      <View style={styles.segmentTrack}>
        {(['faol', 'bajarildi'] as Segment[]).map((key) => {
          const active = segment === key;
          const count = key === 'faol' ? faol.length : bajarildi.length;
          return (
            <TouchableOpacity
              key={key}
              style={[styles.segment, active && styles.segmentActive]}
              onPress={() => setSegment(key)}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                {key === 'faol' ? tr('Faol') : tr('Bajarildi')}
              </Text>
              {key === 'faol' && count > 0 && (
                <View style={[styles.segmentBadge, active && styles.segmentBadgeActive]}>
                  <Text style={[styles.segmentBadgeText, active && styles.segmentBadgeTextActive]}>
                    {count}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      <FlatList
        data={data}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        style={data.length > 0 ? styles.listContainer : undefined}
        contentContainerStyle={[
          styles.list,
          data.length === 0 && { paddingHorizontal: Spacing.base },
          { paddingBottom: tabBarContentPadding(insets.bottom) },
        ]}
        refreshControl={<PullToRefresh refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator
              size="large"
              color={Colors.primary}
              style={{ marginTop: Spacing['3xl'] }}
            />
          ) : (
            <View style={styles.emptyBox}>
              <MaterialCommunityIcons
                name={segment === 'faol' ? 'clipboard-check-outline' : 'check-all'}
                size={28}
                color={Colors.textMuted}
              />
              <Text style={styles.emptyText}>
                {segment === 'faol'
                  ? tr("Faol topshiriqlar yo'q")
                  : tr("Bajarilgan topshiriqlar hali yo'q")}
              </Text>
            </View>
          )
        }
      />

      {/* Topshiriq tafsiloti — pastdan chiqadigan sheet */}
      <Modal
        visible={selected !== null}
        animationType="slide"
        transparent
        onRequestClose={() => setSelected(null)}
      >
        <Pressable style={styles.backdrop} onPress={() => setSelected(null)} />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, Spacing.md) }]}>
          <View style={styles.sheetHandle} />
          {selected && (
            <>
              <Text style={styles.sheetTitle}>{selected.sarlavha}</Text>
              {selected.matn ? <Text style={styles.sheetMatn}>{selected.matn}</Text> : null}

              <View style={styles.sheetMeta}>
                <View style={styles.sheetMetaRow}>
                  <MaterialCommunityIcons
                    name="calendar-clock"
                    size={16}
                    color={selectedLate ? Colors.danger : Colors.textMuted}
                  />
                  <Text style={[styles.sheetMetaText, selectedLate && styles.rowMetaLate]}>
                    {formatDate(selected.muddat)}
                  </Text>
                  {selectedLate && (
                    <View style={styles.latePill}>
                      <Text style={styles.latePillText}>{tr('Kechikkan')}</Text>
                    </View>
                  )}
                </View>
                {selected.mfy_nomi ? (
                  <View style={styles.sheetMetaRow}>
                    <MaterialCommunityIcons
                      name="map-marker-outline"
                      size={16}
                      color={Colors.textMuted}
                    />
                    <Text style={styles.sheetMetaText}>{selected.mfy_nomi}</Text>
                  </View>
                ) : null}
                {selected.rahbar_fio ? (
                  <View style={styles.sheetMetaRow}>
                    <MaterialCommunityIcons
                      name="account-tie-outline"
                      size={16}
                      color={Colors.textMuted}
                    />
                    <Text style={styles.sheetMetaText}>{selected.rahbar_fio}</Text>
                  </View>
                ) : null}
              </View>

              {selected.status !== 'bajarildi' && (
                <Button
                  title={tr('Bajarildi')}
                  icon="check-bold"
                  loading={actionId === selected.id}
                  onPress={() => confirmBajarildi(selected)}
                />
              )}
              <Button
                title={tr('Yopish')}
                variant="ghost"
                style={styles.sheetClose}
                onPress={() => setSelected(null)}
              />
            </>
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  headerTitle: {
    fontSize: FontSizes['2xl'],
    fontWeight: FontWeights.bold,
    fontFamily: Fonts.heading,
    color: Colors.textPrimary,
  },
  headerCount: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.body,
    color: Colors.textMuted,
    fontVariant: ['tabular-nums'],
  },
  segmentTrack: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceSubtle,
    borderRadius: Radius.md,
    padding: Spacing.xxs,
    marginHorizontal: Spacing.base,
    marginBottom: Spacing.sm,
  },
  segment: {
    flex: 1,
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.sm,
    gap: Spacing.xs,
  },
  segmentActive: {
    backgroundColor: Colors.surface,
  },
  segmentText: {
    fontSize: FontSizes.base,
    fontFamily: Fonts.body,
    fontWeight: FontWeights.medium,
    color: Colors.textMuted,
  },
  segmentTextActive: {
    color: Colors.primary,
    fontWeight: FontWeights.semibold,
  },
  segmentBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: Radius.full,
    backgroundColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  segmentBadgeActive: {
    backgroundColor: Colors.primarySurface,
  },
  segmentBadgeText: {
    fontSize: FontSizes.xs,
    fontFamily: Fonts.body,
    fontWeight: FontWeights.semibold,
    color: Colors.textSecondary,
    fontVariant: ['tabular-nums'],
  },
  segmentBadgeTextActive: {
    color: Colors.primary,
  },
  list: { flexGrow: 1 },
  listContainer: {
    marginHorizontal: Spacing.base,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    overflow: 'hidden',
    flexGrow: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 64,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
    backgroundColor: Colors.surface,
  },
  rowBorder: {
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  rowDone: {
    opacity: 0.6,
  },
  rowIcon: { marginRight: Spacing.xxs },
  rowBody: { flex: 1 },
  rowTitle: {
    fontSize: FontSizes.base,
    fontWeight: FontWeights.semibold,
    fontFamily: Fonts.body,
    color: Colors.textPrimary,
  },
  rowTitleDone: {
    color: Colors.textSecondary,
  },
  rowMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
    marginTop: Spacing.xxs,
  },
  rowMetaText: {
    fontSize: FontSizes.xs,
    fontFamily: Fonts.body,
    color: Colors.textMuted,
    flexShrink: 1,
  },
  rowMetaLate: {
    color: Colors.danger,
  },
  rowMetaDot: {
    fontSize: FontSizes.xs,
    fontFamily: Fonts.body,
    color: Colors.textMuted,
  },
  latePill: {
    backgroundColor: Colors.dangerSurface,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
  },
  latePillText: {
    fontSize: FontSizes['2xs'],
    fontFamily: Fonts.body,
    fontWeight: FontWeights.semibold,
    color: Colors.danger,
  },
  emptyBox: {
    alignItems: 'center',
    marginTop: Spacing['3xl'],
    gap: Spacing.sm,
    paddingHorizontal: Spacing['2xl'],
  },
  emptyText: {
    fontSize: FontSizes.base,
    fontFamily: Fonts.body,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(13, 27, 42, 0.4)',
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.sm,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: Radius.full,
    backgroundColor: Colors.border,
    marginBottom: Spacing.md,
  },
  sheetTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    fontFamily: Fonts.heading,
    color: Colors.textPrimary,
  },
  sheetMatn: {
    fontSize: FontSizes.base,
    fontFamily: Fonts.body,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginTop: Spacing.sm,
  },
  sheetMeta: {
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    paddingTop: Spacing.md,
  },
  sheetMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  sheetMetaText: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.body,
    color: Colors.textSecondary,
    flexShrink: 1,
  },
  sheetClose: {
    minHeight: 44,
  },
});

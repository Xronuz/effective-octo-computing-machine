import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import PullToRefresh from '../components/PullToRefresh';
import api from '../services/api';
import { cacheXonadonlar, getCacheXonadonlar } from '../services/cache';
import { Fonts, FontSizes, FontWeights, Spacing, Radius, tabBarContentPadding } from '../theme';
import type { ColorPalette } from '../theme/colors';
import type { ApiResponse, Paginated, XonadonSummary } from '../types';
import { useAlifbo } from '../contexts/AlifboContext';
import { useTheme } from '../contexts/ThemeContext';
import { useTabScreenNavigation } from '../navigation/hooks';
import { useAuth } from '../contexts/AuthContext';
import { useMeningXonadonlarim } from '../hooks/useMeningXonadonlarim';

/**
 * XONADONLAR.
 * Inspektor (`xodim`) uchun — "Mening xonadonlarim": o'ziga biriktirilgan
 * MFY(lar) ichidagi xonadonlar navbati, bugun tekshirilmaganlari birinchi.
 * Rahbar/superadmin uchun — hozirgidek to'liq qidiriladigan katalog.
 * Muammo yaratish faqat xonadon ichidan boshlanadi — FAB olib tashlandi.
 */
export default function XonadonlarScreen() {
  const { user } = useAuth();
  if (user?.rol === 'xodim') {
    return <MeningXonadonlarimRoyxati />;
  }
  return <ToliqXonadonlarKatalogi />;
}

function MeningXonadonlarimRoyxati() {
  const navigation = useTabScreenNavigation();
  const { tr } = useAlifbo();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const {
    mfylar,
    tanlanganMfyId,
    setTanlanganMfyId,
    items,
    total,
    tekshirilganSoni,
    loading,
    refreshing,
    loadMore,
    refresh,
  } = useMeningXonadonlarim();

  const renderItem = ({ item, index }: { item: XonadonSummary; index: number }) => {
    const tekshirilgan = item.tekshirilgan_bugun;
    return (
      <TouchableOpacity
        style={[
          styles.row,
          index > 0 && styles.rowSeparator,
          index === 0 && styles.rowFirst,
          index === items.length - 1 && styles.rowLast,
        ]}
        onPress={() => navigation.navigate('XonadonDetail', { id: item.id })}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={item.full_address || tr('Manzil mavjud emas')}
      >
        <View style={styles.rowInfo}>
          <Text style={styles.rowTitle} numberOfLines={1}>
            {item.full_address || tr('Manzil mavjud emas')}
          </Text>
          <Text style={styles.rowMeta} numberOfLines={1}>
            {item.mfy_nomi || '-'} · {tr('Uy')} {item.uy_raqami || '-'}
          </Text>
        </View>
        <View
          style={[
            styles.tekshirilganPill,
            tekshirilgan ? styles.tekshirilganPillDone : styles.tekshirilganPillPending,
          ]}
        >
          <MaterialCommunityIcons
            name={tekshirilgan ? 'check-circle' : 'clock-outline'}
            size={14}
            color={tekshirilgan ? colors.success : colors.textMuted}
          />
          <Text
            style={[
              styles.tekshirilganPillText,
              { color: tekshirilgan ? colors.success : colors.textMuted },
            ]}
          >
            {tekshirilgan ? tr('Tekshirildi') : tr('Navbatda')}
          </Text>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={22} color={colors.textMuted} />
      </TouchableOpacity>
    );
  };

  const ListEmpty = () =>
    !loading ? (
      <View style={styles.emptyBox}>
        <Text style={styles.emptyTitle}>
          {mfylar.length === 0 ? tr('MFY biriktirilmagan') : tr('Xonadonlar topilmadi')}
        </Text>
        <Text style={styles.emptyText}>
          {mfylar.length === 0
            ? tr('Sizga hali hech qanday MFY biriktirilmagan')
            : tr('Ushbu MFYda xonadonlar topilmadi')}
        </Text>
      </View>
    ) : null;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{tr('Mening xonadonlarim')}</Text>
        {total > 0 && (
          <Text style={styles.headerProgress}>
            {tekshirilganSoni}/{total} {tr('tekshirildi')}
          </Text>
        )}
      </View>

      {mfylar.length > 1 && (
        <View style={styles.mfyChipRow}>
          {mfylar.map((m) => {
            const active = m.mfy_id === tanlanganMfyId;
            return (
              <TouchableOpacity
                key={m.mfy_id}
                style={[styles.mfyChip, active && styles.mfyChipActive]}
                onPress={() => setTanlanganMfyId(m.mfy_id)}
                activeOpacity={0.7}
              >
                <Text style={[styles.mfyChipText, active && styles.mfyChipTextActive]}>
                  {m.nomi || `MFY #${m.mfy_id}`}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: tabBarContentPadding(insets.bottom) },
        ]}
        refreshControl={<PullToRefresh refreshing={refreshing} onRefresh={refresh} />}
        onEndReached={loadMore}
        onEndReachedThreshold={0.4}
        ListEmptyComponent={ListEmpty}
        ListFooterComponent={
          loading ? (
            <ActivityIndicator
              style={{ padding: Spacing.base }}
              size="small"
              color={colors.primary}
            />
          ) : null
        }
      />
    </SafeAreaView>
  );
}

function ToliqXonadonlarKatalogi() {
  const navigation = useTabScreenNavigation();
  const { tr } = useAlifbo();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [items, setItems] = useState<XonadonSummary[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  const fetchData = useCallback(async (pg: number, qidiruv: string) => {
    try {
      setLoading(true);
      if (pg === 1 && !qidiruv.trim()) {
        const cached = await getCacheXonadonlar();
        if (cached) {
          setItems(cached);
          setTotal(cached.length);
        }
      }
      const params = new URLSearchParams();
      params.append('page', String(pg));
      params.append('size', '20');
      if (qidiruv.trim()) params.append('qidiruv', qidiruv.trim());

      const { data } = await api.get<ApiResponse<Paginated<XonadonSummary>>>(
        `/xonadonlar?${params}`,
      );
      if (data.ok && data.data) {
        if (pg === 1) {
          setItems(data.data.items);
        } else {
          setItems((prev) => [...prev, ...data.data!.items]);
        }
        setTotal(data.data.total);
        if (pg === 1 && !qidiruv.trim()) {
          await cacheXonadonlar(data.data.items);
        }
      }
    } catch {
      // Tarmoq yo'q — cache'dan ko'rsatilgan bo'ladi
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Debounce: yozish to'xtagach (400ms) 1-sahifani qayta yuklaydi.
  // Mount'da ham ishlaydi — boshlang'ich yuklash shu yerda.
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchData(1, search);
    }, 400);
    return () => clearTimeout(timer);
  }, [search, fetchData]);

  // Ekran qayta fokusga kelganda (masalan XonadonDetail'da muammoni yopib
  // orqaga qaytilganda) "ochiq muammolar" belgisi eskirib qolmasligi uchun
  // ro'yxatni qayta yuklaymiz.
  const birinchiFokusRef = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (birinchiFokusRef.current) {
        birinchiFokusRef.current = false;
        return;
      }
      setPage(1);
      fetchData(1, search);
    }, [fetchData, search]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    setPage(1);
    fetchData(1, search);
  };

  const loadMore = () => {
    if (loading || items.length >= total) return;
    const nextPage = page + 1;
    setPage(nextPage);
    fetchData(nextPage, search);
  };

  const renderItem = ({ item, index }: { item: XonadonSummary; index: number }) => {
    const openCount = item.ochiq_muammolar_soni || 0;
    return (
      <TouchableOpacity
        style={[
          styles.row,
          index > 0 && styles.rowSeparator,
          index === 0 && styles.rowFirst,
          index === items.length - 1 && styles.rowLast,
        ]}
        onPress={() => navigation.navigate('XonadonDetail', { id: item.id })}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={item.full_address || tr('Manzil mavjud emas')}
      >
        <View style={styles.rowInfo}>
          <Text style={styles.rowTitle} numberOfLines={1}>
            {item.full_address || tr('Manzil mavjud emas')}
          </Text>
          <Text style={styles.rowMeta} numberOfLines={1}>
            {item.mfy_nomi || '-'} · {tr('Uy')} {item.uy_raqami || '-'}
          </Text>
        </View>
        {openCount > 0 ? (
          <View style={styles.openBadge}>
            <MaterialCommunityIcons name="alert" size={14} color={colors.textInverse} />
            <Text style={styles.openBadgeText}>{openCount}</Text>
          </View>
        ) : null}
        <MaterialCommunityIcons name="chevron-right" size={22} color={colors.textMuted} />
      </TouchableOpacity>
    );
  };

  const ListEmpty = () =>
    !loading ? (
      <View style={styles.emptyBox}>
        <Text style={styles.emptyTitle}>{tr('Xonadonlar topilmadi')}</Text>
        <Text style={styles.emptyText}>{tr("Manzil yoki MFY nomi bo'yicha qidirib ko'ring")}</Text>
      </View>
    ) : null;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{tr('Xonadonlar')}</Text>
      </View>

      {/* Search */}
      <View style={styles.searchRow}>
        <View style={styles.searchBar}>
          <MaterialCommunityIcons
            name="magnify"
            size={22}
            color={colors.textMuted}
            style={{ marginLeft: Spacing.md }}
          />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder={tr("Manzil bo'yicha qidirish...")}
            placeholderTextColor={colors.textMuted}
            returnKeyType="search"
            autoCorrect={false}
          />
          {search.length > 0 ? (
            <TouchableOpacity
              onPress={() => setSearch('')}
              style={styles.searchClear}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={tr('Qidiruvni tozalash')}
            >
              <MaterialCommunityIcons name="close-circle" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: tabBarContentPadding(insets.bottom) },
        ]}
        refreshControl={<PullToRefresh refreshing={refreshing} onRefresh={onRefresh} />}
        onEndReached={loadMore}
        onEndReachedThreshold={0.4}
        ListEmptyComponent={ListEmpty}
        ListFooterComponent={
          loading ? (
            <ActivityIndicator
              style={{ padding: Spacing.base }}
              size="small"
              color={colors.primary}
            />
          ) : null
        }
      />
    </SafeAreaView>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    header: { paddingHorizontal: Spacing.base, paddingTop: Spacing.md, paddingBottom: Spacing.sm },
    headerTitle: {
      fontSize: FontSizes['2xl'],
      fontWeight: FontWeights.bold,
      fontFamily: Fonts.heading,
      color: colors.textPrimary,
    },
    headerProgress: {
      fontSize: FontSizes.sm,
      fontWeight: FontWeights.semibold,
      fontFamily: Fonts.body,
      color: colors.textSecondary,
      marginTop: 2,
    },
    searchRow: {
      paddingHorizontal: Spacing.base,
      paddingTop: Spacing.xs,
      paddingBottom: Spacing.xs,
    },
    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: 48,
      backgroundColor: colors.surface,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    searchInput: {
      flex: 1,
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.sm,
      fontSize: FontSizes.base,
      fontFamily: Fonts.body,
      color: colors.textPrimary,
    },
    searchClear: {
      minWidth: 44,
      minHeight: 44,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: Spacing.xxs,
    },
    mfyChipRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Spacing.xs,
      paddingHorizontal: Spacing.base,
      paddingBottom: Spacing.sm,
    },
    mfyChip: {
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.xs,
      borderRadius: Radius.full,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    mfyChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    mfyChipText: {
      fontSize: FontSizes.sm,
      fontWeight: FontWeights.medium,
      fontFamily: Fonts.body,
      color: colors.textSecondary,
    },
    mfyChipTextActive: { color: colors.textInverse },
    tekshirilganPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xxs,
      borderRadius: Radius.full,
      paddingHorizontal: Spacing.xs,
      paddingVertical: Spacing.xxs,
      borderWidth: 1,
    },
    tekshirilganPillDone: { backgroundColor: colors.successSurface, borderColor: '#A8D9BF' },
    tekshirilganPillPending: { backgroundColor: colors.surfaceSubtle, borderColor: colors.border },
    tekshirilganPillText: {
      fontSize: FontSizes.xs,
      fontWeight: FontWeights.semibold,
      fontFamily: Fonts.body,
    },
    list: { padding: Spacing.base, paddingTop: Spacing.sm, flexGrow: 1 },
    // Bitta ramkali konteyner ichidagi ixcham qatorlar (AttentionList uslubi)
    row: {
      minHeight: 64,
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.borderLight,
    },
    rowSeparator: { borderTopWidth: 0 },
    rowFirst: { borderTopLeftRadius: Radius.md, borderTopRightRadius: Radius.md },
    rowLast: { borderBottomLeftRadius: Radius.md, borderBottomRightRadius: Radius.md },
    rowInfo: { flex: 1, gap: Spacing.xxs },
    rowTitle: {
      fontSize: FontSizes.base,
      fontWeight: FontWeights.semibold,
      fontFamily: Fonts.body,
      color: colors.textPrimary,
    },
    rowMeta: {
      fontSize: FontSizes.sm,
      fontFamily: Fonts.body,
      color: colors.textMuted,
    },
    openBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xxs,
      backgroundColor: colors.danger,
      borderRadius: Radius.full,
      paddingHorizontal: Spacing.xs,
      paddingVertical: Spacing.xxs,
    },
    openBadgeText: {
      fontSize: FontSizes.xs,
      fontWeight: FontWeights.bold,
      fontFamily: Fonts.body,
      color: colors.textInverse,
      fontVariant: ['tabular-nums'],
    },
    emptyBox: {
      alignItems: 'center',
      marginTop: Spacing['4xl'],
      paddingHorizontal: Spacing['2xl'],
    },
    emptyTitle: {
      fontSize: FontSizes.lg,
      fontWeight: FontWeights.bold,
      fontFamily: Fonts.heading,
      color: colors.textPrimary,
    },
    emptyText: {
      fontSize: FontSizes.base,
      fontFamily: Fonts.body,
      color: colors.textMuted,
      marginTop: Spacing.xs,
      textAlign: 'center',
    },
  });
}

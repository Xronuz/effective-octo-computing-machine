import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput, RefreshControl, ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import api from '../services/api';
import { Colors, Fonts, FontSizes, FontWeights, Spacing, Radius, Shadows, tabBarContentPadding } from '../theme';
import type { ApiResponse, Paginated, XonadonSummary } from '../types';
import { useAlifbo } from '../contexts/AlifboContext';

export default function XonadonlarScreen({ navigation }: any) {
  const { tr } = useAlifbo();
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<XonadonSummary[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  const fetchData = useCallback(async (pg: number, qidiruv: string) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('page', String(pg));
      params.append('size', '20');
      if (qidiruv.trim()) params.append('qidiruv', qidiruv.trim());

      const { data } = await api.get<ApiResponse<Paginated<XonadonSummary>>>(`/xonadonlar?${params}`);
      if (data.ok && data.data) {
        if (pg === 1) {
          setItems(data.data.items);
        } else {
          setItems(prev => [...prev, ...data.data!.items]);
        }
        setTotal(data.data.total);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(1, ''); }, [fetchData]);

  const onRefresh = () => { setRefreshing(true); setPage(1); fetchData(1, search); };
  const onSearch = () => { setPage(1); fetchData(1, search); };

  const loadMore = () => {
    if (loading || items.length >= total) return;
    const nextPage = page + 1;
    setPage(nextPage);
    fetchData(nextPage, search);
  };

  const renderItem = ({ item }: { item: XonadonSummary }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('XonadonDetail', { id: item.id })}
      activeOpacity={0.7}
    >
      <View style={styles.cardLeft}>
        <View style={styles.addressIcon}>
          <MaterialCommunityIcons name="home-map-marker" size={22} color={Colors.primary} />
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {item.full_address || tr('Manzil mavjud emas')}
          </Text>
          <View style={styles.cardMeta}>
            <View style={styles.metaItem}>
              <MaterialCommunityIcons name="map-marker" size={12} color={Colors.textMuted} />
              <Text style={styles.metaText}>{item.mfy_nomi || '-'}</Text>
            </View>
            <View style={styles.metaItem}>
              <MaterialCommunityIcons name="home-outline" size={12} color={Colors.textMuted} />
              <Text style={styles.metaText}>№{item.uy_raqami || '-'}</Text>
            </View>
          </View>
        </View>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={24} color={Colors.textMuted} />
    </TouchableOpacity>
  );

  const ListEmpty = () => (
    !loading ? (
      <View style={styles.emptyBox}>
        <View style={styles.emptyIcon}>
          <MaterialCommunityIcons name="home-search-outline" size={36} color={Colors.textMuted} />
        </View>
        <Text style={styles.emptyTitle}>{tr('Xonadonlar topilmadi')}</Text>
        <Text style={styles.emptyText}>
          {tr("Qidiruv bo'yicha hech narsa topilmadi yoki xonadonlar hali ro'yxatga olinmagan")}
        </Text>
      </View>
    ) : null
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{tr('Xonadonlar')}</Text>
      </View>

      {/* Search */}
      <View style={styles.searchRow}>
        <View style={styles.searchBar}>
          <MaterialCommunityIcons name="magnify" size={20} color={Colors.textMuted} style={{ marginLeft: Spacing.md }} />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder={tr("Manzil bo'yicha qidirish...")}
            placeholderTextColor={Colors.textMuted}
            returnKeyType="search"
            onSubmitEditing={onSearch}
          />
        </View>
      </View>

      <FlatList
        data={items}
        keyExtractor={item => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={[styles.list, { paddingBottom: tabBarContentPadding(insets.bottom) }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} colors={[Colors.primary]} />}
        onEndReached={loadMore}
        onEndReachedThreshold={0.4}
        ListEmptyComponent={ListEmpty}
        ListFooterComponent={loading ? <ActivityIndicator style={{ padding: Spacing.base }} size="small" color={Colors.primary} /> : null}
      />

      {/* Yangi muammo yaratish */}
      <TouchableOpacity
        style={[styles.fab, { bottom: tabBarContentPadding(insets.bottom) }]}
        onPress={() => navigation.navigate('MuammoYaratish', {})}
        activeOpacity={0.85}
      >
        <MaterialCommunityIcons name="plus" size={26} color={Colors.textInverse} />
        <Text style={styles.fabText}>{tr('Muammo yaratish')}</Text>
      </TouchableOpacity>
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
  searchRow: { paddingHorizontal: Spacing.base, paddingTop: Spacing.xs, paddingBottom: Spacing.xs },
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.border,
  },
  searchInput: {
    flex: 1, paddingVertical: Spacing.md, paddingHorizontal: Spacing.sm,
    fontSize: FontSizes.base, fontFamily: Fonts.body, color: Colors.textPrimary,
  },
  list: { padding: Spacing.base, paddingTop: Spacing.sm, flexGrow: 1 },
  card: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.base,
    marginBottom: 10, flexDirection: 'row', alignItems: 'center',
    ...Shadows.sm,
  },
  cardLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  addressIcon: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: Colors.primarySurface, alignItems: 'center', justifyContent: 'center',
  },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: FontSizes.base, fontWeight: FontWeights.semibold, fontFamily: Fonts.body, color: Colors.textPrimary },
  cardMeta: { flexDirection: 'row', marginTop: 4, gap: 14 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaText: { fontSize: FontSizes.xs, fontFamily: Fonts.body, color: Colors.textSecondary },
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
  fab: {
    position: 'absolute', right: Spacing.base, bottom: Spacing.xl,
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.primary, borderRadius: Radius.full,
    paddingVertical: 12, paddingHorizontal: Spacing.lg,
    ...Shadows.lg,
  },
  fabText: {
    fontSize: FontSizes.sm, fontWeight: FontWeights.semibold,
    fontFamily: Fonts.heading, color: Colors.textInverse,
  },
});

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import api from '../services/api';
import { Colors, Fonts, FontSizes, FontWeights, Spacing, Radius, Shadows } from '../theme';
import type { ApiResponse, Xonadon } from '../types';
import { useAlifbo } from '../contexts/AlifboContext';

interface InfoRow {
  label: string;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  value: string;
}

export default function XonadonDetailScreen({ route, navigation }: any) {
  const { tr } = useAlifbo();
  const { id } = route.params;
  const [xonadon, setXonadon] = useState<Xonadon | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const xonRes = await api.get<ApiResponse<Xonadon>>(`/xonadonlar/${id}`);
      if (xonRes.data.ok && xonRes.data.data) {
        setXonadon(xonRes.data.data);
      }
    } catch { /* handled by UI */ }
    finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);
  const onRefresh = () => { setRefreshing(true); fetchData(); };

  if (loading && !xonadon) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>{tr('Yuklanmoqda...')}</Text>
      </SafeAreaView>
    );
  }

  const infoRows: InfoRow[] = [
    { label: tr('MFY'), icon: 'map-marker', value: xonadon?.mfy_nomi || '-' },
    { label: tr('Xonadon raqami'), icon: 'home-outline', value: xonadon?.uy_raqami || '-' },
    { label: tr('Ochiq muammolar'), icon: 'alert-circle-outline', value: String(xonadon?.ochiq_muammolar_soni || 0) },
  ];

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} colors={[Colors.primary]} />}
      >
        {/* Address Card */}
        <View style={styles.addressCard}>
          <View style={styles.addressRow}>
            <MaterialCommunityIcons name="home-map-marker" size={28} color={Colors.primary} />
            <Text style={styles.address} numberOfLines={2}>
              {xonadon?.full_address || tr('Manzil mavjud emas')}
            </Text>
          </View>
        </View>

        {/* Info Card */}
        <View style={styles.card}>
          {infoRows.map((row, i) => (
            <View key={row.label}>
              <View style={styles.infoRow}>
                <View style={styles.infoIcon}>
                  <MaterialCommunityIcons name={row.icon} size={18} color={Colors.primary} />
                </View>
                <Text style={styles.infoLabel}>{row.label}</Text>
                <Text style={[styles.infoValue, row.label === tr('Ochiq muammolar') && {
                  color: (xonadon?.ochiq_muammolar_soni || 0) > 0 ? Colors.danger : Colors.success,
                  fontWeight: FontWeights.bold,
                }]}>{row.value}</Text>
              </View>
              {i < infoRows.length - 1 && <View style={styles.divider} />}
            </View>
          ))}
        </View>

        {/* Muammolar Section */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleBox}>
            <MaterialCommunityIcons name="alert-octagon-outline" size={20} color={Colors.primary} />
            <Text style={styles.sectionTitle}>
              {tr('Muammolar')} ({xonadon?.ochiq_muammolar_soni || 0} {tr('ochiq')})
            </Text>
          </View>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => navigation.navigate('MuammoYaratish', { xonadonId: id })}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="plus-circle-outline" size={18} color={Colors.textInverse} style={{ marginRight: 4 }} />
            <Text style={styles.addBtnText}>{tr('Yangi muammo')}</Text>
          </TouchableOpacity>
        </View>

        {/* Empty Muammo */}
        <View style={styles.emptyBox}>
          <MaterialCommunityIcons name="information-outline" size={36} color={Colors.textMuted} />
          <Text style={styles.emptyText}>
            {tr("Muammolarni ko'rish uchun veb-dashboarddan foydalaning yoki yangi muammo qo'shing.")}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  loadingText: { marginTop: Spacing.md, fontSize: FontSizes.base, fontFamily: Fonts.body, color: Colors.textSecondary },
  content: { padding: Spacing.base, paddingBottom: Spacing['4xl'] },
  addressCard: {
    backgroundColor: Colors.primary, borderRadius: Radius.xl,
    padding: Spacing.xl, marginBottom: Spacing.base, ...Shadows.lg,
  },
  addressRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  address: {
    fontSize: FontSizes.lg, fontWeight: FontWeights.bold, fontFamily: Fonts.heading,
    color: Colors.textInverse, flex: 1,
  },
  card: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    paddingHorizontal: Spacing.base, marginBottom: Spacing.xl, ...Shadows.sm,
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
  infoIcon: {
    width: 34, height: 34, borderRadius: 8,
    backgroundColor: Colors.primarySurface, alignItems: 'center', justifyContent: 'center',
    marginRight: Spacing.md,
  },
  infoLabel: { fontSize: FontSizes.sm, fontFamily: Fonts.body, color: Colors.textSecondary, width: 130 },
  infoValue: { fontSize: FontSizes.sm, fontFamily: Fonts.body, color: Colors.textPrimary, flex: 1, fontWeight: FontWeights.medium },
  divider: { height: 1, backgroundColor: Colors.borderLight, marginLeft: 46 },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitleBox: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  sectionTitle: { fontSize: FontSizes.md, fontWeight: FontWeights.bold, fontFamily: Fonts.heading, color: Colors.textPrimary },
  addBtn: {
    backgroundColor: Colors.primary, borderRadius: Radius.md,
    paddingHorizontal: 14, paddingVertical: 8, flexDirection: 'row', alignItems: 'center',
  },
  addBtnText: { color: Colors.textInverse, fontWeight: FontWeights.semibold, fontFamily: Fonts.body, fontSize: FontSizes.sm },
  emptyBox: { alignItems: 'center', marginTop: Spacing.xl, paddingHorizontal: Spacing['2xl'] },
  emptyText: { textAlign: 'center', fontSize: FontSizes.sm, fontFamily: Fonts.body, color: Colors.textMuted, marginTop: Spacing.sm, lineHeight: 20 },
});

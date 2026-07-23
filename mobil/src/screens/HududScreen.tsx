import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, ActivityIndicator,
  Modal, ScrollView, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import api from '../services/api';
import FormField from '../components/FormField';
import Button from '../components/Button';
import { Colors, Fonts, FontSizes, FontWeights, Spacing, Radius, Shadows, tabBarContentPadding } from '../theme';
import type { ApiResponse, Paginated, MfyBrief, KochaBrief, XonadonSummary } from '../types';

interface KochaDetail extends KochaBrief {
  expanded: boolean;
  xonadonlar: XonadonSummary[];
  loadingXonadonlar: boolean;
}

interface MfyDetail extends MfyBrief {
  expanded: boolean;
  kochalar: KochaDetail[];
  loadingKochalar: boolean;
}

interface YangiXonadonForm {
  uy_raqami: string;
  egasi_fio: string;
  egasi_tel: string;
  izoh: string;
}

const EMPTY_FORM: YangiXonadonForm = { uy_raqami: '', egasi_fio: '', egasi_tel: '', izoh: '' };

export default function HududScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<MfyDetail[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Yangi xonadon modali
  const [modalKocha, setModalKocha] = useState<KochaDetail | null>(null);
  const [form, setForm] = useState<YangiXonadonForm>(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchMfylar = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get<ApiResponse<MfyBrief[]>>('/mfylar');
      if (data.ok && data.data) {
        setItems(
          data.data.map((m) => ({
            ...m,
            expanded: false,
            kochalar: [],
            loadingKochalar: false,
          }))
        );
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchMfylar(); }, [fetchMfylar]);

  const onRefresh = () => { setRefreshing(true); fetchMfylar(); };

  const patchMfy = (index: number, patch: Partial<MfyDetail>) => {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  };

  const patchKocha = (mfyIndex: number, kochaIndex: number, patch: Partial<KochaDetail>) => {
    setItems((prev) =>
      prev.map((m, i) =>
        i === mfyIndex
          ? { ...m, kochalar: m.kochalar.map((k, j) => (j === kochaIndex ? { ...k, ...patch } : k)) }
          : m
      )
    );
  };

  const toggleExpand = async (index: number) => {
    const mfy = items[index];
    if (mfy.expanded) {
      patchMfy(index, { expanded: false });
      return;
    }
    if (mfy.kochalar.length > 0) {
      patchMfy(index, { expanded: true });
      return;
    }
    patchMfy(index, { loadingKochalar: true });
    try {
      const { data } = await api.get<ApiResponse<{ kochalar: KochaBrief[] }>>(`/mfylar/${mfy.id}`);
      if (data.ok && data.data) {
        patchMfy(index, {
          kochalar: data.data.kochalar.map((k) => ({
            ...k,
            mfy_id: mfy.id,
            expanded: false,
            xonadonlar: [],
            loadingXonadonlar: false,
          })),
          expanded: true,
          loadingKochalar: false,
        });
      } else {
        patchMfy(index, { loadingKochalar: false });
      }
    } catch {
      patchMfy(index, { loadingKochalar: false });
    }
  };

  const toggleKocha = async (mfyIndex: number, kochaIndex: number) => {
    const kocha = items[mfyIndex].kochalar[kochaIndex];
    if (kocha.expanded) {
      patchKocha(mfyIndex, kochaIndex, { expanded: false });
      return;
    }
    if (kocha.xonadonlar.length > 0) {
      patchKocha(mfyIndex, kochaIndex, { expanded: true });
      return;
    }
    patchKocha(mfyIndex, kochaIndex, { loadingXonadonlar: true });
    try {
      const { data } = await api.get<ApiResponse<Paginated<XonadonSummary>>>(
        `/xonadonlar?kocha_id=${kocha.id}&size=100`,
      );
      if (data.ok && data.data) {
        patchKocha(mfyIndex, kochaIndex, {
          xonadonlar: data.data.items,
          expanded: true,
          loadingXonadonlar: false,
        });
      } else {
        patchKocha(mfyIndex, kochaIndex, { loadingXonadonlar: false });
      }
    } catch {
      patchKocha(mfyIndex, kochaIndex, { loadingXonadonlar: false });
    }
  };

  const openXonadonModal = (kocha: KochaDetail) => {
    setModalKocha(kocha);
    setForm(EMPTY_FORM);
    setFormError('');
  };

  const handleCreateXonadon = async () => {
    if (!modalKocha) return;
    if (!form.uy_raqami.trim()) {
      setFormError('Uy raqamini kiriting');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      const { data } = await api.post<ApiResponse<XonadonSummary>>('/xonadonlar', {
        kocha_id: modalKocha.id,
        uy_raqami: form.uy_raqami.trim(),
        egasi_fio: form.egasi_fio.trim() || null,
        egasi_tel: form.egasi_tel.trim() || null,
        izoh: form.izoh.trim() || null,
      });
      if (data.ok && data.data) {
        const yangi = data.data;
        setModalKocha(null);
        // Ro'yxatni yangilash
        setItems((prev) =>
          prev.map((m) => ({
            ...m,
            kochalar: m.kochalar.map((k) =>
              k.id === yangi.kocha_id
                ? { ...k, xonadonlar: [...k.xonadonlar, yangi], xonadon_soni: k.xonadon_soni + 1 }
                : k
            ),
          }))
        );
        Alert.alert('Muvaffaqiyat', `№${yangi.uy_raqami} uy qo'shildi`, [
          { text: 'Yopish', style: 'cancel' },
          { text: 'Muammo yaratish', onPress: () => navigation.navigate('MuammoYaratish', { xonadonId: yangi.id }) },
        ]);
      } else {
        setFormError(data.xato || "Xonadon qo'shishda xatolik");
      }
    } catch (err: any) {
      const msg =
        err?.response?.data?.xato ||
        err?.response?.data?.detail ||
        "Server bilan bog'lanishda xatolik";
      setFormError(typeof msg === 'string' ? msg : "Xonadon qo'shishda xatolik");
    } finally {
      setSaving(false);
    }
  };

  const renderXonadon = (x: XonadonSummary) => (
    <TouchableOpacity
      key={x.id}
      style={styles.xonadonRow}
      onPress={() => navigation.navigate('MuammoYaratish', { xonadonId: x.id })}
      activeOpacity={0.7}
    >
      <View style={styles.xonadonLeft}>
        <MaterialCommunityIcons name="home-outline" size={16} color={Colors.primary} style={{ marginRight: 8 }} />
        <View style={{ flex: 1 }}>
          <Text style={styles.xonadonTitle}>№{x.uy_raqami} uy</Text>
          {x.egasi_fio ? <Text style={styles.xonadonMeta}>{x.egasi_fio}</Text> : null}
        </View>
      </View>
      <View style={styles.xonadonRight}>
        {x.ochiq_muammolar_soni > 0 && (
          <View style={styles.muammoBadge}>
            <Text style={styles.muammoBadgeText}>{x.ochiq_muammolar_soni}</Text>
          </View>
        )}
        <MaterialCommunityIcons name="chevron-right" size={18} color={Colors.textMuted} />
      </View>
    </TouchableOpacity>
  );

  const renderItem = ({ item, index }: { item: MfyDetail; index: number }) => (
    <View style={styles.mfyCard}>
      <TouchableOpacity
        style={styles.mfyHeader}
        onPress={() => toggleExpand(index)}
        activeOpacity={0.7}
      >
        <View style={styles.mfyLeft}>
          <View style={styles.mfyIndexCircle}>
            <Text style={styles.mfyIndexText}>{item.raqami}</Text>
          </View>
          <View style={styles.mfyInfo}>
            <Text style={styles.mfyTitle} numberOfLines={1}>{item.nomi}</Text>
            <View style={styles.mfyStats}>
              <View style={styles.statBadge}>
                <MaterialCommunityIcons name="home-outline" size={12} color={Colors.primary} style={{ marginRight: 3 }} />
                <Text style={styles.statText}>{item.xonadon_soni}</Text>
              </View>
              <View style={styles.statBadge}>
                <MaterialCommunityIcons name="road-variant" size={12} color={Colors.secondary} style={{ marginRight: 3 }} />
                <Text style={styles.statText}>{item.kochalar_soni}</Text>
              </View>
            </View>
          </View>
        </View>
        <MaterialCommunityIcons
          name={item.expanded ? 'chevron-up' : 'chevron-down'}
          size={22}
          color={Colors.textMuted}
        />
      </TouchableOpacity>

      {item.expanded && (
        <View style={styles.kochalarList}>
          {item.loadingKochalar ? (
            <ActivityIndicator size="small" color={Colors.primary} style={{ padding: Spacing.base }} />
          ) : item.kochalar.length === 0 ? (
            <Text style={styles.noKochalar}>Ko'chalar mavjud emas</Text>
          ) : (
            item.kochalar.map((k, kochaIndex) => (
              <View key={k.id}>
                <TouchableOpacity
                  style={styles.kochaRow}
                  onPress={() => toggleKocha(index, kochaIndex)}
                  activeOpacity={0.7}
                >
                  <View style={styles.kochaLeft}>
                    <MaterialCommunityIcons name="map-marker-outline" size={14} color={Colors.textMuted} style={{ marginRight: 6 }} />
                    <Text style={styles.kochaNom}>{k.nomi}</Text>
                  </View>
                  <View style={styles.kochaRight}>
                    <View style={styles.kochaCount}>
                      <Text style={styles.kochaSoni}>{k.xonadon_soni}</Text>
                      <Text style={styles.kochaLabel}>xonadon</Text>
                    </View>
                    <MaterialCommunityIcons
                      name={k.expanded ? 'chevron-up' : 'chevron-down'}
                      size={18}
                      color={Colors.textMuted}
                    />
                  </View>
                </TouchableOpacity>

                {k.expanded && (
                  <View style={styles.xonadonlarList}>
                    {k.loadingXonadonlar ? (
                      <ActivityIndicator size="small" color={Colors.primary} style={{ padding: Spacing.sm }} />
                    ) : (
                      <>
                        {k.xonadonlar.length === 0 ? (
                          <Text style={styles.noKochalar}>Bu ko'chada xonadonlar yo'q</Text>
                        ) : (
                          k.xonadonlar.map(renderXonadon)
                        )}
                        <TouchableOpacity
                          style={styles.addXonadonBtn}
                          onPress={() => openXonadonModal(k)}
                          activeOpacity={0.75}
                        >
                          <MaterialCommunityIcons name="plus-circle-outline" size={18} color={Colors.primary} style={{ marginRight: 6 }} />
                          <Text style={styles.addXonadonText}>Yangi xonadon</Text>
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                )}
              </View>
            ))
          )}
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Hududlar</Text>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={[styles.list, { paddingBottom: tabBarContentPadding(insets.bottom) }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyBox}>
              <View style={styles.emptyIcon}>
                <MaterialCommunityIcons name="map-search-outline" size={36} color={Colors.textMuted} />
              </View>
              <Text style={styles.emptyTitle}>Hududlar yuklanmadi</Text>
              <Text style={styles.emptyText}>MFY ma'lumotlarini yuklab bo'lmadi. Internet aloqasini tekshirib, qayta urinib ko'ring.</Text>
            </View>
          ) : null
        }
        ListHeaderComponent={
          loading && items.length === 0 ? (
            <ActivityIndicator size="large" color={Colors.primary} style={{ padding: 48 }} />
          ) : null
        }
      />

      {/* Yangi xonadon modali */}
      <Modal
        visible={modalKocha !== null}
        animationType="slide"
        transparent
        onRequestClose={() => setModalKocha(null)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Yangi xonadon</Text>
                {modalKocha ? (
                  <Text style={styles.modalSubtitle}>{modalKocha.nomi} ko'chasi</Text>
                ) : null}
              </View>
              <TouchableOpacity onPress={() => setModalKocha(null)} hitSlop={12}>
                <MaterialCommunityIcons name="close" size={24} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: Spacing.base }}>
              <FormField
                label="Uy raqami *"
                value={form.uy_raqami}
                onChangeText={(v) => setForm((p) => ({ ...p, uy_raqami: v }))}
                placeholder="Masalan: 12 yoki 45-A"
                editable={!saving}
              />
              <FormField
                label="Egasi F.I.O."
                value={form.egasi_fio}
                onChangeText={(v) => setForm((p) => ({ ...p, egasi_fio: v }))}
                placeholder="Xonadon egasining ismi"
                autoCapitalize="words"
                editable={!saving}
              />
              <FormField
                label="Egasi telefoni"
                value={form.egasi_tel}
                onChangeText={(v) => setForm((p) => ({ ...p, egasi_tel: v }))}
                placeholder="+998 90 123 45 67"
                keyboardType="phone-pad"
                editable={!saving}
              />
              <FormField
                label="Izoh"
                value={form.izoh}
                onChangeText={(v) => setForm((p) => ({ ...p, izoh: v }))}
                placeholder="Qo'shimcha ma'lumot"
                multiline
                editable={!saving}
              />

              {formError ? (
                <View style={styles.formErrorBox}>
                  <MaterialCommunityIcons name="alert-circle" size={18} color={Colors.danger} style={{ marginRight: 6 }} />
                  <Text style={styles.formErrorText}>{formError}</Text>
                </View>
              ) : null}

              <Button
                title="Saqlash"
                icon="content-save-outline"
                loading={saving}
                onPress={handleCreateXonadon}
              />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  mfyCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    marginBottom: 10,
    ...Shadows.sm,
    overflow: 'hidden',
  },
  mfyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.base,
  },
  mfyLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, flex: 1 },
  mfyIndexCircle: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.primarySurface,
    alignItems: 'center', justifyContent: 'center',
  },
  mfyIndexText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.bold,
    fontFamily: Fonts.heading,
    color: Colors.primary,
  },
  mfyInfo: { flex: 1, gap: 4 },
  mfyTitle: {
    fontSize: FontSizes.base,
    fontWeight: FontWeights.semibold,
    fontFamily: Fonts.heading,
    color: Colors.textPrimary,
  },
  mfyStats: { flexDirection: 'row', gap: 10 },
  statBadge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.background, paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: Radius.sm,
  },
  statText: { fontSize: FontSizes.xs, fontFamily: Fonts.body, color: Colors.textSecondary },
  kochalarList: {
    backgroundColor: Colors.surfaceSubtle,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: 4,
  },
  kochaRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 8,
  },
  kochaLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  kochaNom: { fontSize: FontSizes.sm, fontFamily: Fonts.body, color: Colors.textPrimary },
  kochaRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  kochaCount: { flexDirection: 'row', alignItems: 'baseline', gap: 3 },
  kochaSoni: { fontSize: FontSizes.sm, fontWeight: FontWeights.bold, fontFamily: Fonts.heading, color: Colors.primary },
  kochaLabel: { fontSize: FontSizes.xs, fontFamily: Fonts.body, color: Colors.textMuted },
  xonadonlarList: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    marginBottom: Spacing.sm,
    padding: Spacing.sm,
    gap: 2,
  },
  xonadonRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 10, paddingHorizontal: Spacing.sm,
    borderBottomWidth: 1, borderBottomColor: Colors.borderLight,
  },
  xonadonLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  xonadonTitle: {
    fontSize: FontSizes.sm, fontWeight: FontWeights.semibold,
    fontFamily: Fonts.body, color: Colors.textPrimary,
  },
  xonadonMeta: { fontSize: FontSizes.xs, fontFamily: Fonts.body, color: Colors.textMuted, marginTop: 1 },
  xonadonRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  muammoBadge: {
    minWidth: 20, height: 20, borderRadius: 10,
    backgroundColor: Colors.dangerSurface,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 5,
  },
  muammoBadgeText: { fontSize: FontSizes.xs, fontWeight: FontWeights.bold, fontFamily: Fonts.body, color: Colors.danger },
  addXonadonBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 10, marginTop: 4,
    borderWidth: 1.5, borderColor: Colors.primary, borderRadius: Radius.md,
    borderStyle: 'dashed',
  },
  addXonadonText: {
    fontSize: FontSizes.sm, fontWeight: FontWeights.semibold,
    fontFamily: Fonts.heading, color: Colors.primary,
  },
  noKochalar: {
    fontSize: FontSizes.sm, fontFamily: Fonts.body, fontStyle: 'italic',
    color: Colors.textMuted, padding: Spacing.sm, textAlign: 'center',
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
  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(10, 30, 60, 0.45)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius['2xl'], borderTopRightRadius: Radius['2xl'],
    padding: Spacing.xl, maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  modalTitle: {
    fontSize: FontSizes.lg, fontWeight: FontWeights.bold,
    fontFamily: Fonts.heading, color: Colors.textPrimary,
  },
  modalSubtitle: {
    fontSize: FontSizes.sm, fontFamily: Fonts.body, color: Colors.textSecondary, marginTop: 2,
  },
  formErrorBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.dangerSurface, borderRadius: Radius.sm,
    paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md,
  },
  formErrorText: {
    flex: 1, fontSize: FontSizes.sm, fontFamily: Fonts.body,
    color: Colors.danger, fontWeight: FontWeights.medium,
  },
});

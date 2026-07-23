import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { getNavbatYozuvlari, setNavbatStatus, type NavbatYozuvi } from '../services/db';
import { syncNow } from '../services/sync';
import Button from '../components/Button';
import { Colors, Fonts, FontSizes, FontWeights, Spacing, Radius, Shadows, XavfColors, StatusColors } from '../theme';
import { useAlifbo } from '../contexts/AlifboContext';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

const STATUS_CFG = (tr: (s: string) => string): Record<NavbatYozuvi['status'], { label: string; color: string; bg: string; icon: IconName }> => ({
  kutilmoqda: { label: tr('Kutilmoqda'), color: StatusColors.jarayonda.text, bg: StatusColors.jarayonda.bg, icon: 'clock-outline' },
  yuborilgan: { label: tr('Yuborilgan'), color: Colors.success, bg: Colors.successSurface, icon: 'check-circle' },
  xato: { label: tr('Xato'), color: Colors.danger, bg: Colors.dangerSurface, icon: 'close-circle' },
});

function formatDateTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString('uz-UZ', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export default function NavbatScreen() {
  const { tr } = useAlifbo();
  const [items, setItems] = useState<NavbatYozuvi[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const loadNavbat = useCallback(async () => {
    try {
      const rows = await getNavbatYozuvlari();
      setItems(rows);
    } catch {
      // DB hali tayyor bo'lmasa — bo'sh ro'yxat
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadNavbat();
    }, [loadNavbat]),
  );

  const onRefresh = () => { setRefreshing(true); loadNavbat(); };

  const handleSyncNow = async () => {
    setSyncing(true);
    try {
      const natija = await syncNow();
      if (natija.xato > 0) {
        Alert.alert(
          tr('Sinxronlash yakunlandi'),
          tr(`${natija.yuborildi} ta yozuv yuborildi, ${natija.xato} tasida xatolik yuz berdi.`),
        );
      } else if (natija.yuborildi > 0) {
        Alert.alert(tr('Sinxronlash yakunlandi'), tr(`${natija.yuborildi} ta yozuv muvaffaqiyatli yuborildi.`));
      } else {
        Alert.alert(tr('Sinxronlash'), tr("Yuborilishi kerak bo'lgan yozuvlar yo'q."));
      }
    } catch {
      Alert.alert(tr('Xatolik'), tr('Sinxronlashda xatolik yuz berdi. Internet aloqasini tekshiring.'));
    } finally {
      setSyncing(false);
      loadNavbat();
    }
  };

  const handleRetry = async (item: NavbatYozuvi) => {
    setRetryingId(item.client_uuid);
    try {
      await setNavbatStatus(item.client_uuid, 'kutilmoqda');
      await loadNavbat();
    } catch {
      Alert.alert(tr('Xatolik'), tr("Yozuvni qayta navbatga qo'yishda xatolik"));
    } finally {
      setRetryingId(null);
    }
  };

  const renderItem = ({ item }: { item: NavbatYozuvi }) => {
    const cfg = STATUS_CFG(tr)[item.status] || STATUS_CFG(tr).kutilmoqda;
    const xavfCfg = XavfColors[item.xavf];
    const busy = retryingId === item.client_uuid;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
            <MaterialCommunityIcons name={cfg.icon} size={14} color={cfg.color} style={{ marginRight: 4 }} />
            <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
          </View>
          <Text style={styles.dateText}>{formatDateTime(item.yaratilgan)}</Text>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="home-outline" size={15} color={Colors.textMuted} />
            <Text style={styles.infoText}>{tr('Xonadon')} #{item.xonadon_id}</Text>
            {xavfCfg ? (
              <View style={[styles.xavfBadge, { backgroundColor: xavfCfg.bg, borderColor: xavfCfg.border }]}>
                <Text style={[styles.xavfText, { color: xavfCfg.text }]}>{item.xavf}</Text>
              </View>
            ) : null}
          </View>

          {item.tavsif ? (
            <Text style={styles.tavsif} numberOfLines={2}>{item.tavsif}</Text>
          ) : null}

          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="camera-outline" size={13} color={Colors.textMuted} />
            <Text style={styles.metaText}>{item.foto_paths?.length || 0} {tr('ta foto')}</Text>
            <MaterialCommunityIcons name="map-marker-outline" size={13} color={Colors.textMuted} style={{ marginLeft: 10 }} />
            <Text style={styles.metaText}>{item.lat.toFixed(5)}, {item.lng.toFixed(5)}</Text>
          </View>

          {item.status === 'xato' && item.xato ? (
            <View style={styles.errorBox}>
              <MaterialCommunityIcons name="alert-circle-outline" size={15} color={Colors.danger} style={{ marginRight: 6 }} />
              <Text style={styles.errorText}>{item.xato}</Text>
            </View>
          ) : null}

          {item.status === 'xato' && (
            <TouchableOpacity
              style={styles.retryBtn}
              onPress={() => handleRetry(item)}
              disabled={busy}
              activeOpacity={0.75}
            >
              {busy ? (
                <ActivityIndicator size="small" color={Colors.primary} />
              ) : (
                <>
                  <MaterialCommunityIcons name="refresh" size={18} color={Colors.primary} style={{ marginRight: 6 }} />
                  <Text style={styles.retryText}>{tr('Qayta urinish')}</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const kutilmoqdaSoni = items.filter((i) => i.status !== 'yuborilgan').length;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.syncBar}>
        <View style={styles.syncInfo}>
          <Text style={styles.syncCount}>{kutilmoqdaSoni}</Text>
          <Text style={styles.syncLabel}>{tr('ta yozuv navbatda')}</Text>
        </View>
        <Button
          title={tr('Hozir yuborish')}
          icon="cloud-upload-outline"
          loading={syncing}
          onPress={handleSyncNow}
          style={styles.syncBtn}
        />
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.client_uuid}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} colors={[Colors.primary]} />
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 80 }} />
          ) : (
            <View style={styles.emptyBox}>
              <MaterialCommunityIcons name="cloud-check-outline" size={48} color={Colors.textMuted} />
              <Text style={styles.emptyTitle}>{tr("Navbat bo'sh")}</Text>
              <Text style={styles.emptyText}>{tr("Sinxronlanishi kerak bo'lgan yozuvlar yo'q")}</Text>
            </View>
          )
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  syncBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.surface, paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.borderLight,
    gap: Spacing.md,
  },
  syncInfo: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  syncCount: {
    fontSize: FontSizes['2xl'], fontWeight: FontWeights.extrabold,
    fontFamily: Fonts.heading, color: Colors.primary,
  },
  syncLabel: { fontSize: FontSizes.sm, fontFamily: Fonts.body, color: Colors.textSecondary },
  syncBtn: { paddingVertical: 10, paddingHorizontal: 16 },
  list: { padding: Spacing.base, flexGrow: 1 },
  card: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    marginBottom: 10, ...Shadows.sm, overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.base, paddingTop: Spacing.md,
  },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full,
  },
  statusText: { fontSize: FontSizes.xs, fontWeight: FontWeights.semibold, fontFamily: Fonts.body },
  dateText: { fontSize: FontSizes.xs, fontFamily: Fonts.body, color: Colors.textMuted },
  cardBody: { padding: Spacing.base, gap: Spacing.sm },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  infoText: {
    flex: 1, fontSize: FontSizes.sm, fontWeight: FontWeights.semibold,
    fontFamily: Fonts.body, color: Colors.textPrimary,
  },
  xavfBadge: {
    paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: Radius.sm, borderWidth: 1,
  },
  xavfText: {
    fontSize: FontSizes.xs, fontWeight: FontWeights.semibold, fontFamily: Fonts.body,
    textTransform: 'capitalize',
  },
  tavsif: {
    fontSize: FontSizes.sm, fontFamily: Fonts.body, color: Colors.textSecondary, lineHeight: 19,
  },
  metaText: { fontSize: FontSizes.xs, fontFamily: Fonts.body, color: Colors.textMuted },
  errorBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.dangerSurface, borderRadius: Radius.sm,
    paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md,
  },
  errorText: { flex: 1, fontSize: FontSizes.xs, fontFamily: Fonts.body, color: Colors.danger },
  retryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: Colors.primary, borderRadius: Radius.md,
    paddingVertical: 9,
  },
  retryText: {
    fontSize: FontSizes.sm, fontWeight: FontWeights.semibold,
    fontFamily: Fonts.heading, color: Colors.primary,
  },
  emptyBox: { alignItems: 'center', marginTop: 80, paddingHorizontal: Spacing['2xl'] },
  emptyTitle: {
    fontSize: FontSizes.md, fontWeight: FontWeights.bold, fontFamily: Fonts.heading,
    color: Colors.textPrimary, marginTop: Spacing.md,
  },
  emptyText: {
    fontSize: FontSizes.sm, fontFamily: Fonts.body, color: Colors.textMuted,
    marginTop: 4, textAlign: 'center',
  },
});

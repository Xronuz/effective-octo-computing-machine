import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import {
  getNavbatYozuvlari,
  setNavbatStatus,
  urinishniTozalash,
  type NavbatYozuvi,
} from '../services/db';
import { syncNow } from '../services/sync';
import PullToRefresh from '../components/PullToRefresh';
import Button from '../components/Button';
import {
  Colors,
  Fonts,
  FontSizes,
  FontWeights,
  Spacing,
  Radius,
  Shadows,
  XavfColors,
  StatusColors,
} from '../theme';
import { useAlifbo } from '../contexts/AlifboContext';
import { bandlarniParse } from '../constants/yoriqnoma';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

const STATUS_CFG = (
  tr: (s: string) => string,
): Record<
  NavbatYozuvi['status'],
  { label: string; color: string; bg: string; border: string; icon: IconName }
> => ({
  kutilmoqda: {
    label: tr('Kutilmoqda'),
    color: StatusColors.jarayonda.text,
    bg: StatusColors.jarayonda.bg,
    border: StatusColors.jarayonda.border,
    icon: 'clock-outline',
  },
  yuborilgan: {
    label: tr('Yuborilgan'),
    color: Colors.success,
    bg: Colors.successSurface,
    border: '#A8D9BF',
    icon: 'check-circle',
  },
  xato: {
    label: tr('Xato'),
    color: Colors.danger,
    bg: Colors.dangerSurface,
    border: '#E8B3B3',
    icon: 'close-circle',
  },
});

function formatDateTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString('uz-UZ', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

// Muammo turi kalitlarini odam o'qiydigan nomlarga o'girish
// (MuammoYaratishScreen'dagi TUR_OPTIONS bilan bir xil nomlar)
const TURI_LABELS = (tr: (s: string) => string): Record<string, string> => ({
  ochiq_elektr_simi: tr('Ochiq elektr simi'),
  elektr_shchit_nosoz: tr('Elektr shchit nosoz'),
  gaz_shlangi_nosoz: tr('Gaz shlangi nosoz'),
  gaz_hidi: tr('Gaz hidi'),
  isitish_uskunasi: tr('Isitish uskunasi'),
  mo_ri_tozalanmagan: tr("Mo'ri tozalanmagan"),
  ot_ochirgich_yoq: tr("O't o'chirgich yo'q"),
  evakuatsiya_yoli_yopiq: tr("Evakuatsiya yo'li yopiq"),
  boshqa: tr('Boshqa'),
});

type SyncNatija = { matn: string; holat: 'success' | 'warning' | 'danger' };

const NATIJA_COLORS: Record<SyncNatija['holat'], string> = {
  success: Colors.success,
  warning: Colors.warning,
  danger: Colors.danger,
};

const NATIJA_ICONS: Record<SyncNatija['holat'], IconName> = {
  success: 'check-circle-outline',
  warning: 'alert-circle-outline',
  danger: 'cloud-off-outline',
};

export default function NavbatScreen() {
  const { tr } = useAlifbo();
  const [items, setItems] = useState<NavbatYozuvi[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [syncNatija, setSyncNatija] = useState<SyncNatija | null>(null);

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

  const onRefresh = () => {
    setRefreshing(true);
    loadNavbat();
  };

  const handleSyncNow = async () => {
    setSyncing(true);
    setSyncNatija(null);
    try {
      const natija = await syncNow();
      if (natija.xato > 0) {
        setSyncNatija({
          matn: tr(
            `${natija.yuborildi} ta yozuv yuborildi, ${natija.xato} tasida xatolik yuz berdi.`,
          ),
          holat: 'warning',
        });
      } else if (natija.yuborildi > 0) {
        setSyncNatija({
          matn: tr(`${natija.yuborildi} ta yozuv muvaffaqiyatli yuborildi.`),
          holat: 'success',
        });
      } else {
        setSyncNatija({
          matn: tr("Yuborilishi kerak bo'lgan yozuvlar yo'q."),
          holat: 'success',
        });
      }
    } catch {
      setSyncNatija({
        matn: tr('Sinxronlashda xatolik yuz berdi. Internet aloqasini tekshiring.'),
        holat: 'danger',
      });
    } finally {
      setSyncing(false);
      loadNavbat();
    }
  };

  const handleRetry = async (item: NavbatYozuvi) => {
    setRetryingId(item.client_uuid);
    try {
      await setNavbatStatus(item.client_uuid, 'kutilmoqda');
      await urinishniTozalash(item.client_uuid);
      await loadNavbat();
    } catch {
      Alert.alert(tr('Xatolik'), tr("Yozuvni qayta navbatga qo'yishda xatolik"));
    } finally {
      setRetryingId(null);
    }
  };

  const renderItem = ({ item }: { item: NavbatYozuvi }) => {
    const cfg = STATUS_CFG(tr)[item.status] || STATUS_CFG(tr).kutilmoqda;
    const busy = retryingId === item.client_uuid;
    const yuborilgan = item.status === 'yuborilgan';
    // Checklist oqimida (turi=null) — bandlar soniga qarab sarlavha, aks holda eski turi nomi
    const bandlar = bandlarniParse(item.taklif_etilgan_tadbirlar);
    const turiNomi = item.turi
      ? TURI_LABELS(tr)[item.turi] || item.turi
      : bandlar.length > 0
        ? tr(`Yo'riqnoma: ${bandlar.length} band`)
        : tr("Tekshirildi — muammo yo'q");
    const xavfCfg = item.turi ? XavfColors[item.xavf] : null;

    return (
      <View style={[styles.card, yuborilgan && styles.cardYuborilgan]}>
        <View style={styles.cardHeader}>
          <View style={[styles.statusBadge, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
            <MaterialCommunityIcons
              name={cfg.icon}
              size={16}
              color={cfg.color}
              style={{ marginRight: 6 }}
            />
            <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
          </View>
          <Text style={styles.dateText}>{formatDateTime(item.yaratilgan)}</Text>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.titleRow}>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {turiNomi}
            </Text>
            {xavfCfg ? (
              <View
                style={[
                  styles.xavfBadge,
                  { backgroundColor: xavfCfg.bg, borderColor: xavfCfg.border },
                ]}
              >
                <Text style={[styles.xavfText, { color: xavfCfg.text }]}>{item.xavf}</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.cardSubtitle}>
            {tr('Xonadon')} #{item.xonadon_id}
          </Text>

          {item.tavsif ? (
            <Text style={styles.tavsif} numberOfLines={2}>
              {item.tavsif}
            </Text>
          ) : null}

          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="camera-outline" size={15} color={Colors.textMuted} />
            <Text style={styles.metaText}>
              {item.foto_paths?.length || 0} {tr('ta foto')}
            </Text>
          </View>

          {item.status === 'xato' && item.xato ? (
            <View style={styles.errorBox}>
              <MaterialCommunityIcons
                name="alert-circle-outline"
                size={17}
                color={Colors.danger}
                style={{ marginRight: 8 }}
              />
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
                  <MaterialCommunityIcons
                    name="refresh"
                    size={20}
                    color={Colors.primary}
                    style={{ marginRight: 6 }}
                  />
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

      {syncNatija && (
        <View style={styles.natijaRow}>
          <MaterialCommunityIcons
            name={NATIJA_ICONS[syncNatija.holat]}
            size={15}
            color={NATIJA_COLORS[syncNatija.holat]}
            style={{ marginRight: 6 }}
          />
          <Text style={[styles.natijaText, { color: NATIJA_COLORS[syncNatija.holat] }]}>
            {syncNatija.matn}
          </Text>
        </View>
      )}

      <FlatList
        data={items}
        keyExtractor={(item) => item.client_uuid}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={<PullToRefresh refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 80 }} />
          ) : (
            <View style={styles.emptyBox}>
              <MaterialCommunityIcons
                name="cloud-check-outline"
                size={56}
                color={Colors.textMuted}
              />
              <Text style={styles.emptyTitle}>{tr("Navbat bo'sh")}</Text>
              <Text style={styles.emptyText}>
                {tr("Sinxronlanishi kerak bo'lgan yozuvlar yo'q")}
              </Text>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    gap: Spacing.md,
  },
  syncInfo: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  syncCount: {
    fontSize: FontSizes['3xl'],
    fontWeight: FontWeights.extrabold,
    fontFamily: Fonts.heading,
    color: Colors.primary,
  },
  syncLabel: { fontSize: FontSizes.base, fontFamily: Fonts.body, color: Colors.textSecondary },
  syncBtn: { paddingVertical: 11, paddingHorizontal: 18 },
  natijaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  natijaText: { flex: 1, fontSize: FontSizes.sm, fontFamily: Fonts.body },
  list: { padding: Spacing.base, flexGrow: 1 },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    marginBottom: 12,
    ...Shadows.sm,
    overflow: 'hidden',
  },
  cardYuborilgan: { opacity: 0.6 },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.md,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  statusText: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.semibold,
    fontFamily: Fonts.body,
  },
  dateText: { fontSize: FontSizes.sm, fontFamily: Fonts.body, color: Colors.textMuted },
  cardBody: { padding: Spacing.base, gap: Spacing.sm },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  cardTitle: {
    flex: 1,
    fontSize: FontSizes.base,
    fontWeight: FontWeights.semibold,
    fontFamily: Fonts.body,
    color: Colors.textPrimary,
  },
  cardSubtitle: { fontSize: FontSizes.sm, fontFamily: Fonts.body, color: Colors.textMuted },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  xavfBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: Radius.sm,
    borderWidth: 1,
  },
  xavfText: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.semibold,
    fontFamily: Fonts.body,
    textTransform: 'capitalize',
  },
  tavsif: {
    fontSize: FontSizes.base,
    fontFamily: Fonts.body,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  metaText: { fontSize: FontSizes.sm, fontFamily: Fonts.body, color: Colors.textMuted },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dangerSurface,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.base,
  },
  errorText: { flex: 1, fontSize: FontSizes.sm, fontFamily: Fonts.body, color: Colors.danger },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: 11,
  },
  retryText: {
    fontSize: FontSizes.base,
    fontWeight: FontWeights.semibold,
    fontFamily: Fonts.heading,
    color: Colors.primary,
  },
  emptyBox: { alignItems: 'center', marginTop: 80, paddingHorizontal: Spacing['2xl'] },
  emptyTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    fontFamily: Fonts.heading,
    color: Colors.textPrimary,
    marginTop: Spacing.md,
  },
  emptyText: {
    fontSize: FontSizes.base,
    fontFamily: Fonts.body,
    color: Colors.textMuted,
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
});

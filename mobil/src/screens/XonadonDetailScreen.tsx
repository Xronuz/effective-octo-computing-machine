import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import PullToRefresh from '../components/PullToRefresh';
import Button from '../components/Button';
import SectionLabel from '../components/SectionLabel';
import api from '../services/api';
import {
  Colors,
  Fonts,
  FontSizes,
  FontWeights,
  Spacing,
  Radius,
  XavfColors,
  StatusColors,
} from '../theme';
import type { ApiResponse, Paginated, Xonadon, MuammoSummary } from '../types';
import { useAlifbo } from '../contexts/AlifboContext';
import { useAppNavigation, useAppRoute } from '../navigation/hooks';
import { cacheMuammolar, getCacheMuammolar } from '../services/cache';
import { warmFotoCache, resolveFotoSource } from '../services/fotoCache';
import { bandlarniParse, bandMatni } from '../constants/yoriqnoma';
import NatijaBadge from '../components/NatijaBadge';
import { muammoNatijasi, natijaSarlavhasi, xonadonAmali } from '../lib/natija';
import { bugunIso } from '../lib/sana';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

interface InfoRow {
  key: string;
  label: string;
  icon: IconName;
  value: string;
  tel?: boolean;
}

/**
 * XONADON PROFILI — inspektor eshik oldida kerakli hamma narsani ko'radi:
 * manzil, MFY, egasi va telefon (bosing — qo'ng'iroq). Bezakli banner olib tashlandi.
 * Yagona asosiy amal — pastdagi «Yangi muammo» tugmasi.
 * Muammo qatorlari faqat o'qish uchun: chevron yo'q, bosilib ko'rinmaydi.
 */
export default function XonadonDetailScreen() {
  const route = useAppRoute<'XonadonDetail'>();
  const navigation = useAppNavigation();
  const { tr } = useAlifbo();
  const insets = useSafeAreaInsets();
  const { id } = route.params;
  const [xonadon, setXonadon] = useState<Xonadon | null>(null);
  const [muammolar, setMuammolar] = useState<MuammoSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Keyingi mantiqiy amal: yangi tekshiruv / ochiq muammoni yopish /
  // bugun allaqachon tekshirilgan (yumshoq ogohlantirish bilan).
  const amal = useMemo(() => xonadonAmali(muammolar, bugunIso()), [muammolar]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const xonRes = await api.get<ApiResponse<Xonadon>>(`/xonadonlar/${id}`);
      if (xonRes.data.ok && xonRes.data.data) {
        setXonadon(xonRes.data.data);
      }

      const cached = await getCacheMuammolar(id);
      if (cached) setMuammolar(cached);

      const muamRes = await api.get<ApiResponse<Paginated<MuammoSummary>>>(
        `/muammolar?xonadon_id=${id}&size=100`,
      );
      if (muamRes.data.ok && muamRes.data.data) {
        setMuammolar(muamRes.data.data.items);
        await cacheMuammolar(muamRes.data.data.items, id);
      }
    } catch {
      /* handled by UI */
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (muammolar.length > 0) {
      warmFotoCache(muammolar).catch(() => {});
    }
  }, [muammolar]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const openTel = (tel: string) => {
    Linking.openURL(`tel:${tel}`).catch(() => {});
  };

  if (loading && !xonadon) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>{tr('Yuklanmoqda...')}</Text>
      </SafeAreaView>
    );
  }

  const infoRows: InfoRow[] = [
    { key: 'mfy', label: tr('MFY'), icon: 'map-marker-outline', value: xonadon?.mfy_nomi || '-' },
    {
      key: 'uy',
      label: tr('Uy raqami'),
      icon: 'home-outline',
      value: xonadon?.uy_raqami || '-',
    },
    {
      key: 'egasi',
      label: tr('Egasi'),
      icon: 'account-outline',
      value: xonadon?.egasi_fio || '-',
    },
  ];
  if (xonadon?.egasi_tel) {
    infoRows.push({
      key: 'tel',
      label: tr('Telefon'),
      icon: 'phone-outline',
      value: xonadon.egasi_tel,
      tel: true,
    });
  }
  if (xonadon?.izoh) {
    infoRows.push({
      key: 'izoh',
      label: tr('Izoh'),
      icon: 'note-text-outline',
      value: xonadon.izoh,
    });
  }

  const renderMuammo = (m: MuammoSummary) => {
    // Natija `tekshiruv_natijasi` bo'yicha aniqlanadi. Avval turi/bandlar
    // bo'yicha taxmin qilinardi va "kira olmadi" tashriflar "Tekshirildi —
    // muammo topilmadi" bo'lib ko'rinardi (noto'g'ri ma'lumot).
    const natija = muammoNatijasi(m);
    const bandlar = bandlarniParse(m.taklif_etilgan_tadbirlar);
    const isChecklistYozuvi = m.turi === null;
    const sarlavha = tr(
      natijaSarlavhasi(natija, {
        turi: m.turi,
        turiNomi: m.turi_nomi,
        bandlarCsv: m.taklif_etilgan_tadbirlar,
      }),
    );
    const xavfCfg = isChecklistYozuvi ? null : XavfColors[m.xavf];
    const isOpen = m.status !== 'yopilgan';
    const statusCfg = isOpen ? StatusColors.ochiq : StatusColors.yopilgan;

    // Muddat dolzarbligi: qolgan kun ma'lum bo'lsa sanadan ustun
    const qolgan = m.muddat_qolgan_kun;
    const overdue = qolgan !== null && qolgan < 0;
    let deadlineText: string;
    if (overdue) {
      deadlineText = tr("Muddati o'tgan");
    } else if (qolgan !== null) {
      deadlineText = tr('{n} kun qoldi').replace('{n}', String(qolgan));
    } else {
      deadlineText = m.muddat ? new Date(m.muddat).toLocaleDateString('uz-UZ') : '-';
    }

    return (
      <View key={m.id} style={styles.muammoRow}>
        <View style={styles.muammoHeader}>
          <Text style={styles.muammoTitle} numberOfLines={1}>
            {sarlavha}
          </Text>
          {/* Natija belgisi — "Ochiq/Yopilgan" statusi kira olmagan tashrif
              uchun chalg'ituvchi edi ("Yopilgan" deb ko'rinardi). Status
              faqat haqiqiy muammolarda ma'noli, shuning uchun u yerda
              qo'shimcha ravishda ko'rsatiladi. */}
          <NatijaBadge natija={natija} />
        </View>

        {natija === 'muammo_topildi' ? (
          <View
            style={[
              styles.pill,
              styles.statusPill,
              { backgroundColor: statusCfg.bg, borderColor: statusCfg.border },
            ]}
          >
            <MaterialCommunityIcons
              name={isOpen ? 'alert-circle' : 'check-circle'}
              size={14}
              color={statusCfg.icon}
            />
            <Text style={[styles.pillText, { color: statusCfg.text }]}>
              {isOpen ? tr('Ochiq') : tr('Yopilgan')}
            </Text>
          </View>
        ) : null}

        {isChecklistYozuvi && bandlar.length > 0 ? (
          <View style={styles.bandlarLegend}>
            {bandlar.map((id) => (
              <Text key={id} style={styles.bandlarLegendText} numberOfLines={2}>
                {id}. {bandMatni(id)}
              </Text>
            ))}
          </View>
        ) : null}

        {m.tavsif ? (
          <Text style={styles.muammoText} numberOfLines={2}>
            {m.tavsif}
          </Text>
        ) : null}

        {m.yoriqnomadan_otkanlar_soni !== null ? (
          <View style={styles.metaItem}>
            <MaterialCommunityIcons
              name="account-group-outline"
              size={14}
              color={Colors.textMuted}
            />
            <Text style={styles.metaText}>
              {tr('Ogohlantirilgan')}: {m.yoriqnomadan_otkanlar_soni}
            </Text>
          </View>
        ) : null}

        <View style={styles.muammoMetaRow}>
          {xavfCfg ? (
            <View
              style={[
                styles.xavfBadge,
                { backgroundColor: xavfCfg.bg, borderColor: xavfCfg.border },
              ]}
            >
              <Text style={[styles.xavfText, { color: xavfCfg.text }]}>{m.xavf}</Text>
            </View>
          ) : null}
          {!isChecklistYozuvi || isOpen ? (
            <View style={styles.metaItem}>
              <MaterialCommunityIcons
                name={overdue ? 'calendar-alert' : 'calendar-clock'}
                size={14}
                color={overdue ? Colors.danger : Colors.textMuted}
              />
              <Text style={[styles.metaText, overdue && styles.metaTextOverdue]}>
                {deadlineText}
              </Text>
            </View>
          ) : null}
        </View>

        {m.fotolar && m.fotolar.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.fotoScroll}>
            {m.fotolar.map((f) => (
              <FotoImage
                key={f.id}
                muammoId={m.id}
                faylYoli={f.fayl_yoli}
                style={styles.fotoThumb}
              />
            ))}
          </ScrollView>
        ) : null}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: 96 + insets.bottom }]}
        refreshControl={<PullToRefresh refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Sarlavha — bezaksiz */}
        <View style={styles.headerBox}>
          <Text style={styles.headerTitle}>
            {xonadon?.full_address || tr('Manzil mavjud emas')}
          </Text>
          {xonadon?.mfy_nomi ? <Text style={styles.headerSub}>{xonadon.mfy_nomi}</Text> : null}
        </View>

        {/* Ma'lumotlar — bitta ramkali konteyner */}
        <View style={styles.infoList}>
          {infoRows.map((row, i) => (
            <View key={row.key} style={[styles.infoRow, i > 0 && styles.infoRowBorder]}>
              <MaterialCommunityIcons name={row.icon} size={20} color={Colors.textMuted} />
              <Text style={styles.infoLabel}>{row.label}</Text>
              {row.tel ? (
                <TouchableOpacity
                  onPress={() => openTel(row.value)}
                  hitSlop={8}
                  accessibilityRole="link"
                  accessibilityLabel={`${row.label}: ${row.value}`}
                >
                  <Text style={[styles.infoValue, styles.infoLink]}>{row.value}</Text>
                </TouchableOpacity>
              ) : (
                <Text style={styles.infoValue}>{row.value}</Text>
              )}
            </View>
          ))}
        </View>

        {/* Muammolar */}
        <SectionLabel title={tr('Muammolar')} trailing={`${muammolar.length} ${tr('ta')}`} />

        {muammolar.length === 0 ? (
          <Text style={styles.emptyText}>{tr('Bu xonadonda hali muammo qayd etilmagan')}</Text>
        ) : (
          <View style={styles.muammoList}>{muammolar.map(renderMuammo)}</View>
        )}
      </ScrollView>

      {/* Kontekstga mos yagona asosiy amal — avval doim "Tekshiruv qilish"
          bo'lib, ochiq muammoli uyga qaytgan inspektor uni yopa olmasdi. */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + Spacing.sm }]}>
        {amal.turi === 'muammoni_yopish' ? (
          <>
            <Text style={styles.amalIzoh}>{tr('Bu xonadonda bartaraf etilmagan muammo bor')}</Text>
            <Button
              title={tr('Muammoni yopish')}
              icon="check-circle-outline"
              onPress={() =>
                navigation.navigate('MuammoYopish', {
                  muammoId: amal.muammoId,
                  sarlavha: amal.sarlavha,
                })
              }
            />
          </>
        ) : amal.turi === 'bugun_tekshirilgan' ? (
          <>
            <Text style={styles.amalIzoh}>
              {tr('Bu xonadon bugun tekshirilgan ({vaqt})').replace('{vaqt}', amal.vaqt)}
            </Text>
            <Button
              title={tr('Baribir qayta tekshirish')}
              icon="clipboard-alert-outline"
              variant="secondary"
              onPress={() =>
                Alert.alert(
                  tr('Takroriy tekshiruv'),
                  tr(
                    'Bu xonadon bugun allaqachon tekshirilgan. Takroriy yozuv rahbar nazorati uchun belgilanadi.',
                  ),
                  [
                    { text: tr('Bekor qilish'), style: 'cancel' },
                    {
                      text: tr('Davom etish'),
                      onPress: () =>
                        navigation.navigate('Tekshiruv', { xonadonId: id, majburiy: true }),
                    },
                  ],
                )
              }
            />
          </>
        ) : (
          <Button
            title={tr('Tekshiruv qilish')}
            icon="clipboard-check-outline"
            onPress={() => navigation.navigate('Tekshiruv', { xonadonId: id })}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

interface FotoImageProps {
  muammoId: number;
  faylYoli: string;
  style?: import('react-native').ImageStyle;
}

function FotoImage({ muammoId, faylYoli, style }: FotoImageProps) {
  const [uri, setUri] = useState<string>(faylYoli);
  useEffect(() => {
    let mounted = true;
    resolveFotoSource(muammoId, faylYoli)
      .then((src) => {
        if (mounted) setUri(src);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, [muammoId, faylYoli]);
  return <Image source={{ uri }} style={style} />;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: FontSizes.base,
    fontFamily: Fonts.body,
    color: Colors.textSecondary,
  },
  content: { padding: Spacing.base },
  headerBox: { marginBottom: Spacing.xs },
  headerTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    fontFamily: Fonts.heading,
    color: Colors.textPrimary,
  },
  headerSub: {
    fontSize: FontSizes.base,
    fontFamily: Fonts.body,
    color: Colors.textMuted,
    marginTop: Spacing.xxs,
  },
  infoList: {
    marginTop: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  infoRowBorder: { borderTopWidth: 1, borderTopColor: Colors.borderLight },
  infoLabel: {
    fontSize: FontSizes.base,
    fontFamily: Fonts.body,
    color: Colors.textSecondary,
  },
  infoValue: {
    flex: 1,
    fontSize: FontSizes.base,
    fontFamily: Fonts.body,
    fontWeight: FontWeights.semibold,
    color: Colors.textPrimary,
    textAlign: 'right',
  },
  infoLink: { color: Colors.textLink },
  emptyText: {
    fontSize: FontSizes.base,
    fontFamily: Fonts.body,
    color: Colors.textMuted,
    paddingVertical: Spacing.sm,
  },
  muammoList: { gap: Spacing.sm },
  muammoRow: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    padding: Spacing.md,
  },
  muammoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  muammoTitle: {
    flex: 1,
    fontSize: FontSizes.base,
    fontWeight: FontWeights.semibold,
    fontFamily: Fonts.body,
    color: Colors.textPrimary,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.xxs,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  statusPill: { alignSelf: 'flex-start' },
  pillText: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.semibold,
    fontFamily: Fonts.body,
  },
  muammoText: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.body,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: Spacing.sm,
  },
  bandlarLegend: {
    marginBottom: Spacing.sm,
    gap: Spacing.xxs,
  },
  bandlarLegendText: {
    fontSize: FontSizes.xs,
    fontFamily: Fonts.body,
    color: Colors.textSecondary,
    lineHeight: 17,
  },
  muammoMetaRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  xavfBadge: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.xxs,
    borderRadius: Radius.sm,
    borderWidth: 1,
  },
  xavfText: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.semibold,
    fontFamily: Fonts.body,
    textTransform: 'capitalize',
  },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xxs },
  metaText: { fontSize: FontSizes.sm, fontFamily: Fonts.body, color: Colors.textMuted },
  metaTextOverdue: { color: Colors.danger, fontWeight: FontWeights.semibold },
  fotoScroll: { marginTop: Spacing.md },
  fotoThumb: {
    width: 88,
    height: 88,
    borderRadius: Radius.md,
    marginRight: Spacing.sm,
    backgroundColor: Colors.surfaceSubtle,
  },
  bottomBar: {
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.sm,
  },
  amalIzoh: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
});

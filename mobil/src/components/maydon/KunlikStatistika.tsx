import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useAlifbo } from '../../contexts/AlifboContext';
import { useTheme } from '../../contexts/ThemeContext';
import { Fonts, FontSizes, FontWeights, Radius, Shadows } from '../../theme';
import type { ColorPalette } from '../../theme/colors';
import type { KunlikStat, KunlikToifa } from '../../hooks/useKunlikTekshiruv';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

const TOIFALAR: {
  key: KunlikToifa;
  icon: IconName;
  label: string;
  renk: (c: ColorPalette) => string;
}[] = [
  { key: 'jami', icon: 'clipboard-check-outline', label: 'Tekshirilgan', renk: (c) => c.primary },
  { key: 'muammosiz', icon: 'check-circle-outline', label: 'Muammosiz', renk: (c) => c.success },
  { key: 'muammoli', icon: 'alert-circle-outline', label: 'Muammoli', renk: (c) => c.danger },
  { key: 'kiraOlmadi', icon: 'door-closed-lock', label: 'Kira olmadi', renk: (c) => c.warning },
];

/**
 * Tanlangan kun uchun tekshiruv statistikasi: jami, muammosiz, muammoli,
 * kira olmadi. Har kartochka bosiladigan tab — tanlanganda pastda o'sha
 * toifadagi xonadonlar ro'yxati ochiladi (bittasi bir vaqtda).
 */
export default function KunlikStatistika({
  stat,
  loading,
  sanaIso,
  onXonadonPress,
}: {
  stat: KunlikStat;
  loading: boolean;
  /** Tanlangan sana — kun almashganda tab tanlovi qayta hisoblanadi. */
  sanaIso: string;
  /** Ro'yxatdagi xonadon bosilganda. */
  onXonadonPress: (xonadonId: number) => void;
}) {
  const { tr } = useAlifbo();
  const { colors } = useTheme();
  const [tanlangan, setTanlangan] = useState<KunlikToifa | null>(null);
  const avtoTanlanganSana = useRef<string | null>(null);

  // Kun tanlanganda (yoki birinchi yuklanganda) "Kira olmadi" bo'lsa
  // avtomatik ochiladi — inspektor qaytib borishi kerak bo'lgan uylarni
  // darhol ko'rsin. Foydalanuvchi tabni o'zi yopsa, qayta majburlanmaydi.
  useEffect(() => {
    if (loading) return;
    if (avtoTanlanganSana.current === sanaIso) return;
    avtoTanlanganSana.current = sanaIso;
    setTanlangan(stat.kiraOlmadi > 0 ? 'kiraOlmadi' : null);
  }, [loading, sanaIso, stat.kiraOlmadi]);

  const royxat = tanlangan ? stat.royxatlar[tanlangan] : [];

  return (
    <View style={[styles.card, { backgroundColor: colors.surface }, Shadows.sm]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.textSecondary }]}>
          {tr('Tanlangan kun bo‘yicha')}
        </Text>
        {loading && <ActivityIndicator size="small" color={colors.primary} />}
      </View>

      <View style={styles.grid}>
        {TOIFALAR.map((t) => {
          const renk = t.renk(colors);
          const faol = tanlangan === t.key;
          return (
            <TouchableOpacity
              key={t.key}
              style={[
                styles.tile,
                { backgroundColor: faol ? `${renk}1F` : colors.surfaceSubtle },
                faol && { borderWidth: 1, borderColor: renk },
              ]}
              onPress={() => setTanlangan(faol ? null : t.key)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityState={{ selected: faol }}
              accessibilityLabel={`${tr(t.label)}: ${stat[t.key]}`}
            >
              <MaterialCommunityIcons name={t.icon} size={20} color={renk} />
              <Text style={[styles.tileValue, { color: renk }]}>{stat[t.key]}</Text>
              <Text style={[styles.tileLabel, { color: colors.textMuted }]} numberOfLines={2}>
                {tr(t.label)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {tanlangan && (
        <View style={[styles.royxatBlok, { borderTopColor: colors.borderLight }]}>
          {royxat.length === 0 ? (
            <Text style={[styles.boshMatn, { color: colors.textMuted }]}>
              {tr('Bu toifada yozuv yo‘q')}
            </Text>
          ) : (
            <>
              {royxat.slice(0, 8).map((x, i) => (
                <TouchableOpacity
                  key={`${x.xonadon_id}-${i}`}
                  style={[
                    styles.royxatQator,
                    i > 0 && { borderTopWidth: 1, borderTopColor: colors.borderLight },
                  ]}
                  onPress={() => onXonadonPress(x.xonadon_id)}
                  activeOpacity={0.6}
                  accessibilityRole="button"
                >
                  <MaterialCommunityIcons
                    name="map-marker-outline"
                    size={16}
                    color={colors.textMuted}
                  />
                  <Text
                    style={[styles.royxatMatn, { color: colors.textPrimary }]}
                    numberOfLines={1}
                  >
                    {x.manzil || `${tr('Xonadon')} #${x.xonadon_id}`}
                  </Text>
                  <MaterialCommunityIcons name="chevron-right" size={18} color={colors.textMuted} />
                </TouchableOpacity>
              ))}
              {royxat.length > 8 && (
                <Text style={[styles.qolganMatn, { color: colors.textMuted }]}>
                  {tr('va yana {n} ta').replace('{n}', String(royxat.length - 8))}
                </Text>
              )}
            </>
          )}
        </View>
      )}

      {/* Offline ishlaganda son "0" bo'lib qolmasligi uchun navbatdagi
          tashriflar ham yuqoridagi songa kiritilgan — buni aytib qo'yamiz. */}
      {stat.yuborilmagan > 0 && (
        <View style={styles.navbatIzoh}>
          <MaterialCommunityIcons name="cloud-upload-outline" size={14} color={colors.warning} />
          <Text style={[styles.navbatIzohText, { color: colors.textSecondary }]}>
            {tr('Shundan {n} tasi hali yuborilmagan').replace('{n}', String(stat.yuborilmagan))}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.md,
    padding: 16,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.body,
    fontWeight: FontWeights.semibold,
  },
  grid: {
    flexDirection: 'row',
    gap: 8,
  },
  tile: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
    paddingVertical: 8,
    borderRadius: Radius.sm,
  },
  tileValue: {
    fontSize: FontSizes.lg,
    fontFamily: Fonts.heading,
    fontWeight: FontWeights.bold,
    fontVariant: ['tabular-nums'],
  },
  tileLabel: {
    fontSize: 10,
    fontFamily: Fonts.body,
    textAlign: 'center',
    lineHeight: 12,
  },
  royxatBlok: {
    borderTopWidth: 1,
    paddingTop: 8,
    gap: 2,
  },
  boshMatn: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.body,
    textAlign: 'center',
    paddingVertical: 8,
  },
  royxatQator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
  },
  royxatMatn: {
    flex: 1,
    fontSize: FontSizes.sm,
    fontFamily: Fonts.body,
  },
  qolganMatn: {
    fontSize: FontSizes.xs,
    fontFamily: Fonts.body,
    textAlign: 'center',
    paddingTop: 4,
  },
  navbatIzoh: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  navbatIzohText: {
    flex: 1,
    fontSize: FontSizes.xs,
    fontFamily: Fonts.body,
  },
});

import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useAlifbo } from '../../contexts/AlifboContext';
import { Colors, Fonts, FontSizes, FontWeights, Radius, Shadows } from '../../theme';
import type { KunlikStat } from '../../hooks/useKunlikTekshiruv';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

function Tile({
  icon,
  color,
  value,
  label,
}: {
  icon: IconName;
  color: string;
  value: number;
  label: string;
}) {
  return (
    <View style={styles.tile}>
      <MaterialCommunityIcons name={icon} size={20} color={color} />
      <Text style={[styles.tileValue, { color }]}>{value}</Text>
      <Text style={styles.tileLabel} numberOfLines={2}>
        {label}
      </Text>
    </View>
  );
}

/**
 * Tanlangan kun uchun tekshiruv statistikasi: jami, muammosiz, muammoli,
 * kira olmadi. Foizlar emas — aniq sonlar (xodim uchun eng ma'noli ko'rsatkich).
 */
export default function KunlikStatistika({
  stat,
  loading,
}: {
  stat: KunlikStat;
  loading: boolean;
}) {
  const { tr } = useAlifbo();

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{tr('Tanlangan kun bo‘yicha')}</Text>
        {loading && <ActivityIndicator size="small" color={Colors.primary} />}
      </View>
      <View style={styles.grid}>
        <Tile
          icon="clipboard-check-outline"
          color={Colors.primary}
          value={stat.jami}
          label={tr('Tekshirilgan')}
        />
        <Tile
          icon="check-circle-outline"
          color={Colors.success}
          value={stat.muammosiz}
          label={tr('Muammosiz')}
        />
        <Tile
          icon="alert-circle-outline"
          color={Colors.danger}
          value={stat.muammoli}
          label={tr('Muammoli')}
        />
        <Tile
          icon="door-closed-lock"
          color={Colors.warning}
          value={stat.kiraOlmadi}
          label={tr('Kira olmadi')}
        />
      </View>

      {/* Offline ishlaganda son "0" bo'lib qolmasligi uchun navbatdagi
          tashriflar ham yuqoridagi songa kiritilgan — buni aytib qo'yamiz. */}
      {stat.yuborilmagan > 0 && (
        <View style={styles.navbatIzoh}>
          <MaterialCommunityIcons name="cloud-upload-outline" size={14} color={Colors.warning} />
          <Text style={styles.navbatIzohText}>
            {tr('Shundan {n} tasi hali yuborilmagan').replace('{n}', String(stat.yuborilmagan))}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: 16,
    gap: 12,
    ...Shadows.sm,
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
    color: Colors.textSecondary,
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
    backgroundColor: Colors.surfaceSubtle,
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
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 12,
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
    color: Colors.textSecondary,
  },
});

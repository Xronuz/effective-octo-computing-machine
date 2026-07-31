import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useAlifbo } from '../../contexts/AlifboContext';
import { Colors, Fonts, FontSizes, FontWeights, Radius } from '../../theme';

interface Props {
  mfyNames: string[];
  ochiqMuammolar: number;
  onPress: () => void;
}

/**
 * Biriktirilgan hudud holati: qayerda ishlayapsan + ochiq muammolar.
 * Faqat real ma'lumot — progress-bar yoki taxminiy foizlar yo'q.
 */
export default function TerritoryCard({ mfyNames, ochiqMuammolar, onPress }: Props) {
  const { tr } = useAlifbo();

  if (mfyNames.length === 0) {
    return (
      <View style={styles.card}>
        <Text style={styles.emptyText}>{tr('MFY biriktirilmagan')}</Text>
      </View>
    );
  }

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${mfyNames.join(', ')}. ${ochiqMuammolar} ${tr('ochiq muammo')}`}
    >
      <View style={styles.row}>
        <MaterialCommunityIcons name="map-marker-radius-outline" size={22} color={Colors.primary} />
        <View style={styles.texts}>
          <Text style={styles.names} numberOfLines={1}>
            {mfyNames.join(' · ')}
          </Text>
          <Text style={[styles.meta, ochiqMuammolar > 0 && styles.metaDanger]}>
            {ochiqMuammolar > 0
              ? tr('{count} ta ochiq muammo').replace('{count}', String(ochiqMuammolar))
              : tr('Ochiq muammolar yo‘q')}
          </Text>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={18} color={Colors.textMuted} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    paddingHorizontal: 16,
    minHeight: 64,
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  texts: {
    flex: 1,
    gap: 2,
  },
  names: {
    fontSize: FontSizes.base,
    fontFamily: Fonts.body,
    fontWeight: FontWeights.semibold,
    color: Colors.textPrimary,
  },
  meta: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.body,
    color: Colors.success,
    fontVariant: ['tabular-nums'],
  },
  metaDanger: {
    color: Colors.danger,
  },
  emptyText: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.body,
    color: Colors.textMuted,
    paddingVertical: 8,
  },
});

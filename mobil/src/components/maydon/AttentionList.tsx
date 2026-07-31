import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useAlifbo } from '../../contexts/AlifboContext';
import { Colors, Fonts, FontSizes, FontWeights, Radius } from '../../theme';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

export interface AttentionItem {
  key: string;
  icon: IconName;
  color: string;
  label: string;
  count: number;
  onPress: () => void;
}

/**
 * Ixcham diqqat qatorlari — karta emas, ro'yxat.
 * Faqat count > 0 bo'lgan elementlar ko'rsatiladi (screen filtrlagan).
 */
export default function AttentionList({ items }: { items: AttentionItem[] }) {
  const { tr } = useAlifbo();
  if (items.length === 0) return null;

  return (
    <View style={styles.list}>
      {items.map((item, index) => (
        <TouchableOpacity
          key={item.key}
          style={[styles.row, index > 0 && styles.rowBorder]}
          onPress={item.onPress}
          accessibilityRole="button"
          accessibilityLabel={`${item.label}: ${item.count}`}
        >
          <MaterialCommunityIcons name={item.icon} size={22} color={item.color} />
          <Text style={styles.label}>{tr(item.label)}</Text>
          <Text style={[styles.count, { color: item.color }]}>{item.count}</Text>
          <MaterialCommunityIcons name="chevron-right" size={18} color={Colors.textMuted} />
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
    paddingHorizontal: 16,
    gap: 12,
  },
  rowBorder: {
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  label: {
    flex: 1,
    fontSize: FontSizes.base,
    fontFamily: Fonts.body,
    color: Colors.textPrimary,
  },
  count: {
    fontSize: FontSizes.base,
    fontFamily: Fonts.body,
    fontWeight: FontWeights.bold,
    fontVariant: ['tabular-nums'],
  },
});

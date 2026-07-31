import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Fonts, FontSizes, FontWeights } from '../theme';

/**
 * Linear-uslubdagi bo'lim sarlavhasi: kichik, yumshoq, yuqori registr.
 * Ma'lumot ustuvor — sarlavha emas.
 */
export default function SectionLabel({ title, trailing }: { title: string; trailing?: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{title.toUpperCase()}</Text>
      {trailing ? <Text style={styles.trailing}>{trailing}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    marginTop: 24,
  },
  label: {
    fontSize: FontSizes.xs,
    fontFamily: Fonts.body,
    fontWeight: FontWeights.semibold,
    color: Colors.textMuted,
    letterSpacing: 0.8,
  },
  trailing: {
    fontSize: FontSizes.xs,
    fontFamily: Fonts.body,
    fontWeight: FontWeights.medium,
    color: Colors.textMuted,
    fontVariant: ['tabular-nums'],
  },
});

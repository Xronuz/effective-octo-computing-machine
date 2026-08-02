import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { Fonts, FontSizes, FontWeights } from '../theme';
import type { ColorPalette } from '../theme/colors';

/**
 * Linear-uslubdagi bo'lim sarlavhasi: kichik, yumshoq, yuqori registr.
 * Ma'lumot ustuvor — sarlavha emas.
 */
export default function SectionLabel({ title, trailing }: { title: string; trailing?: string }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{title.toUpperCase()}</Text>
      {trailing ? <Text style={styles.trailing}>{trailing}</Text> : null}
    </View>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
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
      color: colors.textMuted,
      letterSpacing: 0.8,
    },
    trailing: {
      fontSize: FontSizes.xs,
      fontFamily: Fonts.body,
      fontWeight: FontWeights.medium,
      color: colors.textMuted,
      fontVariant: ['tabular-nums'],
    },
  });
}

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useTheme } from '../contexts/ThemeContext';
import { Fonts, FontSizes, FontWeights, Spacing, Radius } from '../theme';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

interface Props {
  icon: IconName;
  title: string;
  subtitle?: string;
}

export default function EmptyState({ icon, title, subtitle }: Props) {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <View style={[styles.iconBox, { backgroundColor: colors.surfaceSubtle }]}>
        <MaterialCommunityIcons name={icon} size={48} color={colors.textMuted} />
      </View>
      <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
      {subtitle ? (
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>{subtitle}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginTop: Spacing['4xl'],
    paddingHorizontal: Spacing['2xl'],
  },
  iconBox: {
    width: 88,
    height: 88,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    fontFamily: Fonts.heading,
    marginTop: Spacing.lg,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: FontSizes.base,
    fontFamily: Fonts.body,
    marginTop: Spacing.xs,
    textAlign: 'center',
    lineHeight: FontSizes.base * 1.55,
  },
});

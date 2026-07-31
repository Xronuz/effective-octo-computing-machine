import React from 'react';
import { View, StyleSheet, type ViewProps } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { Radius, Shadows, Spacing } from '../theme';

interface Props extends ViewProps {
  children: React.ReactNode;
  padded?: boolean;
  variant?: 'elevated' | 'flat' | 'outlined';
}

export default function Card({
  children,
  padded = true,
  variant = 'elevated',
  style,
  ...rest
}: Props) {
  const { colors } = useTheme();

  const cardStyles = [
    styles.base,
    {
      backgroundColor: variant === 'flat' ? colors.surfaceSubtle : colors.surface,
      borderColor: colors.border,
    },
    variant === 'elevated' && [styles.elevated, Shadows.md],
    variant === 'outlined' && styles.outlined,
    padded && styles.padded,
    style,
  ];

  return (
    <View style={cardStyles} {...rest}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: Radius.lg,
  },
  elevated: {
    backgroundColor: 'transparent',
  },
  outlined: {
    borderWidth: 1,
  },
  padded: {
    padding: Spacing.base,
  },
});

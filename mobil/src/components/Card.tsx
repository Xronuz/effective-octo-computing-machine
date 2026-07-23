import React from 'react';
import { View, Text, StyleSheet, type ViewProps } from 'react-native';
import { Colors, Radius, Shadows } from '../theme';

interface Props extends ViewProps {
  children: React.ReactNode;
  padded?: boolean;
  variant?: 'elevated' | 'flat' | 'outlined';
}

export default function Card({ children, padded = true, variant = 'elevated', style, ...rest }: Props) {
  const cardStyles = [
    styles.base,
    variant === 'elevated' && styles.elevated,
    variant === 'flat' && styles.flat,
    variant === 'outlined' && styles.outlined,
    padded && styles.padded,
    style,
  ];

  return <View style={cardStyles} {...rest}>{children}</View>;
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
  },
  elevated: {
    ...Shadows.md,
  },
  flat: {
    backgroundColor: Colors.surfaceSubtle,
  },
  outlined: {
    borderWidth: 1,
    borderColor: Colors.border,
  },
  padded: {
    padding: 16,
  },
});

import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  type TouchableOpacityProps,
} from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useTheme } from '../contexts/ThemeContext';
import { Fonts, FontSizes, FontWeights, Radius, Shadows } from '../theme';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

export interface ButtonProps extends TouchableOpacityProps {
  title: string;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost';
  icon?: IconName;
  iconSize?: number;
}

export default function Button({
  title,
  loading,
  variant = 'primary',
  icon,
  iconSize = 22,
  style,
  disabled,
  ...rest
}: ButtonProps) {
  const { colors } = useTheme();

  const variants = {
    primary: { bg: colors.primary, text: colors.textInverse, border: colors.primary },
    secondary: { bg: colors.secondary, text: colors.textInverse, border: colors.secondary },
    danger: { bg: colors.danger, text: colors.textInverse, border: colors.danger },
    outline: { bg: 'transparent', text: colors.primary, border: colors.primary },
    ghost: { bg: 'transparent', text: colors.primary, border: 'transparent' },
  };

  const v = variants[variant];
  const isDisabled = disabled || loading;
  const hasShadow = variant === 'primary' || variant === 'secondary' || variant === 'danger';

  return (
    <TouchableOpacity
      style={[
        styles.base,
        {
          backgroundColor: v.bg,
          borderColor: v.border,
          borderWidth: variant === 'outline' ? 1.5 : 0,
        },
        hasShadow && !isDisabled && Shadows.md,
        isDisabled && styles.disabled,
        style,
      ]}
      disabled={isDisabled}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={v.text} size="small" />
      ) : (
        <>
          {icon && (
            <MaterialCommunityIcons
              name={icon}
              size={iconSize}
              color={v.text}
              style={{ marginRight: 10 }}
            />
          )}
          <Text style={[styles.text, { color: v.text }]}>{title}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: Radius.md,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: { opacity: 0.45 },
  text: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    fontFamily: Fonts.heading,
    letterSpacing: -0.2,
  },
});

import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, type TouchableOpacityProps } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Colors, Fonts, FontSizes, FontWeights, Radius, Shadows, Durations } from '../theme';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

interface Props extends TouchableOpacityProps {
  title: string;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost';
  icon?: IconName;
  iconSize?: number;
}

const VARIANTS = {
  primary:   { bg: Colors.primary, text: Colors.textInverse, icon: Colors.textInverse, border: Colors.primary },
  secondary: { bg: Colors.secondary, text: Colors.textInverse, icon: Colors.textInverse, border: Colors.secondary },
  danger:    { bg: Colors.danger, text: Colors.textInverse, icon: Colors.textInverse, border: Colors.danger },
  outline:   { bg: 'transparent', text: Colors.primary, icon: Colors.primary, border: Colors.primary },
  ghost:     { bg: 'transparent', text: Colors.primary, icon: Colors.primary, border: 'transparent' },
};

export default function Button({ title, loading, variant = 'primary', icon, iconSize = 20, style, disabled, ...rest }: Props) {
  const v = VARIANTS[variant];
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      style={[
        styles.base,
        {
          backgroundColor: v.bg,
          borderColor: v.border,
          borderWidth: variant === 'outline' ? 1.5 : variant === 'ghost' ? 0 : 0,
        },
        (variant === 'primary' || variant === 'secondary' || variant === 'danger') && Shadows.sm,
        isDisabled && styles.disabled,
        style,
      ]}
      disabled={isDisabled}
      activeOpacity={0.75}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={v.text} size="small" />
      ) : (
        <>
          {icon && <MaterialCommunityIcons name={icon} size={iconSize} color={v.icon} style={{ marginRight: 8 }} />}
          <Text style={[styles.text, { color: v.text }]}>{title}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: Radius.md,
    paddingVertical: 14,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: { opacity: 0.5 },
  text: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    fontFamily: Fonts.heading,
  },
});

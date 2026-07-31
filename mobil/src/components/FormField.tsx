import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, type TextInputProps } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { Fonts, FontSizes, FontWeights, Radius, Spacing } from '../theme';

interface Props extends TextInputProps {
  label: string;
  error?: string;
}

export default function FormField({ label, error, style, ...rest }: Props) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.wrapper}>
      <Text style={[styles.label, { color: colors.textPrimary }]}>{label}</Text>
      <TextInput
        style={[
          styles.input,
          {
            borderColor: error ? colors.danger : focused ? colors.primary : colors.border,
            backgroundColor: colors.surface,
            color: colors.textPrimary,
          },
          style,
        ]}
        placeholderTextColor={colors.textMuted}
        onFocus={(e) => {
          setFocused(true);
          rest.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          rest.onBlur?.(e);
        }}
        accessibilityLabel={label}
        accessibilityHint={error || undefined}
        {...rest}
      />
      {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: Spacing.xs },
  label: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semibold,
    fontFamily: Fonts.heading,
  },
  input: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    fontSize: FontSizes.base,
    fontFamily: Fonts.body,
  },
  error: {
    fontSize: FontSizes.xs,
    fontFamily: Fonts.body,
    marginTop: Spacing.xxs,
  },
});

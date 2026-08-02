import React from 'react';
import { View, StyleSheet, type ViewStyle } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

export type IconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';

const SIZE_MAP: Record<IconSize, number> = {
  xs: 14,
  sm: 18,
  md: 22,
  lg: 28,
  xl: 34,
  '2xl': 42,
  '3xl': 56,
};

interface IconProps {
  name: IconName;
  size?: IconSize | number;
  color?: string;
  containerSize?: number;
  containerColor?: string;
  style?: ViewStyle;
}

/**
 * Wrapped MaterialCommunityIcons with consistent sizing.
 * Use `containerSize` + `containerColor` to render an icon inside a tinted circle.
 */
export default function Icon({
  name,
  size = 'md',
  color,
  containerSize,
  containerColor,
  style,
}: IconProps) {
  const { colors } = useTheme();
  const iconSize = typeof size === 'number' ? size : SIZE_MAP[size];
  const iconColor = color ?? colors.textSecondary;

  if (containerSize) {
    return (
      <View
        style={[
          styles.container,
          {
            width: containerSize,
            height: containerSize,
            borderRadius: containerSize / 3,
            backgroundColor: containerColor || colors.primarySurface,
          },
          style,
        ]}
      >
        <MaterialCommunityIcons name={name} size={iconSize} color={iconColor} />
      </View>
    );
  }

  return (
    <MaterialCommunityIcons name={name} size={iconSize} color={iconColor} style={style as any} />
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

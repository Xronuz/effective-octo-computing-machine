import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  View,
  type DimensionValue,
  type LayoutChangeEvent,
  type ViewStyle,
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

interface Props {
  width?: DimensionValue;
  height?: number;
  borderRadius?: number;
  shimmerWidth?: number;
  colors?: { background: string; shimmer: string };
  style?: ViewStyle;
}

/**
 * Skeleton placeholder with a looping shimmer sweep.
 * Uses the theme surface colors by default so it blends in both light and dark modes.
 */
export function ShimmerSkeleton({
  width = '100%',
  height = 16,
  borderRadius = 8,
  shimmerWidth = 120,
  colors,
  style,
}: Props) {
  const { colors: themeColors } = useTheme();
  const [layoutWidth, setLayoutWidth] = useState(0);
  const progress = useRef(new Animated.Value(0)).current;

  const backgroundColor = colors?.background ?? themeColors.surfaceSubtle;
  const shimmerColor = colors?.shimmer ?? 'rgba(255, 255, 255, 0.45)';

  useEffect(() => {
    if (layoutWidth === 0) return undefined;

    const animation = Animated.loop(
      Animated.timing(progress, {
        toValue: 1,
        duration: 1400,
        useNativeDriver: true,
      }),
    );
    animation.start();
    return () => animation.stop();
  }, [progress, layoutWidth]);

  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [-shimmerWidth, layoutWidth],
  });

  const handleLayout = (event: LayoutChangeEvent) => {
    setLayoutWidth(event.nativeEvent.layout.width);
  };

  return (
    <View
      style={[{ width, height, borderRadius, backgroundColor, overflow: 'hidden' }, style]}
      onLayout={handleLayout}
    >
      <Animated.View
        style={{
          width: shimmerWidth,
          height: '100%',
          backgroundColor: shimmerColor,
          opacity: 0.6,
          transform: [{ translateX }],
        }}
      />
    </View>
  );
}

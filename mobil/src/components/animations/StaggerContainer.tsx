import React, { useEffect, useMemo } from 'react';
import { Animated, View, type ViewStyle } from 'react-native';
import { Durations } from '../../theme';

interface Props {
  children: React.ReactNode;
  staggerDelay?: number;
  /** Alias for `staggerDelay` — kept for call-site convenience. */
  stagger?: number;
  initialDelay?: number;
  duration?: number;
  translateY?: number;
  style?: ViewStyle;
}

/**
 * Staggers the entrance of its children by animating opacity and translateY.
 * Each child fades in slightly after the previous one for a premium reveal.
 */
function StaggerContainer({
  children,
  staggerDelay,
  stagger,
  initialDelay = 0,
  duration = Durations.slow,
  translateY = 16,
  style,
}: Props) {
  const delay = staggerDelay ?? stagger ?? 80;
  const childArray = React.Children.toArray(children).filter(Boolean);
  const values = useMemo(
    () => childArray.map(() => new Animated.Value(0)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [childArray.length],
  );

  useEffect(() => {
    const animations = values.map((value) =>
      Animated.timing(value, {
        toValue: 1,
        duration,
        delay: initialDelay,
        useNativeDriver: true,
      }),
    );
    Animated.stagger(delay, animations).start();
    return () => {
      animations.forEach((animation) => animation.stop());
    };
  }, [values, delay, initialDelay, duration]);

  return (
    <View style={style}>
      {childArray.map((child, index) => {
        const progress = values[index] ?? new Animated.Value(1);
        const translate = progress.interpolate({
          inputRange: [0, 1],
          outputRange: [translateY, 0],
        });

        return (
          <Animated.View
            key={(child as React.ReactElement).key ?? index}
            style={{ opacity: progress, transform: [{ translateY: translate }] }}
          >
            {child}
          </Animated.View>
        );
      })}
    </View>
  );
}

export { StaggerContainer };
export default StaggerContainer;

import React, { useRef, useCallback } from 'react';
import { Animated, Pressable, type PressableProps, type GestureResponderEvent } from 'react-native';

interface PressableScaleProps extends PressableProps {
  children: React.ReactNode;
  scale?: number;
}

export function PressableScale({
  children,
  scale = 0.97,
  onPressIn,
  onPressOut,
  ...props
}: PressableScaleProps) {
  const animatedValue = useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback(
    (event: GestureResponderEvent) => {
      Animated.spring(animatedValue, {
        toValue: scale,
        useNativeDriver: true,
        friction: 6,
        tension: 200,
      }).start();
      onPressIn?.(event);
    },
    [animatedValue, scale, onPressIn],
  );

  const handlePressOut = useCallback(
    (event: GestureResponderEvent) => {
      Animated.spring(animatedValue, {
        toValue: 1,
        useNativeDriver: true,
        friction: 6,
        tension: 200,
      }).start();
      onPressOut?.(event);
    },
    [animatedValue, onPressOut],
  );

  return (
    <Pressable onPressIn={handlePressIn} onPressOut={handlePressOut} {...props}>
      <Animated.View style={{ transform: [{ scale: animatedValue }] }}>{children}</Animated.View>
    </Pressable>
  );
}

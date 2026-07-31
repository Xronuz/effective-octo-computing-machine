import { useEffect, useRef } from 'react';
import { Animated } from 'react-native';

/**
 * Returns an Animated.Value that animates from 0 to `target` over `duration` ms.
 * Resets and re-animates whenever `target` or `duration` changes.
 */
export function useAnimatedNumber(target: number, duration = 800): Animated.Value {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    animatedValue.setValue(0);
    const animation = Animated.timing(animatedValue, {
      toValue: target,
      duration,
      useNativeDriver: true,
    });
    animation.start();
    return () => {
      animation.stop();
    };
  }, [animatedValue, target, duration]);

  return animatedValue;
}

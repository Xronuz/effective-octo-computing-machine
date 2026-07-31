import React, { useEffect, useState } from 'react';
import { StyleProp, Text, type TextStyle } from 'react-native';
import { useAnimatedNumber } from '../../hooks/useAnimatedNumber';

interface AnimatedNumberProps {
  value: number;
  duration?: number;
  style?: StyleProp<TextStyle>;
}

export function AnimatedNumber({ value, duration = 800, style }: AnimatedNumberProps) {
  const animatedValue = useAnimatedNumber(value, duration);
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const listener = animatedValue.addListener(({ value: v }) => {
      setDisplay(Math.round(v));
    });
    return () => {
      animatedValue.removeListener(listener);
    };
  }, [animatedValue]);

  return <Text style={[{ fontVariant: ['tabular-nums'] }, style]}>{display}</Text>;
}

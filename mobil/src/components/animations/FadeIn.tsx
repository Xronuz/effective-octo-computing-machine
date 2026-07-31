import React, { useEffect, useRef } from 'react';
import { View, Animated, type ViewProps } from 'react-native';
import { Durations } from '../../theme';

interface Props extends ViewProps {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
}

function FadeIn({ children, delay = 0, duration = Durations.normal, style }: Props) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.timing(progress, {
      toValue: 1,
      duration,
      delay,
      useNativeDriver: true,
    });
    anim.start();
    return () => {
      anim.stop();
    };
  }, [progress, delay, duration]);

  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [12, 0],
  });

  return (
    <Animated.View style={[style, { opacity: progress, transform: [{ translateY }] }]}>
      <View>{children}</View>
    </Animated.View>
  );
}

export { FadeIn };
export default FadeIn;

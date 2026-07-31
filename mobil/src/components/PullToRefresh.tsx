import React from 'react';
import { RefreshControl, type RefreshControlProps } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

type Props = Omit<RefreshControlProps, 'colors' | 'tintColor'>;

export default function PullToRefresh(props: Props) {
  const { colors } = useTheme();
  return (
    <RefreshControl
      {...props}
      colors={[colors.primary]}
      tintColor={colors.primary}
      progressBackgroundColor={colors.surface}
    />
  );
}

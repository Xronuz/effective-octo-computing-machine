import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Colors, Fonts, FontSizes, FontWeights } from '../theme';

interface Props {
  isOffline: boolean;
  pendingCount?: number;
}

export default function OfflineBanner({ isOffline, pendingCount }: Props) {
  if (!isOffline && (!pendingCount || pendingCount === 0)) return null;

  return (
    <View style={[styles.banner, isOffline ? styles.bannerOffline : styles.bannerPending]}>
      <MaterialCommunityIcons
        name={isOffline ? 'wifi-off' : 'cloud-sync-outline'}
        size={16}
        color={isOffline ? Colors.danger : Colors.accent}
        style={{ marginRight: 6 }}
      />
      <Text style={styles.text}>
        {isOffline
          ? "Internet aloqasi yo'q — ma'lumotlar qurilmada saqlanadi"
          : `${pendingCount} ta yozuv sinxronlanishi kutilmoqda`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerOffline: { backgroundColor: Colors.dangerSurface },
  bannerPending: { backgroundColor: Colors.accentSurface },
  text: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.medium,
    fontFamily: Fonts.body,
    color: Colors.textPrimary,
    textAlign: 'center',
    flexShrink: 1,
  },
});

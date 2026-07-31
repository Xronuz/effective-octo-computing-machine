import React, { useContext } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { AlifboContext } from '../contexts/AlifboContext';
import { ThemeContext } from '../contexts/ThemeContext';
import { Fonts, FontSizes, FontWeights, Radius, Spacing, LightColors } from '../theme';

interface Props {
  isOffline: boolean;
  pendingCount?: number;
}

export default function OfflineBanner({ isOffline, pendingCount }: Props) {
  const alifbo = useContext(AlifboContext);
  const theme = useContext(ThemeContext);

  const tr = alifbo?.tr ?? ((s: string) => s);
  const colors = theme?.colors ?? LightColors;

  if (!isOffline && (!pendingCount || pendingCount === 0)) return null;

  const message = isOffline
    ? tr("Internet aloqasi yo'q — ma'lumotlar qurilmada saqlanadi")
    : tr('{count} ta yozuv sinxronlanishi kutilmoqda').replace('{count}', String(pendingCount));

  return (
    <View
      style={[
        styles.banner,
        {
          backgroundColor: isOffline ? colors.dangerSurface : colors.accentSurface,
          borderBottomColor: isOffline ? colors.danger : colors.accent,
        },
      ]}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      accessibilityLabel={message}
    >
      <View style={styles.pill}>
        <MaterialCommunityIcons
          name={isOffline ? 'wifi-off' : 'cloud-sync-outline'}
          size={18}
          color={isOffline ? colors.danger : colors.accent}
          style={{ marginRight: 8 }}
          importantForAccessibility="no"
        />
        <Text style={[styles.text, { color: colors.textPrimary }]}>{message}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    paddingVertical: 12,
    paddingHorizontal: Spacing.base,
    borderBottomWidth: 1,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.full,
  },
  text: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.medium,
    fontFamily: Fonts.body,
    textAlign: 'center',
    flexShrink: 1,
  },
});

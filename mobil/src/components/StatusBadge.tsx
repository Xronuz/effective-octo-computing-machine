import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useAlifbo } from '../contexts/AlifboContext';
import { StatusColors, Fonts, FontSizes, FontWeights, Radius } from '../theme';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

const STATUS_ICONS: Record<string, IconName> = {
  ochiq: 'alert-circle',
  jarayonda: 'clock-outline',
  yopilgan: 'check-circle',
  muddati_otgan: 'calendar-alert',
  shubhali: 'alert-octagon',
};

function statusLabel(status: string, tr: (s: string) => string): string {
  const map: Record<string, string> = {
    ochiq: 'Ochiq',
    jarayonda: 'Jarayonda',
    yopilgan: 'Yopilgan',
    muddati_otgan: "Muddati o'tgan",
    shubhali: 'Shubhali',
  };
  return map[status] ? tr(map[status]) : status;
}

export function StatusBadge({ status }: { status: string }) {
  const { tr } = useAlifbo();
  const cfg = StatusColors[status] || StatusColors.yopilgan;
  const icon = STATUS_ICONS[status] || 'help-circle-outline';
  const label = statusLabel(status, tr);

  return (
    <View
      style={[styles.badge, { backgroundColor: cfg.bg, borderColor: cfg.border }]}
      accessibilityLabel={label}
      accessibilityRole="text"
    >
      <MaterialCommunityIcons
        name={icon}
        size={16}
        color={cfg.icon || cfg.text}
        style={{ marginRight: 6 }}
        importantForAccessibility="no"
      />
      <Text style={[styles.text, { color: cfg.text }]}>{label}</Text>
    </View>
  );
}

export function ShubhaliBadge() {
  const { tr } = useAlifbo();
  const cfg = StatusColors.shubhali;
  return (
    <View
      style={[styles.badge, { backgroundColor: cfg.bg, borderColor: cfg.border }]}
      accessibilityLabel={tr('Shubhali')}
      accessibilityRole="text"
    >
      <MaterialCommunityIcons
        name="alert-octagon"
        size={16}
        color={cfg.icon}
        style={{ marginRight: 6 }}
        importantForAccessibility="no"
      />
      <Text style={[styles.text, { color: cfg.text }]}>{tr('Shubhali')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.semibold,
    fontFamily: Fonts.body,
  },
});

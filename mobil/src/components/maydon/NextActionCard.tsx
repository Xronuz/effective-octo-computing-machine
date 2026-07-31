import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useAlifbo } from '../../contexts/AlifboContext';
import Button from '../Button';
import { Colors, Fonts, FontSizes, FontWeights, Radius, Shadows } from '../../theme';
import type { Topshiriq } from '../../types';

interface Props {
  task: Topshiriq;
  overdue: boolean;
  completing: boolean;
  onComplete: () => void;
  onDetails: () => void;
}

function formatMuddat(muddat: string | null, tr: (s: string) => string): string {
  if (!muddat) return tr('Muddat belgilanmagan');
  const d = new Date(muddat);
  return d.toLocaleDateString('uz-UZ', { day: 'numeric', month: 'long' });
}

/**
 * Ekrandagi yagona ustuvor element — xodimning KEYINGI ishi.
 * Bitta primary amal: "Bajarildi". Batafsil — ikkilamchi.
 */
export default function NextActionCard({
  task,
  overdue,
  completing,
  onComplete,
  onDetails,
}: Props) {
  const { tr } = useAlifbo();

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        {overdue && (
          <View style={styles.overduePill}>
            <MaterialCommunityIcons name="alert" size={14} color={Colors.danger} />
            <Text style={styles.overdueText}>{tr('Kechikkan')}</Text>
          </View>
        )}
      </View>

      <Text style={styles.title}>{task.sarlavha}</Text>

      <View style={styles.metaRow}>
        <MaterialCommunityIcons
          name="calendar-clock-outline"
          size={16}
          color={overdue ? Colors.danger : Colors.textSecondary}
        />
        <Text style={[styles.meta, overdue && styles.metaDanger]}>
          {formatMuddat(task.muddat, tr)}
        </Text>
        {task.mfy_nomi ? (
          <>
            <Text style={styles.metaSep}>·</Text>
            <Text style={styles.meta} numberOfLines={1}>
              {task.mfy_nomi}
            </Text>
          </>
        ) : null}
      </View>

      <View style={styles.actions}>
        <Button
          title={tr('Bajarildi')}
          icon="check"
          onPress={onComplete}
          loading={completing}
          style={styles.primaryBtn}
        />
        <TouchableOpacity
          onPress={onDetails}
          style={styles.detailsBtn}
          accessibilityRole="button"
          accessibilityLabel={tr("Batafsil ma'lumot")}
        >
          <Text style={styles.detailsText}>{tr('Batafsil')}</Text>
          <MaterialCommunityIcons name="chevron-right" size={18} color={Colors.primary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: 16,
    gap: 12,
    ...Shadows.md,
  },
  header: {
    flexDirection: 'row',
    minHeight: 0,
  },
  overduePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.dangerSurface,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  overdueText: {
    fontSize: FontSizes.xs,
    fontFamily: Fonts.body,
    fontWeight: FontWeights.semibold,
    color: Colors.danger,
  },
  title: {
    fontSize: FontSizes.md,
    fontFamily: Fonts.heading,
    fontWeight: FontWeights.bold,
    color: Colors.textPrimary,
    letterSpacing: -0.2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  meta: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.body,
    color: Colors.textSecondary,
    flexShrink: 1,
  },
  metaDanger: {
    color: Colors.danger,
    fontWeight: FontWeights.semibold,
  },
  metaSep: {
    color: Colors.textMuted,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
  },
  primaryBtn: {
    flex: 1,
    paddingVertical: 14,
  },
  detailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
    paddingHorizontal: 8,
  },
  detailsText: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.body,
    fontWeight: FontWeights.semibold,
    color: Colors.primary,
  },
});

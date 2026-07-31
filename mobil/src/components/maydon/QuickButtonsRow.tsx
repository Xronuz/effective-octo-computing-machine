import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useAlifbo } from '../../contexts/AlifboContext';
import { Colors, Fonts, FontSizes, FontWeights, Radius, Shadows } from '../../theme';

interface Props {
  /** Keyingi ish tugmasi */
  taskTitle: string | null;
  taskOverdue: boolean;
  activeCount: number;
  onPressTask: () => void;
  /** Diqqat tugmasi */
  attentionCount: number;
  onPressAttention: () => void;
}

/**
 * "Keyingi ish" va "Diqqat" — bitta qatorda, yonma-yon ikkita tugma.
 * Har biri o'z ekraniga o'tkazadi; batafsil ro'yxat/karta emas.
 */
export default function QuickButtonsRow({
  taskTitle,
  taskOverdue,
  activeCount,
  onPressTask,
  attentionCount,
  onPressAttention,
}: Props) {
  const { tr } = useAlifbo();

  return (
    <View style={styles.row}>
      <TouchableOpacity
        style={[styles.btn, taskOverdue && styles.btnDangerBorder]}
        onPress={onPressTask}
        activeOpacity={0.8}
        accessibilityRole="button"
      >
        <View style={styles.btnTop}>
          <View
            style={[
              styles.iconCircle,
              { backgroundColor: taskOverdue ? Colors.dangerSurface : Colors.primarySurface },
            ]}
          >
            <MaterialCommunityIcons
              name="calendar-check-outline"
              size={20}
              color={taskOverdue ? Colors.danger : Colors.primary}
            />
          </View>
          {activeCount > 0 && (
            <View style={[styles.countPill, taskOverdue && styles.countPillDanger]}>
              <Text style={styles.countPillText}>{activeCount}</Text>
            </View>
          )}
        </View>
        <Text style={styles.btnTitle}>{tr('Keyingi ish')}</Text>
        <Text style={styles.btnSubtitle} numberOfLines={1}>
          {taskTitle ? taskTitle : tr('Faol topshiriqlar yo‘q')}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.btn, attentionCount > 0 && styles.btnWarningBorder]}
        onPress={onPressAttention}
        activeOpacity={0.8}
        accessibilityRole="button"
      >
        <View style={styles.btnTop}>
          <View
            style={[
              styles.iconCircle,
              {
                backgroundColor: attentionCount > 0 ? Colors.warningSurface : Colors.successSurface,
              },
            ]}
          >
            <MaterialCommunityIcons
              name={attentionCount > 0 ? 'bell-alert-outline' : 'check-circle-outline'}
              size={20}
              color={attentionCount > 0 ? Colors.warning : Colors.success}
            />
          </View>
          {attentionCount > 0 && (
            <View style={styles.countPillWarning}>
              <Text style={styles.countPillText}>{attentionCount}</Text>
            </View>
          )}
        </View>
        <Text style={styles.btnTitle}>{tr('Diqqat')}</Text>
        <Text style={styles.btnSubtitle} numberOfLines={1}>
          {attentionCount > 0 ? tr('E’tibor talab qiladi') : tr('Hammasi joyida')}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12 },
  btn: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    padding: 14,
    gap: 6,
    ...Shadows.sm,
  },
  btnDangerBorder: { borderColor: Colors.danger },
  btnWarningBorder: { borderColor: Colors.warning },
  btnTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countPill: {
    minWidth: 22,
    height: 22,
    paddingHorizontal: 6,
    borderRadius: 11,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countPillDanger: { backgroundColor: Colors.danger },
  countPillWarning: {
    minWidth: 22,
    height: 22,
    paddingHorizontal: 6,
    borderRadius: 11,
    backgroundColor: Colors.warning,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countPillText: {
    fontSize: FontSizes.xs,
    fontFamily: Fonts.body,
    fontWeight: FontWeights.bold,
    color: Colors.textInverse,
    fontVariant: ['tabular-nums'],
  },
  btnTitle: {
    fontSize: FontSizes.base,
    fontFamily: Fonts.heading,
    fontWeight: FontWeights.bold,
    color: Colors.textPrimary,
  },
  btnSubtitle: {
    fontSize: FontSizes.xs,
    fontFamily: Fonts.body,
    color: Colors.textMuted,
  },
});

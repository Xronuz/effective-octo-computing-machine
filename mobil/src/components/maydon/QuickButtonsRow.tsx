import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useAlifbo } from '../../contexts/AlifboContext';
import { useTheme } from '../../contexts/ThemeContext';
import { Fonts, FontSizes, FontWeights, Radius, Shadows } from '../../theme';
import type { ColorPalette } from '../../theme/colors';

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
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

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
              { backgroundColor: taskOverdue ? colors.dangerSurface : colors.primarySurface },
            ]}
          >
            <MaterialCommunityIcons
              name="calendar-check-outline"
              size={20}
              color={taskOverdue ? colors.danger : colors.primary}
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
                backgroundColor: attentionCount > 0 ? colors.warningSurface : colors.successSurface,
              },
            ]}
          >
            <MaterialCommunityIcons
              name={attentionCount > 0 ? 'bell-alert-outline' : 'check-circle-outline'}
              size={20}
              color={attentionCount > 0 ? colors.warning : colors.success}
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

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    row: { flexDirection: 'row', gap: 12 },
    btn: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: colors.borderLight,
      padding: 14,
      gap: 6,
      ...Shadows.sm,
    },
    btnDangerBorder: { borderColor: colors.danger },
    btnWarningBorder: { borderColor: colors.warning },
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
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    countPillDanger: { backgroundColor: colors.danger },
    countPillWarning: {
      minWidth: 22,
      height: 22,
      paddingHorizontal: 6,
      borderRadius: 11,
      backgroundColor: colors.warning,
      alignItems: 'center',
      justifyContent: 'center',
    },
    countPillText: {
      fontSize: FontSizes.xs,
      fontFamily: Fonts.body,
      fontWeight: FontWeights.bold,
      color: colors.textInverse,
      fontVariant: ['tabular-nums'],
    },
    btnTitle: {
      fontSize: FontSizes.base,
      fontFamily: Fonts.heading,
      fontWeight: FontWeights.bold,
      color: colors.textPrimary,
    },
    btnSubtitle: {
      fontSize: FontSizes.xs,
      fontFamily: Fonts.body,
      color: colors.textMuted,
    },
  });
}

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useTheme } from '../contexts/ThemeContext';
import { Fonts, FontSizes, Radius, Spacing } from '../theme';
import type { ColorPalette } from '../theme/colors';

interface Props {
  isSyncing: boolean;
  lastSync?: string | null;
  progress?: { total: number; processed: number; failed: number } | null;
}

export default function SyncIndicator({ isSyncing, lastSync, progress }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const showProgress = isSyncing && progress && progress.total > 0;
  const percent = showProgress ? Math.round((progress!.processed / progress!.total) * 100) : 0;

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {isSyncing ? (
          <>
            <ActivityIndicator size="small" color={colors.primary} style={{ marginRight: 8 }} />
            <Text style={styles.text}>Sinxronlanmoqda...</Text>
          </>
        ) : lastSync ? (
          <>
            <MaterialCommunityIcons
              name="check-circle"
              size={16}
              color={colors.success}
              style={{ marginRight: 6 }}
            />
            <Text style={styles.text}>Oxirgi sinxron: {lastSync}</Text>
          </>
        ) : (
          <>
            <MaterialCommunityIcons
              name="circle-outline"
              size={16}
              color={colors.textMuted}
              style={{ marginRight: 6 }}
            />
            <Text style={styles.text}>Hali sinxronlanmagan</Text>
          </>
        )}
      </View>

      {showProgress && (
        <View style={styles.progressBox}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${percent}%` }]} />
          </View>
          <Text style={styles.progressText}>
            {progress!.processed}/{progress!.total}
            {progress!.failed > 0 && (
              <Text style={{ color: colors.danger }}> ({progress!.failed} xato)</Text>
            )}
          </Text>
        </View>
      )}
    </View>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    container: {
      paddingVertical: Spacing.sm,
      paddingHorizontal: Spacing.xs,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    text: {
      fontSize: FontSizes.sm,
      fontFamily: Fonts.body,
      color: colors.textSecondary,
    },
    progressBox: {
      marginTop: Spacing.sm,
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
    },
    progressTrack: {
      flex: 1,
      height: 6,
      backgroundColor: colors.borderLight,
      borderRadius: Radius.full,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      backgroundColor: colors.primary,
    },
    progressText: {
      fontSize: FontSizes.xs,
      fontFamily: Fonts.body,
      color: colors.textSecondary,
      minWidth: 56,
      textAlign: 'right',
    },
  });
}

import React, { useMemo } from 'react';
import { View, Image, TouchableOpacity, Text, StyleSheet } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useTheme } from '../contexts/ThemeContext';
import { Fonts, FontSizes, Radius, Shadows, Spacing } from '../theme';
import type { ColorPalette } from '../theme/colors';

interface Props {
  photos: { uri: string }[];
  onRemove: (index: number) => void;
  onAdd: () => void;
  maxPhotos?: number;
}

export default function PhotoPreview({ photos, onRemove, onAdd, maxPhotos = 5 }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.row}>
      {photos.map((p, i) => (
        <TouchableOpacity
          key={i}
          onPress={() => onRemove(i)}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={`Rasm ${i + 1}, o'chirish uchun bosing`}
        >
          <Image source={{ uri: p.uri }} style={styles.thumb} />
          <View style={[styles.removeBadge, { backgroundColor: colors.danger }, Shadows.sm]}>
            <MaterialCommunityIcons name="close" size={14} color={colors.textInverse} />
          </View>
        </TouchableOpacity>
      ))}
      {photos.length < maxPhotos && (
        <TouchableOpacity
          style={[styles.addBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}
          onPress={onAdd}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Rasm qo'shish"
        >
          <MaterialCommunityIcons name="camera-plus" size={28} color={colors.primary} />
          <Text style={[styles.addLabel, { color: colors.textSecondary }]}>Rasm</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    row: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
    thumb: { width: 88, height: 88, borderRadius: Radius.md },
    removeBadge: {
      position: 'absolute',
      top: -6,
      right: -6,
      width: 26,
      height: 26,
      borderRadius: 13,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: colors.surface,
    },
    addBtn: {
      width: 88,
      height: 88,
      borderRadius: Radius.md,
      borderWidth: 1.5,
      borderStyle: 'dashed',
      alignItems: 'center',
      justifyContent: 'center',
    },
    addLabel: {
      fontSize: FontSizes.xs,
      fontFamily: Fonts.body,
      marginTop: Spacing.xxs,
    },
  });
}

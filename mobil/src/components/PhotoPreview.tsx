import React from 'react';
import { View, Image, TouchableOpacity, Text, StyleSheet } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Colors, Fonts, FontSizes, FontWeights, Radius } from '../theme';

interface Props {
  photos: { uri: string }[];
  onRemove: (index: number) => void;
  onAdd: () => void;
  maxPhotos?: number;
}

export default function PhotoPreview({ photos, onRemove, onAdd, maxPhotos = 5 }: Props) {
  return (
    <View style={styles.row}>
      {photos.map((p, i) => (
        <TouchableOpacity key={i} onPress={() => onRemove(i)} activeOpacity={0.7}>
          <Image source={{ uri: p.uri }} style={styles.thumb} />
          <View style={styles.removeBadge}>
            <MaterialCommunityIcons name="close" size={12} color={Colors.textInverse} />
          </View>
        </TouchableOpacity>
      ))}
      {photos.length < maxPhotos && (
        <TouchableOpacity style={styles.addBtn} onPress={onAdd} activeOpacity={0.7}>
          <MaterialCommunityIcons name="camera-plus" size={24} color={Colors.textSecondary} />
          <Text style={styles.addLabel}>Rasm</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  thumb: { width: 72, height: 72, borderRadius: Radius.sm },
  removeBadge: {
    position: 'absolute', top: -6, right: -6,
    backgroundColor: Colors.danger, width: 22, height: 22, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center',
  },
  addBtn: {
    width: 72, height: 72, borderRadius: Radius.sm,
    borderWidth: 1.5, borderColor: Colors.border,
    borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.surface,
  },
  addLabel: {
    fontSize: FontSizes.xs,
    fontFamily: Fonts.body,
    color: Colors.textSecondary,
    marginTop: 2,
  },
});

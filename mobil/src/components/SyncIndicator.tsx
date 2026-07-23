import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Colors, Fonts, FontSizes, FontWeights } from '../theme';

interface Props {
  isSyncing: boolean;
  lastSync?: string | null;
}

export default function SyncIndicator({ isSyncing, lastSync }: Props) {
  return (
    <View style={styles.row}>
      {isSyncing ? (
        <>
          <ActivityIndicator size="small" color={Colors.primary} style={{ marginRight: 6 }} />
          <Text style={styles.text}>Sinxronlanmoqda...</Text>
        </>
      ) : lastSync ? (
        <>
          <MaterialCommunityIcons name="check-circle" size={14} color={Colors.success} style={{ marginRight: 4 }} />
          <Text style={styles.text}>Oxirgi sinxron: {lastSync}</Text>
        </>
      ) : (
        <>
          <MaterialCommunityIcons name="circle-outline" size={14} color={Colors.textMuted} style={{ marginRight: 4 }} />
          <Text style={styles.text}>Hali sinxronlanmagan</Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  text: {
    fontSize: FontSizes.xs,
    fontFamily: Fonts.body,
    color: Colors.textSecondary,
  },
});

import React, { useMemo, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAlifbo } from '../../contexts/AlifboContext';
import { bugunIso, isoSana, kunOldin } from '../../lib/sana';
import { Colors, Fonts, FontSizes, FontWeights, Radius } from '../../theme';

const KUNLAR_SONI = 21;
const ITEM_WIDTH = 56;
const ITEM_GAP = 8;

const HAFTA_QISQA = ['YAK', 'DU', 'SE', 'CHOR', 'PAY', 'JUM', 'SHAN'];

interface KunItem {
  iso: string;
  kun: number;
  haftaKuni: string;
  bugun: boolean;
}

function oxirgiKunlar(soni: number): KunItem[] {
  const hozirgiKun = bugunIso();
  const natija: KunItem[] = [];
  for (let i = soni - 1; i >= 0; i--) {
    const d = kunOldin(i);
    const iso = isoSana(d);
    natija.push({
      iso,
      kun: d.getDate(),
      haftaKuni: HAFTA_QISQA[d.getDay()],
      bugun: iso === hozirgiKun,
    });
  }
  return natija;
}

interface Props {
  selected: string;
  onSelect: (iso: string) => void;
}

/**
 * Oxirgi 21 kunni ko'rsatuvchi, yonga surib tanlanadigan kun tanlagich.
 * Tanlangan kun gradient fon + porlash (glow) soyasi bilan ajratiladi.
 */
export default function HaftaTanlagich({ selected, onSelect }: Props) {
  const { tr } = useAlifbo();
  const kunlar = useMemo(() => oxirgiKunlar(KUNLAR_SONI), []);
  const listRef = useRef<FlatList<KunItem>>(null);

  return (
    <FlatList
      ref={listRef}
      data={kunlar}
      horizontal
      showsHorizontalScrollIndicator={false}
      keyExtractor={(item) => item.iso}
      contentContainerStyle={styles.list}
      initialScrollIndex={kunlar.length - 1}
      getItemLayout={(_, index) => ({
        length: ITEM_WIDTH + ITEM_GAP,
        offset: (ITEM_WIDTH + ITEM_GAP) * index,
        index,
      })}
      onScrollToIndexFailed={({ index }) => {
        setTimeout(() => {
          listRef.current?.scrollToIndex({ index, animated: false });
        }, 50);
      }}
      renderItem={({ item }) => {
        const active = item.iso === selected;
        return (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => onSelect(item.iso)}
            style={styles.itemWrap}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
          >
            {active ? (
              <LinearGradient
                colors={[Colors.info, Colors.primary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={[styles.item, styles.itemActiveGlow]}
              >
                <Text style={[styles.haftaKuni, styles.textActive]}>{tr(item.haftaKuni)}</Text>
                <Text style={[styles.kun, styles.textActive]}>{item.kun}</Text>
              </LinearGradient>
            ) : (
              <View style={[styles.item, item.bugun && styles.itemBugun]}>
                <Text style={styles.haftaKuni}>{tr(item.haftaKuni)}</Text>
                <Text style={styles.kun}>{item.kun}</Text>
              </View>
            )}
          </TouchableOpacity>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: 4, gap: ITEM_GAP },
  itemWrap: { width: ITEM_WIDTH },
  item: {
    width: ITEM_WIDTH,
    height: 68,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  itemBugun: {
    borderColor: Colors.info,
    borderWidth: 1.5,
  },
  itemActiveGlow: {
    borderWidth: 0,
    shadowColor: Colors.info,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 8,
  },
  haftaKuni: {
    fontSize: FontSizes.xs,
    fontFamily: Fonts.body,
    fontWeight: FontWeights.semibold,
    color: Colors.textMuted,
    letterSpacing: 0.4,
  },
  kun: {
    fontSize: FontSizes.md,
    fontFamily: Fonts.heading,
    fontWeight: FontWeights.bold,
    color: Colors.textPrimary,
  },
  textActive: {
    color: Colors.textInverse,
  },
});

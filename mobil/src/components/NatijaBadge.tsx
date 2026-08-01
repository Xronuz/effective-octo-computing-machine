import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useAlifbo } from '../contexts/AlifboContext';
import { NATIJA_MATNI, type Natija } from '../lib/natija';
import { Colors, Fonts, FontSizes, FontWeights, Radius } from '../theme';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

const STIL: Record<Natija, { icon: IconName; rang: string; fon: string }> = {
  muammo_topildi: { icon: 'alert-circle', rang: Colors.danger, fon: Colors.dangerSurface },
  muammo_yoq: { icon: 'check-circle', rang: Colors.success, fon: Colors.successSurface },
  kira_olmadi: { icon: 'door-closed-lock', rang: Colors.warning, fon: Colors.warningSurface },
};

/**
 * Tashrif natijasi belgisi. Avval `kira_olmadi` tashriflar ro'yxatlarda
 * "muammo topilmadi" bo'lib ko'rinardi — bu noto'g'ri ma'lumot edi.
 */
export default function NatijaBadge({ natija, qisqa = true }: { natija: Natija; qisqa?: boolean }) {
  const { tr } = useAlifbo();
  const s = STIL[natija];
  const matn = qisqa ? NATIJA_MATNI[natija].qisqa : NATIJA_MATNI[natija].toliq;

  return (
    <View style={[styles.pill, { backgroundColor: s.fon, borderColor: s.rang }]}>
      <MaterialCommunityIcons name={s.icon} size={13} color={s.rang} />
      <Text style={[styles.text, { color: s.rang }]} numberOfLines={1}>
        {tr(matn)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  text: {
    fontSize: FontSizes.xs,
    fontFamily: Fonts.body,
    fontWeight: FontWeights.semibold,
    flexShrink: 1,
  },
});

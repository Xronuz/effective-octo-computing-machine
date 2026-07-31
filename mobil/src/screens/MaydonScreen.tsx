import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useAlifbo } from '../contexts/AlifboContext';
import { useTabScreenNavigation } from '../navigation/hooks';
import { useMaydonData } from '../hooks/useMaydonData';
import { useKunlikTekshiruv } from '../hooks/useKunlikTekshiruv';
import StatusStrip from '../components/StatusStrip';
import QuickButtonsRow from '../components/maydon/QuickButtonsRow';
import HaftaTanlagich from '../components/maydon/HaftaTanlagich';
import KunlikStatistika from '../components/maydon/KunlikStatistika';
import { Colors, tabBarContentPadding } from '../theme';

function bugunIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * ASOSIY — operativ boshqaruv ekrani.
 * Tepada: Keyingi ish / Diqqat — ikkita tezkor tugma.
 * Pastda: kun tanlagich + shu kunning tekshiruv statistikasi.
 */
export default function MaydonScreen() {
  const navigation = useTabScreenNavigation();
  const { tr } = useAlifbo();
  const insets = useSafeAreaInsets();
  const { data, loading, refresh } = useMaydonData();
  const [refreshing, setRefreshing] = useState(false);
  const [tanlanganSana, setTanlanganSana] = useState(bugunIso());
  const { stat, loading: statLoading } = useKunlikTekshiruv(tanlanganSana);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    refresh();
    setTimeout(() => setRefreshing(false), 400);
  }, [refresh]);

  const overdue = useMemo(() => {
    const t = data.nextTask;
    if (!t) return false;
    if (t.status === 'kechikkan') return true;
    return t.muddat ? new Date(t.muddat).getTime() < Date.now() : false;
  }, [data.nextTask]);

  const attentionItems = useMemo(() => {
    const items: { key: string; label: string; count: number; onPress: () => void }[] = [];
    if (data.overdueCount > 0) {
      items.push({
        key: 'overdue',
        label: tr('Kechikkan topshiriqlar'),
        count: data.overdueCount,
        onPress: () => navigation.navigate('Topshiriqlar' as never),
      });
    }
    if (data.kritikCount !== null && data.kritikCount > 0) {
      items.push({
        key: 'kritik',
        label: tr('Kritik muammolar'),
        count: data.kritikCount,
        onPress: () => navigation.navigate('Xonadonlar' as never),
      });
    }
    if (data.pendingCount > 0) {
      items.push({
        key: 'pending',
        label: tr('Sinxronlanmagan yozuvlar'),
        count: data.pendingCount,
        onPress: () => navigation.navigate('Navbat' as never),
      });
    }
    return items;
  }, [data.overdueCount, data.kritikCount, data.pendingCount, navigation, tr]);

  const attentionCount = useMemo(
    () => attentionItems.reduce((sum, it) => sum + it.count, 0),
    [attentionItems],
  );

  const handlePressAttention = useCallback(() => {
    if (attentionItems.length === 0) return;
    if (attentionItems.length === 1) {
      attentionItems[0].onPress();
      return;
    }
    Alert.alert(tr('Diqqat talab qiladi'), undefined, [
      ...attentionItems.map((it) => ({
        text: `${it.label} (${it.count})`,
        onPress: it.onPress,
      })),
      { text: tr('Bekor qilish'), style: 'cancel' as const },
    ]);
  }, [attentionItems, tr]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusStrip />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: tabBarContentPadding(insets.bottom) },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
          />
        }
      >
        {loading && !refreshing ? (
          <ActivityIndicator color={Colors.primary} style={styles.loader} />
        ) : (
          <>
            <QuickButtonsRow
              taskTitle={data.nextTask?.sarlavha ?? null}
              taskOverdue={overdue}
              activeCount={data.activeCount}
              onPressTask={() => navigation.navigate('Topshiriqlar' as never)}
              attentionCount={attentionCount}
              onPressAttention={handlePressAttention}
            />

            <View style={styles.kunBlok}>
              <HaftaTanlagich selected={tanlanganSana} onSelect={setTanlanganSana} />
              <KunlikStatistika stat={stat} loading={statLoading} />
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  content: {
    paddingHorizontal: 16,
    gap: 16,
  },
  loader: {
    marginTop: 96,
  },
  kunBlok: {
    gap: 12,
  },
});

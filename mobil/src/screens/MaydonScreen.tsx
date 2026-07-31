import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useAlifbo } from '../contexts/AlifboContext';
import { useTabScreenNavigation } from '../navigation/hooks';
import { useMaydonData } from '../hooks/useMaydonData';
import StatusStrip from '../components/StatusStrip';
import SectionLabel from '../components/SectionLabel';
import NextActionCard from '../components/maydon/NextActionCard';
import AttentionList, { type AttentionItem } from '../components/maydon/AttentionList';
import TerritoryCard from '../components/maydon/TerritoryCard';
import { Colors, Fonts, FontSizes, FontWeights, tabBarContentPadding } from '../theme';

/**
 * MAYDON — operativ boshqaruv ekrani.
 * 3 soniyada javob beradi: holat → keyingi ish → diqqat → hudud.
 * Salomlashuv, statistik grid va tezkor amallar olib tashlandi:
 * ular topshiriq bajarishga yordam bermaydi.
 */
export default function MaydonScreen() {
  const navigation = useTabScreenNavigation();
  const { tr } = useAlifbo();
  const insets = useSafeAreaInsets();
  const { data, loading, refresh, markDone } = useMaydonData();
  const [refreshing, setRefreshing] = useState(false);
  const [completing, setCompleting] = useState(false);

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

  const handleComplete = useCallback(() => {
    const task = data.nextTask;
    if (!task) return;
    Alert.alert(
      tr('Topshiriqni yakunlash'),
      tr('«{title}» bajarildi deb belgilansinmi?').replace('{title}', task.sarlavha),
      [
        { text: tr('Bekor qilish'), style: 'cancel' },
        {
          text: tr('Bajarildi'),
          onPress: async () => {
            setCompleting(true);
            try {
              await markDone(task.id);
            } catch {
              Alert.alert(tr('Xatolik'), tr("Holatni yangilab bo'lmadi. Internetni tekshiring."));
            } finally {
              setCompleting(false);
            }
          },
        },
      ],
    );
  }, [data.nextTask, markDone, tr]);

  const attentionItems = useMemo<AttentionItem[]>(() => {
    const items: AttentionItem[] = [];
    if (data.overdueCount > 0) {
      items.push({
        key: 'overdue',
        icon: 'alert-circle',
        color: Colors.danger,
        label: 'Kechikkan topshiriqlar',
        count: data.overdueCount,
        onPress: () => navigation.navigate('Topshiriqlar' as never),
      });
    }
    if (data.kritikCount !== null && data.kritikCount > 0) {
      items.push({
        key: 'kritik',
        icon: 'fire',
        color: Colors.danger,
        label: 'Kritik muammolar',
        count: data.kritikCount,
        onPress: () => navigation.navigate('Xonadonlar' as never),
      });
    }
    if (data.pendingCount > 0) {
      items.push({
        key: 'pending',
        icon: 'sync-alert',
        color: Colors.warning,
        label: 'Sinxronlanmagan yozuvlar',
        count: data.pendingCount,
        onPress: () => navigation.navigate('Navbat' as never),
      });
    }
    return items;
  }, [data.overdueCount, data.kritikCount, data.pendingCount, navigation]);

  const mfyNames = useMemo(
    () => data.mfylar.map((m) => m.nomi).filter((n): n is string => Boolean(n)),
    [data.mfylar],
  );

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
            <SectionLabel
              title={tr('Keyingi ish')}
              trailing={data.activeCount > 0 ? `${data.activeCount} ${tr('faol')}` : undefined}
            />
            {data.nextTask ? (
              <NextActionCard
                task={data.nextTask}
                overdue={overdue}
                completing={completing}
                onComplete={handleComplete}
                onDetails={() => navigation.navigate('Topshiriqlar' as never)}
              />
            ) : (
              <View style={styles.allClear}>
                <MaterialCommunityIcons
                  name="check-circle-outline"
                  size={22}
                  color={Colors.success}
                />
                <Text style={styles.allClearText}>{tr('Faol topshiriqlar yo‘q')}</Text>
              </View>
            )}

            {attentionItems.length > 0 && (
              <>
                <SectionLabel title={tr('Diqqat')} />
                <AttentionList items={attentionItems} />
              </>
            )}

            <SectionLabel title={tr('Hudud')} />
            <TerritoryCard
              mfyNames={mfyNames}
              ochiqMuammolar={data.ochiqMuammolar}
              onPress={() => navigation.navigate('Xonadonlar' as never)}
            />
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
  },
  loader: {
    marginTop: 96,
  },
  allClear: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: 14,
    padding: 16,
  },
  allClearText: {
    fontSize: FontSizes.base,
    fontFamily: Fonts.body,
    fontWeight: FontWeights.medium,
    color: Colors.success,
  },
});

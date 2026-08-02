import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, Alert, Switch } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import SectionLabel from '../components/SectionLabel';
import Button from '../components/Button';
import PhotoPreview from '../components/PhotoPreview';
import KameraModal, { useKameraRuxsati } from '../components/KameraModal';
import api from '../services/api';
import { fotoYukla } from '../services/sync';
import { useAlifbo } from '../contexts/AlifboContext';
import { useTheme } from '../contexts/ThemeContext';
import { useAppNavigation, useAppRoute } from '../navigation/hooks';
import { Fonts, FontSizes, FontWeights, Spacing, Radius, Shadows } from '../theme';
import type { ColorPalette } from '../theme/colors';
import type { ApiResponse } from '../types';

/**
 * MUAMMONI YOPISH — inspektor muammo bartaraf etilganini qayd etadi.
 *
 * Bu ekrangacha mobil ilovada muammoni yopish yo'li YO'Q edi: backendda
 * `POST /muammolar/{id}/yop` bo'lsa ham, inspektor uchun yagona variant
 * yangi tekshiruv yozish bo'lgan. Natijada asl muammo ochiq qolib,
 * statistika esa takroriy yozuvlar bilan shishardi.
 */
export default function MuammoYopishScreen() {
  const route = useAppRoute<'MuammoYopish'>();
  const navigation = useAppNavigation();
  const { tr } = useAlifbo();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const { muammoId, sarlavha } = route.params;

  const [izoh, setIzoh] = useState('');
  const [ornidaBartaraf, setOrnidaBartaraf] = useState(true);
  const [photos, setPhotos] = useState<{ uri: string }[]>([]);
  const [cameraVisible, setCameraVisible] = useState(false);
  const [saqlanmoqda, setSaqlanmoqda] = useState(false);
  const { soraw } = useKameraRuxsati();

  const suratQoshish = async () => {
    if (await soraw()) setCameraVisible(true);
  };

  const yopish = async () => {
    if (photos.length === 0) {
      Alert.alert(
        tr('Foto majburiy'),
        tr('Muammo bartaraf etilganini tasdiqlash uchun kamida bitta "keyin" foto kerak.'),
      );
      return;
    }

    setSaqlanmoqda(true);
    try {
      // 1) Muammoni yopamiz
      const { data } = await api.post<ApiResponse<unknown>>(`/muammolar/${muammoId}/yop`, {
        ornida_bartaraf: ornidaBartaraf,
        tavsif: izoh.trim() || null,
      });
      if (!data.ok) throw new Error(data.xato || tr('Yopishda xatolik'));

      // 2) "Keyin" fotolarni biriktiramiz
      const yuklangan = [];
      for (const p of photos) {
        yuklangan.push(await fotoYukla(p.uri));
      }
      await api.post(`/muammolar/${muammoId}/fotolar`, {
        fotolar: yuklangan.map((f) => ({
          fayl_yoli: f.fayl_yoli,
          sha256: f.sha256,
          exif_lat: f.exif_lat,
          exif_lng: f.exif_lng,
          exif_vaqt: f.exif_vaqt,
          olcham_byte: f.olcham_byte,
        })),
      });

      Alert.alert(tr('Bajarildi'), tr('Muammo bartaraf etilgan deb yopildi.'), [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      const xabar =
        err?.response?.data?.xato ||
        err?.message ||
        tr('Yopishda xatolik. Internet aloqasini tekshiring.');
      Alert.alert(tr('Xatolik'), xabar);
    } finally {
      setSaqlanmoqda(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <SectionLabel title={tr('Yopilayotgan muammo')} />
        <View style={styles.muammoKarta}>
          <MaterialCommunityIcons name="alert-circle-outline" size={22} color={colors.danger} />
          <Text style={styles.muammoMatn} numberOfLines={3}>
            {sarlavha}
          </Text>
        </View>

        <View style={styles.toggleRow}>
          <View style={{ flex: 1, marginRight: Spacing.md }}>
            <Text style={styles.toggleTitle}>{tr("O'rnida bartaraf etildimi?")}</Text>
            <Text style={styles.toggleHint}>
              {ornidaBartaraf
                ? tr('Muammo joyida tuzatildi')
                : tr('Tashkilot/egasi tomonidan bartaraf etilgan')}
            </Text>
          </View>
          <Switch
            value={ornidaBartaraf}
            onValueChange={setOrnidaBartaraf}
            trackColor={{ false: colors.border, true: colors.primaryLight }}
            thumbColor={colors.textInverse}
          />
        </View>

        <SectionLabel title={tr('Izoh (ixtiyoriy)')} />
        <View style={[styles.inputWrapper, styles.textareaWrapper]}>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={izoh}
            onChangeText={setIzoh}
            placeholder={tr('Nima qilindi, kim bartaraf etdi...')}
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        <SectionLabel title={tr('«Keyin» foto')} trailing={tr('majburiy')} />
        <Text style={styles.fotoIzoh}>
          {tr('Bartaraf etilgan holatni suratga oling — bu dalil sifatida saqlanadi.')}
        </Text>
        <PhotoPreview
          photos={photos}
          onAdd={suratQoshish}
          onRemove={(i) => setPhotos((p) => p.filter((_, idx) => idx !== i))}
          maxPhotos={5}
        />
      </ScrollView>

      <View
        style={[
          styles.submitBar,
          { paddingBottom: Math.max(insets.bottom, Spacing.md) },
          Shadows.md,
        ]}
      >
        <Button
          title={tr('Muammoni yopish')}
          icon="check-circle-outline"
          onPress={yopish}
          loading={saqlanmoqda}
          disabled={saqlanmoqda || photos.length === 0}
        />
      </View>

      <KameraModal
        visible={cameraVisible}
        onClose={() => setCameraVisible(false)}
        onCapture={(uri) => setPhotos((p) => [...p, { uri }])}
      />
    </SafeAreaView>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    content: { paddingHorizontal: Spacing.base, paddingBottom: Spacing['3xl'] },
    muammoKarta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      backgroundColor: colors.surface,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: Spacing.md,
    },
    muammoMatn: {
      flex: 1,
      fontSize: FontSizes.base,
      fontFamily: Fonts.body,
      fontWeight: FontWeights.semibold,
      color: colors.textPrimary,
    },
    toggleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.surface,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: Spacing.base,
      marginTop: Spacing.lg,
    },
    toggleTitle: {
      fontSize: FontSizes.base,
      fontWeight: FontWeights.semibold,
      fontFamily: Fonts.heading,
      color: colors.textPrimary,
    },
    toggleHint: {
      fontSize: FontSizes.sm,
      fontFamily: Fonts.body,
      color: colors.textMuted,
      marginTop: Spacing.xxs,
    },
    inputWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: Radius.md,
      backgroundColor: colors.surface,
    },
    textareaWrapper: { alignItems: 'flex-start' },
    input: {
      flex: 1,
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.md,
      fontSize: FontSizes.base,
      fontFamily: Fonts.body,
      color: colors.textPrimary,
    },
    textArea: { height: 90 },
    fotoIzoh: {
      fontSize: FontSizes.sm,
      fontFamily: Fonts.body,
      color: colors.textMuted,
      marginBottom: Spacing.sm,
    },
    submitBar: {
      backgroundColor: colors.surface,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingHorizontal: Spacing.base,
      paddingTop: Spacing.md,
    },
  });
}

// Umumiy kamera modali — Tekshiruv va Muammoni yopish ekranlari uchun.
// Avval bu mantiq TekshiruvScreen ichida qulflangan edi; ikkinchi ekranda
// takrorlamaslik uchun ajratib olindi.

import React, { useRef, useState } from 'react';
import {
  View,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImageManipulator from 'expo-image-manipulator';
import { useAlifbo } from '../contexts/AlifboContext';
import { Colors } from '../theme';

const FOTO_MAX_PX = 1600;

/** Suratni yuklashdan oldin kichraytirish (trafik va vaqt tejaladi). */
export async function compressPhoto(uri: string): Promise<string> {
  try {
    const { width, height } = await new Promise<{ width: number; height: number }>(
      (resolve, reject) => Image.getSize(uri, (w, h) => resolve({ width: w, height: h }), reject),
    );
    const actions: ImageManipulator.Action[] = [];
    if (Math.max(width, height) > FOTO_MAX_PX) {
      actions.push({ resize: width >= height ? { width: FOTO_MAX_PX } : { height: FOTO_MAX_PX } });
    }
    const result = await ImageManipulator.manipulateAsync(uri, actions, {
      compress: 0.75,
      format: ImageManipulator.SaveFormat.JPEG,
    });
    return result.uri;
  } catch {
    return uri;
  }
}

/** Kamera ruxsatini so'rash; berilmasa tushuntirish ko'rsatiladi. */
export function useKameraRuxsati() {
  const { tr } = useAlifbo();
  const [permission, requestPermission] = useCameraPermissions();

  const soraw = async (): Promise<boolean> => {
    if (permission?.granted) return true;
    const natija = await requestPermission();
    if (!natija.granted) {
      Alert.alert(
        tr("Ruxsat yo'q"),
        tr(
          'Rasm olish uchun kamera ruxsati kerak. Iltimos, qurilma sozlamalaridan kamera ruxsatini yoqing.',
        ),
      );
      return false;
    }
    return true;
  };

  return { soraw };
}

interface Props {
  visible: boolean;
  onClose: () => void;
  /** Surat olinganda — siqilgan fayl yo'li bilan chaqiriladi. */
  onCapture: (uri: string) => void;
}

export default function KameraModal({ visible, onClose, onCapture }: Props) {
  const { tr } = useAlifbo();
  const cameraRef = useRef<CameraView>(null);
  const [capturing, setCapturing] = useState(false);

  const surat = async () => {
    if (!cameraRef.current || capturing) return;
    setCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.75 });
      if (photo?.uri) {
        onCapture(await compressPhoto(photo.uri));
        onClose();
      }
    } catch (err: any) {
      Alert.alert(tr('Kamera xatoligi'), err?.message || tr('Rasm olishda xatolik yuz berdi'));
    } finally {
      setCapturing(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <CameraView ref={cameraRef} style={styles.preview} facing="back" />
        <SafeAreaView style={styles.overlay}>
          <View style={styles.topBar}>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={onClose}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={tr('Yopish')}
            >
              <MaterialCommunityIcons name="close" size={26} color={Colors.textInverse} />
            </TouchableOpacity>
          </View>
          <View style={styles.controls}>
            <TouchableOpacity
              style={styles.shutter}
              onPress={surat}
              disabled={capturing}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={tr('Surat olish')}
            >
              {capturing ? (
                <ActivityIndicator color={Colors.primary} />
              ) : (
                <View style={styles.shutterInner} />
              )}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  preview: { flex: 1 },
  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'space-between' },
  topBar: { alignItems: 'flex-end', padding: 16 },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  controls: { alignItems: 'center', paddingBottom: 32 },
  shutter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: Colors.textInverse,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  shutterInner: { width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.textInverse },
});

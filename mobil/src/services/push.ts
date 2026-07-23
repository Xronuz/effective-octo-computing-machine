/**
 * XAVFSIZ XONADON — Push bildirishnoma servisi.
 *
 * ULASH (boshqa agent qiladi): login muvaffaqiyatli bo'lgach AuthContext
 * ichida `registerForPushNotifications()` chaqiriladi. Funksiya hech qachon
 * throw qilmaydi — xatoliklar yutilib log'lanadi.
 *
 * ESLATMA: expo-notifications FAQAT dinamik import qilinadi. SDK 53+ da
 * Expo Go'dan remote push olib tashlangan — statik import ilova yuklanishini
 * buzadi ("App entry not found"). Expo Go'da funksiya jim o'tkazib yuboriladi;
 * push faqat development build / production build'da ishlaydi.
 */
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import api from './api';

/**
 * Expo push token olib, POST /api/auth/push-token ga yuboradi.
 * Backend schema (app/schemas/auth.py → PushTokenRequest):
 *   { push_token: string } — "ExponentPushToken[...]" formati shart.
 */
export async function registerForPushNotifications(): Promise<void> {
  try {
    // Expo Go'da (SDK 53+) remote push yo'q — development build kerak
    if (Constants.appOwnership === 'expo') {
      console.warn('Push: Expo Go\'da remote bildirishnomalar ishlamaydi (dev build kerak)');
      return;
    }

    // Emulator/simulyatorda push token ishlamaydi
    if (!Device.isDevice) {
      console.warn('Push token faqat haqiqiy qurilmada olinadi');
      return;
    }

    // Dinamik import — modul top-level'da yuklanmaydi (Expo Go xavfsizligi)
    const Notifications = await import('expo-notifications');

    // Android uchun notification channel (Android 8+ talab qiladi)
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Asosiy bildirishnomalar',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#0A1E3C',
      });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      console.warn('Bildirishnoma ruxsati berilmadi');
      return;
    }

    // EAS projectId — push token uchun majburiy
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;

    const tokenResponse = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );
    const pushToken = tokenResponse.data;

    await api.post('/auth/push-token', { push_token: pushToken });
  } catch (err) {
    console.warn('Push token ro\'yxatdan o\'tkazishda xato:', err);
  }
}

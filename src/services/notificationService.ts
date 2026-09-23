import * as Notifications from 'expo-notifications';
import {
  getMessaging,
  getToken,
  onTokenRefresh,
  setBackgroundMessageHandler,
} from '@react-native-firebase/messaging';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import api from './api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export const ensureAndroidChannels = async (): Promise<void> => {
  if (Platform.OS !== 'android') return;
  const channels = [
    { id: 'general', name: 'General', importance: Notifications.AndroidImportance.HIGH },
    { id: 'bookings', name: 'Bookings', importance: Notifications.AndroidImportance.MAX },
    { id: 'reports', name: 'Reports', importance: Notifications.AndroidImportance.HIGH },
    { id: 'chat', name: 'Chat', importance: Notifications.AndroidImportance.HIGH },
    { id: 'payments', name: 'Payments', importance: Notifications.AndroidImportance.MAX },
  ];
  await Promise.all(
    channels.map((c) =>
      Notifications.setNotificationChannelAsync(c.id, {
        name: c.name,
        importance: c.importance,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#006D6F',
        sound: true,
      })
    )
  );
};

export const registerFcmToken = async (opts?: { force?: boolean }): Promise<void> => {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();

    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
        },
      });
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      return;
    }

    const messaging = getMessaging();
    const token = await getToken(messaging);
    if (!token) return;

    const saved = await AsyncStorage.getItem('fcm_token');
    if (!opts?.force && saved === token) return;

    await api.post('/notifications/token/register', {
      token,
      platform: Platform.OS,
    });

    await AsyncStorage.setItem('fcm_token', token);
  } catch (e) {
    console.warn('FCM token registration failed', e);
  }
};

export const unregisterFcmToken = async (): Promise<void> => {
  try {
    const token = await AsyncStorage.getItem('fcm_token');
    if (!token) return;

    await api.post('/notifications/token/unregister', { token });
    await AsyncStorage.removeItem('fcm_token');
  } catch (e) {
    console.warn('FCM token unregister failed', e);
  }
};

export const setupTokenRefreshListener = (): (() => void) => {
  const messaging = getMessaging();
  const unsubscribe = onTokenRefresh(messaging, async (token) => {
    try {
      await api.post('/notifications/token/register', {
        token,
        platform: Platform.OS,
      });
      await AsyncStorage.setItem('fcm_token', token);
    } catch (e) {
      console.warn('Token refresh failed', e);
    }
  });
  return unsubscribe;
};

export const getDeepLinkRoute = (data: Record<string, string>): string | null => {
  const { type } = data || {};
  if (!type) return null;

  switch (type) {
    case 'BOOKING_CREATED':
    case 'BOOKING_ACCEPTED':
    case 'BOOKING_REJECTED':
    case 'PARTNER_ARRIVED':
    case 'SAMPLE_COLLECTED':
    case 'PAYMENT_SUCCESS':
    case 'BOOKING_CANCELLED':
    case 'BOOKING_RESCHEDULED':
    case 'APPOINTMENT_REMINDER':
    case 'MISSED_APPOINTMENT':
    case 'SAMPLE_RECEIVED_IN_LAB':
    case 'PAYMENT_FAILED':
      return '/(tabs)/bookings';
case 'PARTNER_ON_THE_WAY':
      return data?.bookingId ? `/tracking/${data.bookingId}` : '/(tabs)/bookings';
    case 'PARTNER_RATING_REQUEST':
      return data?.bookingId ? `/rating/${data.bookingId}` : '/(tabs)/bookings';
    case 'REPORT_READY':
    case 'REPORT_SENT':
    case 'REPORT_APPROVED':
      return '/(tabs)/reports';
    case 'NEW_BOOKING_ASSIGNED':
    case 'BOOKING_CANCELLED_BY_USER':
      return '/(partner)/home';
    case 'NEW_CHAT_MESSAGE':
    case 'SUPPORT_REPLY':
      return '/support/chat';
    case 'NEW_OFFER':
    case 'NEW_PACKAGE':
    case 'PRICE_UPDATE':
    case 'BROADCAST':
      return '/(tabs)';
    default:
      return null;
  }
};

export { setBackgroundMessageHandler, getMessaging };
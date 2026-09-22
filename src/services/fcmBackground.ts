/**
 * Must be imported at JS entry BEFORE React mounts.
 * Firebase requires setBackgroundMessageHandler at top level.
 */
import * as Notifications from 'expo-notifications';
import {
  getMessaging,
  setBackgroundMessageHandler,
} from '@react-native-firebase/messaging';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

try {
  const messaging = getMessaging();
  setBackgroundMessageHandler(messaging, async (remoteMessage) => {
    // Notification+data payloads are shown by the OS when app is backgrounded.
    // Data-only payloads need a local notification so the tray still updates.
    if (remoteMessage.notification?.title) {
      return;
    }

    const title =
      (remoteMessage.data?.title as string) ||
      'MedsSeva';
    const body =
      (remoteMessage.data?.body as string) ||
      (remoteMessage.data?.message as string) ||
      '';

    if (!body) return;

    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: remoteMessage.data || {},
        sound: true,
      },
      trigger: null,
    });
  });
} catch (e) {
  console.warn('[FCM] Background handler setup failed', e);
}

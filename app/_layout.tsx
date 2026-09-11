import 'react-native-gesture-handler';
import React, { useEffect, useState, useRef } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Stack, useRouter } from 'expo-router';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { store, RootState } from '../src/store';
import { View, StyleSheet, ActivityIndicator, Modal, LogBox } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { COLORS } from '../src/theme/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { tokenStorage } from '../src/utils/tokenStorage';
import { loginSuccess } from '../src/store/slices/authSlice';
import * as Notifications from 'expo-notifications';
import {
  getMessaging,
  onMessage,
  getInitialNotification,
  onNotificationOpenedApp,
  setBackgroundMessageHandler,
} from '@react-native-firebase/messaging';
import {
  registerFcmToken,
  setupTokenRefreshListener,
  getDeepLinkRoute,
} from '../src/services/notificationService';

import { GlobalSchedulerOverlay } from '../src/components/GlobalSchedulerOverlay';
import { ToastHost } from '../src/components/ToastHost';
import { initLogout } from '../src/utils/logout';

LogBox.ignoreLogs([
  "Can't perform a React state update on a component that hasn't mounted yet",
]);

const queryClient = new QueryClient();

function AppContent() {
  const dispatch = useDispatch();
  const router = useRouter();
  const user = useSelector((s: RootState) => s.auth.user);
  const isLoggingOut = useSelector((s: RootState) => s.auth.isLoggingOut);
  const [rehydrated, setRehydrated] = useState(false);
  const notificationListener = useRef<any>(null);
  const responseListener = useRef<any>(null);
  const tokenRefreshUnsub = useRef<(() => void) | null>(null);

  useEffect(() => {
    initLogout(queryClient, router);
  }, []);

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const token = await tokenStorage.getItem('token');
        const userRaw = await AsyncStorage.getItem('user');
        if (token && userRaw) {
          const cached = JSON.parse(userRaw);
          dispatch(loginSuccess(cached));
          try {
            const { default: api } = await import('../src/services/api');
            const fresh = await api.get('/users/me');
            const freshUser = fresh.data;
            dispatch(loginSuccess({ ...cached, ...freshUser }));
            await AsyncStorage.setItem('user', JSON.stringify({ ...cached, ...freshUser }));
          } catch {
          }
        }
      } catch (e) {
        console.warn('Session restore failed', e);
      } finally {
        setRehydrated(true);
      }
    };
    restoreSession();
  }, []);

  useEffect(() => {
    if (!user) return;

 const messaging = getMessaging();

    registerFcmToken();
    tokenRefreshUnsub.current = setupTokenRefreshListener();

    setBackgroundMessageHandler(messaging, async () => {});

    const unsubForeground = onMessage(messaging, async (remoteMessage) => {
      const { title, body } = remoteMessage.notification || {};
      if (!title || !body) return;
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: remoteMessage.data || {},
        },
        trigger: null,
      });
    });

    notificationListener.current = Notifications.addNotificationReceivedListener(() => {});

    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as Record<string, string>;
      const route = getDeepLinkRoute(data);
      if (route) {
        router.push(route as any);
      }
    });

    getInitialNotification(messaging).then((remoteMessage) => {
      if (remoteMessage?.data) {
        const route = getDeepLinkRoute(remoteMessage.data as Record<string, string>);
        if (route) {
          setTimeout(() => router.push(route as any), 1000);
        }
      }
    });

    onNotificationOpenedApp(messaging, (remoteMessage) => {
      if (remoteMessage?.data) {
        const route = getDeepLinkRoute(remoteMessage.data as Record<string, string>);
        if (route) router.push(route as any);
      }
    });

    return () => {
      unsubForeground();
      tokenRefreshUnsub.current?.();
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, [user]);

  // Removed conditional !rehydrated block to allow Expo Router to mount properly

  return (
    <View style={styles.container}>
      <Stack screenOptions={{ 
        headerShown: false,
        contentStyle: { backgroundColor: 'transparent' }
      }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(partner)" options={{ headerShown: false }} />
        <Stack.Screen name="(phlebotomist)" options={{ headerShown: false }} />
        <Stack.Screen name="(doctor)" options={{ headerShown: false }} />
        <Stack.Screen name="support" options={{ headerShown: false }} />
      </Stack>
  <GlobalSchedulerOverlay />
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, top: 0, zIndex: 99999, elevation: 99999, pointerEvents: 'box-none' }}>
        <ToastHost />
      </View>
      <Modal visible={isLoggingOut} transparent animationType="fade">
        <View style={styles.logoutOverlay}>
          <ActivityIndicator size="large" color="#fff" />
        </View>
      </Modal>
    </View>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>
          <SafeAreaProvider>
            <AppContent />
          </SafeAreaProvider>
        </QueryClientProvider>
      </Provider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
container: {
    flex: 1,
    backgroundColor: COLORS.primary,
  },
  logoutOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
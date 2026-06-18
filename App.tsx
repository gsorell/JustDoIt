import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as Notifications from 'expo-notifications';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppProvider, useApp } from './src/context/AppContext';
import CelebrationHost from './src/components/CelebrationHost';
import AboutScreen from './src/screens/AboutScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import AddDirectiveScreen from './src/screens/AddDirectiveScreen';
import CheckInScreen from './src/screens/CheckInScreen';
import DirectiveDetailScreen from './src/screens/DirectiveDetailScreen';
import HomeScreen from './src/screens/HomeScreen';
import { RootStackParamList } from './src/types';
import {
  CHECKIN_FAILURE_ACTION,
  CHECKIN_SUCCESS_ACTION,
  registerNotificationCategories,
  requestNotificationPermissions,
} from './src/services/notifications';

const Stack = createNativeStackNavigator<RootStackParamList>();

type NavRef = React.RefObject<NavigationContainerRef<RootStackParamList> | null>;

// Native notification handling. Lives in its own component so the native-only
// `useLastNotificationResponse` hook is never called on web (where it throws).
function NativeNotificationBridge({ navRef }: { navRef: NavRef }) {
  const { quickCheckIn } = useApp();
  const handledNotificationIdRef = useRef<string | null>(null);
  const lastNotificationResponse = Notifications.useLastNotificationResponse();

  useEffect(() => {
    requestNotificationPermissions();
    registerNotificationCategories();
  }, []);

  // Covers cold start, background, and foreground tap cases uniformly. The ref
  // dedupes so the same response can't re-navigate on re-renders.
  useEffect(() => {
    if (!lastNotificationResponse) return;
    const id = lastNotificationResponse.notification.request.identifier;
    if (handledNotificationIdRef.current === id) return;
    handledNotificationIdRef.current = id;

    const data = lastNotificationResponse.notification.request.content.data as {
      directiveId?: string;
      checkInId?: string;
    };
    if (!data?.directiveId || !data?.checkInId) return;

    const action = lastNotificationResponse.actionIdentifier;
    if (action === CHECKIN_SUCCESS_ACTION || action === CHECKIN_FAILURE_ACTION) {
      // Action button pressed in the panel — record quietly, don't open a screen.
      quickCheckIn(
        data.checkInId,
        action === CHECKIN_SUCCESS_ACTION ? 'success' : 'failure'
      );
      return;
    }

    // Body tap (default action) — open the full check-in screen.
    navRef.current?.navigate('CheckIn', {
      directiveId: data.directiveId,
      checkInId: data.checkInId,
    });
  }, [lastNotificationResponse]);

  return null;
}

// Web notification handling via the service worker + foreground Notification API.
function WebNotificationBridge({ navRef }: { navRef: NavRef }) {
  const { quickCheckIn } = useApp();

  useEffect(() => {
    requestNotificationPermissions();

    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;

    navigator.serviceWorker.register('/sw.js').catch(console.error);

    // Handle notification taps routed back from the service worker
    const handleSWMessage = (event: MessageEvent) => {
      if (event.data?.type === 'NOTIFICATION_ACTION') {
        const { response, checkInId } = event.data as {
          response: 'success' | 'failure';
          directiveId: string;
          checkInId: string;
        };
        // Quiet advance — no navigation, no completion card.
        quickCheckIn(checkInId, response);
      } else if (event.data?.type === 'NOTIFICATION_CLICKED') {
        const { directiveId, checkInId } = event.data as {
          directiveId: string;
          checkInId: string;
        };
        navRef.current?.navigate('CheckIn', { directiveId, checkInId });
      }
    };
    navigator.serviceWorker.addEventListener('message', handleSWMessage);

    // Handle taps on foreground Notification objects (before SW takes control)
    const handleDirectClick = (event: Event) => {
      const { directiveId, checkInId } = (
        event as CustomEvent<{ directiveId: string; checkInId: string }>
      ).detail;
      navRef.current?.navigate('CheckIn', { directiveId, checkInId });
    };
    window.addEventListener('cadence-checkin', handleDirectClick);

    return () => {
      navigator.serviceWorker.removeEventListener('message', handleSWMessage);
      window.removeEventListener('cadence-checkin', handleDirectClick);
    };
  }, []);

  return null;
}

function AppNavigator() {
  const navRef = useRef<NavigationContainerRef<RootStackParamList>>(null);

  return (
    <>
      {Platform.OS === 'web' ? (
        <WebNotificationBridge navRef={navRef} />
      ) : (
        <NativeNotificationBridge navRef={navRef} />
      )}
      <NavigationContainer ref={navRef}>
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
            animation: 'slide_from_right',
          }}
        >
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen
          name="AddDirective"
          component={AddDirectiveScreen}
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen name="DirectiveDetail" component={DirectiveDetailScreen} />
          <Stack.Screen name="About" component={AboutScreen} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen
          name="CheckIn"
          component={CheckInScreen}
          options={{
            presentation: Platform.OS === 'ios' ? 'fullScreenModal' : 'modal',
            animation: 'slide_from_bottom',
          }}
        />
        </Stack.Navigator>
      </NavigationContainer>
      <CelebrationHost />
    </>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <StatusBar style="light" />
        <AppNavigator />
      </AppProvider>
    </SafeAreaProvider>
  );
}

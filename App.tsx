import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppProvider } from './src/context/AppContext';
import AddDirectiveScreen from './src/screens/AddDirectiveScreen';
import CheckInScreen from './src/screens/CheckInScreen';
import DirectiveDetailScreen from './src/screens/DirectiveDetailScreen';
import HomeScreen from './src/screens/HomeScreen';
import { RootStackParamList } from './src/types';
import {
  addNotificationResponseListener,
  removeNotificationSubscription,
  requestNotificationPermissions,
} from './src/services/notifications';

const Stack = createNativeStackNavigator<RootStackParamList>();

function AppNavigator() {
  const navRef = useRef<NavigationContainerRef<RootStackParamList>>(null);

  useEffect(() => {
    if (Platform.OS === 'web') {
      requestNotificationPermissions();

      if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js').catch(console.error);

        // Handle notification taps routed back from the service worker
        const handleSWMessage = (event: MessageEvent) => {
          if (event.data?.type === 'NOTIFICATION_CLICKED') {
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
      }

      return;
    }

    requestNotificationPermissions();

    const sub = addNotificationResponseListener(({ directiveId, checkInId }) => {
      navRef.current?.navigate('CheckIn', { directiveId, checkInId });
    });

    return () => removeNotificationSubscription(sub);
  }, []);

  return (
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

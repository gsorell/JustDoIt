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
    if (Platform.OS === 'web') return;

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

import * as Notifications from 'expo-notifications';
import { type EventSubscription } from 'expo-modules-core';
import { Platform } from 'react-native';
import { Directive } from '../types';
import { intervalLabel } from './storage';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function areNotificationsGranted(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const { status } = await Notifications.getPermissionsAsync();
  return status === 'granted';
}

/**
 * Schedule a single check-in notification for a directive.
 * Returns the notification identifier.
 */
export async function scheduleNextCheckIn(
  directive: Directive,
  checkInId: string
): Promise<string | null> {
  if (Platform.OS === 'web') return null;
  const granted = await areNotificationsGranted();
  if (!granted) return null;

  const delaySeconds = directive.checkInIntervalMinutes * 60;
  const label = intervalLabel(directive.checkInIntervalMinutes);
  const isAvoid = directive.type === 'DONT';

  const identifier = await Notifications.scheduleNotificationAsync({
    content: {
      title: isAvoid ? "How's it going? 🚫" : "Time to check in! ✅",
      body: isAvoid
        ? `Did you avoid "${directive.action}" for the last ${label}?`
        : `Did you "${directive.action}" in the last ${label}?`,
      data: { directiveId: directive.id, checkInId },
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: delaySeconds,
      repeats: false,
    },
  });

  return identifier;
}

export async function cancelDirectiveNotifications(
  identifiers: string[]
): Promise<void> {
  if (Platform.OS === 'web') return;
  for (const id of identifiers) {
    await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
  }
}

export function addNotificationResponseListener(
  callback: (data: { directiveId: string; checkInId: string }) => void
): EventSubscription {
  return Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data as {
      directiveId?: string;
      checkInId?: string;
    };
    if (data?.directiveId && data?.checkInId) {
      callback({ directiveId: data.directiveId, checkInId: data.checkInId });
    }
  });
}

export function removeNotificationSubscription(
  subscription: EventSubscription
): void {
  subscription.remove();
}

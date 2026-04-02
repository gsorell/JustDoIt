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

// ─── Web implementation ───────────────────────────────────────────────────────
// On web we use the browser Notification API + a service worker.
// Notifications fire via setTimeout, so they work while the PWA/tab is open.
// When the browser is fully closed, a push server would be needed (future work).

const webTimers = new Map<string, ReturnType<typeof setTimeout>>();

async function requestWebPermissions(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

async function areWebPermissionsGranted(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) return false;
  return Notification.permission === 'granted';
}

async function scheduleWebNotification(
  directive: Directive,
  checkInId: string
): Promise<string | null> {
  if (!(await areWebPermissionsGranted())) return null;

  const delayMs = directive.checkInIntervalMinutes * 60 * 1000;
  const label = intervalLabel(directive.checkInIntervalMinutes);
  const isAvoid = directive.type === 'DONT';
  const title = isAvoid ? "How's it going? 🚫" : 'Time to check in! ✅';
  const body = isAvoid
    ? `Did you avoid "${directive.action}" for the last ${label}?`
    : `Did you "${directive.action}" in the last ${label}?`;
  const data = { directiveId: directive.id, checkInId };

  const notifId = `web-${checkInId}`;

  const timer = setTimeout(() => {
    webTimers.delete(notifId);
    const sw =
      typeof navigator !== 'undefined'
        ? navigator.serviceWorker?.controller
        : null;
    if (sw) {
      // Let the service worker show the notification so it works in background tabs
      sw.postMessage({ type: 'SHOW_NOTIFICATION', title, body, data });
    } else {
      // Fallback: direct Notification (foreground only)
      const notif = new Notification(title, { body, data, icon: '/assets/logo.png' });
      notif.onclick = () => {
        window.focus();
        window.dispatchEvent(new CustomEvent('cadence-checkin', { detail: data }));
      };
    }
  }, delayMs);

  webTimers.set(notifId, timer);
  return notifId;
}

function cancelWebTimers(ids: string[]): void {
  for (const id of ids) {
    const timer = webTimers.get(id);
    if (timer !== undefined) {
      clearTimeout(timer);
      webTimers.delete(id);
    }
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === 'web') return requestWebPermissions();
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function areNotificationsGranted(): Promise<boolean> {
  if (Platform.OS === 'web') return areWebPermissionsGranted();
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
  if (Platform.OS === 'web') return scheduleWebNotification(directive, checkInId);

  const granted = await areNotificationsGranted();
  if (!granted) return null;

  const delaySeconds = directive.checkInIntervalMinutes * 60;
  const label = intervalLabel(directive.checkInIntervalMinutes);
  const isAvoid = directive.type === 'DONT';

  const identifier = await Notifications.scheduleNotificationAsync({
    content: {
      title: isAvoid ? "How's it going? 🚫" : 'Time to check in! ✅',
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
  if (Platform.OS === 'web') {
    cancelWebTimers(identifiers);
    return;
  }
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

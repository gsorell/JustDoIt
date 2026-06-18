// Cadence PWA Service Worker — handles scheduled check-in notifications

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(clients.claim()));

// App posts SHOW_NOTIFICATION when a setTimeout fires in the main thread
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SHOW_NOTIFICATION') {
    const { title, body, data, actions } = event.data;
    event.waitUntil(
      self.registration.showNotification(title, {
        body,
        data,
        actions: actions || [],
        badge: '/assets/favicon-32.png',
      })
    );
  }
});

// Route notification taps back to the open app window. When an action button was
// pressed, we forward the chosen response so the app can record it quietly; a tap
// on the notification body opens the check-in screen as before.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  const action = event.action; // '' for body taps, otherwise the action identifier
  const isCheckInAction =
    action === 'CHECKIN_SUCCESS' || action === 'CHECKIN_FAILURE';

  const message = isCheckInAction
    ? {
        type: 'NOTIFICATION_ACTION',
        response: action === 'CHECKIN_SUCCESS' ? 'success' : 'failure',
        directiveId: data.directiveId,
        checkInId: data.checkInId,
      }
    : {
        type: 'NOTIFICATION_CLICKED',
        directiveId: data.directiveId,
        checkInId: data.checkInId,
      };

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ('focus' in client) {
            // Don't steal focus for a quiet action response.
            if (!isCheckInAction) client.focus();
            if (data.directiveId && data.checkInId) {
              client.postMessage(message);
            }
            return;
          }
        }
        // No open window — open the app at root so it can reconcile on launch.
        return clients.openWindow('/');
      })
  );
});

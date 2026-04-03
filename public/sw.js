// Cadence PWA Service Worker — handles scheduled check-in notifications

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(clients.claim()));

// App posts SHOW_NOTIFICATION when a setTimeout fires in the main thread
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SHOW_NOTIFICATION') {
    const { title, body, data } = event.data;
    event.waitUntil(
      self.registration.showNotification(title, {
        body,
        data,
        badge: '/assets/favicon-32.png',
      })
    );
  }
});

// Route notification taps back to the open app window
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data || {};

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ('focus' in client) {
            client.focus();
            if (data.directiveId && data.checkInId) {
              client.postMessage({
                type: 'NOTIFICATION_CLICKED',
                directiveId: data.directiveId,
                checkInId: data.checkInId,
              });
            }
            return;
          }
        }
        // No open window — open the app at root; the app will check for overdue check-ins
        return clients.openWindow('/');
      })
  );
});

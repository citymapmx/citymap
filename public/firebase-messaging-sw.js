// Firebase Messaging Service Worker
// This file must be at the root of the domain (/firebase-messaging-sw.js)
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyA7VL3wbXJ5epdmzhGVqbVm-zKUWD00cEo",
  authDomain: "citymap-mx.firebaseapp.com",
  projectId: "citymap-mx",
  storageBucket: "citymap-mx.firebasestorage.app",
  messagingSenderId: "769139703867",
  appId: "1:769139703867:web:41c64a2f83bc04d88f5c1e"
});

const messaging = firebase.messaging();

// Handle background notifications
messaging.onBackgroundMessage((payload) => {
  const { title, body, imageUrl } = payload.notification || {};
  const deepLink = payload.data?.deepLink;

  self.registration.showNotification(title || 'CityMap', {
    body: body || '',
    icon: '/icon-192.png',
    badge: '/icon-96.png',
    image: imageUrl || undefined,
    data: { deepLink },
    vibrate: [200, 100, 200],
    tag: 'citymap-notification'
  });
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const deepLink = event.notification.data?.deepLink;
  const url = deepLink || 'https://citymap.mx';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      for (const client of windowClients) {
        if (client.url.includes('citymap.mx') && 'focus' in client) {
          client.focus();
          client.postMessage({ type: 'DEEP_LINK', url });
          return;
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});

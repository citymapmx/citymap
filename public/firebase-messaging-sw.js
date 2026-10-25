// Register before Firebase so clicks on our foreground and background notifications
// use the same safe destination, on either CityMap domain.
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const data = event.notification.data || {};
  const requested = data.deepLink || data.FCM_MSG?.data?.deepLink || data.FCM_MSG?.fcmOptions?.link || '/';
  let url;
  try {
    url = new URL(requested, self.location.origin);
    if (url.origin !== self.location.origin) url = new URL('/', self.location.origin);
  } catch { url = new URL('/', self.location.origin); }
  event.stopImmediatePropagation();
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const client = windows.find(item => new URL(item.url).origin === self.location.origin && 'focus' in item);
    if (client) {
      if ('navigate' in client) await client.navigate(url.href);
      return client.focus();
    }
    return self.clients.openWindow?.(url.href);
  })());
});

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');
firebase.initializeApp({
  apiKey: 'AIzaSyA7VL3wbXJ5epdmzhGVqbVm-zKUWD00cEo',
  authDomain: 'citymap-mx.firebaseapp.com',
  projectId: 'citymap-mx',
  storageBucket: 'citymap-mx.firebasestorage.app',
  messagingSenderId: '769139703867',
  appId: '1:769139703867:web:41c64a2f83bc04d88f5c1e'
});
const messaging = firebase.messaging();
messaging.onBackgroundMessage(payload => {
  // FCM already displays messages containing notification; don't display a duplicate.
  if (payload.notification) return;
  const { title, body, imageUrl, deepLink } = payload.data || {};
  return self.registration.showNotification(title || 'CityMap', {
    body: body || '', icon: '/icon-192.png', badge: '/icon-96.png',
    ...(imageUrl ? { image: imageUrl } : {}), data: { deepLink: deepLink || '/' }
  });
});

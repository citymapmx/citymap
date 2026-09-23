import { useEffect, useRef } from 'react';
import { app, getMessaging, getToken, onMessage } from '../lib/firebase.js';

// Public VAPID key (safe to expose — it's a public key by design)
const VAPID_KEY = 'BHUenh0Q3pag11nC5XJCEM9X8x9cuTipX0VKQep21sH01G-hBb8vXx2QAvsEO0-KxLCT3Vkj92aZh5mWqdGSzaM';
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY;

async function saveToken(token, citySlug) {
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/push_tokens`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON,
        Authorization: `Bearer ${SUPABASE_ANON}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates'
      },
      body: JSON.stringify({
        token,
        platform: 'web',
        city_slug: citySlug || null,
        updated_at: new Date().toISOString()
      })
    });
  } catch {}
}

export function useWebPush({ citySlug, enabled = true } = {}) {
  const registeredRef = useRef(false);

  useEffect(() => {
    if (!enabled || registeredRef.current) return;
    // Only run on web (not Capacitor native)
    if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('Notification' in window)) return;
    if (window.Capacitor?.isNativePlatform?.()) return;
    if (!VAPID_KEY) return;

    const permission = Notification.permission;
    if (permission === 'denied') return;

    // If already granted, register silently
    // If 'default', we wait for the soft-prompt in UI to call requestAndRegister()
    if (permission === 'granted') {
      register();
    }
  }, [enabled, citySlug]); // eslint-disable-line react-hooks/exhaustive-deps

  async function register() {
    try {
      const sw = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      const messaging = getMessaging(app);
      const token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: sw });
      if (token) {
        registeredRef.current = true;
        await saveToken(token, citySlug);
      }
      // Handle foreground messages
      onMessage(messaging, (payload) => {
        const { title, body } = payload.notification || {};
        if (title && Notification.permission === 'granted') {
          new Notification(title, { body, icon: '/icon-192.png' });
        }
      });
    } catch {}
  }

  async function requestAndRegister() {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') await register();
    return permission;
  }

  return { requestAndRegister };
}

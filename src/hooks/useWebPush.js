import { useEffect, useRef } from 'react';
import { sb } from '../lib/supabase.js';
import { app, getMessaging, getToken, onMessage } from '../lib/firebase.js';

// Public VAPID key (safe to expose — it's a public key by design)
const VAPID_KEY = 'BHUenh0Q3pag11nC5XJCEM9X8x9cuTipX0VKQep21sH01G-hBb8vXx2QAvsEO0-KxLCT3Vkj92aZh5mWqdGSzaM';
async function saveToken(token, citySlug) {
  if (!sb._token) return false;
  try {
    const response = await fetch('/api/register-token', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sb._token}` },
      body: JSON.stringify({ token, platform: 'web', city_slug: citySlug || null })
    });
    if (!response.ok) return false;
    try { localStorage.setItem('cg_web_push_token', token); } catch { /* Storage unavailable. */ }
    return true;
  } catch { return false; }
}

export function useWebPush({ citySlug, userId, enabled = true } = {}) {
  const registeredRef = useRef(false);
  const unsubscribeRef = useRef(null);
  useEffect(() => {
    registeredRef.current = false;
    unsubscribeRef.current?.();
    unsubscribeRef.current = null;
    return () => unsubscribeRef.current?.();
  }, [userId, citySlug]);

  useEffect(() => {
    if (!enabled || !userId || registeredRef.current) return;
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
  }, [enabled, citySlug, userId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function register() {
    try {
      const sw = await navigator.serviceWorker.register('/firebase-messaging-sw.js', { scope: '/push-notifications/' });
      const messaging = getMessaging(app);
      const token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: sw });
      if (token) {
        if (!await saveToken(token, citySlug)) return false;
        registeredRef.current = true;
      }
      if (!token) return false;
      // Handle foreground messages
      unsubscribeRef.current?.();
      unsubscribeRef.current = onMessage(messaging, (payload) => {
        const { title, body } = payload.notification || {};
        if (title && Notification.permission === 'granted') {
          sw.showNotification(title, { body, icon: '/icon-192.png', data: { deepLink: payload.data?.deepLink || '/' } });
        }
      });
      return true;
    } catch { return false; }
  }

  async function requestAndRegister() {
    if (typeof window === 'undefined' || !('Notification' in window) || !('serviceWorker' in navigator)) return 'unsupported';
    if (!sb._token) return 'signin-required';
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') return permission;
      return await register() ? 'granted' : 'error';
    } catch { return 'error'; }
  }

  return { requestAndRegister };
}

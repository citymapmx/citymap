import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { sb } from '../lib/supabase.js';
import { useAuthStore } from '../store/useAuthStore.js';
import { useUIStore } from '../store/useUIStore.js';

export function usePushNotifications() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    
    PushNotifications.checkPermissions().then(result => {
      if (result.receive === 'granted') {
        PushNotifications.register();
      }
    });

    const regListener = PushNotifications.addListener('registration', async (token) => {
      // Siempre guardamos el token localmente, sin importar si hay sesión
      localStorage.setItem('cg_push_token', token.value);

      try {
        const u = useAuthStore.getState().user;
        if (!u?.id || !sb._token) return;

        // Registrar el token de forma segura en el backend
        await fetch(`https://citymap.mx/api/register-token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sb._token}` },
          body: JSON.stringify({ 
            token: token.value, 
            user_id: u.id,
            city_slug: useUIStore.getState().activeCity // Guardamos la ciudad actual del usuario
          })
        });
      } catch (err) {
        console.error("Error saving token:", err);
      }
    });

    const recvListener = PushNotifications.addListener('pushNotificationReceived', (notification) => {
      useUIStore.getState().toast$(notification.title + ': ' + notification.body);
    });

    // Cuando el usuario TOCA la notificación (app en background o cerrada)
    const actionListener = PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      const deepLink = action.notification?.data?.deepLink;
      if (deepLink) {
        try {
          const url = new URL(deepLink);
          if (url.protocol !== "https:" || !["citymap.mx", "www.citymap.mx", "citymap.world", "www.citymap.world"].includes(url.hostname)) return;
          // Forzamos la recarga de la URL para que el inicializador de la app procese el negocio
          // igual que como funcionan los Android App Links nativos
          window.location.href = url.pathname + url.search;
        } catch (e) {
          console.error('Deep link error:', e);
        }
      }
    });

    return () => {
      regListener.then(listener => listener.remove());
      recvListener.then(listener => listener.remove());
      actionListener.then(listener => listener.remove());
    };
  }, []);
}

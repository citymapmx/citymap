import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { useAuthStore } from '../store/useAuthStore.js';
import { useUIStore } from '../store/useUIStore.js';

export function usePushNotifications() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    
    PushNotifications.requestPermissions().then(result => {
      if (result.receive === 'granted') {
        PushNotifications.register();
      }
    });

    const regListener = PushNotifications.addListener('registration', async (token) => {
      console.log('Push token: ' + token.value);
      // Siempre guardamos el token localmente, sin importar si hay sesión
      localStorage.setItem('cg_push_token', token.value);

      try {
        const u = useAuthStore.getState().user;
        if (!u?.id) {
          // Si no hay sesión, nos aseguramos de que el backend no tenga este token 
          // asociado a un usuario anterior en este dispositivo
          await fetch(`https://citymap.mx/api/unregister-token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: token.value })
          }).catch(() => null);
          return;
        }

        // Registrar el token de forma segura en el backend
        await fetch(`https://citymap.mx/api/register-token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
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
          // Forzamos la recarga de la URL para que el inicializador de la app procese el negocio
          // igual que como funcionan los Android App Links nativos
          window.location.href = url.pathname + url.search;
        } catch (e) {
          console.error('Deep link error:', e);
        }
      }
    });

    return () => {
      regListener.remove();
      recvListener.remove();
      actionListener.remove();
    };
  }, []);
}

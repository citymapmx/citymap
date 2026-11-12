import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';

// Sonido y canal propios de los avisos push en la app Android.
//
// En Android 8+ el sonido de una notificación lo manda el CANAL, no el
// mensaje: por eso la app crea (una vez por instalación, en cada arranque)
// el canal `citymap_alerts` con el sonido propio, y el servidor pide ese
// canal y ese sonido en cada envío FCM. Si el canal ya existe en el
// teléfono, Android conserva sus ajustes y createChannel no hace nada.
// En dispositivos con la app vieja (sin el recurso en res/raw) Android cae
// al sonido por defecto, así que nada se rompe.

// Canal nuevo (distinto del que crea FCM por defecto): los teléfonos que ya
// tienen la app conservan el canal viejo con el sonido por defecto; solo el
// canal nuevo suena con el tono propio.
export const PUSH_ALERT_CHANNEL_ID = 'citymap_alerts';
export const PUSH_ALERT_CHANNEL_NAME = 'Avisos de CityMap';
export const PUSH_ALERT_CHANNEL_DESCRIPTION =
  'Recordatorios de tus eventos guardados y avisos de negocios.';
// Archivo en android/app/src/main/res/raw (el plugin le quita la extensión).
export const PUSH_ALERT_SOUND_FILE = 'citymap_alert.mp3';
// Nombre del recurso para FCM (sin extensión): R.raw.citymap_alert.
export const PUSH_ALERT_SOUND_NAME = 'citymap_alert';

export function pushAlertChannel() {
  return {
    id: PUSH_ALERT_CHANNEL_ID,
    name: PUSH_ALERT_CHANNEL_NAME,
    description: PUSH_ALERT_CHANNEL_DESCRIPTION,
    sound: PUSH_ALERT_SOUND_FILE,
    // 4 = HIGH: suena y se asoma (heads-up). Sin sonido no llega a 3+.
    importance: 4,
    vibration: true,
  };
}

// Crea el canal propio si no existe. Nunca lanza: un fallo aquí no debe
// frenar el registro de push. En web no hace nada.
export async function ensurePushAlertChannel() {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    await PushNotifications.createChannel(pushAlertChannel());
    return true;
  } catch {
    return false;
  }
}

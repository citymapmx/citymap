import { useEffect } from 'react';
import { scheduleGoogleMapsPreload } from '../lib/googleMapsPreload.js';

// Precarga de Google Maps (M18): baja el script en segundo plano tras
// el primer pintado, para que el mapa abra casi al instante la primera
// vez que se toca. Mismo patrón que useThirdPartyScripts (idle con tope
// de 2 s) y misma condición de activación: nunca durante la selección
// de ciudad, solo cuando el contenido de la ciudad ya está listo.
export default function useGoogleMapsPreload(enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    return scheduleGoogleMapsPreload();
  }, [enabled]);
}

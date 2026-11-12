import { useEffect, useRef } from 'react';
import * as dbService from '../services/dbService.js';
import { useAuthStore } from '../store/useAuthStore.js';
import { useUIStore } from '../store/useUIStore.js';

export function useInAppNotifications() {
  const user = useAuthStore(state => state.user);
  const lastNotifCheckRef = useRef(new Date().toISOString());

  useEffect(() => {
    if (!user) {
      useUIStore.getState().setUnreadNotifCount(0);
      return;
    }

    // Conteo de sin leer al arrancar (para el globito y el punto rojo),
    // no solo cuando se abre la lista.
    let cancelled = false;
    const refreshCount = async () => {
      try {
        const n = await dbService.getUnreadNotificationCount(user.id);
        if (!cancelled) useUIStore.getState().setUnreadNotifCount(n);
      } catch { /* sin red no hay aviso; el próximo sondeo lo reintenta */ }
    };
    refreshCount();

    const interval = setInterval(async () => {
      if (document.hidden) return; // Battery Optimization: Stop polling in background
      try {
        const notifs = await dbService.getUnreadNotifications(user.id, lastNotifCheckRef.current);
        if (notifs && notifs.length > 0) {
          lastNotifCheckRef.current = new Date().toISOString();
          
          // Play iOS-style chime using Web Audio API (no external file needed)
          try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const playNote = (freq, startTime, duration) => {
              const osc = ctx.createOscillator();
              const gain = ctx.createGain();
              osc.connect(gain);
              gain.connect(ctx.destination);
              osc.type = "sine";
              osc.frequency.setValueAtTime(freq, startTime);
              gain.gain.setValueAtTime(0, startTime);
              gain.gain.linearRampToValueAtTime(0.35, startTime + 0.01);
              gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
              osc.start(startTime);
              osc.stop(startTime + duration);
            };
            // iOS "Tri-tone" style: three ascending notes
            playNote(1318.5, ctx.currentTime,        0.18); // E6
            playNote(1567.9, ctx.currentTime + 0.12, 0.18); // G6
            playNote(2093.0, ctx.currentTime + 0.24, 0.32); // C7
          } catch (e) { console.error(e); }
          
          // Show toast for the most recent one
          const latest = notifs[0];
          useUIStore.getState().toast$(latest.title + ': ' + latest.body);
        }
        // El total de sin leer puede cambiar también desde otro lado.
        await refreshCount();
      } catch (err) {
        // ignore network errors on background poll
      }
    }, 15000); // Check every 15 seconds

    return () => { cancelled = true; clearInterval(interval); };
  }, [user]);
}

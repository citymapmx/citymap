import { useEffect } from 'react';
import { App as CapApp } from '@capacitor/app';
import { useUIStore } from '../store/useUIStore.js';
import { useAuthStore } from '../store/useAuthStore.js';
import { sb } from '../lib/supabase.js';

export function useCapacitorHardwareBack() {
  useEffect(() => {
    // 1. Hardware Back Button Listener
    const backListener = CapApp.addListener('backButton', ({ canGoBack }) => {
      const ui = useUIStore.getState();
      
      // A. Close modals
      if (ui.showGallery || ui.showAddBiz || ui.showMenuGallery || ui.showLocPicker || ui.showPlans || ui.claimBiz || ui.showSchedule) {
        useUIStore.setState({ 
          showGallery: false, showAddBiz: false, showMenuGallery: false, 
          showLocPicker: false, showPlans: false, claimBiz: null, showSchedule: false
        });
        return;
      }
      
      // B. If detail view, go back
      const p = window.location.pathname;
      if (p.includes("/lugar/") || p.includes("/evento/") || p.includes("/itinerario/") || p.includes("/plan/")) {
        window.history.back();
        useUIStore.setState({ selected: null, selectedEvent: null });
        return;
      }
      
      // C. If not home, go home (or back)
      if (p !== "/" && !p.startsWith(`/${ui.activeCity}`)) {
        window.history.back();
        return;
      }
      
      // D. Exit app if on home
      CapApp.exitApp();
    });

    // 2. Deep Link Listener for Supabase OAuth Callback
    const appUrlOpenListener = CapApp.addListener('appUrlOpen', async (event) => {
      // Supabase OAuth redirects back to mx.citymap.app://login or https://citymap.mx/login
      if (event.url.includes('citymap.mx') || event.url.includes('mx.citymap.app')) {
        try {
          const { Browser } = await import('@capacitor/browser');
          await Browser.close();
        } catch (e) {}
        const success = await sb.setSessionFromUrl(event.url);
        if (success) {
          // Force reload user session
          const u = await sb.getUser();
          if (u) {
            useAuthStore.setState({ user: u, authChecked: true });
            window.location.reload();
          }
        }
      } else if (event.url.startsWith('https://citymap.mx')) {
        const { Capacitor } = await import('@capacitor/core');
        if (Capacitor.getPlatform() === 'web') return; // Web handles its own URL natively

        const url = new URL(event.url);
        const path = url.pathname + url.search;
        if (path && path !== '/') {
          // On mobile, just replace location to trigger standard app routing/parsing
          window.location.href = path;
        }
      }
    });

    return () => {
      backListener.then(l => l.remove());
      appUrlOpenListener.then(l => l.remove());
    };
  }, []);
}

import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';

/**
 * Syncs native mobile StatusBar color & icons style with the active theme (dark / light).
 */
export function useCapacitorStatusBar(dark) {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const syncStatusBar = async () => {
      try {
        if (dark) {
          await StatusBar.setStyle({ style: Style.Dark }); // White text / icons
          await StatusBar.setBackgroundColor({ color: '#0F172A' });
        } else {
          await StatusBar.setStyle({ style: Style.Light }); // Dark text / icons
          await StatusBar.setBackgroundColor({ color: '#FFFFFF' });
        }
      } catch (e) {
        console.warn('StatusBar sync error:', e);
      }
    };

    syncStatusBar();
  }, [dark]);
}

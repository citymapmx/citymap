import { useCallback, useEffect, useRef, useState } from 'react';
import { watchCompass } from '../lib/compass.js';

export default function useCompass(onHeading) {
  const [status, setStatus] = useState('off');
  const [enabled, setEnabled] = useState(false);
  const requestId = useRef(0);
  const busy = useRef(false);
  useEffect(() => () => { requestId.current += 1; }, []);
  useEffect(() => {
    if (!enabled) return;
    return watchCompass(onHeading, setStatus);
  }, [enabled, onHeading]);

  const toggle = useCallback(async () => {
    if (busy.current) return;
    if (enabled) {
      setEnabled(false);
      setStatus('off');
      return;
    }
    if (!window.isSecureContext || !window.DeviceOrientationEvent) {
      setStatus('unavailable');
      return;
    }
    const id = ++requestId.current;
    busy.current = true;
    setStatus('requesting');
    try {
      // Safari requires this call directly inside a user gesture.
      const permission = typeof window.DeviceOrientationEvent.requestPermission === 'function'
        ? await window.DeviceOrientationEvent.requestPermission(true) : 'granted';
      if (id !== requestId.current) return;
      if (permission !== 'granted') { setStatus('denied'); return; }
      setStatus('waiting');
      setEnabled(true);
    } catch {
      if (id === requestId.current) setStatus('denied');
    } finally {
      busy.current = false;
    }
  }, [enabled]);
  return { status, enabled, toggle };
}

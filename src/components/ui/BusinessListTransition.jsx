import React, { useLayoutEffect, useRef } from 'react';
import { animateBusinessList } from '../../lib/businessListMotion.js';

export default function BusinessListTransition({ transitionKey, ready = true, children, style }) {
  const ref = useRef(null);
  useLayoutEffect(() => {
    if (!ready) return;
    const preference = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const stop = animateBusinessList(ref.current, preference?.matches);
    const onPreference = () => { if (preference.matches) stop(); };
    preference?.addEventListener?.('change', onPreference);
    return () => { stop(); preference?.removeEventListener?.('change', onPreference); };
  }, [transitionKey, ready]);
  return <div ref={ref} style={style}>{children}</div>;
}

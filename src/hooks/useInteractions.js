import { useCallback } from 'react';
import { sb } from '../lib/supabase.js';
import { useUIStore } from '../store/useUIStore.js';

export function useInteractions() {
  const activeCity = useUIStore(s => s.activeCity);
  const toast$ = useUIStore(s => s.toast$);

  const trackEvent = useCallback(async (bizId, type) => {
    try { await sb.post("analytics", { biz_id: bizId, event_type: type, city_slug: activeCity }); } catch { }
  }, [activeCity]);

  const goDir = useCallback((b, e) => {
    if (e) e.stopPropagation();
    trackEvent(b.id, "maps");
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${b.lat},${b.lng}`, "_blank");
  }, [trackEvent]);

  const callPhone = useCallback((b, e) => {
    if (e) e.stopPropagation();
    trackEvent(b.id, "phone");
    window.open(`tel:${b.phone}`);
  }, [trackEvent]);

  const goWhatsApp = useCallback((b, e) => {
    if (e) e.stopPropagation();
    trackEvent(b.id, "whatsapp");
    window.open(`https://wa.me/${(b.whatsapp || b.phone || "").replace(/\\D/g, "")}`, "_blank");
  }, [trackEvent]);

  const goWeb = useCallback((b, e) => {
    if (e) e.stopPropagation();
    trackEvent(b.id, "website");
    window.open(`https://${b.website}`, "_blank");
  }, [trackEvent]);

  const doShare = useCallback((b, e, cleanCityPrefix, createSlug) => {
    if (e) e.stopPropagation();
    const url = `https://citymap.mx/${b.city_slug || activeCity}/${cleanCityPrefix(b.slug || createSlug(b.name), b.city_slug || activeCity)}`;
    if (navigator.share) {
      navigator.share({ title: b.name, url });
    } else {
      navigator.clipboard?.writeText(url);
      toast$("Enlace copiado");
    }
  }, [activeCity, toast$]);

  return { trackEvent, goDir, callPhone, goWhatsApp, goWeb, doShare };
}

// Página de «evento no disponible» (25 nov 2026, Jonathan): un enlace a un
// evento que ya no existe (borrado o slug erróneo) no debe caer en silencio
// en la lista de eventos: abre esta página con el aviso y los próximos
// eventos de la ciudad debajo, igual que la de «ya terminó». La URL se
// queda como está (no se navega a /eventos): Google la sigue teniendo
// indexada y el visitante ve algo útil en vez de una lista sin contexto.
import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUIStore } from '../../store/useUIStore';
import { useDataStore } from '../../store/useDataStore';
import { useTranslation } from '../../hooks/useTranslation.js';
import { getT, CITY_TZ } from '../../lib/constants';
import { getThumbUrl } from '../../lib/utils';
import { eventUrl } from '../../lib/eventUrls';
import { localizedTitle } from '../../lib/i18nContent.js';
import { eventCalendarDay, upcomingEvents, formatEventCardDate } from '../../lib/eventListing';
import { sb } from '../../lib/supabase';
import Icon from '../ui/Icon';
import AppDownloadBadges from '../AppDownloadBadges.jsx';

export default function EventNotFound() {
  const { t, lang } = useTranslation();
  const { eventNotFound, setEventNotFound, setSelectedEvent, activeCity, dark } = useUIStore();
  const cities = useDataStore(s => s.cities);
  const routerNavigate = useNavigate();
  const T = getT(dark);
  const [upcoming, setUpcoming] = useState([]);

  const slug = eventNotFound?.slug || '';
  const urlCity = eventNotFound?.city || '';
  // La ciudad: la de la URL cuando la trae (/evento/:ciudad/:slug); si el
  // enlace es viejo (/evento/<slug-completo>), se deduce del prefijo del
  // slug; si no, la ciudad activa del visitante.
  const effCity = urlCity
    || (cities.find(c => c && slug.startsWith(`${c.slug}-`))?.slug)
    || activeCity
    || '';
  const cityName = cities.find(c => c.slug === effCity)?.name || (effCity ? effCity.charAt(0).toUpperCase() + effCity.slice(1) : '');
  const cityTimeZone = (cities.find(c => c.slug === effCity)?.timezone || CITY_TZ[effCity] || 'America/Mexico_City').split(';')[0];
  const todayLocal = eventCalendarDay(Date.now(), cityTimeZone);

  const exploreEvents = useCallback(() => {
    setEventNotFound(null);
    routerNavigate(effCity ? `/eventos/${effCity}` : '/eventos', { replace: true });
  }, [setEventNotFound, routerNavigate, effCity]);

  useEffect(() => {
    if (!eventNotFound) { setUpcoming([]); return; }
    let cancelled = false;
    sb.get('events', '?select=id,title,title_en,description_en,slug,date,end_date,time,end_time,venue_name,venue_address,lat,lng,city_slug,img_url,img,status,description,event_category,is_recurring,biz_id,price,price_type,currency,website,visibility,active&status=eq.approved&order=date.asc&limit=40')
      .then(rows => { if (!cancelled) setUpcoming(upcomingEvents(Array.isArray(rows) ? rows : [], { city_slug: effCity || 'all' }, todayLocal, 4)); })
      .catch(() => { if (!cancelled) setUpcoming([]); });
    return () => { cancelled = true; };
  }, [eventNotFound, effCity, todayLocal]);

  if (!eventNotFound) return null;

  const openUpcoming = (u) => {
    setEventNotFound(null);
    setSelectedEvent(u);
    routerNavigate(eventUrl(u), { replace: true });
  };

  return (
    <div role="dialog" aria-modal="true" aria-label={t("eventos_no_disponible", "Este evento ya no está disponible")} style={{ position: "fixed", inset: 0, background: T.bg, zIndex: 100000, overflowY: "auto", overflowX: "hidden", WebkitOverflowScrolling: "touch", overscrollBehavior: "contain", outline: "none", fontFamily: "inherit" }}>
      <div style={{ width: "100%", maxWidth: 460, margin: "0 auto", padding: 0, display: "flex", flexDirection: "column", minHeight: "100%" }}>
        <div style={{ width: "100%", display: "flex", justifyContent: "flex-start", alignItems: "center", padding: "calc(env(safe-area-inset-top, 0px) + 12px) 16px 4px" }}>
          <button aria-label={t("eventos_volver", "Volver")} onClick={exploreEvents} style={{ width: 44, height: 44, borderRadius: "50%", background: dark ? "rgba(255,255,255,0.08)" : "#F1F5F9", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}>
            <Icon name="arrow_left" size={24} color={T.text} />
          </button>
        </div>
        <div style={{ padding: "12px 16px 24px" }}>
          <div style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: 16, padding: 16, margin: '0 0 20px 0', boxShadow: T.shadow }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: T.text, marginBottom: 4 }}>{t("eventos_no_disponible", "Este evento ya no está disponible")}</div>
            <div style={{ fontSize: 14, color: T.sub, marginBottom: 12 }}>{t("eventos_no_disponible_texto", "Es posible que se haya eliminado o que el enlace esté incompleto.")} {t("eventos_mas_cosas", "Pero hay más cosas pasando")}{cityName ? <> {t("eventos_en", "en")} {cityName}</> : ''}. {t("eventos_explora_proximos", "Explora los próximos eventos.")}</div>
            <button onClick={exploreEvents} className="press" style={{ background: T.green, color: dark ? '#18181B' : '#FFFFFF', border: 'none', borderRadius: 9999, padding: '10px 18px', fontSize: 15, fontWeight: 800, cursor: 'pointer' }}>{t("eventos_explora_nuevos", "Explora nuevos eventos")}</button>
          </div>
          {upcoming.length > 0 && (
            <div style={{ margin: '0 0 24px 0' }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: T.text, marginBottom: 4 }}>{t("eventos_proximos", "Próximos eventos")}{cityName ? <> {t("eventos_en", "en")} {cityName}</> : ''}</div>
              {upcoming.map(u => {
                const thumb = u.img_url || u.img;
                return (
                  <div key={u.id} onClick={() => openUpcoming(u)} className="press" style={{ display: 'flex', gap: 12, padding: '12px 0', borderTop: `1px solid ${T.border}`, cursor: 'pointer', alignItems: 'center' }}>
                    {thumb ? (
                      <img src={getThumbUrl(thumb, 200)} alt="" style={{ width: 56, height: 56, borderRadius: 12, objectFit: 'cover', backgroundColor: T.border, flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: 56, height: 56, borderRadius: 12, background: T.border, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Icon name="calendar" size={24} color={T.sub} />
                      </div>
                    )}
                    <div style={{ flex: 1, textAlign: 'left', minWidth: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 800, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{localizedTitle(u, lang)}</div>
                      <div style={{ fontSize: 13, color: T.sub }}>{formatEventCardDate(u, { today: todayLocal, lang })}{u.venue_name ? ` · ${u.venue_name}` : ''}</div>
                    </div>
                    <Icon name="chevron_right" size={16} color={T.sub} />
                  </div>
                );
              })}
              <button onClick={exploreEvents} className="press" style={{ width: '100%', marginTop: 16, minHeight: 48, background: T.green, color: dark ? '#18181B' : '#FFFFFF', border: 'none', borderRadius: 12, fontSize: 16, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, cursor: 'pointer', fontFamily: 'inherit' }}>{t("eventos_ver_todos", "Ver todos los eventos")}</button>
            </div>
          )}
          <AppDownloadBadges />
        </div>
      </div>
    </div>
  );
}

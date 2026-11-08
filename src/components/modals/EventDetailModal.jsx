import { useEffect, useRef, useCallback, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { m, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useUIStore } from '../../store/useUIStore';
import { getT, FONT_BIZ, CITY_TZ } from '../../lib/constants';
import { createSlug, getThumbUrl } from '../../lib/utils';
import { eventCalendarDay, isPastEvent, upcomingEvents, formatEventCardDate } from '../../lib/eventListing';
import { sb } from '../../lib/supabase';
import Icon from '../ui/Icon';
import EventPoster from '../detail/EventPoster.jsx';
import EventInformation from '../detail/EventInformation.jsx';
import PrivateEventRsvp from '../detail/PrivateEventRsvp.jsx';
import PrivateEventChat from '../detail/PrivateEventChat.jsx';
import { isPrivateEvent } from '../../lib/privateEvents';

import { useAppContext } from '../../context/AppContext';
import { useDataStore } from '../../store/useDataStore';

export default function EventDetailModal() {
  const { selectedEvent, setSelectedEvent, activeCity, dark, toast$ } = useUIStore();
  const { handleCardTap } = useAppContext();
  const mapPins = useDataStore(s => s.mapPins);
  const cities = useDataStore(s => s.cities);
  const [upcoming, setUpcoming] = useState([]);
  const evCitySlug = String(selectedEvent?.city_slug || '').split(',').map(s => s.trim()).filter(Boolean)[0] || '';
  const cityTimeZone = (cities.find(c => c.slug === evCitySlug)?.timezone || CITY_TZ[evCitySlug] || 'America/Mexico_City').split(';')[0];
  const todayLocal = eventCalendarDay(Date.now(), cityTimeZone);
  const isPast = selectedEvent ? isPastEvent(selectedEvent, todayLocal) : false;
  const cityName = cities.find(c => c.slug === evCitySlug)?.name || (evCitySlug ? evCitySlug.charAt(0).toUpperCase() + evCitySlug.slice(1) : '');
  const T = getT(dark);
  const reduceMotion = useReducedMotion();
  const location = useLocation();
  const routerNavigate = useNavigate();
  const exploreEvents = useCallback(() => {
    setSelectedEvent(null);
    routerNavigate(evCitySlug ? `/eventos/${evCitySlug}` : '/eventos', { replace: true });
  }, [setSelectedEvent, routerNavigate, evCitySlug]);
  const shareEvent = useCallback(() => {
    const ev = selectedEvent;
    if (!ev) return;
    const evUrl = `${window.location.origin}/evento/${createSlug(ev.title)}_${ev.id}`;
    if (navigator.share) navigator.share({ title: ev.title, text: 'Échale un vistazo a este evento:', url: evUrl });
    else { navigator.clipboard?.writeText(evUrl); toast$('Enlace copiado'); }
  }, [selectedEvent, toast$]);
  const dialog = useRef(null);
  const closeEvent = useCallback(() => {
    setSelectedEvent(null);
    if (location.state?.background) routerNavigate(-1);
    else routerNavigate(activeCity ? `/eventos/${activeCity}` : '/eventos', { replace:true });
  }, [setSelectedEvent, routerNavigate, location.state?.background, activeCity]);
  const closeRef = useRef(closeEvent);
  closeRef.current = closeEvent;
  useEffect(() => {
    if (!selectedEvent?.id) return;
    dialog.current?.scrollTo(0, 0);
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const frame = requestAnimationFrame(() => dialog.current?.focus({ preventScroll:true }));
    const onKey = e => { if (e.key === 'Escape') { e.preventDefault(); closeRef.current(); } };
    document.addEventListener('keydown', onKey);
    return () => {
      cancelAnimationFrame(frame);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKey);
      if (previousFocus?.isConnected) previousFocus.focus?.({ preventScroll:true });
    };
  }, [selectedEvent?.id]);
  useEffect(() => {
    if (!selectedEvent?.id || !isPast) { setUpcoming([]); return; }
    let cancelled = false;
    sb.get('events', '?select=id,title,slug,date,end_date,time,venue_name,venue_address,city_slug,img_url,img,status,active&status=eq.approved&order=date.asc&limit=40')
      .then(rows => { if (!cancelled) setUpcoming(upcomingEvents(Array.isArray(rows) ? rows : [], selectedEvent, todayLocal, 4)); })
      .catch(() => { if (!cancelled) setUpcoming([]); });
    return () => { cancelled = true; };
  }, [selectedEvent, isPast, todayLocal]);

  return (
    <AnimatePresence>
      {selectedEvent && (() => {
        const ev = selectedEvent;
        const associatedBiz = ev.biz_id ? mapPins.find(b => b.id === ev.biz_id) : null;
        const imgSrc = ev.img_url || ev.img;
        
        return (
          <m.div
            key="event-modal"
            ref={dialog} role="dialog" aria-modal="true" aria-label={ev.title || "Evento"} tabIndex={-1}
            initial={false}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: "tween", duration: reduceMotion ? 0 : 0.15 }}
            style={{ position: "fixed", inset: 0, background: T.bg, zIndex: 100000, overflowY: "auto", WebkitOverflowScrolling: "touch", overscrollBehavior:"contain", outline:"none", fontFamily: "inherit" }}
          >
            <div style={{ width: "100%", maxWidth: 460, margin: "0 auto", padding: 0, display: "flex", flexDirection: "column", minHeight: "100%" }}>
              
              {/* --- HERO IMAGE SECTION (solo eventos vigentes; los pasados van sin foto grande) --- */}
              {isPast ? (
                <div style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "calc(env(safe-area-inset-top, 0px) + 12px) 16px 4px" }}>
                  <button aria-label="Volver" onClick={(e) => { e.stopPropagation(); closeEvent(); }} style={{ width: 40, height: 40, borderRadius: "50%", background: dark ? "rgba(255,255,255,0.08)" : "#F1F5F9", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}>
                    <Icon name="arrow_left" size={22} color={T.text} />
                  </button>
                  <button aria-label="Compartir evento" onClick={(e) => { e.stopPropagation(); shareEvent(); }} style={{ width: 40, height: 40, borderRadius: "50%", background: dark ? "rgba(255,255,255,0.08)" : "#F1F5F9", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}>
                    <Icon name="share" size={20} color={T.text} />
                  </button>
                </div>
              ) : (
              <div style={{ position: "relative", width: "100%", background: "transparent", overflow: "hidden" }}>
                {imgSrc ? (
                  <EventPoster key={imgSrc} src={imgSrc} alt={ev.title || ""} />
                ) : (
                  <div style={{ width: "100%", height: "100%", minHeight: 200, display: "flex", alignItems: "center", justifyContent: "center", background: "transparent" }}>
                    <Icon name="calendar" size={48} color={T.sub} />
                  </div>
                )}
                
                {/* Floating Back Button */}
                <button aria-label="Volver" onClick={(e) => { e.stopPropagation(); closeEvent(); }} style={{ position: "absolute", top: "calc(env(safe-area-inset-top, 0px) + 16px)", left: 16, width: 40, height: 40, borderRadius: "50%", background: "rgba(0,0,0,0.35)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10, padding: 0 }}>
                  <Icon name="arrow_left" size={22} color="#fff" style={{ filter: "drop-shadow(0px 1px 2px rgba(0,0,0,0.8))" }} />
                </button>
                
                {/* Floating Share Button */}
                <button aria-label="Compartir evento" onClick={(e) => { e.stopPropagation(); shareEvent(); }} style={{ position: "absolute", top: "calc(env(safe-area-inset-top, 0px) + 16px)", right: 16, width: 40, height: 40, borderRadius: "50%", background: "rgba(0,0,0,0.35)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10, padding: 0 }}>
                  <Icon name="share" size={20} color="#fff" style={{ filter: "drop-shadow(0px 1px 2px rgba(0,0,0,0.8))" }} />
                </button>
              </div>
              )}

              {/* --- CONTENT CARD (No overlap) --- */}
              <div style={{ position: "relative", zIndex: 2, background: T.bg, padding: "20px 20px 40px", flex: 1, display: "flex", flexDirection: "column" }}>

                {/* --- EVENTO PASADO: el aviso va primero, antes que el título --- */}
                {isPast && (
                  <div style={{ background: dark ? 'rgba(255,255,255,0.06)' : '#FEF3C7', border: `1px solid ${dark ? 'rgba(255,255,255,0.12)' : '#FDE68A'}`, borderRadius: 16, padding: 16, margin: '0 0 20px 0' }}>
                    <div style={{ fontSize: 16, fontWeight: 800, color: T.text, marginBottom: 4 }}>Este evento ya terminó</div>
                    <div style={{ fontSize: 14, color: T.sub, marginBottom: 12 }}>Pero hay más cosas pasando{cityName ? ` en ${cityName}` : ''}. Explora los próximos eventos.</div>
                    <button onClick={exploreEvents} className="press" style={{ background: '#1A7A5E', color: '#fff', border: 'none', borderRadius: 9999, padding: '10px 18px', fontSize: 15, fontWeight: 800, cursor: 'pointer' }}>Explora nuevos eventos</button>
                  </div>
                )}

                <h1 style={{ fontFamily: FONT_BIZ, fontSize: 26, fontWeight: 900, color: T.text, lineHeight: 1.15, marginTop: 0, marginBottom: (ev.event_category || ev.category) ? 10 : 14, textAlign: "left", letterSpacing: "-0.5px" }}>{ev.title}</h1>
                
                {(ev.event_category || ev.category) && (
                  <div style={{ display: "flex", marginBottom: 8 }}>
                    <span style={{
                      fontSize: 12,
                      fontWeight: 800,
                      padding: "4px 14px",
                      borderRadius: 9999,
                      background: dark ? "rgba(255,255,255,0.08)" : "#F1F5F9",
                      color: dark ? "#FFFFFF" : "#0F172A"
                    }}>
                      {ev.event_category || ev.category}
                    </span>
                  </div>
                )}

                {/* --- EVENTO PASADO: próximos eventos antes que los datos viejos --- */}
                {isPast && upcoming.length > 0 && (
                  <div style={{ margin: '0 0 24px 0' }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: T.text, marginBottom: 4 }}>Próximos eventos{cityName ? ` en ${cityName}` : ''}</div>
                    {upcoming.map(u => {
                      const thumb = u.img_url || u.img;
                      return (
                        <div key={u.id} onClick={() => setSelectedEvent(u)} className="press" style={{ display: 'flex', gap: 12, padding: '12px 0', borderTop: `1px solid ${T.border}`, cursor: 'pointer', alignItems: 'center' }}>
                          {thumb ? (
                            <img src={getThumbUrl(thumb, 200)} alt="" style={{ width: 56, height: 56, borderRadius: 12, objectFit: 'cover', backgroundColor: T.border, flexShrink: 0 }} />
                          ) : (
                            <div style={{ width: 56, height: 56, borderRadius: 12, background: T.border, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <Icon name="calendar" size={24} color={T.sub} />
                            </div>
                          )}
                          <div style={{ flex: 1, textAlign: 'left', minWidth: 0 }}>
                            <div style={{ fontSize: 15, fontWeight: 800, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.title}</div>
                            <div style={{ fontSize: 13, color: T.sub }}>{formatEventCardDate(u, { today: todayLocal, lang: 'es' })}{u.venue_name ? ` · ${u.venue_name}` : ''}</div>
                          </div>
                          <Icon name="chevron_right" size={16} color={T.sub} />
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* --- Datos del evento (en los pasados van abajo y sin entradas, que ya no se pueden comprar) --- */}
                <EventInformation event={ev} associatedBiz={associatedBiz} T={T} hideTickets={isPast} />

                {/* --- Evento privado: confirmaciones (RSVP) y chat --- */}
                {isPrivateEvent(ev) && !isPast && <PrivateEventRsvp event={ev} T={T} dark={dark} toast$={toast$} />}
                {isPrivateEvent(ev) && !isPast && <PrivateEventChat event={ev} T={T} dark={dark} toast$={toast$} />}

                {/* --- ASOCIADO CON --- */}
                {associatedBiz && (
                  <div 
                    onClick={() => {
                      setSelectedEvent(null);
                      setTimeout(() => handleCardTap(associatedBiz), 300);
                    }}
                    className="press"
                    style={{ 
                      display: "flex", alignItems: "center", gap: 12, padding: "16px 0", 
                      borderTop: `1px solid ${T.border}`, borderBottom: `1px solid ${T.border}`, 
                      margin: "0 0 24px 0", cursor: "pointer"
                    }}
                  >
                    {associatedBiz.logo_url || associatedBiz.photos?.[0]?.url ? (
                      <img src={getThumbUrl(associatedBiz.logo_url || associatedBiz.photos[0].url, 200)} alt={associatedBiz.name} style={{ width: 56, height: 56, borderRadius: "50%", objectFit: "cover", backgroundColor: "#fff", border: `1px solid ${T.border}` }} />
                    ) : (
                      <div style={{ width: 56, height: 56, borderRadius: "50%", background: T.border, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Icon name="store" size={24} color={T.sub} />
                      </div>
                    )}
                    <div style={{ flex: 1, textAlign: "left" }}>
                      <div style={{ fontSize: 16, fontWeight: 800, color: T.text, marginBottom: 4 }}>Ofrecido por {associatedBiz.name}</div>
                      <div style={{ fontSize: 13, color: T.sub, display: "flex", alignItems: "center", gap: 4 }}>
                        Ver perfil del negocio <Icon name="chevron_right" size={14} color={T.sub} />
                      </div>
                    </div>
                  </div>
                )}
                


              </div>
            </div>
          </m.div>
        );
      })()}
    </AnimatePresence>
  );
}

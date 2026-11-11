import { useEffect, useRef, useCallback, useState, lazy, Suspense } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { m, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useUIStore } from '../../store/useUIStore';
import { getT, FONT_BIZ, CITY_TZ } from '../../lib/constants';
import { getThumbUrl } from '../../lib/utils';
import { eventUrl } from '../../lib/eventUrls';
import { eventCalendarDay, isPastEvent, upcomingEvents, formatEventCardDate } from '../../lib/eventListing';
import { sb, cloudUpload } from '../../lib/supabase';
import { EVENT_IMAGE_OPTIMIZE, resolveOptimizeOptions, shouldOptimizeImage } from '../../lib/imageOptimize.js';
import Icon from '../ui/Icon';
import EventPoster from '../detail/EventPoster.jsx';
import EventInformation from '../detail/EventInformation.jsx';
import PrivateEventRsvp from '../detail/PrivateEventRsvp.jsx';
import PrivateEventChat from '../detail/PrivateEventChat.jsx';
import { isPrivateEvent, privateEventUrl, summarizeRsvps, heroDateParts } from '../../lib/privateEvents';
import { getEventPrice, getEventPriceAmount, getEventMusicQuery, buildItunesSearchUrl } from '../../lib/eventDetails.js';
import { SPRING_UI } from '../../lib/spring.js';
import { useAuthStore } from '../../store/useAuthStore';
import { useTranslation } from '../../hooks/useTranslation.js';
import { localizedTitle, localizedDescription } from '../../lib/i18nContent.js';

// Rediseño claro estilo Luma (solo eventos privados vigentes en modo claro;
// el modo oscuro queda como estaba). El tinte del fondo vive en UNA sola
// constante: cambiar LUMA_TINT_TOP cambia todo el degradado del modal.
const LUMA_TINT_TOP = '#E7F1EA';

// Rojo oficial de Apple Music: FONDO de la tarjeta «Música del artista»
// (colores invertidos, PR #195: la tarjeta es un bloque rosa para que
// resalte y no se vea igual a todo lo demás; los botones y el distintivo
// van en negro y los textos en blanco, en modo claro y en modo oscuro).
const APPLE_MUSIC_RED = '#FA2D48';
const APPLE_MUSIC_BLACK = '#000000';

import { useAppContext } from '../../context/AppContext';
import { useDataStore } from '../../store/useDataStore';

// Tarjeta para compartir el evento como imagen (PR #152): la misma hoja
// centrada de los negocios, con los 5 estilos según el tipo de evento.
const EventShareCardSheet = lazy(() => import('../EventShareCardSheet.jsx'));

export default function EventDetailModal() {
  const { t, lang } = useTranslation();
  const { selectedEvent, setSelectedEvent, activeCity, dark, toast$ } = useUIStore();
  const { user } = useAuthStore();
  const { handleCardTap } = useAppContext();
  const mapPins = useDataStore(s => s.mapPins);
  const cities = useDataStore(s => s.cities);
  const [upcoming, setUpcoming] = useState([]);
  // Hoja para compartir el evento como imagen (PR #152).
  const [showShareCard, setShowShareCard] = useState(false);
  // Pestañas del evento privado: chat (default), detalles, invitados.
  const [privateTab, setPrivateTab] = useState('chat');
  const [chatCount, setChatCount] = useState(0);
  const [guestCount, setGuestCount] = useState(0);
  // Foto del evento (anfitrión del privado): subir y guardar.
  const [photoBusy, setPhotoBusy] = useState(false);
  const photoInputRef = useRef(null);

  // El anfitrión de un evento privado puede cambiar o agregar la foto.
  const changePhoto = async (file) => {
    const ev = selectedEvent;
    if (!file || !ev?.id || photoBusy) return;
    setPhotoBusy(true);
    try {
      let fileToUpload = file;
      const opt = resolveOptimizeOptions({ optimize: EVENT_IMAGE_OPTIMIZE });
      if (shouldOptimizeImage(file, opt)) {
        try {
          const imageCompression = (await import('browser-image-compression')).default;
          const compressed = await imageCompression(file, {
            maxSizeMB: opt.targetMB,
            maxWidthOrHeight: opt.maxWidthOrHeight,
            useWebWorker: true,
            initialQuality: opt.initialQuality,
            fileType: 'image/webp',
          });
          const newName = file.name.replace(/\.[^/.]+$/, '') + '.webp';
          fileToUpload = new File([compressed], newName, { type: 'image/webp' });
        } catch (e) { console.warn('Compression error, uploading original', e); }
      }
      const url = await cloudUpload(fileToUpload);
      await sb.patch('events', ev.id, { img_url: url });
      setSelectedEvent({ ...ev, img_url: url });
      toast$(t("eventos_foto_actualizada", "Foto actualizada"));
    } catch (err) {
      toast$(`${t("eventos_foto_error", "No se pudo cambiar la foto:")} ${err.message}`);
    } finally {
      setPhotoBusy(false);
    }
  };
  const evCitySlug = String(selectedEvent?.city_slug || '').split(',').map(s => s.trim()).filter(Boolean)[0] || '';
  const cityTimeZone = (cities.find(c => c.slug === evCitySlug)?.timezone || CITY_TZ[evCitySlug] || 'America/Mexico_City').split(';')[0];
  const todayLocal = eventCalendarDay(Date.now(), cityTimeZone);
  const isPast = selectedEvent ? isPastEvent(selectedEvent, todayLocal) : false;
  // Reproductor de música: solo conciertos vigentes y públicos.
  const musicQuery = selectedEvent && !isPast && !isPrivateEvent(selectedEvent) ? getEventMusicQuery(selectedEvent) : null;
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
    const evUrl = eventUrl(ev, window.location.origin);
    if (navigator.share) navigator.share({ title: localizedTitle(ev, lang), text: t("eventos_compartir_texto", "Échale un vistazo a este evento:"), url: evUrl });
    else { navigator.clipboard?.writeText(evUrl); toast$(t("eventos_enlace_copiado", "Enlace copiado")); }
  }, [selectedEvent, toast$, t, lang]);
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
    setPrivateTab('chat');
    setChatCount(0);
    setGuestCount(0);
    // Contadores de las píldoras desde que se abre (los hijos solo
    // reportan cuando su pestaña está montada).
    if (isPrivateEvent(selectedEvent) && !isPast) {
      sb.count('event_messages', `?event_id=eq.${selectedEvent.id}`)
        .then(n => { if (typeof n === 'number') setChatCount(n); })
        .catch(() => {});
      sb.get('event_rsvps', `?event_id=eq.${selectedEvent.id}`)
        .then(rows => { if (Array.isArray(rows)) setGuestCount(summarizeRsvps(rows).guests); })
        .catch(() => {});
    }
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEvent?.id]);
  useEffect(() => {
    if (!selectedEvent?.id) { setUpcoming([]); return; }
    let cancelled = false;
    sb.get('events', '?select=id,title,title_en,description_en,slug,date,end_date,time,end_time,venue_name,venue_address,lat,lng,city_slug,img_url,img,status,description,event_category,biz_id,price,price_type,website,visibility,active&status=eq.approved&order=date.asc&limit=40')
      .then(rows => { if (!cancelled) setUpcoming(upcomingEvents(Array.isArray(rows) ? rows : [], selectedEvent, todayLocal, 4)); })
      .catch(() => { if (!cancelled) setUpcoming([]); });
    return () => { cancelled = true; };
  }, [selectedEvent, todayLocal]);

  // Música del artista: adelantos de 30 s desde iTunes (gratis, sin clave ni endpoint).
  const [musicTracks, setMusicTracks] = useState(null);
  const [playingTrackId, setPlayingTrackId] = useState(null);
  const musicAudioRef = useRef(null);
  useEffect(() => {
    if (!musicQuery) { setMusicTracks(null); return; }
    let cancelled = false;
    setMusicTracks(null);
    fetch(buildItunesSearchUrl(musicQuery, 5))
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (cancelled || !d) return;
        setMusicTracks((d.results || []).filter(t => t.previewUrl).map(t => ({
          id: t.trackId,
          name: t.trackName,
          artist: t.artistName,
          artwork: t.artworkUrl100,
          preview: t.previewUrl,
          url: t.trackViewUrl,
        })));
      })
      .catch(() => { if (!cancelled) setMusicTracks([]); });
    return () => {
      cancelled = true;
      if (musicAudioRef.current) { musicAudioRef.current.pause(); musicAudioRef.current = null; }
      setPlayingTrackId(null);
    };
  }, [musicQuery]);
  const toggleMusicTrack = (track) => {
    if (playingTrackId === track.id) {
      musicAudioRef.current?.pause();
      setPlayingTrackId(null);
      return;
    }
    musicAudioRef.current?.pause();
    const audio = new Audio(track.preview);
    audio.onended = () => setPlayingTrackId(null);
    musicAudioRef.current = audio;
    setPlayingTrackId(track.id);
    audio.play().catch(() => setPlayingTrackId(null));
  };

  return (
    <AnimatePresence>
      {selectedEvent && (() => {
        const ev = selectedEvent;
        // Título/descripción localizados (fase 2): en EN se muestra el
        // campo `_en` cuando existe; si no, el español. El slug de la
        // URL y la búsqueda de música siguen con el título original.
        const displayTitle = localizedTitle(ev, lang);
        const displayDescription = localizedDescription(ev, lang);
        // EventInformation muestra la descripción: recibe la copia con
        // los campos ya localizados (el resto de campos no cambia).
        const evLocalized = { ...ev, title: displayTitle, description: displayDescription };
        const associatedBiz = ev.biz_id ? mapPins.find(b => b.id === ev.biz_id) : null;
        const imgSrc = ev.img_url || ev.img;
        const isHost = Boolean(user?.id && ev.user_id && user.id === ev.user_id);
        // Rediseño Luma en claro: solo privados vigentes en modo claro.
        const luma = isPrivateEvent(ev) && !isPast && !dark;
        // La foto del héroe va completa, sin recorte: el título y el
        // lugar ya no van superpuestos sobre la foto con degradado,
        // sino debajo de la imagen, en la tarjeta de contenido (la
        // fecha se queda como está, en Cuándo). Los eventos pasados
        // van sin foto grande, como antes.
        const heroDate = luma ? heroDateParts(ev.date) : null;
        // Fila superior (solo públicos): categoría en mayúsculas a la
        // izquierda y el precio a la derecha, sin aspecto de botón. El
        // precio se quita de la tarjeta de datos de abajo.
        const price = getEventPrice(ev);
        const priceAmount = getEventPriceAmount(ev);
        const topPriceLabel = !isPrivateEvent(ev) && !isPast && price ? (price.free ? t("eventos_entrada_gratuita", "Entrada gratuita") : (priceAmount ? `${t("eventos_boletos_desde", "Boletos desde:")} ${priceAmount}` : null)) : null;
        const category = ev.event_category || ev.category;
        const showTopRow = !isPrivateEvent(ev) && Boolean(category || topPriceLabel);

        return (
          <m.div
            key="event-modal"
            ref={dialog} role="dialog" aria-modal="true" aria-label={displayTitle || "Evento"} tabIndex={-1}
            initial={reduceMotion ? false : { opacity: 0, y: 28, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 28, scale: 0.985 }}
            transition={reduceMotion ? { type: "tween", duration: 0 } : SPRING_UI}
            style={{ position: "fixed", inset: 0, background: luma ? `linear-gradient(180deg, ${LUMA_TINT_TOP} 0%, #F7FAF8 220px, #FFFFFF 420px)` : T.bg, zIndex: 100000, overflowY: "auto", overflowX: "hidden", WebkitOverflowScrolling: "touch", overscrollBehavior:"contain", outline:"none", fontFamily: "inherit" }}
          >
            <div style={{ width: "100%", maxWidth: 460, margin: "0 auto", padding: 0, display: "flex", flexDirection: "column", minHeight: "100%" }}>
              
              {/* --- HERO IMAGE SECTION (solo eventos vigentes; los pasados van sin foto grande) --- */}
              {isPast ? (
                <div style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "calc(env(safe-area-inset-top, 0px) + 12px) 16px 4px" }}>
                  <button aria-label={t("eventos_volver", "Volver")} onClick={(e) => { e.stopPropagation(); closeEvent(); }} style={{ width: 40, height: 40, borderRadius: "50%", background: dark ? "rgba(255,255,255,0.08)" : "#F1F5F9", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}>
                    <Icon name="arrow_left" size={22} color={T.text} />
                  </button>
                  <button aria-label={t("eventos_compartir_evento", "Compartir evento")} onClick={(e) => { e.stopPropagation(); setShowShareCard(true); }} style={{ width: 40, height: 40, borderRadius: "50%", background: dark ? "rgba(255,255,255,0.08)" : "#F1F5F9", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}>
                    <Icon name="share" size={20} color={T.text} />
                  </button>
                </div>
              ) : (
              <div style={{ position: "relative", width: "100%", background: "transparent" }}>
                {/* Póster completo, sin recorte: la imagen va a ancho
                    completo con su altura natural y nada tapa su pie. */}
                {imgSrc ? (
                  <EventPoster key={imgSrc} src={imgSrc} alt={displayTitle || ""} dark={dark} />
                ) : (
                  <div style={{ width: "100%", minHeight: 200, display: "flex", alignItems: "center", justifyContent: "center", background: dark ? "#232326" : "#111", borderBottom: dark ? "1px solid #3F3F46" : "none", paddingTop: 44 }}>
                    <Icon name="calendar" size={44} color={dark ? "#71717A" : "rgba(255,255,255,0.55)"} />
                  </div>
                )}

                {/* Floating Back Button */}
                <button aria-label={t("eventos_volver", "Volver")} onClick={(e) => { e.stopPropagation(); closeEvent(); }} style={{ position: "absolute", top: "calc(env(safe-area-inset-top, 0px) + 16px)", left: 16, width: 40, height: 40, borderRadius: "50%", background: "rgba(0,0,0,0.35)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10, padding: 0 }}>
                  <Icon name="arrow_left" size={22} color="#fff" style={{ filter: "drop-shadow(0px 1px 2px rgba(0,0,0,0.8))" }} />
                </button>
                
                {/* Floating Share Button */}
                <button aria-label={t("eventos_compartir_evento", "Compartir evento")} onClick={(e) => { e.stopPropagation(); setShowShareCard(true); }} style={{ position: "absolute", top: "calc(env(safe-area-inset-top, 0px) + 16px)", right: 16, width: 40, height: 40, borderRadius: "50%", background: "rgba(0,0,0,0.35)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10, padding: 0 }}>
                  <Icon name="share" size={20} color="#fff" style={{ filter: "drop-shadow(0px 1px 2px rgba(0,0,0,0.8))" }} />
                </button>

                {/* El anfitrión del evento privado puede cambiar/agregar la foto */}
                {isPrivateEvent(ev) && isHost && (
                  <>
                    <input
                      ref={photoInputRef}
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) changePhoto(f); }}
                    />
                    <button
                      aria-label={imgSrc ? t("eventos_cambiar_foto_aria", "Cambiar foto del evento") : t("eventos_agregar_foto_aria", "Agregar foto al evento")}
                      onClick={() => photoInputRef.current?.click()}
                      disabled={photoBusy}
                      style={{ position: 'absolute', bottom: 12, right: 12, zIndex: 10, display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 9999, border: '1px solid rgba(255,255,255,0.35)', background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', color: '#FFFFFF', fontSize: 13, fontWeight: 800, fontFamily: 'inherit', cursor: 'pointer', opacity: photoBusy ? 0.6 : 1, boxShadow: '0 4px 14px rgba(0,0,0,0.25)' }}
                    >
                      <Icon name="camera" size={16} color="#fff" />
                      {photoBusy ? t("eventos_subiendo", "Subiendo…") : (imgSrc ? t("eventos_cambiar_foto", "Cambiar foto") : t("eventos_agregar_foto", "Agregar foto"))}
                    </button>
                  </>
                )}
              </div>
              )}

              {/* --- CONTENT CARD (No overlap) --- */}
              <div style={{ position: "relative", zIndex: 2, background: luma ? "transparent" : T.bg, padding: "16px 16px 32px", flex: 1, display: "flex", flexDirection: "column" }}>

                {/* Cabecera bajo la foto: la píldora de fecha (solo
                    privados en claro) y el título grande. El recinto
                    ya no va aquí: va en la tarjeta de fecha/lugar,
                    junto a la dirección (EventInformation). */}
                <div style={{ marginBottom: showTopRow ? 8 : 12 }}>
                  {!isPast && heroDate && (
                    <span style={{ display: "inline-block", fontSize: 12, fontWeight: 800, letterSpacing: "0.4px", padding: "6px 10px", borderRadius: 9999, marginBottom: 10, background: dark ? "rgba(255,255,255,0.08)" : "rgba(15,26,20,0.06)", color: T.text, border: `1px solid ${T.border}` }}>
                      {heroDate.dia} {heroDate.num} {heroDate.mes} {heroDate.year}
                    </span>
                  )}
                  <h1 style={{ fontFamily: FONT_BIZ, fontSize: isPast ? 24 : 30, fontWeight: 900, color: T.text, lineHeight: isPast ? 1.15 : 1.05, marginTop: 0, marginBottom: 0, textAlign: "left", letterSpacing: "-0.5px" }}>{displayTitle}</h1>
                </div>

                {/* Fila superior: categoría en mayúsculas y precio, sin botón. */}
                {showTopRow && (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
                    {category && (
                      <span style={{ fontSize: 15, fontWeight: 800, letterSpacing: 0.5, textTransform: "uppercase", color: T.text, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {category}
                      </span>
                    )}
                    {topPriceLabel && (
                      <span style={{ fontSize: 15, fontWeight: 800, letterSpacing: 0.5, textTransform: "uppercase", color: T.text, flexShrink: 0, whiteSpace: "nowrap", textAlign: "right" }}>
                        {topPriceLabel}
                      </span>
                    )}
                  </div>
                )}

                {/* --- EVENTO PASADO: el aviso va después del nombre y la categoría --- */}
                {isPast && (
                  <div style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: 16, padding: 16, margin: '0 0 20px 0', boxShadow: T.shadow }}>
                    <div style={{ fontSize: 16, fontWeight: 800, color: T.text, marginBottom: 4 }}>{t("eventos_ya_termino", "Este evento ya terminó")}</div>
                    <div style={{ fontSize: 14, color: T.sub, marginBottom: 12 }}>{t("eventos_mas_cosas", "Pero hay más cosas pasando")}{cityName ? <> {t("eventos_en", "en")} {cityName}</> : ''}. {t("eventos_explora_proximos", "Explora los próximos eventos.")}</div>
                    <button onClick={exploreEvents} className="press" style={{ background: T.green, color: dark ? '#18181B' : '#FFFFFF', border: 'none', borderRadius: 9999, padding: '10px 18px', fontSize: 15, fontWeight: 800, cursor: 'pointer' }}>{t("eventos_explora_nuevos", "Explora nuevos eventos")}</button>
                  </div>
                )}

                {/* --- EVENTO PASADO: próximos eventos antes que los datos viejos --- */}
                {isPast && upcoming.length > 0 && (
                  <div style={{ margin: '0 0 24px 0' }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: T.text, marginBottom: 4 }}>{t("eventos_proximos", "Próximos eventos")}{cityName ? <> {t("eventos_en", "en")} {cityName}</> : ''}</div>
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

                {/* --- Evento privado: pestañas Chat / Detalles / Invitados --- */}
                {isPrivateEvent(ev) && !isPast ? (
                  <>
                    <div style={{ display: 'flex', gap: 4, background: luma ? '#FFFFFF' : (dark ? 'rgba(255,255,255,0.06)' : '#F1F5F9'), border: luma ? '1px solid #E5E7EB' : 'none', boxShadow: luma ? '0 4px 16px rgba(15,23,42,0.06)' : 'none', borderRadius: 9999, padding: 4, margin: '0 0 14px 0', minWidth: 0 }}>
                      {[
                        { key: 'chat', label: t("eventos_tab_chat", "Chat del evento"), count: chatCount },
                        { key: 'detalles', label: t("eventos_tab_detalles", "Detalles"), count: 0 },
                        { key: 'invitados', label: t("eventos_tab_invitados", "Invitados"), count: guestCount },
                      ].map(tab => {
                        const active = privateTab === tab.key;
                        return (
                          <button
                            key={tab.key}
                            onClick={() => setPrivateTab(tab.key)}
                            style={{
                              flex: '1 1 auto', minWidth: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                              padding: '8px 6px', borderRadius: 9999, border: 'none', cursor: 'pointer',
                              background: active ? T.green : 'transparent',
                              color: active ? (dark ? '#18181B' : '#FFFFFF') : T.text,
                              fontSize: 13, fontWeight: 800, fontFamily: 'inherit', whiteSpace: 'nowrap',
                            }}
                          >
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>{tab.label}</span>
                            {tab.count > 0 && (
                              <span style={{ flexShrink: 0, fontSize: 11, fontWeight: 800, padding: '1px 7px', borderRadius: 9999, background: active ? 'rgba(255,255,255,0.35)' : T.green, color: '#FFFFFF' }}>{tab.count}</span>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {privateTab === 'chat' && <PrivateEventChat event={ev} T={T} dark={dark} luma={luma} toast$={toast$} onCountChange={setChatCount} />}
                    {privateTab === 'detalles' && <EventInformation event={evLocalized} associatedBiz={associatedBiz} T={T} hideTickets={false} hidePriceRow={Boolean(topPriceLabel)} />}
                    {privateTab === 'invitados' && <PrivateEventRsvp event={ev} T={T} dark={dark} luma={luma} toast$={toast$} onCountChange={setGuestCount} />}

                    {user?.id && ev.user_id && user.id === ev.user_id && (
                      <button
                        onClick={() => { navigator.clipboard?.writeText(privateEventUrl(ev)); toast$(t("eventos_enlace_secreto_copiado", "Enlace secreto copiado")); }}
                        style={{ width: '100%', margin: '0 0 12px 0', padding: luma ? '12px 0' : '10px 0', background: luma ? '#FFFFFF' : 'transparent', border: luma ? '1px solid #E5E7EB' : `1.5px solid ${T.border}`, borderRadius: luma ? 16 : 12, boxShadow: luma ? '0 4px 16px rgba(15,23,42,0.06)' : 'none', fontSize: 14, fontWeight: 800, color: T.text, cursor: 'pointer', fontFamily: 'inherit' }}
                      >
                        {t("eventos_copiar_enlace_secreto", "🔗 Copiar enlace secreto")}
                      </button>
                    )}
                    <div style={{ margin: '0 0 8px 0', fontSize: 12, color: T.sub, textAlign: 'center' }}>{t("eventos_privado_solo_enlace", "🔒 Evento privado · solo visible con el enlace")}</div>
                  </>
                ) : (
                  /* --- Datos del evento: en los pasados ya no se muestran (fecha, lugar y precio vencidos) --- */
                  !isPast && <EventInformation event={evLocalized} associatedBiz={associatedBiz} T={T} hideTickets={isPast} hidePriceRow={Boolean(topPriceLabel)} />
                )}

                {/* --- MÚSICA DEL ARTISTA (adelantos de iTunes; si no hay canciones no se muestra nada) --- */}
                {musicQuery && musicTracks && musicTracks.length > 0 && (
                  <div style={{ margin: '0 0 24px 0', background: APPLE_MUSIC_RED, border: '1px solid rgba(255,255,255,0.25)', borderRadius: 16, padding: 16, boxShadow: T.shadow }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 4 }}>
                      <div style={{ fontSize: 18, fontWeight: 800, color: '#FFFFFF' }}>{t("eventos_musica_artista", "Música del artista")}</div>
                      {/* Distintivo oficial de Apple Music: logo blanco sobre negro. */}
                      <span style={{ flexShrink: 0, background: APPLE_MUSIC_BLACK, borderRadius: 8, padding: '7px 10px', display: 'inline-flex', alignItems: 'center', lineHeight: 0 }} title="Apple Music">
                        <img src="/apple-music-logo.svg" alt="Apple Music" style={{ height: 16, width: 'auto', display: 'block' }} />
                      </span>
                    </div>
                    <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', marginBottom: 10 }}>{t("eventos_musica_desc", "Escucha un adelanto de sus canciones sin salir de aquí.")}</div>
                    {musicTracks.map((track, i) => {
                      const playing = playingTrackId === track.id;
                      return (
                        <div key={track.id} onClick={() => toggleMusicTrack(track)} className="press" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderTop: i > 0 ? '1px solid rgba(255,255,255,0.25)' : 'none', cursor: 'pointer' }}>
                          <img src={track.artwork} alt="" style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'cover', background: 'rgba(255,255,255,0.25)', flexShrink: 0 }} />
                          <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                            <div style={{ fontSize: 15, fontWeight: 800, color: '#FFFFFF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{track.name}</div>
                            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{track.artist}</div>
                          </div>
                          <span style={{ flexShrink: 0, width: 36, height: 36, borderRadius: '50%', background: APPLE_MUSIC_BLACK, color: '#FFFFFF', display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 800 }}>{playing ? '❚❚' : '▶'}</span>
                        </div>
                      );
                    })}
                    <a href={`https://music.apple.com/mx/search?term=${encodeURIComponent(musicQuery)}`} target="_blank" rel="noreferrer" style={{ display: 'block', marginTop: 10, fontSize: 13, fontWeight: 700, color: '#FFFFFF', textAlign: 'center', textDecoration: 'none' }}>{t("eventos_ver_mas_apple_music", "Ver más en Apple Music ↗")}</a>
                  </div>
                )}

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
                      <div style={{ fontSize: 16, fontWeight: 800, color: T.text, marginBottom: 4 }}>{t("eventos_ofrecido_por", "Ofrecido por")} {associatedBiz.name}</div>
                      <div style={{ fontSize: 13, color: T.sub, display: "flex", alignItems: "center", gap: 4 }}>
                        {t("eventos_ver_perfil_negocio", "Ver perfil del negocio")} <Icon name="chevron_right" size={14} color={T.sub} />
                      </div>
                    </div>
                  </div>
                )}
                


                {/* --- MÁS EVENTOS (abajo de todo, como "Nearby events") --- */}
                {!isPast && upcoming.length > 0 && (
                  <div style={{ margin: '0 -16px 8px' }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: T.text, marginBottom: 12, padding: '0 16px' }}>{t("eventos_mas_eventos", "Más eventos")}{cityName ? <> {t("eventos_en", "en")} {cityName}</> : ''}</div>
                    <div className="scroll-fade-x" style={{ display: 'flex', gap: 12, overflowX: 'auto', padding: '0 16px 8px', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
                      {upcoming.map(u => {
                        const thumb = u.img_url || u.img;
                        return (
                          <div key={u.id} onClick={() => setSelectedEvent(u)} className="press" style={{ flex: '0 0 248px', display: 'flex', gap: 12, padding: 12, border: `1px solid ${T.border}`, borderRadius: 16, background: T.white, cursor: 'pointer', alignItems: 'center' }}>
                            {thumb ? (
                              <img src={getThumbUrl(thumb, 200)} alt="" style={{ width: 72, height: 72, borderRadius: 12, objectFit: 'cover', background: T.border, flexShrink: 0 }} />
                            ) : (
                              <div style={{ width: 72, height: 72, borderRadius: 12, background: T.border, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <Icon name="calendar" size={24} color={T.sub} />
                              </div>
                            )}
                            <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                              <div style={{ fontSize: 15, fontWeight: 800, color: T.text, lineHeight: 1.25, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{localizedTitle(u, lang)}</div>
                              <div style={{ fontSize: 13, color: T.sub, marginTop: 4 }}>{formatEventCardDate(u, { today: todayLocal, lang })}</div>
                              <div style={{ fontSize: 13, color: T.sub, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.venue_name || cityName || ''}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div style={{ padding: '0 16px', marginTop: 4 }}>
                      <button onClick={exploreEvents} className="press" style={{ width: '100%', minHeight: 48, background: T.green, color: dark ? '#18181B' : '#FFFFFF', border: 'none', borderRadius: 12, fontSize: 16, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, cursor: 'pointer', fontFamily: 'inherit' }}>{t("eventos_ver_todos", "Ver todos los eventos")}</button>
                    </div>
                  </div>
                )}

              </div>
            </div>

            {/* Hoja para compartir el evento como imagen (PR #152):
                dentro del modal, con el evento ya localizado (título y
                descripción en el idioma activo). El «Compartir enlace»
                de antes queda dentro de la hoja. */}
            {showShareCard && (
              <Suspense fallback={null}>
                <EventShareCardSheet event={evLocalized} onClose={() => setShowShareCard(false)} onShareLink={() => shareEvent()} />
              </Suspense>
            )}
          </m.div>
        );
      })()}
    </AnimatePresence>
  );
}







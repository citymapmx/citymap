import React from 'react';
import { AnimatePresence } from 'framer-motion';
import { useUIStore } from '../../store/useUIStore';
import { getT, FONT_BIZ } from '../../lib/constants';
import { createSlug, cleanCityPrefix } from '../../lib/utils';
import Icon from '../ui/Icon';

export default function EventDetailModal({ savedEventIds, setSavedEventIds }) {
  const { selectedEvent, setSelectedEvent, activeCity, dark, toast$ } = useUIStore();
  const T = getT(dark);

  return (
    <AnimatePresence>
      {selectedEvent && (() => {
        const ev = selectedEvent;
        const imgSrc = ev.img_url || ev.img;
        const isSaved = savedEventIds.includes(ev.id);
        const evContactMsg = `Hola, me interesa asistir al evento "${ev.title}".`;
        const evShareMsg = `Échale un vistazo a este evento:`;
        const fmtDate = d => {
          if (!d) return "";
          const [y, m, day] = d.split("-").map(Number);
          const dt = new Date(y, m - 1, day);
          const days = ["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"];
          const months = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
          return `${days[dt.getDay()]} ${day} de ${months[m - 1]} del ${y}`;
        };
        const fmtTime = t => {
          if (!t) return "";
          const [h, mn] = t.split(":").map(Number);
          const p = h >= 12 ? "PM" : "AM";
          const h12 = h % 12 || 12;
          return `${h12}:${String(mn).padStart(2, "0")} ${p}`;
        };
        
        return (
          <div
            key="event-modal"
            style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100dvh", background: dark ? "#000" : "#fff", zIndex: 100000, overflowY: "auto", WebkitOverflowScrolling: "touch" }}
          >
            <div style={{ width: "100%", maxWidth: 460, margin: "0 auto", padding: 0, display: "flex", flexDirection: "column", minHeight: "100%" }}>
              
              {/* --- HERO IMAGE SECTION --- */}
              <div style={{ position: "relative", width: "100%", minHeight: 200, background: T.border, overflow: "hidden" }}>
                {imgSrc ? (
                  <img src={imgSrc} alt="" style={{ position: "relative", width: "100%", height: "auto", display: "block", zIndex: 1 }} loading="eager" />
                ) : (
                  <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#E5E7EB" }}>
                    <Icon name="calendar" size={48} color="#9CA3AF" />
                  </div>
                )}
                
                {/* Floating Back Button */}
                <button onClick={(e) => { e.stopPropagation(); setSelectedEvent(null); }} style={{ position: "absolute", top: "calc(env(safe-area-inset-top, 0px) + 16px)", left: 16, width: 44, height: 44, borderRadius: 22, background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.1)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10, backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }}>
                  <Icon name="chevron" size={22} color="#fff" style={{ transform: "rotate(180deg)", marginLeft: -2 }} />
                </button>
                
                {/* Floating Share Button */}
                <button onClick={(e) => { e.stopPropagation(); const evUrl = `https://citymap.mx/evento/${createSlug(ev.title)}_${ev.id}`; if (navigator.share) navigator.share({ title: ev.title, text: evShareMsg, url: evUrl }); else { navigator.clipboard?.writeText(evUrl); toast$("Enlace copiado"); } }} style={{ position: "absolute", top: "calc(env(safe-area-inset-top, 0px) + 16px)", right: 16, width: 44, height: 44, borderRadius: 22, background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.1)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10, backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }}>
                  <Icon name="share" size={20} color="#fff" style={{ marginRight: 2 }} />
                </button>
              </div>

              {/* --- CONTENT CARD (No overlap) --- */}
              <div style={{ position: "relative", zIndex: 2, background: dark ? "#000" : "#fff", padding: "20px 20px 40px", flex: 1, display: "flex", flexDirection: "column" }}>

                <h1 style={{ fontFamily: FONT_BIZ, fontSize: 26, fontWeight: 900, color: T.text, lineHeight: 1.15, marginTop: 8, marginBottom: ev.event_category ? 8 : 24, textAlign: "left", letterSpacing: "-0.5px" }}>{ev.title}</h1>
                
                {ev.event_category && <div style={{ fontSize: 13, fontWeight: 800, color: T.text, textTransform: "uppercase", letterSpacing: 1, marginBottom: 24, textAlign: "left" }}>{ev.event_category}</div>}

                {/* --- BOTONES AGENDAR --- */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 24 }}>
                  <button className="press" onClick={() => { const startStr = ev.date.replace(/-/g, '') + (ev.time ? `T${ev.time.replace(':', '')}00` : ''); const endStr = ev.end_date ? ev.end_date.replace(/-/g, '') + (ev.end_time ? `T${ev.end_time.replace(':', '')}00` : '') : (ev.time ? startStr : startStr + '/' + startStr); const calUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(ev.title)}&dates=${startStr}/${endStr}&details=${encodeURIComponent(ev.description || '')}&location=${encodeURIComponent(ev.venue_address || ev.venue_name || '')}`; window.open(calUrl, "_blank"); }} style={{ padding: "10px 20px", background: dark ? "rgba(255,255,255,0.05)" : "#F3F4F6", border: `1px solid ${T.border}`, borderRadius: 24, fontSize: 13, fontWeight: 800, color: T.text, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
                    <Icon name="calendar" size={16} color={T.text} /> Agendar en calendario
                  </button>
                </div>
                
                {/* --- INFO SUMMARY (Article Style) --- */}
                <div style={{ display: "flex", flexDirection: "column", marginBottom: 32 }}>
                  
                  {/* Fecha y Hora */}
                  {(ev.date || ev.time) && (
                    <div style={{ marginBottom: 24, textAlign: "left" }}>
                      <h3 style={{ fontSize: 16, fontWeight: 900, color: T.text, marginBottom: 8, fontFamily: FONT_BIZ, letterSpacing: "-0.2px" }}>Fecha y hora</h3>
                      {ev.date && (
                        <p style={{ fontSize: 15, color: T.sub, lineHeight: 1.6, margin: 0 }}>
                          {fmtDate(ev.date)} {ev.end_date && ev.end_date !== ev.date ? ` al ${fmtDate(ev.end_date)}` : ''}
                        </p>
                      )}
                      {ev.time && (
                        <p style={{ fontSize: 15, color: T.sub, lineHeight: 1.6, margin: "4px 0 0" }}>
                          {fmtTime(ev.time)} {ev.end_time ? ` a ${fmtTime(ev.end_time)}` : ''}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Lugar */}
                  {ev.venue_name && (
                    <div style={{ marginBottom: 24, textAlign: "left" }}>
                      <h3 style={{ fontSize: 16, fontWeight: 900, color: T.text, marginBottom: 8, fontFamily: FONT_BIZ, letterSpacing: "-0.2px" }}>Ubicación</h3>
                      <p style={{ fontSize: 15, color: T.sub, lineHeight: 1.6, margin: 0 }}>
                        <strong style={{ color: T.text }}>{ev.venue_name}</strong>
                        {ev.venue_address && <span style={{ display: "block" }}>{ev.venue_address}</span>}
                      </p>
                      {ev.venue_address && (
                        <div onClick={() => window.open(`https://maps.google.com/?q=${encodeURIComponent(ev.venue_address)}`, "_blank")} className="press" style={{ cursor: "pointer", display: "inline-block", marginTop: 8, padding: "6px 14px", border: `1px solid ${T.border}`, borderRadius: 20 }}>
                          <span style={{ fontSize: 13, fontWeight: 800, color: T.text }}>Ver mapa</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Entradas */}
                  <div style={{ marginBottom: 24, textAlign: "left" }}>
                    <h3 style={{ fontSize: 16, fontWeight: 900, color: T.text, marginBottom: 8, fontFamily: FONT_BIZ, letterSpacing: "-0.2px" }}>Entradas</h3>
                    <p style={{ fontSize: 15, color: T.sub, lineHeight: 1.6, margin: 0, marginBottom: (ev.booking_config?.enabled && ev.booking_config.type === "external" && ev.booking_config.externalLinks?.length > 0) ? 12 : 0 }}>
                      {ev.price_type === "gratis" ? "Gratis" : `Desde ${ev.price || ""}`}
                    </p>

                  {ev.booking_config?.enabled && ev.booking_config.type === "external" && ev.booking_config.externalLinks?.length > 0 && (() => {
                    const links = ev.booking_config.externalLinks;
                    const PLATFORM_STYLES = {
                      airbnb: { color: "#FF5A5F", label: "Airbnb", img: "/airbnb.svg" },
                      booking: { color: "#003580", label: "Booking.com", img: "/booking.png" },
                      tiqets: { color: "#4bc2c5", label: "Comprar entradas", img: "/tiqets.png" },
                      tripadvisor: { color: "#000000", label: "TripAdvisor", img: "/tripadvisor.png" },
                      expedia: { color: "#00005C", label: "Expedia.com", img: "/expedia.png" },
                      hoteles: { color: "#D11013", label: "Hoteles.com", img: "/hoteles.com.png" },
                      getyourguide: { color: "#FF5B00", label: "GetYourGuide", img: "/getyourguide.png" },
                      renta_auto: { color: "#E11D48", label: "Rentar Auto", icon: "🚗" },
                      opentable: { color: "#DA3743", label: "OpenTable", icon: "🍽️" },
                      ubereats: { color: "#06C167", label: "Uber Eats", icon: "🍔" },
                      rappi: { color: "#FF4500", label: "Rappi", icon: "🛵" },
                      didifood: { color: "#F76B1C", label: "DiDi Food", icon: "🥡" },
                      whatsapp: { color: "#25D366", label: "WhatsApp", icon: "💬" },
                      comprar_entradas: { color: "#111827", label: "Comprar Entradas", icon: "🎟️" },
                      otro: { color: "#1877F2", label: "Sitio Web", icon: "🔗" }
                    };
                    
                    const renderIcon = (s, size = 16) => {
                      if (s.img) return <img src={s.img} alt={s.label} style={{ height: size * 1.4, width: "auto", display: "block", filter: s.invertImg ? "invert(1) brightness(2)" : "none" }} />;
                      return <span style={{ fontSize: size }}>{s.icon}</span>;
                    };

                    const openLink = (url) => {
                      let finalUrl = url;
                      if (!finalUrl.startsWith('http') && !finalUrl.startsWith('wa.me')) finalUrl = 'https://' + finalUrl;
                      window.open(finalUrl, '_blank', 'noopener,noreferrer');
                    };

                    const getPrefix = (platform) => {
                      if (platform === 'tiqets' || platform === 'comprar_entradas') return '';
                      if (['ubereats', 'rappi', 'didifood'].includes(platform)) return 'Haz tu pedido en';
                      if (['whatsapp', 'otro'].includes(platform)) return 'Ir a';
                      return 'Boletos en:';
                    };

                    if (links.length === 1) {
                      const l = links[0];
                      const s = PLATFORM_STYLES[l.platform] || PLATFORM_STYLES.otro;
                      const prefix = getPrefix(l.platform);
                      return (
                          <button className="press" onClick={() => openLink(l.url)} style={{ width: "100%", background: T.text, border: "none", borderRadius: 12, padding: "14px", color: T.bg, fontSize: 15, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
                            {renderIcon(s, 18)} {prefix ? prefix + ' ' : ''}{s.label}
                          </button>
                      );
                    }
                    
                    if (links.length === 2) {
                      return (
                        <div style={{ display: "flex", gap: 10, justifyContent: "center", width: "100%" }}>
                          {links.map((l, i) => {
                            const s = PLATFORM_STYLES[l.platform] || PLATFORM_STYLES.otro;
                            const prefix = getPrefix(l.platform);
                            return (
                              <button key={i} className="press" onClick={() => openLink(l.url)} style={{ flex: 1, background: T.text, border: "none", borderRadius: 12, padding: "12px", color: T.bg, fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                                {renderIcon(s, 18)} 
                                <span style={{ textAlign: "center", lineHeight: 1.2 }}>{prefix ? prefix + ' ' : ''}{s.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      );
                    }
                    
                    return (
                      <div style={{ width: "100%" }}>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                          {links.map((l, i) => {
                            const s = PLATFORM_STYLES[l.platform] || PLATFORM_STYLES.otro;
                            const prefix = getPrefix(l.platform);
                            return (
                              <button key={i} className="press" onClick={() => openLink(l.url)} style={{ background: T.text, border: "none", borderRadius: 12, padding: "10px", color: T.bg, fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, textAlign: "center" }}>
                                {renderIcon(s, 18)} 
                                <span style={{ lineHeight: 1.2 }}>{prefix ? prefix + ' ' : ''}{s.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}
                  </div>
                  {/* --- DETALLES ADICIONALES (Editorial Text) --- */}
                  {ev.description && (
                    <div style={{ textAlign: "left", marginBottom: 24 }}>
                      <h3 style={{ fontSize: 16, fontWeight: 900, color: T.text, marginBottom: 8, fontFamily: FONT_BIZ, letterSpacing: "-0.2px" }}>Información</h3>
                      <p style={{ color: T.sub, fontSize: 15, lineHeight: 1.6, whiteSpace: 'pre-wrap', margin: 0 }}>{ev.description}</p>
                    </div>
                  )}
                </div>
                <div style={{ flex: 1 }} /> {/* Spacer */}

                {/* --- BUTTONS --- */}
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {ev.whatsapp && (
                    <button onClick={() => window.open(`https://wa.me/${ev.whatsapp.replace(/\D/g,"")}?text=${encodeURIComponent(evContactMsg)}`, "_blank")} style={{ padding: "16px 0", background: "#DCFCE7", border: "none", borderRadius: 16, fontSize: 14, fontWeight: 800, color: "#16A34A", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                      <Icon name="whatsapp" size={16} color="#16A34A" /> WhatsApp
                    </button>
                  )}


                  <button onClick={() => { const nw = isSaved ? savedEventIds.filter(x => x !== ev.id) : [...savedEventIds, ev.id]; setSavedEventIds(nw); localStorage.setItem("cg_saved_ev", JSON.stringify(nw)); }} style={{ width: "100%", padding: "16px 0", background: isSaved ? "#FEE2E2" : T.bg, border: `1px solid ${isSaved ? "#FCA5A5" : T.border}`, borderRadius: 16, fontSize: 14, fontWeight: 700, color: isSaved ? "#D94F3D" : T.text, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                    <Icon name={isSaved ? "heart_f" : "heart"} size={16} color={isSaved ? "#D94F3D" : T.text} />
                    {isSaved ? "Guardado en tus planes" : "Guardar en mis planes"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </AnimatePresence>
  );
}

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
            style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100dvh", background: T.bg, zIndex: 100000, overflowY: "auto", WebkitOverflowScrolling: "touch" }}
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
              </div>

              {/* --- CONTENT CARD (No overlap) --- */}
              <div style={{ position: "relative", zIndex: 2, background: T.bg, padding: "20px 20px 40px", flex: 1, display: "flex", flexDirection: "column" }}>

                <h1 style={{ fontFamily: FONT_BIZ, fontSize: 24, fontWeight: 900, color: T.text, lineHeight: 1.1, marginBottom: ev.event_category ? 4 : 16 }}>{ev.title}</h1>
                
                {ev.event_category && <div style={{ fontSize: 13, fontWeight: 700, color: T.text, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 20 }}>{ev.event_category}</div>}
                
                {/* --- INFORMACIÓN GENERAL (Stacked List) --- */}
                <div style={{ marginBottom: 24 }}>
                  <h3 style={{ fontSize: 17, fontWeight: 800, color: T.text, marginBottom: 12 }}>Información general</h3>
                  <div style={{ background: dark ? "rgba(255,255,255,0.04)" : "#fff", border: `1px solid ${T.border}`, borderRadius: 16, overflow: "hidden", boxShadow: "0 4px 20px rgba(0,0,0,0.03)" }}>
                    
                    {/* Fecha */}
                    {ev.date && (
                      <div style={{ display: "flex", alignItems: "center", padding: "16px", borderBottom: `1px solid ${T.border}` }}>
                        <Icon name="calendar" size={20} color={T.text} style={{ marginRight: 14, opacity: 0.8 }} />
                        <div style={{ flex: 1 }}>
                          <span style={{ fontSize: 15, fontWeight: 700, color: T.text, display: "block", marginBottom: 2 }}>
                            {fmtDate(ev.date)} {ev.end_date && ev.end_date !== ev.date ? ` al ${fmtDate(ev.end_date)}` : ''}
                          </span>
                          {ev.time && (
                            <span style={{ fontSize: 13, fontWeight: 500, color: T.sub, display: "flex", alignItems: "center", gap: 4 }}>
                              <Icon name="clock" size={12} color={T.sub} /> {fmtTime(ev.time)} {ev.end_time ? `- ${fmtTime(ev.end_time)}` : ''}
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Entradas */}
                    <div style={{ display: "flex", alignItems: "center", padding: "16px" }}>
                      <div style={{ width: 20, display: "flex", justifyContent: "center", marginRight: 14 }}>
                        <span style={{ fontSize: 18, fontWeight: 800, color: T.text, opacity: 0.8 }}>$</span>
                      </div>
                      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{ fontSize: 15, fontWeight: 700, color: T.text }}>Entradas</span>
                        <span style={{ fontSize: 14, fontWeight: 800, color: ev.price_type === "gratis" ? "#16A34A" : T.text, background: ev.price_type === "gratis" ? "#DCFCE7" : (dark ? "#374151" : "#F3F4F6"), padding: "4px 10px", borderRadius: 8 }}>
                          {ev.price_type === "gratis" ? "Gratis" : `Desde ${ev.price || ""}`}
                        </span>
                      </div>
                    </div>

                  </div>
                </div>

                {/* --- LUGAR (Stacked List) --- */}
                {ev.venue_name && (
                  <div style={{ marginBottom: 24 }}>
                    <h3 style={{ fontSize: 17, fontWeight: 800, color: T.text, marginBottom: 12 }}>Lugar</h3>
                    <div style={{ background: dark ? "rgba(255,255,255,0.04)" : "#fff", border: `1px solid ${T.border}`, borderRadius: 16, overflow: "hidden", boxShadow: "0 4px 20px rgba(0,0,0,0.03)" }}>
                      <div style={{ display: "flex", alignItems: "center", padding: "16px", borderBottom: ev.venue_address ? `1px solid ${T.border}` : 'none' }}>
                        <Icon name="pin" size={20} color={T.text} style={{ marginRight: 14, opacity: 0.8 }} />
                        <span style={{ flex: 1, fontSize: 15, fontWeight: 700, color: T.text }}>{ev.venue_name}</span>
                      </div>
                      {ev.venue_address && (
                        <div style={{ display: "flex", alignItems: "center", padding: "16px", borderBottom: `1px solid ${T.border}` }}>
                          <Icon name="map" size={18} color={T.sub} style={{ marginRight: 16, opacity: 0.8 }} />
                          <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: T.sub, lineHeight: 1.4 }}>{ev.venue_address}</span>
                        </div>
                      )}
                      {ev.venue_address && (
                        <div onClick={() => window.open(`https://maps.google.com/?q=${encodeURIComponent(ev.venue_address)}`, "_blank")} className="press" style={{ display: "flex", alignItems: "center", padding: "16px", cursor: "pointer" }}>
                          <span style={{ fontSize: 14, fontWeight: 700, color: "#3B82F6" }}>Ver en el mapa</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* --- DETALLES ADICIONALES (Stacked List) --- */}
                {ev.description && (
                  <div style={{ marginBottom: 30 }}>
                    <h3 style={{ fontSize: 17, fontWeight: 800, color: T.text, marginBottom: 12 }}>Detalles adicionales</h3>
                    <div style={{ background: dark ? "rgba(255,255,255,0.04)" : "#fff", border: `1px solid ${T.border}`, borderRadius: 16, overflow: "hidden", boxShadow: "0 4px 20px rgba(0,0,0,0.03)" }}>
                      <div style={{ padding: "16px" }}>
                        <p className="text-sm" style={{ color: T.text, lineHeight: 1.6, whiteSpace: 'pre-wrap', fontWeight: 500 }}>{ev.description}</p>
                      </div>
                    </div>
                  </div>
                )}
                
                <div style={{ flex: 1 }} /> {/* Spacer */}

                {/* --- BUTTONS --- */}
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {ev.whatsapp && (
                    <button onClick={() => window.open(`https://wa.me/${ev.whatsapp.replace(/\D/g,"")}?text=${encodeURIComponent(evContactMsg)}`, "_blank")} style={{ padding: "16px 0", background: "#DCFCE7", border: "none", borderRadius: 16, fontSize: 14, fontWeight: 800, color: "#16A34A", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                      <Icon name="whatsapp" size={16} color="#16A34A" /> WhatsApp
                    </button>
                  )}

                  {ev.website && (
                    <button onClick={() => window.open(ev.website.startsWith('http') ? ev.website : `https://${ev.website}`, "_blank")} style={{ width: "100%", padding: "16px 0", background: `linear-gradient(135deg, ${T.text}, ${dark ? "#444" : "#333"})`, border: "none", borderRadius: 16, fontSize: 14, fontWeight: 800, color: T.bg, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: `0 4px 16px rgba(0,0,0,${dark ? 0.4 : 0.15})` }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg> Comprar Boletos
                    </button>
                  )}

                  <button onClick={() => { const nw = isSaved ? savedEventIds.filter(x => x !== ev.id) : [...savedEventIds, ev.id]; setSavedEventIds(nw); localStorage.setItem("cg_saved_ev", JSON.stringify(nw)); }} style={{ width: "100%", padding: "16px 0", background: isSaved ? "#FEE2E2" : T.bg, border: `1.5px solid ${isSaved ? "#FCA5A5" : T.border}`, borderRadius: 16, fontSize: 14, fontWeight: 700, color: isSaved ? "#D94F3D" : T.text, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                    <Icon name={isSaved ? "heart_f" : "heart"} size={16} color={isSaved ? "#D94F3D" : T.text} />
                    {isSaved ? "Evento guardado en tus planes" : "Guardar en mis planes"}
                  </button>
                </div>

                <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                  <button onClick={() => { const evUrl = `https://citymap.mx/evento/${cleanCityPrefix(ev.slug || createSlug(ev.title), activeCity)}_${ev.id}`; if (navigator.share) navigator.share({ title: ev.title, text: evShareMsg, url: evUrl }); else { navigator.clipboard?.writeText(evUrl); toast$("Enlace copiado"); } }} style={{ flex: 1, padding: "12px 0", background: "transparent", border: "none", fontSize: 13, fontWeight: 700, color: T.sub, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                    <Icon name="share" size={16} color={T.sub} /> Compartir
                  </button>
                  <button onClick={() => { const startStr = ev.date.replace(/-/g, '') + (ev.time ? `T${ev.time.replace(':', '')}00` : ''); const endStr = ev.end_date ? ev.end_date.replace(/-/g, '') + (ev.end_time ? `T${ev.end_time.replace(':', '')}00` : '') : (ev.time ? startStr : startStr + '/' + startStr); const calUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(ev.title)}&dates=${startStr}/${endStr}&details=${encodeURIComponent(ev.description || '')}&location=${encodeURIComponent(ev.venue_address || ev.venue_name || '')}`; window.open(calUrl, "_blank"); }} style={{ flex: 1, padding: "12px 0", background: "transparent", border: "none", fontSize: 13, fontWeight: 700, color: T.sub, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                    <Icon name="calendar" size={16} color={T.sub} /> Agendar
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

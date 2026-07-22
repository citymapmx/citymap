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
              <div style={{ position: "relative", width: "100%", height: "45vh", minHeight: 300, background: T.border, overflow: "hidden" }}>
                {imgSrc ? (
                  <>
                    <div style={{ position: "absolute", inset: 0, backgroundImage: `url(${imgSrc})`, backgroundSize: "cover", backgroundPosition: "center", filter: "blur(20px) brightness(0.6)", transform: "scale(1.1)" }} />
                    <img src={imgSrc} alt="" style={{ position: "relative", width: "100%", height: "100%", objectFit: "contain", zIndex: 1 }} loading="eager" />
                  </>
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
                
                {/* --- PREMIUM BENTO GRID --- */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 32 }}>
                  
                  {/* Fecha (Large Card) */}
                  {ev.date && (
                    <div style={{ gridColumn: "1 / -1", background: dark ? "rgba(255,255,255,0.04)" : "#fff", border: `1px solid ${T.border}`, borderRadius: 20, padding: 18, display: "flex", flexDirection: "column", alignItems: "center", gap: 12, boxShadow: "0 4px 20px rgba(0,0,0,0.03)", textAlign: "center" }}>
                      <div style={{ width: 44, height: 44, borderRadius: 14, background: dark ? "#fff" : "#111827", color: dark ? "#000" : "#fff", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
                        <span style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", marginTop: -2, letterSpacing: 0.5, opacity: 0.9 }}>
                          {(() => { const [,m] = ev.date.split("-").map(Number); return ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"][m-1]; })()}
                        </span>
                        <span style={{ fontSize: 18, fontWeight: 900, lineHeight: 1, letterSpacing: "-0.5px" }}>{ev.date.split('-')[2]}</span>
                      </div>
                      <div>
                        <div style={{ fontSize: 11, color: T.sub, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 4 }}>Fecha y Hora</div>
                        <div style={{ color: T.text, fontSize: 15, fontWeight: 800, letterSpacing: "-0.2px", lineHeight: 1.2 }}>{fmtDate(ev.date)}</div>
                        {ev.time && <div style={{ color: T.sub, fontSize: 13, fontWeight: 600, marginTop: 3 }}>{fmtTime(ev.time)}</div>}
                      </div>
                    </div>
                  )}

                  {/* Ubicación (Half Card) */}
                  {ev.venue_name && (
                    <div style={{ background: dark ? "rgba(255,255,255,0.04)" : "#fff", border: `1px solid ${T.border}`, borderRadius: 20, padding: "16px 12px 20px", display: "flex", flexDirection: "column", alignItems: "center", gap: 10, boxShadow: "0 4px 20px rgba(0,0,0,0.03)", textAlign: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, color: T.sub }}>
                        <Icon name="pin" size={14} color={T.sub} sw={2.5} />
                        <span style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1.2 }}>Ubicación</span>
                      </div>
                      <div style={{ color: T.text, fontSize: 14, fontWeight: 800, lineHeight: 1.3, letterSpacing: "-0.2px" }}>{ev.venue_name}</div>
                    </div>
                  )}

                  {/* Entradas (Half Card) */}
                  <div style={{ background: dark ? "rgba(255,255,255,0.04)" : "#fff", border: `1px solid ${T.border}`, borderRadius: 20, padding: "16px 12px 20px", display: "flex", flexDirection: "column", alignItems: "center", gap: 10, boxShadow: "0 4px 20px rgba(0,0,0,0.03)", textAlign: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, color: T.sub }}>
                      <span style={{ fontSize: 14, fontWeight: 900, lineHeight: 1 }}>$</span>
                      <span style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1.2 }}>Entradas</span>
                    </div>
                    <div style={{ color: ev.price_type === "gratis" ? "#16A34A" : T.text, fontSize: 14, fontWeight: 800, lineHeight: 1.3, letterSpacing: "-0.2px" }}>
                      {ev.price_type === "gratis" ? "Gratis" : `Desde ${ev.price || ""}`}
                    </div>
                  </div>

                </div>
                
                {/* Description */}
                {ev.description && (
                  <div style={{ marginBottom: 30 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 800, color: T.text, marginBottom: 12 }}>Acerca del evento</h3>
                    <p className="text-sm" style={{ color: T.sub, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{ev.description}</p>
                  </div>
                )}
                
                <div style={{ flex: 1 }} /> {/* Spacer */}

                {/* --- BUTTONS --- */}
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    {ev.venue_address && (
                      <button onClick={() => window.open(`https://maps.google.com/?q=${encodeURIComponent(ev.venue_address)}`, "_blank")} style={{ padding: "14px 0", background: dark ? "#333" : "#F3F4F6", border: `1px solid ${T.border}`, borderRadius: 16, fontSize: 13, fontWeight: 700, color: T.text, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "all .2s" }}>
                        <Icon name="pin" size={16} color={T.text} /> Cómo llegar
                      </button>
                    )}
                    {ev.whatsapp && (
                      <button onClick={() => window.open(`https://wa.me/${ev.whatsapp.replace(/\D/g,"")}?text=${encodeURIComponent(evContactMsg)}`, "_blank")} style={{ padding: "14px 0", background: "#DCFCE7", border: "none", borderRadius: 16, fontSize: 13, fontWeight: 700, color: "#16A34A", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                        <Icon name="whatsapp" size={16} color="#16A34A" /> WhatsApp
                      </button>
                    )}
                  </div>

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

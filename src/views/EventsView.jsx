import React, { useState } from "react";
import { m, AnimatePresence } from "framer-motion";
import { useAppContext } from "../context/AppContext";
import { useUIStore } from "../store/useUIStore.js";
import { useDataStore } from "../store/useDataStore.js";
import { useAuthStore } from "../store/useAuthStore.js";
import { useShallow } from 'zustand/react/shallow';
import Icon from "../components/ui/Icon.jsx";
import Footer from "../components/Footer.jsx";
import { Sk } from "../components/ui/Skeleton.jsx";
import { getThumbUrl } from "../lib/utils";
import useTimeStore from "../store/useTimeStore.js";
import { Helmet } from "react-helmet-async";

export default function EventsView() {
  const [activeIdx, setActiveIdx] = useState(0);
  const ctx = useAppContext();
  const { dark, activeCity, toast$ } = useUIStore(useShallow(s => ({ dark: s.dark, activeCity: s.activeCity, toast$: s.toast$ })));
  const { user } = useAuthStore(useShallow(s => ({ user: s.user })));
  const now = useTimeStore(s => s.now);
  const { viewStyle, T, favIds, toggleFav, navigate, setSelected, trackEvent, userCoords, getKm, EVENT_CATS, getEventStatus, goDir, savedEventIds, toggleSaveEvent, selectedEvent, setSelectedEvent, handleEventTap, FONT_BIZ, doShare, AutoSliderEv, city, setShowCreateEvent, createSlug, setSavedEventIds, cleanCityPrefix, events } = ctx;

  return (
    <div style={{ paddingBottom: 84, ...viewStyle }}>
      <Helmet>
        <title>Eventos en {(city || activeCity || "tu ciudad").split(",")[0]} - CityMap</title>
        <link rel="canonical" href="https://citymap.mx/eventos" />
      </Helmet>
      <div style={{ padding: "calc(env(safe-area-inset-top, 0px) + 10px) 20px 16px", background: T.white, textAlign: "center" }}>
            <style>{`
              @keyframes evGradientFlow {
                0% { background-position: 0% center; }
                100% { background-position: 200% center; }
              }
              .ev-city-anim {
                display: inline;
                background: linear-gradient(90deg, #34D399 0%, #38BDF8 25%, #818CF8 50%, #38BDF8 75%, #34D399 100%);
                background-size: 200% auto;
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
                animation: evGradientFlow 4s linear infinite;
                font-weight: 900;
              }
            `}</style>
            <img
              src="/citymap.mx.png"
              alt="CityMap"
              style={{ height: 44, objectFit: "contain", filter: dark ? "none" : "brightness(0)", display: "block", margin: "0 auto 10px" }}
            />
            <p style={{ margin: 0, fontSize: 20, fontWeight: 900, color: T.text, lineHeight: 1.25, fontFamily: "var(--heading)" }}>
              Eventos que no te puedes perder en
            </p>
            <p style={{ margin: "2px 0 0 0", fontSize: 22, lineHeight: 1.2, fontFamily: "var(--heading)" }}>
              <span className="ev-city-anim">{(city || activeCity || "tu ciudad").split(",")[0]}</span>
            </p>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", padding: "8px 20px 4px" }}>
            {user && (
              <>
                <style>{`
                  .animated-pill-btn {
                    background: #0f172a;
                  }
                `}</style>
                <button 
                  className="animated-pill-btn press"
                  onClick={() => setShowCreateEvent(true)} 
                  style={{ color: "#fff", border: "none", borderRadius: 20, padding: "8px 16px", fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6 }}
                >
                  <Icon name="plus" size={14} color="#fff" /> Crear Evento
                </button>
              </>
            )}
          </div>
          {(() => {
            const now2 = now;
            const visible = events.filter(ev => {
              if (!ev.active || ev.status === "pending" || ev.status === "rejected") return false;
              if (ev.date) {
                const endDateStr = ev.end_date || ev.date;
                const evDT = ev.time ? new Date(`${endDateStr}T${ev.time}:00`) : new Date(`${endDateStr}T23:59:00`);
                if ((now2 - evDT) > 86400000) return false;
              }
              return true;
            }).sort((a, b) => {
              if (!a.date) return 1;
              if (!b.date) return -1;
              const cmp = a.date.localeCompare(b.date);
              if (cmp !== 0) return cmp;
              return (a.time || "").localeCompare(b.time || "");
            });
            const pad = n => String(n).padStart(2, "0");
            const todayLocal = `${now2.getFullYear()}-${pad(now2.getMonth()+1)}-${pad(now2.getDate())}`;
            const tmrDt = new Date(now2.getFullYear(), now2.getMonth(), now2.getDate() + 1);
            const tomorrowLocal = `${tmrDt.getFullYear()}-${pad(tmrDt.getMonth()+1)}-${pad(tmrDt.getDate())}`;
            const fmtCardDate = ev => {
              if (!ev.date) return "";
              const d = ev.date;
              if (!ev.end_date || ev.end_date === d) {
                if (d === todayLocal) return "HOY";
                if (d === tomorrowLocal) return "MAÑANA";
                const [y, m, day] = d.split("-").map(Number);
                const months = ["ENERO","FEBRERO","MARZO","ABRIL","MAYO","JUNIO","JULIO","AGOSTO","SEPTIEMBRE","OCTUBRE","NOVIEMBRE","DICIEMBRE"];
                return `${day} DE ${months[m - 1]} DEL ${y}`;
              } else {
                const [y1, m1, day1] = d.split("-").map(Number);
                const [y2, m2, day2] = ev.end_date.split("-").map(Number);
                const months = ["ENERO","FEBRERO","MARZO","ABRIL","MAYO","JUNIO","JULIO","AGOSTO","SEPTIEMBRE","OCTUBRE","NOVIEMBRE","DICIEMBRE"];
                if (m1 === m2 && y1 === y2) {
                  return `DEL ${day1} AL ${day2} DE ${months[m1 - 1]}`;
                }
                return `DEL ${day1} DE ${months[m1 - 1]} AL ${day2} DE ${months[m2 - 1]}`;
              }
            };
            const formatTimeAMPM = (timeStr) => {
              if (!timeStr) return "";
              const [h, m] = timeStr.split(":");
              let hh = parseInt(h);
              const ampm = hh >= 12 ? "p.m." : "a.m.";
              if (hh === 0) hh = 12;
              if (hh > 12) hh -= 12;
              return `${hh}:${m} ${ampm}`;
            };
            if (visible.length === 0) return <div style={{ textAlign: "center", padding: "60px 20px" }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>📅</div>
              <div style={{ fontWeight: 700, fontSize: 16, color: T.text }}>Sin eventos por ahora</div>
              <div style={{ fontSize: 13, color: T.sub, marginTop: 6 }}>Pronto habrá novedades en tu ciudad</div>
            </div>;

            return (
              <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
                
                {/* Grid Section */}
                {visible.length > 0 && (
                  <div style={{ padding: "0 20px", display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}>
                    {visible.map(ev => {
                      const isSaved = savedEventIds.includes(ev.id);
                      const imgSrc = ev.img_url || ev.img;
                      const dateLbl = fmtCardDate(ev);
                      return (
                        <div key={ev.id} className="press" onClick={() => { handleEventTap(ev); }} style={{ background: T.card, borderRadius: 20, border: `1px solid ${dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'}`, boxShadow: dark ? '0 4px 12px rgba(0,0,0,0.5)' : '0 8px 20px rgba(0,0,0,0.06)', position: "relative", overflow: "hidden", display: "flex", flexDirection: "column" }}>
                          <div style={{ width: "100%", aspectRatio: "5/7", background: imgSrc ? `${dark ? "#1F2937" : "#F3F4F6"} url('${getThumbUrl(imgSrc, 400, 560)}') center/cover` : (dark ? "#1F2937" : "#F3F4F6"), position: "relative" }}>
                            {!imgSrc && (
                              <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: dark ? "#374151" : "#E5E7EB" }}>
                                <Icon name="calendar" size={32} color="#9CA3AF" />
                              </div>
                            )}

                            <button onClick={e => { e.stopPropagation(); const nw = isSaved ? savedEventIds.filter(x => x !== ev.id) : [...savedEventIds, ev.id]; setSavedEventIds(nw); localStorage.setItem("cg_saved_ev", JSON.stringify(nw)); }} style={{ position: "absolute", top: 10, right: 10, background: "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.6))", zIndex: 10 }}>
                              <Icon name={isSaved ? "heart_overlay_f" : "heart_overlay"} size={26} color="none" />
                            </button>
                            {ev.date && (() => {
                              const d = new Date(ev.date + "T12:00:00");
                              const m = d.toLocaleString('es-MX', { month: 'short' }).replace('.', '');
                              let dayTxt = d.getDate();
                              let moTxt = m;
                              if (ev.end_date && ev.end_date !== ev.date) {
                                  const d2 = new Date(ev.end_date + "T12:00:00");
                                  dayTxt = `${d.getDate()}-${d2.getDate()}`;
                                  if (d.getMonth() !== d2.getMonth()) {
                                      const m2 = d2.toLocaleString('es-MX', { month: 'short' }).replace('.', '');
                                      moTxt = `${m}/${m2}`;
                                  }
                              }
                              return (
                                <div style={{ position: "absolute", top: 10, left: 10, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", padding: "8px 12px", borderRadius: 14, border: "1px solid rgba(255,255,255,0.2)", display: "flex", flexDirection: "column", alignItems: "center", lineHeight: 1, zIndex: 10 }}>
                                  <span style={{ fontSize: 15, fontWeight: 800, color: "#fff", marginBottom: 2, whiteSpace: "nowrap" }}>{dayTxt}</span>
                                  <span style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.8)", textTransform: "uppercase", whiteSpace: "nowrap", letterSpacing: 0.5 }}>{moTxt}</span>
                                </div>
                              );
                            })()}
                          </div>

                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}
        <Footer />
        </div>

  );
}


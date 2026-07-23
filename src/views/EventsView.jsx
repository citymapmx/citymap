import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppContext } from "../context/AppContext";
import { useUIStore } from "../store/useUIStore.js";
import { useDataStore } from "../store/useDataStore.js";
import { useAuthStore } from "../store/useAuthStore.js";
import { useShallow } from 'zustand/react/shallow';
import Icon from "../components/ui/Icon.jsx";
import { Sk } from "../components/ui/Skeleton.jsx";
import { getThumbUrl } from "../lib/utils";
import useTimeStore from "../store/useTimeStore.js";

export default function EventsView() {
  const ctx = useAppContext();
  const { dark, activeCity, toast$ } = useUIStore(useShallow(s => ({ dark: s.dark, activeCity: s.activeCity, toast$: s.toast$ })));
  const { user } = useAuthStore(useShallow(s => ({ user: s.user })));
  const now = useTimeStore(s => s.now);
  const { viewStyle, T, favIds, toggleFav, navigate, setSelected, trackEvent, userCoords, getKm, EVENT_CATS, getEventStatus, goDir, savedEventIds, toggleSaveEvent, selectedEvent, setSelectedEvent, FONT_BIZ, doShare, AutoSliderEv, city, setShowCreateEvent, createSlug, setSavedEventIds, cleanCityPrefix, events } = ctx;

  return (
    <div style={{ paddingBottom: 84, ...viewStyle }}>
          <div style={{ padding: "calc(env(safe-area-inset-top, 0px) + 24px) 20px 16px", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
            <div>
              <h2 style={{ fontFamily: "'Coolvetica', sans-serif", fontSize: 28, color: T.text, marginBottom: 6 }}>Eventos</h2>
              <div style={{ display: "flex", alignItems: "center", gap: 4, background: dark ? "rgba(255,255,255,0.05)" : "#F3F4F6", padding: "4px 8px", borderRadius: 6, width: "fit-content" }}>
                <Icon name="map-pin" size={12} color={T.green} />
                <span style={{ fontSize: 12, fontWeight: 700, color: T.sub, textTransform: "uppercase", letterSpacing: 0.5 }}>{(city || "TEPIC").split(",")[0]}</span>
              </div>
            </div>
            {user && (
              <>
                <style>{`
                  @keyframes pillGradientFlow {
                    0% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                    100% { background-position: 0% 50%; }
                  }
                  .animated-pill-btn {
                    background: linear-gradient(270deg, #34D399, #38BDF8, #818CF8, #34D399);
                    background-size: 300% 300%;
                    animation: pillGradientFlow 6s ease infinite;
                  }
                `}</style>
                <button 
                  className="animated-pill-btn press"
                  onClick={() => setShowCreateEvent(true)} 
                  style={{ color: "#fff", border: "none", borderRadius: 20, padding: "8px 16px", fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6, boxShadow: "0 2px 8px rgba(56, 189, 248, 0.3)" }}
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
              <div style={{ padding: "0 20px", display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}>
                {visible.map(ev => {
                  const isSaved = savedEventIds.includes(ev.id);
                  const imgSrc = ev.img_url || ev.img;
                  const dateLbl = fmtCardDate(ev);
                  return (
                    <div key={ev.id} className="press" onClick={() => { setSelectedEvent(ev); }} style={{ background: T.card, borderRadius: 20, border: `1px solid ${dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'}`, boxShadow: dark ? '0 4px 12px rgba(0,0,0,0.5)' : '0 8px 20px rgba(0,0,0,0.06)', position: "relative", overflow: "hidden", display: "flex", flexDirection: "column" }}>
                      
                      {/* Image (Top) */}
                      <div style={{ width: "100%", aspectRatio: "3/4", background: dark ? "#1F2937" : "#F3F4F6", position: "relative" }}>
                        {imgSrc ? (
                          <img src={getThumbUrl(imgSrc, 400, 500)} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} loading="lazy" />
                        ) : (
                          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: dark ? "#374151" : "#E5E7EB" }}>
                            <Icon name="calendar" size={32} color="#9CA3AF" />
                          </div>
                        )}

                        {/* Top Gradient Overlay */}
                        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 80, background: "linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, transparent 100%)", pointerEvents: "none" }} />
                        
                        {/* Heart Button */}
                        <button onClick={e => { e.stopPropagation(); const nw = isSaved ? savedEventIds.filter(x => x !== ev.id) : [...savedEventIds, ev.id]; setSavedEventIds(nw); localStorage.setItem("cg_saved_ev", JSON.stringify(nw)); }} style={{ position: "absolute", top: 10, right: 10, background: "rgba(0,0,0,0.2)", backdropFilter: "blur(6px)", border: "1px solid rgba(255,255,255,0.2)", cursor: "pointer", width: 40, height: 40, borderRadius: 20, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 12px rgba(0,0,0,0.2)", transition: "all 0.2s", zIndex: 10 }}>
                          <Icon name={isSaved ? "heart_f" : "heart"} size={18} color={isSaved ? "#EF4444" : "#fff"} />
                        </button>
                        
                        {/* Date Badge */}
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

                      {/* Text (Bottom) */}
                      <div style={{ padding: "14px 14px 16px", display: "flex", flexDirection: "column", flex: 1 }}>
                        <div style={{ fontSize: 10, fontWeight: 800, color: T.green, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 }}>{dateLbl}</div>
                        <div style={{ fontFamily: FONT_BIZ, fontWeight: 800, fontSize: 15, color: T.text, lineHeight: 1.25, marginBottom: 12, wordBreak: "break-word", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{ev.title}</div>
                        {ev.time && (
                          <div style={{ fontSize: 12, color: T.sub, display: "flex", alignItems: "center", gap: 5, marginTop: "auto", fontWeight: 600 }}>
                            <Icon name="clock" size={13} color={T.sub} /> {formatTimeAMPM(ev.time)}
                          </div>
                        )}
                      </div>

                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>

  );
}


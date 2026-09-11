import React from 'react';
import { getThumbUrl, isNear } from '../../lib/utils.js';
import { EventSk } from "../ui/Skeleton.jsx";
import OptimizedImage from "../ui/OptimizedImage.jsx";

export default function HomeEvents({ 
  events, 
  activeCity, 
  userCoords,
  dbReady, 
  dark, 
  t, 
  cityImg, 
  handleEventTap, 
  T,
  city
}) {
  const now = new Date();
  const cityName = (city || activeCity || "").split(",")[0].trim();
  const sectionTitle = cityName ? `Eventos en ${cityName}` : t("agenda_local", "Eventos");

  const upcomingEvents = (events || []).filter(ev => {
    if (ev.status !== "approved") return false;
    if (!isNear(ev, userCoords, activeCity)) return false;
    if (ev.date) {
      const endDateStr = ev.end_date || ev.date;
      const evDT = ev.time ? new Date(`${endDateStr}T${ev.time}:00`) : new Date(`${endDateStr}T23:59:00`);
      if ((now - evDT) > 86400000) return false;
    }
    return true;
  }).filter(ev => ev && ev.date).sort((a, b) => (a.date || "").localeCompare(b.date || ""));

  if (!dbReady) return (
    <div style={{ padding: "24px 0 0 20px" }}>
      <h2 style={{ fontFamily: "var(--heading)", fontWeight: 900, fontSize: 18, color: T.text, margin: "0 0 12px 0", letterSpacing: "-0.5px" }}>{sectionTitle}</h2>
      <EventSk dark={dark} />
    </div>
  );
  if (upcomingEvents.length === 0) return null;
  
  const tz = window.CITY_TZ || 'America/Mazatlan';
  const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  const tomorrow = new Date(now.getTime() + 86400000);
  const tomorrowStr = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(tomorrow);

  const isEventToday = ev => ev.date === todayStr || (ev.end_date && ev.date <= todayStr && ev.end_date >= todayStr);
  const isEventTomorrow = ev => ev.date === tomorrowStr || (ev.end_date && ev.date <= tomorrowStr && ev.end_date >= tomorrowStr);
  
  return (
    <div style={{ padding: "32px 0 8px 0" }}>
      <h2 style={{ fontFamily: "var(--heading)", fontWeight: 800, fontSize: 20, color: T.text, letterSpacing: "-0.5px", textAlign: "left", margin: "0 0 16px 20px" }}>{sectionTitle}</h2>
      
      {upcomingEvents.length > 0 && (
        <div style={{ display: "flex", gap: 16, overflowX: "auto", scrollbarWidth: "none", paddingBottom: 16, paddingLeft: 20, paddingRight: 20 }}>
          {upcomingEvents.map(ev => {
            const rawUrl = ev.img_url || cityImg;
            const isToday = isEventToday(ev);
            const isTomorrow = isEventTomorrow(ev);
            return (
              <div key={ev.id} className="press" onClick={() => { handleEventTap(ev); }} style={{ width: 150, height: 210, borderRadius: 18, border: `1px solid ${T.border}`, cursor: "pointer", flexShrink: 0, boxShadow: "0 8px 20px rgba(0,0,0,0.15)", position: "relative", overflow: "hidden" }}>
                <OptimizedImage src={rawUrl} widthRequest={600} heightRequest={800} alt={ev.title} style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", objectFit: "cover" }} />
                {(isToday || isTomorrow) && (
                  <div style={{ position: "absolute", top: 8, left: 8, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)", color: "#fff", padding: "4px 8px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.2)", fontWeight: 800, fontSize: 10, letterSpacing: 0.5, animation: isToday ? "pulse 2s infinite" : "none", display: "flex", alignItems: "center", gap: 4, zIndex: 2 }}>
                    {isToday ? t("es_hoy", "🤩 ES HOY") : t("manana", "⏳ MAÑANA")}
                  </div>
                )}
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
                    <div style={{ position: "absolute", bottom: 10, left: 10, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", padding: "6px 10px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.2)", display: "flex", flexDirection: "column", alignItems: "center", lineHeight: 1 }}>
                      <span style={{ fontSize: 14, fontWeight: 800, color: "#fff", marginBottom: 2, whiteSpace: "nowrap" }}>{dayTxt}</span>
                      <span style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.8)", textTransform: "uppercase", whiteSpace: "nowrap" }}>{moTxt}</span>
                    </div>
                  );
                })()}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

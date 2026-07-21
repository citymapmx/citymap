import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Icon from '../ui/Icon.jsx';
import { sb, GMAPS_KEY } from '../../lib/supabase.js';
import { useGMaps } from '../GMap.jsx';

// Convert HH:MM (24h) to 12h format: "2:30 p.m."
function formatTime(t) {
  if (!t) return null;
  const [hStr, mStr] = t.split(':');
  let h = parseInt(hStr, 10);
  const m = mStr || '00';
  const ampm = h >= 12 ? 'p.m.' : 'a.m.';
  h = h % 12 || 12;
  return `${h}:${m} ${ampm}`;
}

// Given a timeHint and durationMin, compute the block's visual height (in px)
// 1 hour = 60px. Min = 60px.
function blockHeight(durationMin) {
  if (!durationMin || durationMin < 60) return 72;
  return Math.min(Math.round(durationMin), 240); // cap at 4 hours visual
}

// Build Google Maps Static API URL for the route (using polyline for real roads)
function buildStaticRouteUrl(places, apiKey, dark, polyline = null) {
  const biz = places.filter(p => p.type !== 'custom' && p.business?.lat && p.business?.lng);
  if (biz.length === 0) return null;

  const size = '600x200';
  const mapType = 'roadmap';
  const style = dark
    ? '&style=element:geometry|color:0x242f3e&style=element:labels.text.stroke|color:0x242f3e&style=element:labels.text.fill|color:0x746855'
    : '';

  const markers = biz.map((p, i) =>
    `markers=color:blue|label:${i + 1}|${p.business.lat},${p.business.lng}`
  ).join('&');

  let path = '';
  if (polyline) {
    path = `path=color:0x3B82F6ff|weight:6|enc:${encodeURIComponent(polyline)}`;
  } else if (biz.length > 1) {
    // fallback straight line if polyline fails
    path = 'path=color:0x3B82F6ff|weight:6|' + biz.map(p => `${p.business.lat},${p.business.lng}`).join('|');
  }

  return `https://maps.googleapis.com/maps/api/staticmap?size=${size}&maptype=${mapType}&${markers}${path ? '&' + path : ''}&key=${apiKey}${style}`;
}

// Format duration in minutes to "X h Y min"
function fmtDuration(min) {
  if (!min) return null;
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h > 0 && m > 0) return `${h}h ${m}min`;
  if (h > 0) return `${h}h`;
  return `${m}min`;
}

// Haversine distance
function kmBetween(p1, p2) {
  if (!p1?.lat || !p2?.lat) return null;
  const R = 6371;
  const dLat = (parseFloat(p2.lat) - parseFloat(p1.lat)) * Math.PI / 180;
  const dLon = (parseFloat(p2.lng) - parseFloat(p1.lng)) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(parseFloat(p1.lat) * Math.PI / 180) * Math.cos(parseFloat(p2.lat) * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return dist;
}

export default function PlanViewer({ plan, onClose, onEdit, onClone, T, dark, isMine = true, user }) {
  const [activeSection, setActiveSection] = useState('itinerary'); // 'itinerary' | 'info'
  const [copied, setCopied] = useState(false);
  const [routePolyline, setRoutePolyline] = useState(null);
  const gmapsReady = useGMaps();

  useEffect(() => {
    window.scrollTo(0, 0);
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  // Compute real route polyline via DirectionsService
  useEffect(() => {
    if (!gmapsReady || !plan) return;
    const biz = plan.places.filter(p => p.type !== 'custom' && p.business?.lat && p.business?.lng);
    if (biz.length < 2) return;

    try {
      const ds = new window.google.maps.DirectionsService();
      const origin = { lat: parseFloat(biz[0].business.lat), lng: parseFloat(biz[0].business.lng) };
      const dest = { lat: parseFloat(biz[biz.length - 1].business.lat), lng: parseFloat(biz[biz.length - 1].business.lng) };
      const waypoints = biz.slice(1, -1).map(p => ({
        location: { lat: parseFloat(p.business.lat), lng: parseFloat(p.business.lng) },
        stopover: true
      }));

      ds.route({
        origin,
        destination: dest,
        waypoints,
        travelMode: window.google.maps.TravelMode.DRIVING
      }, (res, status) => {
        if (status === 'OK' && res?.routes?.[0]?.overview_polyline) {
          setRoutePolyline(res.routes[0].overview_polyline);
        }
      });
    } catch (e) {
      console.warn("Could not fetch real route directions", e);
    }
  }, [gmapsReady, plan]);

  if (!plan) return null;

  // Build the share URL — always use plan ID for direct access
  const shareUrl = `https://citymap.mx/plan/${plan.id}`;

  const handleShare = async () => {
    // Enable link sharing in DB so RLS allows anon reads
    if (plan.id && !plan.link_shared) {
      try {
        await sb.patch('plans', plan.id, { link_shared: true });
        plan.link_shared = true;
      } catch (_) { /* non-critical */ }
    }

    if (navigator.share) {
      navigator.share({
        title: plan.name,
        text: `🗺️ ${plan.description || 'Mira este increíble plan en CityMap'}`,
        url: shareUrl
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(shareUrl).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      });
    }
  };

  // Compute summary stats
  const bizPlaces = plan.places.filter(p => p.type !== 'custom' && p.business?.lat);
  let totalKm = 0;
  for (let i = 0; i < bizPlaces.length - 1; i++) {
    const d = kmBetween(bizPlaces[i].business, bizPlaces[i + 1].business);
    if (d) totalKm += d;
  }
  const totalDuration = plan.places.reduce((acc, p) => acc + (p.durationMin || 60), 0);
  const staticRouteUrl = buildStaticRouteUrl(plan.places, GMAPS_KEY, dark, routePolyline);

  const accentPurple = '#7C3AED';

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: T.bg, display: "flex", flexDirection: "column", animation: "fadeUp .3s cubic-bezier(0.16, 1, 0.3, 1)" }}>

      {/* ── HERO HEADER ── */}
      <div style={{ position: "relative", width: "100%", height: 240, backgroundColor: dark ? "#111" : "#E5E7EB", backgroundImage: plan.coverUrl ? `url(${plan.coverUrl})` : "none", backgroundSize: "cover", backgroundPosition: "center", flexShrink: 0 }}>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.05) 45%, rgba(0,0,0,0.85) 100%)" }} />

        {/* Back + Share + Edit */}
        <div style={{ position: "absolute", top: "max(env(safe-area-inset-top,0px),16px)", left: 16, right: 16, display: "flex", justifyContent: "space-between", zIndex: 10 }}>
          <button onClick={onClose} className="press" style={{ width: 38, height: 38, borderRadius: 19, background: "rgba(0,0,0,0.35)", backdropFilter: "blur(12px)", border: "none", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <Icon name="arrow_left" size={20} />
          </button>

          <div style={{ display: "flex", gap: 8 }}>
            {/* Share btn */}
            <button onClick={handleShare} className="press" style={{ display: "flex", alignItems: "center", gap: 6, height: 38, padding: "0 14px", borderRadius: 19, background: copied ? "#10B981" : "rgba(0,0,0,0.35)", backdropFilter: "blur(12px)", border: "none", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", transition: "background 0.2s" }}>
              <Icon name={copied ? "check" : "share"} size={15} color="#fff" />
              {copied ? "¡Copiado!" : "Compartir"}
            </button>

            {isMine ? (
              <button onClick={() => onEdit(plan)} className="press" style={{ display: "flex", alignItems: "center", gap: 6, height: 38, padding: "0 14px", borderRadius: 19, background: "rgba(0,0,0,0.35)", backdropFilter: "blur(12px)", border: "none", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                <Icon name="edit-2" size={14} /> Editar
              </button>
            ) : (
              <button onClick={() => onClone && onClone(plan)} className="press" style={{ display: "flex", alignItems: "center", gap: 6, height: 38, padding: "0 14px", borderRadius: 19, background: "rgba(124,58,237,0.85)", backdropFilter: "blur(12px)", border: "none", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 12px rgba(124,58,237,0.4)" }}>
                <Icon name="download" size={14} /> Guardar copia
              </button>
            )}
          </div>
        </div>

        {/* Title + Author */}
        <div style={{ position: "absolute", bottom: 18, left: 20, right: 20, zIndex: 10 }}>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 12 }}>
            <div style={{ fontSize: 40, filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.3))", lineHeight: 1 }}>{plan.emoji}</div>
            <div style={{ flex: 1 }}>
              <h1 style={{ margin: 0, fontSize: 24, fontWeight: 900, color: "#fff", textShadow: "0 2px 8px rgba(0,0,0,0.4)", lineHeight: 1.15 }}>{plan.name}</h1>
              {!isMine && plan.author && (
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.75)", marginTop: 4, fontWeight: 600 }}>por {plan.author}</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── STAT PILLS ── */}
      <div style={{ display: "flex", gap: 8, padding: "14px 20px 0", overflowX: "auto", flexShrink: 0 }}>
        {[
          { icon: "map-pin", val: `${plan.places.length} parada${plan.places.length !== 1 ? 's' : ''}` },
          totalKm > 0 && { icon: "map", val: `${totalKm < 1 ? Math.round(totalKm * 1000) + ' m' : totalKm.toFixed(1) + ' km'}` },
          totalDuration > 0 && { icon: "clock", val: fmtDuration(totalDuration) },
          plan.budget > 0 && { icon: "dollar-sign", val: `$${plan.budget} MXN` },
          plan.category && { icon: "tag", val: plan.category },
        ].filter(Boolean).map((item, idx) => (
          <div key={idx} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 12px", background: dark ? "rgba(255,255,255,0.07)" : "#F3F4F6", borderRadius: 20, fontSize: 12, fontWeight: 700, color: T.text, whiteSpace: "nowrap", flexShrink: 0 }}>
            <Icon name={item.icon} size={12} color={accentPurple} />
            {item.val}
          </div>
        ))}
      </div>

      {/* ── SECTION TABS ── */}
      <div style={{ display: "flex", padding: "14px 20px 0", gap: 8, flexShrink: 0 }}>
        {[{ id: 'itinerary', label: '🗓 Itinerario' }, { id: 'info', label: '📋 Detalles' }].map(tab => (
          <button key={tab.id} onClick={() => setActiveSection(tab.id)} style={{ flex: 1, padding: "10px 0", borderRadius: 12, border: `1px solid ${activeSection === tab.id ? accentPurple : T.border}`, background: activeSection === tab.id ? accentPurple : "transparent", color: activeSection === tab.id ? "#fff" : T.sub, fontWeight: 700, fontSize: 13, cursor: "pointer", transition: "all 0.2s" }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── SCROLLABLE BODY ── */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px 20px 100px" }}>
        <AnimatePresence mode="wait">

          {/* ITINERARY TAB */}
          {activeSection === 'itinerary' && (
            <motion.div key="itinerary" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>

              {/* Route map */}
              {staticRouteUrl && plan.places.length >= 2 && (
                <div style={{ borderRadius: 16, overflow: "hidden", marginBottom: 20, boxShadow: "0 4px 20px rgba(0,0,0,0.12)", border: `1px solid ${T.border}`, position: "relative", minHeight: 180, background: dark ? '#222' : '#f0f0f0' }}>
                  <img
                    src={staticRouteUrl}
                    alt="Ruta real"
                    style={{ width: "100%", height: 180, objectFit: "cover", display: "block" }}
                    onError={e => { e.target.parentElement.style.display = 'none'; }}
                  />
                  <div style={{ position: "absolute", bottom: 12, right: 12, display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
                    <div style={{ background: '#3B82F6', color: "#fff", padding: "6px 12px", borderRadius: 20, fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", gap: 6, boxShadow: "0 4px 12px rgba(59,130,246,0.4)" }}>
                      📍 {bizPlaces.length} paradas · {totalKm < 1 ? Math.round(totalKm * 1000) + 'm' : totalKm.toFixed(1) + 'km'}
                    </div>
                    <button 
                      className="press"
                      onClick={() => {
                        const origin = `${bizPlaces[0].business.lat},${bizPlaces[0].business.lng}`;
                        const dest = `${bizPlaces[bizPlaces.length-1].business.lat},${bizPlaces[bizPlaces.length-1].business.lng}`;
                        const waypoints = bizPlaces.slice(1, -1).map(p => `${p.business.lat},${p.business.lng}`).join('|');
                        const url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${dest}${waypoints ? '&waypoints=' + waypoints : ''}&travelmode=driving`;
                        window.open(url, '_blank');
                      }}
                      style={{ background: '#111827', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 20, fontSize: 13, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, boxShadow: '0 4px 12px rgba(0,0,0,0.4)' }}
                    >
                      <Icon name="nav" size={14} /> Cómo llegar
                    </button>
                  </div>
                </div>
              )}

              {plan.places.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 20px", color: T.sub }}>
                  Este plan aún no tiene lugares guardados.
                </div>
              ) : (
                <div style={{ position: "relative", paddingLeft: 28 }}>
                  {/* Vertical timeline line */}
                  <div style={{ position: "absolute", top: 20, bottom: 20, left: 10, width: 2, background: `linear-gradient(to bottom, ${accentPurple}66, ${accentPurple}22)`, borderRadius: 2 }} />

                  {plan.places.map((item, i) => {
                    const timeLabel = formatTime(item.timeHint);
                    const dur = item.durationMin;
                    const nextItem = plan.places[i + 1];
                    const distToNext = (item.type !== 'custom' && nextItem?.type !== 'custom')
                      ? kmBetween(item.business, nextItem?.business)
                      : null;
                    const minsToNext = distToNext ? Math.max(1, Math.round(distToNext * 3)) : null;

                    return (
                      <div key={item.id || i} style={{ position: "relative", marginBottom: 8 }}>

                        {/* Timeline dot */}
                        <div style={{ position: "absolute", left: -28, top: 20, width: 22, height: 22, borderRadius: 11, background: accentPurple, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2, boxShadow: `0 2px 8px ${accentPurple}66` }}>
                          <span style={{ fontSize: 10, fontWeight: 900, color: "#fff" }}>{i + 1}</span>
                        </div>

                        {/* Card */}
                        <motion.div
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.06 }}
                          style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: 16, overflow: "hidden", boxShadow: "0 4px 16px rgba(0,0,0,0.04)" }}
                        >
                          {/* Time header strip */}
                          {timeLabel && (
                            <div style={{ background: accentPurple, padding: "8px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <span style={{ fontSize: 13, color: "rgba(255,255,255,0.7)" }}>🕐</span>
                                <span style={{ fontSize: 13, fontWeight: 800, color: "#fff", letterSpacing: 0.3 }}>{timeLabel}</span>
                              </div>
                              {dur && (
                                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.8)", fontWeight: 600 }}>⏱ {fmtDuration(dur)}</span>
                              )}
                            </div>
                          )}

                          {/* Body */}
                          <div style={{ padding: 14, display: "flex", gap: 14 }}>
                            {/* Thumbnail */}
                            {item.type === "custom" ? (
                              <div style={{ width: 64, height: 64, borderRadius: 12, background: dark ? "rgba(255,255,255,0.08)" : "#F3E8FF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, flexShrink: 0 }}>
                                {item.customEmoji}
                              </div>
                            ) : (
                              <div style={{ width: 64, height: 64, borderRadius: 12, backgroundImage: `url(${item.business?.logo_url || item.business?.photos?.[0]?.url || ''})`, backgroundSize: "cover", backgroundPosition: "center", backgroundColor: dark ? "rgba(255,255,255,0.05)" : "#F3F4F6", flexShrink: 0 }} />
                            )}

                            <div style={{ flex: 1, minWidth: 0 }}>
                              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: T.text, lineHeight: 1.2 }}>
                                {item.type === "custom" ? item.customName : item.business?.name}
                              </h3>
                              <div style={{ fontSize: 12, color: T.sub, marginTop: 3, display: 'flex', alignItems: 'center', gap: 4 }}>
                                {item.type === "custom" ? "✏️ Actividad personalizada" : item.business?.category}
                                {item.type === "custom" && item.customAddress && (
                                  <><span style={{ opacity: 0.5 }}>·</span><span>📍 {item.customAddress}</span></>
                                )}
                              </div>

                              {/* Duration bar (visual block) */}
                              {dur && !timeLabel && (
                                <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 6 }}>
                                  <div style={{ height: 4, width: Math.min(Math.round(dur / 4), 80), background: `linear-gradient(to right, ${accentPurple}, ${accentPurple}66)`, borderRadius: 2 }} />
                                  <span style={{ fontSize: 11, color: T.sub, fontWeight: 600 }}>{fmtDuration(dur)}</span>
                                </div>
                              )}

                              {item.note && (
                                <div style={{ marginTop: 8, padding: "7px 10px", background: dark ? "rgba(255,255,255,0.04)" : "#F9FAFB", borderRadius: 8, border: `1px solid ${T.border}`, fontSize: 12, color: T.sub, fontStyle: "italic", lineHeight: 1.4 }}>
                                  "{item.note}"
                                </div>
                              )}
                            </div>
                          </div>
                        </motion.div>

                        {/* Travel connector to next stop */}
                        {nextItem && (
                          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0 8px 6px" }}>
                            <div style={{ width: 10, height: 10, borderRadius: 5, background: T.border, flexShrink: 0 }} />
                            <div style={{ fontSize: 11, color: T.sub, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                              {distToNext != null ? (
                                <>
                                  <Icon name="nav" size={10} color={T.sub} />
                                  {distToNext < 1 ? `${Math.round(distToNext * 1000)} m` : `${distToNext.toFixed(1)} km`}
                                  {minsToNext && <span>· ~{minsToNext} min en auto</span>}
                                </>
                              ) : (
                                <span>➜ Siguiente parada</span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {/* INFO TAB */}
          {activeSection === 'info' && (
            <motion.div key="info" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }} style={{ display: "flex", flexDirection: "column", gap: 16 }}>

              {plan.description && (
                <div style={{ padding: 16, borderRadius: 16, background: dark ? "rgba(255,255,255,0.04)" : "#F9FAFB", border: `1px solid ${T.border}` }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: T.sub, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.8 }}>Descripción</div>
                  <div style={{ fontSize: 14, color: T.text, lineHeight: 1.6 }}>{plan.description}</div>
                </div>
              )}

              {plan.notes && (
                <div style={{ padding: 16, borderRadius: 16, background: dark ? "rgba(255,255,255,0.04)" : "#F9FAFB", border: `1px solid ${T.border}` }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: T.sub, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.8 }}>Notas del creador</div>
                  <div style={{ fontSize: 14, color: T.text, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{plan.notes}</div>
                </div>
              )}

              {plan.start_date && (
                <div style={{ padding: 16, borderRadius: 16, background: dark ? "rgba(255,255,255,0.04)" : "#F9FAFB", border: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 12 }}>
                  <Icon name="calendar" size={18} color={accentPurple} />
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 800, color: T.sub, textTransform: "uppercase", letterSpacing: 0.8 }}>Fecha</div>
                    <div style={{ fontSize: 14, color: T.text, fontWeight: 700, marginTop: 2 }}>
                      {new Date(plan.start_date).toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </div>
                  </div>
                </div>
              )}

              {plan.checklist && plan.checklist.length > 0 && (
                <div style={{ padding: 16, borderRadius: 16, background: dark ? "rgba(255,255,255,0.04)" : "#F9FAFB", border: `1px solid ${T.border}` }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: T.sub, marginBottom: 12, textTransform: "uppercase", letterSpacing: 0.8 }}>Qué llevar</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {plan.checklist.map((item, idx) => (
                      <div key={idx} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                        <div style={{ marginTop: 1, width: 18, height: 18, borderRadius: 9, background: `${accentPurple}22`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <Icon name="check" size={11} color={accentPurple} />
                        </div>
                        <div style={{ fontSize: 14, color: T.text, lineHeight: 1.4 }}>{item}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Share card */}
              <div style={{ padding: 16, borderRadius: 16, background: `linear-gradient(135deg, ${accentPurple}15, ${accentPurple}05)`, border: `1px solid ${accentPurple}33` }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: accentPurple, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.8 }}>Enlace para compartir</div>
                <div style={{ fontSize: 12, color: T.sub, background: dark ? "rgba(0,0,0,0.2)" : "rgba(255,255,255,0.7)", borderRadius: 8, padding: "8px 12px", fontFamily: "monospace", marginBottom: 12, wordBreak: "break-all" }}>
                  {shareUrl}
                </div>
                <button onClick={handleShare} className="press" style={{ width: "100%", padding: "12px 0", borderRadius: 12, background: accentPurple, color: "#fff", border: "none", fontWeight: 800, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  <Icon name={copied ? "check" : "share"} size={16} color="#fff" />
                  {copied ? "¡Enlace copiado!" : "Compartir plan"}
                </button>
              </div>

            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

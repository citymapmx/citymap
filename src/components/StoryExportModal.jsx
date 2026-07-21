import React, { useMemo } from "react";
import { motion } from "framer-motion";

import Icon from "./ui/Icon.jsx";

import { useUIStore } from "../store/useUIStore.js";
import { getT } from "../lib/constants.js";

export default function StoryExportModal({ biz, ownerRes, onClose }) {
  const dark = useUIStore(s => s.dark);
  const toast$ = useUIStore(s => s.toast$);
  const T = getT(dark);
  const today = new Date();
  const dateStr = today.toISOString().split("T")[0];

  const formatTimeAMPM = (timeStr) => {
    const [h, m] = timeStr.split(":");
    let hh = parseInt(h);
    const ampm = hh >= 12 ? "PM" : "AM";
    if(hh === 0) hh = 12;
    if(hh > 12) hh -= 12;
    return `${hh}:${m} ${ampm}`;
  };

  const availableSlots = useMemo(() => {
    if (!biz.schedule) return [];
    
    const dayNames = ["dom", "lun", "mar", "mie", "jue", "vie", "sab"];
    const dayKey = dayNames[today.getDay()];
    
    const hours = biz.schedule[dayKey];
    if (!hours || /cerrado/i.test(hours)) return [];

    const isDateBlocked = (biz.booking_config?.blocked_dates || []).includes(dateStr);
    if (isDateBlocked) return [];

    const segs = hours.split(/\s*[–\-]\s*|\s+a\s+/i);
    if (segs.length < 2) return [];

    const toMinutes = (timeStr) => {
      const m = (timeStr || "").trim().match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
      if (!m) return null;
      let h = parseInt(m[1]);
      const min = parseInt(m[2] || 0);
      const p = (m[3] || "").toLowerCase();
      if (p === "pm" && h !== 12) h += 12;
      if (p === "am" && h === 12) h = 0;
      return h * 60 + min;
    };

    const openMin = toMinutes(segs[0]);
    const closeMin = toMinutes(segs[1]);
    if (openMin === null || closeMin === null) return [];

    // Get max slots config
    const maxPerSlot = biz.booking_config?.maxPerSlot || 1;
    const minDur = (biz.booking_config?.services && biz.booking_config.services.length > 0) 
      ? Math.min(...biz.booking_config.services.map(s => s.durationMin || 60)) 
      : 60;
    const dur = minDur; 

    const existingRanges = [];
    ownerRes.forEach(r => {
      if (r.date === dateStr && r.status !== "cancelled") {
        const resMin = toMinutes(r.time);
        if (resMin !== null) {
          const rSvc = (biz.booking_config?.services || []).find(s => s.name === r.service || s.id === r.service);
          const rDur = rSvc ? (rSvc.durationMin || 60) : 60;
          existingRanges.push({ start: resMin, end: resMin + rDur });
        }
      }
    });

    const blockedSlots = biz.booking_config?.blocked_slots || [];

    let slots = [];
    for (let m = openMin; m + dur <= closeMin; m += minDur) {
      const hh = String(Math.floor(m / 60)).padStart(2, "0");
      const mm = String(m % 60).padStart(2, "0");
      const slotTime = `${hh}:${mm}`;
      
      let overlapCount = 0;
      for (const rng of existingRanges) {
        if (m < rng.end && (m + dur) > rng.start) overlapCount++;
      }
      
      const isFull = overlapCount >= maxPerSlot;
      const isOwnerBlocked = blockedSlots.some(b => {
        if (b.date !== dateStr) return false;
        const bMin = toMinutes(b.time);
        return bMin !== null && m < (bMin + minDur) && (m + dur) > bMin;
      });
      const isPast = m < (today.getHours() * 60 + today.getMinutes() + 15); // 15 min buffer

      if (!isFull && !isOwnerBlocked && !isPast) {
        slots.push(slotTime);
      }
    }

    return slots;
  }, [biz, ownerRes, dateStr, today]);

  const copyText = () => {
    if (availableSlots.length === 0) {
      toast$("No hay espacios para copiar.");
      return;
    }
    const header = `🔥 ¡Últimos espacios libres para hoy en ${biz.name}!\n\n`;
    const times = availableSlots.map(t => `⏰ ${formatTimeAMPM(t)}`).join("\n");
    const footer = `\n\n👉 ¡Asegura tu lugar reservando en nuestro perfil!`;
    const fullText = header + times + footer;
    
    navigator.clipboard.writeText(fullText).then(() => {
      toast$("¡Texto copiado al portapapeles!");
    }).catch(() => {
      toast$("Error al copiar texto");
    });
  };

  const bgGradient = "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)";

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 10000, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={onClose}>
      <motion.div 
        initial={{ scale: 0.95, opacity: 0, y: 10 }} 
        animate={{ scale: 1, opacity: 1, y: 0 }} 
        onClick={e => e.stopPropagation()}
        style={{ background: "#fff", width: "100%", maxWidth: 400, borderRadius: 32, padding: 24, boxShadow: "0 20px 40px rgba(0,0,0,0.4)", display: "flex", flexDirection: "column", alignItems: "center" }}
      >
        <div style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: "#0F1A14", margin: 0 }}>Compartir Espacios</h2>
          <button onClick={onClose} style={{ background: "#F3F4F6", border: "none", width: 44, height: 44, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><Icon name="x" size={14} color="#5A6872" /></button>
        </div>

        <p style={{ fontSize: 13, color: T.sub, textAlign: "center", marginBottom: 24, lineHeight: 1.5 }}>
          Toma una captura de pantalla de la tarjeta de abajo y súbela a tus historias, o copia el texto para enviarlo por WhatsApp.
        </p>

        {/* 9:16 Aspect Ratio Card for Screenshot */}
        <div 
          style={{ 
            width: 250, 
            height: 444, // 9:16 ratio approximately
            background: bgGradient, 
            borderRadius: 24, 
            padding: 24, 
            display: "flex", 
            flexDirection: "column", 
            alignItems: "center", 
            justifyContent: "center",
            position: "relative",
            overflow: "hidden",
            boxShadow: "0 10px 30px rgba(0,0,0,0.2)"
          }}
        >
          {/* Decorative Elements */}
          <div style={{ position: "absolute", top: -50, right: -50, width: 150, height: 150, background: "rgba(255,255,255,0.05)", borderRadius: "50%" }}></div>
          <div style={{ position: "absolute", bottom: -20, left: -20, width: 100, height: 100, background: "rgba(255,255,255,0.05)", borderRadius: "50%" }}></div>

          {biz.logo_url || (biz.photos && biz.photos[0] && biz.photos[0].url) ? (
            <img src={biz.logo_url || biz.photos[0].url} alt="Logo" style={{ width: 64, height: 64, borderRadius: "50%", objectFit: "cover", marginBottom: 16, border: "2px solid #fff", boxShadow: "0 4px 15px rgba(0,0,0,0.2)" }} />
          ) : (
            <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, marginBottom: 16, boxShadow: "0 4px 15px rgba(0,0,0,0.1)" }}>
              {biz.emoji || "✨"}
            </div>
          )}
          
          <div style={{ fontSize: 18, fontWeight: 900, color: "#fff", textAlign: "center", marginBottom: 4, letterSpacing: "-0.5px" }}>
            {biz.name}
          </div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 24 }}>
            Disponibilidad de Hoy
          </div>

          <div style={{ width: "100%", display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 8, paddingBottom: 16 }}>
            {availableSlots.length > 0 ? (
              availableSlots.map(time => (
                <div key={time} style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 10, padding: "8px 12px", textAlign: "center", color: "#fff", fontSize: 15, fontWeight: 800, backdropFilter: "blur(4px)", minWidth: "40%" }}>
                  {formatTimeAMPM(time)}
                </div>
              ))
            ) : (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", marginTop: 20 }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>🚀</div>
                <div style={{ color: "#fff", fontSize: 16, fontWeight: 800, marginBottom: 4 }}>¡Agenda Llena!</div>
                <div style={{ color: "#94A3B8", fontSize: 13, fontWeight: 600 }}>Gracias por su preferencia</div>
              </div>
            )}
          </div>

          <div style={{ marginTop: "auto", padding: "8px 24px", background: "#fff", color: "#0F1A14", borderRadius: 20, fontSize: 11, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.5px", boxShadow: "0 4px 15px rgba(255,255,255,0.2)" }}>
            ¡Reserva en el Link!
          </div>
        </div>

        <button 
          onClick={copyText}
          style={{ width: "100%", marginTop: 24, padding: 15, background: "#F3F4F6", color: "#0F1A14", border: "1px solid #E5E7EB", borderRadius: 14, fontWeight: 800, fontSize: 15, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "background 0.2s" }}
        >
          <Icon name="copy" size={16} color="#0F1A14" /> Copiar Texto para WhatsApp
        </button>

      </motion.div>
    </div>
  );
}

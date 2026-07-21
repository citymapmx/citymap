import React, { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";

import Icon from "./ui/Icon.jsx";
import BookingManager from "./BookingManager.jsx";

const toLocalYYYYMMDD = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

import { useUIStore } from "../store/useUIStore.js";
import { getT } from "../lib/constants.js";
import { sb } from "../lib/supabase.js";

export default function ScheduleManagerModal({ biz, onClose, onUpdate }) {
  const dark = useUIStore(s => s.dark);
  const toast$ = useUIStore(s => s.toast$);
  const T = getT(dark);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState("blocked"); // blocked | schedule

  // Setup Schedule State
  const daysOrder = [
    { key: "lun", label: "Lunes" },
    { key: "mar", label: "Martes" },
    { key: "mie", label: "Miércoles" },
    { key: "jue", label: "Jueves" },
    { key: "vie", label: "Viernes" },
    { key: "sab", label: "Sábado" },
    { key: "dom", label: "Domingo" }
  ];
  
  const [schedule, setSchedule] = useState(biz.schedule || {});
  
  // Setup Blocked Slots State
  // Format: [ { date: "2026-06-16", time: "11:30" }, ... ]
  const initialBlocked = biz.booking_config?.blocked_slots || [];
  const [blockedSlots, setBlockedSlots] = useState(initialBlocked);
  
  const initialBlockedDates = biz.booking_config?.blocked_dates || [];
  const [blockedDates, setBlockedDates] = useState(initialBlockedDates);
  
  const [bookingConfig, setBookingConfig] = useState(biz.booking_config || {});
  
  const [date, setDate] = useState(() => toLocalYYYYMMDD(new Date()));

  const handleScheduleChange = (dayKey, val) => {
    setSchedule(prev => ({ ...prev, [dayKey]: val }));
  };

  const handleScheduleToggle = (dayKey) => {
    const current = schedule[dayKey];
    if (!current || /cerrado/i.test(current)) {
      setSchedule(prev => ({ ...prev, [dayKey]: "09:00 - 18:00" }));
    } else {
      setSchedule(prev => ({ ...prev, [dayKey]: "Cerrado" }));
    }
  };

  const handleTimeChange = (dayKey, type, val) => {
    const current = schedule[dayKey] || "09:00 - 18:00";
    if (/cerrado/i.test(current)) return;
    const parts = current.split(/\s*[–\-]\s*|\s+a\s+/i);
    const open = parts[0] || "09:00";
    const close = parts[1] || "18:00";
    if (type === "open") setSchedule(prev => ({ ...prev, [dayKey]: `${val} - ${close}` }));
    else setSchedule(prev => ({ ...prev, [dayKey]: `${open} - ${val}` }));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const updatedConfig = { ...bookingConfig, blocked_slots: blockedSlots, blocked_dates: blockedDates };
      await sb.patch("businesses", biz.id, {
        schedule,
        booking_config: updatedConfig
      });
      toast$("Horario actualizado");
      if (onUpdate) onUpdate({ ...biz, schedule, booking_config: updatedConfig });
      onClose();
    } catch (err) {
      toast$("Error al guardar agenda");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatTimeAMPM = (timeStr) => {
    const [h, m] = timeStr.split(":");
    let hh = parseInt(h);
    const ampm = hh >= 12 ? "PM" : "AM";
    if(hh === 0) hh = 12;
    if(hh > 12) hh -= 12;
    return `${hh}:${m} ${ampm}`;
  };

  // Generate slots for selected date based on current schedule
  const availableSlotsForDate = useMemo(() => {
    if (!date) return [];
    const d = new Date(date + "T12:00:00");
    const dayNames = ["dom", "lun", "mar", "mie", "jue", "vie", "sab"];
    const dayKey = dayNames[d.getDay()];
    
    const hours = schedule[dayKey];
    if (!hours || /cerrado/i.test(hours)) return [];

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

    const minDur = (biz.booking_config?.services && biz.booking_config.services.length > 0) 
      ? Math.min(...biz.booking_config.services.map(s => s.durationMin || 60)) 
      : 60;
    const dur = minDur; 
    let slots = [];

    for (let m = openMin; m + dur <= closeMin; m += minDur) {
      const hh = String(Math.floor(m / 60)).padStart(2, "0");
      const mm = String(m % 60).padStart(2, "0");
      slots.push(`${hh}:${mm}`);
    }

    return slots;
  }, [date, schedule]);

  const isBlocked = (time) => blockedSlots.some(b => b.date === date && b.time === time);

  const toggleBlockSlot = (time) => {
    if (isBlocked(time)) {
      setBlockedSlots(prev => prev.filter(b => !(b.date === date && b.time === time)));
    } else {
      setBlockedSlots(prev => [...prev, { date, time }]);
    }
  };

  const isDateBlocked = blockedDates.includes(date);
  const toggleBlockDate = () => {
    if (isDateBlocked) setBlockedDates(prev => prev.filter(d => d !== date));
    else setBlockedDates(prev => [...prev, date]);
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 10000, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={onClose}>
      <motion.div 
        initial={{ scale: 0.95, opacity: 0, y: 10 }} 
        animate={{ scale: 1, opacity: 1, y: 0 }} 
        onClick={e => e.stopPropagation()}
        style={{ background: "#fff", width: "100%", maxWidth: 500, borderRadius: 24, boxShadow: "0 10px 40px rgba(0,0,0,0.2)", maxHeight: "90vh", display: "flex", flexDirection: "column", overflow: "hidden" }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "24px 24px 16px" }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: "#0F1A14", margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
            <Icon name="settings" size={20} color={T.green} /> Configurar Agenda
          </h2>
          <button onClick={onClose} style={{ background: "#F3F4F6", border: "none", width: 44, height: 44, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><Icon name="x" size={14} color="#5A6872" /></button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "0 24px" }}>
        {/* Tabs */}
        <div style={{ display: "flex", background: T.bg, borderRadius: 12, padding: 4, marginBottom: 20, border: `1px solid ${T.border}` }}>
          <button onClick={() => setTab("blocked")} style={{ flex: 1, padding: "10px 0", background: tab === "blocked" ? T.white : "transparent", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 800, color: tab === "blocked" ? T.text : T.sub, cursor: "pointer", fontFamily: "inherit", boxShadow: tab === "blocked" ? T.shadow : "none", transition: "all 0.2s" }}>
            Bloquear Horas/Días
          </button>
          <button onClick={() => setTab("schedule")} style={{ flex: 1, padding: "10px 0", background: tab === "schedule" ? T.white : "transparent", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 800, color: tab === "schedule" ? T.text : T.sub, cursor: "pointer", fontFamily: "inherit", boxShadow: tab === "schedule" ? T.shadow : "none", transition: "all 0.2s" }}>
            Horarios del Negocio
          </button>
          <button onClick={() => setTab("booking")} style={{ flex: 1, padding: "10px 0", background: tab === "booking" ? T.white : "transparent", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 800, color: tab === "booking" ? T.text : T.sub, cursor: "pointer", fontFamily: "inherit", boxShadow: tab === "booking" ? T.shadow : "none", transition: "all 0.2s" }}>
            Reglas de Reserva
          </button>
        </div>

        <div style={{ marginBottom: 20 }}>
          {tab === "blocked" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div style={{ fontSize: 13, color: T.sub, marginBottom: 16, lineHeight: 1.5 }}>
                Usa esta sección para suspender citas en fechas específicas (días festivos, vacaciones o imprevistos).
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 800, color: "#0F1A14", marginBottom: 8 }}>Paso 1: Selecciona la fecha</label>
                <div style={{ display: "flex", gap: 10 }}>
                  <input 
                    type="date" 
                    value={date} 
                    min={toLocalYYYYMMDD(new Date())}
                    onChange={e => setDate(e.target.value)} 
                    style={{ flex: 1, padding: "12px", border: "1.5px solid #E4E8E4", borderRadius: 10, fontSize: 14, background: "#F9FAFB", color: T.text || "#0F1A14", fontFamily: "inherit" }} 
                  />
                  <button onClick={toggleBlockDate} style={{ padding: "0 16px", background: isDateBlocked ? "#FEE2E2" : "#fff", border: `1.5px solid ${isDateBlocked ? "#FCA5A5" : "#E4E8E4"}`, borderRadius: 10, color: isDateBlocked ? "#DC2626" : T.sub, fontWeight: 800, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, transition: "all 0.2s" }} className="press">
                    <Icon name="slash" size={14} color={isDateBlocked ? "#DC2626" : T.sub} />
                    {isDateBlocked ? "Día Suspendido" : "Suspender Día"}
                  </button>
                </div>
              </div>

              {!isDateBlocked ? (
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 800, color: "#0F1A14", marginBottom: 8 }}>Paso 2: Toca las horas para cancelarlas/bloquearlas en este día</label>
                  {availableSlotsForDate.length === 0 ? (
                    <div style={{ padding: 16, textAlign: "center", background: "#FEE2E2", color: "#991B1B", borderRadius: 12, fontSize: 13, fontWeight: 700 }}>
                      El negocio está marcado como Cerrado en tu "Horario Base" para este día.
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                      {availableSlotsForDate.map(time => {
                        const blocked = isBlocked(time);
                        return (
                          <button
                            key={time}
                            type="button"
                            onClick={() => toggleBlockSlot(time)}
                            style={{
                              flex: "1 0 calc(33.33% - 10px)",
                              padding: "12px 0",
                              border: `1.5px solid ${blocked ? "#FEE2E2" : "#E4E8E4"}`,
                              borderRadius: 12,
                              background: blocked ? "#FEF2F2" : "#fff",
                              color: blocked ? "#EF4444" : "#0F1A14",
                              fontWeight: 800,
                              fontSize: 13,
                              cursor: "pointer",
                              transition: "all 0.2s",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: 6
                            }}
                          >
                            {blocked && <Icon name="slash" size={14} color="#EF4444" />}
                            {formatTimeAMPM(time)}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  <div style={{ fontSize: 12, color: T.sub, marginTop: 12, display: "flex", gap: 16, justifyContent: "center" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}><div style={{ width: 12, height: 12, borderRadius: "50%", border: "1.5px solid #E4E8E4", background: "#fff" }}></div> Disponible</span>
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}><div style={{ width: 12, height: 12, borderRadius: "50%", background: "#FEF2F2", border: "1.5px solid #FEE2E2" }}></div> Bloqueado</span>
                  </div>
                </div>
              ) : (
                <div style={{ padding: "30px 20px", textAlign: "center", background: "#FEF2F2", border: "1.5px dashed #FCA5A5", borderRadius: 16, display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#FEE2E2", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
                    <Icon name="slash" size={24} color="#DC2626" />
                  </div>
                  <div style={{ fontWeight: 800, color: "#991B1B", fontSize: 16 }}>Día completo bloqueado</div>
                  <div style={{ fontSize: 13, color: "#B91C1C", marginTop: 4, maxWidth: 280, margin: "4px auto 0" }}>Los clientes no podrán ver disponibilidad ni reservar en esta fecha.</div>
                </div>
              )}
            </motion.div>
          )}

          {tab === "schedule" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div style={{ fontSize: 13, color: T.sub, marginBottom: 16, lineHeight: 1.5 }}>
                Establece tus horas de apertura y cierre. Usa el interruptor para marcar un día como <strong>Cerrado</strong>.
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                {daysOrder.map(day => {
                  const val = schedule[day.key] || "";
                  const isClosed = !val || /cerrado/i.test(val);
                  let open = "09:00";
                  let close = "18:00";
                  if (!isClosed) {
                    const parts = val.split(/\s*[–\-]\s*|\s+a\s+/i);
                    if (parts.length > 0) open = parts[0].trim().replace(/[^\d:]/g, '');
                    if (parts.length > 1) close = parts[1].trim().replace(/[^\d:]/g, '');
                    // Format to HH:MM so input type="time" accepts it
                    if (open.length === 4) open = "0" + open;
                    if (close.length === 4) close = "0" + close;
                  }

                  return (
                    <div key={day.key} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: `1px solid ${T.border}` }}>
                      <div style={{ width: 80, fontSize: 13, fontWeight: 800, color: T.text }}>{day.label}</div>
                      
                      <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8 }}>
                        {isClosed ? (
                          <div style={{ flex: 1, fontSize: 13, color: T.sub, fontStyle: "italic" }}>Cerrado</div>
                        ) : (
                          <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 6 }}>
                            <input 
                              type="time" 
                              value={open || "09:00"} 
                              onChange={e => handleTimeChange(day.key, "open", e.target.value)}
                              style={{ flex: 1, padding: "8px", border: "1.5px solid #E4E8E4", borderRadius: 8, fontSize: 13, background: "#fff", color: T.text || "#0F1A14", fontFamily: "inherit" }}
                            />
                            <span style={{ color: T.sub, fontSize: 12 }}>a</span>
                            <input 
                              type="time" 
                              value={close || "18:00"} 
                              onChange={e => handleTimeChange(day.key, "close", e.target.value)}
                              style={{ flex: 1, padding: "8px", border: "1.5px solid #E4E8E4", borderRadius: 8, fontSize: 13, background: "#fff", color: T.text || "#0F1A14", fontFamily: "inherit" }}
                            />
                          </div>
                        )}
                      </div>

                      {/* Toggle switch for Open/Closed */}
                      <div onClick={() => handleScheduleToggle(day.key)} style={{ width: 36, height: 20, borderRadius: 10, background: isClosed ? "#E5E7EB" : T.green, position: "relative", cursor: "pointer", transition: "0.2s", flexShrink: 0 }}>
                        <div style={{ position: "absolute", top: 2, left: isClosed ? 2 : 18, width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "0.2s", boxShadow: "0 1px 2px rgba(0,0,0,0.1)" }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {tab === "booking" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <BookingManager 
                bookingConfig={bookingConfig} 
                onChange={setBookingConfig} 
                T={T} 
              />
            </motion.div>
          )}
        </div>
        </div>

        <div style={{ padding: "16px 24px 24px", borderTop: `1px solid ${T.border}`, background: "#fff", zIndex: 10 }}>
          <button 
            onClick={handleSave} 
            disabled={loading}
            style={{ width: "100%", padding: 15, background: "#0F1A14", color: "#fff", border: "none", borderRadius: 12, fontWeight: 800, fontSize: 15, cursor: loading ? "default" : "pointer" }}
          >
            {loading ? "Guardando..." : "Guardar Agenda"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

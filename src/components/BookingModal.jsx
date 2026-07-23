import React, { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";

import Icon from "./ui/Icon.jsx";
import { getThumbUrl } from "../lib/utils.js";

const toLocalYYYYMMDD = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

import { useUIStore } from "../store/useUIStore.js";
import { useAuthStore } from "../store/useAuthStore.js";
import { getT } from "../lib/constants.js";
import { sb } from "../lib/supabase.js";

export default function BookingModal({ biz, onClose }) {
  const dark = useUIStore(s => s.dark);
  const toast$ = useUIStore(s => s.toast$);
  const user = useAuthStore(s => s.user);
  const T = getT(dark);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [submitError, setSubmitError] = useState("");

  // Form state
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [name, setName] = useState(user?.user_metadata?.name || "");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");

  const [existingRes, setExistingRes] = useState([]);
  const [fetchingSlots, setFetchingSlots] = useState(false);
  const [daysStrip, setDaysStrip] = useState([]);

  useEffect(() => {
    const arr = [];
    const today = new Date();
    for(let i = 0; i < 21; i++) { // 3 weeks
      const d = new Date();
      d.setDate(today.getDate() + i);
      arr.push(d);
    }
    setDaysStrip(arr);
    if (!date) setDate(toLocalYYYYMMDD(today));
  }, []); // eslint-disable-line

  const formatDayName = (d) => ["Do","Lu","Ma","Mi","Ju","Vi","Sá"][d.getDay()];
  const formatMonthName = (d) => ["Enero","Feb.","Marzo","Abril","Mayo","Jun.","Julio","Agosto","Sept.","Oct.","Nov.","Dic."][d.getMonth()];
  const selectedDateObj = date ? new Date(date + "T12:00:00") : new Date();

  const formatTimeAMPM = (timeStr) => {
    const [h, m] = timeStr.split(":");
    let hh = parseInt(h);
    const ampm = hh >= 12 ? "p.m." : "a.m.";
    if(hh === 0) hh = 12;
    if(hh > 12) hh -= 12;
    return `${hh}:${m} ${ampm}`;
  };

  const config = biz.booking_config || { enabled: false, services: [], maxPerSlot: 1, autoApprove: false };

  const selectedService = useMemo(() => {
    return Array.isArray(config.services) ? config.services.find(s => s.id === serviceId) : null;
  }, [config.services, serviceId]);

  const isAllDay = (parseInt(selectedService?.durationMin || 60, 10)) >= 1440;

  // Fetch reservations for the selected date to check capacity
  useEffect(() => {
    if (date && biz.id) {
      setFetchingSlots(true);
      setTime(""); // reset time when date changes
      sb.get("reservations", `?biz_id=eq.${biz.id}&date=eq.${date}`)
        .then(res => setExistingRes(res || []))
        .catch(() => setExistingRes([]))
        .finally(() => setFetchingSlots(false));
    } else {
      setExistingRes([]);
    }
  }, [date, biz.id, sb]);

  const availableSlots = useMemo(() => {
    if (!date || !selectedService || !biz.schedule) return [];
    
    try {
      const dur = parseInt(selectedService.durationMin || 60, 10);
      const isAllDay = dur >= 1440;
      const maxPerSlot = parseInt(config.maxPerSlot || 1, 10);

      if (isAllDay) {
        const activeRes = existingRes.filter(r => r.status !== "cancelled" && r.status !== "deleted");
        if (activeRes.length >= maxPerSlot) return [];
        return [{ time: "00:00", isFull: false, isPast: false, isOwnerBlocked: false, available: true }];
      }

      // Determine day of week for the schedule
      // Create date at noon to avoid timezone shift issues
      const d = new Date(date + "T12:00:00");
      const days = ["dom", "lun", "mar", "mie", "jue", "vie", "sab"];
      const dayKey = days[d.getDay()];
      const hours = biz.schedule[dayKey];
      
      if (!hours || /cerrado/i.test(hours)) return []; // Closed today

      // Parse "09:00 - 18:00"
      const segs = String(hours).split(/\s*[–\-]\s*|\s+a\s+/i);
      if (segs.length < 2) return [];

      const toMinutes = (timeStr) => {
        const m = String(timeStr || "").trim().match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
        if (!m) return null;
        let h = parseInt(m[1]);
        const min = parseInt(m[2] || 0);
        const p = (m[3] || "").toLowerCase();
        if (p === "pm" && h !== 12) h += 12;
        if (p === "am" && h === 12) h = 0;
        return h * 60 + min;
      };

      let openMin = toMinutes(segs[0]);
      let closeMin = toMinutes(segs[1]);
      
      if (openMin === null || closeMin === null) return [];

      // Handle closing times that pass midnight (e.g. 12:00am or 2:00am)
      if (closeMin <= openMin) {
        closeMin += 24 * 60; // Add 24 hours
      }

      // Restrict by service time range if available
      if (selectedService.timeRange) {
        const svcSegs = String(selectedService.timeRange).split(/\s*[–\-]\s*|\s+a\s+/i);
        if (svcSegs.length >= 2) {
          const svcOpen = toMinutes(svcSegs[0]);
          const svcClose = toMinutes(svcSegs[1]);
          if (svcOpen !== null) openMin = Math.max(openMin, svcOpen);
          if (svcClose !== null) closeMin = Math.min(closeMin, svcClose);
        }
      }

      const minDur = Array.isArray(config.services) && config.services.length > 0 
        ? Math.max(15, Math.min(...config.services.map(s => parseInt(s?.durationMin || 60, 10)))) 
        : 60;
      
      let slots = [];

      const existingRanges = [];
      if (Array.isArray(existingRes)) {
        existingRes.forEach(r => {
          if (r && r.status !== "cancelled" && r.status !== "deleted") {
            const resMin = toMinutes(r.time);
            if (resMin !== null) {
              const rSvc = (Array.isArray(config.services) ? config.services : []).find(s => s?.name === r.service || s?.id === r.service);
              const rDur = rSvc ? parseInt(rSvc.durationMin || 60, 10) : 60;
              existingRanges.push({ start: resMin, end: resMin + rDur });
            }
          }
        });
      }

      let slotMinutes = [];
      if (selectedService.fixedTimes) {
        const times = String(selectedService.fixedTimes).split(",").map(t => t.trim());
        times.forEach(t => {
          const m = toMinutes(t);
          if (m !== null) slotMinutes.push(m);
        });
      } else {
        for (let m = openMin; m + dur <= closeMin; m += minDur) {
          slotMinutes.push(m);
        }
      }

      const blockedSlots = Array.isArray(biz.booking_config?.blocked_slots) ? biz.booking_config.blocked_slots : [];

      slotMinutes.forEach(m => {
        const hh = String(Math.floor(m / 60)).padStart(2, "0");
        const mm = String(m % 60).padStart(2, "0");
        const slotTime = `${hh}:${mm}`;
        
        let overlapCount = 0;
        for (const rng of existingRanges) {
          if (m < rng.end && (m + dur) > rng.start) overlapCount++;
        }
        const isFull = overlapCount >= maxPerSlot;
        
        const today = new Date();
        const isToday = date === toLocalYYYYMMDD(today);
        const isPast = isToday && (m < (today.getHours() * 60 + today.getMinutes() + 30)); // Give a 30m buffer
        
        const isOwnerBlocked = blockedSlots.some(b => b.date === date && b.time === slotTime);

        slots.push({
          time: slotTime,
          isFull,
          isPast,
          isOwnerBlocked,
          available: !isFull && !isPast && !isOwnerBlocked
        });
      });

      return slots;
    } catch (err) {
      console.error("Error calculating availableSlots:", err);
      return [];
    }
  }, [date, selectedService, biz.schedule, existingRes, config.maxPerSlot, biz.booking_config?.blocked_slots]);

  useEffect(() => {
    if (isAllDay && availableSlots?.length > 0) {
      setTime("00:00");
    } else if (!isAllDay && time === "00:00") {
      setTime("");
    }
  }, [isAllDay, availableSlots, date]);

  const groupedSlots = useMemo(() => {
    const groups = { morning: [], afternoon: [], evening: [] };
    availableSlots.forEach(slot => {
      const h = parseInt(slot.time.split(":")[0]);
      if (h < 12) groups.morning.push(slot);
      else if (h < 18) groups.afternoon.push(slot);
      else groups.evening.push(slot);
    });
    return groups;
  }, [availableSlots]);

  const submitBooking = async (e) => {
    e.preventDefault();
    if (!date || !time || !name || !phone || !serviceId) {
      toast$("Por favor completa los campos requeridos");
      return;
    }
    
    setLoading(true);
    setSubmitError("");
    try {
      const status = config.autoApprove ? "confirmed" : "pending";
      
      const payload = {
        biz_id: biz.id,
        user_id: user?.id || null,
        client_name: name,
        client_phone: phone,
        date,
        time,
        service: selectedService.name,
        status,
        notes
      };

      await sb.post("reservations", payload);
      if (biz.owner_id) {
        await sb.notify(biz.owner_id, "Nueva solicitud de reservación", `${name} ha solicitado una reserva para el ${date}.`, "booking");
      }
      setSuccess(true);
    } catch (err) {
      setSubmitError(err.message || "Error al procesar reserva. Intenta de nuevo.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const notifyWhatsApp = () => {
    const bizPhone = biz.whatsapp || biz.phone;
    if (!bizPhone) {
      toast$("El negocio no tiene un número registrado.");
      onClose();
      return;
    }

    const cleanPhone = bizPhone.replace(/\D/g, "");
    const finalPhone = cleanPhone.startsWith("52") ? cleanPhone : `52${cleanPhone}`;

    const fmtT = (t) => {
      if (!t) return "";
      const [h, m] = t.split(":");
      let hh = parseInt(h);
      const ampm = hh >= 12 ? "PM" : "AM";
      if (hh === 0) hh = 12;
      if (hh > 12) hh -= 12;
      return `${hh}:${m} ${ampm}`;
    };

    const text = `¡Hola! Acabo de hacer una reservación en CityMap.
*Nombre:* ${name}
*Fecha:* ${date}
*Hora:* ${fmtT(time)}
*Servicio:* ${selectedService?.name || ""}
${notes ? `*Notas:* ${notes}` : ""}

¿Me podrían confirmar si la recibieron? ¡Gracias!`;

    const url = `https://wa.me/${finalPhone}?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
    onClose();
  };

  return (
    <div 
      style={{ position: "fixed", inset: 0, zIndex: 10000, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={onClose}
    >
      <motion.div 
        initial={{ scale: 0.95, opacity: 0, y: 10 }} 
        animate={{ scale: 1, opacity: 1, y: 0 }} 
        onClick={e => e.stopPropagation()}
        style={{ background: "#fff", width: "100%", maxWidth: 440, borderRadius: 24, padding: 24, boxShadow: "0 10px 40px rgba(0,0,0,0.2)", maxHeight: "90vh", overflowY: "auto" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, position: "relative" }}>
          {biz.logo_url ? (
            <img src={getThumbUrl(biz.logo_url, 150, 150)} style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover", border: "1.5px solid #E4E8E4", background: "#fff" }} alt="" />
          ) : (
            <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#EAF4F0", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon name="calendar" size={20} color="#1A7A5E" />
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: "#0F1A14", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{config.label || "Reservar"}</h2>
            <div style={{ fontSize: 12, color: "#5A6872", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{biz.name}</div>
          </div>
          <button onClick={onClose} style={{ background: "#F3F4F6", border: "none", width: 44, height: 44, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}><Icon name="x" size={14} color="#5A6872" /></button>
        </div>

        {success ? (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#DCFCE7", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <Icon name="check" size={32} color="#16A34A" />
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: "#0F1A14", marginBottom: 8 }}>¡{config.autoApprove ? "Reserva Confirmada" : "Solicitud enviada"}!</h3>
            <p style={{ fontSize: 14, color: "#5A6872", marginBottom: 24, lineHeight: 1.5 }}>
              {config.autoApprove 
                ? `Tu reserva para ${selectedService?.name} en ${biz.name} ha sido confirmada automáticamente. ¡Te esperan!` 
                : `Hemos enviado tu solicitud a ${biz.name}. Para agilizar tu reservación, te recomendamos avisarles por WhatsApp.`}
            </p>
            <button 
              onClick={notifyWhatsApp}
              style={{ width: "100%", padding: 14, background: "#25D366", color: "#fff", border: "none", borderRadius: 12, fontWeight: 800, fontSize: 15, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 12 }}
            >
              <Icon name="whatsapp" size={18} color="#fff" /> Avisar por WhatsApp
            </button>
            <button onClick={onClose} style={{ width: "100%", padding: 14, background: "transparent", color: "#5A6872", border: "none", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
              Cerrar
            </button>
          </div>
        ) : (
          <form onSubmit={submitBooking} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* 1. Servicio */}
            {Array.isArray(config.services) && config.services.length > 0 ? (
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 800, color: "#0F1A14", marginBottom: 8 }}>1. Selecciona el servicio</label>
                <div style={{ position: "relative" }}>
                  <select 
                    value={serviceId || ""} 
                    onChange={e => setServiceId(e.target.value)} 
                    style={{ width: "100%", padding: "14px 16px", border: "1.5px solid #E4E8E4", borderRadius: 12, fontSize: 14, fontWeight: 700, color: "#0F1A14", appearance: "none", background: "#F9FAFB", cursor: "pointer", fontFamily: "inherit" }}
                  >
                    <option value="" disabled>Selecciona una opción...</option>
                    {config.services.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name} {s.durationMin ? `(${s.durationMin} min)` : ""} {s.price && s.price !== "0" ? `- $${s.price}` : ""}
                      </option>
                    ))}
                  </select>
                  <div style={{ position: "absolute", right: 16, top: 16, pointerEvents: "none" }}>
                    <Icon name="chevron" size={16} color="#5A6872" />
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ padding: "20px", textAlign: "center", color: "#5A6872", background: "#F3F4F6", borderRadius: 12 }}>
                <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#E5E7EB", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Icon name="calendar" size={20} color="#9CA3AF" />
                  </div>
                </div>
                <div style={{ fontWeight: 700, color: "#0F1A14", fontSize: 14 }}>Aún no hay servicios disponibles</div>
                <div style={{ fontSize: 12, marginTop: 4 }}>Este negocio no ha configurado sus opciones de reserva. Por favor contacta directamente al lugar.</div>
              </div>
            )}
            
            {/* 2. Fecha y Hora */}
            {serviceId && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}>
                <div style={{ height: 1, background: "#E4E8E4", margin: "4px 0 16px 0" }} />
                
                {/* Month Label */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <h3 style={{ fontSize: 18, fontWeight: 900, color: "#0F1A14", margin: 0, textTransform: "capitalize" }}>{formatMonthName(selectedDateObj)} {selectedDateObj.getFullYear()}</h3>
                  <div style={{ fontSize: 12, color: "#5A6872", fontWeight: 700 }}>2. Selecciona Fecha</div>
                </div>
                
                {/* Day Strip */}
                <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 16, margin: "0 -4px", padding: "0 4px 16px 4px", scrollbarWidth: "none" }}>
                  {daysStrip.map(d => {
                    const localDate = toLocalYYYYMMDD(d);
                    const isSelected = date === localDate;
                    return (
                      <button
                        key={localDate}
                        type="button"
                        onClick={() => setDate(localDate)}
                        style={{
                          flexShrink: 0,
                          width: 56,
                          height: 72,
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          borderRadius: 16,
                          border: isSelected ? "none" : "1.5px solid #E4E8E4",
                          background: isSelected ? "#0F1A14" : "transparent",
                          color: isSelected ? "#fff" : "#0F1A14",
                          cursor: "pointer",
                          transition: "all 0.2s"
                        }}
                      >
                        <span style={{ fontSize: 12, fontWeight: 700, color: isSelected ? "#A1A1AA" : "#5A6872", marginBottom: 4 }}>{formatDayName(d)}</span>
                        <span style={{ fontSize: 18, fontWeight: 800 }}>{d.getDate()}</span>
                      </button>
                    );
                  })}
                </div>

                <div style={{ fontSize: 12, color: "#5A6872", textAlign: "center", paddingBottom: 16, borderBottom: "1px solid #E4E8E4", marginBottom: 16 }}>Las horas se muestran en tu horario local</div>

                {date && (
                  fetchingSlots ? (
                    <div style={{ textAlign: "center", padding: 20, color: "#9CA3AF", fontSize: 13 }}>Cargando disponibilidad...</div>
                  ) : (biz.booking_config?.blocked_dates || []).includes(date) ? (
                    <div style={{ textAlign: "center", padding: "12px", background: "#FEE2E2", color: "#991B1B", borderRadius: 10, fontSize: 13, fontWeight: 600 }}>
                      No hay espacios disponibles para esta fecha.
                    </div>
                  ) : availableSlots.length > 0 ? (
                    isAllDay ? (
                      <div style={{ textAlign: "center", padding: "16px", background: "#EAF4F0", border: "1.5px solid #1A7A5E", borderRadius: 12 }}>
                        <Icon name="check-circle" size={24} color="#1A7A5E" />
                        <div style={{ fontWeight: 800, color: "#1A7A5E", fontSize: 16, marginTop: 8 }}>Evento de Todo el Día</div>
                        <div style={{ fontSize: 13, color: "#0F1A14", marginTop: 4 }}>Esta reservación asegurará tu lugar para todo el turno de la fecha seleccionada.</div>
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                        
                        {groupedSlots.morning.length > 0 && (
                          <div>
                            <div style={{ fontSize: 12, color: "#5A6872", marginBottom: 8, fontWeight: 600 }}>Mañana</div>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                              {groupedSlots.morning.map(slot => (
                                <button key={slot.time} type="button" disabled={!slot.available} onClick={() => setTime(slot.time)} style={{ flex: "1 0 calc(33.33% - 8px)", padding: "12px 0", border: `1.5px solid ${time === slot.time ? "#0F1A14" : !slot.available ? "transparent" : "#E4E8E4"}`, borderRadius: 10, background: time === slot.time ? "#0F1A14" : !slot.available ? "#F3F4F6" : "transparent", color: time === slot.time ? "#fff" : !slot.available ? "#D1D5DB" : "#0F1A14", fontWeight: 800, fontSize: 13, cursor: slot.available ? "pointer" : "not-allowed", transition: "all 0.2s" }}>
                                  {formatTimeAMPM(slot.time)}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {groupedSlots.afternoon.length > 0 && (
                          <div>
                            <div style={{ fontSize: 12, color: "#5A6872", marginBottom: 8, fontWeight: 600 }}>Tarde</div>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                              {groupedSlots.afternoon.map(slot => (
                                <button key={slot.time} type="button" disabled={!slot.available} onClick={() => setTime(slot.time)} style={{ flex: "1 0 calc(33.33% - 8px)", padding: "12px 0", border: `1.5px solid ${time === slot.time ? "#0F1A14" : !slot.available ? "transparent" : "#E4E8E4"}`, borderRadius: 10, background: time === slot.time ? "#0F1A14" : !slot.available ? "#F3F4F6" : "transparent", color: time === slot.time ? "#fff" : !slot.available ? "#D1D5DB" : "#0F1A14", fontWeight: 800, fontSize: 13, cursor: slot.available ? "pointer" : "not-allowed", transition: "all 0.2s" }}>
                                  {formatTimeAMPM(slot.time)}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {groupedSlots.evening.length > 0 && (
                          <div>
                            <div style={{ fontSize: 12, color: "#5A6872", marginBottom: 8, fontWeight: 600 }}>Noche</div>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                              {groupedSlots.evening.map(slot => (
                                <button key={slot.time} type="button" disabled={!slot.available} onClick={() => setTime(slot.time)} style={{ flex: "1 0 calc(33.33% - 8px)", padding: "12px 0", border: `1.5px solid ${time === slot.time ? "#0F1A14" : !slot.available ? "transparent" : "#E4E8E4"}`, borderRadius: 10, background: time === slot.time ? "#0F1A14" : !slot.available ? "#F3F4F6" : "transparent", color: time === slot.time ? "#fff" : !slot.available ? "#D1D5DB" : "#0F1A14", fontWeight: 800, fontSize: 13, cursor: slot.available ? "pointer" : "not-allowed", transition: "all 0.2s" }}>
                                  {formatTimeAMPM(slot.time)}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                        
                      </div>
                    )
                  ) : (
                    <div style={{ textAlign: "center", padding: "12px", background: "#FEE2E2", color: "#991B1B", borderRadius: 10, fontSize: 13, fontWeight: 600 }}>
                      Cerrado o sin disponibilidad este día.
                    </div>
                  )
                )}
              </motion.div>
            )}

            {/* 3. Datos Personales */}
            {serviceId && time && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}>
                <div style={{ height: 1, background: "#E4E8E4", margin: "16px 0" }} />
                <label style={{ display: "block", fontSize: 12, fontWeight: 800, color: "#0F1A14", marginBottom: 12 }}>3. Tus Datos</label>
                
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#5A6872", marginBottom: 4, textTransform: "uppercase", letterSpacing: .6 }}>Nombre completo *</label>
                    <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Ej: Carlos Slim" style={{ width: "100%", padding: "12px", border: "1.5px solid #E4E8E4", borderRadius: 10, fontSize: 14, background: "#F9FAFB", color: T?.text || "#0F1A14", fontFamily: "inherit" }} required />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#5A6872", marginBottom: 4, textTransform: "uppercase", letterSpacing: .6 }}>Teléfono / WhatsApp *</label>
                    <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="Ej: 311 123 4567" style={{ width: "100%", padding: "12px", border: "1.5px solid #E4E8E4", borderRadius: 10, fontSize: 14, background: "#F9FAFB", color: T?.text || "#0F1A14", fontFamily: "inherit" }} required />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#5A6872", marginBottom: 4, textTransform: "uppercase", letterSpacing: .6 }}>Notas Adicionales</label>
                    <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Ej: Alergias, celebrar un cumpleaños..." rows={2} style={{ width: "100%", padding: "12px", border: "1.5px solid #E4E8E4", borderRadius: 10, fontSize: 14, background: "#F9FAFB", color: T?.text || "#0F1A14", fontFamily: "inherit", resize: "none" }} />
                  </div>
                </div>

                {submitError && (
                  <div style={{ padding: 12, background: "#FEE2E2", color: "#991B1B", borderRadius: 10, fontSize: 13, fontWeight: 600, marginTop: 16 }}>
                    {submitError}
                  </div>
                )}

                <button 
                  type="submit" 
                  disabled={loading || !date || !time || !name || !phone || !serviceId}
                  style={{ width: "100%", padding: 15, background: loading || !time ? "#9CA3AF" : "#1A7A5E", color: "#fff", border: "none", borderRadius: 12, fontWeight: 800, fontSize: 15, cursor: loading || !time ? "default" : "pointer", marginTop: 16 }}
                >
                  {loading ? "Procesando..." : config.autoApprove ? `Confirmar ${config.label || "Reservación"}` : `Solicitar ${config.label || "Reservación"}`}
                </button>
              </motion.div>
            )}
          </form>
        )}
      </motion.div>
    </div>
  );
}

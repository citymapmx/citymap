import React, { useState, useEffect, useMemo } from "react";
import { m } from "framer-motion";

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
  const [step, setStep] = useState(1);
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

  const formatTimeRange = (timeStr) => {
    const dur = parseInt(selectedService?.durationMin || 60, 10);
    const [h, m] = timeStr.split(":");
    let min = parseInt(h) * 60 + parseInt(m);
    
    const format = (mins) => {
      let hh = Math.floor(mins / 60);
      let mm = mins % 60;
      const ampm = hh >= 12 && hh < 24 ? "PM" : "AM";
      if (hh === 0) hh = 12;
      if (hh > 12) hh -= 12;
      return `${hh}:${String(mm).padStart(2, "0")} ${ampm}`;
    };
    
    return `${format(min)} - ${format(min + dur)}`;
  };

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
      const bufferMin = parseInt(config.bufferMin || 0, 10);
      const totalDur = dur + bufferMin;

      const existingRanges = [];
      if (Array.isArray(existingRes)) {
        existingRes.forEach(r => {
          if (r && r.status !== "cancelled" && r.status !== "deleted") {
            const resMin = toMinutes(r.time);
            if (resMin !== null) {
              const rSvc = (Array.isArray(config.services) ? config.services : []).find(s => s?.name === r.service || s?.id === r.service);
              const rDur = rSvc ? parseInt(rSvc.durationMin || 60, 10) : 60;
              existingRanges.push({ start: resMin, end: resMin + rDur + bufferMin });
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
          if (m < rng.end && (m + totalDur) > rng.start) overlapCount++;
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
        p_biz_id: biz.id,
        p_user_id: user?.id || null,
        p_client_name: name,
        p_client_phone: phone,
        p_date: date,
        p_time: time,
        p_service: selectedService.name,
        p_status: status,
        p_notes: notes || "",
        p_max_per_slot: config.maxPerSlot || 1
      };

      const result = await sb.rpc("secure_reserve", payload);
      if (result && result.success === false) {
        throw new Error(result.error || "El horario ya no está disponible.");
      }
      if (biz.owner_id) {
        await sb.notify(biz.owner_id, "Nueva solicitud de reservación", `${name} ha solicitado una reserva para el ${date}.`, "booking", `https://citymap.mx/manage/${biz.slug || biz.id}`);
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

  const formatDuration = (mins) => {
    if (!mins) return "";
    if (mins < 60) return `${mins} min`;
    if (mins >= 1440) return "Día completo";
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (m === 0) return `${h} hora${h > 1 ? "s" : ""}`;
    return `${h}h ${m}m`;
  };

  return (
    <div 
      style={{ position: "fixed", inset: 0, zIndex: 10000, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={onClose}
    >
      <m.div 
        initial={{ scale: 0.95, opacity: 0, y: 10 }} 
        animate={{ scale: 1, opacity: 1, y: 0 }} 
        onClick={e => e.stopPropagation()}
        style={{ background: "#ffffff", border: "1px solid rgba(0,0,0,0.05)", width: "100%", maxWidth: 440, borderRadius: 28, padding: 24, boxShadow: "0 24px 60px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.02)", maxHeight: "90vh", overflowY: "auto" }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, position: "relative" }}>
          <div style={{ width: 48, height: 48 }} />
          <div style={{ flex: 1, textAlign: "center", padding: "0 12px" }}>
            <h2 style={{ fontSize: 20, fontWeight: 900, color: "#0F1A14", margin: 0, letterSpacing: "-0.5px" }}>{config.label || "Reservar"}</h2>
            <div style={{ fontSize: 13, color: "#5A6872", marginTop: 2, fontWeight: 600 }}>{biz.name}</div>
          </div>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.6)", backdropFilter: "blur(4px)", border: "1px solid rgba(0,0,0,0.05)", width: 40, height: 40, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0, boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}><Icon name="x" size={14} color="#0F1A14" /></button>
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
            {step === 1 && (
              <m.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>
                {Array.isArray(config.services) && config.services.length > 0 ? (
                  <div style={{ marginBottom: 8 }}>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 800, color: "#5A6872", marginBottom: 16, textAlign: "center", textTransform: "uppercase", letterSpacing: "0.5px" }}>1. Selecciona el servicio</label>
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      {config.services.map((s, i) => {
                        const isSelected = serviceId === s.id;
                        return (
                          <m.button
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                            key={s.id}
                            type="button"
                            onClick={() => setServiceId(s.id)}
                            style={{
                              width: "100%", textAlign: "left", padding: "18px", borderRadius: 20,
                              border: isSelected ? "1px solid rgba(16, 185, 129, 0.4)" : "1px solid rgba(0,0,0,0.05)",
                              background: isSelected ? "linear-gradient(135deg, rgba(240,253,244,0.9), rgba(220,252,231,0.6))" : "#ffffff",
                              backdropFilter: "blur(10px)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between",
                              transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                              boxShadow: isSelected ? "0 8px 24px rgba(16, 185, 129, 0.15), inset 0 2px 4px rgba(255,255,255,0.8)" : "0 4px 12px rgba(0,0,0,0.03), inset 0 2px 4px rgba(255,255,255,0.8)",
                              transform: isSelected ? "scale(1.02)" : "scale(1)"
                            }}
                          >
                            <div>
                              <div style={{ fontSize: 16, fontWeight: 800, color: isSelected ? "#064E3B" : "#0F1A14", marginBottom: 6 }}>{s.name}</div>
                              <div style={{ fontSize: 13, color: isSelected ? "#047857" : "#64748B", display: "flex", gap: 12, fontWeight: 600 }}>
                                {s.durationMin && <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Icon name="clock" size={14} color={isSelected ? "#047857" : "#94A3B8"} />{formatDuration(s.durationMin)}</span>}
                                {s.price && s.price !== "0" && <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Icon name="credit-card" size={14} color={isSelected ? "#047857" : "#94A3B8"} />${s.price}</span>}
                              </div>
                            </div>
                            <div style={{
                              width: 28, height: 28, borderRadius: "50%",
                              border: isSelected ? "none" : "2px solid rgba(15,26,20,0.15)",
                              background: isSelected ? "linear-gradient(135deg, #34D399, #10B981)" : "rgba(255,255,255,0.5)",
                              display: "flex", alignItems: "center", justifyContent: "center",
                              boxShadow: "none",
                              transition: "all 0.3s"
                            }}>
                              {isSelected && <Icon name="check" size={16} color="#FFF" />}
                            </div>
                          </m.button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: "30px 20px", textAlign: "center", color: "#5A6872", background: "rgba(255,255,255,0.5)", backdropFilter: "blur(10px)", borderRadius: 20, border: "1px solid rgba(255,255,255,0.5)" }}>
                    <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
                      <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(255,255,255,0.8)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>
                        <Icon name="calendar" size={24} color="#9CA3AF" />
                      </div>
                    </div>
                    <div style={{ fontWeight: 800, color: "#0F1A14", fontSize: 16 }}>Aún no hay servicios disponibles</div>
                    <div style={{ fontSize: 13, marginTop: 6, fontWeight: 500 }}>Este negocio no ha configurado sus opciones de reserva. Por favor contacta directamente al lugar.</div>
                  </div>
                )}
              </m.div>
            )}

            {/* 2. Fecha y Hora */}
            {step === 2 && (
              <m.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 800, color: "#5A6872", marginBottom: 16, textAlign: "center", textTransform: "uppercase", letterSpacing: "0.5px" }}>2. Selecciona Fecha y Hora</label>
                
                {/* Month Label */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, padding: "0 4px" }}>
                  <h3 style={{ fontSize: 20, fontWeight: 900, color: "#0F1A14", margin: 0, textTransform: "capitalize", letterSpacing: "-0.5px" }}>{formatMonthName(selectedDateObj)} {selectedDateObj.getFullYear()}</h3>
                </div>
                
                {/* Day Strip */}
                <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 16, margin: "0 -4px", padding: "0 4px 16px 4px", scrollbarWidth: "none" }}>
                  <style>{`.no-scroll-bar::-webkit-scrollbar { display: none; }`}</style>
                  {daysStrip.map((d, i) => {
                    const localDate = toLocalYYYYMMDD(d);
                    const isSelected = date === localDate;
                    return (
                      <m.button
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.02 }}
                        key={localDate}
                        type="button"
                        onClick={() => setDate(localDate)}
                        style={{
                          flexShrink: 0, width: 64, height: 84, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", borderRadius: 24,
                          border: isSelected ? "2px solid #0F1A14" : "2px solid rgba(15,26,20,0.15)",
                          background: isSelected ? "#0F1A14" : "#ffffff",
                          color: isSelected ? "#fff" : "#0F1A14", cursor: "pointer",
                          transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                          boxShadow: "none",
                          transform: isSelected ? "scale(1.05)" : "scale(1)"
                        }}
                      >
                        <span style={{ fontSize: 13, fontWeight: 700, color: isSelected ? "rgba(255,255,255,0.8)" : "#64748B", marginBottom: 6 }}>{formatDayName(d)}</span>
                        <span style={{ fontSize: 20, fontWeight: 900 }}>{d.getDate()}</span>
                      </m.button>
                    );
                  })}
                </div>

                <div style={{ fontSize: 12, color: "#64748B", textAlign: "center", paddingBottom: 16, borderBottom: "1px solid rgba(0,0,0,0.05)", marginBottom: 16, fontWeight: 600 }}>Las horas se muestran en tu horario local</div>

                <div style={{ minHeight: 260 }}>
                  {date && (
                    fetchingSlots ? (
                      <div style={{ textAlign: "center", padding: "40px 20px", color: "#9CA3AF", fontSize: 14, fontWeight: 600 }}>
                        <Icon name="clock" size={24} color="#D1D5DB" style={{ marginBottom: 12, display: "block", margin: "0 auto" }} />
                        Cargando disponibilidad...
                      </div>
                    ) : (biz.booking_config?.blocked_dates || []).includes(date) ? (
                    <div style={{ textAlign: "center", padding: "20px", background: "rgba(254, 226, 226, 0.8)", backdropFilter: "blur(10px)", color: "#991B1B", borderRadius: 16, fontSize: 14, fontWeight: 700, border: "1px solid rgba(254, 226, 226, 0.9)" }}>
                      No hay espacios disponibles para esta fecha.
                    </div>
                  ) : availableSlots.length > 0 ? (
                    isAllDay ? (
                      <div style={{ textAlign: "center", padding: "24px", background: "linear-gradient(135deg, rgba(240,253,244,0.9), rgba(220,252,231,0.6))", border: "1px solid rgba(16, 185, 129, 0.4)", borderRadius: 20, backdropFilter: "blur(10px)", boxShadow: "0 8px 24px rgba(16, 185, 129, 0.1)" }}>
                        <div style={{ width: 48, height: 48, borderRadius: "50%", background: "linear-gradient(135deg, #34D399, #10B981)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px", boxShadow: "0 4px 10px rgba(16,185,129,0.3)" }}>
                          <Icon name="check" size={24} color="#FFF" />
                        </div>
                        <div style={{ fontWeight: 900, color: "#064E3B", fontSize: 18, marginTop: 8 }}>Evento de Todo el Día</div>
                        <div style={{ fontSize: 14, color: "#047857", marginTop: 6, fontWeight: 600, lineHeight: 1.4 }}>Esta reservación asegurará tu lugar para todo el turno de la fecha seleccionada.</div>
                      </div>
                    ) : (
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                        {availableSlots.map((slot, i) => (
                          <m.button
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: i * 0.02 }}
                            key={slot.time}
                            type="button"
                            disabled={!slot.available}
                            onClick={() => setTime(slot.time)}
                            style={{
                              width: "100%", padding: "14px 8px",
                              border: time === slot.time ? "2px solid #0F1A14" : !slot.available ? "2px solid rgba(0,0,0,0.03)" : "2px solid rgba(15,26,20,0.15)",
                              borderRadius: 18,
                              background: time === slot.time ? "#ffffff" : !slot.available ? "rgba(0,0,0,0.02)" : "#ffffff",
                              display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: 4,
                              cursor: slot.available ? "pointer" : "not-allowed",
                              transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                              boxShadow: "none",
                              color: !slot.available ? "#D1D5DB" : (time === slot.time ? "#064E3B" : "#0F1A14"),
                              transform: time === slot.time ? "scale(1.05)" : "scale(1)"
                            }}
                          >
                            <span style={{ fontSize: 15, fontWeight: time === slot.time ? 900 : 700, letterSpacing: "-0.5px" }}>
                              {formatTimeAMPM(slot.time)}
                            </span>
                            {time === slot.time ? (
                              <span style={{ fontSize: 11, fontWeight: 800, color: "#10B981" }}>Elegido</span>
                            ) : (
                              <span style={{ fontSize: 11, color: !slot.available ? "#D1D5DB" : "#64748B", fontWeight: 600 }}>
                                {formatTimeRange(slot.time).split(" - ")[1]}
                              </span>
                            )}
                          </m.button>
                        ))}
                      </div>
                    )
                  ) : (
                    <div style={{ textAlign: "center", padding: "20px", background: "rgba(254, 226, 226, 0.8)", backdropFilter: "blur(10px)", color: "#991B1B", borderRadius: 16, fontSize: 14, fontWeight: 700, border: "1px solid rgba(254, 226, 226, 0.9)" }}>
                      Cerrado o sin disponibilidad este día.
                    </div>
                  )
                )}
                </div>
              </m.div>
            )}

            {/* 3. Datos Personales */}
            {step === 3 && (
              <m.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 800, color: "#5A6872", marginBottom: 20, textAlign: "center", textTransform: "uppercase", letterSpacing: "0.5px" }}>3. Tus Datos</label>
                
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 800, color: "#0F1A14", marginBottom: 6, letterSpacing: "0.5px" }}>Nombre completo *</label>
                    <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Ej: Carlos Slim" style={{ width: "100%", padding: "16px", border: "2px solid rgba(15,26,20,0.15)", borderRadius: 16, fontSize: 15, background: "#ffffff", color: T?.text || "#0F1A14", fontFamily: "inherit", fontWeight: 600, boxShadow: "none", outline: "none", transition: "all 0.2s" }} onFocus={e => e.target.style.border="2px solid #0F1A14"} onBlur={e => e.target.style.border="2px solid rgba(15,26,20,0.15)"} required />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 800, color: "#0F1A14", marginBottom: 6, letterSpacing: "0.5px" }}>Teléfono / WhatsApp *</label>
                    <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="Ej: 311 123 4567" style={{ width: "100%", padding: "16px", border: "2px solid rgba(15,26,20,0.15)", borderRadius: 16, fontSize: 15, background: "#ffffff", color: T?.text || "#0F1A14", fontFamily: "inherit", fontWeight: 600, boxShadow: "none", outline: "none", transition: "all 0.2s" }} onFocus={e => e.target.style.border="2px solid #0F1A14"} onBlur={e => e.target.style.border="2px solid rgba(15,26,20,0.15)"} required />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 800, color: "#0F1A14", marginBottom: 6, letterSpacing: "0.5px" }}>Notas Adicionales</label>
                    <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Ej: Alergias, celebrar un cumpleaños..." rows={2} style={{ width: "100%", padding: "16px", border: "2px solid rgba(15,26,20,0.15)", borderRadius: 16, fontSize: 15, background: "#ffffff", color: T?.text || "#0F1A14", fontFamily: "inherit", fontWeight: 600, boxShadow: "none", outline: "none", transition: "all 0.2s", resize: "none" }} onFocus={e => e.target.style.border="2px solid #0F1A14"} onBlur={e => e.target.style.border="2px solid rgba(15,26,20,0.15)"} />
                  </div>
                </div>

                {submitError && (
                  <div style={{ padding: "16px", background: "rgba(254, 226, 226, 0.8)", backdropFilter: "blur(10px)", color: "#991B1B", borderRadius: 16, fontSize: 14, fontWeight: 700, marginTop: 20, border: "1px solid rgba(254, 226, 226, 0.9)" }}>
                    {submitError}
                  </div>
                )}
              </m.div>
            )}

            {/* Pagination Controls */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 12, paddingTop: 20, borderTop: "1px solid rgba(0,0,0,0.05)" }}>
              {step > 1 ? (
                <button type="button" onClick={() => setStep(step - 1)} style={{ padding: "12px 20px", background: "#ffffff", border: "2px solid rgba(15,26,20,0.15)", borderRadius: 20, fontSize: 14, fontWeight: 800, color: "#0F1A14", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, boxShadow: "none" }}>
                  <Icon name="chevron-left" size={16} /> Atrás
                </button>
              ) : (
                <div style={{ width: 80 }} />
              )}
              
              <div style={{ display: "flex", gap: 6 }}>
                {[1, 2, 3].map(i => (
                  <div key={i} style={{ width: i === step ? 24 : 8, height: 8, borderRadius: 4, background: i === step ? "#10B981" : "rgba(0,0,0,0.1)", transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)" }} />
                ))}
              </div>

              {step < 3 ? (
                <button 
                  type="button" 
                  disabled={(step === 1 && !serviceId) || (step === 2 && (!date || !time))}
                  onClick={() => setStep(step + 1)} 
                  style={{ padding: "12px 24px", background: (step === 1 && !serviceId) || (step === 2 && (!date || !time)) ? "rgba(0,0,0,0.05)" : "#0F1A14", border: "none", borderRadius: 20, fontSize: 14, fontWeight: 800, color: (step === 1 && !serviceId) || (step === 2 && (!date || !time)) ? "#9CA3AF" : "#fff", cursor: (step === 1 && !serviceId) || (step === 2 && (!date || !time)) ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 6, boxShadow: "none", transition: "all 0.2s" }}
                >
                  Siguiente <Icon name="chevron-right" size={16} color={(step === 1 && !serviceId) || (step === 2 && (!date || !time)) ? "#9CA3AF" : "#fff"} />
                </button>
              ) : (
                <button 
                  type="submit" 
                  disabled={loading || !date || !time || !name || !phone || !serviceId}
                  style={{ padding: "12px 24px", background: loading || !name || !phone ? "rgba(0,0,0,0.05)" : "linear-gradient(135deg, #10B981, #059669)", border: "none", borderRadius: 20, fontSize: 14, fontWeight: 800, color: loading || !name || !phone ? "#9CA3AF" : "#fff", cursor: loading || !name || !phone ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 6, boxShadow: loading || !name || !phone ? "none" : "0 8px 20px rgba(16,185,129,0.3)", transition: "all 0.2s" }}
                >
                  {loading ? "Enviando..." : config.autoApprove ? "Confirmar" : "Solicitar"}
                </button>
              )}
            </div>
          </form>
        )}
      </m.div>
    </div>
  );
}

import React, { useState, useMemo, useEffect, useRef } from "react";

import Icon from "./ui/Icon.jsx";
import ScheduleManagerModal from "./ScheduleManagerModal.jsx";
import StoryExportModal from "./StoryExportModal.jsx";
import { getLocalIsoDate } from "../lib/utils.js";

const DIRS = ["D", "L", "M", "M", "J", "V", "S"];
const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

import { useUIStore } from "../store/useUIStore.js";
import { getT } from "../lib/constants.js";
import { sb } from "../lib/supabase.js";

export default function ReservationsAgenda({ ownerView, ownerRes, setOwnerRes }) {
  const dark = useUIStore(s => s.dark);
  const toast$ = useUIStore(s => s.toast$);
  const T = getT(dark);
  const [showConfig, setShowConfig] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [bizCopy, setBizCopy] = useState({ ...ownerView, booking_config: ownerView.booking_config, schedule: ownerView.schedule });
  
  const todayStr = getLocalIsoDate(new Date());
  const [selectedDate, setSelectedDate] = useState(todayStr);

  const activeRes = ownerRes.filter(r => r.status !== "deleted");

  // Get days strip (e.g. 15 days: 3 back, 11 forward)
  const daysStrip = useMemo(() => {
    const list = [];
    const baseDate = new Date();
    baseDate.setDate(baseDate.getDate() - 3); // Start 3 days ago
    for (let i = 0; i < 15; i++) {
      const d = new Date(baseDate);
      d.setDate(d.getDate() + i);
      const iso = getLocalIsoDate(d);
      list.push({
        iso,
        dayOfWeek: DIRS[d.getDay()],
        dayNum: d.getDate(),
        month: MONTHS[d.getMonth()]
      });
    }
    return list;
  }, []);

  const selectedDateObj = new Date(selectedDate + "T12:00:00");
  const isToday = selectedDate === todayStr;
  const FULL_DIRS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
  const FULL_MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

  const headerDateText = isToday 
    ? `Hoy ${FULL_DIRS[selectedDateObj.getDay()]} ${selectedDateObj.getDate()} de ${FULL_MONTHS[selectedDateObj.getMonth()]}`
    : `${FULL_DIRS[selectedDateObj.getDay()].charAt(0).toUpperCase() + FULL_DIRS[selectedDateObj.getDay()].slice(1)} ${selectedDateObj.getDate()} de ${FULL_MONTHS[selectedDateObj.getMonth()]}`;

  const selectedRes = activeRes.filter(r => r.date === selectedDate);
  const pending = selectedRes.filter(r => r.status === "pending").sort((a,b) => new Date(`${a.date}T${a.time}`) - new Date(`${b.date}T${b.time}`));
  const upcoming = selectedRes.filter(r => r.status === "confirmed").sort((a,b) => new Date(`${a.date}T${a.time}`) - new Date(`${b.date}T${b.time}`));
  const history = selectedRes.filter(r => r.status === "cancelled").sort((a,b) => new Date(`${b.date}T${b.time}`) - new Date(`${a.date}T${a.time}`));
  const pendingCount = pending.length;

  const formatTimeAMPM = (timeStr) => {
    if (!timeStr) return "";
    const [h, m] = timeStr.split(":");
    let hh = parseInt(h);
    const ampm = hh >= 12 ? "PM" : "AM";
    if(hh === 0) hh = 12;
    if(hh > 12) hh -= 12;
    return `${hh}:${m} ${ampm}`;
  };

  const updateStatus = async (id, status) => {
    try {
      await sb.patch("reservations", id, { status });
      setOwnerRes(prev => prev.map(r => r.id === id ? { ...r, status } : r));
      toast$(`Reserva ${status === 'confirmed' ? 'confirmada' : 'cancelada'}`);
      
      const resData = ownerRes.find(r => r.id === id);
      if (resData && resData.user_id) {
        await sb.notify(resData.user_id, `Reserva ${status === 'confirmed' ? 'Confirmada' : 'Cancelada'}`, `Tu reserva en ${ownerView.name} ha sido ${status === 'confirmed' ? 'confirmada' : 'cancelada'}.`, status === 'confirmed' ? 'approval' : 'alert');
      }
    } catch (err) {
      toast$("Error al actualizar");
      console.error(err);
    }
  };

  const deleteRes = async (id) => {
    if(!window.confirm("¿Seguro que deseas eliminar permanentemente esta reservación?")) return;
    try {
      await sb.patch("reservations", id, { status: "deleted" });
      setOwnerRes(prev => prev.filter(r => r.id !== id));
      toast$("Reservación eliminada");
    } catch (err) {
      toast$("Error al eliminar");
      console.error(err);
    }
  };

  const getWhatsAppLink = (r, type) => {
    const clientPhone = (r.client_phone || "").replace(/\D/g, "");
    if (!clientPhone) return null;
    const phone = clientPhone.startsWith("52") ? clientPhone : `52${clientPhone}`;
    let text = "";
    if (type === "confirm") {
      text = `¡Hola ${r.client_name}! Tu reservación en ${ownerView.name} está *CONFIRMADA*.\nFecha: ${r.date}\nHora: ${formatTimeAMPM(r.time)}\n${r.service ? `Servicio: ${r.service}` : ""}\n\n¡Te esperamos! Cualquier duda, contáctanos por aquí.`;
    } else if (type === "reminder") {
      text = `¡Hola ${r.client_name}! Solo paso a recordarte que tienes una reservación con nosotros hoy en ${ownerView.name}.\nTe esperamos a las ${formatTimeAMPM(r.time)}.\n\n¿Nos confirmas tu asistencia por favor?`;
    } else if (type === "cancel") {
      text = `Hola ${r.client_name}. Te escribimos de ${ownerView.name}.\nLamentablemente no tenemos disponibilidad para tu reservación el ${r.date} a las ${formatTimeAMPM(r.time)}.\n\n¿Te gustaría reprogramar para otro día u horario?`;
    }
    return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
  };

  const PendingCard = ({ r }) => {
    const waLinkConfirm = getWhatsAppLink(r, "confirm");
    const waLinkCancel = getWhatsAppLink(r, "cancel");
    return (
      <div style={{ background: "#FFFBF0", border: "1.5px solid #FDE68A", borderRadius: 16, padding: 16, marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
          <div style={{ fontWeight: 800, fontSize: 18, color: T.text, lineHeight: 1.2 }}>{r.client_name}</div>
          <div style={{ fontWeight: 800, fontSize: 16, color: T.text }}>{formatTimeAMPM(r.time)}</div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 16 }}>
          <div style={{ fontSize: 13, color: T.sub, display: "flex", flexWrap: "wrap", gap: 4 }}>
            {r.client_phone && <span>{r.client_phone}</span>}
            {r.client_phone && r.service && <span>·</span>}
            {r.service && <span>{r.service}</span>}
          </div>
          <div style={{ fontSize: 12, fontWeight: 800, color: "#D97706", textTransform: "uppercase", letterSpacing: 0.5 }}>Pendiente</div>
        </div>
        {r.notes && <div style={{ fontSize: 13, color: "#92400E", background: "rgba(217,119,6,0.1)", padding: "8px 12px", borderRadius: 8, marginBottom: 16, fontStyle: "italic" }}>"{r.notes}"</div>}
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => { updateStatus(r.id, "confirmed"); if(waLinkConfirm) window.open(waLinkConfirm, "_blank"); }} style={{ flex: 1, padding: "10px 0", background: "#10B981", border: "none", borderRadius: 12, fontSize: 14, fontWeight: 700, color: "#fff", cursor: "pointer", fontFamily: "inherit", display: "flex", justifyContent: "center", alignItems: "center", gap: 6 }} className="press"><Icon name="check" size={16} color="#fff" /> Confirmar</button>
          <button onClick={() => { updateStatus(r.id, "cancelled"); if(waLinkCancel) window.open(waLinkCancel, "_blank"); }} style={{ flex: 1, padding: "10px 0", background: T.white, border: `1.5px solid #E2E8F0`, borderRadius: 12, fontSize: 14, fontWeight: 700, color: T.sub, cursor: "pointer", fontFamily: "inherit" }} className="press">Rechazar</button>
        </div>
      </div>
    );
  };

  const ConfirmedCard = ({ r }) => {
    const waLinkReminder = getWhatsAppLink(r, "reminder");
    return (
      <div style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: 16, padding: "16px", marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
             <div style={{ width: 36, height: 36, borderRadius: 10, background: "#DCFCE7", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
               <Icon name="check" size={18} color="#16A34A" />
             </div>
             <div style={{ fontWeight: 800, fontSize: 18, color: T.text, lineHeight: 1.2 }}>{r.client_name}</div>
          </div>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
             <div style={{ fontWeight: 800, fontSize: 16, color: T.text }}>{formatTimeAMPM(r.time)}</div>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 16, paddingLeft: 46 }}>
          <div style={{ fontSize: 13, color: T.sub, display: "flex", flexWrap: "wrap", gap: 4 }}>
             {r.client_phone && <span>{r.client_phone}</span>}
             {r.client_phone && r.service && <span>·</span>}
             {r.service && <span>{r.service}</span>}
          </div>
          <div style={{ fontSize: 12, fontWeight: 800, color: "#16A34A", textTransform: "uppercase", letterSpacing: 0.5 }}>Confirmada</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {waLinkReminder && <button onClick={() => window.open(waLinkReminder, "_blank")} style={{ flex: 1, padding: "10px 0", background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 10, fontSize: 13, fontWeight: 700, color: "#16A34A", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }} className="press"><Icon name="whatsapp" size={14} color="#16A34A" /> Recordar</button>}
          <button onClick={() => updateStatus(r.id, "cancelled")} style={{ flex: 1, padding: "10px 0", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 10, fontSize: 13, fontWeight: 700, color: "#DC2626", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }} className="press"><Icon name="x" size={14} color="#DC2626" /> Cancelar</button>
        </div>
      </div>
    );
  };

  const HistoryCard = ({ r }) => {
    return (
      <div style={{ background: "#F8FAFC", border: "1px dashed #CBD5E1", borderRadius: 12, padding: "10px 14px", marginBottom: 8, display: "flex", alignItems: "center", gap: 10 }}>
        <Icon name="x" size={14} color="#94A3B8" />
        <div style={{ flex: 1, fontSize: 13, color: "#64748B", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          Cancelada: <b>{r.client_name}</b> a las {formatTimeAMPM(r.time)}
        </div>
        <button onClick={() => deleteRes(r.id)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}><Icon name="trash" size={14} color="#94A3B8" /></button>
      </div>
    );
  };

  // Auto-scroll to today in the dates strip on mount
  const scrollRef = useRef(null);
  useEffect(() => {
    if (scrollRef.current) {
      const activeEl = scrollRef.current.querySelector('[data-active="true"]');
      if (activeEl) {
        activeEl.scrollIntoView({ inline: "center", behavior: "smooth", block: "nearest" });
      }
    }
  }, []);

  return (
    <div style={{ marginBottom: 24 }}>
      {/* Top Actions */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, padding: "0 4px" }}>
        <button onClick={() => setShowExport(true)} style={{ flex: 1, background: "#10B981", border: "none", padding: "12px", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontSize: 13, fontWeight: 800, color: "#fff", cursor: "pointer", boxShadow: "0 4px 12px rgba(16,185,129,0.2)" }} className="press">
          <Icon name="whatsapp" size={16} color="#fff" /> Compartir Espacios
        </button>
        <button onClick={() => setShowConfig(true)} style={{ background: T.white, border: `1px solid ${T.border}`, padding: "12px", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontSize: 13, fontWeight: 700, color: T.text, cursor: "pointer", boxShadow: T.shadow }} className="press">
          <Icon name="settings" size={16} color={T.sub} /> Configurar Agenda
        </button>
      </div>

      {/* Main Agenda Card */}
      <div style={{ background: T.white, borderRadius: 20, padding: "20px 16px", boxShadow: "0 8px 30px rgba(0,0,0,0.04)", border: `1px solid ${T.border}` }}>
        
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: "#FFF1E5", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon name="calendar" size={20} color="#EA580C" />
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, color: T.text, lineHeight: 1.2 }}>Reservas</div>
              <div style={{ fontSize: 13, color: T.sub }}>{headerDateText}</div>
            </div>
          </div>
          {pendingCount > 0 && (
            <div style={{ background: "#FFFBEB", border: "1px solid #FDE68A", color: "#D97706", padding: "6px 12px", borderRadius: 20, fontSize: 12, fontWeight: 800 }}>
              {pendingCount} por revisar
            </div>
          )}
        </div>

        {/* Date Picker Strip */}
        <div style={{ margin: "0 -16px 20px -16px", borderBottom: `1px solid ${T.border}` }}>
          <div ref={scrollRef} style={{ display: "flex", overflowX: "auto", padding: "0 16px 16px 16px", gap: 8, scrollbarWidth: "none", msOverflowStyle: "none" }}>
            <style>{`.no-scroll-bar::-webkit-scrollbar { display: none; }`}</style>
            <div className="no-scroll-bar" style={{ display: "flex", gap: 8 }}>
              {daysStrip.map(d => {
                const active = d.iso === selectedDate;
                return (
                  <button
                    key={d.iso}
                    data-active={active}
                    onClick={() => setSelectedDate(d.iso)}
                    style={{
                      flexShrink: 0,
                      width: 50,
                      padding: "8px 0",
                      background: active ? "#EA580C" : "transparent",
                      border: "none",
                      borderRadius: 12,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 4,
                      cursor: "pointer",
                      transition: "all 0.2s"
                    }}
                  >
                    <div style={{ fontSize: 12, fontWeight: 700, color: active ? "#FFF" : T.sub, textTransform: "uppercase" }}>{d.dayOfWeek}</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: active ? "#FFF" : T.text }}>{d.dayNum}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* List of Reservations */}
        <div>
          {pending.length === 0 && upcoming.length === 0 && history.length === 0 && (
            <div style={{ padding: "40px 20px", textAlign: "center", color: T.sub, fontSize: 14 }}>
              No hay reservas para este día.
            </div>
          )}
          
          {pending.map(r => <PendingCard key={r.id} r={r} />)}
          {upcoming.map(r => <ConfirmedCard key={r.id} r={r} />)}
          
          {history.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: T.sub, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>Canceladas</div>
              {history.map(r => <HistoryCard key={r.id} r={r} />)}
            </div>
          )}
        </div>
      </div>

      {showConfig && (
        <ScheduleManagerModal 
          biz={bizCopy} 
          onClose={() => setShowConfig(false)}
          onUpdate={(updatedBiz) => setBizCopy(updatedBiz)}
        />
      )}

      {showExport && (
        <StoryExportModal 
          biz={bizCopy} 
          ownerRes={ownerRes}
          onClose={() => setShowExport(false)}
        />
      )}
    </div>
  );
}

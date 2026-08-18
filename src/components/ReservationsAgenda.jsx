import React, { useState } from "react";
import Icon from "./ui/Icon.jsx";
import ScheduleManagerModal from "./ScheduleManagerModal.jsx";
import { getLocalIsoDate } from "../lib/utils.js";

const FULL_DIRS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const FULL_MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

import { useUIStore } from "../store/useUIStore.js";
import { getT } from "../lib/constants.js";
import { sb } from "../lib/supabase.js";

export default function ReservationsAgenda({ ownerView, ownerRes, setOwnerRes }) {
  const dark = useUIStore(s => s.dark);
  const toast$ = useUIStore(s => s.toast$);
  const T = getT(dark);
  const [showConfig, setShowConfig] = useState(false);
  const [bizCopy, setBizCopy] = useState({ ...ownerView, booking_config: ownerView.booking_config, schedule: ownerView.schedule });
  
  const activeRes = ownerRes.filter(r => r.status !== "deleted");

  const allPending = activeRes.filter(r => r.status === "pending").sort((a,b) => new Date(`${a.date}T${a.time}`) - new Date(`${b.date}T${b.time}`));
  const allOther = activeRes.filter(r => r.status !== "pending").sort((a,b) => new Date(`${a.date}T${a.time}`) - new Date(`${b.date}T${b.time}`));

  // Group allOther by date
  const groupedAgenda = allOther.reduce((acc, r) => {
    if (!acc[r.date]) acc[r.date] = [];
    acc[r.date].push(r);
    return acc;
  }, {});
  const sortedDates = Object.keys(groupedAgenda).sort((a,b) => new Date(a) - new Date(b));

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
      let statusText = "actualizada";
      if (status === 'confirmed') statusText = "confirmada";
      if (status === 'cancelled') statusText = "cancelada";
      if (status === 'completed') statusText = "completada";
      if (status === 'noshow') statusText = "marcada como no-asistida";
      toast$(`Reserva ${statusText}`);
      
      const resData = ownerRes.find(r => r.id === id);
      if (resData && resData.user_id) {
        if (status === 'confirmed' || status === 'cancelled') {
          await sb.notify(resData.user_id, `Reserva ${status === 'confirmed' ? 'Confirmada' : 'Cancelada'}`, `Tu reserva en ${ownerView.name} ha sido ${status === 'confirmed' ? 'confirmada' : 'cancelada'}.`, status === 'confirmed' ? 'approval' : 'alert');
        }
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
      const isToday = r.date === getLocalIsoDate(new Date());
      const d = new Date(r.date + "T12:00:00");
      const formattedDate = d.toLocaleDateString("es-ES", { weekday: 'long', day: 'numeric', month: 'long' });
      const dateText = isToday ? "hoy" : `el ${formattedDate}`;
      text = `¡Hola ${r.client_name}! Solo paso a recordarte que tienes una reservación con nosotros ${dateText} en ${ownerView.name}.\nTe esperamos a las ${formatTimeAMPM(r.time)}.\n\n¿Nos confirmas tu asistencia por favor?`;
    } else if (type === "cancel") {
      text = `Hola ${r.client_name}. Te escribimos de ${ownerView.name}.\nLamentablemente no tenemos disponibilidad para tu reservación el ${r.date} a las ${formatTimeAMPM(r.time)}.\n\n¿Te gustaría reprogramar para otro día u horario?`;
    }
    return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
  };

  const PendingCard = ({ r }) => {
    const waLinkConfirm = getWhatsAppLink(r, "confirm");
    const waLinkCancel = getWhatsAppLink(r, "cancel");
    const [expanded, setExpanded] = useState(false);
    
    const d = new Date(r.date + "T12:00:00");
    const dateText = `${FULL_DIRS[d.getDay()]} ${d.getDate()} de ${FULL_MONTHS[d.getMonth()]}`;

    return (
      <div style={{ background: "rgba(255, 251, 240, 0.8)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", border: "1px solid rgba(253, 230, 138, 0.6)", borderRadius: 18, marginBottom: 12, overflow: "hidden", boxShadow: "0 6px 16px rgba(245, 158, 11, 0.08), 0 1px 2px rgba(0,0,0,0.02)", transition: "all 0.3s ease" }}>
        <div onClick={() => setExpanded(!expanded)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px", cursor: "pointer" }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#F59E0B", flexShrink: 0, boxShadow: "0 0 10px rgba(245,158,11,0.6)" }} />
          <div style={{ minWidth: 70, flexShrink: 0, letterSpacing: "-0.5px" }}>
             <div style={{ fontWeight: 900, fontSize: 16, color: T.text }}>{formatTimeAMPM(r.time)}</div>
             <div style={{ fontSize: 11, color: T.sub, fontWeight: 700, marginBottom: 4 }}>{d.getDate()}/{d.getMonth()+1}</div>
             <div style={{ fontSize: 10, fontWeight: 800, color: "#D97706", display: "inline-block", textTransform: "uppercase", letterSpacing: 0.5 }}>Pendiente</div>
          </div>
          <div style={{ flex: 1, minWidth: 0, borderLeft: `1px solid rgba(245, 158, 11, 0.2)`, paddingLeft: 12, textAlign: "left" }}>
            <div style={{ fontWeight: 800, fontSize: 15, color: T.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.client_name}</div>
            {r.service && (
              <div style={{ fontSize: 13, color: T.text, display: "flex", alignItems: "center", gap: 6, marginTop: 4, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                <Icon name="tag" size={12} color={T.sub} style={{ flexShrink: 0 }} /> {r.service}
              </div>
            )}
            {r.client_phone && (
              <div style={{ fontSize: 13, color: T.text, display: "flex", alignItems: "center", gap: 6, marginTop: 2, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                <Icon name="phone" size={12} color={T.sub} style={{ flexShrink: 0 }} /> {r.client_phone}
              </div>
            )}
          </div>
        </div>
          {expanded && (
            <div style={{ padding: "0 16px 16px 16px" }}>
              <div style={{ height: 1, background: "rgba(245, 158, 11, 0.1)", margin: "0 0 12px 0", borderTop: "1px dashed rgba(245, 158, 11, 0.3)" }}></div>
              {r.notes && <div style={{ fontSize: 13, color: "#92400E", background: "rgba(245, 158, 11, 0.05)", padding: "10px 12px", borderRadius: 12, marginBottom: 12, fontStyle: "italic", border: "1px solid rgba(245, 158, 11, 0.1)" }}>"{r.notes}"</div>}
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={(e) => { e.stopPropagation(); if(waLinkConfirm) window.open(waLinkConfirm, "_blank"); updateStatus(r.id, "confirmed"); }} style={{ flex: 1, padding: "12px 0", background: "#10B981", border: "none", borderRadius: 14, fontSize: 14, fontWeight: 800, color: "#fff", cursor: "pointer", fontFamily: "inherit", display: "flex", justifyContent: "center", alignItems: "center", gap: 6, boxShadow: "0 4px 12px rgba(16, 185, 129, 0.2)" }} className="press"><Icon name="check" size={16} color="#fff" /> Confirmar</button>
                <button onClick={(e) => { e.stopPropagation(); if(waLinkCancel) window.open(waLinkCancel, "_blank"); updateStatus(r.id, "cancelled"); }} style={{ flex: 1, padding: "12px 0", background: "rgba(255,255,255,0.5)", border: `1px solid rgba(0,0,0,0.08)`, borderRadius: 14, fontSize: 14, fontWeight: 800, color: T.sub, cursor: "pointer", fontFamily: "inherit" }} className="press">Rechazar</button>
              </div>
            </div>
          )}
      </div>
    );
  };

  const ConfirmedCard = ({ r }) => {
    const waLinkReminder = getWhatsAppLink(r, "reminder");
    const waLinkCancel = getWhatsAppLink(r, "cancel");
    const [expanded, setExpanded] = useState(false);
    return (
      <div style={{ background: "rgba(255, 255, 255, 0.8)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", border: "1px solid rgba(16, 185, 129, 0.3)", borderRadius: 18, marginBottom: 12, overflow: "hidden", boxShadow: "0 6px 16px rgba(16, 185, 129, 0.05), 0 1px 2px rgba(0,0,0,0.02)", transition: "all 0.3s ease" }}>
        <div onClick={() => setExpanded(!expanded)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px", cursor: "pointer" }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#10B981", flexShrink: 0, boxShadow: "0 0 10px rgba(16,185,129,0.6)" }} />
          <div style={{ minWidth: 70, flexShrink: 0, letterSpacing: "-0.5px" }}>
            <div style={{ fontWeight: 900, fontSize: 16, color: T.text }}>{formatTimeAMPM(r.time)}</div>
            <div style={{ fontSize: 10, fontWeight: 800, color: "#16A34A", display: "inline-block", textTransform: "uppercase", letterSpacing: 0.5, marginTop: 4 }}>Confirmada</div>
          </div>
          <div style={{ flex: 1, minWidth: 0, borderLeft: `1px solid rgba(16, 185, 129, 0.15)`, paddingLeft: 12, textAlign: "left" }}>
            <div style={{ fontWeight: 800, fontSize: 15, color: T.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.client_name}</div>
            {r.service && (
              <div style={{ fontSize: 13, color: T.text, display: "flex", alignItems: "center", gap: 6, marginTop: 4, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                <Icon name="tag" size={12} color={T.sub} style={{ flexShrink: 0 }} /> {r.service}
              </div>
            )}
            {r.client_phone && (
              <div style={{ fontSize: 13, color: T.text, display: "flex", alignItems: "center", gap: 6, marginTop: 2, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                <Icon name="phone" size={12} color={T.sub} style={{ flexShrink: 0 }} /> {r.client_phone}
              </div>
            )}
          </div>
        </div>
          {expanded && (
            <div style={{ padding: "0 16px 16px 16px" }}>
              <div style={{ height: 1, background: "rgba(16, 185, 129, 0.1)", margin: "0 0 12px 0", borderTop: "1px dashed rgba(16, 185, 129, 0.3)" }}></div>
              {r.notes && <div style={{ fontSize: 13, color: "#166534", background: "rgba(16, 185, 129, 0.05)", padding: "10px 12px", borderRadius: 12, marginBottom: 12, fontStyle: "italic", border: "1px solid rgba(16, 185, 129, 0.1)" }}>"{r.notes}"</div>}
              
              <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                <button onClick={(e) => { e.stopPropagation(); updateStatus(r.id, "completed"); }} style={{ flex: 1, padding: "10px 0", background: "#3B82F6", border: "none", borderRadius: 12, fontSize: 13, fontWeight: 800, color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 5, fontFamily: "inherit" }} className="press"><Icon name="check-circle" size={14} color="#fff" /> Completada</button>
                <button onClick={(e) => { e.stopPropagation(); updateStatus(r.id, "noshow"); }} style={{ flex: 1, padding: "10px 0", background: "#F1F5F9", border: "none", borderRadius: 12, fontSize: 13, fontWeight: 800, color: "#475569", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 5, fontFamily: "inherit" }} className="press"><Icon name="user-x" size={14} color="#475569" /> No asistió</button>
              </div>
              
              <div style={{ display: "flex", gap: 8 }}>
                {waLinkReminder && <button onClick={(e) => { e.stopPropagation(); window.open(waLinkReminder, "_blank"); }} style={{ flex: 1, padding: "10px 0", background: "rgba(220, 252, 231, 0.3)", border: "1px solid rgba(22, 163, 74, 0.2)", borderRadius: 12, fontSize: 13, fontWeight: 800, color: "#16A34A", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 5, fontFamily: "inherit" }} className="press"><Icon name="whatsapp" size={14} color="#16A34A" /> WhatsApp</button>}
                <button onClick={(e) => { e.stopPropagation(); if(waLinkCancel) window.open(waLinkCancel, "_blank"); updateStatus(r.id, "cancelled"); }} style={{ flex: 1, padding: "10px 0", background: "rgba(254, 242, 242, 0.5)", border: "1px solid rgba(220, 38, 38, 0.2)", borderRadius: 12, fontSize: 13, fontWeight: 800, color: "#DC2626", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 5, fontFamily: "inherit" }} className="press"><Icon name="x" size={14} color="#DC2626" /> Cancelar</button>
              </div>
            </div>
          )}
      </div>
    );
  };

  const HistoryCard = ({ r }) => {
    let color = "#64748B";
    let bg = "#F1F5F9";
    let text = "Cancelada";
    
    if (r.status === "completed") {
      color = "#3B82F6"; bg = "#DBEAFE"; text = "Completada";
    } else if (r.status === "noshow") {
      color = "#EF4444"; bg = "#FEE2E2"; text = "No Asistió";
    }

    return (
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: "rgba(255,255,255,0.4)", border: "1px solid rgba(0,0,0,0.04)", borderRadius: 16, marginBottom: 8 }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0 }} />
        <div style={{ minWidth: 65, fontWeight: 800, fontSize: 14, color: "#94A3B8", flexShrink: 0 }}>{formatTimeAMPM(r.time)}</div>
        <div style={{ flex: 1, fontSize: 14, color: "#64748B", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontWeight: 700 }}>{r.client_name}</div>
        <div style={{ fontSize: 11, fontWeight: 800, color: color, background: bg, padding: "4px 8px", borderRadius: 8, flexShrink: 0, textTransform: "uppercase", letterSpacing: 0.5 }}>{text}</div>
        <button onClick={() => deleteRes(r.id)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, flexShrink: 0 }} className="press"><Icon name="trash" size={14} color="#94A3B8" /></button>
      </div>
    );
  };

  const formatDateHeader = (dateStr) => {
    const d = new Date(dateStr + "T12:00:00");
    const today = new Date();
    const todayStr = getLocalIsoDate(today);
    
    let prefix = "";
    if (dateStr === todayStr) prefix = "Hoy, ";
    
    return `${prefix}${FULL_DIRS[d.getDay()]} ${d.getDate()} de ${FULL_MONTHS[d.getMonth()]}`;
  };

  return (
    <div style={{ marginBottom: 24 }}>
      {/* Top Actions */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, padding: "0 4px", justifyContent: "flex-end" }}>
        <button onClick={() => setShowConfig(true)} style={{ background: T.white, border: `1px solid ${T.border}`, padding: "12px", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontSize: 13, fontWeight: 700, color: T.text, cursor: "pointer", boxShadow: T.shadow }} className="press">
          <Icon name="settings" size={16} color={T.sub} /> Configurar Agenda
        </button>
      </div>

      {allPending.length > 0 && (
        <div style={{ background: T.white, borderRadius: 20, padding: "20px 16px", boxShadow: "0 8px 30px rgba(0,0,0,0.04)", border: `1px solid ${T.border}`, marginBottom: 24 }}>
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: T.text, lineHeight: 1.2, display: "flex", justifyContent: "center", alignItems: "center", gap: 8 }}>
              Reservas Pendientes
              <div style={{ background: "#FFFBEB", border: "1px solid #FDE68A", color: "#D97706", padding: "2px 8px", borderRadius: 20, fontSize: 12, fontWeight: 900 }}>
                {allPending.length}
              </div>
            </div>
            <div style={{ fontSize: 13, color: T.sub, marginTop: 2 }}>Requieren tu confirmación</div>
          </div>
          <div>
            {allPending.map(r => <PendingCard key={r.id} r={r} />)}
          </div>
        </div>
      )}

      {/* Main Agenda Card */}
      <div style={{ background: T.white, borderRadius: 20, padding: "20px 16px", boxShadow: "0 8px 30px rgba(0,0,0,0.04)", border: `1px solid ${T.border}` }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: T.text, lineHeight: 1.2 }}>Agenda General</div>
          <div style={{ fontSize: 13, color: T.sub, marginTop: 4 }}>Todas tus reservas confirmadas</div>
        </div>

        <div>
          {sortedDates.length === 0 ? (
            <div style={{ padding: "40px 20px", textAlign: "center", color: T.sub, fontSize: 14 }}>
              No tienes reservaciones próximas en tu agenda.
            </div>
          ) : (
            sortedDates.map(dateStr => {
              const dayRes = groupedAgenda[dateStr];
              const upcoming = dayRes.filter(r => r.status === "confirmed");
              const history = dayRes.filter(r => r.status === "cancelled" || r.status === "completed" || r.status === "noshow");
              
              if (upcoming.length === 0 && history.length === 0) return null;

              return (
                <div key={dateStr} style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: T.text, textTransform: "capitalize", borderBottom: `2px solid ${T.border}`, paddingBottom: 8, marginBottom: 16 }}>
                    {formatDateHeader(dateStr)}
                  </div>
                  
                  {upcoming.map(r => <ConfirmedCard key={r.id} r={r} />)}
                  
                  {history.length > 0 && (
                    <div style={{ marginTop: 12 }}>
                      {history.map(r => <HistoryCard key={r.id} r={r} />)}
                    </div>
                  )}
                </div>
              );
            })
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
    </div>
  );
}

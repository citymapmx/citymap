import React from 'react';
import Icon from '../ui/Icon';

export default function AdminReservationsTab({
  data,
  sb,
  load,
  onToast
}) {
  return (
    <div>
      <p className="text-lg" style={{ fontFamily: "'Coolvetica', sans-serif", color: "#0F1A14", marginBottom: 14 }}>Reservaciones</p>
      {data.reservations.filter(r => r.status !== "deleted").length === 0
        ? <div style={{ textAlign: "center", padding: "40px 0", color: "#5A6872" }}><Icon name="calendar" size={36} color="#E4E8E4" /><p style={{ marginTop: 12, fontWeight: 600 }}>Sin reservaciones aún</p></div>
        : data.reservations.filter(r => r.status !== "deleted").map(r => {
          const biz = data.biz.find(b => b.id === r.biz_id);
          const statusColor = r.status === "confirmed" ? "#16A34A" : r.status === "cancelled" ? "#D94F3D" : "#D97706";
          const statusBg = r.status === "confirmed" ? "#DCFCE7" : r.status === "cancelled" ? "#FEE2E2" : "#FEF3C7";
          return <div key={r.id} style={{ background: "#fff", borderRadius: 12, padding: "12px 14px", marginBottom: 10, boxShadow: "0 2px 8px rgba(0,0,0,.05)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
              <div>
                <div className="text-sm" style={{ fontWeight: 700, color: "#0F1A14" }}>{r.client_name}</div>
                <div className="text-xs" style={{ color: "#5A6872", marginTop: 2 }}>{biz?.name || r.biz_id}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div className="text-xs" style={{ background: statusBg, color: statusColor, borderRadius: 20, padding: "3px 10px", fontWeight: 700 }}>{r.status === "confirmed" ? "Confirmada" : r.status === "cancelled" ? "Cancelada" : "Pendiente"}</div>
                <button onClick={async () => { if (window.confirm("¿Eliminar reservación permanentemente?")) { await sb.patch("reservations", r.id, { status: "deleted" }); onToast("Eliminada"); await load(); } }} style={{ background: "#FFF5F5", border: "none", borderRadius: 8, padding: "5px 7px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="trash" size={12} color="#D94F3D" /></button>
              </div>
            </div>
            <div className="text-xs" style={{ display: "flex", gap: 16, color: "#5A6872", marginBottom: 10 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Icon name="calendar" size={12} color="#5A6872" />{r.date}</span>
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Icon name="clock" size={12} color="#5A6872" />{(() => { if (!r.time) return ""; const [h, m] = r.time.split(":"); let hh = parseInt(h, 10); const ap = hh >= 12 ? "PM" : "AM"; if (hh === 0) hh = 12; if (hh > 12) hh -= 12; return `${hh}:${m} ${ap}`; })()}</span>
              <span style={{ fontWeight: 600, color: "#0F1A14" }}>{r.service}</span>
            </div>
            {r.status === "pending" && <div style={{ display: "flex", gap: 8 }}>
              <button onClick={async () => { 
                await sb.patch("reservations", r.id, { status: "confirmed" }); 
                if (r.user_id) { const biz = data.biz.find(b => b.id === r.biz_id); await sb.notify(r.user_id, "Reserva Confirmada", `Tu reserva en ${biz ? biz.name : 'el negocio'} ha sido confirmada.`, "approval"); }
                onToast("Reserva confirmada"); 
                await load(); 
              }} style={{ flex: 1, padding: "8px 0", background: "#DCFCE7", border: "none", borderRadius: 9, fontSize: 12, fontWeight: 700, color: "#16A34A", cursor: "pointer", fontFamily: "inherit" }}>Confirmar</button>
              <button onClick={async () => { 
                await sb.patch("reservations", r.id, { status: "cancelled" }); 
                if (r.user_id) { const biz = data.biz.find(b => b.id === r.biz_id); await sb.notify(r.user_id, "Reserva Cancelada", `Tu reserva en ${biz ? biz.name : 'el negocio'} ha sido cancelada.`, "alert"); }
                onToast("Reserva cancelada"); 
                await load(); 
              }} style={{ flex: 1, padding: "8px 0", background: "#FEE2E2", border: "none", borderRadius: 9, fontSize: 12, fontWeight: 700, color: "#D94F3D", cursor: "pointer", fontFamily: "inherit" }}>Cancelar</button>
            </div>}
          </div>
        })
      }
    </div>
  );
}

import React, { useState, useEffect } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import * as dbService from '../services/dbService';
import { Helmet } from "react-helmet-async";
import { useAppContext } from "../context/AppContext";
import { useUIStore } from "../store/useUIStore";
import { useShallow } from 'zustand/react/shallow';
import { sb } from "../lib/supabase";
import Icon from "../components/ui/Icon";
import ReservationsAgenda from "../components/ReservationsAgenda";

export default function OwnerDashboardView() {
  const ctx = useAppContext();
  const { T, FONT_BIZ, navigate, setShowPlans } = ctx;
  const { toast$, ownerView, setOwnerView } = useUIStore(useShallow(s => ({ toast$: s.toast$, ownerView: s.ownerView, setOwnerView: s.setOwnerView })));

  const [ownerRes, setOwnerRes] = useState([]);
  const [ownerStats, setOwnerStats] = useState({ views: 0, whatsapp: 0, phone: 0 });

  // Si no hay ownerView, redirigimos a cuenta
  useEffect(() => {
    if (!ownerView) {
      navigate("account");
    }
  }, [ownerView, navigate]);

  useEffect(() => {
    if (!ownerView) return;
    (async () => {
      const [rv, an] = await Promise.all([
        dbService.getOwnerReservations(ownerView.id),
        dbService.getOwnerAnalytics(ownerView.id),
      ]);
      setOwnerRes(Array.isArray(rv) ? rv : []);
      if (Array.isArray(an)) {
        setOwnerStats({ 
          views: an.filter(a => a.event_type === "view").length, 
          whatsapp: an.filter(a => a.event_type === "whatsapp").length, 
          phone: an.filter(a => a.event_type === "phone").length 
        });
      }
    })();
  }, [ownerView]);

  if (!ownerView) return null;

  const isOpen = (b) => {
    if (!b || !b.schedule) return false;
    const days = ["dom", "lun", "mar", "mie", "jue", "vie", "sab"];
    const now = new Date();
    const dStr = days[now.getDay()];
    const sch = b.schedule[dStr];
    if (!sch || sch.closed || !sch.open || !sch.close) return false;
    const parseHM = t => { const [h, m] = t.split(":"); return parseInt(h)*60 + parseInt(m); };
    const cur = now.getHours()*60 + now.getMinutes();
    const op = parseHM(sch.open);
    let cl = parseHM(sch.close);
    if (cl < op) { // Pasa la medianoche
      return cur >= op || cur <= cl;
    }
    return cur >= op && cur <= cl;
  };

  return (
    <div style={{ paddingBottom: 100, minHeight: '100vh', background: T.bg }}>
      <Helmet>
        <title>Panel de Administración - {ownerView.name}</title>
      </Helmet>

      {/* HEADER */}
      <div style={{ padding: "calc(env(safe-area-inset-top, 0px) + 16px) 20px 16px", display: "flex", alignItems: "center", gap: 16, background: T.bg, position: "sticky", top: 0, zIndex: 100, borderBottom: `1px solid ${T.border}` }}>
        <button className="press" onClick={() => { setOwnerView(null); navigate("account"); }} style={{ width: 44, height: 44, borderRadius: "50%", background: T.iconBg, color: T.text, border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
          <Icon name="chevron" size={20} style={{ transform: "rotate(180deg)" }} />
        </button>
        <div>
          <h2 style={{ fontFamily: "var(--heading)", fontSize: 24, color: T.text, lineHeight: 1.1 }}>Mi Negocio</h2>
        </div>
      </div>

      <div style={{ padding: "20px" }}>
        
        {/* INFO CARD */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
          <div style={{ width: 64, height: 64, borderRadius: 16, overflow: "hidden", flexShrink: 0, background: T.border, boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>
            {ownerView.photos?.[0]?.url ? <img src={ownerView.photos[0].url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="store" size={24} color={T.sub} /></div>}
          </div>
          <div style={{ flex: 1 }}>
            <div className="text-xl" style={{ fontFamily: FONT_BIZ, fontWeight: 900, color: T.text }}>{ownerView.name}</div>
            <div className="text-sm" style={{ color: T.sub, marginTop: 2, fontWeight: 600 }}>{ownerView.type}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, background: isOpen(ownerView) ? "rgba(22, 163, 74, 0.1)" : "rgba(220, 38, 38, 0.1)", padding: "6px 12px", borderRadius: 20 }}>
            <span className={isOpen(ownerView) ? "dot-o" : "dot-c"} />
            <span className="text-xs" style={{ fontWeight: 800, color: isOpen(ownerView) ? "#16A34A" : T.red }}>{isOpen(ownerView) ? "Abierto" : "Cerrado"}</span>
          </div>
        </div>

        {/* STATS */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 24 }}>
          {[
            ["Visitas", ownerStats.views, "#3B82F6", "eye"], 
            ["WhatsApp", ownerStats.whatsapp, "#25D366", "whatsapp"], 
            ["Reservas", ownerRes.length, T.green, "calendar"]
          ].map(([lbl, val, col, ic]) => (
            <div key={lbl} style={{ background: T.card, borderRadius: 16, padding: "16px 8px", textAlign: "center", border: `1px solid ${T.border}`, boxShadow: "0 4px 12px rgba(0,0,0,0.02)" }}>
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}><Icon name={ic} size={18} color={col} /></div>
              <div className="text-2xl" style={{ fontWeight: 900, color: T.text, lineHeight: 1 }}>{val}</div>
              <div className="text-micro" style={{ color: T.sub, fontWeight: 700, textTransform: "uppercase", letterSpacing: .5, marginTop: 4 }}>{lbl}</div>
            </div>
          ))}
        </div>

        {/* QUICK LINK */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: T.white, border: `1.5px solid ${T.border}`, padding: "12px 16px", borderRadius: 16, marginBottom: 24, boxShadow: "0 4px 12px rgba(0,0,0,0.02)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: T.iconBg, display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="link" size={16} color={T.sub} /></div>
            <span className="text-sm" style={{ fontWeight: 700, color: T.text }}>Link directo al panel</span>
          </div>
          <button className="press text-xs" onClick={() => { navigator.clipboard.writeText(`https://citymap.mx/manage/${ownerView.slug || ownerView.id}`); toast$("¡Enlace de administración copiado!"); }} style={{ background: T.text, padding: "8px 16px", borderRadius: 10, fontWeight: 800, color: T.bg, border: "none", cursor: "pointer" }}>
            Copiar
          </button>
        </div>

        {/* UPGRADE PLAN */}
        {ownerView.plan === "free" && (
          <div onClick={() => { setOwnerView(null); setShowPlans(true); }} className="press" style={{ background: "linear-gradient(135deg, #111, #333)", padding: "20px", borderRadius: 16, marginBottom: 24, cursor: "pointer", color: "#fff", display: "flex", alignItems: "center", gap: 16, boxShadow: "0 8px 24px rgba(0,0,0,0.15)" }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: "linear-gradient(135deg, #C9A84C, #D4B663)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Icon name="award" size={24} color="#fff" />
            </div>
            <div style={{ flex: 1 }}>
              <div className="text-base" style={{ fontWeight: 900, marginBottom: 2 }}>Sube de nivel tu negocio</div>
              <div className="text-sm" style={{ fontWeight: 500, color: "rgba(255,255,255,0.7)", lineHeight: 1.3 }}>Desbloquea reservas automáticas, WhatsApp directo y Menú digital.</div>
            </div>
            <Icon name="chevron" size={20} color="rgba(255,255,255,0.3)" />
          </div>
        )}

        {/* AGENDA */}
        {ownerView.plan !== "free" && (
          <>
            <h3 style={{ fontSize: 18, fontWeight: 900, color: T.text, marginBottom: 16 }}>Agenda y Reservas</h3>
            <ReservationsAgenda ownerView={ownerView} ownerRes={ownerRes} setOwnerRes={setOwnerRes} />
          </>
        )}
        
      </div>
    </div>
  );
}

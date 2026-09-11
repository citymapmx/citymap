import { useState, useEffect } from "react";
import * as dbService from '../services/dbService';
import { Helmet } from "react-helmet-async";
import { useAppContext } from "../context/AppContext";
import { useUIStore } from "../store/useUIStore";
import { useShallow } from 'zustand/react/shallow';
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
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: `1px solid ${T.border}`, background: T.white }}>
        <div style={{ display: "flex", alignItems: "center" }}>
          <button onClick={() => { setOwnerView(null); window.history.length > 2 ? window.history.back() : navigate("account"); }} style={{ background: "transparent", border: "none", color: T.text, padding: "8px 12px 8px 0", cursor: "pointer", display: "flex", alignItems: "center" }}>
            <Icon name="arrow_left" size={24} color={T.text} />
          </button>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: T.text, fontFamily: "var(--heading)", letterSpacing: "-0.5px" }}>Reservaciones</h1>
        </div>
      </div>

      <div style={{ padding: "20px" }}>
        
        {/* INFO CARD */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div className="text-xl" style={{ fontFamily: FONT_BIZ, fontWeight: 900, color: T.text }}>{ownerView.name}</div>
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
          <div style={{ marginTop: 24 }}>
            <ReservationsAgenda ownerView={ownerView} ownerRes={ownerRes} setOwnerRes={setOwnerRes} />
          </div>
        )}
        
      </div>
    </div>
  );
}

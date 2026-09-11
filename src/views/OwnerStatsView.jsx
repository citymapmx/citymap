import { useState, useEffect } from "react";
import * as dbService from '../services/dbService';
import { Helmet } from "react-helmet-async";
import { useAppContext } from "../context/AppContext";
import { useUIStore } from "../store/useUIStore";
import { useShallow } from 'zustand/react/shallow';
import Icon from "../components/ui/Icon";

const StatCard = ({ children, cols = 2, T }) => (
  <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, background: T.white, borderRadius: 16, padding: "8px", border: `1px solid ${T.border}`, boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
    {children}
  </div>
);

const StatItem = ({ value, label, borderRight, borderBottom, span = 1, T }) => (
  <div style={{
    textAlign: "center",
    padding: "12px 4px",
    gridColumn: `span ${span}`,
    ...(borderRight ? { borderRight: `1px solid ${T.border}` } : {}),
    ...(borderBottom ? { borderBottom: `1px solid ${T.border}` } : {}),
  }}>
    <div style={{ fontWeight: 900, fontSize: 24, color: T.text, lineHeight: 1 }}>{value}</div>
    <div style={{ fontSize: 10, color: T.sub, textTransform: "uppercase", fontWeight: 700, letterSpacing: 0.5, marginTop: 6 }}>{label}</div>
  </div>
);

export default function OwnerStatsView() {
  const ctx = useAppContext();
  const { T, navigate } = ctx;
  const { ownerView } = useUIStore(useShallow(s => ({ ownerView: s.ownerView })));

  const [ownerRes, setOwnerRes] = useState([]);
  const [ownerStats, setOwnerStats] = useState({ views: 0, whatsapp: 0, phone: 0, maps: 0, website: 0, orders: 0 });

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
        let v = 0, w = 0, p = 0, m = 0, wb = 0, o = 0;
        an.forEach(x => {
          if (x.event_type === 'view') v++;
          if (x.event_type === 'whatsapp') w++;
          if (x.event_type === 'phone') p++;
          if (x.event_type === 'maps') m++;
          if (x.event_type === 'website') wb++;
          if (x.event_type === 'menu_order') o++;
        });
        setOwnerStats({ views: v, whatsapp: w, phone: p, maps: m, website: wb, orders: o });
      }
    })();
  }, [ownerView]);

  if (!ownerView) return null;

  const rating = ownerView.rating && !isNaN(parseFloat(String(ownerView.rating).replace(',', '.')))
    ? parseFloat(String(ownerView.rating).replace(',', '.')).toFixed(1)
    : "0.0";



  return (
    <div style={{ paddingBottom: 100, minHeight: '100vh', background: T.bg }}>
      <Helmet>
        <title>Estadísticas - {ownerView.name}</title>
      </Helmet>

      {/* HEADER */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: `1px solid ${T.border}`, background: T.white }}>
        <div style={{ display: "flex", alignItems: "center" }}>
          <button onClick={() => window.history.length > 2 ? window.history.back() : navigate("account")} style={{ background: "transparent", border: "none", color: T.text, padding: "8px 12px 8px 0", cursor: "pointer", display: "flex", alignItems: "center" }}>
            <Icon name="arrow_left" size={24} color={T.text} />
          </button>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: T.text, fontFamily: "var(--heading)", letterSpacing: "-0.5px" }}>Estadísticas</h1>
        </div>
      </div>

      <div style={{ padding: "16px 20px" }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <h2 style={{ fontFamily: "var(--heading)", fontSize: 20, fontWeight: 900, letterSpacing: "-0.5px", color: T.text, marginBottom: 6 }}>Rendimiento de tu negocio</h2>
          <p style={{ fontSize: 13, color: T.sub, maxWidth: 280, margin: "0 auto", lineHeight: 1.3 }}>
            Mide el impacto de tu perfil y descubre cómo interactúan tus clientes.
          </p>
        </div>

        {/* VISIBILIDAD */}
        {/* VISIBILIDAD */}
        <div style={{ marginBottom: 20 }}>
          <h3 style={{ fontSize: 12, fontWeight: 800, color: T.text, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>Visibilidad</h3>
          <StatCard T={T}>
            <StatItem T={T} value={ownerStats.views} label="Vistas (Real)" borderRight />
            <StatItem T={T} value={Math.floor(ownerStats.views * 1.8)} label="Impresiones (Est.)" />
          </StatCard>
        </div>

        <div style={{ marginBottom: 20 }}>
          <h3 style={{ fontSize: 12, fontWeight: 800, color: T.text, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>Interacciones</h3>
          <StatCard T={T}>
            <StatItem T={T} value={ownerStats.whatsapp} label="WhatsApp" borderRight borderBottom />
            <StatItem T={T} value={ownerStats.phone} label="Llamadas" borderBottom />
            <StatItem T={T} value={ownerStats.maps} label="Cómo llegar" borderRight />
            <StatItem T={T} value={ownerStats.website} label="Sitio web" />
          </StatCard>
        </div>

        <div style={{ marginBottom: 20 }}>
          <h3 style={{ fontSize: 12, fontWeight: 800, color: T.text, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>Operación</h3>
          <StatCard T={T}>
            <StatItem T={T} value={ownerRes.length} label="Reservaciones" borderRight borderBottom />
            <StatItem T={T} value={ownerStats.orders} label="Pedidos" borderBottom />
            <div style={{ textAlign: "center", padding: "12px 8px", gridColumn: "span 2" }}>
              <div style={{ fontWeight: 900, fontSize: 24, color: T.text, lineHeight: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                {rating} <Icon name="star_f" size={20} color={T.text} />
              </div>
              <div style={{ fontSize: 10, color: T.sub, textTransform: "uppercase", fontWeight: 700, letterSpacing: 0.5, marginTop: 6 }}>Calificación</div>
            </div>
          </StatCard>
        </div>
      </div>
    </div>
  );
}

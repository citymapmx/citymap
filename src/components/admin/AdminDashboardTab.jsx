import React from 'react';
import Icon from '../ui/Icon';
import { PLAN_META } from '../../lib/constants';

function MetricCard({ label, value, icon, color, T }) {
  return (
    <div style={{ background: T.white, borderRadius: 14, padding: "14px 16px", boxShadow: T.shadow, flex: 1, minWidth: 0 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
        <span className="text-xs" style={{ fontWeight: 700, color: T.sub, textTransform: "uppercase", letterSpacing: .6 }}>{label}</span>
        <div style={{ width: 30, height: 30, borderRadius: 8, background: color + "22", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon name={icon} size={14} color={color} />
        </div>
      </div>
      <div className="text-2xl" style={{ fontWeight: 800, color: T.text }}>{value}</div>
    </div>
  );
}

export default function AdminDashboardTab({ data, dashCityFilter, setDashCityFilter, T }) {
  const dashBiz = dashCityFilter === "all" ? data.biz : data.biz.filter(b => b.city_slug === "all" || (b.city_slug && b.city_slug.split(",").includes(dashCityFilter)));
  const dashEv = dashCityFilter === "all" ? data.events : data.events.filter(ev => ev.city_slug === "all" || (ev.city_slug && ev.city_slug.split(",").includes(dashCityFilter)));
  const dashAn = dashCityFilter === "all" ? data.analytics : data.analytics.filter(a => a.city_slug === "all" || (a.city_slug && a.city_slug.split(",").includes(dashCityFilter)));
  
  const stats = { 
    total: dashBiz.filter(b => b.status !== "pending" && b.status !== "needs_changes").length, 
    approved: dashBiz.filter(b => b.status === "approved").length, 
    pending: dashBiz.filter(b => b.status === "pending" || b.status === "needs_changes").length + dashEv.filter(ev => ev.status === "pending").length, 
    views: dashAn.filter(a => a.event_type === "view").length, 
    whatsapp: dashAn.filter(a => a.event_type === "whatsapp").length, 
    phone: dashAn.filter(a => a.event_type === "phone").length, 
    website: dashAn.filter(a => a.event_type === "website").length, 
    maps: dashAn.filter(a => a.event_type === "maps").length 
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <p className="text-xl" style={{ fontFamily: "'Coolvetica', sans-serif", color: "#0F1A14", margin: 0 }}>Resumen general</p>
        <select value={dashCityFilter} onChange={e => setDashCityFilter(e.target.value)} style={{ padding: "8px 12px", border: "1.5px solid #E4E8E4", borderRadius: 10, fontSize: 13, color: "#0F1A14", background: "#fff", fontFamily: "inherit", cursor: "pointer" }}>
          <option value="all">Todas las ciudades</option>
          {data.cities.map(c => <option key={c.slug} value={c.slug}>{c.name}</option>)}
        </select>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
        <MetricCard label="Total negocios" value={stats.total} icon="store" color="#1A7A5E" T={T} />
        <MetricCard label="Aprobados" value={stats.approved} icon="check_sq" color="#16A34A" T={T} />
        <MetricCard label="Pendientes" value={stats.pending} icon="calendar" color="#F59E0B" T={T} />
        <MetricCard label="Visitas" value={stats.views} icon="eye" color="#3B82F6" T={T} />
      </div>
      <p className="text-lg" style={{ fontFamily: "'Coolvetica', sans-serif", color: "#0F1A14", marginBottom: 12 }}>Analíticas de leads</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
        <MetricCard label="WhatsApp" value={stats.whatsapp} icon="whatsapp" color="#25D366" T={T} />
        <MetricCard label="Teléfono" value={stats.phone} icon="phone" color="#3B82F6" T={T} />
        <MetricCard label="Sitio web" value={stats.website} icon="globe" color="#8B5CF6" T={T} />
        <MetricCard label="Google Maps" value={stats.maps} icon="map" color="#EA4335" T={T} />
      </div>
      <p className="text-lg" style={{ fontFamily: "'Coolvetica', sans-serif", color: "#0F1A14", marginBottom: 12 }}>Por plan</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {Object.entries(PLAN_META).map(([k, m]) => { 
          const count = dashBiz.filter(b => b.plan === k).length; 
          return (
            <div key={k} style={{ background: "#fff", borderRadius: 12, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12, boxShadow: "0 2px 8px rgba(0,0,0,.05)" }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: m.color, flexShrink: 0 }} />
              <span className="text-sm" style={{ fontWeight: 600, color: "#0F1A14", flex: 1 }}>{m.label}</span>
              <span className="text-xl" style={{ fontWeight: 800, color: m.color }}>{count}</span>
            </div>
          ); 
        })}
      </div>
    </div>
  );
}

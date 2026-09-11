import React, { useState, useMemo } from "react";

const TRAFFIC_THRESHOLDS = {
  dead: 5,    // 0-5 vistas = rojo
  low: 30,    // 6-30 = amarillo
  // 31+ = verde
};

function TrafficDot({ views }) {
  const color = views <= TRAFFIC_THRESHOLDS.dead
    ? "#EF4444"
    : views <= TRAFFIC_THRESHOLDS.low
      ? "#F59E0B"
      : "#10B981";
  return (
    <span style={{
      display: "inline-block",
      width: 8, height: 8,
      borderRadius: "50%",
      background: color,
      flexShrink: 0,
      marginRight: 6
    }} />
  );
}

export default function AdminActivityTab({ data, sb, onToast, load, T }) {
  const [cityFilter, setCityFilter] = useState("all");
  const [sortBy, setSortBy] = useState("views_asc");
  const [search, setSearch] = useState("");
  const [period, setPeriod] = useState("30"); // días

  const cities = useMemo(() => {
    const seen = new Set();
    (data.biz || []).forEach(b => {
      if (b.city_slug) b.city_slug.split(",").forEach(c => seen.add(c.trim()));
    });
    return Array.from(seen).sort();
  }, [data.biz]);

  const cutoff = useMemo(() => {
    if (period === "all") return null;
    const d = new Date();
    d.setDate(d.getDate() - Number(period));
    return d.toISOString();
  }, [period]);

  const bizWithViews = useMemo(() => {
    const ACTIVE_EVENTS = new Set(["view", "whatsapp", "phone", "maps", "website", "menu_order"]);
    const analytics = (data.analytics || []).filter(a =>
      ACTIVE_EVENTS.has(a.event_type) && (!cutoff || a.created_at >= cutoff)
    );

    const viewMap = {};
    analytics.forEach(a => {
      if (a.biz_id) viewMap[a.biz_id] = (viewMap[a.biz_id] || 0) + 1;
    });

    let list = (data.biz || [])
      .filter(b => b.status === "approved")
      .filter(b => cityFilter === "all" || (b.city_slug && b.city_slug.split(",").map(s => s.trim()).includes(cityFilter)))
      .filter(b => !search || b.name?.toLowerCase().includes(search.toLowerCase()))
      .map(b => ({ ...b, views: viewMap[b.id] || 0 }));

    if (sortBy === "views_asc") list.sort((a, b) => a.views - b.views);
    else if (sortBy === "views_desc") list.sort((a, b) => b.views - a.views);
    else if (sortBy === "name") list.sort((a, b) => (a.name || "").localeCompare(b.name || ""));

    return list;
  }, [data.biz, data.analytics, cityFilter, search, sortBy, cutoff]);

  const stats = useMemo(() => ({
    dead: bizWithViews.filter(b => b.views <= TRAFFIC_THRESHOLDS.dead).length,
    low: bizWithViews.filter(b => b.views > TRAFFIC_THRESHOLDS.dead && b.views <= TRAFFIC_THRESHOLDS.low).length,
    active: bizWithViews.filter(b => b.views > TRAFFIC_THRESHOLDS.low).length,
  }), [bizWithViews]);

  const deleteBiz = async (id, name) => {
    if (!window.confirm(`¿Eliminar "${name}"? Esta acción no se puede deshacer.`)) return;
    await sb.del("businesses", id);
    onToast(`"${name}" eliminado`);
    await load();
  };

  return (
    <div style={{ padding: "0 0 80px 0" }}>
      {/* Header */}
      <div style={{ padding: "20px 20px 12px", borderBottom: `1px solid ${T.border}` }}>
        <h2 style={{ margin: "0 0 4px 0", fontSize: 18, fontWeight: 800, color: T.text }}>📊 Actividad de Negocios</h2>
        <p style={{ margin: 0, fontSize: 13, color: T.sub }}>Identifica negocios sin tráfico para depurar la base de datos</p>
      </div>

      {/* Summary chips */}
      <div style={{ display: "flex", gap: 10, padding: "16px 20px", flexWrap: "wrap" }}>
        {[
          { label: "Sin tráfico", count: stats.dead, color: "#EF4444", bg: "#FEF2F2" },
          { label: "Bajo tráfico", count: stats.low, color: "#F59E0B", bg: "#FFFBEB" },
          { label: "Activos", count: stats.active, color: "#10B981", bg: "#ECFDF5" },
        ].map(s => (
          <div key={s.label} style={{ flex: 1, minWidth: 90, background: s.bg, borderRadius: 12, padding: "10px 14px", textAlign: "center" }}>
            <div style={{ fontSize: 22, fontWeight: 900, color: s.color }}>{s.count}</div>
            <div style={{ fontSize: 11, fontWeight: 600, color: s.color }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ padding: "0 20px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar negocio..."
          style={{ width: "100%", boxSizing: "border-box", padding: "10px 14px", borderRadius: 10, border: `1px solid ${T.border}`, fontSize: 14, fontFamily: "inherit", background: T.bg, color: T.text, outline: "none" }}
        />
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <select value={period} onChange={e => setPeriod(e.target.value)}
            style={{ flex: 1, padding: "8px 10px", borderRadius: 10, border: `1px solid ${T.border}`, fontSize: 13, background: T.bg, color: T.text, fontFamily: "inherit" }}>
            <option value="7">Últimos 7 días</option>
            <option value="30">Últimos 30 días</option>
            <option value="90">Últimos 90 días</option>
            <option value="all">Todo el tiempo</option>
          </select>
          <select value={cityFilter} onChange={e => setCityFilter(e.target.value)}
            style={{ flex: 1, padding: "8px 10px", borderRadius: 10, border: `1px solid ${T.border}`, fontSize: 13, background: T.bg, color: T.text, fontFamily: "inherit" }}>
            <option value="all">Todas las ciudades</option>
            {cities.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={sortBy} onChange={e => setSortBy(e.target.value)}
            style={{ flex: 1, padding: "8px 10px", borderRadius: 10, border: `1px solid ${T.border}`, fontSize: 13, background: T.bg, color: T.text, fontFamily: "inherit" }}>
            <option value="views_asc">↑ Menos vistas primero</option>
            <option value="views_desc">↓ Más vistas primero</option>
            <option value="name">A-Z por nombre</option>
          </select>
        </div>
      </div>

      {/* List */}
      <div style={{ padding: "0 20px", display: "flex", flexDirection: "column", gap: 8 }}>
        {bizWithViews.length === 0 && (
          <div style={{ textAlign: "center", padding: 40, color: T.sub, fontSize: 14 }}>No hay negocios con estos filtros</div>
        )}
        {bizWithViews.map(b => {
          const isRed = b.views <= TRAFFIC_THRESHOLDS.dead;
          return (
            <div key={b.id} style={{
              background: T.bg,
              border: `1px solid ${isRed ? "#FECACA" : T.border}`,
              borderRadius: 12,
              padding: "12px 14px",
              display: "flex",
              alignItems: "center",
              gap: 10,
              boxShadow: "0 1px 4px rgba(0,0,0,0.05)"
            }}>
              {/* Logo or placeholder */}
              <div style={{
                width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                background: b.img1 ? `url(${b.img1}) center/cover` : "#F1F5F9",
                border: `1px solid ${T.border}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 18
              }}>
                {!b.img1 && "🏪"}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center" }}>
                  <TrafficDot views={b.views} />
                  <span style={{ fontWeight: 700, fontSize: 14, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.name}</span>
                </div>
                <div style={{ fontSize: 12, color: T.sub, marginTop: 2, display: "flex", gap: 8 }}>
                  <span>{b.city_slug || "—"}</span>
                  <span>·</span>
                  <span>{b.category || "Sin categoría"}</span>
                  {b.plan && <><span>·</span><span style={{ fontWeight: 600, color: "#6366F1" }}>{b.plan}</span></>}
                </div>
              </div>

              {/* Views badge */}
              <div style={{
                textAlign: "center",
                minWidth: 48,
                padding: "4px 10px",
                borderRadius: 8,
                background: b.views <= TRAFFIC_THRESHOLDS.dead ? "#FEF2F2" : b.views <= TRAFFIC_THRESHOLDS.low ? "#FFFBEB" : "#ECFDF5",
                flexShrink: 0
              }}>
                <div style={{ fontSize: 16, fontWeight: 900, color: b.views <= TRAFFIC_THRESHOLDS.dead ? "#EF4444" : b.views <= TRAFFIC_THRESHOLDS.low ? "#F59E0B" : "#10B981", lineHeight: 1.1 }}>
                  {b.views}
                </div>
                <div style={{ fontSize: 9, fontWeight: 600, color: T.sub }}>vistas</div>
              </div>

              {/* Delete */}
              {b.views <= TRAFFIC_THRESHOLDS.dead && (
                <button
                  onClick={() => deleteBiz(b.id, b.name)}
                  style={{
                    padding: "8px",
                    background: "#FEF2F2",
                    border: "1px solid #FECACA",
                    borderRadius: 8,
                    cursor: "pointer",
                    color: "#EF4444",
                    fontSize: 13,
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                  title="Eliminar negocio"
                >
                  🗑
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

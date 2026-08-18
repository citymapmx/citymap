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

export default function AdminDashboardTab({ data, dashCityFilter, setDashCityFilter, T, onToast, cloudListAllFiles, cloudDeleteBatch, sb }) {
  const [cleaning, setCleaning] = React.useState(false);
  const [syncing, setSyncing] = React.useState(false);

  const handleSyncReviews = async () => {
    if (!window.confirm("¿Recalcular todas las calificaciones basadas en las reseñas existentes?")) return;
    setSyncing(true);
    try {
      const allReviews = await sb.get("reviews");
      const bizStats = {};
      allReviews.forEach(r => {
        if (!r.biz_id) return;
        if (!bizStats[r.biz_id]) bizStats[r.biz_id] = { count: 0, sum: 0 };
        bizStats[r.biz_id].count++;
        bizStats[r.biz_id].sum += (r.stars || 0);
      });
      
      let updated = 0;
      for (const b of data.biz) {
        const stats = bizStats[b.id] || { count: 0, sum: 0 };
        const avg = stats.count > 0 ? Math.round((stats.sum / stats.count) * 10) / 10 : 0;
        if (b.rating !== avg || b.review_count !== stats.count) {
          await sb.patch("businesses", b.id, { rating: avg, review_count: stats.count }).catch(()=>{});
          updated++;
        }
      }
      onToast(`Se actualizaron ${updated} negocios con nuevas calificaciones ✓`);
    } catch (err) {
      onToast("Error al sincronizar: " + err.message);
    } finally {
      setSyncing(false);
    }
  };

  const handleCleanup = async () => {
    if (!window.confirm("¿Buscar y depurar imágenes huérfanas en Supabase Storage? Esto puede tardar unos segundos.")) return;
    setCleaning(true);
    try {
      const getPath = url => (url && typeof url === 'string') ? url.split("/object/public/media/")[1] : null;
      const validPaths = new Set();
      
      (data.biz || []).forEach(b => {
        if (b.logo_url) validPaths.add(getPath(b.logo_url));
        if (b.menu_pdf_url) validPaths.add(getPath(b.menu_pdf_url));
        if (b.photos) b.photos.forEach(p => validPaths.add(getPath(p.url)));
      });
      (data.events || []).forEach(e => {
        if (e.img_url) validPaths.add(getPath(e.img_url));
        if (e.img) validPaths.add(getPath(e.img));
      });
      (data.experiences || []).forEach(e => {
        if (e.gallery) e.gallery.forEach(url => validPaths.add(getPath(url)));
      });
      (data.banners || []).forEach(b => {
        if (b.img_url) validPaths.add(getPath(b.img_url));
      });
      (data.cities || []).forEach(c => {
        if (c.bg_image) validPaths.add(getPath(c.bg_image));
      });
      (data.categories || []).forEach(c => {
        if (c.img_url) validPaths.add(getPath(c.img_url));
      });
      // Reviews images
      (data.biz || []).forEach(b => {
        (b.reviews || []).forEach(r => {
          if (r.img_url) validPaths.add(getPath(r.img_url));
        });
      });
      // Clean nulls from set
      validPaths.delete(null);
      validPaths.delete(undefined);
      
      const allFiles = await cloudListAllFiles("");
      
      const orphans = allFiles.filter(path => !validPaths.has(path));
      
      if (orphans.length > 0) {
        if (window.confirm(`Se encontraron ${orphans.length} archivos huérfanos. ¿Deseas eliminarlos definitivamente?`)) {
          // Process in batches of 100 to avoid request limits
          let deleted = 0;
          for (let i = 0; i < orphans.length; i += 100) {
            const batch = orphans.slice(i, i + 100);
            const success = await cloudDeleteBatch(batch);
            if (success) deleted += batch.length;
          }
          onToast(`Se eliminaron ${deleted} archivos huérfanos ✓`);
        } else {
          onToast("Operación cancelada");
        }
      } else {
        onToast("No se encontraron archivos huérfanos ✓");
      }
    } catch (error) {
      console.error(error);
      onToast("Error al depurar imágenes: " + error.message);
    } finally {
      setCleaning(false);
    }
  };
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
        <p className="text-xl" style={{ fontFamily: "var(--heading)", color: "#0F1A14", margin: 0 }}>Resumen general</p>
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
      <p className="text-lg" style={{ fontFamily: "var(--heading)", color: "#0F1A14", marginBottom: 12 }}>Analíticas de leads</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
        <MetricCard label="WhatsApp" value={stats.whatsapp} icon="whatsapp" color="#25D366" T={T} />
        <MetricCard label="Teléfono" value={stats.phone} icon="phone" color="#3B82F6" T={T} />
        <MetricCard label="Sitio web" value={stats.website} icon="globe" color="#8B5CF6" T={T} />
        <MetricCard label="Google Maps" value={stats.maps} icon="map" color="#EA4335" T={T} />
      </div>
      <p className="text-lg" style={{ fontFamily: "var(--heading)", color: "#0F1A14", marginBottom: 12 }}>Por plan</p>
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
      <div style={{ marginTop: 24, padding: 16, background: "#FFF5F5", borderRadius: 12, border: "1px solid #FEE2E2", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <p className="text-sm" style={{ fontWeight: 800, color: "#991B1B", margin: "0 0 4px 0" }}>Depuración de Almacenamiento</p>
          <p className="text-xs" style={{ color: "#B91C1C", margin: 0 }}>Elimina imágenes de eventos, negocios y banners borrados que ya no están en uso.</p>
        </div>
        <button onClick={handleCleanup} disabled={cleaning} style={{ background: "#DC2626", color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", fontWeight: 700, fontSize: 13, cursor: cleaning ? "not-allowed" : "pointer", opacity: cleaning ? 0.7 : 1 }}>
          {cleaning ? "Buscando..." : "🧹 Depurar imágenes"}
        </button>
      </div>

      <div style={{ marginTop: 16, padding: 16, background: "#F3F4F6", borderRadius: 12, border: "1px solid #E5E7EB", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <p className="text-sm" style={{ fontWeight: 800, color: "#1F2937", margin: "0 0 4px 0" }}>Sincronizar Calificaciones</p>
          <p className="text-xs" style={{ color: "#4B5563", margin: 0 }}>Recalcula el promedio de estrellas de todos los negocios en base a sus reseñas.</p>
        </div>
        <button onClick={handleSyncReviews} disabled={syncing} style={{ background: "#1F2937", color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", fontWeight: 700, fontSize: 13, cursor: syncing ? "not-allowed" : "pointer", opacity: syncing ? 0.7 : 1 }}>
          {syncing ? "Sincronizando..." : "⭐ Recalcular"}
        </button>
      </div>
    </div>
  );
}

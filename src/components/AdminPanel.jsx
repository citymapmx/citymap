import { useState, useEffect, useCallback } from "react";
import { sb } from "../lib/supabase.js";
import { PLAN_META, EVENT_CATS } from "../lib/constants.js";
import { getEventStatus, createSlug } from "../lib/utils.js";
import Icon from "./ui/Icon.jsx";
import Uploader from "./Uploader.jsx";
import MenuManager from "./MenuManager.jsx";
import BookingManager from "./BookingManager.jsx";
import { useGMaps } from "./GMap.jsx";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";


// ─── ANALYTICS MINI CARD ──────────────────────────────────────────────────────
function MetricCard({ label, value, icon, color, T }) {
  return <div style={{ background: T.white, borderRadius: 14, padding: "14px 16px", boxShadow: T.shadow, flex: 1, minWidth: 0 }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}><span className="text-xs" style={{ fontWeight: 700, color: T.sub, textTransform: "uppercase", letterSpacing: .6 }}>{label}</span><div style={{ width: 30, height: 30, borderRadius: 8, background: color + "22", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name={icon} size={14} color={color} /></div></div><div className="text-2xl" style={{ fontWeight: 800, color: T.text }}>{value}</div></div>;
}




// ─────────────────────────────────────────────────────────────────────────────
//  ADMIN PANEL — TOTAL
// ─────────────────────────────────────────────────────────────────────────────
function AdminPanel({ onClose, onToast, onOpenStoreAdmin, T }) {
  const [tab, setTab] = useState("dashboard");
  const [data, setData] = useState({ biz: [], events: [], promos: [], coupons: [], raffles: [], banners: [], cities: [], categories: [], analytics: [], reservations: [], claims: [] });
  const [loading, setLoading] = useState(true);
  const [bizForm, setBizForm] = useState(null);
  const [evForm, setEvForm] = useState(null);
  const [prForm, setPrForm] = useState(null);
  const [cpForm, setCpForm] = useState(null);
  const [rfForm, setRfForm] = useState(null);
  const [banForm, setBanForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [cityEditId, setCityEditId] = useState(null);
  const [cityImgInput, setCityImgInput] = useState("");
  const [catForm, setCatForm] = useState(null);
  const [cityForm, setCityForm] = useState(null);
  const [bizSearch, setBizSearch] = useState("");
  const [bizCityFilter, setBizCityFilter] = useState("all");
  const [bizTypeFilter, setBizTypeFilter] = useState("all");
  const [dashCityFilter, setDashCityFilter] = useState("all");
  const [analyticsTarget, setAnalyticsTarget] = useState(null);
  const gok = useGMaps();

  const parseJSON = (val) => {
    if (typeof val === 'string') {
      try { return JSON.parse(val); } catch(e) { return {}; }
    }
    return val || {};
  };

  const load = useCallback(async () => { 
    setLoading(true); 
    try { 
      const [b, e, p, c, bn, ci, ca, an, rv, cl, rf] = await Promise.all([
        sb.get("businesses", "?order=created_at.desc"), 
        sb.get("events", "?order=created_at.desc"), 
        sb.get("promos", "?order=created_at.desc"), 
        sb.get("coupons", "?order=created_at.desc"), 
        sb.get("banners", "?order=sort_order.asc"), 
        sb.get("cities", "?order=name.asc"), 
        sb.get("categories", "?order=sort_order.asc"), 
        (async () => {
          let all = [];
          let offset = 0;
          while (true) {
            const chunk = await sb.get("analytics", `?select=event_type,city_slug,biz_id,created_at&limit=1000&offset=${offset}`);
            all = all.concat(chunk);
            if (chunk.length < 1000) break;
            offset += 1000;
          }
          return all;
        })(),
        sb.get("reservations", "?order=created_at.desc&limit=200"), 
        sb.get("business_claims", "?status=eq.pending"),
        sb.get("raffles", "?order=created_at.desc").catch(() => [])
      ]); 
      
      const parsedBiz = Array.isArray(b) ? b.map(biz => ({
        ...biz,
        schedule: parseJSON(biz.schedule),
        social_links: parseJSON(biz.social_links),
        booking_config: parseJSON(biz.booking_config),
        blocked_slots: parseJSON(biz.blocked_slots),
        photos: parseJSON(biz.photos)
      })) : [];

      setData({ biz: parsedBiz, events: e, promos: p, coupons: c, raffles: Array.isArray(rf) ? rf : [], banners: bn, cities: ci, categories: ca, analytics: an, reservations: Array.isArray(rv) ? rv : [], claims: Array.isArray(cl) ? cl : [] }); 
    } catch (e) { 
      onToast("Error cargando datos");
    } finally { 
      setLoading(false); 
    } 
  }, []);
  useEffect(() => { load(); }, []);

  const geo = () => { if (!gok || !bizForm?.address) return; new window.google.maps.Geocoder().geocode({ address: bizForm.address }, (r, s) => { if (s === "OK") { const l = r[0].geometry.location; setBizForm(f => ({ ...f, lat: l.lat(), lng: l.lng() })); } }); };

  // ─ Dashboard stats ─
  const dashBiz = dashCityFilter === "all" ? data.biz : data.biz.filter(b => b.city_slug === dashCityFilter);
  const dashEv = dashCityFilter === "all" ? data.events : data.events.filter(ev => ev.city_slug === dashCityFilter);
  const dashAn = dashCityFilter === "all" ? data.analytics : data.analytics.filter(a => a.city_slug === dashCityFilter);
  const stats = { total: dashBiz.filter(b => b.status !== "pending" && b.status !== "needs_changes").length, approved: dashBiz.filter(b => b.status === "approved").length, pending: dashBiz.filter(b => b.status === "pending" || b.status === "needs_changes").length + dashEv.filter(ev => ev.status === "pending").length, views: dashAn.filter(a => a.event_type === "view").length, whatsapp: dashAn.filter(a => a.event_type === "whatsapp").length, phone: dashAn.filter(a => a.event_type === "phone").length, website: dashAn.filter(a => a.event_type === "website").length, maps: dashAn.filter(a => a.event_type === "maps").length };

  const TABS = [["dashboard", "Panel"], ["biz", "Negocios"], ["pending", "Pendientes"], ["media", "Multimedia"], ["events", "Eventos"], ["promos", "Promos"], ["coupons", "Cupones"], ["raffles", "Sorteos"], ["banners", "Banners"], ["cities", "Ciudades"], ["categories", "Categorías"], ["reservations", "Reservas"], ["push", "Push"]];

  const FI = ({ label, field, src, set, type = "text", rows, ph = "" }) => {
    const handleChange = e => {
      const val = type === "number" ? e.target.value : e.target.value;
      set(prev => ({ ...prev, [field]: val }));
    };
    const inputStyle = { padding: "11px 14px", border: "1.5px solid #E4E8E4", borderRadius: 10, fontSize: 16, color: "#0F1A14", background: "#fff", fontFamily: "inherit", width: "100%" };
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <label className="text-xs" style={{ fontWeight: 700, color: "#5A6872", textTransform: "uppercase", letterSpacing: .8 }}>{label}</label>
        {rows
          ? <textarea rows={rows} defaultValue={src[field] || ""} placeholder={ph} onBlur={handleChange} style={{ ...inputStyle, resize: "vertical" }} />
          : <input type={type} defaultValue={src[field] ?? ""} placeholder={ph} key={`${field}-${src?.id || "new"}`} onBlur={handleChange} style={inputStyle} />
        }
      </div>
    );
  };

  const saveBiz = async () => { setSaving(true); try { const tags = typeof bizForm.tags === "string" ? bizForm.tags.split(",").map(t => t.trim()).filter(Boolean) : bizForm.tags; const cty = bizForm.city_slug || "tepic"; let baseSlug = bizForm.slug || createSlug(bizForm.name); if (!baseSlug.startsWith(cty + "-")) baseSlug = `${cty}-${baseSlug}`; let newSlug = baseSlug; let counter = 1; while (data.biz.some(b => b.slug === newSlug && b.id !== bizForm.id)) { newSlug = `${baseSlug}-${counter++}`; } const payload = { category: bizForm.category, name: bizForm.name, slug: newSlug, emoji: bizForm.emoji || null, type: bizForm.type, tagline: bizForm.tagline, schedule: bizForm.schedule || {}, address: bizForm.address, city_slug: bizForm.city_slug || "tepic", lat: bizForm.lat, lng: bizForm.lng, phone: bizForm.phone, whatsapp: bizForm.whatsapp, website: bizForm.website, video_url: bizForm.video_url || null, logo_url: bizForm.logo_url || null, hours: bizForm.hours, tags, description: bizForm.description, open: bizForm.open, badge: bizForm.badge || null, plan: bizForm.plan || "free", status: bizForm.status || "pending", photos: bizForm.photos || [], social_links: bizForm.social_links || {}, menu_pdf_url: bizForm.menu_pdf_url || null, is_place: bizForm.is_place || false, hide_location: bizForm.hide_location || false, booking_config: bizForm.booking_config || null }; if (bizForm._new) await sb.post("businesses", payload); else await sb.patch("businesses", bizForm.id, payload); onToast(bizForm._new ? "Negocio creado ✓" : "Negocio actualizado ✓"); setBizForm(null); await load(); } catch (e) { onToast("Error: " + e.message); } finally { setSaving(false); } };
  const approveBiz = async (id) => { 
    await sb.patch("businesses", id, { status: "approved" }); 
    const b = data.biz.find(x => x.id === id);
    if (b?.owner_id) await sb.notify(b.owner_id, "¡Negocio aprobado!", `Tu negocio ${b.name} ya es público.`, "approval");
    onToast("Negocio aprobado ✓"); 
    await load(); 
  };
  const rejectBiz = async (id) => { if (!window.confirm("¿Estás seguro de que deseas rechazar y eliminar este negocio por completo?")) return; await sb.del("businesses", id); onToast("Negocio eliminado"); await load(); };
  const delBiz = async (id) => { if (!window.confirm("¿Eliminar?")) return; await sb.del("businesses", id); onToast("Eliminado"); await load(); };

  // Photo management for a business
  const [mediaTarget, setMediaTarget] = useState(null);
  const addPhoto = async (url) => { const b = data.biz.find(x => x.id === mediaTarget); const photos = [...(b.photos || []), { url, label: "Foto" }]; await sb.patch("businesses", mediaTarget, { photos }); onToast("Foto añadida ✓"); await load(); };
  const removePhoto = async (bizId, idx) => { const b = data.biz.find(x => x.id === bizId); const photos = b.photos.filter((_, i) => i !== idx); await sb.patch("businesses", bizId, { photos }); onToast("Foto eliminada"); await load(); };
  const movePhoto = async (bizId, from, to) => { const b = data.biz.find(x => x.id === bizId); const photos = [...b.photos]; const [moved] = photos.splice(from, 1); photos.splice(to, 0, moved); await sb.patch("businesses", bizId, { photos }); await load(); };
  const uploadPDF = async (url, bizId) => { await sb.patch("businesses", bizId, { menu_pdf_url: url }); onToast("Menú PDF actualizado ✓"); await load(); };
  const removePDF = async (bizId) => { await sb.patch("businesses", bizId, { menu_pdf_url: null }); onToast("PDF eliminado"); await load(); };

  return <div style={{ position: "fixed", inset: 0, background: "#F7F8F6", zIndex: 9999, display: "flex", flexDirection: "column", fontFamily: "'DM Sans',system-ui,sans-serif", overflowY: "auto" }}>
    <div style={{ background: "linear-gradient(135deg, #111827 0%, #000000 100%)", padding: "52px 16px 0", flexShrink: 0 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div><div className="text-xs" style={{ color: "rgba(255, 255, 255, .55)", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.2 }}>Panel Total</div><h2 className="text-xl" style={{ fontWeight: 800, color: "#fff", marginTop: 2, display: "flex", alignItems: "center", gap: 8 }}><Icon name="db" size={18} color="#fff" /> Administración</h2></div>
        <button className="text-sm" onClick={onClose} style={{ background: "rgba(255, 255, 255, .12)", border: "1px solid rgba(255, 255, 255, .2)", borderRadius: 10, padding: "8px 14px", color: "#fff", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>✕ Salir</button>
      </div>
      {/* Scrollable tab bar */}
      <div style={{ display: "flex", gap: 0, overflowX: "auto", paddingBottom: 0 }}>
        {TABS.map(([id, lbl]) => <button key={id} onClick={() => { setTab(id); setBizForm(null); setEvForm(null); setPrForm(null); setCpForm(null); setBanForm(null); setMediaTarget(null); setCityForm(null); }} style={{ padding: "10px 14px", border: "none", cursor: "pointer", fontWeight: 700, fontSize: 12, background: "transparent", color: tab === id ? "#fff" : "rgba(255,255,255,.5)", borderBottom: `2px solid ${tab === id ? "#fff" : "transparent"}`, whiteSpace: "nowrap", fontFamily: "inherit", flexShrink: 0 }}>{lbl}</button>)}
      </div>
    </div>

    <div style={{ flex: 1, overflowY: "auto", padding: "20px 16px 80px" }}>
      {loading && <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>{[1, 2, 3].map(i => <div key={i} style={{ background: "#fff", borderRadius: 12, height: 70, boxShadow: "0 2px 8px rgba(0,0,0,.05)" }} />)}</div>}
      {!loading && <>

        {/* ─ DASHBOARD ─ */}
        {tab === "dashboard" && <div>
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
            <MetricCard label="Pendientes" value={stats.pending} icon="calendar" icon="eye" color="#F59E0B" T={T} />
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
            {Object.entries(PLAN_META).map(([k, m]) => { const count = dashBiz.filter(b => b.plan === k).length; return <div key={k} style={{ background: "#fff", borderRadius: 12, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12, boxShadow: "0 2px 8px rgba(0,0,0,.05)" }}><div style={{ width: 10, height: 10, borderRadius: "50%", background: m.color, flexShrink: 0 }} /><span className="text-sm" style={{ fontWeight: 600, color: "#0F1A14", flex: 1 }}>{m.label}</span><span className="text-xl" style={{ fontWeight: 800, color: m.color }}>{count}</span></div>; })}
          </div>
        </div>}

        {/* ─ NEGOCIOS ─ */}
        {tab === "biz" && !bizForm && <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <span className="text-sm" style={{ fontWeight: 600, color: "#5A6872" }}>{data.biz.length} negocios totales</span>
            <button onClick={() => setBizForm({ _new: true, category: data.categories.length > 0 ? data.categories[0].slug : "restaurantes", open: true, photos: [], tags: "", lat: 21.5042, lng: -104.8944, plan: "free", status: "pending", city_slug: "tepic", social_links: {} })} style={{ background: "#1A7A5E", color: "#fff", border: "none", borderRadius: 10, padding: "9px 14px", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 5 }}><Icon name="plus" size={14} color="#fff" /> Nuevo</button>
          </div>

          <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
            <div style={{ flex: "2 1 250px", position: "relative" }}>
              <div style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}><Icon name="search" size={16} color="#9CA3AF" /></div>
              <input value={bizSearch} onChange={e => setBizSearch(e.target.value)} placeholder="Buscar negocio por nombre..." style={{ width: "100%", padding: "10px 10px 10px 36px", border: "1.5px solid #E4E8E4", borderRadius: 10, fontSize: 14, color: "#0F1A14", background: "#fff", fontFamily: "inherit" }} />
            </div>
            <select value={bizTypeFilter} onChange={e => setBizTypeFilter(e.target.value)} style={{ flex: "1 1 130px", padding: "10px 12px", border: "1.5px solid #E4E8E4", borderRadius: 10, fontSize: 13, color: "#0F1A14", background: "#fff", fontFamily: "inherit", cursor: "pointer" }}>
              <option value="all">Todos los tipos</option>
              <option value="biz">Negocios</option>
              <option value="place">Lugares públicos</option>
            </select>
            <select value={bizCityFilter} onChange={e => setBizCityFilter(e.target.value)} style={{ flex: "1 1 130px", padding: "10px 12px", border: "1.5px solid #E4E8E4", borderRadius: 10, fontSize: 13, color: "#0F1A14", background: "#fff", fontFamily: "inherit", cursor: "pointer" }}>
              <option value="all">Todas las ciudades</option>
              {data.cities.map(c => <option key={c.slug} value={c.slug}>{c.name}</option>)}
            </select>
          </div>

          {(() => {
            const filtered = data.biz.filter(b => {
              if (b.status === "pending" || b.status === "needs_changes") return false;
              if (bizCityFilter !== "all" && b.city_slug !== bizCityFilter) return false;
              if (bizTypeFilter === "biz" && b.is_place) return false;
              if (bizTypeFilter === "place" && !b.is_place) return false;
              if (bizSearch && !b.name?.toLowerCase().includes(bizSearch.toLowerCase())) return false;
              return true;
            });

            if (filtered.length === 0) {
              return <div className="text-sm" style={{ textAlign: "center", padding: "40px 0", color: "#5A6872" }}>No se encontraron negocios con esos filtros.</div>;
            }

            return filtered.map(b => {
              const pm = PLAN_META[b.plan] || PLAN_META.free;
              return <div key={b.id} style={{ background: "#fff", borderRadius: 14, padding: "12px 14px", marginBottom: 10, display: "flex", alignItems: "center", gap: 10, boxShadow: "0 2px 8px rgba(0,0,0,.05)" }}>
                <div style={{ width: 46, height: 46, borderRadius: 10, overflow: "hidden", flexShrink: 0, background: "#F7F8F6" }}>{b.photos?.[0]?.url ? <img src={b.photos[0].url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} loading="lazy" /> : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="store" size={18} color="#5A6872" /></div>}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="text-sm" style={{ fontWeight: 700, color: "#0F1A14", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.name}</div>
                  <div style={{ display: "flex", gap: 5, marginTop: 4, flexWrap: "wrap" }}>
                    <span className="text-micro" style={{ padding: "2px 8px", borderRadius: 20, background: b.status === "approved" ? "#DCFCE7" : b.status === "pending" ? "#FEF3C7" : "#FEE2E2", color: b.status === "approved" ? "#16A34A" : b.status === "pending" ? "#92400E" : "#D94F3D", fontWeight: 700 }}>{b.status === "approved" ? "Aprobado" : b.status === "pending" ? "Pendiente" : "Rechazado"}</span>
                    <span className="text-micro" style={{ padding: "2px 8px", borderRadius: 20, background: pm.bg, color: pm.color, fontWeight: 700 }}>{pm.label}</span>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 5 }}>
                  <button onClick={() => setBizForm({ ...b, tags: Array.isArray(b.tags) ? b.tags.join(", ") : b.tags, social_links: b.social_links || {} })} style={{ background: "#EAF4F0", border: "none", borderRadius: 8, padding: "7px 9px", cursor: "pointer" }}><Icon name="edit" size={13} color="#1A7A5E" /></button>
                  <button onClick={() => { setAnalyticsTarget(b.id); setTab("analytics"); }} style={{ background: "#FEF3C7", border: "none", borderRadius: 8, padding: "7px 9px", cursor: "pointer", display: "flex", alignItems: "center" }}><Icon name="eye" size={13} color="#D97706" /></button>
                  <button onClick={() => { setMediaTarget(b.id); setTab("media"); }} style={{ background: "#EEF2FF", border: "none", borderRadius: 8, padding: "7px 9px", cursor: "pointer" }}><Icon name="image" size={13} color="#4F46E5" /></button>
                  {!b.is_place && <button onClick={() => onOpenStoreAdmin?.(b)} style={{ background: "#DCFCE7", border: "none", borderRadius: 8, padding: "7px 9px", cursor: "pointer" }}><Icon name="store" size={13} color="#16A34A" /></button>}
                  <button onClick={() => delBiz(b.id)} style={{ background: "#FFF5F5", border: "none", borderRadius: 8, padding: "7px 9px", cursor: "pointer" }}><Icon name="trash" size={13} color="#D94F3D" /></button>
                </div>
              </div>;
            });
          })()}
        </div>}

        {/* ─ BIZ FORM ─ */}
        {tab === "biz" && bizForm && <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ background: "#fff", borderRadius: 14, padding: 16, boxShadow: "0 2px 8px rgba(0,0,0,.05)", display: "flex", flexDirection: "column", gap: 11 }}>
            <div className="text-base" style={{ fontWeight: 800, color: "#0F1A14" }}>{bizForm._new ? "Nuevo negocio" : "Editar: " + bizForm.name}</div>
            <div style={{ display: "flex", gap: 12 }}>
              <div style={{ flex: 1 }}><FI label="Nombre *" field="name" src={bizForm} set={setBizForm} /></div>
              <div style={{ width: 80 }}><FI label="Emoji" field="emoji" src={bizForm} set={setBizForm} ph="Ej: 🌮" /></div>
            </div>
            <FI label="Tipo" field="type" src={bizForm} set={setBizForm} ph="Restaurante · Cocina de Autor" />
            <FI label="Tagline" field="tagline" src={bizForm} set={setBizForm} />
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px", background: "#F5F3FF", borderRadius: 12, border: "1.5px dashed #7C3AED" }}>
              <input type="checkbox" id="is_place" checked={bizForm.is_place || false} onChange={e => setBizForm(f => ({ ...f, is_place: e.target.checked }))} style={{ width: 18, height: 18, accentColor: "#7C3AED", cursor: "pointer" }} />
              <label className="text-sm" htmlFor="is_place" style={{ fontWeight: 700, color: "#7C3AED", cursor: "pointer" }}>📍 Es un lugar público (Ocultar info de negocio)</label>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div><label className="text-xs" style={{ fontWeight: 700, color: "#5A6872", textTransform: "uppercase", letterSpacing: .8, display: "block", marginBottom: 4 }}>Categoría</label><select value={bizForm.category || (data.categories.length > 0 ? data.categories[0].slug : "restaurantes")} onChange={e => setBizForm(f => ({ ...f, category: e.target.value }))} style={{ width: "100%", padding: "11px 12px", border: "1.5px solid #E4E8E4", borderRadius: 10, fontSize: 13, color: "#0F1A14", background: "#fff", fontFamily: "inherit" }}>{data.categories.map(c => <option key={c.slug} value={c.slug}>{c.name}</option>)}</select></div>
              {!bizForm.is_place && <div><label className="text-xs" style={{ fontWeight: 700, color: "#5A6872", textTransform: "uppercase", letterSpacing: .8, display: "block", marginBottom: 4 }}>Plan</label><select value={bizForm.plan || "free"} onChange={e => setBizForm(f => ({ ...f, plan: e.target.value }))} style={{ width: "100%", padding: "11px 12px", border: "1.5px solid #E4E8E4", borderRadius: 10, fontSize: 13, color: "#0F1A14", background: "#fff", fontFamily: "inherit" }}>{Object.entries(PLAN_META).map(([k, m]) => <option key={k} value={k}>{m.label}</option>)}</select></div>}
              <div><label className="text-xs" style={{ fontWeight: 700, color: "#5A6872", textTransform: "uppercase", letterSpacing: .8, display: "block", marginBottom: 4 }}>Estado</label><select value={bizForm.status || "pending"} onChange={e => setBizForm(f => ({ ...f, status: e.target.value }))} style={{ width: "100%", padding: "11px 12px", border: "1.5px solid #E4E8E4", borderRadius: 10, fontSize: 13, color: "#0F1A14", background: "#fff", fontFamily: "inherit" }}>{["pending", "approved", "rejected"].map(s => <option key={s}>{s}</option>)}</select></div>
              <div><label className="text-xs" style={{ fontWeight: 700, color: "#5A6872", textTransform: "uppercase", letterSpacing: .8, display: "block", marginBottom: 4 }}>Ciudad</label><select value={bizForm.city_slug || "tepic"} onChange={e => setBizForm(f => ({ ...f, city_slug: e.target.value }))} style={{ width: "100%", padding: "11px 12px", border: "1.5px solid #E4E8E4", borderRadius: 10, fontSize: 13, color: "#0F1A14", background: "#fff", fontFamily: "inherit" }}>{data.cities.map(c => <option key={c.slug} value={c.slug}>{c.name}</option>)}</select></div>
              {!bizForm.is_place && <>
                <FI label="Teléfono" field="phone" src={bizForm} set={setBizForm} />
                <FI label="WhatsApp" field="whatsapp" src={bizForm} set={setBizForm} />
              </>}
            </div>
            {!bizForm.is_place && <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label className="text-xs" style={{ fontWeight: 700, color: "#5A6872", textTransform: "uppercase", letterSpacing: .8, display: "block", marginBottom: 6 }}>Tipo de Horario</label>
                <select value={(bizForm.schedule || {}).type || "regular"} onChange={e => setBizForm(f => ({ ...f, schedule: { ...(f.schedule || {}), type: e.target.value } }))} style={{ width: "100%", padding: "11px 12px", border: "1.5px solid #E4E8E4", borderRadius: 10, fontSize: 13, color: "#0F1A14", background: "#fff", fontFamily: "inherit" }}>
                  <option value="regular">Regular (Un turno por día)</option>
                  <option value="advanced">Avanzado (Múltiples turnos o clases)</option>
                  <option value="always_open">Siempre Abierto (24/7)</option>
                  <option value="appointment">Previa Cita / Servicio (Sin horario fijo)</option>
                  <option value="delivery">Solo a Domicilio / Para Llevar (Dark Kitchen)</option>
                </select>
              </div>

              {(!bizForm.schedule?.type || bizForm.schedule?.type === "regular" || bizForm.schedule?.type === "advanced" || bizForm.schedule?.type === "delivery") && <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <label className="text-xs" style={{ fontWeight: 700, color: "#5A6872", textTransform: "uppercase", letterSpacing: .8 }}>Horario por día</label>
                  <button type="button" onClick={() => {
                    const lun = (bizForm.schedule || {}).lun || "";
                    if (!lun) return;
                    setBizForm(f => ({ ...f, schedule: { ...f.schedule, mar: lun, mie: lun, jue: lun, vie: lun, sab: lun, dom: lun } }));
                  }} style={{ fontSize: 11, fontWeight: 700, color: "#1A7A5E", background: "#EAF4F0", border: "none", padding: "4px 8px", borderRadius: 6, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}><Icon name="nav" size={12} /> Copiar Lunes a todos</button>
                </div>
                {[["lun", "Lunes"], ["mar", "Martes"], ["mie", "Miércoles"], ["jue", "Jueves"], ["vie", "Viernes"], ["sab", "Sábado"], ["dom", "Domingo"]].map(([key, label]) => {
                  const raw = (bizForm.schedule || {})[key] || "";
                  const closed = !raw || /cerrado/i.test(raw);
                  const isAdv = (bizForm.schedule || {}).type === "advanced";
                  const toT24 = s => {
                    const m = (s || "").trim().match(/(\d{1,2})(?:\s*:\s*(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)?/i);
                    if (!m) return "";
                    let h = parseInt(m[1]);
                    const mn = parseInt(m[2] || 0);
                    const p = (m[3] || "").replace(/\./g, "").toLowerCase();
                    if (p === "pm" && h !== 12) h += 12;
                    if (p === "am" && h === 12) h = 0;
                    return `${String(h).padStart(2,"0")}:${String(mn).padStart(2,"0")}`;
                  };
                  const to12h = s => { if(!s) return ""; let [h, m] = s.split(":"); h = parseInt(h); const p = h >= 12 ? "p.m." : "a.m."; h = h % 12 || 12; return `${String(h).padStart(2, "0")}:${m} ${p}`; };
                  const linesArr = closed ? [] : raw.split('\n').map(x => x.trim()).filter(Boolean);
                  
                  const updateDayStr = (val) => {
                    setBizForm(f => ({ ...f, schedule: { ...(f.schedule || {}), [key]: val } }));
                  };

                  const updateRegular = (o, c) => updateDayStr(`${to12h(o)} - ${to12h(c)}`);

                  return <div key={key} style={{ display: "flex", alignItems: isAdv && !closed ? "flex-start" : "center", gap: 6, marginBottom: isAdv && !closed ? 8 : 0 }}>
                    <span className="text-xs" style={{ fontWeight: 700, color: "#0F1A14", width: 76, flexShrink: 0, marginTop: isAdv && !closed ? 8 : 0 }}>{label}</span>
                    <button type="button" onClick={() => closed ? updateDayStr(isAdv ? "09:00 a.m. - 02:00 p.m.\n04:00 p.m. - 08:00 p.m." : "09:00 a.m. - 10:00 p.m.") : updateDayStr("Cerrado")} style={{ padding: "6px 10px", border: `1.5px solid ${closed ? "#E4E8E4" : "#1A7A5E"}`, borderRadius: 8, fontSize: 11, fontWeight: 700, background: closed ? "#F3F4F6" : "#EAF4F0", color: closed ? "#9CA3AF" : "#1A7A5E", cursor: "pointer", fontFamily: "inherit", flexShrink: 0, transition: "all .15s", marginTop: isAdv && !closed ? 3 : 0 }}>{closed ? "Cerrado" : "Abierto"}</button>
                    
                    {!closed && !isAdv && (() => {
                      const segs = (linesArr[0] || "09:00 a.m. - 10:00 p.m.").split(/\s*[–\-]\s*|\s+a\s+/i);
                      return (
                        <div style={{ display: "flex", alignItems: "center", gap: 4, flex: 1 }}>
                          <input type="time" value={toT24(segs[0]) || "09:00"} onChange={e => updateRegular(e.target.value, toT24(segs[1]) || "22:00")} style={{ flex: 1, padding: "6px 4px", border: "1.5px solid #E4E8E4", borderRadius: 8, fontSize: 13, color: "#0F1A14", background: "#fff", fontFamily: "inherit" }} />
                          <span className="text-xs" style={{ color: "#5A6872", flexShrink: 0 }}>a</span>
                          <input type="time" value={toT24(segs[1]) || "22:00"} onChange={e => updateRegular(toT24(segs[0]) || "09:00", e.target.value)} style={{ flex: 1, padding: "6px 4px", border: "1.5px solid #E4E8E4", borderRadius: 8, fontSize: 13, color: "#0F1A14", background: "#fff", fontFamily: "inherit" }} />
                        </div>
                      )
                    })()}
                    
                    {!closed && isAdv && <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
                      {linesArr.map((line, idx) => {
                        const segs = line.split(/\s*[–\-]\s*|\s+a\s+/i);
                        const o = toT24(segs[0]) || "09:00";
                        const c = toT24(segs[1]) || "14:00";
                        return (
                          <div key={idx} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <input type="time" value={o} onChange={e => { const nl = [...linesArr]; nl[idx] = `${to12h(e.target.value)} - ${to12h(c)}`; updateDayStr(nl.join('\n')); }} style={{ flex: 1, padding: "6px 4px", border: "1.5px solid #E4E8E4", borderRadius: 8, fontSize: 13, color: "#0F1A14", background: "#fff", fontFamily: "inherit" }} />
                            <span className="text-xs" style={{ color: "#5A6872", flexShrink: 0 }}>a</span>
                            <input type="time" value={c} onChange={e => { const nl = [...linesArr]; nl[idx] = `${to12h(o)} - ${to12h(e.target.value)}`; updateDayStr(nl.join('\n')); }} style={{ flex: 1, padding: "6px 4px", border: "1.5px solid #E4E8E4", borderRadius: 8, fontSize: 13, color: "#0F1A14", background: "#fff", fontFamily: "inherit" }} />
                            <button type="button" onClick={() => { const nl = linesArr.filter((_, i) => i !== idx); if (!nl.length) updateDayStr("Cerrado"); else updateDayStr(nl.join('\n')); }} style={{ padding: "4px", background: "none", border: "none", color: "#EF4444", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="x" size={14} /></button>
                          </div>
                        );
                      })}
                      {linesArr.length < 3 && (
                        <button type="button" onClick={() => { updateDayStr([...linesArr, "04:00 p.m. - 08:00 p.m."].join('\n')); }} style={{ background: "none", border: "none", color: "#1A7A5E", fontSize: 11, fontWeight: 700, cursor: "pointer", padding: "4px 0", textAlign: "left", width: "max-content" }}>+ Añadir turno</button>
                      )}
                    </div>}
                  </div>;
                })}
              </div>}
            </div>}
            {!bizForm.is_place && (
              <>
                <FI label="Website" field="website" src={bizForm} set={setBizForm} />
                {bizForm.plan === "premium" ? (
                  <>
                    <div style={{ marginBottom: 12 }}>
                      <label className="text-xs" style={{ fontWeight: 700, color: "#5A6872", textTransform: "uppercase", letterSpacing: .8, display: "block", marginBottom: 4 }}>Logotipo en el Mapa</label>
                      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                        <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#F7F8F6", border: "1.5px solid #E4E8E4", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          {bizForm.logo_url ? <img src={bizForm.logo_url} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <Icon name="image" size={20} color="#5A6872" />}
                        </div>
                        <div style={{ flex: 1 }}>
                          <Uploader aspect={1} label="Subir Logotipo" onDone={url => setBizForm(f => ({ ...f, logo_url: url }))} />
                        </div>
                      </div>
                    </div>
                    <FI label="Video Promocional (YouTube/TikTok)" field="video_url" src={bizForm} set={setBizForm} ph="https://youtube.com/watch?v=..." />
                  </>
                ) : (
                  <div><label className="text-xs" style={{ fontWeight: 700, color: "#5A6872", textTransform: "uppercase", letterSpacing: .8, display: "block", marginBottom: 4 }}>Video Promocional y Logotipo</label><div className="text-sm" style={{ padding: "11px 12px", border: "1.5px solid #E4E8E4", borderRadius: 10, color: "#9CA3AF", background: "#F3F4F6", fontFamily: "inherit" }}>Requiere plan Premium</div></div>
                )}
              </>
            )}
            <FI label="Tags (separar con coma)" field="tags" src={bizForm} set={setBizForm} />
            <FI label="Badge" field="badge" src={bizForm} set={setBizForm} ph="Muy popular…" />
            <FI label="Descripción" field="description" src={bizForm} set={setBizForm} rows={3} />
            {!bizForm.is_place && <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label className="text-xs" style={{ fontWeight: 700, color: "#5A6872", textTransform: "uppercase", letterSpacing: .8 }}>Redes sociales</label>
              {[
                { sn: "instagram", color: "#E1306C", icon: "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.227-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" },
                { sn: "facebook", color: "#1877F2", icon: "M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" },
                { sn: "tiktok", color: "#000000", icon: "M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.79 1.54V6.78a4.85 4.85 0 01-1.02-.09z" }
              ].map(({ sn, color, icon }) => (
                <div key={sn} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", border: "1.5px solid #E4E8E4", borderRadius: 10, background: "#fff" }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill={color}><path d={icon} /></svg>
                  <span className="text-xs" style={{ color: "#5A6872", fontWeight: 600 }}>@</span>
                  <input
                    value={bizForm.social_links?.[sn] || ""}
                    onChange={e => setBizForm(f => ({ ...f, social_links: { ...f.social_links, [sn]: e.target.value.replace("@", "") } }))}
                    placeholder={`usuario de ${sn}`}
                    style={{ flex: 1, border: "none", outline: "none", fontSize: 13, color: "#0F1A14", background: "transparent", fontFamily: "inherit" }}
                  />
                  {bizForm.social_links?.[sn] && <a className="text-xs" href={`https://www.${sn}.com/${bizForm.social_links[sn]}`} target="_blank" rel="noreferrer" style={{ color: color, fontWeight: 700, textDecoration: "none" }}>Ver →</a>}
                </div>
              ))}
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", border: "1.5px solid #E4E8E4", borderRadius: 10, background: "#fff", marginTop: 4 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#DB4437" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zM12 11.5a2.5 2.5 0 110-5 2.5 2.5 0 010 5z" /></svg>
                <span className="text-xs" style={{ color: "#5A6872", fontWeight: 600 }}>ID:</span>
                <input
                  value={bizForm.social_links?.google_place_id || ""}
                  onChange={e => setBizForm(f => ({ ...f, social_links: { ...f.social_links, google_place_id: e.target.value } }))}
                  placeholder="Google Place ID (ej: ChIJ...)"
                  style={{ flex: 1, border: "none", outline: "none", fontSize: 13, color: "#0F1A14", background: "transparent", fontFamily: "inherit" }}
                />
                {bizForm.social_links?.google_place_id && <a className="text-xs" href={`https://www.google.com/maps/place/?q=place_id:${bizForm.social_links.google_place_id}`} target="_blank" rel="noreferrer" style={{ color: "#DB4437", fontWeight: 700, textDecoration: "none" }}>Ver mapa →</a>}
              </div>
            </div>}
            {!bizForm.is_place && <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <label className="text-sm" style={{ fontWeight: 600, color: "#0F1A14" }}>Estado actual:</label>
              <button onClick={() => setBizForm(f => ({ ...f, open: !f.open }))} style={{ width: 46, height: 24, borderRadius: 12, border: "none", cursor: "pointer", background: bizForm.open ? "#1A7A5E" : "#E4E8E4", position: "relative", transition: "background .2s" }}><div style={{ position: "absolute", top: 2, left: bizForm.open ? 24 : 2, width: 20, height: 20, borderRadius: "50%", background: "#fff", transition: "left .2s", boxShadow: "0 1px 4px rgba(0,0,0,.2)" }} /></button>
              <span className="text-sm" style={{ color: bizForm.open ? "#16A34A" : "#D94F3D", fontWeight: 700 }}>{bizForm.open ? "Abierto" : "Cerrado"}</span>
            </div>}
          </div>
          {/* Location */}
          <div style={{ background: "#fff", borderRadius: 14, padding: 16, boxShadow: "0 2px 8px rgba(0,0,0,.05)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div className="text-sm" style={{ fontWeight: 800, color: "#0F1A14" }}>Ubicación</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span className="text-xs" style={{ color: bizForm.hide_location ? "#D94F3D" : "#5A6872", fontWeight: 600 }}>{bizForm.hide_location ? "Oculta" : "Visible"}</span>
                <button onClick={() => setBizForm(f => ({ ...f, hide_location: !f.hide_location }))} style={{ width: 46, height: 24, borderRadius: 12, border: "none", cursor: "pointer", background: bizForm.hide_location ? "#D94F3D" : "#1A7A5E", position: "relative", transition: "background .2s" }}><div style={{ position: "absolute", top: 2, left: bizForm.hide_location ? 24 : 2, width: 20, height: 20, borderRadius: "50%", background: "#fff", transition: "left .2s", boxShadow: "0 1px 4px rgba(0,0,0,.2)" }} /></button>
              </div>
            </div>
            {bizForm.hide_location && <div className="text-xs" style={{ color: "#D94F3D", background: "#FEF2F2", borderRadius: 8, padding: "8px 10px", marginBottom: 8, fontWeight: 500 }}>La ubicación y el mapa no se mostrarán en el perfil público del negocio. Ideal para dark kitchens o servicios a domicilio.</div>}
            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}><input value={bizForm.address || ""} onChange={e => setBizForm(f => ({ ...f, address: e.target.value }))} placeholder="Dirección completa" style={{ flex: 1, padding: "11px 12px", border: "1.5px solid #E4E8E4", borderRadius: 10, fontSize: 14, color: "#0F1A14", background: "#fff", fontFamily: "inherit" }} /><button className="text-xs" onClick={geo} style={{ background: "#1A7A5E", border: "none", borderRadius: 10, padding: "0 12px", color: "#fff", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Geo</button></div>
            <div style={{ display: "flex", gap: 8 }}>
              <input value={bizForm.lat || ""} onChange={e => setBizForm(f => ({ ...f, lat: e.target.value }))} placeholder="Latitud (ej. 21.50)" style={{ flex: 1, padding: "9px 12px", border: "1.5px solid #E4E8E4", borderRadius: 10, fontSize: 13, color: "#0F1A14", background: "#fff", fontFamily: "inherit" }} />
              <input value={bizForm.lng || ""} onChange={e => setBizForm(f => ({ ...f, lng: e.target.value }))} placeholder="Longitud (ej. -104.89)" style={{ flex: 1, padding: "9px 12px", border: "1.5px solid #E4E8E4", borderRadius: 10, fontSize: 13, color: "#0F1A14", background: "#fff", fontFamily: "inherit" }} />
            </div>
          </div>
          {/* Photos in form */}
          <div style={{ background: "#fff", borderRadius: 14, padding: 16, boxShadow: "0 2px 8px rgba(0,0,0,.05)" }}>
            <div className="text-sm" style={{ fontWeight: 800, color: "#0F1A14", marginBottom: 8 }}>Fotos ({(bizForm.photos || []).length}/{bizForm.is_place ? "∞" : PLAN_META[bizForm.plan || "free"].max_photos})</div>
            {(bizForm.photos || []).length > 0 && <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>{(bizForm.photos || []).map((ph, idx) => <div key={idx} style={{ position: "relative" }}><div style={{ width: 64, height: 64, borderRadius: 10, overflow: "hidden", border: "1.5px solid #E4E8E4" }}>{ph.url && <img src={ph.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} loading="lazy" />}</div><button onClick={() => setBizForm(f => ({ ...f, photos: f.photos.filter((_, i) => i !== idx) }))} style={{ position: "absolute", top: -6, right: -6, width: 18, height: 18, borderRadius: "50%", background: "#D94F3D", color: "#fff", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="x" size={9} color="#fff" /></button></div>)}</div>}
            {(bizForm.is_place || (bizForm.photos || []).length < PLAN_META[bizForm.plan || "free"].max_photos) && <Uploader multiple={true} onDone={url => setBizForm(f => ({ ...f, photos: [...(f.photos || []), { url, label: "Foto" }] }))} />}
          </div>
          {/* PDF Menu */}
          {!bizForm.is_place && (bizForm.plan === "destacado" || bizForm.plan === "premium") && <div style={{ background: "#fff", borderRadius: 14, padding: 16, boxShadow: "0 2px 8px rgba(0,0,0,.05)" }}>
            <div className="text-sm" style={{ fontWeight: 700, color: "#5A6872", marginBottom: 6 }}>Menú Digital (Imágenes o PDF)</div>
            <MenuManager 
              menuPdfUrl={bizForm.menu_pdf_url} 
              onChange={(val) => setBizForm(f => ({ ...f, menu_pdf_url: val }))} 
            />
          </div>}

          {/* Booking config */}
          <BookingManager 
            bookingConfig={bizForm.booking_config} 
            onChange={cfg => setBizForm(f => ({ ...f, booking_config: cfg }))} 
            T={T}
          />
          
          {bizForm.owner_id && (
            <div style={{ background: "#FEF2F2", borderRadius: 12, padding: 14, marginBottom: 16, border: "1px solid #FCA5A5", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div className="text-sm" style={{ fontWeight: 800, color: "#991B1B" }}>Acceso de Dueño Activo</div>
                <div className="text-xs" style={{ color: "#991B1B", opacity: 0.8 }}>Este negocio está administrado por un usuario externo.</div>
              </div>
              <button onClick={async () => { if(window.confirm("¿Seguro que quieres quitarle el acceso al dueño actual?")){ await sb.patch("businesses", bizForm.id, { owner_id: null }); setBizForm(f => ({ ...f, owner_id: null })); onToast("Acceso revocado"); await load(); } }} style={{ padding: "8px 14px", background: "#EF4444", border: "none", borderRadius: 10, fontSize: 12, fontWeight: 700, color: "#fff", cursor: "pointer", fontFamily: "inherit" }}>Revocar acceso</button>
            </div>
          )}
          
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => setBizForm(null)} style={{ flex: 1, padding: 14, background: "#fff", border: "1.5px solid #E4E8E4", borderRadius: 12, fontWeight: 700, fontSize: 15, color: "#5A6872", cursor: "pointer", fontFamily: "inherit" }}>Cancelar</button>
            <button className="text-base" onClick={saveBiz} disabled={saving} style={{ flex: 2, padding: 14, background: saving ? "#5A6872" : "#1A7A5E", border: "none", borderRadius: 12, fontWeight: 700, color: "#fff", cursor: "pointer", fontFamily: "inherit" }}>{saving ? "Guardando…" : bizForm._new ? "Crear negocio" : "Guardar cambios"}</button>
          </div>
        </div>}

        {/* ─ PENDIENTES ─ */}
        {tab === "pending" && <div>
          <p className="text-lg" style={{ fontFamily: "'Coolvetica', sans-serif", color: "#0F1A14", marginBottom: 14 }}>Solicitudes pendientes</p>
          {(() => {
            const claims = data.claims || [];
            
            if (data.biz.filter(b => b.status === "pending" || b.status === "needs_changes").length === 0 && data.events.filter(ev => ev.status === "pending").length === 0 && claims.length === 0) {
              return <div style={{ textAlign: "center", padding: "40px 0", color: "#5A6872" }}><Icon name="check_sq" size={36} color="#E4E8E4" /><p style={{ marginTop: 12, fontWeight: 600 }}>Todo al día</p></div>;
            }

            return <>
              {claims.length > 0 && <div className="text-sm" style={{ fontWeight: 800, color: "#5A6872", marginBottom: 10, marginTop: 10, textTransform: "uppercase", letterSpacing: 1 }}>Reclamos Pendientes</div>}
              {claims.map(claim => {
                const b = data.biz.find(x => x.id === claim.business_id);
                const bizName = b ? b.name : "Negocio Desconocido";
                return <div key={claim.id} style={{ background: "#FEF9C3", borderRadius: 14, padding: "14px", marginBottom: 12, boxShadow: "0 2px 8px rgba(0,0,0,.05)", borderLeft: "4px solid #EAB308" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                    <div className="text-base" style={{ fontWeight: 800, color: "#854D0E" }}>Reclamo de {bizName}</div>
                    <span className="text-micro" style={{ background: "#FEF08A", color: "#854D0E", borderRadius: 20, padding: "2px 8px", fontWeight: 800 }}>Por revisar</span>
                  </div>
                  <div className="text-sm" style={{ color: "#713F12", marginBottom: 4 }}><strong>Email:</strong> {claim.email}</div>
                  <div className="text-sm" style={{ color: "#713F12", marginBottom: 4 }}><strong>Teléfono:</strong> {claim.phone}</div>
                  <div className="text-sm" style={{ color: "#713F12", marginBottom: 12 }}><strong>Rol:</strong> {claim.role}</div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={async () => { 
                      await sb.patch("businesses", claim.business_id, { owner_id: claim.user_id }); 
                      await sb.patch("business_claims", claim.id, { status: "approved" }); 
                      const b = data.biz.find(x => x.id === claim.business_id);
                      await sb.notify(claim.user_id, "Reclamo aprobado", `Eres el administrador oficial de ${b ? b.name : 'tu negocio'}.`, "approval");
                      onToast("Reclamo aprobado ✓"); 
                      await load(); 
                    }} style={{ flex: 1, padding: "9px 0", background: "#EAB308", border: "none", borderRadius: 10, fontWeight: 800, fontSize: 12, color: "#fff", cursor: "pointer", fontFamily: "inherit" }}>Aprobar Reclamo</button>
                    <button onClick={async () => { await sb.patch("business_claims", claim.id, { status: "rejected" }); onToast("Reclamo rechazado"); await load(); }} style={{ flex: 1, padding: "9px 0", background: "transparent", border: "1.5px solid #EAB308", borderRadius: 10, fontWeight: 800, fontSize: 12, color: "#A16207", cursor: "pointer", fontFamily: "inherit" }}>Rechazar</button>
                  </div>
                </div>
              })}
            </>;
          })()}
          {data.biz.some(b => b.status === "pending" || b.status === "needs_changes") && <div className="text-sm" style={{ fontWeight: 800, color: "#5A6872", marginBottom: 10, marginTop: 10, textTransform: "uppercase", letterSpacing: 1 }}>Negocios</div>}
          {data.biz.filter(b => b.status === "pending" || b.status === "needs_changes").map(b => <div key={b.id} style={{ background: "#fff", borderRadius: 14, padding: "14px", marginBottom: 12, boxShadow: "0 2px 8px rgba(0,0,0,.05)" }}>
            <div style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 10 }}>
              <div style={{ width: 52, height: 52, borderRadius: 12, overflow: "hidden", flexShrink: 0, background: "#F7F8F6" }}>{b.photos?.[0]?.url ? <img src={b.photos[0].url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <Icon name="store" size={20} color="#5A6872" />}</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div className="text-base" style={{ fontWeight: 700, color: "#0F1A14" }}>{b.name}</div>
                  <span className="text-micro" style={{ background: b.status === "needs_changes" ? "#F5F3FF" : "#FEF3C7", color: b.status === "needs_changes" ? "#7C3AED" : "#D97706", borderRadius: 20, padding: "2px 8px", fontWeight: 700, flexShrink: 0, marginLeft: 6 }}>{b.status === "needs_changes" ? "Requiere cambios" : "Pendiente"}</span>
                </div>
                <div className="text-xs" style={{ color: "#5A6872", marginTop: 2 }}>{b.type || b.category} · {b.address}</div>
                {b.phone && <div className="text-xs" style={{ color: "#5A6872" }}>Tel: {b.phone}{b.whatsapp && " · WA: " + b.whatsapp}</div>}
                {b.description && <div className="text-xs" style={{ color: "#5A6872", marginTop: 4, lineHeight: 1.4 }}>{b.description}</div>}
                {(b.facebook || b.instagram || b.tiktok) && <div className="text-xs" style={{ color: "#5A6872", marginTop: 4 }}>{[b.facebook && "FB", b.instagram && "IG", b.tiktok && "TK"].filter(Boolean).join(" · ")}</div>}
              </div>
            </div>
            {b.admin_notes && <div className="text-xs" style={{ background: "#F5F3FF", borderRadius: 8, padding: "8px 10px", color: "#7C3AED", marginBottom: 8, borderLeft: "3px solid #7C3AED" }}>Nota anterior: {b.admin_notes}</div>}
            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <button onClick={() => approveBiz(b.id)} style={{ flex: 1, padding: "9px 0", background: "#DCFCE7", border: "none", borderRadius: 10, fontWeight: 700, fontSize: 12, color: "#16A34A", cursor: "pointer", fontFamily: "inherit" }}>Aprobar</button>
              <button onClick={() => rejectBiz(b.id)} style={{ flex: 1, padding: "9px 0", background: "#FEE2E2", border: "none", borderRadius: 10, fontWeight: 700, fontSize: 12, color: "#D94F3D", cursor: "pointer", fontFamily: "inherit" }}>Rechazar</button>
              <button onClick={() => setBizForm({ ...b, tags: Array.isArray(b.tags) ? b.tags.join(", ") : b.tags, social_links: b.social_links || {} })} style={{ padding: "9px 12px", background: "#EAF4F0", border: "none", borderRadius: 10, cursor: "pointer" }}><Icon name="edit" size={13} color="#1A7A5E" /></button>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <input className="text-xs" placeholder="Comentario para el propietario..." style={{ flex: 1, padding: "9px 12px", border: "1.5px solid #E4E8E4", borderRadius: 10, color: "#0F1A14", background: "#fff", fontFamily: "inherit" }} id={`note-${b.id}`} defaultValue={b.admin_notes || ""} />
              <button onClick={async () => { const note = document.getElementById(`note-${b.id}`)?.value || ""; await sb.patch("businesses", b.id, { status: "needs_changes", admin_notes: note }); onToast("Enviado"); await load(); }} style={{ padding: "9px 12px", background: "#F5F3FF", border: "none", borderRadius: 10, fontSize: 12, fontWeight: 700, color: "#7C3AED", cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>Pedir cambios</button>
            </div>
          </div>)}

          {data.events.some(ev => ev.status === "pending") && <div className="text-sm" style={{ fontWeight: 800, color: "#5A6872", marginBottom: 10, marginTop: 24, textTransform: "uppercase", letterSpacing: 1 }}>Eventos</div>}
          {data.events.filter(ev => ev.status === "pending").map(ev => {
             return <div key={ev.id} style={{ background: "#fff", borderRadius: 14, padding: "14px", marginBottom: 12, boxShadow: "0 2px 8px rgba(0,0,0,.05)" }}>
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 10 }}>
                <div style={{ width: 52, height: 52, borderRadius: 12, overflow: "hidden", flexShrink: 0, background: "#F7F8F6" }}>{(ev.img_url || ev.img) ? <img src={ev.img_url || ev.img} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="calendar" size={20} color="#5A6872" /></div>}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div className="text-base" style={{ fontWeight: 700, color: "#0F1A14" }}>{ev.title}</div>
                    <span className="text-micro" style={{ background: "#FEF3C7", color: "#D97706", borderRadius: 20, padding: "2px 8px", fontWeight: 700, flexShrink: 0, marginLeft: 6 }}>Pendiente</span>
                  </div>
                  <div className="text-xs" style={{ color: "#5A6872", marginTop: 2 }}>{ev.date}{ev.time && " · " + ev.time}</div>
                  {ev.venue_name && <div className="text-xs" style={{ color: "#5A6872" }}>Lugar: {ev.venue_name}</div>}
                  {ev.description && <div className="text-xs" style={{ color: "#5A6872", marginTop: 4, lineHeight: 1.4 }}>{ev.description}</div>}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                <button onClick={async () => { 
                  await sb.patch("events", ev.id, { status: "approved", active: true }); 
                  if (ev.user_id) await sb.notify(ev.user_id, "Evento Aprobado", `Tu evento "${ev.title}" ya es público.`, "system");
                  onToast("Evento aprobado"); 
                  await load(); 
                }} style={{ flex: 1, padding: "9px 0", background: "#DCFCE7", border: "none", borderRadius: 10, fontWeight: 700, fontSize: 12, color: "#16A34A", cursor: "pointer", fontFamily: "inherit" }}>Aprobar</button>
                <button onClick={async () => { if (!window.confirm("¿Rechazar y eliminar este evento por completo?")) return; await sb.del("events", ev.id); onToast("Evento eliminado"); await load(); }} style={{ flex: 1, padding: "9px 0", background: "#FEE2E2", border: "none", borderRadius: 10, fontWeight: 700, fontSize: 12, color: "#D94F3D", cursor: "pointer", fontFamily: "inherit" }}>Rechazar</button>
                <button onClick={() => { setTab("events"); setEvForm({ ...ev }); }} style={{ padding: "9px 12px", background: "#EAF4F0", border: "none", borderRadius: 10, cursor: "pointer" }}><Icon name="edit" size={13} color="#1A7A5E" /></button>
              </div>
             </div>;
          })}
        </div>}

        {/* ─ MULTIMEDIA ─ */}
        {tab === "media" && <div>
          <p className="text-lg" style={{ fontFamily: "'Coolvetica', sans-serif", color: "#0F1A14", marginBottom: 14 }}>Gestión multimedia</p>
          {!mediaTarget && <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {data.biz.filter(b => b.status === "approved").map(b => <div key={b.id} className="press" onClick={() => setMediaTarget(b.id)} style={{ background: "#fff", borderRadius: 12, padding: "12px 14px", display: "flex", alignItems: "center", gap: 12, boxShadow: "0 2px 8px rgba(0,0,0,.05)", cursor: "pointer" }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, overflow: "hidden", flexShrink: 0, background: "#F7F8F6" }}>{b.photos?.[0]?.url ? <img src={b.photos[0].url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="store" size={18} color="#5A6872" /></div>}</div>
              <div style={{ flex: 1 }}><div className="text-sm" style={{ fontWeight: 700, color: "#0F1A14" }}>{b.name}</div><div className="text-xs" style={{ color: "#5A6872", marginTop: 1 }}>{b.photos?.length || 0} fotos · {b.menu_pdf_url ? "Menú adjunto" : "Sin menú"}</div></div>
              <Icon name="chevron" size={16} color="#5A6872" />
            </div>)}
          </div>}
          {mediaTarget && (() => {
            const b = data.biz.find(x => x.id === mediaTarget);
            const pm = PLAN_META[b?.plan] || PLAN_META.free;
            return <div>
              <button onClick={() => setMediaTarget(null)} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", fontWeight: 600, fontSize: 14, color: "#1A7A5E", fontFamily: "inherit", marginBottom: 14 }}><Icon name="arrow_left" size={14} color="#1A7A5E" /> Volver</button>
              <div className="text-base" style={{ fontWeight: 800, color: "#0F1A14", marginBottom: 4 }}>{b?.name}</div>
              <div className="text-xs" style={{ color: "#5A6872", marginBottom: 16 }}>Plan {pm.label} · máx. {pm.max_photos} fotos</div>
              {/* Photos grid */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 16 }}>
                {(b?.photos || []).map((ph, idx) => <div key={idx} style={{ position: "relative", paddingBottom: "100%" }}>
                  <div style={{ position: "absolute", inset: 0, borderRadius: 10, overflow: "hidden", background: "#F7F8F6" }}>{ph.url && <img src={ph.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} loading="lazy" />}</div>
                  <div style={{ position: "absolute", bottom: 4, right: 4, display: "flex", gap: 3 }}>
                    {idx > 0 && <button onClick={() => movePhoto(b.id, idx, idx - 1)} style={{ width: 22, height: 22, borderRadius: 6, background: "rgba(0,0,0,.5)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><path d="M15 18l-6-6 6-6" /></svg></button>}
                    {idx < (b.photos || []).length - 1 && <button onClick={() => movePhoto(b.id, idx, idx + 1)} style={{ width: 22, height: 22, borderRadius: 6, background: "rgba(0,0,0,.5)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><path d="M9 18l6-6-6-6" /></svg></button>}
                    <button onClick={() => removePhoto(b.id, idx)} style={{ width: 22, height: 22, borderRadius: 6, background: "rgba(220,80,60,.8)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="x" size={10} color="#fff" /></button>
                  </div>
                  {idx === 0 && <div className="text-micro" style={{ position: "absolute", top: 4, left: 4, background: "#1A7A5E", color: "#fff", fontWeight: 800, padding: "2px 6px", borderRadius: 4 }}>PORTADA</div>}
                </div>)}
              </div>
              {(b?.photos || []).length < pm.max_photos && <Uploader onDone={addPhoto} />}
              {/* PDF Menu */}
              <div style={{ marginTop: 16, background: "#fff", borderRadius: 12, padding: 14 }}>
                <div className="text-sm" style={{ fontWeight: 700, color: "#0F1A14", marginBottom: 10 }}>Menú PDF</div>
                {b?.menu_pdf_url ? (<div style={{ display: "flex", gap: 10, alignItems: "center", padding: "10px 12px", background: "#EAF4F0", borderRadius: 10 }}><Icon name="file" size={18} color="#1A7A5E" /><button onClick={() => window.open(b.menu_pdf_url, '_blank')} style={{ fontSize: 13, color: "#1A7A5E", fontWeight: 600, flex: 1, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", textAlign: "left" }}>Ver menú</button><button onClick={() => uploadPDF(null, b.id)} style={{ background: "none", border: "none", cursor: "pointer" }}><Icon name="trash" size={14} color="#D94F3D" /></button></div>) : (<>{(b?.plan === "destacado" || b?.plan === "premium") ? <Uploader label="Subir menú (PDF/Imagen)" accept="image/*,.pdf,application/pdf" onDone={url => uploadPDF(url, b.id)} /> : <div className="text-sm" style={{ padding: "12px", background: "#FEF3C7", borderRadius: 10, color: "#92400E", fontWeight: 600 }}>Requiere plan Destacado o Premium</div>}</>)}
              </div>
            </div>;
          })()}
        </div>}

        {/* ─ EVENTS ─ */}
        {tab === "events" && !evForm && <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <span className="text-sm" style={{ fontWeight: 600, color: "#5A6872" }}>{data.events.filter(ev => ev.status !== "pending").length} eventos</span>
            <button onClick={() => setEvForm({ _new: true, biz_id: "", title: "", description: "", date: "", time: "", price_type: "gratis", price: "", event_category: "", venue_name: "", venue_address: "", whatsapp: "", img_url: "", city_slug: "all", status: "approved", active: true })} style={{ background: "#1A7A5E", color: "#fff", border: "none", borderRadius: 10, padding: "9px 14px", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 5 }}><Icon name="plus" size={14} color="#fff" /> Nuevo</button>
          </div>
          {data.events.filter(ev => ev.status !== "pending").map(ev => {
            const st = getEventStatus(ev);
            const isPending = ev.status === "pending" || !ev.active;
            return <div key={ev.id} style={{ background: "#fff", borderRadius: 12, marginBottom: 10, overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,.05)" }}>
              {(ev.img_url || ev.img) && <div style={{ height: 70, overflow: "hidden" }}><img src={ev.img_url || ev.img} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} loading="lazy" /></div>}
              <div style={{ padding: "10px 14px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="text-sm" style={{ fontWeight: 700, color: "#0F1A14" }}>{ev.title}</div>
                    <div className="text-xs" style={{ color: "#5A6872", marginTop: 2 }}>
                      {ev.date}{ev.time && " · " + ev.time}
                      {ev.event_category && " · " + ev.event_category}
                      {ev.venue_name && " · " + ev.venue_name}
                    </div>
                  </div>
                  <span className="text-micro" style={{ background: st.bg, color: st.color, borderRadius: 20, padding: "3px 9px", fontWeight: 700, flexShrink: 0, marginLeft: 8 }}>{st.lbl}</span>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  {isPending && <button onClick={async () => { 
                    await sb.patch("events", ev.id, { status: "approved", active: true }); 
                    if (ev.user_id) await sb.notify(ev.user_id, "Evento Aprobado", `Tu evento "${ev.title}" ya es público.`, "system");
                    onToast("Evento aprobado"); 
                    await load(); 
                  }} style={{ flex: 1, padding: "7px 0", background: "#DCFCE7", border: "none", borderRadius: 8, fontSize: 11, fontWeight: 700, color: "#16A34A", cursor: "pointer", fontFamily: "inherit" }}>Aprobar</button>}
                  {isPending && <button onClick={async () => { if (!window.confirm("¿Rechazar y eliminar este evento por completo?")) return; await sb.del("events", ev.id); onToast("Evento eliminado"); await load(); }} style={{ flex: 1, padding: "7px 0", background: "#FEE2E2", border: "none", borderRadius: 8, fontSize: 11, fontWeight: 700, color: "#D94F3D", cursor: "pointer", fontFamily: "inherit" }}>Rechazar</button>}
                  {!isPending && <button onClick={() => setEvForm({ ...ev })} style={{ flex: 1, background: "#EAF4F0", border: "none", borderRadius: 8, padding: "7px 0", cursor: "pointer", fontSize: 11, fontWeight: 700, color: "#1A7A5E", fontFamily: "inherit" }}>Editar</button>}
                  <button onClick={async () => { if (!window.confirm("Eliminar evento?")) return; await sb.del("events", ev.id); onToast("Eliminado"); await load(); }} style={{ background: "#FFF5F5", border: "none", borderRadius: 8, padding: "7px 10px", cursor: "pointer" }}><Icon name="trash" size={12} color="#D94F3D" /></button>
                </div>
              </div>
            </div>;
          })}
        </div>}
        {tab === "events" && evForm && <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ background: "#fff", borderRadius: 14, padding: 16, boxShadow: "0 2px 8px rgba(0,0,0,.05)", display: "flex", flexDirection: "column", gap: 11 }}>
            <div className="text-base" style={{ fontWeight: 800, color: "#0F1A14" }}>{evForm._new ? "Nuevo evento" : "Editar evento"}</div>
            <FI label="Título" field="title" src={evForm} set={setEvForm} />
            <FI label="Descripción" field="description" src={evForm} set={setEvForm} rows={3} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div><label className="text-xs" style={{ fontWeight: 700, color: "#5A6872", textTransform: "uppercase", letterSpacing: .8, display: "block", marginBottom: 4 }}>Fecha inicio</label><input type="date" value={evForm.date || ""} onChange={e => setEvForm(f => ({ ...f, date: e.target.value }))} style={{ width: "100%", padding: "10px 12px", border: "1.5px solid #E4E8E4", borderRadius: 10, fontSize: 13, color: "#0F1A14", background: "#fff", fontFamily: "inherit" }} /></div>
              <div><label className="text-xs" style={{ fontWeight: 700, color: "#5A6872", textTransform: "uppercase", letterSpacing: .8, display: "block", marginBottom: 4 }}>Hora inicio</label><input type="time" value={evForm.time || ""} onChange={e => setEvForm(f => ({ ...f, time: e.target.value }))} style={{ width: "100%", padding: "10px 12px", border: "1.5px solid #E4E8E4", borderRadius: 10, fontSize: 13, color: "#0F1A14", background: "#fff", fontFamily: "inherit" }} /></div>
              <div><label className="text-xs" style={{ fontWeight: 700, color: "#5A6872", textTransform: "uppercase", letterSpacing: .8, display: "block", marginBottom: 4 }}>Fecha fin (Opcional)</label><input type="date" value={evForm.end_date || ""} onChange={e => setEvForm(f => ({ ...f, end_date: e.target.value }))} style={{ width: "100%", padding: "10px 12px", border: "1.5px solid #E4E8E4", borderRadius: 10, fontSize: 13, color: "#0F1A14", background: "#fff", fontFamily: "inherit" }} /></div>
              <div><label className="text-xs" style={{ fontWeight: 700, color: "#5A6872", textTransform: "uppercase", letterSpacing: .8, display: "block", marginBottom: 4 }}>Hora fin (Opcional)</label><input type="time" value={evForm.end_time || ""} onChange={e => setEvForm(f => ({ ...f, end_time: e.target.value }))} style={{ width: "100%", padding: "10px 12px", border: "1.5px solid #E4E8E4", borderRadius: 10, fontSize: 13, color: "#0F1A14", background: "#fff", fontFamily: "inherit" }} /></div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div><label className="text-xs" style={{ fontWeight: 700, color: "#5A6872", textTransform: "uppercase", letterSpacing: .8, display: "block", marginBottom: 4 }}>Precio</label><select value={evForm.price_type || "gratis"} onChange={e => setEvForm(f => ({ ...f, price_type: e.target.value }))} style={{ width: "100%", padding: "11px 12px", border: "1.5px solid #E4E8E4", borderRadius: 10, fontSize: 13, color: "#0F1A14", background: "#fff", fontFamily: "inherit" }}><option value="gratis">Gratis</option><option value="paid">De pago</option></select></div>
              {evForm.price_type === "paid" && <FI label="Monto" field="price" src={evForm} set={setEvForm} ph="$200" />}
            </div>
            <FI label="Categoría" field="event_category" src={evForm} set={setEvForm} ph="Ej: Concierto, Comedia..." />
            <FI label="Lugar / Venue" field="venue_name" src={evForm} set={setEvForm} ph="Club 24, Tepic Centro" />
            <FI label="Dirección" field="venue_address" src={evForm} set={setEvForm} ph="Av. México 123" />
            <FI label="WhatsApp contacto" field="whatsapp" src={evForm} set={setEvForm} ph="3111234567" />
            <FI label="Sitio web / Boletos (Opcional)" field="website" src={evForm} set={setEvForm} ph="https://..." />
            <div><label className="text-xs" style={{ fontWeight: 700, color: "#5A6872", textTransform: "uppercase", letterSpacing: .8, display: "block", marginBottom: 4 }}>Ciudad</label><select value={evForm.city_slug || "all"} onChange={e => setEvForm(f => ({ ...f, city_slug: e.target.value }))} style={{ width: "100%", padding: "11px 12px", border: "1.5px solid #E4E8E4", borderRadius: 10, fontSize: 13, color: "#0F1A14", background: "#fff", fontFamily: "inherit" }}><option value="all">Todas</option>{data.cities.map(c => <option key={c.slug} value={c.slug}>{c.name}</option>)}</select></div>
            <div><div className="text-xs" style={{ fontWeight: 700, color: "#5A6872", textTransform: "uppercase", letterSpacing: .8, marginBottom: 6 }}>Imagen del evento</div><Uploader onDone={url => setEvForm(f => ({ ...f, img_url: url }))} />{(evForm.img_url || evForm.img) && <img src={evForm.img_url || evForm.img} alt="" style={{ width: "100%", height: 100, objectFit: "contain", borderRadius: 8, marginTop: 8 }} loading="lazy" />}</div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => setEvForm(null)} style={{ flex: 1, padding: 14, background: "#fff", border: "1.5px solid #E4E8E4", borderRadius: 12, fontWeight: 700, fontSize: 14, color: "#5A6872", cursor: "pointer", fontFamily: "inherit" }}>Cancelar</button>
            <button onClick={async () => { setSaving(true); try { const cty = evForm.city_slug && evForm.city_slug !== "all" ? evForm.city_slug : "tepic"; let baseSlug = evForm.slug || createSlug(evForm.title); if (!baseSlug.startsWith(cty + "-")) baseSlug = `${cty}-${baseSlug}`; let newSlug = baseSlug; let counter = 1; while (data.events.some(e => e.slug === newSlug && e.id !== evForm.id)) { newSlug = `${baseSlug}-${counter++}`; } const p = { title: evForm.title, slug: newSlug, description: evForm.description, date: evForm.date, time: evForm.time, end_date: evForm.end_date, end_time: evForm.end_time, price_type: evForm.price_type, price: evForm.price, event_category: evForm.event_category, venue_name: evForm.venue_name, venue_address: evForm.venue_address, whatsapp: evForm.whatsapp, website: evForm.website, city_slug: evForm.city_slug || "all", img_url: evForm.img_url || evForm.img, status: "approved", active: true }; if (evForm._new) await sb.post("events", p); else await sb.patch("events", evForm.id, p); onToast("Guardado"); setEvForm(null); await load(); } catch(e) { onToast("Error: " + e.message); } finally { setSaving(false); } }} disabled={saving || !evForm.title} style={{ flex: 2, padding: 14, background: saving || !evForm.title ? "#9CA3AF" : "#1A7A5E", border: "none", borderRadius: 12, fontWeight: 700, fontSize: 14, color: "#fff", cursor: "pointer", fontFamily: "inherit" }}>{saving ? "Guardando..." : evForm._new ? "Crear" : "Guardar"}</button>
          </div>
        </div>}

        {/* ─ PROMOS ─ */}
        {tab === "promos" && !prForm && <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}><span className="text-sm" style={{ fontWeight: 600, color: "#5A6872" }}>{data.promos.length} promos</span><button onClick={() => setPrForm({ _new: true, biz_id: data.biz[0]?.id || "", title: "", description: "", expiry: "", discount: "", active: true })} style={{ background: "#92400E", color: "#fff", border: "none", borderRadius: 10, padding: "9px 14px", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 5 }}><Icon name="plus" size={14} color="#fff" /> Nueva</button></div>
          {data.promos.map(p => { const b = data.biz.find(x => x.id === p.biz_id); return <div key={p.id} style={{ background: "#fff", borderRadius: 12, padding: "12px 14px", marginBottom: 10, display: "flex", alignItems: "center", gap: 10, boxShadow: "0 2px 8px rgba(0,0,0,.05)" }}><div style={{ width: 44, height: 44, borderRadius: 10, background: "#FEF3C7", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Icon name="tag" size={20} color="#92400E" /></div><div style={{ flex: 1, minWidth: 0 }}><div className="text-sm" style={{ fontWeight: 700, color: "#0F1A14" }}>{p.title}</div><div className="text-xs" style={{ color: "#5A6872", marginTop: 1 }}>{p.discount} · {p.expiry}</div><div className="text-xs" style={{ color: "#5A6872" }}>{b?.name}</div></div><div style={{ display: "flex", gap: 5 }}><button onClick={() => setPrForm({ ...p })} style={{ background: "#EAF4F0", border: "none", borderRadius: 7, padding: "7px 9px", cursor: "pointer" }}><Icon name="edit" size={12} color="#1A7A5E" /></button><button onClick={async () => { await sb.del("promos", p.id); onToast("Promo eliminada"); await load(); }} style={{ background: "#FFF5F5", border: "none", borderRadius: 7, padding: "7px 9px", cursor: "pointer" }}><Icon name="trash" size={12} color="#D94F3D" /></button></div></div>; })}
        </div>}
        {tab === "promos" && prForm && <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ background: "#fff", borderRadius: 14, padding: 16, boxShadow: "0 2px 8px rgba(0,0,0,.05)", display: "flex", flexDirection: "column", gap: 11 }}>
            <div className="text-base" style={{ fontWeight: 800, color: "#0F1A14" }}>{prForm._new ? "Nueva promo" : "Editar promo"}</div>
            <div><label className="text-xs" style={{ fontWeight: 700, color: "#5A6872", textTransform: "uppercase", letterSpacing: .8, display: "block", marginBottom: 4 }}>Negocio</label><select value={prForm.biz_id || ""} onChange={e => setPrForm(f => ({ ...f, biz_id: e.target.value }))} style={{ width: "100%", padding: "11px 12px", border: "1.5px solid #E4E8E4", borderRadius: 10, fontSize: 14, color: "#0F1A14", background: "#fff", fontFamily: "inherit" }}>{data.biz.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
            <FI label="Título" field="title" src={prForm} set={setPrForm} ph="2×1 en cócteles" />
            <FI label="Descripción" field="description" src={prForm} set={setPrForm} rows={2} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}><FI label="Descuento" field="discount" src={prForm} set={setPrForm} ph="50%" /><FI label="Vigencia" field="expiry" src={prForm} set={setPrForm} ph="Cada jueves" /></div>
          </div>
          <div style={{ display: "flex", gap: 10 }}><button onClick={() => setPrForm(null)} style={{ flex: 1, padding: 14, background: "#fff", border: "1.5px solid #E4E8E4", borderRadius: 12, fontWeight: 700, fontSize: 14, color: "#5A6872", cursor: "pointer", fontFamily: "inherit" }}>Cancelar</button><button onClick={async () => { setSaving(true); try { const pl = { biz_id: prForm.biz_id, title: prForm.title, description: prForm.description, expiry: prForm.expiry, discount: prForm.discount, active: true }; if (prForm._new) await sb.post("promos", pl); else await sb.patch("promos", prForm.id, pl); onToast("Guardado ✓"); setPrForm(null); await load(); } catch (e) { onToast("Error: " + e.message); } finally { setSaving(false); } }} disabled={saving} style={{ flex: 2, padding: 14, background: saving ? "#5A6872" : "#92400E", border: "none", borderRadius: 12, fontWeight: 700, fontSize: 14, color: "#fff", cursor: "pointer", fontFamily: "inherit" }}>{saving ? "Guardando…" : prForm._new ? "Crear promo" : "Guardar"}</button></div>
        </div>}

        {/* ─ COUPONS ─ */}
        {tab === "coupons" && !cpForm && <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}><span className="text-sm" style={{ fontWeight: 600, color: "#5A6872" }}>{data.coupons.length} cupones</span><button onClick={() => setCpForm({ _new: true, biz_id: data.biz.find(b => b.plan === "premium")?.id || "", code: "", title: "", description: "", discount_pct: 10, max_uses: 100, active: true, expires_at: "" })} style={{ background: "#7C3AED", color: "#fff", border: "none", borderRadius: 10, padding: "9px 14px", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 5 }}><Icon name="plus" size={14} color="#fff" /> Nuevo cupón</button></div>
          {data.coupons.map(c => { const b = data.biz.find(x => x.id === c.biz_id); return <div key={c.id} style={{ background: "#fff", borderRadius: 12, padding: "12px 14px", marginBottom: 10, display: "flex", alignItems: "center", gap: 10, boxShadow: "0 2px 8px rgba(0,0,0,.05)" }}><div style={{ width: 44, height: 44, borderRadius: 10, background: "#F5F3FF", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Icon name="coupon" size={20} color="#7C3AED" /></div><div style={{ flex: 1, minWidth: 0 }}><div className="text-sm" style={{ fontWeight: 700, color: "#0F1A14" }}>{c.code}</div><div className="text-xs" style={{ color: "#5A6872", marginTop: 1 }}>{c.title} · {c.discount_pct}%</div><div className="text-xs" style={{ color: "#5A6872" }}>{b?.name} · Usos: {c.used_count}/{c.max_uses}</div></div><div style={{ display: "flex", gap: 5 }}><button onClick={() => setCpForm({ ...c })} style={{ background: "#EAF4F0", border: "none", borderRadius: 7, padding: "7px 9px", cursor: "pointer" }}><Icon name="edit" size={12} color="#1A7A5E" /></button><button onClick={async () => { await sb.del("coupons", c.id); onToast("Cupón eliminado"); await load(); }} style={{ background: "#FFF5F5", border: "none", borderRadius: 7, padding: "7px 9px", cursor: "pointer" }}><Icon name="trash" size={12} color="#D94F3D" /></button></div></div>; })}
        </div>}
        {tab === "coupons" && cpForm && <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ background: "#fff", borderRadius: 14, padding: 16, boxShadow: "0 2px 8px rgba(0,0,0,.05)", display: "flex", flexDirection: "column", gap: 11 }}>
            <div className="text-base" style={{ fontWeight: 800, color: "#0F1A14" }}>{cpForm._new ? "Nuevo cupón" : "Editar cupón"}</div>
            <div><label className="text-xs" style={{ fontWeight: 700, color: "#5A6872", textTransform: "uppercase", letterSpacing: .8, display: "block", marginBottom: 4 }}>Negocio asignado</label><select value={cpForm.biz_id || ""} onChange={e => setCpForm(f => ({ ...f, biz_id: e.target.value }))} style={{ width: "100%", padding: "11px 12px", border: "1.5px solid #E4E8E4", borderRadius: 10, fontSize: 14, color: "#0F1A14", background: "#fff", fontFamily: "inherit" }}><option value="">-- Selecciona un negocio --</option>{data.biz.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
            <FI label="Código *" field="code" src={cpForm} set={setCpForm} ph="BIENVENIDO20" />
            <FI label="Título" field="title" src={cpForm} set={setCpForm} ph="20% en primera visita" />
            <FI label="Descripción" field="description" src={cpForm} set={setCpForm} rows={2} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}><FI label="Descuento %" field="discount_pct" src={cpForm} set={setCpForm} type="number" /><FI label="Máx. usos" field="max_uses" src={cpForm} set={setCpForm} type="number" /></div>
            <FI label="Vence (Opcional)" field="expires_at" src={cpForm} set={setCpForm} type="date" />
          </div>
          <div style={{ display: "flex", gap: 10 }}><button onClick={() => setCpForm(null)} style={{ flex: 1, padding: 14, background: "#fff", border: "1.5px solid #E4E8E4", borderRadius: 12, fontWeight: 700, fontSize: 14, color: "#5A6872", cursor: "pointer", fontFamily: "inherit" }}>Cancelar</button><button onClick={async () => { if (!cpForm.biz_id) { onToast("Error: Debes seleccionar un negocio."); return; } setSaving(true); try { const pl = { biz_id: cpForm.biz_id, code: cpForm.code, title: cpForm.title, description: cpForm.description, discount_pct: parseInt(cpForm.discount_pct) || 0, max_uses: parseInt(cpForm.max_uses) || 100, expires_at: cpForm.expires_at || null, active: true }; if (cpForm._new) await sb.post("coupons", pl); else await sb.patch("coupons", cpForm.id, pl); onToast("Guardado ✓"); setCpForm(null); await load(); } catch (e) { onToast("Error: " + e.message); } finally { setSaving(false); } }} disabled={saving} style={{ flex: 2, padding: 14, background: saving ? "#5A6872" : "#7C3AED", border: "none", borderRadius: 12, fontWeight: 700, fontSize: 14, color: "#fff", cursor: "pointer", fontFamily: "inherit" }}>{saving ? "Guardando…" : cpForm._new ? "Crear cupón" : "Guardar"}</button></div>
        </div>}
        
        {/* ─ RAFFLES ─ */}
        {tab === "raffles" && !rfForm && <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}><span className="text-sm" style={{ fontWeight: 600, color: "#5A6872" }}>{data.raffles.length} sorteos</span><button onClick={() => setRfForm({ _new: true, biz_id: data.biz.find(b => b.plan === "premium")?.id || "", title: "", description: "", prize: "", ends_at: "" })} style={{ background: "#F59E0B", color: "#fff", border: "none", borderRadius: 10, padding: "9px 14px", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 5 }}><Icon name="plus" size={14} color="#fff" /> Nuevo sorteo</button></div>
          {data.raffles.map(r => { const b = data.biz.find(x => x.id === r.biz_id); return <div key={r.id} style={{ background: "#fff", borderRadius: 12, padding: "12px 14px", marginBottom: 10, display: "flex", alignItems: "center", gap: 10, boxShadow: "0 2px 8px rgba(0,0,0,.05)" }}><div style={{ width: 44, height: 44, borderRadius: 10, background: "#FFFBEB", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Icon name="star" size={20} color="#F59E0B" /></div><div style={{ flex: 1, minWidth: 0 }}><div className="text-sm" style={{ fontWeight: 700, color: "#0F1A14" }}>{r.title}</div><div className="text-xs" style={{ color: "#5A6872", marginTop: 1 }}>Premio: {r.prize}</div><div className="text-xs" style={{ color: "#5A6872" }}>{b?.name}</div></div><div style={{ display: "flex", gap: 5 }}><button onClick={() => setRfForm({ ...r })} style={{ background: "#EAF4F0", border: "none", borderRadius: 7, padding: "7px 9px", cursor: "pointer" }}><Icon name="edit" size={12} color="#1A7A5E" /></button><button onClick={async () => { await sb.del("raffles", r.id); onToast("Sorteo eliminado"); await load(); }} style={{ background: "#FFF5F5", border: "none", borderRadius: 7, padding: "7px 9px", cursor: "pointer" }}><Icon name="trash" size={12} color="#D94F3D" /></button></div></div>; })}
        </div>}
        {tab === "raffles" && rfForm && <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ background: "#fff", borderRadius: 14, padding: 16, boxShadow: "0 2px 8px rgba(0,0,0,.05)", display: "flex", flexDirection: "column", gap: 11 }}>
            <div className="text-base" style={{ fontWeight: 800, color: "#0F1A14" }}>{rfForm._new ? "Nuevo Sorteo" : "Editar Sorteo"}</div>
            <div><label className="text-xs" style={{ fontWeight: 700, color: "#5A6872", textTransform: "uppercase", letterSpacing: .8, display: "block", marginBottom: 4 }}>Negocio asignado</label><select value={rfForm.biz_id || ""} onChange={e => setRfForm(f => ({ ...f, biz_id: e.target.value }))} style={{ width: "100%", padding: "11px 12px", border: "1.5px solid #E4E8E4", borderRadius: 10, fontSize: 14, color: "#0F1A14", background: "#fff", fontFamily: "inherit" }}><option value="">-- Selecciona un negocio --</option>{data.biz.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
            <FI label="Título *" field="title" src={rfForm} set={setRfForm} ph="Cena de Aniversario" />
            <FI label="Descripción *" field="description" src={rfForm} set={setRfForm} rows={2} ph="Participa por una cena gratis" />
            <FI label="Premio *" field="prize" src={rfForm} set={setRfForm} ph="1 Cena Doble y Botella de Vino" />
            <FI label="Fecha de Fin *" field="ends_at" src={rfForm} set={setRfForm} type="datetime-local" />
          </div>
          <div style={{ display: "flex", gap: 10 }}><button onClick={() => setRfForm(null)} style={{ flex: 1, padding: 14, background: "#fff", border: "1.5px solid #E4E8E4", borderRadius: 12, fontWeight: 700, fontSize: 14, color: "#5A6872", cursor: "pointer", fontFamily: "inherit" }}>Cancelar</button><button onClick={async () => { if (!rfForm.biz_id) { onToast("Error: Selecciona negocio."); return; } setSaving(true); try { const pl = { biz_id: rfForm.biz_id, title: rfForm.title, description: rfForm.description, prize: rfForm.prize, ends_at: new Date(rfForm.ends_at).toISOString() }; if (rfForm._new) await sb.post("raffles", pl); else await sb.patch("raffles", rfForm.id, pl); onToast("Sorteo Guardado ✓"); setRfForm(null); await load(); } catch (e) { onToast("Error: " + e.message); } finally { setSaving(false); } }} disabled={saving} style={{ flex: 2, padding: 14, background: saving ? "#5A6872" : "#F59E0B", border: "none", borderRadius: 12, fontWeight: 700, fontSize: 14, color: "#fff", cursor: "pointer", fontFamily: "inherit" }}>{saving ? "Guardando…" : rfForm._new ? "Crear sorteo" : "Guardar"}</button></div>
        </div>}

        {/* ─ BANNERS ─ */}
        {tab === "banners" && !banForm && <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <span className="text-sm" style={{ fontWeight: 600, color: "#5A6872" }}>{data.banners.length} banner{data.banners.length !== 1 ? "s" : ""}</span>
            <button onClick={() => setBanForm({ _new: true, title: "", img_url: "", link_url: "", city_slug: "all", sort_order: 0, active: true, start_date: "", end_date: "", repeat_yearly: false })} style={{ background: "#1A7A5E", color: "#fff", border: "none", borderRadius: 10, padding: "9px 14px", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 5 }}><Icon name="plus" size={14} color="#fff" /> Nuevo banner</button>
          </div>
          {data.banners.length === 0 && <div style={{ textAlign: "center", padding: "40px 0", color: "#9CA3AF" }}><div className="text-3xl" style={{ marginBottom: 8 }}>🖼️</div><div style={{ fontWeight: 600 }}>Sin banners aún</div></div>}
          {data.banners.map(bn => {
            const today = new Date().toISOString().split("T")[0];
            const expired = bn.end_date && today > bn.end_date;
            const scheduled = bn.start_date && today < bn.start_date;
            const statusLbl = !bn.active ? "Inactivo" : expired ? "Expirado" : scheduled ? "Programado" : "Activo";
            const statusColor = statusLbl === "Activo" ? "#16A34A" : statusLbl === "Programado" ? "#3B82F6" : "#9CA3AF";
            const statusBg = statusLbl === "Activo" ? "#DCFCE7" : statusLbl === "Programado" ? "#EFF6FF" : "#F3F4F6";
            return <div key={bn.id} style={{ background: "#fff", borderRadius: 12, marginBottom: 10, overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,.05)" }}>
              {bn.img_url && <div style={{ height: 80, overflow: "hidden", background: "#F7F8F6" }}><img src={bn.img_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} loading="lazy" /></div>}
              <div style={{ padding: "10px 14px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="text-sm" style={{ fontWeight: 700, color: "#0F1A14" }}>{bn.title || "Sin título"}</div>
                    <div className="text-xs" style={{ color: "#5A6872", marginTop: 2 }}>
                      {bn.city_slug === "all" ? "Todas las ciudades" : bn.city_slug}
                      {bn.start_date && ` · Desde ${bn.start_date}`}
                      {bn.end_date && ` hasta ${bn.end_date}`}
                      {bn.repeat_yearly && " · Repite anual"}
                    </div>
                  </div>
                  <span className="text-micro" style={{ background: statusBg, color: statusColor, borderRadius: 20, padding: "3px 9px", fontWeight: 700, flexShrink: 0, marginLeft: 8 }}>{statusLbl}</span>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => setBanForm({ ...bn })} style={{ flex: 1, background: "#EAF4F0", border: "none", borderRadius: 8, padding: "7px 0", cursor: "pointer", fontSize: 11, fontWeight: 700, color: "#1A7A5E", fontFamily: "inherit" }}>Editar</button>
                  <button onClick={async () => { await sb.patch("banners", bn.id, { active: !bn.active }); onToast(bn.active ? "Desactivado" : "Activado"); await load(); }} style={{ flex: 1, background: bn.active ? "#FEF3C7" : "#DCFCE7", border: "none", borderRadius: 8, padding: "7px 0", cursor: "pointer", fontSize: 11, fontWeight: 700, color: bn.active ? "#D97706" : "#16A34A", fontFamily: "inherit" }}>{bn.active ? "Desactivar" : "Activar"}</button>
                  <button onClick={async () => { if (!window.confirm("Eliminar banner?")) return; await sb.del("banners", bn.id); onToast("Eliminado"); await load(); }} style={{ background: "#FFF5F5", border: "none", borderRadius: 8, padding: "7px 10px", cursor: "pointer" }}><Icon name="trash" size={12} color="#D94F3D" /></button>
                </div>
              </div>
            </div>;
          })}
        </div>}
        {tab === "banners" && banForm && <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ background: "#fff", borderRadius: 14, padding: 16, boxShadow: "0 2px 8px rgba(0,0,0,.05)", display: "flex", flexDirection: "column", gap: 11 }}>
            <div className="text-base" style={{ fontWeight: 800, color: "#0F1A14" }}>{banForm._new ? "Nuevo banner" : "Editar banner"}</div>
            <FI label="Título" field="title" src={banForm} set={setBanForm} />
            <FI label="URL destino" field="link_url" src={banForm} set={setBanForm} ph="https://..." />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div><label className="text-xs" style={{ fontWeight: 700, color: "#5A6872", textTransform: "uppercase", letterSpacing: .8, display: "block", marginBottom: 4 }}>Ciudad</label><select value={banForm.city_slug || "all"} onChange={e => setBanForm(f => ({ ...f, city_slug: e.target.value }))} style={{ width: "100%", padding: "11px 12px", border: "1.5px solid #E4E8E4", borderRadius: 10, fontSize: 13, color: "#0F1A14", background: "#fff", fontFamily: "inherit" }}><option value="all">Todas las ciudades</option>{data.cities.map(c => <option key={c.slug} value={c.slug}>{c.name}</option>)}</select></div>
              <FI label="Orden" field="sort_order" src={banForm} set={setBanForm} type="number" />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div><label className="text-xs" style={{ fontWeight: 700, color: "#5A6872", textTransform: "uppercase", letterSpacing: .8, display: "block", marginBottom: 4 }}>Fecha inicio</label><input type="date" value={banForm.start_date || ""} onChange={e => setBanForm(f => ({ ...f, start_date: e.target.value }))} style={{ width: "100%", padding: "10px 12px", border: "1.5px solid #E4E8E4", borderRadius: 10, fontSize: 13, color: "#0F1A14", background: "#fff", fontFamily: "inherit" }} /></div>
              <div><label className="text-xs" style={{ fontWeight: 700, color: "#5A6872", textTransform: "uppercase", letterSpacing: .8, display: "block", marginBottom: 4 }}>Fecha fin</label><input type="date" value={banForm.end_date || ""} onChange={e => setBanForm(f => ({ ...f, end_date: e.target.value }))} style={{ width: "100%", padding: "10px 12px", border: "1.5px solid #E4E8E4", borderRadius: 10, fontSize: 13, color: "#0F1A14", background: "#fff", fontFamily: "inherit" }} /></div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "#F9FAFB", borderRadius: 10 }}>
              <div>
                <div className="text-sm" style={{ fontWeight: 700, color: "#0F1A14" }}>Repetir cada año</div>
                <div className="text-xs" style={{ color: "#5A6872", marginTop: 2 }}>Se activa automaticamente en las mismas fechas</div>
              </div>
              <button onClick={() => setBanForm(f => ({ ...f, repeat_yearly: !f.repeat_yearly }))} style={{ width: 44, height: 24, borderRadius: 12, border: "none", cursor: "pointer", background: banForm.repeat_yearly ? "#1A7A5E" : "#E4E8E4", position: "relative", transition: "background .2s", flexShrink: 0 }}>
                <div style={{ position: "absolute", top: 2, left: banForm.repeat_yearly ? 22 : 2, width: 20, height: 20, borderRadius: "50%", background: "#fff", transition: "left .2s", boxShadow: "0 1px 4px rgba(0,0,0,.2)" }} />
              </button>
            </div>
            <div><div className="text-xs" style={{ fontWeight: 700, color: "#5A6872", textTransform: "uppercase", letterSpacing: .8, marginBottom: 6 }}>Imagen del banner</div><Uploader aspect={21/9} onDone={url => setBanForm(f => ({ ...f, img_url: url }))} />{banForm.img_url && <img src={banForm.img_url} alt="" style={{ width: "100%", height: 100, objectFit: "cover", borderRadius: 8, marginTop: 8 }} loading="lazy" />}</div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => setBanForm(null)} style={{ flex: 1, padding: 14, background: "#fff", border: "1.5px solid #E4E8E4", borderRadius: 12, fontWeight: 700, fontSize: 14, color: "#5A6872", cursor: "pointer", fontFamily: "inherit" }}>Cancelar</button>
            <button onClick={async () => { setSaving(true); try { const pl = { title: banForm.title, img_url: banForm.img_url, link_url: banForm.link_url, city_slug: banForm.city_slug || "all", sort_order: parseInt(banForm.sort_order) || 0, active: banForm.active ?? true, start_date: banForm.start_date || null, end_date: banForm.end_date || null, repeat_yearly: banForm.repeat_yearly || false }; if (banForm._new) await sb.post("banners", pl); else await sb.patch("banners", banForm.id, pl); onToast("Guardado"); setBanForm(null); await load(); } catch (e) { onToast("Error: " + e.message); } finally { setSaving(false); } }} disabled={saving || !banForm.title} style={{ flex: 2, padding: 14, background: saving || !banForm.title ? "#9CA3AF" : "#1A7A5E", border: "none", borderRadius: 12, fontWeight: 700, fontSize: 14, color: "#fff", cursor: "pointer", fontFamily: "inherit" }}>{saving ? "Guardando..." : banForm._new ? "Crear banner" : "Guardar"}</button>
          </div>
        </div>}

        {/* ─ CITIES ─ */}
        {tab === "cities" && !cityForm && <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <p className="text-lg" style={{ fontFamily: "'Coolvetica', sans-serif", color: "#0F1A14", margin: 0 }}>Ciudades activas</p>
            <button onClick={() => setCityForm({ _new: true, name: "", slug: "", state: "", timezone: "America/Mexico_City", active: true })} style={{ background: "#1A7A5E", color: "#fff", border: "none", borderRadius: 10, padding: "9px 14px", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 5 }}><Icon name="plus" size={14} color="#fff" /> Nueva</button>
          </div>
          {data.cities.map(c => <div key={c.id} style={{ background: "#fff", borderRadius: 12, marginBottom: 10, boxShadow: "0 2px 8px rgba(0,0,0,.05)", overflow: "hidden" }}>
            <div style={{ padding: "12px 14px", display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: "#EAF4F0", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, overflow: "hidden" }}>
                {c.bg_image
                  ? <img src={c.bg_image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : <Icon name="pin" size={16} color="#1A7A5E" />}
              </div>
              <div style={{ flex: 1 }}>
                <div className="text-sm" style={{ fontWeight: 700, color: "#0F1A14" }}>{c.name}</div>
                <div className="text-xs" style={{ color: "#5A6872", marginTop: 1 }}>/{c.slug} · {c.state}</div>
              </div>
              <div style={{ display: "flex", gap: 5 }}>
                <button onClick={() => setCityForm({ ...c })} style={{ background: "#EAF4F0", border: "none", borderRadius: 8, padding: "7px 9px", cursor: "pointer" }}><Icon name="edit" size={13} color="#1A7A5E" /></button>
                <button onClick={() => { setCityEditId(cityEditId === c.id ? null : c.id); setCityImgInput(c.bg_image || ""); }} style={{ background: cityEditId === c.id ? "#1A7A5E" : "#EAF4F0", border: "none", borderRadius: 8, padding: "7px 10px", cursor: "pointer", fontSize: 11, fontWeight: 700, color: cityEditId === c.id ? "#fff" : "#1A7A5E", fontFamily: "inherit" }}>Imagen</button>
                <button onClick={async () => { await sb.patch("cities", c.id, { active: !c.active }); onToast(c.active ? "Ciudad desactivada" : "Ciudad activada"); await load(); }} style={{ background: c.active ? "#EAF4F0" : "#FEE2E2", border: "none", borderRadius: 8, padding: "7px 10px", cursor: "pointer", fontSize: 11, fontWeight: 700, color: c.active ? "#1A7A5E" : "#D94F3D", fontFamily: "inherit" }}>{c.active ? "Activa" : "Inactiva"}</button>
              </div>
            </div>
            {cityEditId === c.id && <div style={{ borderTop: "1px solid #EAF4F0", padding: "12px 14px", background: "#F8FFFE" }}>
              <Uploader label="Subir imagen de fondo" onDone={async url => { await sb.patch("cities", c.id, { bg_image: url }); onToast("Imagen guardada"); await load(); setCityEditId(null); }} />
              {c.bg_image && <div style={{ marginTop: 8, borderRadius: 8, overflow: "hidden", height: 64, position: "relative" }}>
                <img src={c.bg_image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                <button onClick={async () => { await sb.patch("cities", c.id, { bg_image: null }); onToast("Imagen eliminada"); await load(); setCityEditId(null); }} style={{ position: "absolute", top: 6, right: 6, background: "#D94F3D", border: "none", borderRadius: 6, padding: "4px 8px", fontSize: 11, fontWeight: 700, color: "#fff", cursor: "pointer", fontFamily: "inherit" }}>Quitar</button>
              </div>}
            </div>}
          </div>)}
          <div className="text-sm" style={{ padding: "16px", background: "#EAF4F0", borderRadius: 12, color: "#1A7A5E" }}><strong>SEO automático:</strong> cada ciudad genera <code>/{'{slug}'}</code> y <code>/{'{slug}'}/{'{categoria}'}</code> con metadata OpenGraph.</div>
        </div>}

        {tab === "cities" && cityForm && <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ background: "#fff", borderRadius: 14, padding: 16, boxShadow: "0 2px 8px rgba(0,0,0,.05)", display: "flex", flexDirection: "column", gap: 11 }}>
            <div className="text-base" style={{ fontWeight: 800, color: "#0F1A14" }}>{cityForm._new ? "Nueva ciudad" : "Editar ciudad"}</div>
            <FI label="Nombre (Ej. Tepic)" field="name" src={cityForm} set={setCityForm} />
            <FI label="Slug (Ej. tepic)" field="slug" src={cityForm} set={setCityForm} />
            <FI label="Estado (Ej. Nayarit)" field="state" src={cityForm} set={setCityForm} />
            <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
              <button onClick={() => setCityForm(null)} style={{ flex: 1, padding: 14, background: "#fff", border: "1.5px solid #E4E8E4", borderRadius: 12, fontWeight: 700, fontSize: 15, color: "#5A6872", cursor: "pointer", fontFamily: "inherit" }}>Cancelar</button>
              <button onClick={async () => {
                setSaving(true);
                try {
                  const payload = { name: cityForm.name, slug: cityForm.slug, state: cityForm.state, active: cityForm.active };
                  if (cityForm._new) await sb.post("cities", payload);
                  else await sb.patch("cities", cityForm.id, payload);
                  onToast(cityForm._new ? "Ciudad creada" : "Ciudad actualizada");
                  setCityForm(null);
                  await load();
                } catch (e) { onToast("Error: " + e.message); } finally { setSaving(false); }
              }} disabled={saving || !cityForm.name || !cityForm.slug} style={{ flex: 2, padding: 14, background: (saving || !cityForm.name || !cityForm.slug) ? "#9CA3AF" : "#1A7A5E", border: "none", borderRadius: 12, fontWeight: 700, fontSize: 15, color: "#fff", cursor: "pointer", fontFamily: "inherit" }}>{saving ? "Guardando…" : "Guardar"}</button>
            </div>
          </div>
        </div>}

        {/* ─ CATEGORIES ─ */}
        {tab === "categories" && <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <p className="text-lg" style={{ fontFamily: "'Coolvetica', sans-serif", color: "#0F1A14", margin: 0 }}>Categorías</p>
            <button onClick={() => setCatForm({ _new: true, name: "", slug: "", icon: "", img_url: "", subtitle: "", sort_order: data.categories.length + 1, active: true })} style={{ background: "#1A7A5E", color: "#fff", border: "none", borderRadius: 10, padding: "9px 14px", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 5 }}><Icon name="plus" size={14} color="#fff" /> Nueva</button>
          </div>
          {catForm && <div style={{ background: "#fff", borderRadius: 14, padding: 16, marginBottom: 14, boxShadow: "0 2px 8px rgba(0,0,0,.05)", display: "flex", flexDirection: "column", gap: 10 }}>
            <div className="text-sm" style={{ fontWeight: 800, color: "#0F1A14" }}>{catForm._new ? "Nueva categoría" : "Editar: " + catForm.name}</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label className="text-xs" style={{ fontWeight: 700, color: "#5A6872", textTransform: "uppercase", letterSpacing: .8, display: "block", marginBottom: 4 }}>Nombre</label>
                <input value={catForm.name} onChange={e => setCatForm(f => ({ ...f, name: e.target.value }))} placeholder="Restaurantes" style={{ width: "100%", padding: "10px 12px", border: "1.5px solid #E4E8E4", borderRadius: 10, fontSize: 13, color: "#0F1A14", background: "#fff", fontFamily: "inherit" }} />
              </div>
              <div>
                <label className="text-xs" style={{ fontWeight: 700, color: "#5A6872", textTransform: "uppercase", letterSpacing: .8, display: "block", marginBottom: 4 }}>Slug</label>
                <input value={catForm.slug} onChange={e => setCatForm(f => ({ ...f, slug: e.target.value }))} placeholder="restaurantes" style={{ width: "100%", padding: "10px 12px", border: "1.5px solid #E4E8E4", borderRadius: 10, fontSize: 13, color: "#0F1A14", background: "#fff", fontFamily: "inherit" }} />
              </div>
              <div>
                <label className="text-xs" style={{ fontWeight: 700, color: "#5A6872", textTransform: "uppercase", letterSpacing: .8, display: "block", marginBottom: 4 }}>Icono (emoji)</label>
                <input value={catForm.icon} onChange={e => setCatForm(f => ({ ...f, icon: e.target.value }))} placeholder="Pega un emoji" style={{ width: "100%", padding: "10px 12px", border: "1.5px solid #E4E8E4", borderRadius: 10, fontSize: 22, color: "#0F1A14", background: "#fff", fontFamily: "inherit" }} />
              </div>
              <div>
                <label className="text-xs" style={{ fontWeight: 700, color: "#5A6872", textTransform: "uppercase", letterSpacing: .8, display: "block", marginBottom: 4 }}>Subtítulo (Opcional)</label>
                <input value={catForm.subtitle || ""} onChange={e => setCatForm(f => ({ ...f, subtitle: e.target.value }))} placeholder="Para todos los antojos" style={{ width: "100%", padding: "10px 12px", border: "1.5px solid #E4E8E4", borderRadius: 10, fontSize: 13, color: "#0F1A14", background: "#fff", fontFamily: "inherit" }} />
              </div>
              <div>
                <label className="text-xs" style={{ fontWeight: 700, color: "#5A6872", textTransform: "uppercase", letterSpacing: .8, display: "block", marginBottom: 4 }}>Orden</label>
                <input type="number" value={catForm.sort_order} onChange={e => setCatForm(f => ({ ...f, sort_order: parseInt(e.target.value) || 1 }))} style={{ width: "100%", padding: "10px 12px", border: "1.5px solid #E4E8E4", borderRadius: 10, fontSize: 13, color: "#0F1A14", background: "#fff", fontFamily: "inherit" }} />
              </div>
            </div>
            <div>
              <div className="text-xs" style={{ fontWeight: 700, color: "#5A6872", textTransform: "uppercase", letterSpacing: .8, marginBottom: 6 }}>Imagen de fondo (Opcional)</div>
              <Uploader onDone={url => setCatForm(f => ({ ...f, img_url: url }))} />
              {catForm.img_url && <img src={catForm.img_url} alt="" style={{ width: "100%", height: 100, objectFit: "cover", borderRadius: 8, marginTop: 8 }} loading="lazy" />}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setCatForm(null)} style={{ flex: 1, padding: 12, background: "#fff", border: "1.5px solid #E4E8E4", borderRadius: 12, fontWeight: 700, fontSize: 14, color: "#5A6872", cursor: "pointer", fontFamily: "inherit" }}>Cancelar</button>
              <button onClick={async () => { setSaving(true); try { const p = { name: catForm.name, slug: catForm.slug, icon: catForm.icon, img_url: catForm.img_url || null, subtitle: catForm.subtitle || null, sort_order: catForm.sort_order, active: catForm.active ?? true }; if (catForm._new) await sb.post("categories", p); else await sb.patch("categories", catForm.id, p); onToast("Guardado"); setCatForm(null); await load(); } catch(e) { onToast("Error: " + e.message); } finally { setSaving(false); } }} disabled={saving || !catForm.name || !catForm.slug} style={{ flex: 2, padding: 12, background: saving || !catForm.name || !catForm.slug ? "#9CA3AF" : "#1A7A5E", border: "none", borderRadius: 12, fontWeight: 700, fontSize: 14, color: "#fff", cursor: "pointer", fontFamily: "inherit" }}>{saving ? "Guardando..." : catForm._new ? "Crear" : "Guardar"}</button>
            </div>
          </div>}
          {[...data.categories].sort((a, b) => a.sort_order - b.sort_order).map((c, i, arr) => <div key={c.id} style={{ background: "#fff", borderRadius: 12, padding: "12px 14px", marginBottom: 10, display: "flex", alignItems: "center", gap: 10, boxShadow: "0 2px 8px rgba(0,0,0,.05)" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <button onClick={async () => { if (i === 0) return; const prev = arr[i-1]; await Promise.all([sb.patch("categories", c.id, { sort_order: prev.sort_order }), sb.patch("categories", prev.id, { sort_order: c.sort_order })]); await load(); }} style={{ background: "none", border: "none", cursor: i === 0 ? "default" : "pointer", padding: "1px 3px", opacity: i === 0 ? 0.2 : 1 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#5A6872" strokeWidth="2.5"><polyline points="18 15 12 9 6 15"/></svg>
              </button>
              <button onClick={async () => { if (i === arr.length-1) return; const next = arr[i+1]; await Promise.all([sb.patch("categories", c.id, { sort_order: next.sort_order }), sb.patch("categories", next.id, { sort_order: c.sort_order })]); await load(); }} style={{ background: "none", border: "none", cursor: i === arr.length-1 ? "default" : "pointer", padding: "1px 3px", opacity: i === arr.length-1 ? 0.2 : 1 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#5A6872" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>
              </button>
            </div>
            <div className="text-xl" style={{ width: 36, height: 36, borderRadius: 10, background: "#EAF4F0", display: "flex", alignItems: "center", justifyContent: "center" }}>{c.icon}</div>
            <div style={{ flex: 1 }}>
              <div className="text-sm" style={{ fontWeight: 700, color: "#0F1A14" }}>{c.name}</div>
              <div className="text-xs" style={{ color: "#5A6872", marginTop: 1 }}>/{c.slug} · orden {c.sort_order}</div>
            </div>
            <div style={{ display: "flex", gap: 5 }}>
              <button onClick={() => setCatForm({ ...c })} style={{ background: "#EAF4F0", border: "none", borderRadius: 8, padding: "7px 9px", cursor: "pointer" }}><Icon name="edit" size={13} color="#1A7A5E" /></button>
              <button onClick={async () => { await sb.patch("categories", c.id, { active: !c.active }); onToast("Actualizado"); await load(); }} style={{ background: c.active ? "#EAF4F0" : "#FEE2E2", border: "none", borderRadius: 8, padding: "7px 10px", cursor: "pointer", fontSize: 11, fontWeight: 700, color: c.active ? "#1A7A5E" : "#D94F3D", fontFamily: "inherit" }}>{c.active ? "Activa" : "Inactiva"}</button>
            </div>
          </div>)}
        </div>}

        {tab === "reservations" && <div>
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
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Icon name="clock" size={12} color="#5A6872" />{(() => { if (!r.time) return ""; const [h, m] = r.time.split(":"); let hh = parseInt(h); const ap = hh >= 12 ? "PM" : "AM"; if (hh === 0) hh = 12; if (hh > 12) hh -= 12; return `${hh}:${m} ${ap}`; })()}</span>
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
        </div>}

        {/* ─ ANALYTICS ─ */}
        {tab === "push" && <PushTab T={T} onToast={onToast} />}

        {tab === "analytics" && analyticsTarget && (() => {
          const b = data.biz.find(x => x.id === analyticsTarget);
          if (!b) return null;
          const bizAn = data.analytics.filter(a => a.biz_id === b.id);
          const aViews = bizAn.filter(a => a.event_type === "view").length;
          const aWa = bizAn.filter(a => a.event_type === "whatsapp").length;
          const aMaps = bizAn.filter(a => a.event_type === "maps").length;
          const aPhone = bizAn.filter(a => a.event_type === "phone").length;
          const aWeb = bizAn.filter(a => a.event_type === "website").length;
          const aReservations = data.reservations.filter(r => r.biz_id === b.id).length;
          
          const chartData = [];
          for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const targetYMD = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
            
            const dayAn = bizAn.filter(a => {
              if (!a.created_at) return false;
              const aDate = new Date(a.created_at);
              const aYMD = `${aDate.getFullYear()}-${String(aDate.getMonth()+1).padStart(2,'0')}-${String(aDate.getDate()).padStart(2,'0')}`;
              return aYMD === targetYMD;
            });
            
            chartData.push({
              name: d.toLocaleDateString("es-MX", { weekday: 'short', day: 'numeric' }),
              vistas: dayAn.filter(a => a.event_type === "view").length,
              llamadas: dayAn.filter(a => a.event_type === "phone").length,
              whatsapp: dayAn.filter(a => a.event_type === "whatsapp").length
            });
          }

          return <div>
            <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 20 }}>
              <button onClick={() => { setTab("biz"); setAnalyticsTarget(null); }} style={{ background: "#F3F4F6", border: "none", borderRadius: 10, padding: 10, cursor: "pointer", display: "flex", alignItems: "center" }}><Icon name="x" size={16} color="#5A6872" /></button>
              <h2 className="text-xl" style={{ fontFamily: "'Coolvetica', sans-serif", color: "#0F1A14", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{b.name}</h2>
            </div>
            
            <div style={{ background: "#fff", borderRadius: 14, padding: "20px", marginBottom: 20, boxShadow: "0 2px 8px rgba(0,0,0,.05)" }}>
              <p className="text-sm" style={{ fontWeight: 700, color: "#0F1A14", marginBottom: 20 }}>Interacciones los últimos 7 días</p>
              <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", height: 200, gap: 8, paddingBottom: 10 }}>
                {(() => {
                  const maxVal = Math.max(1, ...chartData.map(d => Math.max(d.vistas, d.llamadas, d.whatsapp)));
                  return chartData.map((d, i) => (
                    <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", height: "100%", position: "relative" }}>
                      <div style={{ display: "flex", gap: 2, alignItems: "flex-end", height: "100%", width: "100%", justifyContent: "center", paddingBottom: 6 }}>
                        {/* Vistas Bar */}
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", height: "100%", width: "30%", maxWidth: 12 }}>
                          {d.vistas > 0 && <span style={{ fontSize: 8, fontWeight: 800, color: "#3B82F6", marginBottom: 3 }}>{d.vistas}</span>}
                          <div style={{ width: "100%", height: `${(d.vistas / maxVal) * 100}%`, minHeight: d.vistas > 0 ? 4 : 0, background: "#3B82F6", borderRadius: "3px 3px 0 0", transition: "height 0.3s ease" }} />
                        </div>
                        {/* Llamadas Bar */}
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", height: "100%", width: "30%", maxWidth: 12 }}>
                          {d.llamadas > 0 && <span style={{ fontSize: 8, fontWeight: 800, color: "#8B5CF6", marginBottom: 3 }}>{d.llamadas}</span>}
                          <div style={{ width: "100%", height: `${(d.llamadas / maxVal) * 100}%`, minHeight: d.llamadas > 0 ? 4 : 0, background: "#8B5CF6", borderRadius: "3px 3px 0 0", transition: "height 0.3s ease" }} />
                        </div>
                        {/* Whatsapp Bar */}
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", height: "100%", width: "30%", maxWidth: 12 }}>
                          {d.whatsapp > 0 && <span style={{ fontSize: 8, fontWeight: 800, color: "#25D366", marginBottom: 3 }}>{d.whatsapp}</span>}
                          <div style={{ width: "100%", height: `${(d.whatsapp / maxVal) * 100}%`, minHeight: d.whatsapp > 0 ? 4 : 0, background: "#25D366", borderRadius: "3px 3px 0 0", transition: "height 0.3s ease" }} />
                        </div>
                      </div>
                      <div className="text-micro" style={{ color: "#5A6872", whiteSpace: "nowrap", textAlign: "center", textTransform: "capitalize", borderTop: "1px solid #E4E8E4", paddingTop: 8, width: "100%" }}>{d.name.split(',')[0]}</div>
                    </div>
                  ));
                })()}
              </div>
              <div style={{ display: "flex", justifyContent: "center", gap: 16, marginTop: 16, flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}><div style={{ width: 10, height: 10, borderRadius: "50%", background: "#3B82F6" }} /><span className="text-xs" style={{ color: "#5A6872", fontWeight: 600 }}>Vistas</span></div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}><div style={{ width: 10, height: 10, borderRadius: "50%", background: "#8B5CF6" }} /><span className="text-xs" style={{ color: "#5A6872", fontWeight: 600 }}>Llamadas</span></div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}><div style={{ width: 10, height: 10, borderRadius: "50%", background: "#25D366" }} /><span className="text-xs" style={{ color: "#5A6872", fontWeight: 600 }}>WhatsApp</span></div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <MetricCard label="Vistas Perfil" value={aViews} icon="eye" color="#3B82F6" T={T} />
              <MetricCard label="WhatsApp" value={aWa} icon="whatsapp" color="#25D366" T={T} />
              <MetricCard label="Reservaciones" value={aReservations} icon="calendar" color="#EAB308" T={T} />
              <MetricCard label="Llamadas" value={aPhone} icon="phone" color="#8B5CF6" T={T} />
              <MetricCard label="Mapas" value={aMaps} icon="map" color="#EA4335" T={T} />
              <MetricCard label="Sitio Web" value={aWeb} icon="globe" color="#1A7A5E" T={T} />
            </div>
          </div>;
        })()}

      </>}
    </div>
  </div>;
}

// ─── FEATURED CARD (Chili's style) ───────────────────────────────────────────
function PushTab({ T, onToast }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [deepLinkType, setDeepLinkType] = useState("none"); // "none" | "biz" | "event"
  const [search, setSearch] = useState("");
  const [allBiz, setAllBiz] = useState([]);
  const [allEvents, setAllEvents] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);

  // Load biz and events for search
  useEffect(() => {
    if (deepLinkType === "biz") {
      sb.get("businesses", "?select=id,name,slug,city_slug&status=eq.approved&limit=500")
        .then(data => setAllBiz(data || []));
    } else if (deepLinkType === "event") {
      sb.get("events", "?select=id,title&limit=200")
        .then(data => setAllEvents(data || []));
    }
    setSelectedItem(null);
    setSearch("");
  }, [deepLinkType]);

  const items = deepLinkType === "biz" 
    ? allBiz.filter(b => b.name?.toLowerCase().includes(search.toLowerCase()))
    : allEvents.filter(e => e.title?.toLowerCase().includes(search.toLowerCase()));

  const handleSend = async () => {
    if (!title || !body) return onToast("Faltan campos");
    if (deepLinkType !== "none" && !selectedItem) return onToast("Selecciona un negocio o evento destino");
    if (!window.confirm("¿Seguro que quieres enviar esta notificación a TODOS los usuarios con la app instalada?")) return;
    
    setLoading(true);
    try {
      // Build the deep link URL
      let deepLink = null;
      if (deepLinkType === "biz" && selectedItem) {
        deepLink = `https://citymap.mx/${selectedItem.city_slug}/${selectedItem.slug}`;
      } else if (deepLinkType === "event" && selectedItem) {
        deepLink = `https://citymap.mx/evento/${selectedItem.id}`;
      }

      const res = await fetch("https://citymap.mx/api/send-notification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body, deepLink, secret: import.meta.env.VITE_ADMIN_SECRET })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al enviar");
      
      onToast(`✅ Enviadas: ${data.successCount}, Fallos: ${data.failureCount}`);
      setTitle(""); setBody(""); setSelectedItem(null); setSearch(""); setDeepLinkType("none");
    } catch (err) {
      console.error(err);
      onToast(err.message || "Error al enviar la notificación");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <h3 className="text-lg" style={{ margin: 0, color: T.text }}>Enviar Notificación Push</h3>
      <p className="text-sm" style={{ margin: 0, color: T.sub }}>Esta notificación llegará a todos los usuarios que tengan instalada la app CityMap en Android o iOS.</p>
      
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <label className="text-xs" style={{ fontWeight: 700, color: T.sub, textTransform: "uppercase" }}>Título</label>
        <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Ej: ¡Nueva Taquería!" style={{ padding: "12px 14px", borderRadius: 10, border: "1px solid " + T.border, outline: "none", fontSize: 14, fontFamily: "inherit", background: T.white, color: T.text }} />
      </div>
      
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <label className="text-xs" style={{ fontWeight: 700, color: T.sub, textTransform: "uppercase" }}>Mensaje</label>
        <textarea value={body} onChange={e => setBody(e.target.value)} placeholder="Descubre los mejores tacos de pastor de la ciudad..." rows={3} style={{ padding: "12px 14px", borderRadius: 10, border: "1px solid " + T.border, outline: "none", fontSize: 14, fontFamily: "inherit", background: T.white, color: T.text, resize: "none" }} />
      </div>

      {/* Deep Link Selector */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <label className="text-xs" style={{ fontWeight: 700, color: T.sub, textTransform: "uppercase" }}>Al tocar la notificación, abrir… (opcional)</label>
        <div style={{ display: "flex", gap: 8 }}>
          {[["none", "Solo la app"], ["biz", "Un negocio"], ["event", "Un evento"]].map(([val, lbl]) => (
            <button key={val} onClick={() => setDeepLinkType(val)} style={{ flex: 1, padding: "10px 8px", borderRadius: 10, border: "2px solid " + (deepLinkType === val ? T.green : T.border), background: deepLinkType === val ? T.green + "18" : T.white, color: deepLinkType === val ? T.green : T.sub, fontWeight: 700, fontSize: 12, cursor: "pointer", transition: "all 0.2s" }}>
              {lbl}
            </button>
          ))}
        </div>

        {deepLinkType !== "none" && (
          <div style={{ position: "relative" }}>
            <input
              type="text"
              value={selectedItem ? (selectedItem.name || selectedItem.title) : search}
              onChange={e => { setSearch(e.target.value); setSelectedItem(null); setShowDropdown(true); }}
              onFocus={() => setShowDropdown(true)}
              placeholder={deepLinkType === "biz" ? "Buscar negocio..." : "Buscar evento..."}
              style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: "1px solid " + (selectedItem ? T.green : T.border), outline: "none", fontSize: 14, fontFamily: "inherit", background: T.white, color: T.text, boxSizing: "border-box" }}
            />
            {showDropdown && !selectedItem && items.length > 0 && (
              <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: T.white, border: "1px solid " + T.border, borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,.12)", zIndex: 100, maxHeight: 200, overflowY: "auto" }}>
                {items.slice(0, 20).map(item => (
                  <div key={item.id} onClick={() => { setSelectedItem(item); setShowDropdown(false); setSearch(""); }} style={{ padding: "10px 14px", cursor: "pointer", fontSize: 13, color: T.text, borderBottom: "1px solid " + T.border + "66" }}
                    onMouseEnter={e => e.currentTarget.style.background = T.green + "18"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    {item.name || item.title}
                    {item.city_slug && <span className="text-xs" style={{ color: T.sub, marginLeft: 6 }}>({item.city_slug})</span>}
                  </div>
                ))}
              </div>
            )}
            {selectedItem && (
              <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 8 }}>
                <span className="text-xs" style={{ color: T.green, fontWeight: 700 }}>✅ {selectedItem.name || selectedItem.title}</span>
                <button onClick={() => { setSelectedItem(null); setSearch(""); }} style={{ background: "none", border: "none", color: T.sub, cursor: "pointer", fontSize: 12 }}>✕ Cambiar</button>
              </div>
            )}
          </div>
        )}
      </div>

      <button className="text-base" onClick={handleSend} disabled={loading} style={{ background: T.green, color: "#fff", padding: "14px 20px", borderRadius: 12, border: "none", fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1, transition: "all 0.2s", marginTop: 6 }}>
        {loading ? "Enviando..." : "Enviar Notificación Masiva"}
      </button>
    </div>
  );
}

export default AdminPanel;

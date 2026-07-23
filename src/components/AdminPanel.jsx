import { useState, useEffect, useCallback, lazy, Suspense } from "react";
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
import FI from './admin/FI.jsx';

function MetricCard({ label, value, icon, color, T }) {
  return <div style={{ background: T.white, borderRadius: 14, padding: "14px 16px", boxShadow: T.shadow, flex: 1, minWidth: 0 }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}><span className="text-xs" style={{ fontWeight: 700, color: T.sub, textTransform: "uppercase", letterSpacing: .6 }}>{label}</span><div style={{ width: 30, height: 30, borderRadius: 8, background: color + "22", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name={icon} size={14} color={color} /></div></div><div className="text-2xl" style={{ fontWeight: 800, color: T.text }}>{value}</div></div>;
}




// ─────────────────────────────────────────────────────────────────────────────
//  ADMIN PANEL — TOTAL
// ─────────────────────────────────────────────────────────────────────────────
const AdminDashboardTab = lazy(() => import('./admin/AdminDashboardTab.jsx'));
const AdminBizTab = lazy(() => import('./admin/AdminBizTab.jsx'));
const AdminEventsTab = lazy(() => import('./admin/AdminEventsTab.jsx'));
const AdminPromosTab = lazy(() => import('./admin/AdminPromosTab.jsx'));
const AdminCouponsTab = lazy(() => import('./admin/AdminCouponsTab.jsx'));
const AdminRafflesTab = lazy(() => import('./admin/AdminRafflesTab.jsx'));
const AdminBannersTab = lazy(() => import('./admin/AdminBannersTab.jsx'));
const AdminCitiesTab = lazy(() => import('./admin/AdminCitiesTab.jsx'));
const AdminCategoriesTab = lazy(() => import('./admin/AdminCategoriesTab.jsx'));
const AdminReservationsTab = lazy(() => import('./admin/AdminReservationsTab.jsx'));

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
        {tab === "dashboard" && (
          <Suspense fallback={null}>
            <AdminDashboardTab data={data} dashCityFilter={dashCityFilter} setDashCityFilter={setDashCityFilter} T={T} />
          </Suspense>
        )}

        {/* ─ NEGOCIOS ─ */}
        {tab === "biz" && (
          <Suspense fallback={null}>
            <AdminBizTab
              data={data}
              bizForm={bizForm}
              setBizForm={setBizForm}
              bizSearch={bizSearch}
              setBizSearch={setBizSearch}
              bizTypeFilter={bizTypeFilter}
              setBizTypeFilter={setBizTypeFilter}
              bizCityFilter={bizCityFilter}
              setBizCityFilter={setBizCityFilter}
              setAnalyticsTarget={setAnalyticsTarget}
              setTab={setTab}
              setMediaTarget={setMediaTarget}
              onOpenStoreAdmin={onOpenStoreAdmin}
              delBiz={delBiz}
              geo={geo}
              saveBiz={saveBiz}
              saving={saving}
              T={T}
            />
          </Suspense>
        )}

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
        {tab === "events" && (
          <Suspense fallback={null}>
            <AdminEventsTab
              data={data}
              evForm={evForm}
              setEvForm={setEvForm}
              sb={sb}
              load={load}
              onToast={onToast}
              saving={saving}
              setSaving={setSaving}
            />
          </Suspense>
        )}


        {/* ─ PROMOS ─ */}
        {tab === "promos" && (
          <Suspense fallback={null}>
            <AdminPromosTab data={data} prForm={prForm} setPrForm={setPrForm} sb={sb} load={load} onToast={onToast} saving={saving} setSaving={setSaving} />
          </Suspense>
        )}

        {/* ─ COUPONS ─ */}
        {tab === "coupons" && (
          <Suspense fallback={null}>
            <AdminCouponsTab data={data} cpForm={cpForm} setCpForm={setCpForm} sb={sb} load={load} onToast={onToast} saving={saving} setSaving={setSaving} />
          </Suspense>
        )}

        {/* ─ RAFFLES ─ */}
        {tab === "raffles" && (
          <Suspense fallback={null}>
            <AdminRafflesTab data={data} rfForm={rfForm} setRfForm={setRfForm} sb={sb} load={load} onToast={onToast} saving={saving} setSaving={setSaving} />
          </Suspense>
        )}

        {/* ─ BANNERS ─ */}
        {tab === "banners" && (
          <Suspense fallback={null}>
            <AdminBannersTab data={data} banForm={banForm} setBanForm={setBanForm} sb={sb} load={load} onToast={onToast} saving={saving} setSaving={setSaving} Uploader={Uploader} />
          </Suspense>
        )}

        {/* ─ CITIES ─ */}
        {tab === "cities" && (
          <Suspense fallback={null}>
            <AdminCitiesTab data={data} cityForm={cityForm} setCityForm={setCityForm} sb={sb} load={load} onToast={onToast} saving={saving} setSaving={setSaving} />
          </Suspense>
        )}

        {/* ─ CATEGORIES ─ */}
        {tab === "categories" && (
          <Suspense fallback={null}>
            <AdminCategoriesTab data={data} catForm={catForm} setCatForm={setCatForm} sb={sb} load={load} onToast={onToast} saving={saving} setSaving={setSaving} />
          </Suspense>
        )}

        {/* ─ RESERVATIONS ─ */}
        {tab === "reservations" && (
          <Suspense fallback={null}>
            <AdminReservationsTab data={data} sb={sb} load={load} onToast={onToast} />
          </Suspense>
        )}

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
          const aMenuOrders = bizAn.filter(a => a.event_type === "menu_order").length;
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
              whatsapp: dayAn.filter(a => a.event_type === "whatsapp").length,
              pedidos: dayAn.filter(a => a.event_type === "menu_order").length
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
                  const maxVal = Math.max(1, ...chartData.map(d => Math.max(d.vistas, d.llamadas, d.whatsapp, d.pedidos)));
                  return chartData.map((d, i) => (
                    <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", height: "100%", position: "relative" }}>
                      <div style={{ display: "flex", gap: 2, alignItems: "flex-end", height: "100%", width: "100%", justifyContent: "center", paddingBottom: 6 }}>
                        {/* Vistas Bar */}
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", height: "100%", width: "22%", maxWidth: 10 }}>
                          {d.vistas > 0 && <span style={{ fontSize: 8, fontWeight: 800, color: "#3B82F6", marginBottom: 3 }}>{d.vistas}</span>}
                          <div style={{ width: "100%", height: `${(d.vistas / maxVal) * 100}%`, minHeight: d.vistas > 0 ? 4 : 0, background: "#3B82F6", borderRadius: "3px 3px 0 0", transition: "height 0.3s ease" }} />
                        </div>
                        {/* Llamadas Bar */}
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", height: "100%", width: "22%", maxWidth: 10 }}>
                          {d.llamadas > 0 && <span style={{ fontSize: 8, fontWeight: 800, color: "#8B5CF6", marginBottom: 3 }}>{d.llamadas}</span>}
                          <div style={{ width: "100%", height: `${(d.llamadas / maxVal) * 100}%`, minHeight: d.llamadas > 0 ? 4 : 0, background: "#8B5CF6", borderRadius: "3px 3px 0 0", transition: "height 0.3s ease" }} />
                        </div>
                        {/* Whatsapp Bar */}
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", height: "100%", width: "22%", maxWidth: 10 }}>
                          {d.whatsapp > 0 && <span style={{ fontSize: 8, fontWeight: 800, color: "#25D366", marginBottom: 3 }}>{d.whatsapp}</span>}
                          <div style={{ width: "100%", height: `${(d.whatsapp / maxVal) * 100}%`, minHeight: d.whatsapp > 0 ? 4 : 0, background: "#25D366", borderRadius: "3px 3px 0 0", transition: "height 0.3s ease" }} />
                        </div>
                        {/* Pedidos Bar */}
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", height: "100%", width: "22%", maxWidth: 10 }}>
                          {d.pedidos > 0 && <span style={{ fontSize: 8, fontWeight: 800, color: "#F97316", marginBottom: 3 }}>{d.pedidos}</span>}
                          <div style={{ width: "100%", height: `${(d.pedidos / maxVal) * 100}%`, minHeight: d.pedidos > 0 ? 4 : 0, background: "#F97316", borderRadius: "3px 3px 0 0", transition: "height 0.3s ease" }} />
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
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}><div style={{ width: 10, height: 10, borderRadius: "50%", background: "#F97316" }} /><span className="text-xs" style={{ color: "#5A6872", fontWeight: 600 }}>Pedidos</span></div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <MetricCard label="Vistas Perfil" value={aViews} icon="eye" color="#3B82F6" T={T} />
              <MetricCard label="WhatsApp" value={aWa} icon="whatsapp" color="#25D366" T={T} />
              <MetricCard label="Pedidos Menú" value={aMenuOrders} icon="shopping-bag" color="#F97316" T={T} />
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
  const [targetCity, setTargetCity] = useState("");
  const [cities, setCities] = useState([]);

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

  // Load cities for target filter
  useEffect(() => {
    sb.get("cities", "?select=slug,name&order=name.asc").then(data => setCities(data || []));
  }, []);

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
        body: JSON.stringify({ 
          title, 
          body, 
          deepLink, 
          target_city: targetCity || null,
          secret: import.meta.env.VITE_ADMIN_SECRET 
        })
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
      <p className="text-sm" style={{ margin: 0, color: T.sub }}>Esta notificación llegará a los usuarios con la app CityMap instalada en sus celulares.</p>
      
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <label className="text-xs" style={{ fontWeight: 700, color: T.sub, textTransform: "uppercase" }}>Ciudad Destino</label>
        <select value={targetCity} onChange={e => setTargetCity(e.target.value)} style={{ padding: "12px 14px", borderRadius: 10, border: "1px solid " + T.border, outline: "none", fontSize: 14, fontFamily: "inherit", background: T.white, color: T.text, appearance: "none" }}>
          <option value="">🌎 Enviar a TODAS las ciudades (Global)</option>
          {cities.map(c => <option key={c.slug} value={c.slug}>📍 Solo usuarios en: {c.name}</option>)}
        </select>
      </div>

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

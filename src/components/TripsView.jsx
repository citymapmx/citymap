import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Icon from "./ui/Icon.jsx";
import PlanEditor from "./plans/PlanEditor.jsx";
import PlanViewer from "./plans/PlanViewer.jsx";
import { sb } from "../lib/supabase.js";
import { PageLogo } from "./Brand.jsx";
import FavsView from "../views/FavsView.jsx";

const PLAN_IDEAS = [
  { emoji: "❤️", label: "Cita romántica", bg: "#FFF1F2", color: "#E11D48" },
  { emoji: "🌮", label: "Tour de tacos", bg: "#FFFBEB", color: "#D97706" },
  { emoji: "☕", label: "Ruta de cafés", bg: "#FEF3C7", color: "#92400E" },
  { emoji: "🎵", label: "Noche de antros", bg: "#F3E8FF", color: "#7C3AED" },
  { emoji: "👨‍👩‍👧", label: "Plan familiar", bg: "#F0FDF4", color: "#15803D" },
  { emoji: "🏃", label: "Día deportivo", bg: "#EFF6FF", color: "#1D4ED8" },
];

const DISCOVER_FILTERS = [
  { id: "trending", label: "🔥 Tendencia" },
  { id: "top", label: "⭐ Mejor valorados" },
  { id: "new", label: "🆕 Nuevos" },
];

// Map illustration SVG
function MapIllustration() {
  return (
    <svg width="220" height="180" viewBox="0 0 220 180" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Map base */}
      <rect x="20" y="60" width="180" height="110" rx="12" fill="#E9E3FE" opacity="0.6"/>
      <rect x="20" y="60" width="180" height="110" rx="12" stroke="#C4B5FD" strokeWidth="1.5"/>
      
      {/* Map lines */}
      <line x1="50" y1="80" x2="170" y2="80" stroke="#C4B5FD" strokeWidth="1" strokeDasharray="4 4"/>
      <line x1="50" y1="100" x2="140" y2="100" stroke="#C4B5FD" strokeWidth="1" strokeDasharray="4 4"/>
      <line x1="50" y1="120" x2="160" y2="120" stroke="#C4B5FD" strokeWidth="1" strokeDasharray="4 4"/>
      <line x1="80" y1="70" x2="80" y2="160" stroke="#C4B5FD" strokeWidth="1" strokeDasharray="4 4"/>
      <line x1="130" y1="70" x2="130" y2="160" stroke="#C4B5FD" strokeWidth="1" strokeDasharray="4 4"/>
      
      {/* Route line */}
      <path d="M 65 145 Q 80 110 110 95 Q 140 80 155 90" stroke="#7C3AED" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
      
      {/* Pin 1 (purple - main) */}
      <ellipse cx="110" cy="57" rx="18" ry="18" fill="#7C3AED" opacity="0.15"/>
      <circle cx="110" cy="50" r="14" fill="#7C3AED"/>
      <circle cx="110" cy="50" r="6" fill="white"/>
      <path d="M 110 64 L 110 72" stroke="#7C3AED" strokeWidth="2.5" strokeLinecap="round"/>
      
      {/* Pin 2 (orange accent) */}
      <circle cx="155" cy="88" r="10" fill="#F97316"/>
      <path d="M 150 84 L 155 79 L 160 84 L 155 96 Z" fill="#F97316"/>
      <circle cx="155" cy="84" r="4" fill="white"/>
      
      {/* Coffee cup icon */}
      <g transform="translate(56, 130)">
        <rect x="0" y="4" width="18" height="14" rx="3" fill="#7C3AED" opacity="0.8"/>
        <path d="M 18 8 Q 24 8 24 13 Q 24 18 18 18" stroke="#7C3AED" strokeWidth="2" fill="none" opacity="0.8"/>
        <rect x="3" y="0" width="12" height="4" rx="1" fill="#C4B5FD"/>
      </g>
      
      {/* Heart */}
      <g transform="translate(30, 70)">
        <path d="M 12 18 L 3 9 C 1 7 1 4 3 2 C 5 0 8 0 10 2 L 12 4 L 14 2 C 16 0 19 0 21 2 C 23 4 23 7 21 9 Z" fill="#F43F5E" transform="scale(0.7)"/>
      </g>
    </svg>
  );
}

function PlanCard3Photos({ plan, onClick, isSaved, onToggleSave, T, dark, isMine }) {
  const photos = [];
  for (const item of plan.places.slice(0, 3)) {
    const url = item.business?.logo_url || item.business?.photos?.[0]?.url || null;
    if (url) photos.push(url);
  }
  // Cover photo has priority
  if (plan.coverUrl) photos.unshift(plan.coverUrl);

  const badgeColor = plan.badge === "trending" ? "#7C3AED" : plan.badge === "top" ? "#D97706" : "#1D4ED8";
  const badgeLabel = plan.badge === "trending" ? "🔥 Tendencia" : plan.badge === "top" ? "⭐ Destacado" : "🆕 Nuevo";
  const badgeBg = plan.badge === "trending" ? "#F3E8FF" : plan.badge === "top" ? "#FEF3C7" : "#EFF6FF";

  return (
    <div onClick={onClick} className="press" style={{ background: dark ? "rgba(255,255,255,0.03)" : "#fff", borderRadius: 16, overflow: "hidden", cursor: "pointer", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", border: `1px solid ${T.border}` }}>
      {/* Photo Collage */}
      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gridTemplateRows: "80px 80px", height: 160, gap: 3, position: "relative" }}>
        <div style={{ gridRow: "1 / 3", background: photos[0] ? `url(${photos[0]}) center/cover` : dark ? "#222" : "#E5E7EB", position: "relative" }}>
          {plan.badge && (
            <div style={{ position: "absolute", top: 10, left: 10, background: badgeBg, color: badgeColor, padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 800 }}>
              {badgeLabel}
            </div>
          )}
        </div>
        <div style={{ background: photos[1] ? `url(${photos[1]}) center/cover` : dark ? "#333" : "#D1D5DB" }} />
        <div style={{ background: photos[2] ? `url(${photos[2]}) center/cover` : dark ? "#444" : "#9CA3AF" }} />
      </div>

      {/* Info */}
      <div style={{ padding: "14px 16px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: T.text, lineHeight: 1.3, marginBottom: 4 }}>
              {plan.emoji} {plan.name}
            </h3>
            {plan.author && (
              <div style={{ fontSize: 12, color: T.sub, fontWeight: 600, marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                {plan.authorAvatar ? (
                  <img src={plan.authorAvatar} alt="" style={{ width: 16, height: 16, borderRadius: "50%", objectFit: "cover" }} />
                ) : (
                  <span style={{ fontSize: 12 }}>👤</span>
                )}
                por @{plan.author}
              </div>
            )}
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <span style={{ fontSize: 12, color: T.sub, display: "flex", alignItems: "center", gap: 4 }}>
                📍 {plan.places.length} lugares
              </span>
              {plan.totalKm > 0 && (
                <span style={{ fontSize: 12, color: T.sub, display: "flex", alignItems: "center", gap: 4 }}>
                  🛣️ {plan.totalKm} km
                </span>
              )}
              {plan.duration && (
                <span style={{ fontSize: 12, color: T.sub, display: "flex", alignItems: "center", gap: 4 }}>
                  ⏱️ {plan.duration}
                </span>
              )}
            </div>
          </div>
          
          <button 
            onClick={e => { e.stopPropagation(); onToggleSave(); }}
            style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, background: "none", border: "none", cursor: "pointer", padding: 4 }}
          >
            <Icon name={isSaved ? "bookmark-filled" : "bookmark"} size={22} color={isSaved ? "#7C3AED" : T.sub} />
            <span style={{ fontSize: 11, color: isSaved ? "#7C3AED" : T.sub, fontWeight: 700 }}>{plan.savesCount || 0}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TripsView({ T, dark, navigate, mapPins = [], activeCity = "tepic", cities = [], user, profile, initialPlanId, initialJoinToken, onInitialPlanOpened }) {
  const [activeTab, setActiveTab] = useState("mis_planes");
  const [plans, setPlans] = useState([]); // My plans + saved
  const [publicPlans, setPublicPlans] = useState([]); // Discover
  const [savedIds, setSavedIds] = useState([]);
  
  const [isEditing, setIsEditing] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [isViewing, setIsViewing] = useState(false);
  const [viewingPlan, setViewingPlan] = useState(null);
  
  const [discoverFilter, setDiscoverFilter] = useState("trending");
  const [searchQ, setSearchQ] = useState("");
  const [loading, setLoading] = useState(false);

  const cityName = cities.find(c => c.slug === activeCity)?.name
    || (activeCity ? activeCity.charAt(0).toUpperCase() + activeCity.slice(1) : "tu ciudad");

  const parseDBPlan = (dbPlan, extraBizMap = {}) => {
    // Map items to proper local structure
    const places = [...(dbPlan.plan_items || [])].sort((a,b) => a.position - b.position).map(item => {
      let biz = null;
      if (item.type === 'business' && item.business_id) {
        // First try mapPins (local cache), then extraBizMap (fetched from DB)
        biz = mapPins.find(p => String(p.id) === item.business_id)
           || extraBizMap[item.business_id]
           || null;
      }
      return {
        id: item.id,
        type: item.type,
        business: biz,
        customEmoji: item.custom_emoji,
        customName: item.custom_name,
        customAddress: item.custom_address,
        timeHint: item.time_hint || item.start_time || '',
        note: item.note || '',
        durationMin: item.duration_min || ''
      };
    });

    return {
      id: dbPlan.id,
      name: dbPlan.name,
      description: dbPlan.description || '',
      emoji: dbPlan.emoji || '🗺️',
      coverUrl: dbPlan.cover_url || '',
      isPublic: dbPlan.is_public || false,
      link_shared: dbPlan.link_shared || false,
      visibility: dbPlan.visibility || (dbPlan.is_public ? 'public' : 'private'),
      savesCount: dbPlan.saves_count || 0,
      author: dbPlan.profiles?.name || 'Usuario',
      authorAvatar: dbPlan.profiles?.avatar_url || '',
      authorId: dbPlan.user_id,
      places,
      created_at: dbPlan.created_at,
      start_date: dbPlan.start_date || '',
      category: dbPlan.category || '',
      tags: dbPlan.tags || [],
      notes: dbPlan.notes || '',
      checklist: dbPlan.checklist || [],
      share_token: dbPlan.share_token || ''
    };
  };

  // Async version: fetches missing businesses from DB when mapPins is empty
  const parseDBPlanWithBiz = async (dbPlan) => {
    const bizIds = (dbPlan.plan_items || [])
      .filter(item => item.type === 'business' && item.business_id)
      .map(item => item.business_id);

    const missingIds = bizIds.filter(id => !mapPins.find(p => String(p.id) === id));

    let extraBizMap = {};
    if (missingIds.length > 0) {
      try {
        const bizData = await sb.getPublic('businesses', `?id=in.(${missingIds.join(',')})&select=id,name,category,slug,lat,lng,logo_url,photos,schedule,address`);
        for (const b of bizData) {
          const parseJSON = (v) => { if (typeof v === 'string') { try { return JSON.parse(v); } catch { return {}; } } return v || {}; };
          extraBizMap[String(b.id)] = { ...b, photos: Array.isArray(b.photos) ? b.photos : parseJSON(b.photos), schedule: parseJSON(b.schedule) };
        }
      } catch (e) {
        console.warn('Could not fetch businesses for plan:', e);
      }
    }

    return parseDBPlan(dbPlan, extraBizMap);
  };

  const loadData = async () => {
    setLoading(true);
    
    try {
      // 4. Get discover plans (public plans in this city) regardless of auth
      const discoverData = await sb.get("plans", `?is_public=eq.true&city_slug=eq.${activeCity}&order=saves_count.desc&select=*,profiles(name,avatar_url),plan_items(*)`);
      setPublicPlans(discoverData.map(parseDBPlan));
    } catch (err) {
      console.error("Error loading public plans:", err);
    }

    if (!user) {
      // Offline fallback
      try {
        const saved = localStorage.getItem("cg_user_plans");
        if (saved) setPlans(JSON.parse(saved));
      } catch (e) { }
      setLoading(false);
      return;
    }

    try {
      // 1. Get my plans
      const myPlansData = await sb.get("plans", `?user_id=eq.${user.id}&order=created_at.desc&select=*,profiles(name,avatar_url),plan_items(*)`);
      
      // 2. Get my saves
      const mySavesData = await sb.get("plan_saves", `?user_id=eq.${user.id}&select=plan_id`);
      const sIds = mySavesData.map(s => s.plan_id);
      setSavedIds(sIds);

      // 3. Get the saved plans data (if any)
      let savedPlansData = [];
      if (sIds.length > 0) {
        savedPlansData = await sb.get("plans", `?id=in.(${sIds.join(',')})&select=*,profiles(name,avatar_url),plan_items(*)`);
      }

      const allMyPlans = [...myPlansData.map(parseDBPlan), ...savedPlansData.map(parseDBPlan)];
      
      // Remove duplicates just in case I saved my own plan
      const uniquePlans = [];
      const seen = new Set();
      for (const p of allMyPlans) {
        if (!seen.has(p.id)) {
          seen.add(p.id);
          uniquePlans.push(p);
        }
      }
      // Sync local plans if they exist
      try {
        const localPlans = JSON.parse(localStorage.getItem("cg_user_plans") || "[]");
        if (localPlans.length > 0) {
          console.log("Syncing local plans to cloud...");
          let syncedCount = 0;
          for (const localPlan of localPlans) {
            if (!uniquePlans.some(p => p.name === localPlan.name)) {
               const safePlanBody = { 
                 user_id: user.id, 
                 name: localPlan.name, 
                 description: localPlan.description || null, 
                 emoji: localPlan.emoji || '🗺️', 
                 cover_url: localPlan.coverUrl || null, 
                 is_public: localPlan.isPublic || false, 
                 city_slug: activeCity || null 
               };
               try {
                 const [created] = await sb.post('plans', safePlanBody);
                 if (created && localPlan.places) {
                   for (let i = 0; i < localPlan.places.length; i++) {
                     const item = localPlan.places[i];
                     await sb.post('plan_items', {
                       plan_id: created.id, position: i, type: item.type || 'business', 
                       business_id: item.type !== 'custom' ? String(item.business?.id ?? '') : null, 
                       custom_emoji: item.type === 'custom' ? item.customEmoji : null, 
                       custom_name: item.type === 'custom' ? item.customName : null, 
                       time_hint: item.timeHint || null, note: item.note || null
                     }).catch(()=>{});
                   }
                 }
                 uniquePlans.unshift(parseDBPlan({...created, plan_items: localPlan.places}));
                 syncedCount++;
               } catch (e) {
                 console.error("Failed to sync local plan:", e);
               }
            }
          }
          if (syncedCount > 0) {
            localStorage.removeItem("cg_user_plans");
          }
        }
      } catch (e) {
        console.error("Local plans sync error", e);
      }

      setPlans(uniquePlans);

    } catch (err) {
      console.error("Error loading user plans:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, [user, activeCity, mapPins]);

  useEffect(() => {
    if ((initialPlanId || initialJoinToken) && !viewingPlan) {
      const targetId = initialPlanId || initialJoinToken;
      const byToken = !!initialJoinToken;

      let p;
      if (!byToken) {
        p = plans.find(pl => String(pl.id) === targetId) || publicPlans.find(pl => String(pl.id) === targetId);
      }
      
      if (p && !byToken) {
        setViewingPlan(p);
        setIsViewing(true);
        if (onInitialPlanOpened) onInitialPlanOpened();
      } else {
        // Fetch from Vercel API to bypass RLS on plan_items for shared links
        const apiUrl = byToken
          ? `https://citymap.mx/api/shared-plan?share_token=${initialJoinToken}`
          : `https://citymap.mx/api/shared-plan?id=${initialPlanId}`;
        
        fetch(apiUrl)
          .then(res => res.json())
          .then(async res => {
          if (res && res[0]) {
            // Use async version to fetch businesses not in mapPins (shared link scenario)
            const planData = await parseDBPlanWithBiz(res[0]);
            if (byToken) {
              setEditingPlan(planData);
              setIsEditing(true);
            } else {
              setViewingPlan(planData);
              setIsViewing(true);
              setActiveTab('mis_planes');
            }
            if (onInitialPlanOpened) onInitialPlanOpened();
          } else {
            alert("No se pudo cargar el plan. Pide al creador que lo abra y use el botón \"Compartir\" antes de enviarte el link.");
            if (onInitialPlanOpened) onInitialPlanOpened();
          }
        }).catch(e => {
          console.error("Plan fetch error:", e);
          alert("Hubo un error al intentar abrir el plan.");
          if (onInitialPlanOpened) onInitialPlanOpened();
        });
      }
    }
  }, [initialPlanId, initialJoinToken, plans, publicPlans, viewingPlan, onInitialPlanOpened]);

  const savePlanLocal = (planData) => {
    // When PlanEditor calls onSave, it passes the fresh plan
    // We update local state, DB is already updated by PlanEditor
    let updated;
    if (editingPlan?.id && plans.some(p => p.id === editingPlan.id)) {
      updated = plans.map(p => p.id === editingPlan.id ? planData : p);
    } else {
      updated = [planData, ...plans];
    }
    setPlans(updated);
    setIsEditing(false);
    setEditingPlan(null);
    if (isViewing && viewingPlan?.id === planData.id) setViewingPlan(planData);
    
    // Refresh public plans if we just made one public
    if (user && planData.isPublic) {
      loadData();
    } else if (!user) {
      localStorage.setItem("cg_user_plans", JSON.stringify(updated));
    }
  };

  const deletePlanLocal = async (id) => {
    if (window.confirm("¿Seguro que deseas eliminar este plan?")) {
      const prevPlans = plans;
      const updated = plans.filter(p => p.id !== id);
      setPlans(updated);
      if (user) {
        try {
          await sb.del("plans", id);
          loadData();
        } catch (e) {
          console.error("Delete failed", e);
          alert("Error: No se pudo borrar el plan. Si el plan tiene lugares guardados, puede que la base de datos esté bloqueando la acción por falta de permisos 'Cascade'.");
          setPlans(prevPlans); // Revert
        }
      } else {
        localStorage.setItem("cg_user_plans", JSON.stringify(updated));
      }
    }
  };

  const toggleSavePlan = async (plan) => {
    if (!user) {
      alert("Inicia sesión para guardar planes de otros usuarios.");
      return;
    }

    if (plan.authorId === user.id) {
      return; // Can't save own plan
    }

    const isSaved = savedIds.includes(plan.id);
    
    // Optimistic update
    const newSavedIds = isSaved ? savedIds.filter(id => id !== plan.id) : [...savedIds, plan.id];
    setSavedIds(newSavedIds);

    // Update plans counts optimistically
    setPublicPlans(prev => prev.map(p => {
      if (p.id === plan.id) return { ...p, savesCount: p.savesCount + (isSaved ? -1 : 1) };
      return p;
    }));
    
    if (isSaved) {
      // Remove from Mis Planes
      setPlans(prev => prev.filter(p => p.id !== plan.id));
      await sb.delWhere2("plan_saves", "user_id", user.id, "plan_id", plan.id);
    } else {
      // Add to Mis Planes
      const savedPlan = { ...plan, savesCount: plan.savesCount + 1 };
      setPlans(prev => [...prev, savedPlan]);
      await sb.post("plan_saves", { user_id: user.id, plan_id: plan.id });
    }
  };

  const handleClonePlan = (plan) => {
    if (!user) {
      alert("Inicia sesión para guardar una copia de este plan.");
      return;
    }
    const clonedPlan = {
      ...plan,
      id: null,
      name: `${plan.name} (Copia)`,
      authorId: user.id,
      author: profile?.name || 'Yo',
      isPublic: false,
      visibility: 'private',
      savesCount: 0,
      share_token: ''
    };
    setIsViewing(false);
    setEditingPlan(clonedPlan);
    setIsEditing(true);
  };

  const openEditor = (plan = null) => { setEditingPlan(plan); setIsEditing(true); };
  const openViewer = (plan) => { setViewingPlan(plan); setIsViewing(true); };

  // Filter public plans
  const filteredDiscover = useMemo(() => {
    let filtered = publicPlans;
    if (searchQ) {
      filtered = filtered.filter(p => p.name.toLowerCase().includes(searchQ.toLowerCase()) || p.description?.toLowerCase().includes(searchQ.toLowerCase()));
    }
    
    // Add artificial badges just for UI flair based on sorts
    filtered = filtered.map((p, i) => {
      let badge = null;
      if (discoverFilter === "trending" && i < 3) badge = "trending";
      else if (discoverFilter === "top" && p.savesCount > 0) badge = "top";
      else if (discoverFilter === "new" && i < 3) badge = "new";
      return { ...p, badge };
    });

    if (discoverFilter === "top") {
      filtered.sort((a,b) => (b.savesCount || 0) - (a.savesCount || 0));
    } else if (discoverFilter === "new") {
      filtered.sort((a,b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    }
    
    return filtered;
  }, [publicPlans, discoverFilter, searchQ]);

  return (
    <div style={{ paddingBottom: 100, minHeight: "100vh", background: T.bg, fontFamily: "inherit" }}>

      {/* Header */}
      <div style={{ position: "sticky", top: 0, zIndex: 40, background: T.glassBg, backdropFilter: "blur(24px) saturate(180%)", WebkitBackdropFilter: "blur(24px) saturate(180%)", borderBottom: `1px solid ${T.glassBorder}` }}>
        <div style={{ padding: "calc(env(safe-area-inset-top, 0px) + 10px) 20px 8px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
          <img src="/citymap.mx.png" alt="CityMap" style={{ height: 58, objectFit: "contain", filter: dark ? "none" : "brightness(0)", marginBottom: -6 }} />
          <p style={{ fontSize: 13, color: T.sub, margin: 0, lineHeight: 1.2, marginTop: 4 }}>
            Crea, organiza y descubre experiencias increíbles en{" "}
            <span style={{ color: "#7C3AED", fontWeight: 800, fontSize: 15 }}>{cityName}</span>
          </p>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", padding: "8px 20px 12px", gap: 8 }}>
          {[{ id: "mis_planes", label: "📁 Mis Planes" }, { id: "descubrir", label: "🌍 Descubrir" }, { id: "guardados", label: "⭐ Guardados" }].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ flex: 1, padding: "10px 0", background: activeTab === tab.id ? T.text : "transparent", color: activeTab === tab.id ? T.bg : T.sub, border: `1px solid ${activeTab === tab.id ? T.text : T.border}`, borderRadius: 12, fontSize: 13, fontWeight: 700, cursor: "pointer", transition: "all 0.2s" }}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Beta Banner */}
      <div style={{ padding: "20px 20px 10px", display: "flex", justifyContent: "center" }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', maxWidth: 320, gap: 4 }}>
          <div style={{ fontSize: 28, margin: "2px 0 6px" }}>🚧</div>
          <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: T.text }}>Sección en construcción</h4>
          <p style={{ margin: 0, fontSize: 13, color: T.sub, lineHeight: 1.4 }}>Tus planes se guardarán con normalidad mientras pulimos detalles y añadimos más funciones.</p>
        </div>
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {activeTab === "mis_planes" ? (
          <motion.div key="mis" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} style={{ padding: "20px 20px" }}>



            {plans.length > 0 ? (
              <>
                <button className="press" onClick={() => openEditor()} style={{ width: "100%", padding: "14px 0", background: "#7C3AED", color: "#fff", border: "none", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 15, fontWeight: 800, cursor: "pointer", marginBottom: 24, boxShadow: "0 8px 20px rgba(124,58,237,0.3)" }}>
                  ✨ Crear plan o Experiencia
                </button>

                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {plans.map(p => {
                    const isMine = !user || p.authorId === user.id;

                    return (
                      <div key={p.id} className="press" onClick={() => openViewer(p)} style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: 16, overflow: "hidden", cursor: "pointer", boxShadow: "0 2px 10px rgba(0,0,0,0.03)" }}>
                        {p.coverUrl && <div style={{ width: "100%", height: 100, backgroundImage: `url(${p.coverUrl})`, backgroundSize: "cover", backgroundPosition: "center" }} />}
                        <div style={{ padding: 16, display: "flex", gap: 12 }}>
                          <div style={{ width: 48, height: 48, borderRadius: 12, background: dark ? "rgba(255,255,255,0.05)" : "#F3F4F6", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, flexShrink: 0 }}>
                            {p.emoji}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: T.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</h3>
                              {isMine ? (
                                <button onClick={e => { e.stopPropagation(); deletePlanLocal(p.id); }} style={{ background: "none", border: "none", color: T.sub, padding: 4, cursor: "pointer", flexShrink: 0 }}>
                                  <Icon name="trash" size={16} />
                                </button>
                              ) : (
                                <button onClick={e => { e.stopPropagation(); toggleSavePlan(p); }} style={{ background: "none", border: "none", color: "#7C3AED", padding: 4, cursor: "pointer", flexShrink: 0 }}>
                                  <Icon name="bookmark-filled" size={18} />
                                </button>
                              )}
                            </div>
                            {p.description && <p style={{ margin: "0 0 8px", fontSize: 13, color: T.sub, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{p.description}</p>}
                            <div style={{ fontSize: 12, color: T.sub, fontWeight: 600 }}>
                              📍 {p.places.length} lugar{p.places.length !== 1 ? "es" : ""} • {p.isPublic ? "🌍 Público" : (isMine ? "🔒 Privado" : `👤 de @${p.author}`)}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              /* EMPTY STATE */
              <>
                {/* Illustration */}
                <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>
                  <MapIllustration />
                </div>

                {/* Text */}
                <div style={{ textAlign: "center", marginBottom: 28 }}>
                  <h2 style={{ margin: "0 0 12px", fontSize: 24, fontWeight: 900, color: T.text, lineHeight: 1.2 }}>
                    Tu próxima aventura<br />
                    <span style={{ color: "#7C3AED" }}>comienza aquí.</span>
                  </h2>
                  <p style={{ margin: 0, fontSize: 15, color: T.sub, lineHeight: 1.6, maxWidth: 280, marginLeft: "auto", marginRight: "auto" }}>
                    Crea rutas gastronómicas, citas, recorridos turísticos, planes familiares o salidas con amigos.
                  </p>
                </div>

                {/* CTA */}
                <button className="press" onClick={() => openEditor()} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, width: "100%", padding: "16px 0", background: dark ? "#fff" : "#111827", color: dark ? "#111" : "#fff", border: "none", borderRadius: 16, fontSize: 16, fontWeight: 800, cursor: "pointer", marginBottom: 36, boxShadow: "0 8px 24px rgba(0,0,0,0.15)" }}>
                  ✨ Crear mi primer plan o Experiencia
                </button>

                {/* Ideas Grid Minimalista */}
                <div>
                  <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 700, color: T.text }}>¿No sabes por dónde empezar?</h3>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    {PLAN_IDEAS.map(idea => (
                      <button 
                        key={idea.label} 
                        onClick={() => openEditor({ name: idea.label, emoji: idea.emoji })} 
                        className="press" 
                        style={{ 
                          background: T.white, 
                          border: `1px solid ${T.border}`, 
                          borderRadius: 12, 
                          padding: "12px 14px", 
                          display: "flex", 
                          alignItems: "center", 
                          gap: 12, 
                          cursor: "pointer",
                          boxShadow: "0 1px 2px rgba(0,0,0,0.02)"
                        }}
                      >
                        <span style={{ fontSize: 20 }}>{idea.emoji}</span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: T.text, textAlign: "left", lineHeight: 1.2 }}>{idea.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </motion.div>
        ) : activeTab === "descubrir" ? (
          <motion.div key="descubrir" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} style={{ padding: "16px 20px" }}>



            {/* Search */}
            <div style={{ position: "relative", display: "flex", gap: 10, marginBottom: 14 }}>
              <div style={{ flex: 1, position: "relative" }}>
                <div style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: T.sub }}>
                  <Icon name="search" size={17} />
                </div>
                <input type="text" placeholder="Buscar planes..." value={searchQ} onChange={e => setSearchQ(e.target.value)} style={{ width: "100%", padding: "12px 14px 12px 38px", background: T.white, border: `1px solid ${T.border}`, borderRadius: 12, fontSize: 14, color: T.text, outline: "none", boxSizing: "border-box" }} />
              </div>
              <button style={{ padding: "0 16px", background: T.white, border: `1px solid ${T.border}`, borderRadius: 12, display: "flex", alignItems: "center", gap: 6, fontSize: 14, fontWeight: 700, color: T.text, cursor: "pointer", whiteSpace: "nowrap" }}>
                <Icon name="sliders" size={15} /> Filtros
              </button>
            </div>

            {/* Filter Chips */}
            <div style={{ display: "flex", gap: 8, marginBottom: 20, overflowX: "auto", paddingBottom: 4 }}>
              {DISCOVER_FILTERS.map(f => (
                <button key={f.id} onClick={() => setDiscoverFilter(f.id)} style={{ padding: "8px 16px", background: discoverFilter === f.id ? "#7C3AED" : T.white, color: discoverFilter === f.id ? "#fff" : T.sub, border: `1px solid ${discoverFilter === f.id ? "#7C3AED" : T.border}`, borderRadius: 20, fontSize: 13, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0, transition: "all 0.2s" }}>
                  {f.label}
                </button>
              ))}
            </div>

            {/* Plan Cards */}
            {loading ? (
              <div style={{ padding: 40, textAlign: "center", color: T.sub }}>Cargando planes...</div>
            ) : filteredDiscover.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {filteredDiscover.map(p => {
                  const isSaved = savedIds.includes(p.id);
                  const isMine = user && p.authorId === user.id;

                  return (
                    <PlanCard3Photos 
                      key={p.id} 
                      plan={p} 
                      onClick={() => openViewer(p)} 
                      isSaved={isSaved}
                      isMine={isMine}
                      onToggleSave={() => toggleSavePlan(p)}
                      T={T}
                      dark={dark}
                    />
                  );
                })}
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: "60px 20px", color: T.sub }}>
                <span style={{ fontSize: 48 }}>🌍</span>
                <h3 style={{ marginTop: 16, fontWeight: 800, color: T.text }}>
                  {searchQ ? "No hay resultados" : "Aún no hay planes públicos"}
                </h3>
                <p style={{ fontSize: 14, lineHeight: 1.6 }}>
                  {searchQ ? "Intenta buscando con otras palabras." : `Sé el primero en compartir un plan en ${cityName}.`}
                </p>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div key="guardados" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} style={{ paddingTop: 0 }}>
             <FavsView hideHeader={true} navigate={navigate} />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isViewing && (
          <PlanViewer 
            plan={viewingPlan} 
            T={T} 
            dark={dark} 
            onClose={() => { setIsViewing(false); setViewingPlan(null); }} 
            onEdit={(p) => { setIsViewing(false); openEditor(p); }}
            onClone={handleClonePlan}
            isMine={!!user && viewingPlan?.authorId === user.id}
            user={user}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isEditing && (
          <PlanEditor 
            T={T} 
            dark={dark} 
            mapPins={mapPins} 
            initialPlan={editingPlan} 
            onClose={() => setIsEditing(false)} 
            onSave={savePlanLocal} 
            user={user}
            activeCity={activeCity}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

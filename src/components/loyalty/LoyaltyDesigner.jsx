import React, { useState, useEffect } from 'react';
import Icon from '../ui/Icon.jsx';
import { sb } from '../../lib/supabase.js';
import LoyaltyWizard from './LoyaltyWizard.jsx';

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 700);
  useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth < 700);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);
  return isMobile;
}

export default function LoyaltyDesigner({ business, onClose, T }) {
  const isMobile = useIsMobile();
  const [showPreview, setShowPreview] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [config, setConfig] = useState({
    type: "stamps",
    primary_color: "#000000",
    bg_color: "#ffffff",
    text_color: "#000000",
    reward_text: "Un café gratis",
    stamps_required: 5,
    logo_url: business?.logo_url || business?.img1 || null
  });

  const [activeTab, setActiveTab] = useState("design");
  const [isEditing, setIsEditing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [wizardStep, setWizardStep] = useState(0); // 0 = templates, 1 = customize, 2 = done (goes to full editor)
  const STAMPS = Array.from({ length: 10 });

  const TEMPLATES = [
    { id: "cafe", emoji: "☕", label: "Cafetería", bg_color: "#1B1107", text_color: "#F5E6D3", primary_color: "#C4841D", type: "stamps|coffee", reward_text: "Un café gratis", stamps_required: 8 },
    { id: "restaurant", emoji: "🍕", label: "Restaurante", bg_color: "#1A1A2E", text_color: "#EAEAEA", primary_color: "#E94560", type: "stamps|pizza", reward_text: "Un plato gratis", stamps_required: 10 },
    { id: "bakery", emoji: "🧁", label: "Panadería", bg_color: "#FDF2F8", text_color: "#831843", primary_color: "#EC4899", type: "stamps|heart_overlay", reward_text: "Pan dulce gratis", stamps_required: 6 },
    { id: "barber", emoji: "💈", label: "Barbería", bg_color: "#0F172A", text_color: "#F8FAFC", primary_color: "#3B82F6", type: "stamps|star", reward_text: "Un corte gratis", stamps_required: 5 },
    { id: "tienda", emoji: "🛍️", label: "Tienda", bg_color: "#FFFFFF", text_color: "#1E293B", primary_color: "#10B981", type: "stamps|shopping-bag", reward_text: "10% de descuento", stamps_required: 8 },
    { id: "gym", emoji: "💪", label: "Gym / Fitness", bg_color: "#18181B", text_color: "#FAFAFA", primary_color: "#F59E0B", type: "stamps|check_sq", reward_text: "Clase gratis", stamps_required: 10 },
  ];

  // Cargar config existente
  useEffect(() => {
    async function load() {
      if (!business?.id) return;
      try {
        const data = await sb.get("loyalty_cards", `?biz_id=eq.${business.id}&limit=1`);
        if (data && data.length > 0) {
          const card = data[0];
          setConfig({
            id: card.id, // guardamos el ID para hacer patch después
            type: card.type || "stamps",
            primary_color: card.primary_color || "#000000",
            bg_color: card.bg_color || "#ffffff",
            text_color: card.text_color || "#000000",
            reward_text: card.reward_text || "Un café gratis",
            stamps_required: card.stamps_required || 5,
            logo_url: card.logo_url || business.logo_url || business.img1 || null
          });
          setIsEditing(false); // Hay tarjeta, mostrar el dashboard
        } else {
          setIsEditing(true); // No hay tarjeta, mostrar editor
        }
      } catch (e) {
        console.error(e);
        setIsEditing(true);
      }
      setLoading(false);
    }
    load();
  }, [business?.id, business?.img1, business?.logo_url]);

  // Guardar config
  const handleSave = async () => {
    if (!business?.id) return;
    setSaving(true);
    
    const payload = {
      biz_id: business.id,
      type: config.type,
      primary_color: config.primary_color,
      bg_color: config.bg_color,
      text_color: config.text_color,
      reward_text: config.reward_text,
      stamps_required: config.stamps_required,
      logo_url: config.logo_url,
      active: true
    };

    try {
      if (config.id) {
        await sb.patch("loyalty_cards", config.id, payload);
      } else {
        const res = await sb.post("loyalty_cards", payload);
        if (res && res[0]) setConfig(prev => ({ ...prev, id: res[0].id }));
      }
      alert("¡Tarjeta configurada correctamente!");
      onClose();
    } catch (e) {
      alert("Error al guardar: " + e.message);
    }
    setSaving(false);
  };

  const handleDeleteProgram = async () => {
    if (!config.id) return;
    if (!confirm("¿Estás seguro de que quieres borrar el programa de lealtad? Todos tus clientes perderán sus sellos. Esta acción NO se puede deshacer.")) return;
    setSaving(true);
    try {
      await sb.delWhere("loyalty_stamps_log", "biz_id", business.id);
      await sb.delWhere("loyalty_members", "biz_id", business.id);
      await sb.del("loyalty_cards", config.id);
      alert("Programa de lealtad borrado correctamente.");
      onClose();
    } catch(e) {
      alert("Error al borrar: " + e.message);
      setSaving(false);
    }
  };
  const [members, setMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [stampingId, setStampingId] = useState(null);
  const [stats, setStats] = useState({ totalMembers: 0, totalStamps: 0 });

  const loadMembers = async () => {
    if (!business?.id) return;
    setMembersLoading(true);
    try {
      const data = await sb.get("loyalty_members", `?biz_id=eq.${business.id}&order=last_stamp_at.desc.nullslast&limit=200`);
      if (data) {
        // Remove duplicates on the frontend to keep the list clean
        const seen = new Set();
        const unique = [];
        let totalStamps = 0;
        data.forEach(m => {
          if (!seen.has(m.user_id)) {
            seen.add(m.user_id);
            unique.push(m);
            totalStamps += m.stamps || 0;
          } else {
            // Delete duplicates silently to clean DB over time
            sb.del("loyalty_members", m.id).catch(()=>{});
          }
        });
        setMembers(unique);
        setStats({ totalMembers: unique.length, totalStamps });
      }
    } catch(e) { console.error(e); }
    setMembersLoading(false);
  };

  // Cargar clientes automáticamente si estamos en el dashboard
  useEffect(() => {
    if (!isEditing && config.id) {
      loadMembers();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing, config.id]);

  const giveStamp = async (memberId, currentStamps, stampsRequired) => {
    setStampingId(memberId);
    
    // Si ya completó la tarjeta, la acción es canjear (redeem)
    const isRedeeming = currentStamps >= stampsRequired;
    const newStamps = isRedeeming ? 0 : currentStamps + 1;
    const action = isRedeeming ? "redeem" : "stamp";

    try {
      await sb.patch("loyalty_members", memberId, {
        stamps: newStamps,
        last_stamp_at: new Date().toISOString()
      });
      await sb.post("loyalty_stamps_log", {
        member_id: memberId,
        biz_id: business.id,
        action: action,
        amount: 1
      });
      
      fetch("/api/wallet-update", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ member_id: memberId, stamps: newStamps, stamps_required: stampsRequired })
      }).catch(e => console.error(e));

      setMembers(prev => prev.map(m => m.id === memberId ? {...m, stamps: newStamps, last_stamp_at: new Date().toISOString()} : m));
      
      // Update stats correctly
      if (isRedeeming) {
        setStats(s => ({ ...s, totalStamps: s.totalStamps - currentStamps }));
        alert("🎉 ¡Premio entregado! La tarjeta se reinició.");
      } else {
        setStats(s => ({ ...s, totalStamps: s.totalStamps + 1 }));
        if (newStamps >= stampsRequired) {
          alert("🎉 ¡Felicidades! El cliente ha completado todos los sellos y ya puede canjear su premio.");
        }
      }
    } catch(e) { alert("Error: " + e.message); }
    setStampingId(null);
  };

  const removeStamp = async (memberId, currentStamps, stampsRequired) => {
    if (currentStamps === 0) return;
    setStampingId(memberId);
    const newStamps = currentStamps - 1;
    try {
      await sb.patch("loyalty_members", memberId, { stamps: newStamps });
      
      fetch("/api/wallet-update", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ member_id: memberId, stamps: newStamps, stamps_required: stampsRequired })
      }).catch(e => console.error(e));

      setMembers(prev => prev.map(m => m.id === memberId ? {...m, stamps: newStamps} : m));
      setStats(s => ({ ...s, totalStamps: s.totalStamps - 1 }));
    } catch(e) { alert("Error: " + e.message); }
    setStampingId(null);
  };

  const deleteMember = async (memberId) => {
    if (!confirm("¿Eliminar este cliente del programa? Perderá todos sus sellos y beneficios activos.")) return;
    setStampingId(memberId);
    try {
      await sb.del("loyalty_members", memberId);
      setMembers(prev => prev.filter(m => m.id !== memberId));
      setStats(s => ({ ...s, totalMembers: s.totalMembers - 1 }));
    } catch(e) { alert("Error al eliminar: " + e.message); }
    setStampingId(null);
  };

  const cleanSlug = (() => {
    const raw = business?.slug || business?.id || '';
    const city = business?.city_slug || '';
    if (city && raw.startsWith(city + '-')) return raw.slice(city.length + 1);
    return raw;
  })();
  const loyaltyUrl = `https://citymap.mx/lealtad/${cleanSlug}`;

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(loyaltyUrl)}&bgcolor=ffffff&color=000000&qzone=1&format=png`;

  return (
    <div style={{ position: "fixed", inset: 0, background: T.bg, zIndex: 10000, display: "flex", flexDirection: "column", animation: "fadeUp .3s ease" }}>

      {/* HEADER */}
      <div style={{ padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `1px solid ${T.border}`, background: T.bg, gap: 10, flexShrink: 0 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={{ margin: 0, fontSize: isMobile ? 15 : 18, fontWeight: 800, color: T.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>Tarjetas de Lealtad</h2>
          {!isMobile && <p style={{ margin: 0, fontSize: 13, color: T.sub }}>Diseña el pase digital de tu negocio</p>}
        </div>
        <button onClick={onClose} style={{ width: 34, height: 34, borderRadius: "50%", background: T.border, color: T.text, border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
          <Icon name="x" size={15} />
        </button>
      </div>

      {/* CONDITIONAL BODY: Dashboard vs Editing */}
      {!isEditing && config.id ? (
        <div style={{ flex: 1, overflowY: "auto", padding: isMobile ? 16 : 32, background: T.bg }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, gap: 12 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: T.text }}>Tus Clientes Activos</h3>
              <div style={{ fontSize: 13, color: T.sub, marginTop: 4 }}>Administra y sella sus tarjetas</div>
            </div>
            <button onClick={() => setIsEditing(true)} style={{ padding: "8px 14px", background: T.border, color: T.text, borderRadius: 10, border: "none", fontWeight: 700, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
              <Icon name="edit" size={14} color={T.text} /> Diseño
            </button>
          </div>

          <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
            <div style={{ flex: 1, background: "#F8FAFC", borderRadius: 14, padding: "12px 16px", border: "1px solid #E2E8F0" }}>
              <div style={{ fontSize: 12, color: "#64748B", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>Inscritos</div>
              <div style={{ fontSize: 24, fontWeight: 900, color: "#0F172A", marginTop: 4 }}>{stats.totalMembers}</div>
            </div>
            <div style={{ flex: 1, background: "#F8FAFC", borderRadius: 14, padding: "12px 16px", border: "1px solid #E2E8F0" }}>
              <div style={{ fontSize: 12, color: "#64748B", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>Sellos actuales</div>
              <div style={{ fontSize: 24, fontWeight: 900, color: "#0F172A", marginTop: 4 }}>{stats.totalStamps}</div>
            </div>
          </div>


          <div style={{ position: "relative", marginBottom: 16 }}>
            <div style={{ position: "absolute", left: 14, top: 13 }}><Icon name="search" size={18} color={T.sub} /></div>
            <input type="text" placeholder="Buscar por nombre o email..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} style={{ width: "100%", padding: "13px 13px 13px 40px", boxSizing: "border-box", borderRadius: 12, border: `1px solid ${T.border}`, background: T.surface || T.bg, color: T.text, outline: "none", fontSize: 14, fontWeight: 500 }} />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: T.sub, textTransform: "uppercase", letterSpacing: 0.5 }}>Lista de clientes</span>
              <button onClick={loadMembers} style={{ background: "none", border: "none", color: T.text, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>↻ Actualizar</button>
            </div>
            {membersLoading ? (
              <div style={{ textAlign: "center", padding: 32, color: T.sub, fontSize: 13 }}>Cargando...</div>
            ) : members.length === 0 ? (
              <div style={{ textAlign: "center", padding: 32, color: T.sub, fontSize: 13 }}>Aún no hay clientes inscritos.<br />Abre el código QR para que se unan.</div>
            ) : (
              members.filter(m => (m.name||"").toLowerCase().includes(searchQuery.toLowerCase()) || (m.email||"").toLowerCase().includes(searchQuery.toLowerCase())).map(m => {
                const isCompleted = m.stamps >= config.stamps_required;
                const isStamping = stampingId === m.id;
                
                return (
                  <div key={m.id} style={{ display: "flex", flexDirection: "column", padding: "12px 14px", borderRadius: 14, border: `1px solid ${T.border}`, background: T.bg, gap: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: T.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {m.name || m.email || "Cliente"}
                        </div>
                        <div style={{ fontSize: 12, color: isCompleted ? "#F59E0B" : T.sub, marginTop: 4, fontWeight: isCompleted ? 700 : 500 }}>
                          {m.stamps} / {config.stamps_required} sellos
                          {m.last_stamp_at ? ` · ${new Date(m.last_stamp_at).toLocaleDateString("es-MX", {day:"numeric",month:"short"})}` : ""}
                        </div>
                      </div>
                      
                      <button onClick={() => deleteMember(m.id)} disabled={isStamping} style={{ background: "none", border: "none", color: "#EF4444", padding: 8, cursor: "pointer", opacity: isStamping ? 0.3 : 1 }}>
                        <Icon name="trash" size={16} />
                      </button>
                    </div>

                    <div style={{ display: "flex", gap: 8 }}>
                      {m.stamps > 0 && !isCompleted && (
                        <button 
                          onClick={() => removeStamp(m.id, m.stamps, config.stamps_required)} 
                          disabled={isStamping}
                          style={{ width: 44, background: T.border, color: T.text, border: "none", borderRadius: 10, fontWeight: 800, fontSize: 16, cursor: "pointer", opacity: isStamping ? 0.5 : 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          -
                        </button>
                      )}
                      
                      <button
                        onClick={() => giveStamp(m.id, m.stamps, config.stamps_required)}
                        disabled={isStamping}
                        style={{ flex: 1, padding: "10px 16px", background: isCompleted ? "#F59E0B" : "#000", color: isCompleted ? "#fff" : "#fff", border: "none", borderRadius: 10, fontWeight: 800, fontSize: 13, cursor: "pointer", opacity: isStamping ? 0.5 : 1, boxShadow: isCompleted ? "0 4px 12px rgba(245, 158, 11, 0.3)" : "0 4px 12px rgba(0,0,0,0.15)" }}>
                        {isStamping ? "Procesando..." : (isCompleted ? "🏆 Canjear Premio" : "+ Sello")}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
            {members.length > 0 && members.filter(m => (m.name||"").toLowerCase().includes(searchQuery.toLowerCase()) || (m.email||"").toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
              <div style={{ textAlign: "center", padding: 32, color: T.sub, fontSize: 13 }}>No se encontraron resultados</div>
            )}
          </div>
        </div>
      ) : !config.id && wizardStep < 3 ? (
        <LoyaltyWizard 
          wizardStep={wizardStep}
          setWizardStep={setWizardStep}
          config={config}
          setConfig={setConfig}
          business={business}
          isMobile={isMobile}
          handleSave={handleSave}
          saving={saving}
        />
      ) : (
        <div style={{ display: "flex", flex: 1, overflow: isMobile ? "auto" : "hidden", flexDirection: isMobile ? "column" : "row" }}>
        
        {/* PREVIEW CONTAINER - Shown first on mobile via order */}
        <div style={{ 
          flex: isMobile ? "none" : 1, 
          padding: isMobile ? "16px 16px 0 16px" : "24px", 
          background: "#F4F7F9", 
          display: "flex", 
          flexDirection: "column", 
          alignItems: "center",
          order: isMobile ? 1 : 2,
          overflowY: isMobile ? "visible" : "auto",
          minHeight: isMobile ? 380 : "auto"
        }}>
          {/* Tarjeta de Lealtad Preview */}
          <div style={{ 
            width: "100%", 
            maxWidth: 280, 
            background: config.bg_color, 
            borderRadius: 24, 
            boxShadow: "0 12px 32px rgba(0,0,0,0.1)", 
            overflow: "hidden",
            transition: "all 0.3s ease",
            transform: isMobile ? "scale(0.85)" : "scale(0.9)",
            transformOrigin: "top center"
          }}>
            {/* Header - Logo y nombre */}
            <div style={{ padding: "30px 16px 16px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
              {config.logo_url ? (
                <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#fff", padding: 4, marginBottom: 12, boxShadow: "0 8px 16px rgba(0,0,0,0.1)" }}>
                  <img src={config.logo_url} alt="Logo" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} />
                </div>
              ) : (
                <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
                  <Icon name="image" size={28} color={config.text_color} />
                </div>
              )}
              <div style={{ fontSize: 18, fontWeight: 800, color: config.text_color, letterSpacing: "-0.5px" }}>
                {business?.name || "Tu Negocio"}
              </div>
            </div>

            {/* Contenido según tipo */}
            <div style={{ padding: "16px" }}>
              {config.type?.split('|')[0] === "stamps" && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center" }}>
                  {STAMPS.slice(0, config.stamps_required).map((_, i) => (
                    <div key={i} style={{ width: 38, height: 38, borderRadius: "50%", background: i < 2 ? config.primary_color : "transparent", border: `2px solid ${config.primary_color}`, display: "flex", alignItems: "center", justifyContent: "center", opacity: i < 2 ? 1 : 0.4 }}>
                      {i < 2 && <Icon name={config.type?.includes('|') ? config.type.split('|')[1] : "star"} size={18} color={config.bg_color} />}
                    </div>
                  ))}
                </div>
              )}

              {config.type === "points" && (
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 11, color: config.text_color, opacity: 0.7, textTransform: "uppercase", fontWeight: 800, letterSpacing: 1 }}>Puntos Acumulados</div>
                  <div style={{ fontSize: 42, fontWeight: 900, color: config.text_color, marginTop: 4 }}>350</div>
                </div>
              )}

              {config.type === "cashback" && (
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 11, color: config.text_color, opacity: 0.7, textTransform: "uppercase", fontWeight: 800, letterSpacing: 1 }}>Saldo Disponible</div>
                  <div style={{ fontSize: 42, fontWeight: 900, color: config.text_color, marginTop: 4 }}>$124</div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{ padding: "8px 20px 24px", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
              <div>
                <div style={{ fontSize: 9, color: config.text_color, opacity: 0.6, textTransform: "uppercase", fontWeight: 800, letterSpacing: 1, marginBottom: 4 }}>Titular</div>
                <div style={{ fontSize: 13, color: config.text_color, fontWeight: 700 }}>Juan Pérez</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 9, color: config.text_color, opacity: 0.6, textTransform: "uppercase", fontWeight: 800, letterSpacing: 1, marginBottom: 4 }}>Premio</div>
                <div style={{ fontSize: 13, color: config.text_color, fontWeight: 800, maxWidth: 120, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{config.reward_text || "—"}</div>
              </div>
            </div>

            {/* QR Area */}
            <div style={{ padding: "20px", background: "#fff", display: "flex", justifyContent: "center", borderTop: "1px dashed rgba(0,0,0,0.1)" }}>
              <div style={{ width: 120, height: 120, background: `url('https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=preview_qr') center/cover`, borderRadius: 12 }}></div>
            </div>
          </div>

          <div style={{ marginTop: isMobile ? -10 : 0, display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", background: "rgba(0,0,0,0.5)", borderRadius: 100, color: "#fff", fontSize: 12, fontWeight: 700 }}>
            <span style={{ color: "#F5A623" }}>✨</span> Previsualización en vivo
          </div>
        </div>

        {/* LEFT COLUMN: CONTROLS */}
        <div style={{ 
          width: isMobile ? "100%" : 340,
          display: "flex",
          flexDirection: "column",
          borderRight: isMobile ? "none" : `1px solid ${T.border}`,
          overflowY: isMobile ? "visible" : "auto",
          background: T.bg,
          order: isMobile ? 2 : 1,
          flexShrink: 0
        }}>
          
          <div style={{ display: "flex", borderBottom: `1px solid ${T.border}`, overflowX: "auto" }}>
            {["design","rules","qr","clientes"].map(tab => (
              <button key={tab} onClick={() => { setActiveTab(tab); if(tab==="clientes") loadMembers(); }}
                style={{ flex: 1, padding: "12px 8px", background: "transparent", border: "none", borderBottom: `2px solid ${activeTab === tab ? T.text : "transparent"}`, fontWeight: 700, fontSize: 12, color: activeTab === tab ? T.text : T.sub, cursor: "pointer", whiteSpace: "nowrap" }}>
                {tab === "design" ? "Diseño" : tab === "rules" ? "Reglas" : tab === "qr" ? "QR Mostrador" : "Clientes"}
              </button>
            ))}
          </div>

          <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 32 }}>
            
            {activeTab === "design" && (
              <>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 800, color: T.sub, marginBottom: 16, textTransform: "uppercase", letterSpacing: 0.5, textAlign: "center" }}>Colores</label>
                  <div style={{ display: "flex", gap: 16, justifyContent: "space-between" }}>
                    
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                      <div style={{ position: "relative", width: 48, height: 48, borderRadius: "50%", background: config.bg_color, border: `2px solid ${T.border}`, boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
  <input type="color" value={config.bg_color} onChange={e => setConfig({...config, bg_color: e.target.value})} style={{ opacity: 0, position: "absolute", inset: 0, width: "100%", height: "100%", cursor: "pointer" }} />
                      </div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: T.text }}>Fondo</div>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                      <div style={{ position: "relative", width: 48, height: 48, borderRadius: "50%", background: config.text_color, border: `2px solid ${T.border}`, boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
                        <input type="color" value={config.text_color} onChange={e => setConfig({...config, text_color: e.target.value})} style={{ opacity: 0, position: "absolute", inset: 0, width: "100%", height: "100%", cursor: "pointer" }} />
                      </div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: T.text }}>Texto</div>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                      <div style={{ position: "relative", width: 48, height: 48, borderRadius: "50%", background: config.primary_color, border: `2px solid ${T.border}`, boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
                        <input type="color" value={config.primary_color} onChange={e => setConfig({...config, primary_color: e.target.value})} style={{ opacity: 0, position: "absolute", inset: 0, width: "100%", height: "100%", cursor: "pointer" }} />
                      </div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: T.text }}>Botón / Sello</div>
                    </div>

                  </div>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 800, color: T.sub, marginBottom: 12, textTransform: "uppercase", letterSpacing: 0.5, textAlign: "center" }}>Icono del sello</label>
                  <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
                    {[
                      { id: "star", name: "Estrella" },
                      { id: "coffee", name: "Café" },
                      { id: "pizza", name: "Pizza" },
                      { id: "heart_overlay", name: "Corazón" },
                      { id: "gift", name: "Regalo" },
                      { id: "shopping-bag", name: "Bolsa" },
                      { id: "ticket", name: "Boleto" },
                      { id: "check_sq", name: "Palomita" }
                    ].map(icon => {
                      const currentIcon = config.type?.includes('|') ? config.type.split('|')[1] : "star";
                      const isSelected = currentIcon === icon.id;
                      return (
                        <button key={icon.id} onClick={() => {
                          const baseType = config.type?.includes('|') ? config.type.split('|')[0] : config.type || "stamps";
                          setConfig({...config, type: `${baseType}|${icon.id}`});
                        }} style={{ width: 44, height: 44, borderRadius: 12, background: isSelected ? T.text : "transparent", border: `2px solid ${isSelected ? T.text : T.border}`, color: isSelected ? T.bg : T.text, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "all 0.2s" }} title={icon.name}>
                          <Icon name={icon.id} size={20} color={isSelected ? T.bg : T.text} />
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 800, color: T.sub, marginBottom: 12, textTransform: "uppercase", letterSpacing: 0.5, textAlign: "center" }}>Logo</label>
                  <div style={{ padding: 24, border: `2px dashed ${T.border}`, borderRadius: 16, textAlign: "center", cursor: "pointer", background: "rgba(0,0,0,0.02)" }}>
                    {config.logo_url ? (
                      <img src={config.logo_url} alt="Logo" style={{ width: 64, height: 64, borderRadius: "50%", objectFit: "cover", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }} />
                    ) : (
                      <span style={{ fontSize: 13, color: T.sub, fontWeight: 600 }}>Subir Logo (PNG Transparente)</span>
                    )}
                  </div>
                </div>
              </>
            )}

            {activeTab === "rules" && (
              <>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: T.sub, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>Tipo de Tarjeta</label>
                  <select value={config.type?.split('|')[0] || "stamps"} onChange={e => {
                    const currentIcon = config.type?.includes('|') ? config.type.split('|')[1] : "star";
                    setConfig({...config, type: e.target.value === 'stamps' ? `${e.target.value}|${currentIcon}` : e.target.value});
                  }} style={{ width: "100%", padding: "14px", borderRadius: 12, border: `1px solid ${T.border}`, background: T.bg, color: T.text, fontSize: 14, outline: "none", fontWeight: 600 }}>
                    <option value="stamps">Sellos por visita</option>
                    <option value="points">Acumulación de Puntos</option>
                    <option value="cashback">Cashback de saldo</option>
                  </select>
                </div>

                {config.type?.split('|')[0] === "stamps" && (
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: T.sub, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>Meta de sellos</label>
                    <input type="number" min="2" max="10" value={config.stamps_required} onChange={e => setConfig({...config, stamps_required: Number(e.target.value)})} style={{ width: "100%", boxSizing: "border-box", padding: "14px", borderRadius: 12, border: `1px solid ${T.border}`, background: T.bg, color: T.text, fontSize: 14, outline: "none", fontWeight: 600 }} />
                  </div>
                )}

                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: T.sub, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>Premio o Recompensa</label>
                  <input type="text" value={config.reward_text} onChange={e => setConfig({...config, reward_text: e.target.value})} placeholder="Ej. Un café gratis" style={{ width: "100%", boxSizing: "border-box", padding: "14px", borderRadius: 12, border: `1px solid ${T.border}`, background: T.bg, color: T.text, fontSize: 14, outline: "none", fontWeight: 600 }} />
                </div>
              </>
            )}

            {activeTab === "qr" && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 24, textAlign: "center" }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>
                  QR para el mostrador
                </div>
                <p style={{ margin: 0, fontSize: 13, color: T.sub, lineHeight: 1.5 }}>
                  Imprime o muestra este código en tu negocio. Los clientes lo escanean para unirse a tu programa de lealtad.
                </p>
                {config.id ? (
                  <>
                    <div style={{ background: "#fff", padding: 16, borderRadius: 20, boxShadow: "0 8px 24px rgba(0,0,0,0.1)" }}>
                      <img src={qrUrl} alt="QR Código" style={{ width: 220, height: 220, display: "block" }} />
                    </div>
                    <div style={{ background: T.surface || T.border, borderRadius: 12, padding: "10px 16px", fontSize: 11, color: T.sub, wordBreak: "break-all" }}>
                      {loyaltyUrl}
                    </div>
                    <a href={qrUrl} download="qr-lealtad.png" style={{ width: "100%", padding: 14, background: "#000", color: "#fff", borderRadius: 12, fontWeight: 700, fontSize: 14, textDecoration: "none", display: "block", textAlign: "center" }}>
                      ⬇ Descargar QR
                    </a>
                  </>
                ) : (
                  <div style={{ padding: 24, color: T.sub, fontSize: 13 }}>
                    Primero activa la tarjeta (tab Diseño → Activar Tarjeta).
                  </div>
                )}
              </div>
            )}

            {activeTab === "clientes" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>Clientes inscritos</div>
                  <button onClick={loadMembers} style={{ padding: "6px 12px", border: `1px solid ${T.border}`, borderRadius: 8, background: "transparent", color: T.text, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                    ↻ Actualizar
                  </button>
                </div>

                {membersLoading ? (
                  <div style={{ textAlign: "center", padding: 32, color: T.sub, fontSize: 13 }}>Cargando...</div>
                ) : members.length === 0 ? (
                  <div style={{ textAlign: "center", padding: 32, color: T.sub, fontSize: 13 }}>
                    Aún no hay clientes inscritos.<br />Comparte el QR del tab anterior.
                  </div>
                ) : members.map(m => (
                  <div key={m.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderRadius: 14, border: `1px solid ${T.border}`, background: T.bg, gap: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: T.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {m.name || m.email || "Cliente"}
                      </div>
                      <div style={{ fontSize: 12, color: T.sub, marginTop: 2 }}>
                        {m.stamps} / {config.stamps_required} sellos
                        {m.last_stamp_at ? ` · ${new Date(m.last_stamp_at).toLocaleDateString("es-MX", {day:"numeric",month:"short"})}` : ""}
                      </div>
                    </div>
                    <button
                      onClick={() => giveStamp(m.id, m.stamps, config.stamps_required)}
                      disabled={stampingId === m.id}
                      style={{ padding: "8px 14px", background: "#000", color: "#fff", border: "none", borderRadius: 10, fontWeight: 700, fontSize: 12, cursor: "pointer", opacity: stampingId === m.id ? 0.5 : 1, whiteSpace: "nowrap" }}>
                      {stampingId === m.id ? "..." : "+ Sello"}
                    </button>
                  </div>
                ))}
              </div>
            )}

          </div>

          <div style={{ marginTop: "auto", padding: 20, borderTop: `1px solid ${T.border}`, background: T.bg }}>
            <button 
              onClick={handleSave} 
              disabled={saving}
              style={{ width: "100%", padding: 16, background: "#000", color: "#fff", border: "none", borderRadius: 14, fontWeight: 800, fontSize: 15, cursor: "pointer", boxShadow: "0 8px 16px rgba(0,0,0,0.15)", opacity: saving ? 0.7 : 1 }}>
              {saving ? "Guardando..." : (config.id ? "Guardar Cambios" : "Activar Tarjeta")}
            </button>
            {config.id ? (
              <button onClick={handleDeleteProgram} disabled={saving} style={{ width: "100%", padding: 16, background: "transparent", color: "#EF4444", border: "none", fontWeight: 700, fontSize: 14, cursor: "pointer", marginTop: 8, opacity: saving ? 0.7 : 1 }}>
                Borrar programa y clientes
              </button>
            ) : (
              <p style={{ margin: "12px 0 0 0", fontSize: 11, color: T.sub, textAlign: "center", fontWeight: 600 }}>Requiere plan destacado activo</p>
            )}
          </div>
        </div>

      </div>
      )}
    </div>
  );
}

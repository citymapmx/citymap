import React, { useState } from 'react';
import Icon from '../ui/Icon';
import Uploader from '../Uploader';
import OptimizedImage from '../ui/OptimizedImage';
import FI from './FI';
import BookingManager from '../BookingManager';
import { createSlug } from '../../lib/utils.js';
import { cloudDeleteBatch } from '../../lib/supabase.js';

export default function AdminExperiencesTab({
  data,
  sb,
  load,
  onToast
}) {
  const [expForm, setExpForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const experiences = Array.isArray(data.experiences) ? data.experiences : [];
  const [searchQuery, setSearchQuery] = React.useState("");
  const [bizSearch, setBizSearch] = React.useState("");


  const handleAddField = (field) => {
    setExpForm(f => ({ ...f, [field]: [...(f[field] || []), ""] }));
  };

  const handleUpdateField = (field, idx, val) => {
    setExpForm(f => {
      const arr = [...(f[field] || [])];
      arr[idx] = val;
      return { ...f, [field]: arr };
    });
  };

  const handleRemoveField = (field, idx) => {
    setExpForm(f => {
      const arr = [...(f[field] || [])];
      arr.splice(idx, 1);
      return { ...f, [field]: arr };
    });
  };

  const handleAddFaq = () => {
    setExpForm(f => ({ ...f, faq: [...(f.faq || []), { q: "", a: "" }] }));
  };

  const handleUpdateFaq = (idx, key, val) => {
    setExpForm(f => {
      const arr = [...(f.faq || [])];
      arr[idx] = { ...arr[idx], [key]: val };
      return { ...f, faq: arr };
    });
  };

  const handleRemoveFaq = (idx) => {
    setExpForm(f => {
      const arr = [...(f.faq || [])];
      arr.splice(idx, 1);
      return { ...f, faq: arr };
    });
  };

  const handleAddPhoto = (url) => {
    setExpForm(f => ({ ...f, gallery: [...(f.gallery || []), url] }));
  };

  const handleRemovePhoto = (idx) => {
    setExpForm(f => {
      const arr = [...(f.gallery || [])];
      arr.splice(idx, 1);
      return { ...f, gallery: arr };
    });
  };

  return (
    <>
      {!expForm && <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div className="text-sm" style={{ fontWeight: 600, color: "#5A6872" }}>{experiences.filter(e => e.status !== "pending").length} experiencias</div>
          <button onClick={() => setExpForm({ _new: true, title: "", activity_type: "Tour", description: "", price: 0, duration: "", people: "", meeting_point: "", languages: "", includes: [], not_includes: [], faq: [], affiliate_products: [], gallery: [], city_slug: "all", status: "approved", active: true })} style={{ background: "#1A7A5E", color: "#fff", border: "none", borderRadius: 10, padding: "9px 14px", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 5 }}><Icon name="plus" size={14} color="#fff" /> Nueva</button>
        </div>

        <div style={{ position: "relative" }}>
          <Icon name="search" size={16} color="#94A3B8" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
          <input type="text" placeholder="Buscar experiencia por nombre..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ width: "100%", padding: "12px 16px 12px 38px", border: "1.5px solid #E2E8F0", borderRadius: 12, fontSize: 14, color: "#0F1A14", outline: "none", background: "#fff", fontFamily: "inherit" }} />
        </div>

        <div>
        {experiences.filter(e => e.status !== "pending" && (searchQuery.trim() === "" || (e.title || "").toLowerCase().includes(searchQuery.toLowerCase()))).map(exp => {
          const isPending = exp.status === "pending" || !exp.active;
          const mainImg = (exp.gallery && exp.gallery.length > 0) ? exp.gallery[0] : null;

          return <div key={exp.id} style={{ display: "flex", alignItems: "center", background: "#fff", borderRadius: 12, padding: 10, marginBottom: 10, overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,.05)" }}>
            {mainImg ? <div style={{ width: 60, height: 60, borderRadius: 8, overflow: "hidden", flexShrink: 0, marginRight: 12 }}><OptimizedImage src={mainImg} widthRequest={100} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /></div> : <div style={{ width: 60, height: 60, borderRadius: 8, background: "#F1F5F9", flexShrink: 0, marginRight: 12, display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="image" size={20} color="#CBD5E1" /></div>}
            
            <div style={{ flex: 1, minWidth: 0, marginRight: 8 }}>
              <div className="text-sm" style={{ fontWeight: 800, color: "#0F1A14", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{exp.title}</div>
              <div className="text-micro" style={{ color: "#5A6872", marginTop: 4, display: "flex", flexWrap: "wrap", gap: 6 }}>
                {exp.price > 0 && <span>💲 ${exp.price}</span>}
              </div>
            </div>
            
            <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
              {isPending && <button onClick={async () => { 
                  await sb.patch("experiences", exp.id, { status: "approved", active: true }); 
                  onToast("Experiencia aprobada"); 
                  await load(); 
                }} style={{ background: "#DCFCE7", color: "#16A34A", border: "none", borderRadius: 8, padding: "8px 12px", fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>Aprobar</button>}
              {!isPending && <button onClick={() => setExpForm({ ...exp })} style={{ background: "#EEF2F6", color: "#1A7A5E", border: "none", borderRadius: 8, padding: "8px 12px", fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>Editar</button>}
              <button onClick={async () => { if (!window.confirm("¿Eliminar experiencia?")) return; if (exp.gallery?.length) await cloudDeleteBatch(exp.gallery); await sb.del("experiences", exp.id); onToast("Eliminada"); await load(); }} style={{ background: "#FFF5F5", border: "none", borderRadius: 8, width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><Icon name="trash" size={14} color="#D94F3D" /></button>
            </div>
          </div>;
        })}
        </div>
      </div>}
      
      {expForm && <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ background: "#fff", borderRadius: 14, padding: 16, boxShadow: "0 2px 8px rgba(0,0,0,.05)", display: "flex", flexDirection: "column", gap: 11 }}>
          <div className="text-base" style={{ fontWeight: 800, color: "#0F1A14" }}>{expForm._new ? "Nueva Experiencia" : "Editar Experiencia"}</div>
          

          {/* Tarjeta 1: DATOS PRINCIPALES */}
          <div style={{ border: "1px solid #E4E8E4", borderRadius: 12, padding: 16, background: "#F9FAFB", display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#0F1A14", textTransform: "uppercase", letterSpacing: 0.8, display: "flex", alignItems: "center", gap: 6 }}>📄 Datos Principales</div>
            
            {/* Galería */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
              {(expForm.gallery || []).map((img, idx) => (
                <div key={idx} style={{ position: "relative", aspectRatio: "1/1", borderRadius: 8, overflow: "hidden", border: "1px solid #E4E8E4" }}>
                  <img src={img} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  <button type="button" onClick={() => handleRemovePhoto(idx)} style={{ position: "absolute", top: 4, right: 4, background: "rgba(0,0,0,0.6)", color: "#fff", border: "none", borderRadius: "50%", width: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><Icon name="x" size={10} color="#fff" /></button>
                </div>
              ))}
              <div style={{ aspectRatio: "1/1", display: "flex", alignItems: "center", justifyContent: "center", background: "#fff", border: "1.5px dashed #E4E8E4", borderRadius: 8 }}>
                <Uploader onDone={handleAddPhoto} hidePreview />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label className="text-xs" style={{ fontWeight: 700, color: "#5A6872", textTransform: "uppercase", letterSpacing: .8, display: "block", marginBottom: 6 }}>Tipo de Actividad</label>
                <div style={{ position: "relative" }}>
                  <select value={expForm.activity_type || ""} onChange={(e) => setExpForm(f => ({ ...f, activity_type: e.target.value }))} style={{ width: "100%", padding: "10px 12px", border: "1.5px solid #E4E8E4", borderRadius: 10, fontSize: 13, color: "#0F1A14", background: "#fff", fontFamily: "inherit", appearance: "none" }}>
                    <option value="">Selecciona un tipo...</option>
                    <option value="✨ Experiencias">✨ Experiencias</option>
                    <option value="🗺️ Tours">🗺️ Tours</option>
                    <option value="🌿 Naturaleza">🌿 Naturaleza</option>
                    <option value="🏛️ Cultura">🏛️ Cultura</option>
                    <option value="🎢 Entretenimiento">🎢 Entretenimiento</option>
                    <option value="🍽️ Gastronomía">🍽️ Gastronomía</option>
                    <option value="🧗 Aventura">🧗 Aventura</option>
                    <option value="🏖️ Playas">🏖️ Playas</option>
                  </select>
                  <Icon name="chevron" size={14} color="#94A3B8" style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%) rotate(90deg)", pointerEvents: "none" }} />
                </div>
              </div>
              <FI label="Nombre (Ej. Tour a Islas Marietas)" field="title" src={expForm} set={setExpForm} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10, marginTop: 10, marginBottom: 10 }}>
              <FI label="Escrito por (Ej. Daniel Arana)" field="author_name" src={expForm} set={setExpForm} ph="Opcional. Nombre del autor." />
            </div>

            <div style={{ position: "relative" }}>
              <FI label="Descripción" field="description" src={expForm} set={setExpForm} rows={10} />
              <button 
                type="button"
                onClick={async () => {
                  if (!expForm.title) return onToast("Error: Escribe el nombre primero");
                  setExpForm(f => ({ ...f, _generating: true }));
                  try {
                    const res = await fetch("https://citymap.mx/api/ai-plan", {
                      method: "POST",
                      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${import.meta.env.VITE_ADMIN_SECRET}` },
                      body: JSON.stringify({ title: expForm.title, planType: expForm.activity_type || "experiencia" })
                    });
                    if (!res.ok) throw new Error("Error en la IA");
                    const d = await res.json();
                    setExpForm(f => ({ ...f, description: d.description, _generating: false }));
                    onToast("Descripción generada ✨");
                  } catch(e) {
                    onToast("Error: " + e.message);
                    setExpForm(f => ({ ...f, _generating: false }));
                  }
                }}
                disabled={expForm._generating || !expForm.title}
                style={{ position: "absolute", top: 0, right: 0, background: "linear-gradient(135deg, #7C3AED, #4F46E5)", border: "none", borderRadius: 8, padding: "4px 8px", fontSize: 10, fontWeight: 800, color: "#fff", cursor: (expForm._generating || !expForm.title) ? "not-allowed" : "pointer", opacity: (expForm._generating || !expForm.title) ? 0.5 : 1, display: "flex", alignItems: "center", gap: 4 }}
              >
                <Icon name="sparkles" size={10} color="#fff" />
                {expForm._generating ? "Generando..." : "IA"}
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label className="text-xs" style={{ fontWeight: 700, color: "#5A6872", textTransform: "uppercase", letterSpacing: .8 }}>Negocio Asociado (Opcional)</label>
              <input type="text" placeholder="🔎 Buscar negocio..." value={bizSearch} onChange={e => setBizSearch(e.target.value)} style={{ width: "100%", padding: "10px 12px", border: "1.5px solid #E4E8E4", borderRadius: "10px 10px 0 0", fontSize: 13, background: "#fff", fontFamily: "inherit", borderBottom: "none" }} />
              <div style={{ position: "relative" }}>
                <select value={expForm.biz_id || ""} onChange={(e) => setExpForm(f => ({ ...f, biz_id: e.target.value }))} style={{ width: "100%", padding: "10px 12px", border: "1.5px solid #E4E8E4", borderRadius: "0 0 10px 10px", fontSize: 13, color: "#0F1A14", background: "#fff", fontFamily: "inherit", appearance: "none" }}>
                  <option value="">Ninguno (Independiente)</option>
                  {(data.biz || []).filter(b => b.name.toLowerCase().includes(bizSearch.toLowerCase())).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
                <Icon name="chevron" size={14} color="#94A3B8" style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%) rotate(90deg)", pointerEvents: "none" }} />
              </div>
            </div>

            <div>
              <label className="text-xs" style={{ fontWeight: 700, color: "#5A6872", textTransform: "uppercase", letterSpacing: .8, display: "block", marginBottom: 6 }}>Ciudad</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                <button type="button" onClick={() => setExpForm(f => ({ ...f, city_slug: "all" }))} style={{ padding: "6px 12px", border: `1.5px solid ${expForm.city_slug === "all" || !expForm.city_slug ? "#1A7A5E" : "#E4E8E4"}`, borderRadius: 20, fontSize: 12, fontWeight: 700, background: expForm.city_slug === "all" || !expForm.city_slug ? "#EAF4F0" : "#fff", color: expForm.city_slug === "all" || !expForm.city_slug ? "#1A7A5E" : "#5A6872", cursor: "pointer" }}>Todas</button>
                {data.cities.map(c => {
                  const isSelected = expForm.city_slug === c.slug;
                  return (
                    <button key={c.slug} type="button" onClick={() => setExpForm(f => ({ ...f, city_slug: c.slug }))} style={{ padding: "6px 12px", border: `1.5px solid ${isSelected ? "#1A7A5E" : "#E4E8E4"}`, borderRadius: 20, fontSize: 12, fontWeight: 700, background: isSelected ? "#EAF4F0" : "#fff", color: isSelected ? "#1A7A5E" : "#5A6872", cursor: "pointer" }}>{c.name}</button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Tarjeta 2: LOGÍSTICA */}
          <div style={{ border: "1px solid #E4E8E4", borderRadius: 12, padding: 16, background: "#F9FAFB", display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#0F1A14", textTransform: "uppercase", letterSpacing: 0.8, display: "flex", alignItems: "center", gap: 6 }}>⏱️ Logística y Detalles</div>
            
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label className="text-xs" style={{ fontWeight: 700, color: "#5A6872", textTransform: "uppercase", letterSpacing: .8, display: "block", marginBottom: 4 }}>Precio</label>
                <select value={expForm.price_type || (expForm.price > 0 ? "paid" : "gratis")} onChange={e => setExpForm(f => ({ ...f, price_type: e.target.value, price: e.target.value === "gratis" ? 0 : f.price }))} style={{ width: "100%", padding: "11px 12px", border: "1.5px solid #E4E8E4", borderRadius: 10, fontSize: 13, color: "#0F1A14", background: "#fff", fontFamily: "inherit", appearance: "none" }}>
                  <option value="gratis">Gratis</option>
                  <option value="paid">De pago</option>
                </select>
              </div>
              {(expForm.price_type === "paid" || (expForm.price > 0 && !expForm.price_type)) && (
                <div>
                  <label className="text-xs" style={{ fontWeight: 700, color: "#5A6872", textTransform: "uppercase", letterSpacing: .8, display: "block", marginBottom: 4 }}>Monto y Moneda</label>
                  <div style={{ display: "flex", gap: 6 }}>
                    <input type="text" value={expForm.price || ""} onChange={e => setExpForm(f => ({ ...f, price: e.target.value.replace(/[^0-9.]/g, '') }))} placeholder="1500" style={{ flex: 1, minWidth: 0, padding: "11px 12px", border: "1.5px solid #E4E8E4", borderRadius: 10, fontSize: 13, color: "#0F1A14", background: "#fff", fontFamily: "inherit" }} />
                    <select value={(expForm.booking_config && expForm.booking_config.currency) ? expForm.booking_config.currency : "MXN"} onChange={e => setExpForm(f => ({ ...f, booking_config: { ...(f.booking_config || {}), currency: e.target.value } }))} style={{ width: 80, padding: "11px 8px", border: "1.5px solid #E4E8E4", borderRadius: 10, fontSize: 13, background: "#fff", fontFamily: "inherit", appearance: "none" }}>
                      <option value="MXN">MXN</option>
                      <option value="USD">USD</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <FI label="Duración (Ej. 5 horas)" field="duration" src={expForm} set={setExpForm} ph="5 horas" />
              <FI label="Personas (Ej. 2-10)" field="people" src={expForm} set={setExpForm} ph="Grupos de 2 a 10" />
            </div>

            <div>
              <FI label="Idiomas" field="languages" src={expForm} set={setExpForm} ph="Español, Inglés" />
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 6 }}>
                {["Español", "Inglés", "Francés", "Alemán", "Portugués"].map(lang => (
                  <button key={lang} type="button" onClick={(e) => {
                    e.preventDefault();
                    const current = expForm.languages ? expForm.languages.split(',').map(s=>s.trim()).filter(Boolean) : [];
                    if (!current.includes(lang)) {
                      setExpForm(f => ({ ...f, languages: [...current, lang].join(', ') }));
                    }
                  }} style={{ background: "#EEF2F6", border: "none", borderRadius: 6, padding: "4px 8px", fontSize: 11, fontWeight: 600, color: "#1A7A5E", cursor: "pointer" }}>+{lang}</button>
                ))}
              </div>
            </div>
          </div>

          {/* Tarjeta 3: UBICACIÓN Y RUTAS */}
          <div style={{ border: "1px solid #E4E8E4", borderRadius: 12, padding: 16, background: "#F9FAFB", display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#0F1A14", textTransform: "uppercase", letterSpacing: 0.8, display: "flex", alignItems: "center", gap: 6 }}>📍 Ubicación y Rutas</div>
            
            <FI label="Punto de encuentro (Dirección Escrita)" field="meeting_point" src={expForm} set={setExpForm} ph="Muelle principal, Puerto Vallarta" />
            <FI label="Enlace Exacto (Google Maps / Wikiloc URL)" field="meeting_url" src={expForm} set={setExpForm} ph="https://maps.app.goo.gl/... o https://es.wikiloc.com/..." />
            <FI label="Enlace de Ruta Externa (Wikiloc, AllTrails, etc)" field="route_url" src={expForm} set={setExpForm} ph="https://es.wikiloc.com/rutas-senderismo/..." />
          </div>

          {/* Tarjeta 4: DETALLES EXTRA Y CONFIGURACIÓN */}
          <div style={{ border: "1px solid #E4E8E4", borderRadius: 12, padding: 16, background: "#F9FAFB", display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#0F1A14", textTransform: "uppercase", letterSpacing: 0.8, display: "flex", alignItems: "center", gap: 6 }}>📝 Extras y Reservas</div>
            
            {/* DATOS RÁPIDOS */}
            <div style={{ background: "#fff", padding: 12, borderRadius: 12, border: "1px solid #E4E8E4" }}>
              <div className="text-xs" style={{ fontWeight: 800, color: "#0F1A14", textTransform: "uppercase", letterSpacing: .8, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>⚡ Datos Rápidos</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 8 }}>
                {((expForm.booking_config && expForm.booking_config.quick_facts) || []).map((fact, idx) => (
                  <div key={idx} style={{ display: "flex", gap: 6 }}>
                    <input type="text" value={fact} onChange={(e) => {
                       const bc = { ...(expForm.booking_config || {}) };
                       const arr = [...(bc.quick_facts || [])];
                       arr[idx] = e.target.value;
                       bc.quick_facts = arr;
                       setExpForm(f => ({ ...f, booking_config: bc }));
                    }} style={{ flex: 1, padding: "8px 10px", border: "1px solid #E4E8E4", borderRadius: 8, fontSize: 13 }} placeholder="Ej. ⏱️ Tiempo recomendado: 4-8 horas" />
                    <button type="button" onClick={() => {
                       const bc = { ...(expForm.booking_config || {}) };
                       const arr = [...(bc.quick_facts || [])];
                       arr.splice(idx, 1);
                       bc.quick_facts = arr;
                       setExpForm(f => ({ ...f, booking_config: bc }));
                    }} style={{ background: "#FEE2E2", border: "none", borderRadius: 8, padding: "0 10px", cursor: "pointer" }}><Icon name="x" size={12} color="#D94F3D" /></button>
                  </div>
                ))}
              </div>
              {/* Sugerencias rápidas */}
              {(() => {
                const PRESETS = [
                  "⏱️ Tiempo: 4-8 hrs",
                  "🚗 A 45 min",
                  "🏊 Ideal p/ nadar",
                  "👨‍👩‍👧‍👦 Familiar",
                  "🐶 Pet friendly",
                  "♿ Accesible",
                  "📅 Todo el año"
                ];
                const current = (expForm.booking_config?.quick_facts || []).map(i => i.toLowerCase().trim());
                return (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
                    {PRESETS.map(p => {
                      const already = current.includes(p.toLowerCase());
                      return (
                        <button
                          key={p}
                          type="button"
                          disabled={already}
                          onClick={() => {
                            if (already) return;
                            const bc = { ...(expForm.booking_config || {}) };
                            bc.quick_facts = [...(bc.quick_facts || []), p];
                            setExpForm(f => ({ ...f, booking_config: bc }));
                          }}
                          style={{
                            background: already ? "#F0FDF4" : "#F9FAFB",
                            border: `1px solid ${already ? "#86EFAC" : "#E4E8E4"}`,
                            borderRadius: 20,
                            padding: "5px 11px",
                            fontSize: 12,
                            fontWeight: 600,
                            color: already ? "#16A34A" : "#374151",
                            cursor: already ? "default" : "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: 5,
                            transition: "all .15s",
                            opacity: already ? 0.7 : 1,
                          }}
                        >
                          {already ? "✓ " : "+ "}{p}
                        </button>
                      );
                    })}
                  </div>
                );
              })()}
              <button type="button" onClick={() => {
                 const bc = { ...(expForm.booking_config || {}) };
                 const arr = [...(bc.quick_facts || []), ""];
                 bc.quick_facts = arr;
                 setExpForm(f => ({ ...f, booking_config: bc }));
              }} style={{ background: "#F9FAFB", border: "1px solid #E4E8E4", borderRadius: 8, padding: "6px 12px", fontSize: 12, fontWeight: 700, color: "#0F1A14", cursor: "pointer" }}>+ Añadir dato personalizado</button>
            </div>
            {/* QUÉ INCLUYE */}
            <div style={{ background: "#fff", padding: 12, borderRadius: 12, border: "1px solid #E4E8E4" }}>
              <div className="text-xs" style={{ fontWeight: 800, color: "#0F1A14", textTransform: "uppercase", letterSpacing: .8, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>✔️ Qué incluye</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 8 }}>
                {(expForm.includes || []).map((inc, idx) => (
                  <div key={idx} style={{ display: "flex", gap: 6 }}>
                    <input type="text" value={inc} onChange={(e) => handleUpdateField("includes", idx, e.target.value)} style={{ flex: 1, padding: "8px 10px", border: "1px solid #E4E8E4", borderRadius: 8, fontSize: 13 }} placeholder="Ej. Equipo de snorkel" />
                    <button type="button" onClick={() => handleRemoveField("includes", idx)} style={{ background: "#FEE2E2", border: "none", borderRadius: 8, padding: "0 10px", cursor: "pointer" }}><Icon name="x" size={12} color="#D94F3D" /></button>
                  </div>
                ))}
              </div>
              <button type="button" onClick={() => handleAddField("includes")} style={{ background: "#F9FAFB", border: "1px solid #E4E8E4", borderRadius: 8, padding: "6px 12px", fontSize: 12, fontWeight: 700, color: "#0F1A14", cursor: "pointer" }}>+ Añadir ítem</button>
            </div>

            {/* QUÉ NO INCLUYE */}
            <div style={{ background: "#fff", padding: 12, borderRadius: 12, border: "1px solid #E4E8E4" }}>
              <div className="text-xs" style={{ fontWeight: 800, color: "#0F1A14", textTransform: "uppercase", letterSpacing: .8, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>❌ Qué no incluye</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 8 }}>
                {(expForm.not_includes || []).map((inc, idx) => (
                  <div key={idx} style={{ display: "flex", gap: 6 }}>
                    <input type="text" value={inc} onChange={(e) => handleUpdateField("not_includes", idx, e.target.value)} style={{ flex: 1, padding: "8px 10px", border: "1px solid #E4E8E4", borderRadius: 8, fontSize: 13 }} placeholder="Ej. Propinas" />
                    <button type="button" onClick={() => handleRemoveField("not_includes", idx)} style={{ background: "#FEE2E2", border: "none", borderRadius: 8, padding: "0 10px", cursor: "pointer" }}><Icon name="x" size={12} color="#D94F3D" /></button>
                  </div>
                ))}
              </div>
              <button type="button" onClick={() => handleAddField("not_includes")} style={{ background: "#F9FAFB", border: "1px solid #E4E8E4", borderRadius: 8, padding: "6px 12px", fontSize: 12, fontWeight: 700, color: "#0F1A14", cursor: "pointer" }}>+ Añadir ítem</button>
            </div>

            {/* QUÉ RECOMENDAMOS LLEVAR */}
            <div style={{ background: "#fff", padding: 12, borderRadius: 12, border: "1px solid #E4E8E4" }}>
              <div className="text-xs" style={{ fontWeight: 800, color: "#0F1A14", textTransform: "uppercase", letterSpacing: .8, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>🎒 Qué recomendamos llevar</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 8 }}>
                {((expForm.booking_config && expForm.booking_config.bring_items) || []).map((inc, idx) => (
                  <div key={idx} style={{ display: "flex", gap: 6 }}>
                    <input type="text" value={inc} onChange={(e) => {
                       const bc = { ...(expForm.booking_config || {}) };
                       const arr = [...(bc.bring_items || [])];
                       arr[idx] = e.target.value;
                       bc.bring_items = arr;
                       setExpForm(f => ({ ...f, booking_config: bc }));
                    }} style={{ flex: 1, padding: "8px 10px", border: "1px solid #E4E8E4", borderRadius: 8, fontSize: 13 }} placeholder="Ej. Bloqueador solar, zapatos cómodos" />
                    <button type="button" onClick={() => {
                       const bc = { ...(expForm.booking_config || {}) };
                       const arr = [...(bc.bring_items || [])];
                       arr.splice(idx, 1);
                       bc.bring_items = arr;
                       setExpForm(f => ({ ...f, booking_config: bc }));
                    }} style={{ background: "#FEE2E2", border: "none", borderRadius: 8, padding: "0 10px", cursor: "pointer" }}><Icon name="x" size={12} color="#D94F3D" /></button>
                  </div>
                ))}
              </div>
              {/* Sugerencias rápidas */}
              {(() => {
                const PRESETS = [
                  { label: "Botella de agua", emoji: "💧" },
                  { label: "Calzado cómodo",  emoji: "👟" },
                  { label: "Protector solar",  emoji: "☀️" },
                  { label: "Efectivo",          emoji: "💵" },
                  { label: "Batería portátil",  emoji: "🔋" },
                  { label: "Repelente",          emoji: "🦟" },
                  { label: "Gorra o sombrero",  emoji: "🧢" },
                ];
                const current = (expForm.booking_config?.bring_items || []).map(i => i.toLowerCase().trim());
                return (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
                    {PRESETS.map(p => {
                      const already = current.includes(p.label.toLowerCase());
                      return (
                        <button
                          key={p.label}
                          type="button"
                          disabled={already}
                          onClick={() => {
                            if (already) return;
                            const bc = { ...(expForm.booking_config || {}) };
                            bc.bring_items = [...(bc.bring_items || []), p.label];
                            setExpForm(f => ({ ...f, booking_config: bc }));
                          }}
                          style={{
                            background: already ? "#F0FDF4" : "#F9FAFB",
                            border: `1px solid ${already ? "#86EFAC" : "#E4E8E4"}`,
                            borderRadius: 20,
                            padding: "5px 11px",
                            fontSize: 12,
                            fontWeight: 600,
                            color: already ? "#16A34A" : "#374151",
                            cursor: already ? "default" : "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: 5,
                            transition: "all .15s",
                            opacity: already ? 0.7 : 1,
                          }}
                        >
                          <span>{p.emoji}</span>
                          {already ? "✓ " : "+ "}{p.label}
                        </button>
                      );
                    })}
                  </div>
                );
              })()}
              <button type="button" onClick={() => {
                 const bc = { ...(expForm.booking_config || {}) };
                 const arr = [...(bc.bring_items || []), ""];
                 bc.bring_items = arr;
                 setExpForm(f => ({ ...f, booking_config: bc }));
              }} style={{ background: "#F9FAFB", border: "1px solid #E4E8E4", borderRadius: 8, padding: "6px 12px", fontSize: 12, fontWeight: 700, color: "#0F1A14", cursor: "pointer" }}>+ Añadir ítem personalizado</button>
            </div>


            {/* FAQs */}
            <div style={{ background: "#fff", padding: 12, borderRadius: 12, border: "1px solid #E4E8E4" }}>
              <div className="text-xs" style={{ fontWeight: 800, color: "#0F1A14", textTransform: "uppercase", letterSpacing: .8, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>❓ Preguntas frecuentes</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 8 }}>
                {(expForm.faq || []).map((faq, idx) => (
                  <div key={idx} style={{ background: "#F9FAFB", padding: 10, borderRadius: 8, border: "1px solid #E4E8E4", display: "flex", gap: 8, alignItems: "flex-start" }}>
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                      <input type="text" value={faq.q || ""} onChange={(e) => handleUpdateFaq(idx, "q", e.target.value)} style={{ width: "100%", padding: "6px 8px", border: "1px solid #E4E8E4", borderRadius: 6, fontSize: 13, fontWeight: 700 }} placeholder="Pregunta" />
                      <textarea value={faq.a || ""} onChange={(e) => handleUpdateFaq(idx, "a", e.target.value)} style={{ width: "100%", padding: "6px 8px", border: "1px solid #E4E8E4", borderRadius: 6, fontSize: 13, resize: "vertical", minHeight: 40 }} placeholder="Respuesta" />
                    </div>
                    <button type="button" onClick={() => handleRemoveFaq(idx)} style={{ background: "#FEE2E2", border: "none", borderRadius: 8, padding: "6px", cursor: "pointer", alignSelf: "center" }}><Icon name="x" size={12} color="#D94F3D" /></button>
                  </div>
                ))}
              </div>
              <button type="button" onClick={handleAddFaq} style={{ background: "#F9FAFB", border: "1px solid #E4E8E4", borderRadius: 8, padding: "6px 12px", fontSize: 12, fontWeight: 700, color: "#0F1A14", cursor: "pointer" }}>+ Añadir pregunta</button>
            </div>

            <BookingManager 
              bookingConfig={expForm.booking_config} 
              onChange={cfg => setExpForm(f => ({ ...f, booking_config: cfg }))} 
              T={{ bg: "#fff", text: "#0F1A14", sub: "#5A6872", border: "#E4E8E4", green: "#1A7A5E" }}
            />
          </div>

          {/* Tarjeta 5: AFILIADOS Y MONETIZACIÓN */}
          <div style={{ border: "1px solid #E4E8E4", borderRadius: 12, padding: 16, background: "#F9FAFB", display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#0F1A14", textTransform: "uppercase", letterSpacing: 0.8, display: "flex", alignItems: "center", gap: 6 }}>💰 Monetización (Afiliados)</div>
            
            <div style={{ background: "#fff", padding: 12, borderRadius: 12, border: "1px solid #E4E8E4" }}>
              <div className="text-xs" style={{ fontWeight: 800, color: "#0F1A14", textTransform: "uppercase", letterSpacing: .8, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>🛍️ Productos recomendados</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 8 }}>
                {(expForm.affiliate_products || []).map((prod, idx) => (
                  <div key={idx} style={{ background: "#F9FAFB", padding: 12, borderRadius: 8, border: "1px solid #E4E8E4", display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                        <input type="text" value={prod.title || ""} onChange={(e) => {
                          const arr = [...(expForm.affiliate_products || [])];
                          arr[idx] = { ...arr[idx], title: e.target.value };
                          setExpForm(f => ({ ...f, affiliate_products: arr }));
                        }} style={{ width: "100%", padding: "6px 8px", border: "1px solid #E4E8E4", borderRadius: 6, fontSize: 13, fontWeight: 700 }} placeholder="Título del producto (Ej. Botas de Senderismo)" />
                        <input type="url" value={prod.url || ""} onChange={(e) => {
                          const arr = [...(expForm.affiliate_products || [])];
                          arr[idx] = { ...arr[idx], url: e.target.value };
                          setExpForm(f => ({ ...f, affiliate_products: arr }));
                        }} style={{ width: "100%", padding: "6px 8px", border: "1px solid #E4E8E4", borderRadius: 6, fontSize: 13 }} placeholder="Enlace de afiliado (Ej. https://mercadolibre...)" />
                        <div style={{ display: "flex", gap: 8 }}>
                          <input type="url" value={prod.image_url || ""} onChange={(e) => {
                            const arr = [...(expForm.affiliate_products || [])];
                            arr[idx] = { ...arr[idx], image_url: e.target.value };
                            setExpForm(f => ({ ...f, affiliate_products: arr }));
                          }} style={{ flex: 2, padding: "6px 8px", border: "1px solid #E4E8E4", borderRadius: 6, fontSize: 13 }} placeholder="URL de la imagen" />
                          <input type="text" value={prod.price || ""} onChange={(e) => {
                            const arr = [...(expForm.affiliate_products || [])];
                            arr[idx] = { ...arr[idx], price: e.target.value };
                            setExpForm(f => ({ ...f, affiliate_products: arr }));
                          }} style={{ flex: 1, padding: "6px 8px", border: "1px solid #E4E8E4", borderRadius: 6, fontSize: 13 }} placeholder="Precio (Ej. $499)" />
                        </div>
                      </div>
                      <button type="button" onClick={() => {
                        const arr = [...(expForm.affiliate_products || [])];
                        arr.splice(idx, 1);
                        setExpForm(f => ({ ...f, affiliate_products: arr }));
                      }} style={{ background: "#FEE2E2", border: "none", borderRadius: 8, padding: "6px", cursor: "pointer" }}><Icon name="x" size={14} color="#D94F3D" /></button>
                    </div>
                  </div>
                ))}
              </div>
              <button type="button" onClick={() => {
                const arr = [...(expForm.affiliate_products || []), { title: "", url: "", image_url: "", price: "" }];
                setExpForm(f => ({ ...f, affiliate_products: arr }));
              }} style={{ background: "#F9FAFB", border: "1px solid #E4E8E4", borderRadius: 8, padding: "6px 12px", fontSize: 12, fontWeight: 700, color: "#0F1A14", cursor: "pointer" }}>+ Añadir producto afiliado</button>
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => setExpForm(null)} style={{ flex: 1, padding: 14, background: "#fff", border: "1.5px solid #E4E8E4", borderRadius: 12, fontWeight: 700, fontSize: 14, color: "#5A6872", cursor: "pointer", fontFamily: "inherit" }}>Cancelar</button>
          <button onClick={async () => { 
            setSaving(true); 
            try { 
              const cty = expForm.city_slug && expForm.city_slug !== "all" ? expForm.city_slug : (data.cities && data.cities.length > 0 ? data.cities[0].slug : "");
              let baseSlug = expForm.slug || createSlug(expForm.title); 
              if (!baseSlug.startsWith(cty + "-")) baseSlug = `${cty}-${baseSlug}`; 
              let newSlug = baseSlug; 
              let counter = 1; 
              while (experiences.some(e => e.slug === newSlug && e.id !== expForm.id)) { 
                newSlug = `${baseSlug}-${counter++}`; 
              } 
              const p = { 
                title: expForm.title, 
                slug: newSlug, 
                activity_type: expForm.activity_type || "Experiencia",
                description: expForm.description, 
                price: Number(expForm.price) || 0,
                duration: expForm.duration,
                people: expForm.people,
                meeting_point: expForm.meeting_point || "",
                meeting_url: expForm.meeting_url,
                route_url: expForm.route_url,
                languages: expForm.languages || "",
                includes: expForm.includes || [],
                not_includes: expForm.not_includes || [],
                affiliate_products: expForm.affiliate_products || [],
                faq: expForm.faq || [],
                gallery: expForm.gallery || [],
                booking_config: expForm.booking_config || null,
                author_name: expForm.author_name || null,
                city_slug: expForm.city_slug || "all", 
                status: "approved", 
                active: true 
              }; 
              if (expForm._new) await sb.post("experiences", p); 
              else await sb.patch("experiences", expForm.id, p); 
              onToast("Guardado correctamente"); 
              setExpForm(null); 
              await load(); 
            } catch(e) { 
              onToast("Error: " + e.message); 
            } finally { 
              setSaving(false); 
            } 
          }} disabled={saving || !expForm.title} style={{ flex: 2, padding: 14, background: saving || !expForm.title ? "#9CA3AF" : "#1A7A5E", border: "none", borderRadius: 12, fontWeight: 700, fontSize: 14, color: "#fff", cursor: "pointer", fontFamily: "inherit" }}>{saving ? "Guardando..." : expForm._new ? "Crear Experiencia" : "Guardar Cambios"}</button>
        </div>
      </div>}
    </>
  );
}

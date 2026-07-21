import React, { useState } from 'react';
import Icon from './ui/Icon.jsx';
import Uploader from './Uploader.jsx';
import MenuManager from './MenuManager.jsx';
import { sb } from '../lib/supabase.js';

export default function AddBizModal({
  showAddBiz,
  setShowAddBiz,
  editBizId,
  setEditBizId,
  addBizForm,
  setAddBizForm,
  user,
  activeCity,
  cats,
  biz,
  setBiz,
  loadPaginatedBiz,
  loadMapPins,
  loadMyBiz,
  setShowPlans,
  toast$,
  T
}) {
  const [addBizLoading, setAddBizLoading] = useState(false);

  if (!showAddBiz) return null;

  const isOwnerEdit = editBizId && addBizForm.owner_id === user?.id;
  const isPremium = addBizForm.plan === "destacado" || addBizForm.plan === "premium" || addBizForm.plan === "pro";
  const isFreeOwner = isOwnerEdit && !isPremium;

  return (
    <div className="ov" onClick={() => { setShowAddBiz(false); setEditBizId(null); }}>
      <div className="sh" style={{ maxHeight: "94vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
          <h2 style={{ fontFamily: "'Coolvetica', sans-serif", fontSize: 22, color: T.text }}>{editBizId ? "Actualizar negocio" : "Sugerir un lugar o negocio"}</h2>
          <button onClick={() => { setShowAddBiz(false); setEditBizId(null); }} style={{ background: T.bg, border: "none", borderRadius: "50%", width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0, marginLeft: 12 }}><Icon name="x" size={16} color={T.sub} /></button>
        </div>
        <p style={{ fontSize: 13, color: T.sub, marginBottom: 18 }}>{editBizId ? "Corrige la información y reenvía para revisión" : "Se publicará tras la revisión del equipo CityMap"}</p>
        
        {!isOwnerEdit && (
          <label style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 14px", background: "rgba(201, 168, 76, 0.1)", border: "1px solid rgba(201, 168, 76, 0.3)", borderRadius: 12, cursor: "pointer", marginBottom: 16 }}>
            <input type="checkbox" checked={addBizForm.is_owner || false} onChange={e => setAddBizForm(f => ({ ...f, is_owner: e.target.checked }))} style={{ width: 18, height: 18, accentColor: "#C9A84C" }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>Soy el dueño o administrador de este lugar</span>
          </label>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: T.sub, textTransform: "uppercase", letterSpacing: .6, marginBottom: 6 }}>Imágenes ({(addBizForm.photos || []).length}/3)</div>
            {!isFreeOwner && (addBizForm.photos || []).length < 3 && (
              <Uploader multiple={true} onDone={url => setAddBizForm(f => ({ ...f, photos: [...(f.photos || []), url] }))} label="Agregar foto" />
            )}
            {(addBizForm.photos || []).length > 0 && (
              <div style={{ display: "flex", gap: 8, marginTop: 8, overflowX: "auto", paddingBottom: 4 }}>
                {(addBizForm.photos || []).map((url, i) => (
                  <div key={i} style={{ position: "relative", width: 100, height: 100, flexShrink: 0 }}>
                    <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 10 }} loading="lazy" />
                    {!isFreeOwner && (
                      <button onClick={() => setAddBizForm(f => ({ ...f, photos: f.photos.filter((_, idx) => idx !== i) }))} style={{ position: "absolute", top: 4, right: 4, background: "rgba(0,0,0,0.6)", border: "none", borderRadius: "50%", width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><Icon name="x" size={14} color="#fff" /></button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: T.sub, textTransform: "uppercase", letterSpacing: .6, marginBottom: 6 }}>Nombre del negocio <span style={{ color: T.red }}>*</span></div>
              {isFreeOwner ? (
                <div style={{ padding: "12px 14px", background: T.bg, border: `1.5px solid ${T.border}`, borderRadius: 12, fontSize: 14, color: T.sub, fontFamily: "inherit", minHeight: 44 }}>{addBizForm.name}</div>
              ) : (
                <input className="inp" placeholder="Ej: Restaurante Los Pinos" value={addBizForm.name} onChange={e => setAddBizForm(f => ({ ...f, name: e.target.value }))} />
              )}
            </div>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            {editBizId ? (
              <div style={{ flex: 1 }}><div style={{ fontSize: 11, fontWeight: 700, color: T.sub, textTransform: "uppercase", letterSpacing: .6, marginBottom: 6 }}>Categoría</div>
                <div style={{ padding: "12px 14px", background: T.bg, border: `1.5px solid ${T.border}`, borderRadius: 12, fontSize: 14, color: T.sub, fontFamily: "inherit" }}>{addBizForm.category}</div>
              </div>
            ) : (
              <div style={{ flex: 1 }}><div style={{ fontSize: 11, fontWeight: 700, color: T.sub, textTransform: "uppercase", letterSpacing: .6, marginBottom: 6 }}>Categoría <span style={{ color: T.red }}>*</span></div>
                <select value={addBizForm.category} onChange={e => setAddBizForm(f => ({ ...f, category: e.target.value }))} style={{ width: "100%", padding: "12px 14px", background: T.white, border: `1.5px solid ${T.border}`, borderRadius: 12, fontSize: 14, color: T.text, fontFamily: "inherit" }}>
                  <option value="">Seleccionar...</option>
                  {(cats || []).map(c => <option key={c.id} value={c.label}>{c.label}</option>)}
                </select>
              </div>
            )}
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: T.sub, textTransform: "uppercase", letterSpacing: .6, marginBottom: 6 }}>Ciudad <span style={{ color: T.red }}>*</span></div>
              {isFreeOwner ? (
                <div style={{ padding: "12px 14px", background: T.bg, border: `1.5px solid ${T.border}`, borderRadius: 12, fontSize: 14, color: T.sub, fontFamily: "inherit", minHeight: 44 }}>{addBizForm.city || "tepic"}</div>
              ) : (
                <input className="inp" placeholder="Ej: Tepic" value={addBizForm.city || ""} onChange={e => setAddBizForm(f => ({ ...f, city: e.target.value }))} />
              )}
            </div>
          </div>
          {!(addBizForm.is_owner || isOwnerEdit) && (
            <div><div style={{ fontSize: 11, fontWeight: 700, color: T.sub, textTransform: "uppercase", letterSpacing: .6, marginBottom: 6 }}>¿Por qué lo recomiendas?</div><textarea className="inp" placeholder="Tienen los mejores tacos de la ciudad..." rows={3} value={addBizForm.description} onChange={e => setAddBizForm(f => ({ ...f, description: e.target.value }))} style={{ resize: "none", height: 80 }} /></div>
          )}
          
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: T.sub, textTransform: "uppercase", letterSpacing: .6, marginBottom: 6 }}>Dirección aproximada</div>
            <input className="inp" placeholder="Av. México 123, Col. Centro, Tepic" value={addBizForm.address} onChange={e => setAddBizForm(f => ({ ...f, address: e.target.value }))} />
          </div>
          
          {(addBizForm.is_owner || isOwnerEdit) && (
            <>
              <div style={{ height: 1, background: T.border, margin: "10px 0" }} />
              
              {/* PHONE - always available */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: T.sub, textTransform: "uppercase", letterSpacing: .6, marginBottom: 6 }}>Teléfono para llamadas</div>
                <input className="inp" placeholder="311 000 0000" type="tel" value={addBizForm.phone} onChange={e => setAddBizForm(f => ({ ...f, phone: e.target.value }))} />
              </div>

              {!isPremium ? (
                /* ── FREE PLAN: only phone + address + upgrade CTA ── */
                <>
                  <div style={{ marginTop: 6, padding: "16px", background: "linear-gradient(135deg, #C9A84C22, #F59E0B11)", border: "1.5px solid #C9A84C55", borderRadius: 16 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#92400E", display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                      <Icon name="star" size={14} color="#C9A84C" />
                      Plan gratuito activo
                    </div>
                    <p style={{ fontSize: 12, color: "#92400E", opacity: 0.85, lineHeight: 1.5 }}>
                      Con el plan gratuito solo puedes actualizar tu teléfono y dirección. Sube de nivel para editar fotos, horarios, WhatsApp, redes sociales y más.
                    </p>
                  </div>

                  {/* Upgrade CTA */}
                  <button
                    type="button"
                    onClick={() => { setShowAddBiz(false); setEditBizId(null); setShowPlans(true); }}
                    style={{ width: "100%", padding: "18px 16px", borderRadius: 16, border: "none", cursor: "pointer", background: "linear-gradient(135deg, #C9A84C, #F59E0B)", color: "#fff", display: "flex", alignItems: "center", gap: 14, boxShadow: "0 8px 24px rgba(201,168,76,0.4)", marginTop: 4 }}
                  >
                    <div style={{ width: 44, height: 44, borderRadius: "50%", background: "rgba(255,255,255,0.25)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Icon name="award" size={22} color="#fff" />
                    </div>
                    <div style={{ flex: 1, textAlign: "left" }}>
                      <div style={{ fontWeight: 900, fontSize: 15, letterSpacing: "0.3px" }}>🚀 ¡Sube tu negocio de nivel!</div>
                      <div style={{ fontSize: 12, fontWeight: 600, opacity: 0.9, marginTop: 2 }}>Desbloquea fotos, WhatsApp, horarios y más</div>
                    </div>
                    <Icon name="chevron" size={18} color="#fff" />
                  </button>
                </>
              ) : (
                /* ── PREMIUM PLAN: all owner fields ── */
                <>
                  <div>
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: T.sub, textTransform: "uppercase", letterSpacing: .6, marginBottom: 8 }}>Tipo de Horario</div>
                      <select value={(addBizForm.schedule || {}).type || "regular"} onChange={e => setAddBizForm(f => ({ ...f, schedule: { ...(f.schedule || {}), type: e.target.value } }))} style={{ width: "100%", padding: 12, borderRadius: 12, border: `1.5px solid ${T.border}`, background: T.bg, color: T.text, fontSize: 14, outline: "none", fontWeight: 600 }}>
                        <option value="regular">Regular (Un turno por día)</option>
                        <option value="advanced">Avanzado (Múltiples turnos o clases)</option>
                        <option value="always_open">Siempre Abierto (24/7)</option>
                        <option value="appointment">Previa Cita / Servicio (Sin horario fijo)</option>
                        <option value="delivery">Solo a Domicilio / Para Llevar (Dark Kitchen)</option>
                      </select>
                    </div>

                    {(!addBizForm.schedule?.type || addBizForm.schedule?.type === "regular" || addBizForm.schedule?.type === "advanced" || addBizForm.schedule?.type === "delivery") && <div>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: T.sub, textTransform: "uppercase", letterSpacing: .6 }}>Horario por día</div>
                        <button type="button" onClick={() => {
                          const lun = (addBizForm.schedule || {}).lun || "";
                          if (!lun) return;
                          setAddBizForm(f => ({ ...f, schedule: { ...f.schedule, mar: lun, mie: lun, jue: lun, vie: lun, sab: lun, dom: lun } }));
                        }} style={{ fontSize: 10, fontWeight: 700, color: T.green, background: T.greenL, border: "none", padding: "4px 8px", borderRadius: 6, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}><Icon name="nav" size={10} /> Copiar Lunes a todos</button>
                      </div>
                      {[["lun","Lunes"],["mar","Martes"],["mie","Miércoles"],["jue","Jueves"],["vie","Viernes"],["sab","Sábado"],["dom","Domingo"]].map(([key, label]) => {
                        const raw = (addBizForm.schedule || {})[key] || "";
                        const closed = !raw || /cerrado/i.test(raw);
                        const isAdv = (addBizForm.schedule || {}).type === "advanced";
                        const toT24 = s => { const m = (s || "").trim().match(/(\d{1,2})(?:\s*:\s*(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)?/i); if (!m) return ""; let h = parseInt(m[1]); const mn = parseInt(m[2] || 0); const p = (m[3] || "").replace(/\./g, "").toLowerCase(); if (p === "pm" && h !== 12) h += 12; if (p === "am" && h === 12) h = 0; return `${String(h).padStart(2,"0")}:${String(mn).padStart(2,"0")}`; };
                        const to12h = s => { if(!s) return ""; let [h, m] = s.split(":"); h = parseInt(h); const p = h >= 12 ? "p.m." : "a.m."; h = h % 12 || 12; return `${String(h).padStart(2, "0")}:${m} ${p}`; };
                        const lines = closed ? [] : raw.split('\n').map(x => x.trim()).filter(Boolean);
                        const updateDay = (val) => { setAddBizForm(f => ({ ...f, schedule: { ...(f.schedule || {}), [key]: val } })); };
                        const updateRegular = (o, c) => updateDay(`${to12h(o)} - ${to12h(c)}`);
                        return <div key={key} style={{ display: "flex", alignItems: isAdv && !closed ? "flex-start" : "center", gap: 6, marginBottom: isAdv && !closed ? 8 : 6 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: T.text, width: 76, flexShrink: 0, marginTop: isAdv && !closed ? 8 : 0 }}>{label}</span>
                          <button type="button" onClick={() => closed ? updateDay(isAdv ? "09:00 a.m. - 02:00 p.m.\n04:00 p.m. - 08:00 p.m." : "09:00 a.m. - 10:00 p.m.") : updateDay("Cerrado")} style={{ padding: "5px 8px", border: `1.5px solid ${closed ? T.border : T.green}`, borderRadius: 8, fontSize: 10, fontWeight: 700, background: closed ? T.bg : T.greenL, color: closed ? T.sub : T.green, cursor: "pointer", fontFamily: "inherit", flexShrink: 0, marginTop: isAdv && !closed ? 3 : 0 }}>{closed ? "Cerrado" : "Abierto"}</button>
                          {!closed && !isAdv && (() => {
                            const segs = (lines[0] || "09:00 a.m. - 10:00 p.m.").split(/\s*[–\-]\s*|\s+a\s+/i);
                            return (
                              <div style={{ display: "flex", alignItems: "center", gap: 4, flex: 1 }}>
                                <input type="time" value={toT24(segs[0]) || "09:00"} onChange={e => updateRegular(e.target.value, toT24(segs[1]) || "22:00")} style={{ flex: 1, padding: "5px 4px", border: `1.5px solid ${T.border}`, borderRadius: 8, fontSize: 12, color: T.text, background: T.white, fontFamily: "inherit" }} />
                                <span style={{ fontSize: 10, color: T.sub }}>a</span>
                                <input type="time" value={toT24(segs[1]) || "22:00"} onChange={e => updateRegular(toT24(segs[0]) || "09:00", e.target.value)} style={{ flex: 1, padding: "5px 4px", border: `1.5px solid ${T.border}`, borderRadius: 8, fontSize: 12, color: T.text, background: T.white, fontFamily: "inherit" }} />
                              </div>
                            )
                          })()}
                          {!closed && isAdv && <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
                            {lines.map((line, idx) => {
                              const segs = line.split(/\s*[–\-]\s*|\s+a\s+/i);
                              const o = toT24(segs[0]) || "09:00";
                              const c = toT24(segs[1]) || "14:00";
                              return (
                                <div key={idx} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                  <input type="time" value={o} onChange={e => { const nl = [...lines]; nl[idx] = `${to12h(e.target.value)} - ${to12h(c)}`; updateDay(nl.join('\n')); }} style={{ flex: 1, padding: "5px 4px", border: `1.5px solid ${T.border}`, borderRadius: 8, fontSize: 12, color: T.text, background: T.white, fontFamily: "inherit" }} />
                                  <span style={{ fontSize: 10, color: T.sub }}>a</span>
                                  <input type="time" value={c} onChange={e => { const nl = [...lines]; nl[idx] = `${to12h(o)} - ${to12h(e.target.value)}`; updateDay(nl.join('\n')); }} style={{ flex: 1, padding: "5px 4px", border: `1.5px solid ${T.border}`, borderRadius: 8, fontSize: 12, color: T.text, background: T.white, fontFamily: "inherit" }} />
                                  <button type="button" onClick={() => { const nl = lines.filter((_, i) => i !== idx); if (!nl.length) updateDay("Cerrado"); else updateDay(nl.join('\n')); }} style={{ padding: "4px", background: "none", border: "none", color: T.red, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="x" size={14} /></button>
                                </div>
                              );
                            })}
                            {lines.length < 3 && (
                              <button type="button" onClick={() => { updateDay([...lines, "04:00 p.m. - 08:00 p.m."].join('\n')); }} style={{ background: "none", border: "none", color: T.green, fontSize: 11, fontWeight: 700, cursor: "pointer", padding: "4px 0", textAlign: "left", width: "max-content" }}>+ Añadir turno</button>
                            )}
                          </div>}
                        </div>;
                      })}
                    </div>}
                  </div>

                  <div style={{ height: 1, background: T.border, margin: "14px 0" }} />
                  <h4 style={{ color: "#C9A84C", fontSize: 14, fontWeight: 800, marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}><Icon name="star" size={16} color="#C9A84C" />Funciones Premium</h4>
                  
                  <div style={{ position: "relative" }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: T.sub, textTransform: "uppercase", letterSpacing: .6, marginBottom: 6 }}>WhatsApp Directo</div>
                    <input className="inp" placeholder="3110000000" value={addBizForm.whatsapp} onChange={e => setAddBizForm(f => ({ ...f, whatsapp: e.target.value }))} style={{ marginBottom: 12 }} />
                  </div>

                  <div style={{ position: "relative" }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: T.sub, textTransform: "uppercase", letterSpacing: .6, marginBottom: 6 }}>Sitio web / Menú</div>
                    <input className="inp" placeholder="https://..." value={addBizForm.website} onChange={e => setAddBizForm(f => ({ ...f, website: e.target.value }))} style={{ marginBottom: 12 }} />
                  </div>

                  <div style={{ marginTop: 8, padding: 16, background: "#FEF3C7", borderRadius: 16, border: "1px solid #FDE68A" }}>
                    <div style={{ fontSize: 15, fontWeight: 800, color: "#92400E", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                      <Icon name="star" size={16} color="#92400E" /> Funciones Premium
                    </div>
                    <div style={{ fontSize: 13, color: "#92400E", opacity: 0.8, marginBottom: 16 }}>Tu plan actual ({addBizForm.plan || "free"}) incluye funciones adicionales.</div>
                    
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#92400E", marginBottom: 8 }}>Logotipo en el Mapa (Sustituye al emoji)</div>
                      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                        <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#fff", border: "2px solid #FCD34D", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          {addBizForm.logo_url ? <img src={addBizForm.logo_url} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <Icon name="image" size={20} color="#FCD34D" />}
                        </div>
                        <div style={{ flex: 1 }}>
                          <Uploader aspect={1} label="Subir Logotipo" onDone={url => setAddBizForm(f => ({ ...f, logo_url: url }))} />
                        </div>
                      </div>
                    </div>
                    
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#92400E", marginBottom: 8 }}>Video Promocional (YouTube / TikTok)</div>
                      <input className="inp" placeholder="https://youtube.com/watch?v=..." value={addBizForm.video_url || ""} onChange={e => setAddBizForm(f => ({ ...f, video_url: e.target.value }))} style={{ marginBottom: 12, border: "1px solid #FCD34D", background: T.white }} />
                    </div>
                    
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#92400E", marginBottom: 8 }}>Redes Sociales</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.5)", padding: "8px 12px", borderRadius: 10 }}>
                          <Icon name="facebook" size={18} color="#1877F2" />
                          <input type="text" placeholder="Usuario o enlace de Facebook" value={addBizForm.facebook || ""} onChange={e => setAddBizForm(f => ({ ...f, facebook: e.target.value }))} style={{ flex: 1, border: "none", background: "transparent", outline: "none", fontSize: 13, color: "#92400E", fontFamily: "inherit" }} />
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.5)", padding: "8px 12px", borderRadius: 10 }}>
                          <Icon name="instagram" size={18} color="#E1306C" />
                          <input type="text" placeholder="Usuario de Instagram" value={addBizForm.instagram || ""} onChange={e => setAddBizForm(f => ({ ...f, instagram: e.target.value }))} style={{ flex: 1, border: "none", background: "transparent", outline: "none", fontSize: 13, color: "#92400E", fontFamily: "inherit" }} />
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.5)", padding: "8px 12px", borderRadius: 10 }}>
                          <Icon name="tiktok" size={18} color="#000" />
                          <input type="text" placeholder="Usuario de TikTok" value={addBizForm.tiktok || ""} onChange={e => setAddBizForm(f => ({ ...f, tiktok: e.target.value }))} style={{ flex: 1, border: "none", background: "transparent", outline: "none", fontSize: 13, color: "#92400E", fontFamily: "inherit" }} />
                        </div>
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#92400E", marginBottom: 8 }}>Menú Digital (Imágenes o PDF)</div>
                      <MenuManager 
                        menuPdfUrl={addBizForm.menu_pdf_url} 
                        onChange={(val) => setAddBizForm(f => ({ ...f, menu_pdf_url: val }))} 
                      />
                    </div>
                  </div>
                </>
              )}
            </>
          )}



          <button onClick={async () => {
            if (!addBizForm.name || !addBizForm.category || !addBizForm.city) { toast$("Nombre, categoría y ciudad son obligatorios"); return; }
            setAddBizLoading(true);
            try {
              const existingBiz = biz.find(b => b.id === editBizId);
              const isOwner = user && (existingBiz?.owner_id === user.id || existingBiz?.user_id === user.id || addBizForm.owner_id === user.id || addBizForm.user_id === user.id || addBizForm.is_owner);
              
              let newStatus = "pending";
              if (editBizId) {
                // Es una edición de un negocio existente
                if (addBizForm.status === "approved" || existingBiz?.status === "approved") {
                  newStatus = "approved"; // Si ya estaba aprobado, se queda aprobado (ej. dueños editando su perfil)
                }
              }
              const payload = { 
                name: addBizForm.name, 
                type: addBizForm.category, 
                category: addBizForm.category, 
                emoji: null, 
                description: addBizForm.description, 
                address: addBizForm.address, 
                city_slug: addBizForm.city ? addBizForm.city.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') : activeCity, 
                phone: addBizForm.phone, 
                whatsapp: addBizForm.whatsapp, 
                website: addBizForm.website, 
                video_url: addBizForm.video_url || null,
                logo_url: addBizForm.logo_url || null,
                lat: addBizForm.lat || null, 
                lng: addBizForm.lng || null, 
                schedule: addBizForm.schedule || {}, 
                social_links: {
                  facebook: addBizForm.facebook || null,
                  instagram: addBizForm.instagram || null,
                  tiktok: addBizForm.tiktok || null
                },
                menu_pdf_url: addBizForm.menu_pdf_url || null,
                booking_config: addBizForm.booking_config || null,
                photos: (addBizForm.photos || []).map(url => ({ url })), 
                status: newStatus 
              };
              if (editBizId) { 
                await sb.patch("businesses", editBizId, payload); 
                setBiz(prev => prev.map(x => x.id === editBizId ? { ...x, ...payload } : x));
              } else { 
                await sb.post("businesses", { ...payload, plan: "free", user_id: user.id }); 
              }
              toast$(editBizId ? (isOwner ? "Perfil actualizado" : "Solicitud actualizada") : "Solicitud enviada para revisión");
              if (isOwner && newStatus === "approved") { 
                loadPaginatedBiz(true); 
                loadMapPins(activeCity); 
              }
              setShowAddBiz(false); setEditBizId(null);
              setAddBizForm({ name: "", category: "", city: "", description: "", address: "", phone: "", whatsapp: "", website: "", video_url: "", logo_url: "", lat: "", lng: "", photos: [], facebook: "", instagram: "", tiktok: "", schedule: {} });
              await loadMyBiz(user?.id);
            } catch(e) { toast$("Error: " + e.message); } finally { setAddBizLoading(false); }
          }} style={{ padding: 15, background: addBizLoading ? T.sub : T.green, border: "none", borderRadius: 14, fontSize: 15, fontWeight: 800, color: "#fff", cursor: "pointer", fontFamily: "inherit" }}>
            {addBizLoading ? "Guardando..." : editBizId ? (biz.find(b => b.id === editBizId)?.owner_id === user?.id ? "Guardar cambios" : "Actualizar y reenviar") : "Enviar para revisión"}
          </button>
        </div>
      </div>
    </div>
  );
}

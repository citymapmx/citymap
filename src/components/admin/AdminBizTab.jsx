import React from 'react';
import Icon from '../ui/Icon';
import Uploader from '../Uploader';
import MenuManager from '../MenuManager';
import BookingManager from '../BookingManager';
import FI from './FI';
import { PLAN_META } from '../../lib/constants';

export default function AdminBizTab({
  data,
  bizForm,
  setBizForm,
  bizSearch,
  setBizSearch,
  bizTypeFilter,
  setBizTypeFilter,
  bizCityFilter,
  setBizCityFilter,
  setAnalyticsTarget,
  setTab,
  setMediaTarget,
  onOpenStoreAdmin,
  delBiz,
  geo,
  saveBiz,
  saving,
  T
}) {
  return (
    <>
      {!bizForm && <div>
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
      {bizForm && <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
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
    </>
  );
}

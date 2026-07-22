import React from 'react';
import Icon from '../ui/Icon';
import Uploader from '../Uploader';
import FI from './FI';
import { getEventStatus, createSlug } from '../../lib/utils.js';

export default function AdminEventsTab({
  data,
  evForm,
  setEvForm,
  sb,
  load,
  onToast,
  saving,
  setSaving
}) {
  return (
    <>
      {!evForm && <div>
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
      
      {evForm && <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
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
    </>
  );
}

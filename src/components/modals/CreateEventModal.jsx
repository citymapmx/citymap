import React, { useState } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { useDataStore } from '../../store/useDataStore';
import { useUIStore } from '../../store/useUIStore';
import { sb } from '../../lib/supabase';
import { getT } from '../../lib/constants';
import { createSlug } from '../../lib/utils';
import Icon from '../ui/Icon';
import Uploader from '../Uploader';

export default function CreateEventModal({ showCreateEvent, setShowCreateEvent }) {
  const { user } = useAuthStore();
  const { events } = useDataStore();
  const { activeCity, dark, toast$ } = useUIStore();
  
  const T = getT(dark);

  const [createEvForm, setCreateEvForm] = useState({ 
    title: "", description: "", date: "", time: "", 
    end_date: "", end_time: "", price_type: "gratis", price: "", 
    event_category: "", venue_name: "", venue_address: "", 
    whatsapp: "", website: "", img_url: "" 
  });

  if (!showCreateEvent) return null;

  return (
    <div className="ov" onClick={() => setShowCreateEvent(false)}>
      <div className="sh" style={{ maxHeight: "92vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
        <div style={{ width: 36, height: 4, borderRadius: 2, background: T.border, margin: "0 auto 16px" }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
          <div>
            <h2 className="text-xl" style={{ fontFamily: "'Coolvetica', sans-serif", color: T.text, marginBottom: 4 }}>Crear evento</h2>
            <p className="text-sm" style={{ color: T.sub }}>Se publicará tras la aprobación del admin</p>
          </div>
          <button onClick={() => setShowCreateEvent(false)} style={{ width: 44, height: 44, borderRadius: "50%", background: T.border, color: T.text, border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}><Icon name="x" size={18} /></button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <div className="text-xs" style={{ fontWeight: 700, color: T.sub, textTransform: "uppercase", letterSpacing: .6, marginBottom: 6 }}>Imagen del evento</div>
            <Uploader onDone={url => setCreateEvForm(f => ({ ...f, img_url: url }))} />
            {createEvForm.img_url && <img src={createEvForm.img_url} alt="" style={{ width: "100%", height: 110, objectFit: "cover", borderRadius: 10, marginTop: 8 }} loading="lazy" />}
          </div>
          <div><div className="text-xs" style={{ fontWeight: 700, color: T.sub, textTransform: "uppercase", letterSpacing: .6, marginBottom: 6 }}>Título</div><input className="inp" placeholder="Nombre del evento" value={createEvForm.title} onChange={e => setCreateEvForm(f => ({ ...f, title: e.target.value }))} /></div>
          <div><div className="text-xs" style={{ fontWeight: 700, color: T.sub, textTransform: "uppercase", letterSpacing: .6, marginBottom: 6 }}>Descripción</div><textarea className="inp" placeholder="Describe el evento..." rows={3} value={createEvForm.description} onChange={e => setCreateEvForm(f => ({ ...f, description: e.target.value }))} style={{ resize: "none", height: 80 }} /></div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div><div className="text-xs" style={{ fontWeight: 700, color: T.sub, textTransform: "uppercase", letterSpacing: .6, marginBottom: 6 }}>Fecha de inicio</div><input type="date" value={createEvForm.date} onChange={e => setCreateEvForm(f => ({ ...f, date: e.target.value }))} style={{ width: "100%", padding: "12px 14px", background: T.white, border: `1.5px solid ${T.border}`, borderRadius: 12, fontSize: 14, color: T.text, fontFamily: "inherit" }} /></div>
            <div><div className="text-xs" style={{ fontWeight: 700, color: T.sub, textTransform: "uppercase", letterSpacing: .6, marginBottom: 6 }}>Hora de inicio</div><input type="time" value={createEvForm.time} onChange={e => setCreateEvForm(f => ({ ...f, time: e.target.value }))} style={{ width: "100%", padding: "12px 14px", background: T.white, border: `1.5px solid ${T.border}`, borderRadius: 12, fontSize: 14, color: T.text, fontFamily: "inherit" }} /></div>
            <div><div className="text-xs" style={{ fontWeight: 700, color: T.sub, textTransform: "uppercase", letterSpacing: .6, marginBottom: 6 }}>Fecha de fin <span className="text-micro" style={{ opacity: 0.6 }}>(Opcional)</span></div><input type="date" value={createEvForm.end_date} onChange={e => setCreateEvForm(f => ({ ...f, end_date: e.target.value }))} style={{ width: "100%", padding: "12px 14px", background: T.white, border: `1.5px solid ${T.border}`, borderRadius: 12, fontSize: 14, color: T.text, fontFamily: "inherit" }} /></div>
            <div><div className="text-xs" style={{ fontWeight: 700, color: T.sub, textTransform: "uppercase", letterSpacing: .6, marginBottom: 6 }}>Hora de fin <span className="text-micro" style={{ opacity: 0.6 }}>(Opcional)</span></div><input type="time" value={createEvForm.end_time} onChange={e => setCreateEvForm(f => ({ ...f, end_time: e.target.value }))} style={{ width: "100%", padding: "12px 14px", background: T.white, border: `1.5px solid ${T.border}`, borderRadius: 12, fontSize: 14, color: T.text, fontFamily: "inherit" }} /></div>
          </div>
          <div><div className="text-xs" style={{ fontWeight: 700, color: T.sub, textTransform: "uppercase", letterSpacing: .6, marginBottom: 8 }}>Precio</div>
            <div style={{ display: "flex", gap: 8 }}>
              {["gratis", "paid"].map(pt => <button key={pt} onClick={() => setCreateEvForm(f => ({ ...f, price_type: pt }))} style={{ flex: 1, padding: "10px 0", border: `1.5px solid ${createEvForm.price_type === pt ? T.green : T.border}`, borderRadius: 10, fontSize: 13, fontWeight: 700, background: createEvForm.price_type === pt ? T.greenL : T.white, color: createEvForm.price_type === pt ? T.green : T.sub, cursor: "pointer", fontFamily: "inherit" }}>{pt === "gratis" ? "Gratis" : "De pago"}</button>)}
            </div>
            {createEvForm.price_type === "paid" && <input className="inp" placeholder="Ej: $200" value={createEvForm.price} onChange={e => setCreateEvForm(f => ({ ...f, price: e.target.value }))} style={{ marginTop: 8 }} />}
          </div>
          <div><div className="text-xs" style={{ fontWeight: 700, color: T.sub, textTransform: "uppercase", letterSpacing: .6, marginBottom: 6 }}>Categoría</div>
            <input className="inp" placeholder="Ej: Concierto" value={createEvForm.event_category || ""} onChange={e => setCreateEvForm(f => ({ ...f, event_category: e.target.value }))} />
          </div>
          <div><div className="text-xs" style={{ fontWeight: 700, color: T.sub, textTransform: "uppercase", letterSpacing: .6, marginBottom: 6 }}>Nombre del lugar</div><input className="inp" placeholder="Club 24, Tepic Centro..." value={createEvForm.venue_name} onChange={e => setCreateEvForm(f => ({ ...f, venue_name: e.target.value }))} /></div>
          <div><div className="text-xs" style={{ fontWeight: 700, color: T.sub, textTransform: "uppercase", letterSpacing: .6, marginBottom: 6 }}>Dirección</div><input className="inp" placeholder="Av. México 123..." value={createEvForm.venue_address} onChange={e => setCreateEvForm(f => ({ ...f, venue_address: e.target.value }))} /></div>
          <div><div className="text-xs" style={{ fontWeight: 700, color: T.sub, textTransform: "uppercase", letterSpacing: .6, marginBottom: 6 }}>WhatsApp de contacto</div><input className="inp" placeholder="3111234567" value={createEvForm.whatsapp} onChange={e => setCreateEvForm(f => ({ ...f, whatsapp: e.target.value }))} /></div>
          <div><div className="text-xs" style={{ fontWeight: 700, color: T.sub, textTransform: "uppercase", letterSpacing: .6, marginBottom: 6 }}>Sitio web / Boletos <span className="text-micro" style={{ opacity: 0.6 }}>(Opcional)</span></div><input className="inp" placeholder="https://..." value={createEvForm.website || ""} onChange={e => setCreateEvForm(f => ({ ...f, website: e.target.value }))} /></div>
          <button onClick={async () => { 
            if (!createEvForm.title) { toast$("El título es obligatorio"); return; } 
            try { 
              let baseSlug = createSlug(createEvForm.title);
              if (!baseSlug.startsWith(activeCity + "-")) baseSlug = `${activeCity}-${baseSlug}`;
              let newSlug = baseSlug;
              let counter = 1;
              while (events.some(e => e.slug === newSlug)) { newSlug = `${baseSlug}-${counter++}`; }
              
              await sb.post("events", { ...createEvForm, slug: newSlug, city_slug: activeCity, user_id: user.id, status: "pending", active: false }); 
              toast$("Evento enviado para revisión"); 
              setShowCreateEvent(false); 
              setCreateEvForm({ title: "", description: "", date: "", time: "", end_date: "", end_time: "", price_type: "gratis", price: "", event_category: "", venue_name: "", venue_address: "", whatsapp: "", website: "", img_url: "" }); 
            } catch(e) { 
              toast$("Error: " + e.message); 
            } 
          }} style={{ padding: 15, background: T.green, border: "none", borderRadius: 14, fontSize: 15, fontWeight: 800, color: "#fff", cursor: "pointer", fontFamily: "inherit" }}>Enviar evento</button>
        </div>
      </div>
    </div>
  );
}

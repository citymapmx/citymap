import React, { useState } from 'react';
import Icon from '../ui/Icon';
import FI from './FI';
import Uploader from '../Uploader';

export default function AdminCitiesTab({
  data,
  cityForm,
  setCityForm,
  sb,
  load,
  onToast,
  saving,
  setSaving
}) {
  const [cityEditId, setCityEditId] = useState(null);
  
  return (
    <>
      {!cityForm && <div>
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
              <button onClick={() => setCityEditId(cityEditId === c.id ? null : c.id)} style={{ background: cityEditId === c.id ? "#1A7A5E" : "#EAF4F0", border: "none", borderRadius: 8, padding: "7px 10px", cursor: "pointer", fontSize: 11, fontWeight: 700, color: cityEditId === c.id ? "#fff" : "#1A7A5E", fontFamily: "inherit" }}>Imagen</button>
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

      {cityForm && <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
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
    </>
  );
}

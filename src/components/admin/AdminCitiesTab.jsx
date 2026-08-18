import React, { useState } from 'react';
import Icon from '../ui/Icon';
import FI from './FI';
import Uploader from '../Uploader';
import OptimizedImage from '../ui/OptimizedImage';
import { cloudDelete } from '../../lib/supabase.js';
import { COUNTRY_NAMES, COUNTRY_FLAGS } from '../../lib/domain.js';

export default function AdminCitiesTab({
  data,
  sb,
  load,
  onToast
}) {
  const [cityForm, setCityForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [cityEditId, setCityEditId] = useState(null);
  
  return (
    <>
      {!cityForm && <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <p className="text-lg" style={{ fontFamily: "var(--heading)", color: "#0F1A14", margin: 0 }}>Ciudades activas</p>
          <button onClick={() => setCityForm({ _new: true, name: "", slug: "", state: "", active: true, metro_zone: "", country_code: "mx" })} style={{ background: "#1A7A5E", color: "#fff", border: "none", borderRadius: 10, padding: "9px 14px", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 5 }}><Icon name="plus" size={14} color="#fff" /> Nueva</button>
        </div>
        {data.cities.map(c => <div key={c.id} style={{ background: "#fff", borderRadius: 12, marginBottom: 10, boxShadow: "0 2px 8px rgba(0,0,0,.05)", overflow: "hidden" }}>
          <div style={{ padding: "12px 14px", display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: "#E4E8E4", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
              {c.bg_image ? <img src={c.bg_image} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <Icon name="map_svg" size={20} color="#5A6872" />}
            </div>
            <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: "#0F1A14" }}>{c.name}</span>
              <span style={{ fontSize: 13, color: "#5A6872" }}>/{c.slug} {c.state?.includes(";") ? `(Agrupado con: ${c.state.split(";")[1]})` : ""}</span>
            </div>
            <div style={{ display: "flex", gap: 5 }}>
              <button onClick={() => setCityForm({ ...c, state: c.state?.split(";")[0], metro_zone: c.state?.split(";")[1] || "", country_code: c.country_code || "mx" })} style={{ background: "#EAF4F0", border: "none", borderRadius: 8, padding: "7px 9px", cursor: "pointer" }}><Icon name="edit" size={13} color="#1A7A5E" /></button>
              <button onClick={() => setCityEditId(cityEditId === c.id ? null : c.id)} style={{ background: cityEditId === c.id ? "#1A7A5E" : "#EAF4F0", border: "none", borderRadius: 8, padding: "7px 10px", cursor: "pointer", fontSize: 11, fontWeight: 700, color: cityEditId === c.id ? "#fff" : "#1A7A5E", fontFamily: "inherit" }}>Imagen</button>
              <button onClick={async () => { await sb.patch("cities", c.id, { active: !c.active }); onToast(c.active ? "Ciudad desactivada" : "Ciudad activada"); await load(); }} style={{ background: c.active ? "#EAF4F0" : "#FEE2E2", border: "none", borderRadius: 8, padding: "7px 10px", cursor: "pointer", fontSize: 11, fontWeight: 700, color: c.active ? "#1A7A5E" : "#D94F3D", fontFamily: "inherit" }}>{c.active ? "Activa" : "Inactiva"}</button>
            </div>
          </div>
          {cityEditId === c.id && <div style={{ borderTop: "1px solid #EAF4F0", padding: "12px 14px", background: "#F8FFFE" }}>
            <Uploader label="Subir imagen de fondo" onDone={async url => { await sb.patch("cities", c.id, { bg_image: url }); onToast("Imagen guardada"); await load(); setCityEditId(null); }} />
            {c.bg_image && <div style={{ marginTop: 8, borderRadius: 8, overflow: "hidden", height: 64, position: "relative" }}>
              <OptimizedImage src={c.bg_image} widthRequest={800} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              <button onClick={async () => { if (c.bg_image) await cloudDelete(c.bg_image); await sb.patch("cities", c.id, { bg_image: null }); onToast("Imagen eliminada"); await load(); setCityEditId(null); }} style={{ position: "absolute", top: 6, right: 6, background: "#D94F3D", border: "none", borderRadius: 6, padding: "4px 8px", fontSize: 11, fontWeight: 700, color: "#fff", cursor: "pointer", fontFamily: "inherit" }}>Quitar</button>
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
          <FI label="Agrupar con ciudad (escribe el slug de la ciudad vecina, ej. tepic)" field="metro_zone" src={cityForm} set={setCityForm} />
          <FI label="Estado (Ej. Nayarit)" field="state" src={cityForm} set={setCityForm} />
          <div>
            <label className="text-xs" style={{ fontWeight: 700, color: "#5A6872", textTransform: "uppercase", letterSpacing: .8, display: "block", marginBottom: 4 }}>País</label>
            <select
              value={cityForm.country_code || "mx"}
              onChange={e => setCityForm(f => ({ ...f, country_code: e.target.value }))}
              style={{ width: "100%", padding: "10px 12px", border: "1.5px solid #E4E8E4", borderRadius: 10, fontSize: 13, color: "#0F1A14", background: "#fff", fontFamily: "inherit" }}
            >
              {Object.entries(COUNTRY_NAMES).map(([code, name]) => (
                <option key={code} value={code}>{COUNTRY_FLAGS[code]} {name}</option>
              ))}
            </select>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
            <button onClick={() => setCityForm(null)} style={{ flex: 1, padding: 14, background: "#fff", border: "1.5px solid #E4E8E4", borderRadius: 12, fontWeight: 700, fontSize: 15, color: "#5A6872", cursor: "pointer", fontFamily: "inherit" }}>Cancelar</button>
            <button onClick={async () => {
              setSaving(true);
              try {
                const encodedState = cityForm.metro_zone ? `${cityForm.state};${cityForm.metro_zone}` : cityForm.state;
                const payload = { name: cityForm.name, slug: cityForm.slug, state: encodedState, active: cityForm.active, country_code: cityForm.country_code || "mx" };
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

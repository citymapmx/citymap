import React from 'react';
import Icon from '../ui/Icon';
import Uploader from '../Uploader';

export default function AdminCategoriesTab({
  data,
  catForm,
  setCatForm,
  sb,
  load,
  onToast,
  saving,
  setSaving
}) {
  return (
    <>
      {!catForm && <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <p className="text-lg" style={{ fontFamily: "'Coolvetica', sans-serif", color: "#0F1A14", margin: 0 }}>Categorías</p>
          <button onClick={() => setCatForm({ _new: true, name: "", slug: "", icon: "", img_url: "", subtitle: "", sort_order: data.categories.length + 1, active: true })} style={{ background: "#1A7A5E", color: "#fff", border: "none", borderRadius: 10, padding: "9px 14px", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 5 }}><Icon name="plus" size={14} color="#fff" /> Nueva</button>
        </div>
        {catForm && <div style={{ background: "#fff", borderRadius: 14, padding: 16, marginBottom: 14, boxShadow: "0 2px 8px rgba(0,0,0,.05)", display: "flex", flexDirection: "column", gap: 10 }}>
          <div className="text-sm" style={{ fontWeight: 800, color: "#0F1A14" }}>{catForm._new ? "Nueva categoría" : "Editar: " + catForm.name}</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label className="text-xs" style={{ fontWeight: 700, color: "#5A6872", textTransform: "uppercase", letterSpacing: .8, display: "block", marginBottom: 4 }}>Nombre</label>
              <input value={catForm.name} onChange={e => setCatForm(f => ({ ...f, name: e.target.value }))} placeholder="Restaurantes" style={{ width: "100%", padding: "10px 12px", border: "1.5px solid #E4E8E4", borderRadius: 10, fontSize: 13, color: "#0F1A14", background: "#fff", fontFamily: "inherit" }} />
            </div>
            <div>
              <label className="text-xs" style={{ fontWeight: 700, color: "#5A6872", textTransform: "uppercase", letterSpacing: .8, display: "block", marginBottom: 4 }}>Slug</label>
              <input value={catForm.slug} onChange={e => setCatForm(f => ({ ...f, slug: e.target.value }))} placeholder="restaurantes" style={{ width: "100%", padding: "10px 12px", border: "1.5px solid #E4E8E4", borderRadius: 10, fontSize: 13, color: "#0F1A14", background: "#fff", fontFamily: "inherit" }} />
            </div>
            <div>
              <label className="text-xs" style={{ fontWeight: 700, color: "#5A6872", textTransform: "uppercase", letterSpacing: .8, display: "block", marginBottom: 4 }}>Icono (emoji)</label>
              <input value={catForm.icon} onChange={e => setCatForm(f => ({ ...f, icon: e.target.value }))} placeholder="Pega un emoji" style={{ width: "100%", padding: "10px 12px", border: "1.5px solid #E4E8E4", borderRadius: 10, fontSize: 22, color: "#0F1A14", background: "#fff", fontFamily: "inherit" }} />
            </div>
            <div>
              <label className="text-xs" style={{ fontWeight: 700, color: "#5A6872", textTransform: "uppercase", letterSpacing: .8, display: "block", marginBottom: 4 }}>Subtítulo (Opcional)</label>
              <input value={catForm.subtitle || ""} onChange={e => setCatForm(f => ({ ...f, subtitle: e.target.value }))} placeholder="Para todos los antojos" style={{ width: "100%", padding: "10px 12px", border: "1.5px solid #E4E8E4", borderRadius: 10, fontSize: 13, color: "#0F1A14", background: "#fff", fontFamily: "inherit" }} />
            </div>
            <div>
              <label className="text-xs" style={{ fontWeight: 700, color: "#5A6872", textTransform: "uppercase", letterSpacing: .8, display: "block", marginBottom: 4 }}>Orden</label>
              <input type="number" value={catForm.sort_order} onChange={e => setCatForm(f => ({ ...f, sort_order: parseInt(e.target.value) || 1 }))} style={{ width: "100%", padding: "10px 12px", border: "1.5px solid #E4E8E4", borderRadius: 10, fontSize: 13, color: "#0F1A14", background: "#fff", fontFamily: "inherit" }} />
            </div>
          </div>
          <div>
            <div className="text-xs" style={{ fontWeight: 700, color: "#5A6872", textTransform: "uppercase", letterSpacing: .8, marginBottom: 6 }}>Imagen de fondo (Opcional)</div>
            <Uploader onDone={url => setCatForm(f => ({ ...f, img_url: url }))} />
            {catForm.img_url && <img src={catForm.img_url} alt="" style={{ width: "100%", height: 100, objectFit: "cover", borderRadius: 8, marginTop: 8 }} loading="lazy" />}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setCatForm(null)} style={{ flex: 1, padding: 12, background: "#fff", border: "1.5px solid #E4E8E4", borderRadius: 12, fontWeight: 700, fontSize: 14, color: "#5A6872", cursor: "pointer", fontFamily: "inherit" }}>Cancelar</button>
            <button onClick={async () => { setSaving(true); try { const p = { name: catForm.name, slug: catForm.slug, icon: catForm.icon, img_url: catForm.img_url || null, subtitle: catForm.subtitle || null, sort_order: catForm.sort_order, active: catForm.active ?? true }; if (catForm._new) await sb.post("categories", p); else await sb.patch("categories", catForm.id, p); onToast("Guardado"); setCatForm(null); await load(); } catch(e) { onToast("Error: " + e.message); } finally { setSaving(false); } }} disabled={saving || !catForm.name || !catForm.slug} style={{ flex: 2, padding: 12, background: saving || !catForm.name || !catForm.slug ? "#9CA3AF" : "#1A7A5E", border: "none", borderRadius: 12, fontWeight: 700, fontSize: 14, color: "#fff", cursor: "pointer", fontFamily: "inherit" }}>{saving ? "Guardando..." : catForm._new ? "Crear" : "Guardar"}</button>
          </div>
        </div>}
        {[...data.categories].sort((a, b) => a.sort_order - b.sort_order).map((c, i, arr) => <div key={c.id} style={{ background: "#fff", borderRadius: 12, padding: "12px 14px", marginBottom: 10, display: "flex", alignItems: "center", gap: 10, boxShadow: "0 2px 8px rgba(0,0,0,.05)" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <button onClick={async () => { if (i === 0) return; const prev = arr[i-1]; await Promise.all([sb.patch("categories", c.id, { sort_order: prev.sort_order }), sb.patch("categories", prev.id, { sort_order: c.sort_order })]); await load(); }} style={{ background: "none", border: "none", cursor: i === 0 ? "default" : "pointer", padding: "1px 3px", opacity: i === 0 ? 0.2 : 1 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#5A6872" strokeWidth="2.5"><polyline points="18 15 12 9 6 15"/></svg>
            </button>
            <button onClick={async () => { if (i === arr.length-1) return; const next = arr[i+1]; await Promise.all([sb.patch("categories", c.id, { sort_order: next.sort_order }), sb.patch("categories", next.id, { sort_order: c.sort_order })]); await load(); }} style={{ background: "none", border: "none", cursor: i === arr.length-1 ? "default" : "pointer", padding: "1px 3px", opacity: i === arr.length-1 ? 0.2 : 1 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#5A6872" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>
            </button>
          </div>
          <div className="text-xl" style={{ width: 36, height: 36, borderRadius: 10, background: "#EAF4F0", display: "flex", alignItems: "center", justifyContent: "center" }}>{c.icon}</div>
          <div style={{ flex: 1 }}>
            <div className="text-sm" style={{ fontWeight: 700, color: "#0F1A14" }}>{c.name}</div>
            <div className="text-xs" style={{ color: "#5A6872", marginTop: 1 }}>/{c.slug} · orden {c.sort_order}</div>
          </div>
          <div style={{ display: "flex", gap: 5 }}>
            <button onClick={() => setCatForm({ ...c })} style={{ background: "#EAF4F0", border: "none", borderRadius: 8, padding: "7px 9px", cursor: "pointer" }}><Icon name="edit" size={13} color="#1A7A5E" /></button>
            <button onClick={async () => { await sb.patch("categories", c.id, { active: !c.active }); onToast("Actualizado"); await load(); }} style={{ background: c.active ? "#EAF4F0" : "#FEE2E2", border: "none", borderRadius: 8, padding: "7px 10px", cursor: "pointer", fontSize: 11, fontWeight: 700, color: c.active ? "#1A7A5E" : "#D94F3D", fontFamily: "inherit" }}>{c.active ? "Activa" : "Inactiva"}</button>
          </div>
        </div>)}
      </div>}
    </>
  );
}

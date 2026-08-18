import React, { useState } from 'react';
import Icon from '../ui/Icon';
import Uploader from '../Uploader';
import OptimizedImage from '../ui/OptimizedImage';
import { useDataStore } from '../../store/useDataStore.js';

export default function AdminCategoriesTab({
  data,
  sb,
  load,
  onToast
}) {
  const [catForm, setCatForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const { loadData } = useDataStore();

  // Helper to open form
  const openForm = (c) => {
    if (!c) {
      setCatForm({ _new: true, name: "", slug: "", icon: "", img_url: "", subtitle: "", sort_order: data.categories.length + 1, active: true, is_global: true, selected_cities: [] });
    } else {
      // Determine if global by checking if there are city_categories entries (NOT by is_global column)
      const existingCityLinks = (data.city_categories || []).filter(cc => cc.category_slug === c.slug);
      const isGlobal = existingCityLinks.length === 0;
      const selectedCities = existingCityLinks.map(cc => cc.city_slug);
      setCatForm({ ...c, is_global: isGlobal, selected_cities: selectedCities });
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const p = { 
        name: catForm.name, 
        slug: catForm.slug, 
        icon: catForm.icon, 
        img_url: catForm.img_url || null, 
        subtitle: catForm.subtitle || null, 
        sort_order: catForm.sort_order, 
        active: catForm.active ?? true
        // Note: is_global column NOT included — filtering is done via city_categories table
      };
      
      // Save category
      if (catForm._new) {
        await sb.post("categories", p);
      } else {
        await sb.patch("categories", catForm.id, p);
      }
      
      // Manage city_categories if not global
      if (!catForm.is_global) {
        // First delete all existing links for this category
        await sb.delWhere("city_categories", "category_slug", catForm.slug);
        
        // Insert each selected city one by one (safer than bulk)
        if (catForm.selected_cities && catForm.selected_cities.length > 0) {
          for (const citySlug of catForm.selected_cities) {
            await sb.post("city_categories", { city_slug: citySlug, category_slug: catForm.slug });
          }
        }
      } else {
        // If it is global, delete any specific links just in case
        await sb.delWhere("city_categories", "category_slug", catForm.slug);
      }

      onToast("Guardado");
      setCatForm(null);
      await load();
      // Refresh global store so filteredCats updates immediately in all views
      loadData();
    } catch(e) {
      onToast("Error: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <p className="text-lg" style={{ fontFamily: "var(--heading)", color: "#0F1A14", margin: 0 }}>Categorías</p>
        {!catForm && <button onClick={() => openForm(null)} style={{ background: "#1A7A5E", color: "#fff", border: "none", borderRadius: 10, padding: "9px 14px", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 5 }}><Icon name="plus" size={14} color="#fff" /> Nueva</button>}
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
              <input value={catForm.icon || ""} onChange={e => setCatForm(f => ({ ...f, icon: e.target.value }))} placeholder="Pega un emoji" style={{ width: "100%", padding: "10px 12px", border: "1.5px solid #E4E8E4", borderRadius: 10, fontSize: 22, color: "#0F1A14", background: "#fff", fontFamily: "inherit" }} />
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
          
          <div style={{ marginTop: 8 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
              <input type="checkbox" checked={catForm.is_global} onChange={e => setCatForm(f => ({ ...f, is_global: e.target.checked }))} />
              <span className="text-sm" style={{ fontWeight: 600, color: "#0F1A14" }}>Categoría Global (visible en todas las ciudades)</span>
            </label>
          </div>
          
          {!catForm.is_global && (
            <div style={{ background: "#F9FAFB", padding: 12, borderRadius: 10, border: "1px solid #E5E7EB", marginTop: 4 }}>
              <div className="text-xs" style={{ fontWeight: 700, color: "#5A6872", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>Selecciona las ciudades donde será visible:</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {data.cities.map(city => (
                  <label key={city.slug} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 13, color: "#374151", fontWeight: 500 }}>
                    <input 
                      type="checkbox" 
                      checked={(catForm.selected_cities || []).includes(city.slug)} 
                      onChange={e => {
                        const checked = e.target.checked;
                        setCatForm(f => ({
                          ...f, 
                          selected_cities: checked 
                            ? [...(f.selected_cities || []), city.slug] 
                            : (f.selected_cities || []).filter(s => s !== city.slug)
                        }));
                      }} 
                    />
                    {city.name}
                  </label>
                ))}
              </div>
            </div>
          )}

          <div>
            <div className="text-xs" style={{ fontWeight: 700, color: "#5A6872", textTransform: "uppercase", letterSpacing: .8, marginBottom: 6 }}>Imagen de fondo (Opcional)</div>
            <Uploader onDone={url => setCatForm(f => ({ ...f, img_url: url }))} />
            {catForm.img_url && <OptimizedImage src={catForm.img_url} widthRequest={400} alt="" style={{ width: "100%", height: 100, objectFit: "cover", borderRadius: 8, marginTop: 8 }} />}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setCatForm(null)} style={{ flex: 1, padding: 12, background: "#fff", border: "1.5px solid #E4E8E4", borderRadius: 12, fontWeight: 700, fontSize: 14, color: "#5A6872", cursor: "pointer", fontFamily: "inherit" }}>Cancelar</button>
            <button onClick={handleSave} disabled={saving || !catForm.name || !catForm.slug} style={{ flex: 2, padding: 12, background: saving || !catForm.name || !catForm.slug ? "#9CA3AF" : "#1A7A5E", border: "none", borderRadius: 12, fontWeight: 700, fontSize: 14, color: "#fff", cursor: "pointer", fontFamily: "inherit" }}>{saving ? "Guardando..." : catForm._new ? "Crear" : "Guardar"}</button>
          </div>
      </div>}
      {!catForm && [...data.categories].sort((a, b) => a.sort_order - b.sort_order).map((c, i, arr) => <div key={c.id} style={{ background: "#fff", borderRadius: 12, padding: "12px 14px", marginBottom: 10, display: "flex", alignItems: "center", gap: 10, boxShadow: "0 2px 8px rgba(0,0,0,.05)" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <button onClick={async () => { if (i === 0) return; const prev = arr[i-1]; await Promise.all([sb.patch("categories", c.id, { sort_order: prev.sort_order }), sb.patch("categories", prev.id, { sort_order: c.sort_order })]); await load(); }} style={{ background: "none", border: "none", cursor: i === 0 ? "default" : "pointer", padding: "1px 3px", opacity: i === 0 ? 0.2 : 1 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#5A6872" strokeWidth="2.5"><polyline points="18 15 12 9 6 15"/></svg>
            </button>
            <button onClick={async () => { if (i === arr.length-1) return; const next = arr[i+1]; await Promise.all([sb.patch("categories", c.id, { sort_order: next.sort_order }), sb.patch("categories", next.id, { sort_order: c.sort_order })]); await load(); }} style={{ background: "none", border: "none", cursor: i === arr.length-1 ? "default" : "pointer", padding: "1px 3px", opacity: i === arr.length-1 ? 0.2 : 1 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#5A6872" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>
            </button>
          </div>
          {(() => {
            let cleanIcon = typeof c.icon === 'string' ? c.icon.trim() : c.icon;
            let isImg = typeof cleanIcon === 'string' && (cleanIcon.toLowerCase().endsWith('.svg') || cleanIcon.toLowerCase().endsWith('.png'));
            return (
              <div className="text-xl" style={{ width: 36, height: 36, borderRadius: 10, background: "#EAF4F0", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {isImg ? <img src={`/${cleanIcon}`} style={{ width: 20, height: 20, objectFit: "contain" }} alt="" /> : cleanIcon}
              </div>
            );
          })()}
          <div style={{ flex: 1 }}>
            <div className="text-sm" style={{ fontWeight: 700, color: "#0F1A14" }}>{c.name}</div>
            <div className="text-xs" style={{ color: "#5A6872", marginTop: 1 }}>/{c.slug} · orden {c.sort_order}</div>
          </div>
          <div style={{ display: "flex", gap: 5 }}>
            <button onClick={() => openForm(c)} style={{ background: "#EAF4F0", border: "none", borderRadius: 8, padding: "7px 9px", cursor: "pointer" }}><Icon name="edit" size={13} color="#1A7A5E" /></button>
            <button onClick={async () => { await sb.patch("categories", c.id, { active: !c.active }); onToast("Actualizado"); await load(); }} style={{ background: c.active ? "#EAF4F0" : "#FEE2E2", border: "none", borderRadius: 8, padding: "7px 10px", cursor: "pointer", fontSize: 11, fontWeight: 700, color: c.active ? "#1A7A5E" : "#D94F3D", fontFamily: "inherit" }}>{c.active ? "Activa" : "Inactiva"}</button>
          </div>
        </div>)}
    </>
  );
}

import { useState } from 'react';
import { sb } from '../../lib/supabase.js';
import { categoryScheduleLabel } from '../../lib/menuCategoryHours.js';
import Icon from '../ui/Icon.jsx';
import OptimizedImage from '../ui/OptimizedImage.jsx';
import AiMenuImporter from '../AiMenuImporter.jsx';

export default function StoreCategoriesTab({ 
  business, 
  categories, 
  loadData, 
  isCatalog, 
  typeSaving = false,
  handleToggleType, 
  setActiveCat, 
  setView, 
  inpH, 
  T,
  setLoading,
  isAdmin
}) {
  const [catName, setCatName] = useState('');
  const [editingCatId, setEditingCatId] = useState(null);
  const [editingCatName, setEditingCatName] = useState('');
  const [scheduleCatId, setScheduleCatId] = useState(null);
  const [schedFrom, setSchedFrom] = useState('');
  const [schedTo, setSchedTo] = useState('');
  const [schedError, setSchedError] = useState('');
  const [schedSaving, setSchedSaving] = useState(false);

  const openScheduleEditor = (c) => {
    // Postgres devuelve time como "08:30:00"; el input type="time" usa "HH:MM".
    setScheduleCatId(c.id);
    setSchedFrom((c.available_from || '').slice(0, 5));
    setSchedTo((c.available_to || '').slice(0, 5));
    setSchedError('');
  };

  const saveCategorySchedule = async (id) => {
    const from = schedFrom.trim();
    const to = schedTo.trim();
    if ((from && !to) || (!from && to)) {
      setSchedError('Elige hora de inicio y fin, o deja ambas vacías para siempre visible.');
      return;
    }
    const valid = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
    if ((from && !valid.test(from)) || (to && !valid.test(to))) {
      setSchedError('Revisa las horas (formato 24 h, p. ej. 08:30).');
      return;
    }
    setSchedSaving(true);
    try {
      await sb.patch('store_categories', id, { available_from: from || null, available_to: to || null });
      setScheduleCatId(null);
      setSchedError('');
      await loadData();
    } catch (err) {
      setSchedError(err?.message || 'No se pudo guardar el horario. Intenta de nuevo.');
    } finally {
      setSchedSaving(false);
    }
  };

  const clearCategorySchedule = async (id) => {
    setSchedSaving(true);
    try {
      await sb.patch('store_categories', id, { available_from: null, available_to: null });
      setScheduleCatId(null);
      setSchedError('');
      await loadData();
    } catch (err) {
      setSchedError(err?.message || 'No se pudo guardar el horario. Intenta de nuevo.');
    } finally {
      setSchedSaving(false);
    }
  };

  const saveCategory = async () => {
    if (!catName.trim()) return;
    await sb.post('store_categories', { business_id: business.id, name: catName.trim(), sort_order: categories.length });
    setCatName('');
    await loadData();
  };

  const handleAiImport = async (result) => {
    if (!result || !result.categories || result.categories.length === 0) return;
    setLoading(true);
    try {
      const startOrder = categories.length;
      for (let i = 0; i < result.categories.length; i++) {
        const cat = result.categories[i];
        if (!cat.items || cat.items.length === 0) continue;
        
        const catPayload = { 
          business_id: business.id, 
          name: cat.name.trim() || 'Sin nombre', 
          sort_order: startOrder + i 
        };
        const catData = await sb.post('store_categories', catPayload);
        if (!catData || !catData[0]) continue;
        const catId = catData[0].id;

        const prodPayloads = cat.items.map((item, pIdx) => ({
          business_id: business.id,
          category_id: catId,
          name: item.name?.trim() || 'Sin nombre',
          description: item.description?.trim() || null,
          price: item.price || 0,
          is_available: true,
          sort_order: pIdx
        }));
        
        if (prodPayloads.length > 0) {
          await sb.post('store_products', prodPayloads);
        }
      }
      await loadData();
    } catch (err) {
      console.error("Error importando con IA", err);
      alert("Hubo un error importando el menú. Revisa tu conexión.");
    }
    setLoading(false);
  };

  const deleteCategory = async (id) => {
    if (!window.confirm("¿Seguro que deseas eliminar esta categoría y todos sus productos?")) return;
    await sb.del('store_categories', id);
    await loadData();
  };

  const renameCategory = async (id, newName) => {
    if (!newName.trim()) return;
    await sb.patch('store_categories', id, { name: newName.trim() });
    setEditingCatId(null);
    setEditingCatName('');
    await loadData();
  };

  const updateCategoryImage = async (id, url) => {
    await sb.patch('store_categories', id, { image_url: url });
    await loadData();
  };

  const reorderCategory = async (index, direction) => {
    const newCats = [...categories];
    const swapIdx = index + direction;
    if (swapIdx < 0 || swapIdx >= newCats.length) return;
    
    const aId = newCats[index].id;
    const bId = newCats[swapIdx].id;
    const aOrder = newCats[index].sort_order ?? index;
    const bOrder = newCats[swapIdx].sort_order ?? swapIdx;
    
    await Promise.all([
      sb.patch('store_categories', aId, { sort_order: bOrder }),
      sb.patch('store_categories', bId, { sort_order: aOrder })
    ]);
    await loadData();
  };

  return (
    <>
      <div style={{ padding: "16px 16px 0", display: "flex", gap: 10 }}>
        <button disabled={typeSaving} onClick={() => handleToggleType(false)} style={{ flex: 1, padding: "10px", borderRadius: 10, border: `1.5px solid ${!isCatalog ? "#0F172A" : T.border}`, background: !isCatalog ? "#0F172A" : T.bg, color: !isCatalog ? "#fff" : T.sub, fontWeight: 700, fontSize: 13, cursor: "pointer", transition: "all 0.2s" }}>Es Menú (Comida)</button>
        <button disabled={typeSaving} onClick={() => handleToggleType(true)} style={{ flex: 1, padding: "10px", borderRadius: 10, border: `1.5px solid ${isCatalog ? "#0F172A" : T.border}`, background: isCatalog ? "#0F172A" : T.bg, color: isCatalog ? "#fff" : T.sub, fontWeight: 700, fontSize: 13, cursor: "pointer", transition: "all 0.2s" }}>Es Catálogo (Productos)</button>
      </div>

      <div style={{ padding: 16 }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
          <input value={catName} onChange={e => setCatName(e.target.value)} onKeyDown={e => e.key === 'Enter' && saveCategory()} placeholder={isCatalog ? "Ej: Ropa, Electrónica..." : "Ej: Entradas, Bebidas..."} style={inpH} />
          <button onClick={saveCategory} style={{ background: '#0F172A', color: "#fff", border: "none", borderRadius: 12, padding: "0 20px", fontWeight: 800, cursor: "pointer", fontSize: 14, flexShrink: 0 }}>Agregar</button>
        </div>
        
        {isAdmin && (
          <div style={{ marginBottom: 24 }}>
            <AiMenuImporter 
              onImport={handleAiImport} 
              bizType={isCatalog ? "catálogo" : "menú"} 
              adminSecret={import.meta.env.VITE_ADMIN_SECRET} 
            />
          </div>
        )}
        
        {categories.length === 0 ? (
          <div style={{ textAlign: "center", color: T.sub, padding: "40px 20px" }}>
            <Icon name="list" size={32} color={T.border} />
            <p style={{ marginTop: 12, fontSize: 14, fontWeight: 600 }}>Aún no hay categorías</p>
            <p style={{ fontSize: 13, color: T.sub, marginTop: 4 }}>Agrega la primera arriba para organizar tu {isCatalog ? "catálogo" : "menú"}.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {categories.map((c, idx) => (
              <div key={c.id}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, background: T.white, padding: "12px 14px", borderRadius: 14, border: `1.5px solid ${T.border}`, transition: 'all 0.2s' }}>
                
                {/* Reorder arrows */}
                <div style={{ display: "flex", flexDirection: "column", gap: 2, flexShrink: 0 }}>
                  <button onClick={() => reorderCategory(idx, -1)} disabled={idx === 0} style={{ background: "none", border: "none", cursor: idx === 0 ? "default" : "pointer", padding: 2, opacity: idx === 0 ? 0.2 : 0.6 }}><Icon name="chevron" size={12} color={T.text} style={{ transform: 'rotate(-90deg)' }} /></button>
                  <button onClick={() => reorderCategory(idx, 1)} disabled={idx === categories.length - 1} style={{ background: "none", border: "none", cursor: idx === categories.length - 1 ? "default" : "pointer", padding: 2, opacity: idx === categories.length - 1 ? 0.2 : 0.6 }}><Icon name="chevron" size={12} color={T.text} style={{ transform: 'rotate(90deg)' }} /></button>
                </div>

                {/* Category image thumbnail */}
                <div style={{ width: 44, height: 44, borderRadius: 10, overflow: 'hidden', background: T.bg, border: `1px solid ${T.border}`, flexShrink: 0, position: 'relative', cursor: 'pointer' }}
                  onClick={() => { document.getElementById(`cat-img-${c.id}`).click(); }}
                >
                  {c.image_url
                    ? <OptimizedImage src={c.image_url} widthRequest={200} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="image" size={16} color={T.sub} /></div>
                  }
                </div>
                <input id={`cat-img-${c.id}`} type="file" accept="image/*" style={{ display: 'none' }} onChange={async (e) => {
                  const file = e.target.files?.[0]; if (!file) return;
                  const { cloudUpload } = await import('../../lib/supabase.js');
                  const url = await cloudUpload(file);
                  if (url) updateCategoryImage(c.id, url);
                }} />

                {/* Category name - editable */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  {editingCatId === c.id ? (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <input 
                        autoFocus
                        value={editingCatName} 
                        onChange={e => setEditingCatName(e.target.value)} 
                        onKeyDown={e => { if (e.key === 'Enter') renameCategory(c.id, editingCatName); if (e.key === 'Escape') setEditingCatId(null); }}
                        style={{ ...inpH, padding: '8px 10px', fontSize: 15, fontWeight: 700 }} 
                      />
                      <button onClick={() => renameCategory(c.id, editingCatName)} style={{ background: T.green, color: '#fff', border: 'none', borderRadius: 8, padding: '0 12px', fontWeight: 700, cursor: 'pointer', fontSize: 12, flexShrink: 0 }}>OK</button>
                      <button onClick={() => setEditingCatId(null)} style={{ background: T.border, color: T.text, border: 'none', borderRadius: 8, padding: '0 10px', cursor: 'pointer', fontSize: 12, flexShrink: 0 }}><Icon name="x" size={12} /></button>
                    </div>
                  ) : (
                    <div 
                      onClick={() => { setActiveCat(c); setView('prods'); }} 
                      style={{ cursor: 'pointer' }}
                    >
                      <div style={{ fontWeight: 800, color: T.text, fontSize: 16, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
                      <div style={{ fontSize: 12, color: T.sub, fontWeight: 500, marginTop: 2 }}>{c.store_products?.length || 0} productos · {categoryScheduleLabel(c)}</div>
                    </div>
                  )}
                </div>

                {/* Action buttons */}
                {editingCatId !== c.id && (
                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                    <button aria-label={`Horario de ${c.name}`} title="Horario en que se muestra esta categoría" onClick={() => { if (scheduleCatId === c.id) setScheduleCatId(null); else openScheduleEditor(c); }} style={{ background: scheduleCatId === c.id ? '#0F172A' : T.bg, border: `1px solid ${T.border}`, width: 34, height: 34, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><Icon name="clock" size={14} color={scheduleCatId === c.id ? '#fff' : T.text} /></button>
                    <button onClick={() => { setEditingCatId(c.id); setEditingCatName(c.name); }} style={{ background: T.bg, border: `1px solid ${T.border}`, width: 34, height: 34, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><Icon name="edit" size={14} color={T.text} /></button>
                    <button onClick={() => { setActiveCat(c); setView('prods'); }} style={{ background: '#0F172A', border: 'none', width: 34, height: 34, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><Icon name="chevron" size={14} color="#fff" /></button>
                    <button onClick={() => deleteCategory(c.id)} style={{ background: '#FEF2F2', border: 'none', width: 34, height: 34, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><Icon name="trash" size={14} color={T.red} /></button>
                  </div>
                )}
              </div>

              {/* Editor de horario: la categoría solo se muestra dentro de su ventana */}
              {scheduleCatId === c.id && (
                <div style={{ marginTop: 6, background: T.bg, padding: "12px 14px", borderRadius: 14, border: `1.5px solid ${T.border}` }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: T.text, marginBottom: 8 }}>Horario en que se muestra</div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <label style={{ fontSize: 12, fontWeight: 700, color: T.sub }}>Desde <input type="time" value={schedFrom} onChange={e => setSchedFrom(e.target.value)} style={{ ...inpH, width: 'auto', padding: '8px 10px' }} /></label>
                    <label style={{ fontSize: 12, fontWeight: 700, color: T.sub }}>Hasta <input type="time" value={schedTo} onChange={e => setSchedTo(e.target.value)} style={{ ...inpH, width: 'auto', padding: '8px 10px' }} /></label>
                    <button disabled={schedSaving} onClick={() => saveCategorySchedule(c.id)} style={{ background: '#0F172A', color: '#fff', border: 'none', borderRadius: 10, padding: '9px 14px', fontWeight: 800, cursor: 'pointer', fontSize: 13 }}>Guardar</button>
                    <button disabled={schedSaving} onClick={() => clearCategorySchedule(c.id)} style={{ background: 'transparent', color: T.text, border: `1.5px solid ${T.border}`, borderRadius: 10, padding: '9px 14px', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>Siempre visible</button>
                  </div>
                  <p style={{ fontSize: 12, color: T.sub, margin: '8px 0 0' }}>Fuera de ese horario la sección no aparece en el menú. Si cierra después de medianoche (p. ej. 18:00–02:00), escribe la hora de cierre menor que la de apertura.</p>
                  {schedError && <p role="alert" style={{ fontSize: 12, color: T.red, fontWeight: 700, margin: '8px 0 0' }}>{schedError}</p>}
                </div>
              )}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

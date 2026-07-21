import React, { useState, useEffect } from 'react';
import { sb } from '../../lib/supabase.js';
import Icon from '../ui/Icon.jsx';
import { getThumbUrl } from '../../lib/utils.js';
import { lazy, Suspense } from 'react';

const Uploader = lazy(() => import('../Uploader.jsx'));
const AiMenuImporter = lazy(() => import('../AiMenuImporter.jsx'));

export default function StoreAdminPanel({ business, onClose, T }) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Views: 'cats' | 'prods' | 'prodForm' | 'opts' | 'optForm'
  const [view, setView] = useState('cats');
  
  const [isCatalog, setIsCatalog] = useState(() => localStorage.getItem(`biz_iscatalog_${business.id}`) === 'true');
  const handleToggleType = (catalog) => {
    setIsCatalog(catalog);
    localStorage.setItem(`biz_iscatalog_${business.id}`, catalog);
  };

  const [activeCat, setActiveCat] = useState(null);
  const [activeProd, setActiveProd] = useState(null);
  const [activeOpt, setActiveOpt] = useState(null);

  // Forms
  const [catName, setCatName] = useState('');
  const [editingCatId, setEditingCatId] = useState(null);
  const [editingCatName, setEditingCatName] = useState('');
  const [prodForm, setProdForm] = useState(null); // { id?, name, price, description, image_url, is_available }
  const [optForm, setOptForm] = useState(null); // { id?, name, type, is_required, values: [] }

  const loadData = async () => {
    setLoading(true);
    try {
      let data = null;
      try {
        data = await sb.get('store_categories', `?business_id=eq.${business.id}&select=id,name,sort_order,image_url,store_products(id,name,description,price,image_url,is_available,sort_order,category_id,store_product_options(id,name,type,is_required,store_option_values(id,label,extra_price)))&order=sort_order.asc`);
      } catch {
        // Fallback in case image_url column isn't ready or has permission issues
        data = await sb.get('store_categories', `?business_id=eq.${business.id}&select=id,name,sort_order,store_products(id,name,description,price,image_url,is_available,sort_order,category_id,store_product_options(id,name,type,is_required,store_option_values(id,label,extra_price)))&order=sort_order.asc`);
      }
      
      if (data) {
        data.forEach(cat => {
            if (cat.store_products) {
              cat.store_products = [...cat.store_products].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
            }
          });
        setCategories(data);
      }
    } catch (error) {
      console.error("Error loading categories", error);
      setCategories([]);
    }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [business.id]);

  // --- Categories ---
  const saveCategory = async () => {
    if (!catName.trim()) return;
    await sb.post('store_categories', { business_id: business.id, name: catName.trim(), sort_order: categories.length });
    setCatName('');
    await loadData();
  };

  const handleAiImport = async (result) => {
    if (!result || !result.categories) return;
    setLoading(true);
    try {
      let currentOrder = categories.length;
      for (const cat of result.categories) {
        const catRes = await sb.post('store_categories', { business_id: business.id, name: cat.name, sort_order: currentOrder++ });
        const newCat = Array.isArray(catRes) ? catRes[0] : catRes;
        
        if (newCat && newCat.id && cat.items && cat.items.length > 0) {
          for (let j = 0; j < cat.items.length; j++) {
            const item = cat.items[j];
            await sb.post('store_products', {
              business_id: business.id,
              category_id: newCat.id,
              name: item.name,
              description: item.description || null,
              price: item.price || 0,
              is_available: true,
              sort_order: j
            });
          }
        }
      }
      await loadData();
    } catch (err) {
      console.error(err);
      alert("Error importando menú");
    } finally {
      setLoading(false);
    }
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
    // Swap sort_order
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

  // --- Products ---
  const saveProduct = async () => {
    if (!prodForm.name.trim() || !prodForm.price) return alert("Nombre y precio obligatorios");
    const payload = {
      business_id: business.id,
      category_id: activeCat.id,
      name: prodForm.name,
      description: prodForm.description,
      price: prodForm.price,
      image_url: prodForm.image_url,
      is_available: prodForm.is_available
    };
    
    if (prodForm.id) {
      await sb.patch('store_products', prodForm.id, payload);
    } else {
      await sb.post('store_products', payload);
    }
    setView('prods');
    await loadData();
  };
  const deleteProduct = async (id) => {
    if (!window.confirm("¿Eliminar este producto?")) return;
    await sb.del('store_products', id);
    await loadData();
  };

  // --- Options ---
  const saveOption = async () => {
    if (!optForm.name.trim()) return alert("Nombre de la opción requerido");
    
    let finalType = optForm.type;
    let finalRequired = optForm.is_required;
    let finalValues = [...(optForm.values || [])];

    if (optForm.template === 'toggle_omit') {
      finalType = 'multiple';
      finalRequired = false;
      finalValues = [{ label: 'Sí', extra_price: 0 }];
    } else if (optForm.template === 'toggle_add') {
      finalType = 'multiple';
      finalRequired = false;
      finalValues = [{ label: 'Sí', extra_price: optForm.values[0]?.extra_price || 0 }];
    } else if (optForm.template === 'single') {
      finalType = 'single';
      finalRequired = true;
    } else if (optForm.template === 'multiple') {
      finalType = 'multiple';
      finalRequired = false;
    }

    // Create or update option
    const payload = { product_id: activeProd.id, name: optForm.name, type: finalType, is_required: finalRequired };
    let optionId = optForm.id;
    if (optionId) {
      await sb.patch('store_product_options', optionId, payload);
    } else {
      const data = await sb.post('store_product_options', payload);
      if (data && data[0]) optionId = data[0].id;
    }

    if (!optionId) {
       await loadData();
       setView('opts');
       return;
    }

    await sb.delWhere('store_option_values', 'option_id', optionId);
    
    const valuesToInsert = finalValues.filter(v => v.label.trim() || Number(v.extra_price) > 0).map(v => ({
      option_id: optionId,
      label: v.label.trim() || 'Sí',
      extra_price: Number(v.extra_price) || 0
    }));

    if (valuesToInsert.length > 0) {
      await sb.post('store_option_values', valuesToInsert);
    }
    
    setView('opts');
    await loadData();
  };
  
  const deleteOption = async (id) => {
    if (!window.confirm("¿Eliminar esta opción de personalización?")) return;
    await sb.del('store_product_options', id);
    await loadData();
  };

  // Shared Styles
  const inpH = { padding: "12px 14px", border: `1.5px solid ${T.border}`, borderRadius: 10, fontSize: 14, fontFamily: "inherit", background: T.white, color: T.text, width: "100%", boxSizing: "border-box" };

  // Re-find active items to keep them fresh after loadData
  const currentCat = activeCat ? categories.find(c => c.id === activeCat.id) : null;
  const currentProd = (currentCat && activeProd) ? currentCat.store_products.find(p => p.id === activeProd.id) : null;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', flexDirection: 'column', background: T.bg, animation: 'slideUp .3s cubic-bezier(0.16, 1, 0.3, 1)', overflowY: 'auto' }}>
        
        {/* HEADER */}
        <div style={{ padding: "16px", background: T.bg, borderBottom: `1px solid ${T.border}`, position: "sticky", top: 0, zIndex: 10, display: "flex", alignItems: "center", gap: 12 }}>
          {view !== 'cats' && (
            <button onClick={() => {
              if (view === 'optForm') setView('opts');
              else if (view === 'opts' || view === 'prodForm') setView('prods');
              else if (view === 'prods') setView('cats');
            }} style={{ background: "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "center" }}><Icon name="chevron" size={20} color={T.text} style={{ transform: "rotate(180deg)" }} /></button>
          )}
          <div style={{ flex: 1, fontSize: 18, fontWeight: 800, color: T.text }}>
            {view === 'cats' && (isCatalog ? "Gestor de Catálogo" : "Gestor de Menú")}
            {view === 'prods' && currentCat?.name}
            {view === 'prodForm' && (prodForm?.id ? "Editar Producto" : "Nuevo Producto")}
            {view === 'opts' && "Opciones: " + currentProd?.name}
            {view === 'optForm' && (optForm?.id ? "Editar Opción" : "Nueva Opción")}
          </div>
          <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: "50%", background: T.border, color: T.text, border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><Icon name="x" size={16} /></button>
        </div>

        {/* LOADING */}
        {loading && <div style={{ padding: 40, textAlign: 'center', color: T.sub }}>Cargando...</div>}

        {/* TYPE SELECTOR (ONLY IN CATS) */}
        {!loading && view === 'cats' && (
          <div style={{ padding: "16px 16px 0", display: "flex", gap: 10 }}>
            <button onClick={() => handleToggleType(false)} style={{ flex: 1, padding: "10px", borderRadius: 10, border: `1.5px solid ${!isCatalog ? "#0F172A" : T.border}`, background: !isCatalog ? "#0F172A" : T.bg, color: !isCatalog ? "#fff" : T.sub, fontWeight: 700, fontSize: 13, cursor: "pointer", transition: "all 0.2s" }}>Es Menú (Comida)</button>
            <button onClick={() => handleToggleType(true)} style={{ flex: 1, padding: "10px", borderRadius: 10, border: `1.5px solid ${isCatalog ? "#0F172A" : T.border}`, background: isCatalog ? "#0F172A" : T.bg, color: isCatalog ? "#fff" : T.sub, fontWeight: 700, fontSize: 13, cursor: "pointer", transition: "all 0.2s" }}>Es Catálogo (Productos)</button>
          </div>
        )}

        {/* 1. CATEGORIES VIEW */}
        {!loading && view === 'cats' && (
          <div style={{ padding: 16 }}>
            <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
              <input value={catName} onChange={e => setCatName(e.target.value)} onKeyDown={e => e.key === 'Enter' && saveCategory()} placeholder={isCatalog ? "Ej: Ropa, Electrónica..." : "Ej: Entradas, Bebidas..."} style={inpH} />
              <button onClick={saveCategory} style={{ background: '#0F172A', color: "#fff", border: "none", borderRadius: 12, padding: "0 20px", fontWeight: 800, cursor: "pointer", fontSize: 14, flexShrink: 0 }}>Agregar</button>
            </div>
            
            {categories.length === 0 ? (
              <div style={{ textAlign: "center", color: T.sub, padding: "40px 20px" }}>
                <Icon name="list" size={32} color={T.border} />
                <p style={{ marginTop: 12, fontSize: 14, fontWeight: 600 }}>Aún no hay categorías</p>
                <p style={{ fontSize: 13, color: T.sub, marginTop: 4 }}>Agrega la primera arriba para organizar tu {isCatalog ? "catálogo" : "menú"}.</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {categories.map((c, idx) => (
                  <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 10, background: T.white, padding: "12px 14px", borderRadius: 14, border: `1.5px solid ${T.border}`, transition: 'all 0.2s' }}>
                    
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
                        ? <img src={getThumbUrl(c.image_url, 200, 200)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
                          <div style={{ fontSize: 12, color: T.sub, fontWeight: 500, marginTop: 2 }}>{c.store_products?.length || 0} productos</div>
                        </div>
                      )}
                    </div>

                    {/* Action buttons */}
                    {editingCatId !== c.id && (
                      <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                        <button onClick={() => { setEditingCatId(c.id); setEditingCatName(c.name); }} style={{ background: T.bg, border: `1px solid ${T.border}`, width: 34, height: 34, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><Icon name="edit" size={14} color={T.text} /></button>
                        <button onClick={() => { setActiveCat(c); setView('prods'); }} style={{ background: '#0F172A', border: 'none', width: 34, height: 34, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><Icon name="chevron" size={14} color="#fff" /></button>
                        <button onClick={() => deleteCategory(c.id)} style={{ background: '#FEF2F2', border: 'none', width: 34, height: 34, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><Icon name="trash" size={14} color={T.red} /></button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            
            <div style={{ marginTop: 32, paddingTop: 24, borderTop: `1px solid ${T.border}` }}>
              <div style={{ fontWeight: 800, fontSize: 15, color: T.text, marginBottom: 12 }}>Importación Inteligente</div>
              <AiMenuImporter
                adminSecret={import.meta.env.VITE_ADMIN_SECRET}
                bizType={isCatalog ? 'catalogo' : 'restaurante'}
                onImport={handleAiImport}
              />
            </div>
          </div>
        )}

        {/* 2. PRODUCTS VIEW */}
        {!loading && view === 'prods' && currentCat && (
          <div style={{ padding: 16 }}>
            <button onClick={() => { setProdForm({ name: '', price: '', description: '', image_url: '', is_available: true }); setView('prodForm'); }} style={{ width: "100%", background: T.green, color: "#fff", border: "none", borderRadius: 12, padding: "14px", fontWeight: 800, fontSize: 15, cursor: "pointer", marginBottom: 20, display: "flex", justifyContent: "center", alignItems: "center", gap: 8 }}>
              <Icon name="plus" size={18} color="#fff" /> Agregar Nuevo Producto
            </button>

            {currentCat.store_products.length === 0 ? (
              <div style={{ textAlign: "center", color: T.sub, padding: "30px 0" }}>Esta categoría no tiene productos.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {currentCat.store_products.map(p => (
                  <div key={p.id} style={{ display: "flex", gap: 12, background: T.white, padding: "12px", borderRadius: 12, border: `1px solid ${T.border}` }}>
                    <div style={{ width: 60, height: 60, borderRadius: 8, background: T.border, overflow: "hidden", flexShrink: 0 }}>
                      {p.image_url ? <img src={getThumbUrl(p.image_url, 200, 200)} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="image" size={20} color={T.sub} /></div>}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 800, color: T.text, fontSize: 15 }}>{p.name} {!p.is_available && <span style={{ color: T.red, fontSize: 10, fontWeight: 700, padding: "2px 6px", background: "rgba(239, 68, 68, 0.1)", borderRadius: 4 }}>Agotado</span>}</div>
                      <div style={{ color: T.green, fontWeight: 700, fontSize: 14 }}>${Number(p.price).toFixed(2)}</div>
                      <div style={{ color: T.sub, fontSize: 11, marginTop: 4 }}>{(p.store_product_options || []).length} opciones de personalización</div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, justifyContent: "center" }}>
                      <button onClick={() => { setProdForm(p); setView('prodForm'); }} style={{ background: T.bg, border: "none", width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><Icon name="edit" size={14} color={T.text} /></button>
                      <button onClick={() => { setActiveProd(p); setView('opts'); }} style={{ background: T.greenL, border: "none", width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><Icon name="list" size={14} color={T.green} /></button>
                      <button onClick={() => deleteProduct(p.id)} style={{ background: "#FEF2F2", border: "none", width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><Icon name="trash" size={14} color={T.red} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 3. PRODUCT FORM */}
        {!loading && view === 'prodForm' && prodForm && (
          <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ textAlign: "center", marginBottom: 10 }}>
              <div style={{ width: 120, height: 120, borderRadius: 16, background: T.border, overflow: "hidden", margin: "0 auto 12px", border: `2px solid ${T.white}`, boxShadow: "0 4px 12px rgba(0,0,0,0.1)", position: "relative" }}>
                {prodForm.image_url ? <img src={prodForm.image_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="image" size={32} color={T.sub} /></div>}
                {prodForm.image_url && <button onClick={() => setProdForm({ ...prodForm, image_url: null })} style={{ position: "absolute", top: 4, right: 4, background: "rgba(0,0,0,0.6)", border: "none", width: 24, height: 24, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><Icon name="trash" size={12} color="#fff" /></button>}
              </div>
              {!prodForm.image_url && (
                <Suspense fallback={<div style={{padding: 20, textAlign: 'center'}}>Cargando módulo de fotos...</div>}>
                  <Uploader label="Subir Foto" onDone={(url) => setProdForm({ ...prodForm, image_url: url })} />
                </Suspense>
              )}
            </div>

            <div><label style={{ fontSize: 11, fontWeight: 700, color: T.sub, textTransform: "uppercase" }}>Nombre del {isCatalog ? "producto" : "platillo"}</label><input value={prodForm.name} onChange={e => setProdForm({ ...prodForm, name: e.target.value })} style={{ ...inpH, marginTop: 6 }} placeholder={isCatalog ? "Ej: Camisa Polo" : "Ej: Hamburguesa Clásica"} /></div>
            <div><label style={{ fontSize: 11, fontWeight: 700, color: T.sub, textTransform: "uppercase" }}>Precio base ($ MXN)</label><input type="number" value={prodForm.price} onChange={e => setProdForm({ ...prodForm, price: e.target.value })} style={{ ...inpH, marginTop: 6 }} placeholder="0.00" /></div>
            <div><label style={{ fontSize: 11, fontWeight: 700, color: T.sub, textTransform: "uppercase" }}>Descripción (Opcional)</label><textarea value={prodForm.description || ''} onChange={e => setProdForm({ ...prodForm, description: e.target.value })} style={{ ...inpH, marginTop: 6, resize: "vertical", minHeight: 60 }} placeholder={isCatalog ? "Detalles, tallas, material..." : "Ingredientes, detalles..."} /></div>
            
            <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", background: T.white, padding: "12px 14px", borderRadius: 10, border: `1px solid ${T.border}` }}>
              <input type="checkbox" checked={prodForm.is_available} onChange={e => setProdForm({ ...prodForm, is_available: e.target.checked })} style={{ width: 18, height: 18, accentColor: T.green }} />
              <div style={{ fontSize: 14, fontWeight: 600, color: T.text }}>Disponible en el {isCatalog ? "catálogo" : "menú"}</div>
            </label>

            <button onClick={saveProduct} style={{ marginTop: 10, background: T.green, color: "#fff", border: "none", borderRadius: 12, padding: "14px", fontWeight: 800, fontSize: 15, cursor: "pointer" }}>Guardar Producto</button>
          </div>
        )}

        {/* 4. OPTIONS VIEW */}
        {!loading && view === 'opts' && currentProd && (
          <div style={{ padding: 16 }}>
            <p style={{ fontSize: 13, color: T.sub, marginBottom: 16 }}>Agrega opciones de personalización para <b>{currentProd.name}</b> (Ej. Término de la carne, tamaño, extras).</p>
            <button onClick={() => { setOptForm({ name: '', type: 'single', is_required: true, values: [{ label: '', extra_price: '' }], template: 'toggle_omit' }); setView('optForm'); }} style={{ width: "100%", background: T.green, color: "#fff", border: "none", borderRadius: 12, padding: "14px", fontWeight: 800, fontSize: 15, cursor: "pointer", marginBottom: 20, display: "flex", justifyContent: "center", alignItems: "center", gap: 8 }}>
              <Icon name="plus" size={18} color="#fff" /> Nueva Opción de Personalización
            </button>

            {(currentProd.store_product_options || []).length === 0 ? (
              <div style={{ textAlign: "center", color: T.sub, padding: "30px 0" }}>No hay opciones creadas para este producto.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {currentProd.store_product_options.map(opt => (
                  <div key={opt.id} style={{ background: T.white, padding: "14px", borderRadius: 12, border: `1px solid ${T.border}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                      <div>
                        <div style={{ fontWeight: 800, color: T.text, fontSize: 15 }}>{opt.name}</div>
                        <div style={{ fontSize: 11, color: T.sub, fontWeight: 600, marginTop: 2 }}>
                          {(() => {
                            const vals = opt.store_option_values || [];
                            if (vals.length <= 1 && (!vals[0] || vals[0].label.toLowerCase() === 'sí')) {
                              return vals[0] && Number(vals[0].extra_price) > 0 ? "🥓 Extra rápido (Interruptor)" : "🍅 Omitir ingrediente (Interruptor)";
                            }
                            return opt.type === 'single' ? "📏 Variantes (Selección única)" : "🧀 Complementos (Selección múltiple)";
                          })()}
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button onClick={() => { 
                          let template = 'multiple';
                          const vals = opt.store_option_values || [];
                          if (vals.length <= 1) {
                            const val = vals[0];
                            if (!val || val.label.toLowerCase() === 'sí') {
                              template = val && Number(val.extra_price) > 0 ? 'toggle_add' : 'toggle_omit';
                            } else {
                              template = opt.type === 'single' ? 'single' : 'multiple';
                            }
                          } else {
                            template = opt.type === 'single' ? 'single' : 'multiple';
                          }
                          setOptForm({ ...opt, template, values: vals.length > 0 ? vals.map(v => ({...v})) : [{ label: 'Sí', extra_price: '' }] }); 
                          setView('optForm'); 
                        }} style={{ background: T.bg, border: "none", width: 28, height: 28, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><Icon name="edit" size={14} color={T.text} /></button>
                        <button onClick={() => deleteOption(opt.id)} style={{ background: "#FEF2F2", border: "none", width: 28, height: 28, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><Icon name="trash" size={14} color={T.red} /></button>
                      </div>
                    </div>
                    <div style={{ background: T.bg, borderRadius: 8, padding: "8px 12px" }}>
                      {(opt.store_option_values || []).map(v => (
                        <div key={v.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: T.text, padding: "4px 0" }}>
                          <span>{v.label}</span>
                          <span style={{ fontWeight: 700, color: Number(v.extra_price) > 0 ? T.green : T.sub }}>{Number(v.extra_price) > 0 ? `+$${Number(v.extra_price).toFixed(2)}` : 'Sin extra'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {view === 'aiImport' && (
          <Suspense fallback={<div style={{padding: 40, textAlign: 'center'}}>Cargando inteligencia artificial...</div>}>
            <AiMenuImporter 
              businessId={business.id} 
              onClose={() => setView('cats')}
              onImported={async () => {
                await loadData();
                setView('cats');
              }}
              T={T}
            />
          </Suspense>
        )}{/* 5. OPTION FORM */}
        {!loading && view === 'optForm' && optForm && (
          <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: T.sub, textTransform: "uppercase", marginBottom: 8, display: 'block' }}>Tipo de Modificador</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div onClick={() => setOptForm({...optForm, template: 'toggle_omit'})} style={{ padding: 10, borderRadius: 10, border: `2px solid ${optForm.template === 'toggle_omit' ? T.text : T.border}`, background: optForm.template === 'toggle_omit' ? T.text : T.bg, color: optForm.template === 'toggle_omit' ? '#fff' : T.text, cursor: 'pointer', textAlign: 'center' }}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>🍅 Omitir</div>
                  <div style={{ fontSize: 10, opacity: 0.8, marginTop: 2 }}>Ej: Sin Cebolla</div>
                </div>
                <div onClick={() => setOptForm({...optForm, template: 'toggle_add'})} style={{ padding: 10, borderRadius: 10, border: `2px solid ${optForm.template === 'toggle_add' ? T.text : T.border}`, background: optForm.template === 'toggle_add' ? T.text : T.bg, color: optForm.template === 'toggle_add' ? '#fff' : T.text, cursor: 'pointer', textAlign: 'center' }}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>🥓 Extra Rápido</div>
                  <div style={{ fontSize: 10, opacity: 0.8, marginTop: 2 }}>Ej: Con Queso</div>
                </div>
                <div onClick={() => setOptForm({...optForm, template: 'single'})} style={{ padding: 10, borderRadius: 10, border: `2px solid ${optForm.template === 'single' ? T.text : T.border}`, background: optForm.template === 'single' ? T.text : T.bg, color: optForm.template === 'single' ? '#fff' : T.text, cursor: 'pointer', textAlign: 'center' }}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>📏 Variantes</div>
                  <div style={{ fontSize: 10, opacity: 0.8, marginTop: 2 }}>Elegir 1 (Obligatorio)</div>
                </div>
                <div onClick={() => setOptForm({...optForm, template: 'multiple'})} style={{ padding: 10, borderRadius: 10, border: `2px solid ${optForm.template === 'multiple' ? T.text : T.border}`, background: optForm.template === 'multiple' ? T.text : T.bg, color: optForm.template === 'multiple' ? '#fff' : T.text, cursor: 'pointer', textAlign: 'center' }}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>🧀 Complementos</div>
                  <div style={{ fontSize: 10, opacity: 0.8, marginTop: 2 }}>Elegir varios (Opcional)</div>
                </div>
              </div>
            </div>

            {(optForm.template === 'toggle_omit' || optForm.template === 'toggle_add') && (
              <>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: T.sub, textTransform: "uppercase" }}>Nombre del {optForm.template === 'toggle_omit' ? 'ingrediente a omitir' : 'extra'}</label>
                  <input value={optForm.name} onChange={e => setOptForm({ ...optForm, name: e.target.value })} style={{ ...inpH, marginTop: 6 }} placeholder={optForm.template === 'toggle_omit' ? "Ej: Cebolla" : "Ej: Extra Asada"} />
                </div>
                {optForm.template === 'toggle_add' && (
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: T.sub, textTransform: "uppercase" }}>Precio Extra ($ MXN)</label>
                    <input type="number" value={optForm.values[0]?.extra_price || ''} onChange={e => { const n = [...optForm.values]; if(n.length === 0) n.push({label:'Sí'}); n[0].extra_price = e.target.value; setOptForm({ ...optForm, values: n }); }} style={{ ...inpH, marginTop: 6 }} placeholder="0.00" />
                  </div>
                )}
              </>
            )}

            {(optForm.template === 'single' || optForm.template === 'multiple') && (
              <>
                <div><label style={{ fontSize: 11, fontWeight: 700, color: T.sub, textTransform: "uppercase" }}>Título de la opción</label><input value={optForm.name} onChange={e => setOptForm({ ...optForm, name: e.target.value })} style={{ ...inpH, marginTop: 6 }} placeholder={optForm.template === 'single' ? "Ej: Elige el tamaño" : "Ej: Elige tus salsas"} /></div>
                
                <div style={{ marginTop: 10 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: T.sub, textTransform: "uppercase", marginBottom: 10 }}>Valores Disponibles</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {optForm.values.map((v, i) => (
                      <div key={i} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <input value={v.label} onChange={e => { const n = [...optForm.values]; n[i].label = e.target.value; setOptForm({ ...optForm, values: n }); }} placeholder="Opción (Ej: Grande)" style={{ ...inpH, flex: 2 }} />
                        <input type="number" value={v.extra_price} onChange={e => { const n = [...optForm.values]; n[i].extra_price = e.target.value; setOptForm({ ...optForm, values: n }); }} placeholder="$ Extra" style={{ ...inpH, flex: 1 }} />
                        <button onClick={() => { const n = [...optForm.values]; n.splice(i, 1); setOptForm({ ...optForm, values: n }); }} style={{ background: "transparent", border: "none", color: T.red, cursor: "pointer", padding: 8 }}><Icon name="trash" size={16} /></button>
                      </div>
                    ))}
                  </div>
                  <button onClick={() => setOptForm({ ...optForm, values: [...optForm.values, { label: '', extra_price: '' }] })} style={{ marginTop: 12, background: T.bg, border: `1px solid ${T.border}`, borderRadius: 10, padding: "10px", width: "100%", fontWeight: 700, color: T.text, cursor: "pointer", fontSize: 13 }}>+ Agregar otro valor</button>
                </div>
              </>
            )}

            <button onClick={saveOption} style={{ marginTop: 10, background: T.green, color: "#fff", border: "none", borderRadius: 12, padding: "14px", fontWeight: 800, fontSize: 15, cursor: "pointer" }}>Guardar Opción</button>
          </div>
        )}

    </div>
  );
}

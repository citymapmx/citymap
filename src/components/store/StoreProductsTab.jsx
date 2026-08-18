import React, { useState, Suspense, lazy } from 'react';
import { sb } from '../../lib/supabase.js';
import Icon from '../ui/Icon.jsx';
import OptimizedImage from '../ui/OptimizedImage.jsx';

const Uploader = lazy(() => import('../Uploader.jsx'));

export default function StoreProductsTab({ 
  business, 
  currentCat, 
  loadData, 
  isCatalog, 
  activeProd, 
  setActiveProd,
  view, 
  setView, 
  inpH, 
  T 
}) {
  const [prodForm, setProdForm] = useState(null); // { id?, name, price, description, image_url, is_available }

  const saveProduct = async () => {
    if (!prodForm.name.trim() || !prodForm.price) return alert("Nombre y precio obligatorios");
    const payload = {
      business_id: business.id,
      category_id: currentCat.id,
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

  if (view === 'prods') {
    return (
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
                  {p.image_url ? <OptimizedImage src={p.image_url} widthRequest={200} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="image" size={20} color={T.sub} /></div>}
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
    );
  }

  if (view === 'prodForm' && prodForm) {
    return (
      <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ textAlign: "center", marginBottom: 10 }}>
          <div style={{ width: 120, height: 120, borderRadius: 16, background: T.border, overflow: "hidden", margin: "0 auto 12px", border: `2px solid ${T.white}`, boxShadow: "0 4px 12px rgba(0,0,0,0.1)", position: "relative" }}>
            {prodForm.image_url ? <OptimizedImage src={prodForm.image_url} widthRequest={400} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="image" size={32} color={T.sub} /></div>}
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
    );
  }

  return null;
}

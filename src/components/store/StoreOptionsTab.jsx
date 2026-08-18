import React, { useState } from 'react';
import { sb } from '../../lib/supabase.js';
import Icon from '../ui/Icon.jsx';

export default function StoreOptionsTab({ 
  currentProd, 
  loadData, 
  view, 
  setView, 
  inpH, 
  T 
}) {
  const [optForm, setOptForm] = useState(null); // { id?, name, type, is_required, values: [] }

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
    const payload = { product_id: currentProd.id, name: optForm.name, type: finalType, is_required: finalRequired };
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

  if (view === 'opts') {
    return (
      <div style={{ padding: 16 }}>
        <button onClick={() => { setOptForm({ name: '', type: 'single', is_required: true, values: [{ label: '', extra_price: '' }], template: 'toggle_omit' }); setView('optForm'); }} style={{ width: "100%", background: T.green, color: "#fff", border: "none", borderRadius: 12, padding: "14px", fontWeight: 800, fontSize: 15, cursor: "pointer", marginBottom: 20, display: "flex", justifyContent: "center", alignItems: "center", gap: 8 }}>
          <Icon name="plus" size={18} color="#fff" /> Agregar Opción
        </button>

        {(currentProd.store_product_options || []).length === 0 ? (
          <div style={{ textAlign: "center", color: T.sub, padding: "30px 0" }}>No hay opciones creadas para este producto.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {currentProd.store_product_options.map(opt => (
              <div key={opt.id} style={{ display: "flex", flexDirection: "column", gap: 10, background: T.white, padding: "12px", borderRadius: 12, border: `1px solid ${T.border}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontWeight: 800, color: T.text, fontSize: 15 }}>{opt.name}</div>
                    <div style={{ color: T.sub, fontSize: 12, marginTop: 4 }}>
                      {opt.type === 'single' ? 'Elegir 1 opción (Obligatorio)' : (opt.is_required ? 'Elegir al menos 1 (Obligatorio)' : 'Opcional')}
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
    );
  }

  if (view === 'optForm' && optForm) {
    return (
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
    );
  }

  return null;
}

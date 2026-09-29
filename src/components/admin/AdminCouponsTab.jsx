import { useState } from 'react';
import Icon from '../ui/Icon';
import FI from './FI';

export default function AdminCouponsTab({
  data,
  sb,
  load,
  onToast
}) {
  const [cpForm, setCpForm] = useState(null);
  const [saving, setSaving] = useState(false);

  return (
    <>
      {!cpForm && <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}><span className="text-sm" style={{ fontWeight: 600, color: "#5A6872" }}>{data.coupons.length} cupones</span><button onClick={() => setCpForm({ _new: true, biz_id: data.biz.find(b => b.plan === "premium")?.id || "", code: "", title: "", description: "", discount_pct: 10, max_uses: 100, active: true, expires_at: "" })} style={{ background: "#7C3AED", color: "#fff", border: "none", borderRadius: 10, padding: "9px 14px", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 5 }}><Icon name="plus" size={14} color="#fff" /> Nuevo cupón</button></div>
        {data.coupons.map(c => { const b = data.biz.find(x => x.id === c.biz_id); return <div key={c.id} style={{ background: "#fff", borderRadius: 12, padding: "12px 14px", marginBottom: 10, display: "flex", alignItems: "center", gap: 10, boxShadow: "0 2px 8px rgba(0,0,0,.05)" }}><div style={{ width: 44, height: 44, borderRadius: 10, background: "#F5F3FF", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Icon name="coupon" size={20} color="#7C3AED" /></div><div style={{ flex: 1, minWidth: 0 }}><div className="text-sm" style={{ fontWeight: 700, color: "#0F1A14" }}>{c.code}</div><div className="text-xs" style={{ color: "#5A6872", marginTop: 1 }}>{c.title} · {c.discount_pct}%</div><div className="text-xs" style={{ color: "#5A6872" }}>{b?.name} · Usos: {c.used_count}/{c.max_uses}</div></div><div style={{ display: "flex", gap: 5 }}><button onClick={() => setCpForm({ ...c })} style={{ background: "#EAF4F0", border: "none", borderRadius: 7, padding: "7px 9px", cursor: "pointer" }}><Icon name="edit" size={12} color="#1A7A5E" /></button><button onClick={async () => { if(!window.confirm("¿Seguro que quieres borrar este cupón?")) return; try { await sb.del("coupons", c.id); onToast("Cupón eliminado"); await load(); } catch(e) { onToast("Error al borrar: " + e.message); } }} style={{ background: "#FFF5F5", border: "none", borderRadius: 7, padding: "7px 9px", cursor: "pointer" }}><Icon name="trash" size={12} color="#D94F3D" /></button></div></div>; })}
      </div>}
      {cpForm && <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ background: "#fff", borderRadius: 14, padding: 16, boxShadow: "0 2px 8px rgba(0,0,0,.05)", display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="text-base" style={{ fontWeight: 800, color: "#0F1A14" }}>{cpForm._new ? "Nuevo cupón" : "Editar cupón"}</div>
          
          <div>
            <label className="text-xs" style={{ fontWeight: 700, color: "#5A6872", textTransform: "uppercase", letterSpacing: .8, display: "block", marginBottom: 4 }}>Negocio asignado *</label>
            <select value={cpForm.biz_id || ""} onChange={e => setCpForm(f => ({ ...f, biz_id: e.target.value }))} style={{ width: "100%", padding: "11px 12px", border: "1.5px solid #E4E8E4", borderRadius: 10, fontSize: 14, color: "#0F1A14", background: "#fff", fontFamily: "inherit" }}>
              <option value="">-- Selecciona un negocio --</option>
              {data.biz.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          
          
          <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
              <label className="text-xs" style={{ fontWeight: 700, color: "#5A6872", textTransform: "uppercase", letterSpacing: .8 }}>Código *</label>
              <input 
                type="text" 
                value={cpForm.code || ""} 
                placeholder="BIENVENIDO20" 
                onChange={e => setCpForm(f => ({ ...f, code: e.target.value.toUpperCase().replace(/\s/g, "") }))} 
                style={{ padding: "11px 14px", border: "1.5px solid #E4E8E4", borderRadius: 10, fontSize: 16, color: "#0F1A14", background: "#fff", fontFamily: "inherit", width: "100%", letterSpacing: 1 }} 
              />
            </div>
            <button 
              onClick={() => setCpForm(f => ({ ...f, code: 'CM' + Math.random().toString(36).substr(2, 5).toUpperCase() }))}
              style={{ height: 46, padding: "0 16px", background: "#F1F5F9", border: "1px solid #E2E8F0", borderRadius: 10, cursor: "pointer", fontSize: 18 }}
              title="Generar aleatorio"
            >
              🎲
            </button>
          </div>

          
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0" }}>
            <input type="checkbox" id="cp_public" checked={cpForm.is_public !== false} onChange={e => setCpForm(f => ({...f, is_public: e.target.checked}))} style={{ width: 16, height: 16, accentColor: "#7C3AED" }} />
            <label htmlFor="cp_public" className="text-sm" style={{ fontWeight: 600, color: "#0F1A14", cursor: "pointer" }}>Mostrar públicamente en el perfil del negocio</label>
          </div>

          <FI label="Título (Lo que verá el usuario)" field="title" src={cpForm} set={setCpForm} ph="Ej. 2x1 en Pizzas, $50 de regalo..." />
          <FI label="Descripción" field="description" src={cpForm} set={setCpForm} rows={2} />

          <div style={{ padding: "12px", background: "#F8FAFC", borderRadius: 10, border: "1px solid #E2E8F0", display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <label className="text-xs" style={{ fontWeight: 700, color: "#5A6872", textTransform: "uppercase", letterSpacing: .8, display: "block", marginBottom: 6 }}>Tipo de recompensa</label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, background: "#E2E8F0", padding: 4, borderRadius: 12 }}>
                {[
                  { id: 'percentage', label: '% Porcentaje' },
                  { id: 'fixed', label: '$ Monto Fijo' },
                  { id: 'promo', label: '🎁 Regalo / 2x1' }
                ].map(t => (
                  <button
                    key={t.id}
                    onClick={() => setCpForm(f => ({ ...f, discount_type: t.id }))}
                    style={{
                      padding: "8px 4px", fontSize: 13, fontWeight: 700, borderRadius: 8, border: "none", cursor: "pointer", transition: "all 0.2s",
                      background: (cpForm.discount_type || 'percentage') === t.id ? '#fff' : 'transparent',
                      color: (cpForm.discount_type || 'percentage') === t.id ? '#0F172A' : '#64748B',
                      boxShadow: (cpForm.discount_type || 'percentage') === t.id ? '0 2px 4px rgba(0,0,0,0.05)' : 'none'
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {(!cpForm.discount_type || cpForm.discount_type === "percentage") && (
                <FI label="Descuento %" field="discount_pct" src={cpForm} set={setCpForm} type="number" />
              )}
              {cpForm.discount_type === "fixed" && (
                <FI label="Monto a descontar ($)" field="discount_amount" src={cpForm} set={setCpForm} type="number" />
              )}
              <FI label="Máx. usos totales" field="max_uses" src={cpForm} set={setCpForm} type="number" />
            </div>
            
            <FI label="Consumo mínimo ($) - Opcional" field="min_purchase" src={cpForm} set={setCpForm} type="number" />
          </div>

          
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <label className="text-xs" style={{ fontWeight: 700, color: "#5A6872", textTransform: "uppercase", letterSpacing: .8 }}>Términos y condiciones (Letras chiquitas)</label>
              <button 
                onClick={() => {
                  let text = "Válido por 1 cupón por usuario. ";
                  if (cpForm.min_purchase > 0) text += `Aplica en consumo mínimo de $${cpForm.min_purchase}. `;
                  if (cpForm.expires_at) text += `Vigente hasta agotar existencias o fecha límite. `;
                  text += "No acumulable con otras promociones.";
                  setCpForm(f => ({ ...f, terms_conditions: text }));
                }}
                style={{ fontSize: 12, fontWeight: 700, color: "#7C3AED", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}
              >
                ✨ Autocompletar
              </button>
            </div>
            <textarea 
              rows={2} 
              value={cpForm.terms_conditions || ""} 
              placeholder="Ej. Válido solo de lunes a jueves. No aplica con otras promociones." 
              onChange={e => setCpForm(f => ({ ...f, terms_conditions: e.target.value }))} 
              style={{ padding: "11px 14px", border: "1.5px solid #E4E8E4", borderRadius: 10, fontSize: 16, color: "#0F1A14", background: "#fff", fontFamily: "inherit", width: "100%", resize: "vertical" }} 
            />
          </div>

          
          <FI label="Vence (Opcional)" field="expires_at" src={cpForm} set={setCpForm} type="date" />
        </div>
        
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => setCpForm(null)} style={{ flex: 1, padding: 14, background: "#fff", border: "1.5px solid #E4E8E4", borderRadius: 12, fontWeight: 700, fontSize: 14, color: "#5A6872", cursor: "pointer", fontFamily: "inherit" }}>Cancelar</button>
          <button onClick={async () => { 
          if (!cpForm.biz_id) { onToast("Error: Debes seleccionar un negocio."); return; }
          if (!cpForm.code || !cpForm.code.trim()) { onToast("Error: El código es requerido."); return; }
          
          setSaving(true); 
          try { 
            let exp = cpForm.expires_at || null;
            if (exp && exp.includes("/")) {
              const parts = exp.split("/").map(p => p.trim());
              if (parts.length === 3) {
                if (parts[2].length === 4) exp = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
                else if (parts[0].length === 4) exp = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
              }
            }
            const pl = { 
              biz_id: cpForm.biz_id, 
              code: cpForm.code.trim().toUpperCase(), 
              title: cpForm.title || null, 
              description: cpForm.description || null, 
              discount_type: cpForm.discount_type || 'percentage',
              discount_pct: parseInt(cpForm.discount_pct) || 0, 
              discount_amount: parseFloat(cpForm.discount_amount) || 0,
              min_purchase: parseFloat(cpForm.min_purchase) || 0,
              terms_conditions: cpForm.terms_conditions || null,
              is_public: cpForm.is_public !== false,
              max_uses: parseInt(cpForm.max_uses) || 100, 
              expires_at: exp, 
              active: true 
            }; 
            if (cpForm._new) await sb.post("coupons", pl); 
            else await sb.patch("coupons", cpForm.id, pl); 
            onToast("Cupón guardado con éxito ✓"); 
            setCpForm(null); 
            await load(); 
          } catch (e) { 
            onToast("Error: " + e.message); 
          } finally { 
            setSaving(false); 
          } 
        }} disabled={saving} style={{ flex: 2, padding: 14, background: saving ? "#5A6872" : "#7C3AED", border: "none", borderRadius: 12, fontWeight: 700, fontSize: 14, color: "#fff", cursor: "pointer", fontFamily: "inherit" }}>{saving ? "Guardando…" : cpForm._new ? "Crear cupón" : "Guardar"}</button>
        </div>
      </div>}
    </>
  );
}

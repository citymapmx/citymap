import React from 'react';
import Icon from '../ui/Icon';
import FI from './FI';

export default function AdminCouponsTab({
  data,
  cpForm,
  setCpForm,
  sb,
  load,
  onToast,
  saving,
  setSaving
}) {
  return (
    <>
      {!cpForm && <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}><span className="text-sm" style={{ fontWeight: 600, color: "#5A6872" }}>{data.coupons.length} cupones</span><button onClick={() => setCpForm({ _new: true, biz_id: data.biz.find(b => b.plan === "premium")?.id || "", code: "", title: "", description: "", discount_pct: 10, max_uses: 100, active: true, expires_at: "" })} style={{ background: "#7C3AED", color: "#fff", border: "none", borderRadius: 10, padding: "9px 14px", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 5 }}><Icon name="plus" size={14} color="#fff" /> Nuevo cupón</button></div>
        {data.coupons.map(c => { const b = data.biz.find(x => x.id === c.biz_id); return <div key={c.id} style={{ background: "#fff", borderRadius: 12, padding: "12px 14px", marginBottom: 10, display: "flex", alignItems: "center", gap: 10, boxShadow: "0 2px 8px rgba(0,0,0,.05)" }}><div style={{ width: 44, height: 44, borderRadius: 10, background: "#F5F3FF", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Icon name="coupon" size={20} color="#7C3AED" /></div><div style={{ flex: 1, minWidth: 0 }}><div className="text-sm" style={{ fontWeight: 700, color: "#0F1A14" }}>{c.code}</div><div className="text-xs" style={{ color: "#5A6872", marginTop: 1 }}>{c.title} · {c.discount_pct}%</div><div className="text-xs" style={{ color: "#5A6872" }}>{b?.name} · Usos: {c.used_count}/{c.max_uses}</div></div><div style={{ display: "flex", gap: 5 }}><button onClick={() => setCpForm({ ...c })} style={{ background: "#EAF4F0", border: "none", borderRadius: 7, padding: "7px 9px", cursor: "pointer" }}><Icon name="edit" size={12} color="#1A7A5E" /></button><button onClick={async () => { await sb.del("coupons", c.id); onToast("Cupón eliminado"); await load(); }} style={{ background: "#FFF5F5", border: "none", borderRadius: 7, padding: "7px 9px", cursor: "pointer" }}><Icon name="trash" size={12} color="#D94F3D" /></button></div></div>; })}
      </div>}
      {cpForm && <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ background: "#fff", borderRadius: 14, padding: 16, boxShadow: "0 2px 8px rgba(0,0,0,.05)", display: "flex", flexDirection: "column", gap: 11 }}>
          <div className="text-base" style={{ fontWeight: 800, color: "#0F1A14" }}>{cpForm._new ? "Nuevo cupón" : "Editar cupón"}</div>
          <div><label className="text-xs" style={{ fontWeight: 700, color: "#5A6872", textTransform: "uppercase", letterSpacing: .8, display: "block", marginBottom: 4 }}>Negocio asignado</label><select value={cpForm.biz_id || ""} onChange={e => setCpForm(f => ({ ...f, biz_id: e.target.value }))} style={{ width: "100%", padding: "11px 12px", border: "1.5px solid #E4E8E4", borderRadius: 10, fontSize: 14, color: "#0F1A14", background: "#fff", fontFamily: "inherit" }}><option value="">-- Selecciona un negocio --</option>{data.biz.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
          <FI label="Código *" field="code" src={cpForm} set={setCpForm} ph="BIENVENIDO20" />
          <FI label="Título" field="title" src={cpForm} set={setCpForm} ph="20% en primera visita" />
          <FI label="Descripción" field="description" src={cpForm} set={setCpForm} rows={2} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}><FI label="Descuento %" field="discount_pct" src={cpForm} set={setCpForm} type="number" /><FI label="Máx. usos" field="max_uses" src={cpForm} set={setCpForm} type="number" /></div>
          <FI label="Vence (Opcional)" field="expires_at" src={cpForm} set={setCpForm} type="date" />
        </div>
        <div style={{ display: "flex", gap: 10 }}><button onClick={() => setCpForm(null)} style={{ flex: 1, padding: 14, background: "#fff", border: "1.5px solid #E4E8E4", borderRadius: 12, fontWeight: 700, fontSize: 14, color: "#5A6872", cursor: "pointer", fontFamily: "inherit" }}>Cancelar</button><button onClick={async () => { 
          if (!cpForm.biz_id) { onToast("Error: Debes seleccionar un negocio."); return; }
          if (!cpForm.code || !cpForm.code.trim()) { onToast("Error: El código es requerido. Escribe uno (ej. BIENVENIDO20)."); return; }
          
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
              discount_pct: parseInt(cpForm.discount_pct) || 0, 
              max_uses: parseInt(cpForm.max_uses) || 100, 
              expires_at: exp, 
              active: true 
            }; 
            if (cpForm._new) await sb.post("coupons", pl); 
            else await sb.patch("coupons", cpForm.id, pl); 
            onToast("Guardado ✓"); 
            setCpForm(null); 
            await load(); 
          } catch (e) { 
            onToast("Error: " + e.message); 
          } finally { 
            setSaving(false); 
          } 
        }} disabled={saving} style={{ flex: 2, padding: 14, background: saving ? "#5A6872" : "#7C3AED", border: "none", borderRadius: 12, fontWeight: 700, fontSize: 14, color: "#fff", cursor: "pointer", fontFamily: "inherit" }}>{saving ? "Guardando…" : cpForm._new ? "Crear cupón" : "Guardar"}</button></div>
      </div>}
    </>
  );
}

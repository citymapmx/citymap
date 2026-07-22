import React from 'react';
import Icon from '../ui/Icon';
import FI from './FI';

export default function AdminPromosTab({
  data,
  prForm,
  setPrForm,
  sb,
  load,
  onToast,
  saving,
  setSaving
}) {
  return (
    <>
      {!prForm && <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}><span className="text-sm" style={{ fontWeight: 600, color: "#5A6872" }}>{data.promos.length} promos</span><button onClick={() => setPrForm({ _new: true, biz_id: data.biz[0]?.id || "", title: "", description: "", expiry: "", discount: "", active: true })} style={{ background: "#92400E", color: "#fff", border: "none", borderRadius: 10, padding: "9px 14px", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 5 }}><Icon name="plus" size={14} color="#fff" /> Nueva</button></div>
        {data.promos.map(p => { const b = data.biz.find(x => x.id === p.biz_id); return <div key={p.id} style={{ background: "#fff", borderRadius: 12, padding: "12px 14px", marginBottom: 10, display: "flex", alignItems: "center", gap: 10, boxShadow: "0 2px 8px rgba(0,0,0,.05)" }}><div style={{ width: 44, height: 44, borderRadius: 10, background: "#FEF3C7", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Icon name="tag" size={20} color="#92400E" /></div><div style={{ flex: 1, minWidth: 0 }}><div className="text-sm" style={{ fontWeight: 700, color: "#0F1A14" }}>{p.title}</div><div className="text-xs" style={{ color: "#5A6872", marginTop: 1 }}>{p.discount} · {p.expiry}</div><div className="text-xs" style={{ color: "#5A6872" }}>{b?.name}</div></div><div style={{ display: "flex", gap: 5 }}><button onClick={() => setPrForm({ ...p })} style={{ background: "#EAF4F0", border: "none", borderRadius: 7, padding: "7px 9px", cursor: "pointer" }}><Icon name="edit" size={12} color="#1A7A5E" /></button><button onClick={async () => { await sb.del("promos", p.id); onToast("Promo eliminada"); await load(); }} style={{ background: "#FFF5F5", border: "none", borderRadius: 7, padding: "7px 9px", cursor: "pointer" }}><Icon name="trash" size={12} color="#D94F3D" /></button></div></div>; })}
      </div>}
      {prForm && <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ background: "#fff", borderRadius: 14, padding: 16, boxShadow: "0 2px 8px rgba(0,0,0,.05)", display: "flex", flexDirection: "column", gap: 11 }}>
          <div className="text-base" style={{ fontWeight: 800, color: "#0F1A14" }}>{prForm._new ? "Nueva promo" : "Editar promo"}</div>
          <div><label className="text-xs" style={{ fontWeight: 700, color: "#5A6872", textTransform: "uppercase", letterSpacing: .8, display: "block", marginBottom: 4 }}>Negocio</label><select value={prForm.biz_id || ""} onChange={e => setPrForm(f => ({ ...f, biz_id: e.target.value }))} style={{ width: "100%", padding: "11px 12px", border: "1.5px solid #E4E8E4", borderRadius: 10, fontSize: 14, color: "#0F1A14", background: "#fff", fontFamily: "inherit" }}>{data.biz.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
          <FI label="Título" field="title" src={prForm} set={setPrForm} ph="2×1 en cócteles" />
          <FI label="Descripción" field="description" src={prForm} set={setPrForm} rows={2} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}><FI label="Descuento" field="discount" src={prForm} set={setPrForm} ph="50%" /><FI label="Vigencia" field="expiry" src={prForm} set={setPrForm} ph="Cada jueves" /></div>
        </div>
        <div style={{ display: "flex", gap: 10 }}><button onClick={() => setPrForm(null)} style={{ flex: 1, padding: 14, background: "#fff", border: "1.5px solid #E4E8E4", borderRadius: 12, fontWeight: 700, fontSize: 14, color: "#5A6872", cursor: "pointer", fontFamily: "inherit" }}>Cancelar</button><button onClick={async () => { setSaving(true); try { const pl = { biz_id: prForm.biz_id, title: prForm.title, description: prForm.description, expiry: prForm.expiry, discount: prForm.discount, active: true }; if (prForm._new) await sb.post("promos", pl); else await sb.patch("promos", prForm.id, pl); onToast("Guardado ✓"); setPrForm(null); await load(); } catch (e) { onToast("Error: " + e.message); } finally { setSaving(false); } }} disabled={saving} style={{ flex: 2, padding: 14, background: saving ? "#5A6872" : "#92400E", border: "none", borderRadius: 12, fontWeight: 700, fontSize: 14, color: "#fff", cursor: "pointer", fontFamily: "inherit" }}>{saving ? "Guardando…" : prForm._new ? "Crear promo" : "Guardar"}</button></div>
      </div>}
    </>
  );
}

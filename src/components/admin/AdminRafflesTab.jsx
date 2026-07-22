import React from 'react';
import Icon from '../ui/Icon';
import FI from './FI';

export default function AdminRafflesTab({
  data,
  rfForm,
  setRfForm,
  sb,
  load,
  onToast,
  saving,
  setSaving
}) {
  return (
    <>
      {!rfForm && <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}><span className="text-sm" style={{ fontWeight: 600, color: "#5A6872" }}>{data.raffles.length} sorteos</span><button onClick={() => setRfForm({ _new: true, biz_id: data.biz.find(b => b.plan === "premium")?.id || "", title: "", description: "", prize: "", ends_at: "" })} style={{ background: "#F59E0B", color: "#fff", border: "none", borderRadius: 10, padding: "9px 14px", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 5 }}><Icon name="plus" size={14} color="#fff" /> Nuevo sorteo</button></div>
        {data.raffles.map(r => { const b = data.biz.find(x => x.id === r.biz_id); return <div key={r.id} style={{ background: "#fff", borderRadius: 12, padding: "12px 14px", marginBottom: 10, display: "flex", alignItems: "center", gap: 10, boxShadow: "0 2px 8px rgba(0,0,0,.05)" }}><div style={{ width: 44, height: 44, borderRadius: 10, background: "#FFFBEB", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Icon name="star" size={20} color="#F59E0B" /></div><div style={{ flex: 1, minWidth: 0 }}><div className="text-sm" style={{ fontWeight: 700, color: "#0F1A14" }}>{r.title}</div><div className="text-xs" style={{ color: "#5A6872", marginTop: 1 }}>Premio: {r.prize}</div><div className="text-xs" style={{ color: "#5A6872" }}>{b?.name}</div></div><div style={{ display: "flex", gap: 5 }}><button onClick={() => setRfForm({ ...r })} style={{ background: "#EAF4F0", border: "none", borderRadius: 7, padding: "7px 9px", cursor: "pointer" }}><Icon name="edit" size={12} color="#1A7A5E" /></button><button onClick={async () => { await sb.del("raffles", r.id); onToast("Sorteo eliminado"); await load(); }} style={{ background: "#FFF5F5", border: "none", borderRadius: 7, padding: "7px 9px", cursor: "pointer" }}><Icon name="trash" size={12} color="#D94F3D" /></button></div></div>; })}
      </div>}
      {rfForm && <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ background: "#fff", borderRadius: 14, padding: 16, boxShadow: "0 2px 8px rgba(0,0,0,.05)", display: "flex", flexDirection: "column", gap: 11 }}>
          <div className="text-base" style={{ fontWeight: 800, color: "#0F1A14" }}>{rfForm._new ? "Nuevo Sorteo" : "Editar Sorteo"}</div>
          <div><label className="text-xs" style={{ fontWeight: 700, color: "#5A6872", textTransform: "uppercase", letterSpacing: .8, display: "block", marginBottom: 4 }}>Negocio asignado</label><select value={rfForm.biz_id || ""} onChange={e => setRfForm(f => ({ ...f, biz_id: e.target.value }))} style={{ width: "100%", padding: "11px 12px", border: "1.5px solid #E4E8E4", borderRadius: 10, fontSize: 14, color: "#0F1A14", background: "#fff", fontFamily: "inherit" }}><option value="">-- Selecciona un negocio --</option>{data.biz.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
          <FI label="Título *" field="title" src={rfForm} set={setRfForm} ph="Cena de Aniversario" />
          <FI label="Descripción *" field="description" src={rfForm} set={setRfForm} rows={2} ph="Participa por una cena gratis" />
          <FI label="Premio *" field="prize" src={rfForm} set={setRfForm} ph="1 Cena Doble y Botella de Vino" />
          <FI label="Fecha de Fin *" field="ends_at" src={rfForm} set={setRfForm} type="datetime-local" />
        </div>
        <div style={{ display: "flex", gap: 10 }}><button onClick={() => setRfForm(null)} style={{ flex: 1, padding: 14, background: "#fff", border: "1.5px solid #E4E8E4", borderRadius: 12, fontWeight: 700, fontSize: 14, color: "#5A6872", cursor: "pointer", fontFamily: "inherit" }}>Cancelar</button><button onClick={async () => { if (!rfForm.biz_id) { onToast("Error: Selecciona negocio."); return; } setSaving(true); try { const pl = { biz_id: rfForm.biz_id, title: rfForm.title, description: rfForm.description, prize: rfForm.prize, ends_at: new Date(rfForm.ends_at).toISOString() }; if (rfForm._new) await sb.post("raffles", pl); else await sb.patch("raffles", rfForm.id, pl); onToast("Sorteo Guardado ✓"); setRfForm(null); await load(); } catch (e) { onToast("Error: " + e.message); } finally { setSaving(false); } }} disabled={saving} style={{ flex: 2, padding: 14, background: saving ? "#5A6872" : "#F59E0B", border: "none", borderRadius: 12, fontWeight: 700, fontSize: 14, color: "#fff", cursor: "pointer", fontFamily: "inherit" }}>{saving ? "Guardando…" : rfForm._new ? "Crear sorteo" : "Guardar"}</button></div>
      </div>}
    </>
  );
}

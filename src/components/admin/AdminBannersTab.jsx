import React from 'react';
import Icon from '../ui/Icon';
import FI from './FI';

export default function AdminBannersTab({
  data,
  banForm,
  setBanForm,
  sb,
  load,
  onToast,
  saving,
  setSaving,
  Uploader
}) {
  return (
    <>
      {!banForm && <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <span className="text-sm" style={{ fontWeight: 600, color: "#5A6872" }}>{data.banners.length} banner{data.banners.length !== 1 ? "s" : ""}</span>
          <button onClick={() => setBanForm({ _new: true, title: "", img_url: "", link_url: "", city_slug: "all", sort_order: 0, active: true, start_date: "", end_date: "", repeat_yearly: false })} style={{ background: "#1A7A5E", color: "#fff", border: "none", borderRadius: 10, padding: "9px 14px", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 5 }}><Icon name="plus" size={14} color="#fff" /> Nuevo banner</button>
        </div>
        {data.banners.length === 0 && <div style={{ textAlign: "center", padding: "40px 0", color: "#9CA3AF" }}><div className="text-3xl" style={{ marginBottom: 8 }}>🖼️</div><div style={{ fontWeight: 600 }}>Sin banners aún</div></div>}
        {data.banners.map(bn => {
          const today = new Date().toISOString().split("T")[0];
          const expired = bn.end_date && today > bn.end_date;
          const scheduled = bn.start_date && today < bn.start_date;
          const statusLbl = !bn.active ? "Inactivo" : expired ? "Expirado" : scheduled ? "Programado" : "Activo";
          const statusColor = statusLbl === "Activo" ? "#16A34A" : statusLbl === "Programado" ? "#3B82F6" : "#9CA3AF";
          const statusBg = statusLbl === "Activo" ? "#DCFCE7" : statusLbl === "Programado" ? "#EFF6FF" : "#F3F4F6";
          return <div key={bn.id} style={{ background: "#fff", borderRadius: 12, marginBottom: 10, overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,.05)" }}>
            {bn.img_url && <div style={{ height: 80, overflow: "hidden", background: "#F7F8F6" }}><img src={bn.img_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} loading="lazy" /></div>}
            <div style={{ padding: "10px 14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="text-sm" style={{ fontWeight: 700, color: "#0F1A14" }}>{bn.title || "Sin título"}</div>
                  <div className="text-xs" style={{ color: "#5A6872", marginTop: 2 }}>
                    {bn.city_slug === "all" ? "Todas las ciudades" : bn.city_slug}
                    {bn.start_date && ` · Desde ${bn.start_date}`}
                    {bn.end_date && ` hasta ${bn.end_date}`}
                    {bn.repeat_yearly && " · Repite anual"}
                  </div>
                </div>
                <span className="text-micro" style={{ background: statusBg, color: statusColor, borderRadius: 20, padding: "3px 9px", fontWeight: 700, flexShrink: 0, marginLeft: 8 }}>{statusLbl}</span>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={() => setBanForm({ ...bn })} style={{ flex: 1, background: "#EAF4F0", border: "none", borderRadius: 8, padding: "7px 0", cursor: "pointer", fontSize: 11, fontWeight: 700, color: "#1A7A5E", fontFamily: "inherit" }}>Editar</button>
                <button onClick={async () => { await sb.patch("banners", bn.id, { active: !bn.active }); onToast(bn.active ? "Desactivado" : "Activado"); await load(); }} style={{ flex: 1, background: bn.active ? "#FEF3C7" : "#DCFCE7", border: "none", borderRadius: 8, padding: "7px 0", cursor: "pointer", fontSize: 11, fontWeight: 700, color: bn.active ? "#D97706" : "#16A34A", fontFamily: "inherit" }}>{bn.active ? "Desactivar" : "Activar"}</button>
                <button onClick={async () => { if (!window.confirm("Eliminar banner?")) return; await sb.del("banners", bn.id); onToast("Eliminado"); await load(); }} style={{ background: "#FFF5F5", border: "none", borderRadius: 8, padding: "7px 10px", cursor: "pointer" }}><Icon name="trash" size={12} color="#D94F3D" /></button>
              </div>
            </div>
          </div>;
        })}
      </div>}
      {banForm && <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ background: "#fff", borderRadius: 14, padding: 16, boxShadow: "0 2px 8px rgba(0,0,0,.05)", display: "flex", flexDirection: "column", gap: 11 }}>
          <div className="text-base" style={{ fontWeight: 800, color: "#0F1A14" }}>{banForm._new ? "Nuevo banner" : "Editar banner"}</div>
          <FI label="Título" field="title" src={banForm} set={setBanForm} />
          <FI label="URL destino" field="link_url" src={banForm} set={setBanForm} ph="https://..." />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div><label className="text-xs" style={{ fontWeight: 700, color: "#5A6872", textTransform: "uppercase", letterSpacing: .8, display: "block", marginBottom: 4 }}>Ciudad</label><select value={banForm.city_slug || "all"} onChange={e => setBanForm(f => ({ ...f, city_slug: e.target.value }))} style={{ width: "100%", padding: "11px 12px", border: "1.5px solid #E4E8E4", borderRadius: 10, fontSize: 13, color: "#0F1A14", background: "#fff", fontFamily: "inherit" }}><option value="all">Todas las ciudades</option>{data.cities.map(c => <option key={c.slug} value={c.slug}>{c.name}</option>)}</select></div>
            <FI label="Orden" field="sort_order" src={banForm} set={setBanForm} type="number" />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div><label className="text-xs" style={{ fontWeight: 700, color: "#5A6872", textTransform: "uppercase", letterSpacing: .8, display: "block", marginBottom: 4 }}>Fecha inicio</label><input type="date" value={banForm.start_date || ""} onChange={e => setBanForm(f => ({ ...f, start_date: e.target.value }))} style={{ width: "100%", padding: "10px 12px", border: "1.5px solid #E4E8E4", borderRadius: 10, fontSize: 13, color: "#0F1A14", background: "#fff", fontFamily: "inherit" }} /></div>
            <div><label className="text-xs" style={{ fontWeight: 700, color: "#5A6872", textTransform: "uppercase", letterSpacing: .8, display: "block", marginBottom: 4 }}>Fecha fin</label><input type="date" value={banForm.end_date || ""} onChange={e => setBanForm(f => ({ ...f, end_date: e.target.value }))} style={{ width: "100%", padding: "10px 12px", border: "1.5px solid #E4E8E4", borderRadius: 10, fontSize: 13, color: "#0F1A14", background: "#fff", fontFamily: "inherit" }} /></div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "#F9FAFB", borderRadius: 10 }}>
            <div>
              <div className="text-sm" style={{ fontWeight: 700, color: "#0F1A14" }}>Repetir cada año</div>
              <div className="text-xs" style={{ color: "#5A6872", marginTop: 2 }}>Se activa automaticamente en las mismas fechas</div>
            </div>
            <button onClick={() => setBanForm(f => ({ ...f, repeat_yearly: !f.repeat_yearly }))} style={{ width: 44, height: 24, borderRadius: 12, border: "none", cursor: "pointer", background: banForm.repeat_yearly ? "#1A7A5E" : "#E4E8E4", position: "relative", transition: "background .2s", flexShrink: 0 }}>
              <div style={{ position: "absolute", top: 2, left: banForm.repeat_yearly ? 22 : 2, width: 20, height: 20, borderRadius: "50%", background: "#fff", transition: "left .2s", boxShadow: "0 1px 4px rgba(0,0,0,.2)" }} />
            </button>
          </div>
          <div><div className="text-xs" style={{ fontWeight: 700, color: "#5A6872", textTransform: "uppercase", letterSpacing: .8, marginBottom: 6 }}>Imagen del banner</div><Uploader aspect={21/9} onDone={url => setBanForm(f => ({ ...f, img_url: url }))} />{banForm.img_url && <img src={banForm.img_url} alt="" style={{ width: "100%", height: 100, objectFit: "cover", borderRadius: 8, marginTop: 8 }} loading="lazy" />}</div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => setBanForm(null)} style={{ flex: 1, padding: 14, background: "#fff", border: "1.5px solid #E4E8E4", borderRadius: 12, fontWeight: 700, fontSize: 14, color: "#5A6872", cursor: "pointer", fontFamily: "inherit" }}>Cancelar</button>
          <button onClick={async () => { setSaving(true); try { const pl = { title: banForm.title, img_url: banForm.img_url, link_url: banForm.link_url, city_slug: banForm.city_slug || "all", sort_order: parseInt(banForm.sort_order) || 0, active: banForm.active ?? true, start_date: banForm.start_date || null, end_date: banForm.end_date || null, repeat_yearly: banForm.repeat_yearly || false }; if (banForm._new) await sb.post("banners", pl); else await sb.patch("banners", banForm.id, pl); onToast("Guardado"); setBanForm(null); await load(); } catch (e) { onToast("Error: " + e.message); } finally { setSaving(false); } }} disabled={saving || !banForm.title} style={{ flex: 2, padding: 14, background: saving || !banForm.title ? "#9CA3AF" : "#1A7A5E", border: "none", borderRadius: 12, fontWeight: 700, fontSize: 14, color: "#fff", cursor: "pointer", fontFamily: "inherit" }}>{saving ? "Guardando..." : banForm._new ? "Crear banner" : "Guardar"}</button>
        </div>
      </div>}
    </>
  );
}

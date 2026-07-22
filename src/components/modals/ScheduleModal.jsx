import React from 'react';
import { useUIStore } from '../../store/useUIStore';
import { getT, FONT_BIZ } from '../../lib/constants';
import Icon from '../ui/Icon';

export default function ScheduleModal({ selected, showSchedule, setShowSchedule }) {
  const { dark } = useUIStore();
  const T = getT(dark);

  if (!showSchedule || !selected) return null;

  return (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 999999, background: T.overlay, backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: T.white, width: "100%", maxWidth: 360, borderRadius: 24, padding: "24px 20px", boxShadow: "0 20px 40px rgba(0,0,0,0.2)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 className="text-xl" style={{ fontWeight: 800, color: T.text, margin: 0, fontFamily: FONT_BIZ }}>Horarios</h2>
          <button className="press" onClick={() => setShowSchedule(false)} style={{ width: 44, height: 44, borderRadius: "50%", background: T.iconBg, color: T.text, border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><Icon name="x" size={18} /></button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {(!selected.schedule?.type || selected.schedule.type === "regular" || selected.schedule.type === "advanced" || selected.schedule.type === "delivery") ? (
            [["lun", "Lunes"], ["mar", "Martes"], ["mie", "Miércoles"], ["jue", "Jueves"], ["vie", "Viernes"], ["sab", "Sábado"], ["dom", "Domingo"]].map(([k, label], i) => {
              const formatTimeRange = (raw) => {
                if (!raw || /cerrado/i.test(raw)) return "Cerrado";
                return String(raw).split('\n').map(line => {
                  return line.split(/\s*[–-]\s*|\s+a\s+/i).map(t => {
                    const m = t.trim().match(/(\d{1,2})(?::(\d{2}))?/);
                    if (!m) return t.trim();
                    let h = parseInt(m[1]), mn = m[2] || "00";
                    if (/p\.?m\.?/i.test(t) && h < 12) h += 12;
                    if (/a\.?m\.?/i.test(t) && h === 12) h = 0;
                    const ampm = h >= 12 ? "PM" : "AM";
                    let outH = h % 12 || 12;
                    return `${String(outH).padStart(2,'0')}:${mn} ${ampm}`;
                  }).join(" - ");
                }).join('\n');
              };
              const val = formatTimeRange((selected.schedule || {})[k]);
              const closed = /cerrado/i.test(val);
              return <div key={k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: i === 6 ? "none" : `1px solid ${T.border}`, paddingBottom: i === 6 ? 0 : 12 }}>
                <span className="text-sm" style={{ fontWeight: 700, color: T.text }}>{label}</span>
                <span className="text-sm" style={{ fontWeight: closed ? 700 : 600, color: closed ? T.red : T.sub, whiteSpace: "pre-wrap", textAlign: "right" }}>{val}</span>
              </div>;
            })
          ) : (
            <div className="text-sm" style={{ color: T.sub, lineHeight: 1.5, fontWeight: 500, textAlign: "center", padding: "20px 0" }}>
              {selected.schedule.type === "always_open" ? "Siempre Abierto (24/7)" : "Atención por previa cita o servicio. Contacta al negocio para más información."}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Confirmaciones (RSVP) de un evento privado. Los invitados no tienen
// cuenta: solo escriben su nombre y confirman. Si cambian de opinión,
// confirman de nuevo y se queda la más reciente (ver summarizeRsvps).
// Tras confirmar, el formulario se minimiza a una línea con su respuesta
// (y se recuerda en este dispositivo, para que no tenga que repetirla).
import { useEffect, useState, useCallback } from 'react';
import { sb } from '../../lib/supabase';
import { useAuthStore } from '../../store/useAuthStore';
import { summarizeRsvps, privateEventUrl } from '../../lib/privateEvents';

const STATUS_OPTIONS = [
  { value: 'voy', label: 'Voy' },
  { value: 'quizas', label: 'Quizás' },
  { value: 'no', label: 'No voy' },
];
const STATUS_LABEL = { voy: 'Vas', quizas: 'Quizás', no: 'No voy' };

const storageKey = (eventId) => `cg_rsvp_${eventId}`;
function readStored(eventId) {
  try {
    if (typeof window === 'undefined' || !eventId) return null;
    const parsed = JSON.parse(window.localStorage.getItem(storageKey(eventId)) || 'null');
    if (!parsed || typeof parsed.name !== 'string' || !parsed.name.trim()) return null;
    return parsed;
  } catch { return null; }
}

export default function PrivateEventRsvp({ event, T, dark, toast$ }) {
  const { user } = useAuthStore();
  const [rows, setRows] = useState([]);
  const [name, setName] = useState('');
  const [status, setStatus] = useState('voy');
  const [companions, setCompanions] = useState(0);
  const [collapsed, setCollapsed] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    if (!event?.id) return;
    sb.get('event_rsvps', `?event_id=eq.${event.id}&order=created_at.asc`)
      .then(res => { if (Array.isArray(res)) setRows(res); })
      .catch(() => {});
  }, [event]);

  useEffect(() => { load(); }, [load]);

  // Al abrir, recuperar la confirmación guardada en este dispositivo.
  useEffect(() => {
    const stored = readStored(event?.id);
    setName(stored?.name || '');
    setStatus(stored?.status || 'voy');
    setCompanions(stored?.companions || 0);
    setCollapsed(Boolean(stored));
  }, [event?.id]);

  const summary = summarizeRsvps(rows);
  const isHost = user?.id && event?.user_id && user.id === event.user_id;

  const submit = async () => {
    if (!name.trim()) { toast$('Escribe tu nombre para confirmar'); return; }
    const companionsToSave = status === 'voy' ? companions : 0;
    setSaving(true);
    try {
      await sb.post('event_rsvps', {
        event_id: event.id,
        guest_name: name.trim(),
        status,
        companions: companionsToSave,
      });
      try { window.localStorage.setItem(storageKey(event.id), JSON.stringify({ name: name.trim(), status, companions: companionsToSave })); } catch { /* sin almacenamiento */ }
      toast$('Confirmación guardada');
      setCollapsed(true);
      load();
    } catch (e) {
      toast$('Error: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ margin: '0 0 24px 0', textAlign: 'left' }}>
      {/* ── Confirmar asistencia: tras confirmar se minimiza a una línea ── */}
      {collapsed ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: T.greenL, borderRadius: 12, padding: '12px 14px', marginBottom: 16 }}>
          <div style={{ flex: 1, fontSize: 14, fontWeight: 700, color: T.text, textAlign: 'left' }}>
            ✓ {STATUS_LABEL[status] || 'Confirmado'} · {name}
            {status === 'voy' && companions > 0 ? ` +${companions}` : ''}
          </div>
          <button onClick={() => setCollapsed(false)} style={{ padding: '8px 14px', background: 'transparent', border: `1.5px solid ${T.border}`, borderRadius: 9999, fontSize: 13, fontWeight: 700, color: T.text, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>Cambiar</button>
        </div>
      ) : (
        <div style={{ background: T.greenL, borderRadius: 16, padding: 16, marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: T.text, marginBottom: 10 }}>¿Vas al evento?</div>
          <input
            className="inp"
            placeholder="Tu nombre"
            value={name}
            onChange={e => setName(e.target.value)}
            style={{ marginBottom: 10 }}
          />
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            {STATUS_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setStatus(opt.value)}
                style={{
                  flex: 1, padding: '10px 0', borderRadius: 10, fontSize: 13, fontWeight: 700,
                  border: `1.5px solid ${status === opt.value ? T.green : T.border}`,
                  background: status === opt.value ? T.greenL : T.white,
                  color: status === opt.value ? T.green : T.sub,
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {status === 'voy' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
              <span style={{ fontSize: 13, color: T.sub, flex: 1 }}>¿Llevas acompañantes?</span>
              <button aria-label="Menos acompañantes" onClick={() => setCompanions(c => Math.max(0, c - 1))} style={{ width: 36, height: 36, borderRadius: '50%', border: `1.5px solid ${T.border}`, background: T.white, color: T.text, fontSize: 18, cursor: 'pointer' }}>−</button>
              <span style={{ fontSize: 15, fontWeight: 800, color: T.text, minWidth: 20, textAlign: 'center' }}>{companions}</span>
              <button aria-label="Más acompañantes" onClick={() => setCompanions(c => Math.min(10, c + 1))} style={{ width: 36, height: 36, borderRadius: '50%', border: `1.5px solid ${T.border}`, background: T.white, color: T.text, fontSize: 18, cursor: 'pointer' }}>+</button>
            </div>
          )}
          <button
            onClick={submit}
            disabled={saving}
            style={{ width: '100%', padding: '12px 0', background: T.green, border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 800, color: dark ? '#18181B' : '#FFFFFF', cursor: 'pointer', fontFamily: 'inherit', opacity: saving ? 0.6 : 1 }}
          >
            {saving ? 'Guardando…' : 'Confirmar asistencia'}
          </button>
        </div>
      )}

      {/* ── Quién va ── */}
      <div style={{ fontSize: 14, fontWeight: 800, color: T.text, marginBottom: 8 }}>
        Van {summary.guests} persona{summary.guests === 1 ? '' : 's'}
        {summary.counts.quizas > 0 && ` · ${summary.counts.quizas} quizás`}
        {summary.counts.no > 0 && ` · ${summary.counts.no} no van`}
      </div>
      {summary.list.length === 0 ? (
        <div style={{ fontSize: 13, color: T.sub }}>Aún nadie confirma. Sé la primera persona en confirmar.</div>
      ) : (
        summary.list.map(row => (
          <div key={row.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 0', borderTop: `1px solid ${T.border}` }}>
            <div style={{ flex: 1, fontSize: 14, fontWeight: 700, color: T.text, textAlign: 'left' }}>
              {row.guest_name}
              {row.status === 'voy' && Number(row.companions) > 0 && <span style={{ fontWeight: 600, color: T.sub }}> +{row.companions}</span>}
            </div>
            <span style={{
              fontSize: 11, fontWeight: 800, padding: '3px 10px', borderRadius: 9999,
              background: row.status === 'voy' ? T.greenL : row.status === 'quizas' ? '#FEF3C7' : '#F1F5F9',
              color: row.status === 'voy' ? T.green : row.status === 'quizas' ? '#92400E' : T.sub,
            }}>
              {row.status === 'voy' ? 'Voy' : row.status === 'quizas' ? 'Quizás' : 'No voy'}
            </span>
          </div>
        ))
      )}

      {/* ── Herramientas del anfitrión ── */}
      {isHost && (
        <button
          onClick={() => { navigator.clipboard?.writeText(privateEventUrl(event)); toast$('Enlace secreto copiado'); }}
          style={{ width: '100%', marginTop: 16, padding: '12px 0', background: 'transparent', border: `1.5px solid ${T.border}`, borderRadius: 12, fontSize: 14, fontWeight: 800, color: T.text, cursor: 'pointer', fontFamily: 'inherit' }}
        >
          Copiar enlace secreto
        </button>
      )}

      <div style={{ marginTop: 16, fontSize: 12, color: T.sub, textAlign: 'center' }}>🔒 Evento privado · solo visible con el enlace</div>
    </div>
  );
}

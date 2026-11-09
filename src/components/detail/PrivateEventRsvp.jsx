// Confirmaciones (RSVP) de un evento privado. Los invitados no tienen
// cuenta: solo escriben su nombre y confirman. Si cambian de opinión,
// confirman de nuevo y se queda la más reciente (ver summarizeRsvps).
// Tras confirmar, el formulario se minimiza a una línea con su respuesta
// (y se recuerda en este dispositivo, para que no tenga que repetirla).
import { useEffect, useState, useCallback } from 'react';
import { sb } from '../../lib/supabase';
import { useAuthStore } from '../../store/useAuthStore';
import { summarizeRsvps } from '../../lib/privateEvents';
import { useTranslation } from '../../hooks/useTranslation.js';

const STATUS_OPTIONS = [
  { value: 'voy', labelKey: 'eventos_rsvp_voy', label: 'Voy' },
  { value: 'quizas', labelKey: 'eventos_rsvp_quizas', label: 'Quizás' },
  { value: 'no', labelKey: 'eventos_rsvp_no', label: 'No voy' },
];

const storageKey = (eventId) => `cg_rsvp_${eventId}`;
function readStored(eventId) {
  try {
    if (typeof window === 'undefined' || !eventId) return null;
    const parsed = JSON.parse(window.localStorage.getItem(storageKey(eventId)) || 'null');
    if (!parsed || typeof parsed.name !== 'string' || !parsed.name.trim()) return null;
    return parsed;
  } catch { return null; }
}

export default function PrivateEventRsvp({ event, T, dark, luma, toast$, onCountChange }) {
  const { t } = useTranslation();
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
  const statusLabel = { voy: t('eventos_rsvp_vas', 'Vas'), quizas: t('eventos_rsvp_quizas', 'Quizás'), no: t('eventos_rsvp_no', 'No voy') }[status] || t('eventos_rsvp_confirmado', 'Confirmado');

  // Contador de personas que van, para la píldora de la pestaña.
  useEffect(() => { onCountChange?.(summary.guests); }, [summary.guests, onCountChange]);

  const submit = async () => {
    if (!name.trim()) { toast$(t("eventos_escribe_nombre_confirmar", "Escribe tu nombre para confirmar")); return; }
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
      toast$(t("eventos_confirmacion_guardada", "Confirmación guardada"));
      setCollapsed(true);
      load();
    } catch (e) {
      toast$(`${t("eventos_error", "Error:")} ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ margin: '0 0 24px 0', textAlign: 'left' }}>
      {/* ── Confirmar asistencia: tras confirmar se minimiza a una línea ── */}
      {collapsed ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: luma ? '#FFFFFF' : T.greenL, border: luma ? '1px solid #E7EBE8' : 'none', boxShadow: luma ? '0 4px 16px rgba(15,23,42,0.06)' : 'none', borderRadius: luma ? 16 : 12, padding: '12px 14px', marginBottom: 16 }}>
          <div style={{ flex: 1, fontSize: 14, fontWeight: 700, color: T.text, textAlign: 'left' }}>
            ✓ {statusLabel} · {name}
            {status === 'voy' && companions > 0 ? ` +${companions}` : ''}
          </div>
          <button onClick={() => setCollapsed(false)} style={{ padding: '8px 14px', background: 'transparent', border: `1.5px solid ${T.border}`, borderRadius: 9999, fontSize: 13, fontWeight: 700, color: T.text, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>{t("eventos_cambiar", "Cambiar")}</button>
        </div>
      ) : (
        <div style={{ background: luma ? '#FFFFFF' : T.greenL, border: luma ? '1px solid #E7EBE8' : 'none', boxShadow: luma ? '0 12px 32px rgba(15,23,42,0.08)' : 'none', borderRadius: luma ? 24 : 16, padding: luma ? 18 : 16, marginBottom: 16 }}>
          <div style={{ fontSize: luma ? 16 : 14, fontWeight: 800, color: T.text, marginBottom: 10 }}>{t("eventos_vas_al_evento", "¿Vas al evento?")}</div>
          <input
            className="inp"
            placeholder={t("eventos_tu_nombre", "Tu nombre")}
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
                  // Rediseño Luma en claro: la opción elegida va en negro
                  // (botón principal), las demás en gris muy claro.
                  border: luma ? (status === opt.value ? '1.5px solid #000000' : '1.5px solid #E5E7EB') : `1.5px solid ${status === opt.value ? T.green : T.border}`,
                  background: luma ? (status === opt.value ? '#000000' : '#F8FAF9') : (status === opt.value ? T.greenL : T.white),
                  color: luma ? (status === opt.value ? '#FFFFFF' : T.sub) : (status === opt.value ? T.green : T.sub),
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                {t(opt.labelKey, opt.label)}
              </button>
            ))}
          </div>
          {status === 'voy' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
              <span style={{ fontSize: 13, color: T.sub, flex: 1 }}>{t("eventos_llevas_acompanantes", "¿Llevas acompañantes?")}</span>
              <button aria-label={t("eventos_menos_acompanantes", "Menos acompañantes")} onClick={() => setCompanions(c => Math.max(0, c - 1))} style={{ width: 36, height: 36, borderRadius: '50%', border: `1.5px solid ${T.border}`, background: T.white, color: T.text, fontSize: 18, cursor: 'pointer' }}>−</button>
              <span style={{ fontSize: 15, fontWeight: 800, color: T.text, minWidth: 20, textAlign: 'center' }}>{companions}</span>
              <button aria-label={t("eventos_mas_acompanantes", "Más acompañantes")} onClick={() => setCompanions(c => Math.min(10, c + 1))} style={{ width: 36, height: 36, borderRadius: '50%', border: `1.5px solid ${T.border}`, background: T.white, color: T.text, fontSize: 18, cursor: 'pointer' }}>+</button>
            </div>
          )}
          <button
            onClick={submit}
            disabled={saving}
            style={{ width: '100%', padding: luma ? '15px 0' : '12px 0', background: T.green, border: 'none', borderRadius: luma ? 16 : 12, fontSize: luma ? 15 : 14, fontWeight: 800, color: dark ? '#18181B' : '#FFFFFF', cursor: 'pointer', fontFamily: 'inherit', opacity: saving ? 0.6 : 1, boxShadow: luma ? '0 8px 20px rgba(0,0,0,0.20)' : 'none' }}
          >
            {saving ? t("eventos_guardando", "Guardando…") : t("eventos_confirmar_asistencia", "Confirmar asistencia")}
          </button>
        </div>
      )}

      {/* ── Quién va ── */}
      <div style={{ fontSize: luma ? 20 : 14, fontWeight: luma ? 900 : 800, color: T.text, marginBottom: 8 }}>
        {t("eventos_rsvp_van", "Van")} {summary.guests} {summary.guests === 1 ? t("eventos_rsvp_persona", "persona") : t("eventos_rsvp_personas", "personas")}
        {summary.counts.quizas > 0 && <> · {summary.counts.quizas} {t("eventos_rsvp_quizas_min", "quizás")}</>}
        {summary.counts.no > 0 && <> · {summary.counts.no} {t("eventos_rsvp_no_van", "no van")}</>}
      </div>
      {summary.list.length === 0 ? (
        <div style={{ fontSize: 13, color: T.sub }}>{t("eventos_rsvp_sin_confirmar", "Aún nadie confirma. Sé la primera persona en confirmar.")}</div>
      ) : (
        summary.list.map(row => (
          <div key={row.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 0', borderTop: `1px solid ${T.border}` }}>
            {luma && (
              <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: row.status === 'voy' ? '#16A34A' : row.status === 'quizas' ? '#D97706' : '#9CA3AF' }} />
            )}
            <div style={{ flex: 1, fontSize: 14, fontWeight: 700, color: T.text, textAlign: 'left' }}>
              {row.guest_name}
              {row.status === 'voy' && Number(row.companions) > 0 && <span style={{ fontWeight: 600, color: T.sub }}> +{row.companions}</span>}
            </div>
            <span style={{
              fontSize: 11, fontWeight: 800, padding: '3px 10px', borderRadius: 9999,
              background: row.status === 'voy' ? T.greenL : row.status === 'quizas' ? '#FEF3C7' : '#F1F5F9',
              color: row.status === 'voy' ? T.green : row.status === 'quizas' ? '#92400E' : T.sub,
            }}>
              {row.status === 'voy' ? t("eventos_rsvp_voy", "Voy") : row.status === 'quizas' ? t("eventos_rsvp_quizas", "Quizás") : t("eventos_rsvp_no", "No voy")}
            </span>
          </div>
        ))
      )}
    </div>
  );
}

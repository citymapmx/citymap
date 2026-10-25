import { useUIStore } from '../store/useUIStore.js';
import { getT } from '../lib/constants.js';
import { getEventCalendarUrl } from '../lib/eventCalendar.js';

export default function EventReminderPrompt() {
  const event = useUIStore(s => s.eventReminder);
  const dismiss = useUIStore(s => s.setEventReminder);
  const T = getT(useUIStore(s => s.dark));
  if (!event) return null;
  const url = getEventCalendarUrl(event);
  return <aside role="dialog" aria-label="Recordar evento guardado" style={{ position: 'fixed', bottom: 'calc(84px + env(safe-area-inset-bottom, 0px))', left: 16, right: 16, maxWidth: 420, margin: '0 auto', zIndex: 100010, background: T.white, color: T.text, border: `1px solid ${T.border}`, borderRadius: 20, padding: 20, boxShadow: '0 12px 40px #0003', maxHeight: '65dvh', overflowY: 'auto' }}>
    <div style={{ display: 'flex', alignItems: 'start', gap: 12 }}><div style={{ flex: 1 }}><strong style={{ fontSize: 16 }}>Evento guardado</strong><div style={{ fontSize: 13, marginTop: 5, color: T.sub }}>{event.title}</div></div><button type="button" aria-label="Cerrar opciones del evento guardado" onClick={() => dismiss(null)} style={{ border: 0, background: 'transparent', color: T.sub, padding: 4, cursor: 'pointer', fontSize: 20 }}>×</button></div>
    {url && <><p style={{ fontSize: 14, lineHeight: 1.5 }}>¿Quieres recordar este evento? Añádelo a tu calendario, revisa la hora y configura una alerta.</p><a href={url} target="_blank" rel="noopener noreferrer" onClick={() => dismiss(null)} style={{ display: 'inline-block', background: T.text, color: T.bg, padding: '11px 16px', borderRadius: 12, textDecoration: 'none', fontSize: 13, fontWeight: 700, marginBottom: 16 }}>Añadir a mi calendario</a></>}
    <button type="button" onClick={() => dismiss(null)} style={{ border: 0, background: 'transparent', color: T.sub, padding: '8px 0 0', fontFamily: 'inherit', cursor: 'pointer' }}>Ahora no</button>
  </aside>;
}

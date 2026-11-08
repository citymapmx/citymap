// Chat del evento privado. Modelo: cualquiera con el enlace puede LEER;
// para ESCRIBIR basta un nombre (como el RSVP). Si el autor inició sesión,
// su mensaje lleva su user_id y se muestra con palomita de verificado.
// Solo el anfitrión puede borrar mensajes.
// Los mensajes se actualizan por sondeo cada 5 s (sin Realtime en v1).
import { useEffect, useState, useCallback, useRef } from 'react';
import { sb } from '../../lib/supabase';
import { useAuthStore } from '../../store/useAuthStore';
import { formatMessageTime } from '../../lib/privateEvents';

const POLL_MS = 5000;
const MAX_BODY = 500;

function storedName(eventId) {
  try {
    if (typeof window === 'undefined' || !eventId) return '';
    const parsed = JSON.parse(window.localStorage.getItem(`cg_rsvp_${eventId}`) || 'null');
    return typeof parsed?.name === 'string' ? parsed.name : '';
  } catch { return ''; }
}

export default function PrivateEventChat({ event, T, dark, toast$ }) {
  const { user } = useAuthStore();
  const [messages, setMessages] = useState([]);
  const [name, setName] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef(null);

  const load = useCallback(() => {
    if (!event?.id) return;
    sb.get('event_messages', `?event_id=eq.${event.id}&order=created_at.asc&limit=100`)
      .then(res => { if (Array.isArray(res)) setMessages(res); })
      .catch(() => {});
  }, [event]);

  useEffect(() => { load(); }, [load]);

  // Sondeo: mensajes nuevos cada 5 s mientras el detalle está abierto.
  useEffect(() => {
    const timer = setInterval(load, POLL_MS);
    return () => clearInterval(timer);
  }, [load]);

  // Nombre recordado (del RSVP) para invitados sin cuenta.
  useEffect(() => { setName(storedName(event?.id)); }, [event?.id]);

  // Bajar al último mensaje cuando llegan nuevos (si ya estabas abajo).
  const prevCount = useRef(0);
  useEffect(() => {
    const el = listRef.current;
    if (!el) { prevCount.current = messages.length; return; }
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    if (messages.length > prevCount.current && (nearBottom || prevCount.current === 0)) {
      el.scrollTop = el.scrollHeight;
    }
    prevCount.current = messages.length;
  }, [messages]);

  const loggedName = user?.user_metadata?.name || user?.email?.split('@')[0] || '';
  const authorName = user ? loggedName : name.trim();
  const isHost = user?.id && event?.user_id && user.id === event.user_id;

  const send = async (e) => {
    if (e) e.preventDefault();
    const text = body.trim();
    if (!text) return;
    if (!authorName) { toast$('Escribe tu nombre para participar'); return; }
    if (text.length > MAX_BODY) { toast$('El mensaje es muy largo (máx. 500 caracteres)'); return; }
    setSending(true);
    try {
      await sb.post('event_messages', {
        event_id: event.id,
        guest_name: authorName,
        user_id: user?.id || null,
        body: text.slice(0, MAX_BODY),
      });
      if (!user) {
        try { window.localStorage.setItem(`cg_rsvp_${event.id}`, JSON.stringify({ name: authorName })); } catch { /* sin almacenamiento */ }
      }
      setBody('');
      load();
    } catch (err) {
      toast$('Error: ' + err.message);
    } finally {
      setSending(false);
    }
  };

  const removeMessage = async (id) => {
    try {
      await sb.del('event_messages', id);
      setMessages(prev => prev.filter(m => m.id !== id));
    } catch (err) {
      toast$('No se pudo borrar: ' + err.message);
    }
  };

  return (
    <div style={{ margin: '0 0 24px 0', textAlign: 'left' }}>
      <div style={{ fontSize: 18, fontWeight: 800, color: T.text, marginBottom: 4 }}>💬 Chat del evento</div>
      <div style={{ fontSize: 13, color: T.sub, marginBottom: 12 }}>
        Todos los invitados pueden leerlo. Para escribir solo pon tu nombre{user ? '' : ', y si inicias sesión tu mensaje sale verificado'}.
      </div>

      <div
        ref={listRef}
        style={{ maxHeight: 320, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12, padding: '4px 2px 12px' }}
      >
        {messages.length === 0 ? (
          <div style={{ fontSize: 13, color: T.sub }}>Aún no hay mensajes. ¡Sé la primera persona en escribir!</div>
        ) : (
          messages.map(m => {
            const isHostMessage = m.user_id && event?.user_id && m.user_id === event.user_id;
            return (
              <div key={m.id} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 13, fontWeight: 800, color: T.text }}>{m.guest_name}</span>
                  {m.user_id && <span title="Usuario verificado" style={{ fontSize: 12, color: T.green, fontWeight: 800 }}>✓</span>}
                  {isHostMessage && (
                    <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 9999, background: T.greenL, color: T.green }}>Anfitrión</span>
                  )}
                  <span style={{ fontSize: 11, color: T.sub }}>{formatMessageTime(m.created_at)}</span>
                  {isHost && (
                    <button aria-label="Borrar mensaje" onClick={() => removeMessage(m.id)} style={{ marginLeft: 'auto', width: 24, height: 24, borderRadius: '50%', border: 'none', background: 'transparent', color: T.sub, fontSize: 14, cursor: 'pointer', lineHeight: 1 }}>×</button>
                  )}
                </div>
                <div style={{ fontSize: 14, color: T.text, lineHeight: 1.45, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{m.body}</div>
              </div>
            );
          })
        )}
      </div>

      <form onSubmit={send} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {!user && (
          <input
            className="inp"
            placeholder="Tu nombre"
            value={name}
            onChange={e => setName(e.target.value)}
          />
        )}
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            className="inp"
            placeholder={user ? `Escribe como ${loggedName} ✓` : 'Escribe un mensaje…'}
            value={body}
            maxLength={MAX_BODY}
            onChange={e => setBody(e.target.value)}
            style={{ flex: 1 }}
          />
          <button
            type="submit"
            disabled={sending || !body.trim()}
            aria-label="Enviar mensaje"
            style={{ width: 48, height: 48, borderRadius: 12, border: 'none', background: T.green, color: dark ? '#18181B' : '#FFFFFF', fontSize: 20, cursor: 'pointer', flexShrink: 0, opacity: sending || !body.trim() ? 0.5 : 1 }}
          >
            ➤
          </button>
        </div>
      </form>
    </div>
  );
}

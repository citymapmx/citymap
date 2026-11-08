// Chat del evento privado. Modelo: cualquiera con el enlace puede LEER;
// para ESCRIBIR basta un nombre (como el RSVP). Si el autor inició sesión,
// su mensaje lleva su user_id y se muestra con palomita de verificado.
// Solo el anfitrión puede borrar mensajes y fijar uno.
// Reacciones ❤️: tabla event_message_likes (cualquiera con el enlace puede
// darla; quitarla solo la propia si inició sesión).
// Los mensajes se actualizan por sondeo cada 5 s (sin Realtime en v1).
import { useEffect, useState, useCallback, useRef } from 'react';
import { sb } from '../../lib/supabase';
import { useAuthStore } from '../../store/useAuthStore';
import { formatMessageTime, formatChatDay, avatarColor } from '../../lib/privateEvents';

const POLL_MS = 5000;
const MAX_BODY = 500;

function storedName(eventId) {
  try {
    if (typeof window === 'undefined' || !eventId) return '';
    const parsed = JSON.parse(window.localStorage.getItem(`cg_rsvp_${eventId}`) || 'null');
    return typeof parsed?.name === 'string' ? parsed.name : '';
  } catch { return ''; }
}

function readLikedMap(eventId) {
  try {
    if (typeof window === 'undefined' || !eventId) return {};
    const parsed = JSON.parse(window.localStorage.getItem(`cg_likes_${eventId}`) || 'null');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch { return {}; }
}

function dayKey(value) {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '' : d.toDateString();
}

export default function PrivateEventChat({ event, T, dark, toast$, onCountChange }) {
  const { user } = useAuthStore();
  const [messages, setMessages] = useState([]);
  const [likes, setLikes] = useState([]);
  const [name, setName] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef(null);

  const load = useCallback(() => {
    if (!event?.id) return;
    sb.get('event_messages', `?event_id=eq.${event.id}&order=created_at.asc&limit=100`)
      .then(res => {
        if (!Array.isArray(res)) return;
        setMessages(res);
        const ids = res.map(m => m.id).filter(Boolean);
        if (ids.length === 0) { setLikes([]); return; }
        sb.get('event_message_likes', `?select=id,message_id,user_id&message_id=in.(${ids.join(',')})`)
          .then(lr => { if (Array.isArray(lr)) setLikes(lr); })
          .catch(() => {});
      })
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

  // Contador para la píldora de la pestaña.
  useEffect(() => { onCountChange?.(messages.length); }, [messages.length, onCountChange]);

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
  const pinned = messages.find(m => m.pinned) || null;

  const likesFor = (messageId) => likes.filter(l => l.message_id === messageId);
  const myLike = (messageId) => {
    if (user) return likes.find(l => l.message_id === messageId && l.user_id === user.id) || null;
    const map = readLikedMap(event?.id);
    const likeId = map[messageId];
    return likeId ? { id: likeId, message_id: messageId } : null;
  };

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

  const toggleLike = async (message) => {
    const mine = myLike(message.id);
    try {
      if (mine) {
        await sb.del('event_message_likes', mine.id);
        setLikes(prev => prev.filter(l => l.id !== mine.id));
        if (!user) {
          const map = readLikedMap(event?.id);
          delete map[message.id];
          try { window.localStorage.setItem(`cg_likes_${event.id}`, JSON.stringify(map)); } catch { /* sin almacenamiento */ }
        }
      } else {
        const rows = await sb.post('event_message_likes', { message_id: message.id, user_id: user?.id || null });
        const row = Array.isArray(rows) ? rows[0] : null;
        if (row?.id) {
          setLikes(prev => [...prev, row]);
          if (!user) {
            const map = readLikedMap(event?.id);
            map[message.id] = row.id;
            try { window.localStorage.setItem(`cg_likes_${event.id}`, JSON.stringify(map)); } catch { /* sin almacenamiento */ }
          }
        } else {
          load();
        }
      }
    } catch (err) {
      toast$('No se pudo reaccionar: ' + err.message);
    }
  };

  const togglePin = async (message) => {
    try {
      if (message.pinned) {
        await sb.patch('event_messages', message.id, { pinned: false });
      } else {
        if (pinned) await sb.patch('event_messages', pinned.id, { pinned: false });
        await sb.patch('event_messages', message.id, { pinned: true });
      }
      load();
    } catch (err) {
      toast$('No se pudo fijar: ' + err.message);
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

  let lastDay = '';
  return (
    <div style={{ margin: '0 0 24px 0', textAlign: 'left' }}>
      {/* ── Mensaje fijado ── */}
      {pinned && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', background: T.greenL, borderRadius: 12, padding: '10px 12px', marginBottom: 12 }}>
          <span style={{ fontSize: 14 }}>📌</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: T.green, marginBottom: 2 }}>Mensaje fijado · {pinned.guest_name}</div>
            <div style={{ fontSize: 13, color: T.text, lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{pinned.body}</div>
          </div>
          {isHost && (
            <button aria-label="Quitar mensaje fijado" onClick={() => togglePin(pinned)} style={{ width: 24, height: 24, borderRadius: '50%', border: 'none', background: 'transparent', color: T.sub, fontSize: 14, cursor: 'pointer', lineHeight: 1, flexShrink: 0 }}>×</button>
          )}
        </div>
      )}

      <div
        ref={listRef}
        style={{ maxHeight: 340, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14, padding: '4px 2px 12px' }}
      >
        {messages.length === 0 ? (
          <div style={{ fontSize: 13, color: T.sub }}>Aún no hay mensajes. ¡Sé la primera persona en escribir!</div>
        ) : (
          messages.map(m => {
            const key = dayKey(m.created_at);
            const showDay = key !== lastDay;
            lastDay = key;
            const isHostMessage = m.user_id && event?.user_id && m.user_id === event.user_id;
            const count = likesFor(m.id).length;
            const liked = Boolean(myLike(m.id));
            return (
              <div key={m.id}>
                {showDay && (
                  <div style={{ display: 'flex', justifyContent: 'center', margin: '2px 0 2px' }}>
                    <span style={{ fontSize: 11, fontWeight: 800, padding: '4px 12px', borderRadius: 9999, background: dark ? 'rgba(255,255,255,0.08)' : '#F1F5F9', color: T.sub }}>{formatChatDay(m.created_at)}</span>
                  </div>
                )}
                <div style={{ display: 'flex', gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: avatarColor(m.guest_name), color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 800, flexShrink: 0 }}>
                    {String(m.guest_name || '?').trim().charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 800, color: T.text }}>{m.guest_name}</span>
                      {m.user_id && <span title="Usuario verificado" style={{ fontSize: 12, color: T.green, fontWeight: 800 }}>✓</span>}
                      {isHostMessage && (
                        <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 9999, background: T.greenL, color: T.green }}>Anfitrión</span>
                      )}
                      {m.pinned && <span title="Mensaje fijado" style={{ fontSize: 12 }}>📌</span>}
                      <span style={{ fontSize: 11, color: T.sub }}>{formatMessageTime(m.created_at)}</span>
                    </div>
                    <div style={{ display: 'inline-block', maxWidth: '100%', background: T.greenL, borderRadius: 16, borderBottomLeftRadius: 4, padding: '10px 14px', fontSize: 14, color: T.text, lineHeight: 1.45, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{m.body}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                      <button aria-label="Me gusta" onClick={() => toggleLike(m)} style={{ display: 'flex', alignItems: 'center', gap: 4, border: 'none', background: 'transparent', cursor: 'pointer', padding: '2px 6px 2px 0', fontSize: 13, fontWeight: 700, color: liked ? '#E11D48' : T.sub, fontFamily: 'inherit' }}>
                        {liked ? '❤️' : '🤍'}{count > 0 ? ` ${count}` : ''}
                      </button>
                      {isHost && (
                        <>
                          <button aria-label={m.pinned ? 'Quitar fijado' : 'Fijar mensaje'} onClick={() => togglePin(m)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '2px 6px', fontSize: 13, color: m.pinned ? T.green : T.sub, fontFamily: 'inherit' }}>📌</button>
                          <button aria-label="Borrar mensaje" onClick={() => removeMessage(m.id)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '2px 6px', fontSize: 14, color: T.sub, fontFamily: 'inherit', lineHeight: 1 }}>×</button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
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
            style={{ width: 48, height: 48, borderRadius: '50%', border: 'none', background: T.green, color: dark ? '#18181B' : '#FFFFFF', fontSize: 20, cursor: 'pointer', flexShrink: 0, opacity: sending || !body.trim() ? 0.5 : 1 }}
          >
            ➤
          </button>
        </div>
      </form>
    </div>
  );
}

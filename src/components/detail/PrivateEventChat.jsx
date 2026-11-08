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
import Icon from '../ui/Icon.jsx';
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
  const [showNew, setShowNew] = useState(false);
  const listRef = useRef(null);
  // Scroll inteligente: nearBottomRef dice si el usuario está al final;
  // forceScrollRef obliga a bajar (al enviar un mensaje).
  const nearBottomRef = useRef(true);
  const forceScrollRef = useRef(false);

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
  // Si estás leyendo arriba, no te mueve: te avisa con la píldora.
  const prevCount = useRef(0);
  useEffect(() => {
    const el = listRef.current;
    if (!el) { prevCount.current = messages.length; return; }
    if (messages.length > prevCount.current) {
      if (forceScrollRef.current || nearBottomRef.current || prevCount.current === 0) {
        el.scrollTop = el.scrollHeight;
        setShowNew(false);
      } else {
        setShowNew(true);
      }
    }
    forceScrollRef.current = false;
    prevCount.current = messages.length;
  }, [messages]);

  const handleScroll = () => {
    const el = listRef.current;
    if (!el) return;
    nearBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    if (nearBottomRef.current) setShowNew(false);
  };

  const scrollToBottom = () => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
    nearBottomRef.current = true;
    setShowNew(false);
  };

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

  // ¿Es un mensaje mío? Con sesión: por user_id. Sin sesión: por el nombre
  // recordado (el mismo con el que confirmo asistencia).
  const isOwnMessage = (m) => {
    if (user) return Boolean(m.user_id && m.user_id === user.id);
    const mine = name.trim();
    return mine !== '' && m.guest_name === mine;
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
      forceScrollRef.current = true;
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
    <div style={{ margin: '0 0 16px 0', textAlign: 'left' }}>
      {/* ── Mensaje fijado ── */}
      {pinned && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', background: T.greenL, borderRadius: 12, padding: '8px 10px', marginBottom: 8 }}>
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

      {/* ── Contenedor del chat: claro, con textura sutil, sombra suave y borde fino ── */}
      {/* El campo para escribir vive dentro del contenedor, fijo abajo. */}
      <div
        style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          background: dark ? 'rgba(255,255,255,0.05)' : '#FFFFFF',
          backgroundImage: dark
            ? 'radial-gradient(rgba(255,255,255,0.05) 1px, transparent 1px)'
            : 'radial-gradient(rgba(15,23,42,0.045) 1px, transparent 1px)',
          backgroundSize: '18px 18px',
          border: `1px solid ${T.border}`,
          borderRadius: 24,
          boxShadow: '0 10px 32px rgba(15,23,42,0.10)',
          overflow: 'hidden',
          marginBottom: 8,
        }}
      >
      <div style={{ position: 'relative', flex: 1, minHeight: 0 }}>
      <div
        ref={listRef}
        onScroll={handleScroll}
        className="chat-scroll"
        style={{ maxHeight: 300, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, padding: '12px 10px 12px 12px' }}
      >
        {messages.length === 0 ? (
          <div style={{ fontSize: 13, color: T.sub }}>Aún no hay mensajes. ¡Sé la primera persona en escribir!</div>
        ) : (
          messages.map((m, i) => {
            const key = dayKey(m.created_at);
            const showDay = key !== lastDay;
            lastDay = key;
            const prev = messages[i - 1];
            const own = isOwnMessage(m);
            // Mismo autor que el mensaje anterior (mismo día y mismo lado):
            // se agrupa, sin repetir avatar ni nombre.
            const sameAuthor = Boolean(prev) && prev.guest_name === m.guest_name && dayKey(prev.created_at) === key && isOwnMessage(prev) === own;
            // Línea divisora solo cuando cambia la persona que escribe.
            const showDivider = i > 0 && !showDay && !sameAuthor;
            const isHostMessage = m.user_id && event?.user_id && m.user_id === event.user_id;
            const count = likesFor(m.id).length;
            const liked = Boolean(myLike(m.id));
            const bubbleBg = own ? (dark ? 'rgba(26,122,94,0.35)' : '#D9EEE3') : (dark ? 'rgba(255,255,255,0.08)' : '#E9E9EC');
            const bubbleBorder = own ? (dark ? '1px solid rgba(26,122,94,0.45)' : '1px solid #BFE3D2') : (dark ? '1px solid rgba(255,255,255,0.10)' : '1px solid #DDDDDE');
            return (
              <div key={m.id}>
                {showDay && (
                  <div style={{ display: 'flex', justifyContent: 'center', margin: '2px 0 2px' }}>
                    <span style={{ fontSize: 11, fontWeight: 800, padding: '3px 10px', borderRadius: 9999, background: dark ? 'rgba(255,255,255,0.08)' : '#F1F5F9', color: T.sub }}>{formatChatDay(m.created_at)}</span>
                  </div>
                )}
                {showDivider && <div style={{ height: 1, background: dark ? '#52525B' : '#D4D4D8', margin: '4px 0' }} />}
                {own ? (
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <div style={{ maxWidth: '85%', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                      <div style={{ display: 'inline-block', maxWidth: '100%', background: bubbleBg, border: bubbleBorder, boxShadow: '0 1px 2px rgba(15,23,42,0.06)', borderRadius: 16, borderBottomRightRadius: 4, padding: '8px 12px', fontSize: 14, color: T.text, lineHeight: 1.45, whiteSpace: 'pre-wrap', wordBreak: 'break-word', textAlign: 'left' }}>{m.body}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                        <span style={{ fontSize: 11, color: T.sub }}>{formatMessageTime(m.created_at)}</span>
                        {m.pinned && <span title="Mensaje fijado" style={{ fontSize: 12 }}>📌</span>}
                        <button aria-label={liked ? 'Quitar me gusta' : 'Me gusta'} onClick={() => toggleLike(m)} style={{ display: 'flex', alignItems: 'center', gap: 4, border: 'none', background: 'transparent', cursor: 'pointer', padding: '2px 0 2px 6px', fontSize: 13, fontWeight: 700, color: T.sub, fontFamily: 'inherit' }}>
                          <Icon name={liked ? 'heart_overlay_f' : 'heart_overlay'} size={16} />
                          {count > 0 && <span>{count}</span>}
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
                ) : (
                  <div style={{ display: 'flex', gap: 10 }}>
                    {!sameAuthor ? (
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: avatarColor(m.guest_name), color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, flexShrink: 0 }}>
                        {String(m.guest_name || '?').trim().charAt(0).toUpperCase()}
                      </div>
                    ) : (
                      <div style={{ width: 32, flexShrink: 0 }} />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {!sameAuthor && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 3 }}>
                          <span style={{ fontSize: 12, fontWeight: 800, color: T.text }}>{m.guest_name}</span>
                          {m.user_id && <span title="Usuario verificado" style={{ fontSize: 12, color: T.green, fontWeight: 800 }}>✓</span>}
                          {isHostMessage && (
                            <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 9999, background: T.greenL, color: T.green }}>Anfitrión</span>
                          )}
                          {m.pinned && <span title="Mensaje fijado" style={{ fontSize: 12 }}>📌</span>}
                        </div>
                      )}
                      <div style={{ display: 'inline-block', maxWidth: '100%', background: bubbleBg, border: bubbleBorder, boxShadow: '0 1px 2px rgba(15,23,42,0.06)', borderRadius: 16, borderBottomLeftRadius: 4, padding: '8px 12px', fontSize: 14, color: T.text, lineHeight: 1.45, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{m.body}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                        <button aria-label={liked ? 'Quitar me gusta' : 'Me gusta'} onClick={() => toggleLike(m)} style={{ display: 'flex', alignItems: 'center', gap: 4, border: 'none', background: 'transparent', cursor: 'pointer', padding: '2px 6px 2px 0', fontSize: 13, fontWeight: 700, color: T.sub, fontFamily: 'inherit' }}>
                          <Icon name={liked ? 'heart_overlay_f' : 'heart_overlay'} size={16} />
                          {count > 0 && <span>{count}</span>}
                        </button>
                        <span style={{ fontSize: 11, color: T.sub }}>{formatMessageTime(m.created_at)}</span>
                        {m.pinned && <span title="Mensaje fijado" style={{ fontSize: 12 }}>📌</span>}
                        {isHost && (
                          <>
                            <button aria-label={m.pinned ? 'Quitar fijado' : 'Fijar mensaje'} onClick={() => togglePin(m)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '2px 6px', fontSize: 13, color: m.pinned ? T.green : T.sub, fontFamily: 'inherit' }}>📌</button>
                            <button aria-label="Borrar mensaje" onClick={() => removeMessage(m.id)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '2px 6px', fontSize: 14, color: T.sub, fontFamily: 'inherit', lineHeight: 1 }}>×</button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
        {showNew && (
          <button
            onClick={scrollToBottom}
            style={{ position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)', background: T.green, color: dark ? '#18181B' : '#FFFFFF', border: 'none', borderRadius: 9999, padding: '8px 16px', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 4px 16px rgba(15,23,42,0.25)', whiteSpace: 'nowrap' }}
          >
            ↓ Nuevos mensajes
          </button>
        )}
      </div>

      {/* ── Campo para escribir, dentro del contenedor ── */}
      <div style={{ borderTop: `1px solid ${T.border}` }}>
        <form onSubmit={send} style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '10px 12px 12px' }}>
          {!user && (
            <input
              className="inp"
              placeholder="Tu nombre"
              value={name}
              onChange={e => setName(e.target.value)}
              style={{ padding: '10px 14px' }}
            />
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
              <input
                className="inp"
                aria-label="Mensaje"
                placeholder=""
                value={body}
                maxLength={MAX_BODY}
                onChange={e => setBody(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', caretColor: body ? 'auto' : 'transparent' }}
              />
              {body === '' && (
                <div style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', display: 'flex', alignItems: 'center', gap: 3, fontSize: 15 }}>
                  <span className="chat-caret" style={{ color: '#38BDF8', fontSize: 20, lineHeight: 1 }}>|</span>
                  <span style={{ color: T.sub }}>Mensaje</span>
                </div>
              )}
            </div>
            <button
              type="submit"
              disabled={sending || !body.trim()}
              aria-label="Enviar mensaje"
              style={{ width: 44, height: 44, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.35)', background: dark ? 'rgba(244,244,245,0.72)' : 'rgba(0,0,0,0.68)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', color: dark ? '#18181B' : '#FFFFFF', fontSize: 19, cursor: 'pointer', flexShrink: 0, opacity: sending || !body.trim() ? 0.5 : 1, boxShadow: '0 6px 18px rgba(15,23,42,0.22), inset 0 1px 0 rgba(255,255,255,0.25)' }}
            >
              ➤
            </button>
          </div>
        </form>
      </div>
      </div>
    </div>
  );
}

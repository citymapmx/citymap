import { useState, useEffect } from 'react';
import Icon from './ui/Icon.jsx';
import { sb } from '../lib/supabase.js';
import { useUIStore } from '../store/useUIStore.js';
import { useDataStore } from '../store/useDataStore.js';
import { markAllReadLocal, resolveNotifAction } from '../lib/notifications.js';

export default function UserNotifs({ T, onBack, user }) {
  const [loading, setLoading] = useState(true);
  const [notifs, setNotifs] = useState([]);
  const [error, setError] = useState(false);
  // Mis negocios: para resolver el destino de las notificaciones viejas
  // sin enlace (por el nombre del negocio en el cuerpo).
  const myBizList = useDataStore(s => s.myBizList);
  const loadMyBiz = useDataStore(s => s.loadMyBiz);

  useEffect(() => {
    window.scrollTo(0, 0);
    if (user) {
      loadNotifs();
      if (!myBizList?.length) loadMyBiz(user.id)?.catch?.(() => {});
    } else {
       
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadNotifs = async () => {
    try {
      setLoading(true);
      setError(false);
      const data = await sb.get("notifications", `?user_id=eq.${user.id}&order=created_at.desc`);
      setNotifs(data || []);
      // Al abrir la lista se marca todo como leído y el aviso (globito y
      // punto rojo) desaparece. El botón «Marcar leídas» sigue existiendo.
      const unread = (data || []).filter(n => !n.read);
      if (unread.length > 0) {
        useUIStore.getState().setUnreadNotifCount(0);
        Promise.all(unread.map(n => sb.patch("notifications", n.id, { read: true }).catch(() => {})))
          .then(() => setNotifs(prev => markAllReadLocal(prev)));
      }
    } catch (err) {
      setError(true);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id, currentRead) => {
    if (currentRead) return; // Ya está leída
    try {
      await sb.patch("notifications", id, { read: true });
      setNotifs(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
      useUIStore.getState().decUnreadNotifCount();
    } catch (err) {
      console.error(err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await Promise.all(notifs.filter(n => !n.read).map(n => sb.patch("notifications", n.id, { read: true })));
      setNotifs(prev => prev.map(n => ({ ...n, read: true })));
      useUIStore.getState().setUnreadNotifCount(0);
    } catch (err) {
      console.error(err);
    }
  };

  const deleteNotif = async (e, id) => {
    e.stopPropagation();
    try {
      await sb.del("notifications", id);
      setNotifs(prev => prev.filter(n => n.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const getRelativeTime = (dateStr) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now - d;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Hace un momento';
    if (diffMins < 60) return `Hace ${diffMins} min`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `Hace ${diffHrs} h`;
    const diffDays = Math.floor(diffHrs / 24);
    if (diffDays === 1) return 'Ayer';
    if (diffDays < 7) return `Hace ${diffDays} días`;
    return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
  };

  // Tocar una notificación SIEMPRE abre algo: el destino se resuelve en
  // resolveNotifAction (enlace si lo hay; si no, el negocio que menciona
  // el cuerpo; si no, /cuenta). La notificación queda marcada como leída.
  const handleTap = (n) => {
    markAsRead(n.id, n.read);
    const action = resolveNotifAction(n, myBizList);
    const url = action.url || '/cuenta';
    if (url.startsWith('http')) {
      try {
        const parsed = new URL(url);
        if (parsed.hostname === 'citymap.mx' || parsed.hostname === window.location.hostname) {
          if (onBack) onBack();
          window.location.href = parsed.pathname + parsed.search;
        } else {
          window.open(url, '_blank');
        }
      } catch {
        window.location.href = url;
      }
      return;
    }
    if (onBack) onBack();
    window.location.href = url;
  };

  const unreadCount = notifs.filter(n => !n.read).length;

  return (
    <div style={{ position: "fixed", inset: 0, background: T.bg, zIndex: 8000, display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: `1px solid ${T.border}`, background: T.white }}>
        <div style={{ display: "flex", alignItems: "center" }}>
          <button onClick={onBack} style={{ background: "transparent", border: "none", color: T.text, padding: "8px 12px 8px 0", cursor: "pointer", display: "flex", alignItems: "center" }}>
            <Icon name="arrow_left" size={24} color={T.text} />
          </button>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: T.text, fontFamily: "var(--heading)", letterSpacing: "-0.5px" }}>Notificaciones</h1>
        </div>
        {unreadCount > 0 && (
          <button className="press" onClick={markAllAsRead} style={{ fontSize: 13, fontWeight: 700, color: T.green, background: "none", border: "none", cursor: "pointer" }}>
            Marcar leídas
          </button>
        )}
      </div>

      <div style={{ padding: "20px", flex: 1, overflowY: "auto" }}>
        {error ? <div role="status" style={{ padding: 24, textAlign: "center", color: T.sub }}>No se pudieron cargar las notificaciones. <button type="button" onClick={loadNotifs}>Reintentar</button></div> : loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "40px" }}>
            <div className="spin" style={{ width: 30, height: 30, border: `3px solid ${T.border}`, borderTopColor: T.green, borderRadius: "50%" }} />
          </div>
        ) : notifs.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <div style={{ width: 64, height: 64, borderRadius: "50%", background: T.greenL, margin: "0 auto 20px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon name="bell" size={30} color={T.green} />
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: T.text, marginBottom: 8 }}>Todo al día</h3>
            <p style={{ fontSize: 14, color: T.sub }}>Aún no tienes notificaciones recientes. Aquí aparecerán tus alertas y reservas.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {notifs.map(n => {
              return (
                <div
                  key={n.id}
                  onClick={() => handleTap(n)}
                  style={{
                    background: T.white,
                    borderRadius: 16,
                    padding: 16,
                    border: `1px solid ${T.border}`,
                    boxShadow: n.read ? "none" : T.shadow,
                    cursor: "pointer",
                    opacity: n.read ? 0.7 : 1,
                    transition: "all 0.2s"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                    <div style={{ fontWeight: 800, fontSize: 15, color: T.text, paddingRight: 10, textAlign: "left" }}>{n.title}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                      <div style={{ fontSize: 11, color: T.sub, whiteSpace: "nowrap" }}>{getRelativeTime(n.created_at)}</div>
                      <button
                        className="press"
                        onClick={(e) => deleteNotif(e, n.id)}
                        style={{ background: "none", border: "none", cursor: "pointer", padding: 4, display: "flex", alignItems: "center", justifyContent: "center", color: T.sub }}
                      >
                        <Icon name="trash" size={14} />
                      </button>
                    </div>
                  </div>
                  <div style={{ fontSize: 13, color: T.sub, lineHeight: 1.5, textAlign: "left" }}>{n.body}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

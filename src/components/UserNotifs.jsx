import React, { useState, useEffect } from 'react';
import Icon from './ui/Icon.jsx';
import { sb } from '../lib/supabase.js';

export default function UserNotifs({ T, onBack, user }) {
  const [loading, setLoading] = useState(true);
  const [notifs, setNotifs] = useState([]);

  useEffect(() => {
    window.scrollTo(0, 0);
    if (user) {
      loadNotifs();
    } else {
      setLoading(false);
    }
  }, [user]);

  const loadNotifs = async () => {
    try {
      setLoading(true);
      const data = await sb.get("notifications", `?user_id=eq.${user.id}&order=created_at.desc`);
      setNotifs(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id, currentRead) => {
    if (currentRead) return; // Ya está leída
    try {
      setNotifs(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
      await sb.patch("notifications", `?id=eq.${id}`, { read: true });
    } catch (err) {
      console.error(err);
    }
  };

  const markAllAsRead = async () => {
    try {
      setNotifs(prev => prev.map(n => ({ ...n, read: true })));
      await sb.patch("notifications", `?user_id=eq.${user.id}&read=eq.false`, { read: true });
    } catch (err) {
      console.error(err);
    }
  };

  const deleteNotif = async (e, id) => {
    e.stopPropagation();
    try {
      setNotifs(prev => prev.filter(n => n.id !== id));
      await sb.del("notifications", id);
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

  const getIconForType = (type) => {
    switch (type) {
      case 'booking': return { name: 'calendar', bg: '#EFF6FF', color: '#3B82F6' };
      case 'approval': return { name: 'check', bg: '#F0FDF4', color: '#22C55E' };
      case 'alert': return { name: 'info', bg: '#FEF2F2', color: '#EF4444' };
      case 'system': return { name: 'bell', bg: '#F5F3FF', color: '#8B5CF6' };
      default: return { name: 'bell', bg: T.greenL, color: T.green };
    }
  };

  const unreadCount = notifs.filter(n => !n.read).length;

  return (
    <div className="sh" style={{ background: T.bg, minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", background: T.white, borderBottom: `1px solid ${T.border}`, position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <button className="press" onClick={onBack} style={{ width: 36, height: 36, borderRadius: "50%", background: T.bg, border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <Icon name="chevron" size={20} color={T.text} style={{ transform: "rotate(180deg)" }} />
          </button>
          <h2 style={{ fontFamily: "'Coolvetica', sans-serif", fontSize: 22, color: T.text, margin: 0, letterSpacing: 0.5 }}>Notificaciones</h2>
        </div>
        {unreadCount > 0 && (
          <button className="press" onClick={markAllAsRead} style={{ fontSize: 13, fontWeight: 700, color: T.green, background: "none", border: "none", cursor: "pointer" }}>
            Marcar todas leídas
          </button>
        )}
      </div>

      <div style={{ padding: "20px", flex: 1 }}>
        {loading ? (
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
              const iconObj = getIconForType(n.type);
              return (
                <div 
                  key={n.id} 
                  onClick={() => markAsRead(n.id, n.read)}
                  style={{ 
                    background: T.white, 
                    borderRadius: 16, 
                    padding: 16, 
                    display: "flex", 
                    gap: 14, 
                    border: `1px solid ${T.border}`,
                    boxShadow: n.read ? "none" : T.shadow,
                    position: "relative",
                    overflow: "hidden",
                    cursor: "pointer",
                    opacity: n.read ? 0.7 : 1,
                    transition: "all 0.2s"
                  }}
                >
                  {!n.read && <div style={{ position: "absolute", top: 0, left: 0, bottom: 0, width: 4, background: iconObj.color }} />}
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: iconObj.bg, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Icon name={iconObj.name} size={20} color={iconObj.color} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                      <div style={{ fontWeight: 800, fontSize: 15, color: T.text, paddingRight: 10 }}>{n.title}</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
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
                    <div style={{ fontSize: 13, color: T.sub, lineHeight: 1.5 }}>{n.body}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import Icon from './ui/Icon.jsx';
import { sb } from '../lib/supabase.js';

export default function AdminNotifs({ T, onBack }) {
  const [loading, setLoading] = useState(true);
  const [notifs, setNotifs] = useState([]);

  useEffect(() => {
    window.scrollTo(0, 0);
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [profiles, businesses] = await Promise.all([
        sb.get("profiles", "?select=id,name,city,avatar_url,created_at&order=created_at.desc&limit=30").catch(() => []),
        sb.get("businesses", "?select=id,name,category,status,city_slug,created_at&order=created_at.desc&limit=30").catch(() => [])
      ]);

      const items = [];
      
      profiles.forEach(p => {
        items.push({
          id: `p_${p.id}`,
          type: 'user',
          title: 'Nuevo usuario registrado',
          desc: p.name || 'Usuario sin nombre',
          city: p.city || 'Ciudad no especificada',
          date: new Date(p.created_at),
          raw: p
        });
      });

      businesses.forEach(b => {
        let title = 'Nuevo negocio registrado';
        if (b.status === 'approved') title = 'Negocio aprobado';
        if (b.status === 'rejected') title = 'Negocio rechazado';
        
        items.push({
          id: `b_${b.id}`,
          type: 'biz',
          title: title,
          desc: `${b.name} (${b.type || 'Sin categoría'})`,
          city: b.city_slug || 'Ciudad no especificada',
          status: b.status,
          date: new Date(b.created_at),
          raw: b
        });
      });

      items.sort((a, b) => b.date - a.date);
      setNotifs(items);
    } catch (e) {
      console.error("Error loading notifs", e);
    } finally {
      setLoading(false);
    }
  };

  const getTimeAgo = (date) => {
    const seconds = Math.floor((new Date() - date) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " años";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " meses";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " d";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " h";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " min";
    return Math.floor(seconds) + " s";
  };

  return (
    <div style={{ paddingBottom: 84, animation: "fadeUp .4s ease" }}>
      {/* Header */}
      <div style={{ position: "sticky", top: 0, background: T.bg, zIndex: 10, borderBottom: `1px solid ${T.border}`, padding: "16px 20px", display: "flex", alignItems: "center", gap: 16 }}>
        <button className="press" onClick={onBack} style={{ background: T.white, border: `1.5px solid ${T.border}`, width: 36, height: 36, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}><Icon name="chevron" size={20} color={T.text} style={{ transform: "rotate(180deg)" }} /></button>
        <h2 style={{ fontFamily: "'Coolvetica', sans-serif", fontSize: 22, color: T.text, margin: 0 }}>Notificaciones</h2>
      </div>

      <div style={{ padding: "20px" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: T.sub }}>Cargando actividad...</div>
        ) : notifs.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: T.sub }}>No hay actividad reciente.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {notifs.map(n => (
              <div key={n.id} style={{ background: T.white, borderRadius: 16, padding: "16px", boxShadow: "0 2px 10px rgba(0,0,0,0.03)", border: `1px solid ${T.border}`, display: "flex", gap: 14, alignItems: "center" }}>
                
                {n.type === 'user' ? (
                  <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#DCFCE7", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Icon name="user" size={20} color="#16A34A" />
                  </div>
                ) : (
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: n.status === 'approved' ? "#DCFCE7" : n.status === 'rejected' ? "#FEE2E2" : "#FEF3C7", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Icon name="store" size={20} color={n.status === 'approved' ? "#16A34A" : n.status === 'rejected' ? "#DC2626" : "#D97706"} />
                  </div>
                )}
                
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: n.type === 'user' ? "#16A34A" : "#D97706" }}>
                      {n.title}
                    </div>
                    <div style={{ fontSize: 11, color: T.sub, whiteSpace: "nowrap", marginLeft: 8 }}>
                      {getTimeAgo(n.date)}
                    </div>
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: T.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {n.desc}
                  </div>
                  <div style={{ fontSize: 12, color: T.sub, marginTop: 4, display: "flex", alignItems: "center", gap: 4, textTransform: "capitalize" }}>
                    <Icon name="map-pin" size={12} color={T.sub} />
                    {n.city}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


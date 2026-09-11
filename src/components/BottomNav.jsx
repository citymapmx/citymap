import { m } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import Icon from './ui/Icon.jsx';
import { useUIStore } from '../store/useUIStore.js';
import { useAuthStore } from '../store/useAuthStore.js';
import { useShallow } from 'zustand/react/shallow';

export default function BottomNav({ dark, navigate }) {
  const location = useLocation();
  const { mapFullScreen } = useUIStore(useShallow(s => ({ mapFullScreen: s.mapFullScreen })));
  const { user, setShowAuth } = useAuthStore(useShallow(s => ({ user: s.user, setShowAuth: s.setShowAuth })));


  if (location.pathname.endsWith('/menu') || mapFullScreen) return null;

  const p = location.pathname;

  return (
    <nav style={{ position: "fixed", bottom: 0, left: 0, right: 0, width: "100%", background: dark ? "#1e293b" : "#FFFFFF", borderTop: `1px solid ${dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`, display: "flex", alignItems: "center", justifyContent: "space-around", padding: "4px 12px", paddingBottom: "calc(4px + env(safe-area-inset-bottom, 8px))", zIndex: 50, boxShadow: "0 -4px 20px rgba(0,0,0,0.03)" }}>
      {[{ id: "home", icon: "home", label: "Inicio" }, { id: "mis-planes", icon: "bookmark", label: "Planes" }, { id: "map", icon: "map_svg", label: "Mapa" }, { id: "wallet", icon: "gift", label: "Recompensas" }, { id: "account", icon: "user", label: "Mi Perfil" }].map(n => {
        let isActive = false;
        if (n.id === "home") isActive = p === "/" || (!p.startsWith("/mapa") && !p.startsWith("/eventos") && !p.startsWith("/mis-planes") && !p.startsWith("/experiencias") && !p.startsWith("/planes") && !p.startsWith("/precios") && !p.startsWith("/cuenta") && !p.startsWith("/admin") && !p.startsWith("/favoritos") && !p.startsWith("/about") && !p.startsWith("/privacy") && !p.startsWith("/terms") && !p.startsWith("/itinerarios") && !p.startsWith("/itinerario/") && !p.startsWith("/plan/") && !p.startsWith("/manage/") && !p.startsWith("/stats/") && !p.startsWith("/wallet") && !p.includes("/lugar/") && !p.includes("/evento/"));
        else if (n.id === "map") isActive = p.startsWith("/mapa");
        else if (n.id === "eventos") isActive = p.startsWith("/eventos");
        else if (n.id === "mis-planes") isActive = p.startsWith("/mis-planes") || p.startsWith("/experiencias") || p.startsWith("/planes");
        else if (n.id === "wallet") isActive = p.startsWith("/wallet") || p.startsWith("/lealtad");
        else if (n.id === "account") isActive = p.startsWith("/cuenta");
        
        return <m.button whileTap={{ scale: 0.85 }} key={n.id} onClick={() => { if (n.id === "account" && !user) { setShowAuth(true); return; } navigate(n.id); }} style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", gap: 2, padding: "4px 10px", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", minWidth: 48 }}>
          <div style={{ position: "relative", zIndex: 1, transform: isActive ? "scale(1.2)" : "scale(1)", transition: "transform .35s cubic-bezier(.34,1.56,.64,1)", display: 'flex', alignItems: 'center', justifyContent: 'center', height: 24 }}>
            <Icon name={n.icon} size={20} color={isActive ? (dark ? "#FFFFFF" : "#000000") : (dark ? "rgba(255,255,255,0.6)" : "rgba(17,24,39,0.5)")} sw={isActive ? 2.2 : 1.8} />
          </div>
          <span className="text-micro" style={{ position: "relative", zIndex: 1, fontWeight: isActive ? 800 : 600, color: isActive ? (dark ? "#FFFFFF" : "#000000") : (dark ? "rgba(255,255,255,0.6)" : "rgba(17,24,39,0.5)"), whiteSpace: "nowrap", transition: "color .2s" }}>{n.label}</span>
        </m.button>;
      })}
    </nav>
  );
}

'use client';

import { usePathname } from 'next/navigation';
import Icon from '../ui/Icon';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function BottomNav() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Hide BottomNav on menus, map fullscreen, or specific routes where it shouldn't appear
  if (pathname.endsWith('/menu')) return null;

  const NAV_ITEMS = [
    { id: "home", icon: "home", label: "Inicio", path: "/" },
    { id: "map", icon: "map_svg", label: "Mapa", path: "/mapa" },
    { id: "favs", icon: "bookmark", label: "Favoritos", path: "/favoritos" },
    { id: "account", icon: "user", label: "Mi Perfil", path: "/cuenta" }
  ];

  return (
    <nav style={{ 
      position: "fixed", bottom: 0, left: 0, right: 0, width: "100%", 
      background: "#FFFFFF", 
      borderTop: '1px solid rgba(0,0,0,0.08)', 
      display: "flex", alignItems: "center", justifyContent: "space-around", 
      padding: "8px 12px", paddingBottom: "calc(8px + env(safe-area-inset-bottom, 8px))", 
      zIndex: 50, boxShadow: "0 -4px 20px rgba(0,0,0,0.03)" 
    }}>
      {NAV_ITEMS.map(n => {
        let isActive = false;
        if (n.id === "home") {
          isActive = pathname === "/" || (pathname.split('/').length === 2 && !['mapa', 'favoritos', 'cuenta'].includes(pathname.split('/')[1]));
        } else {
          isActive = pathname.startsWith(n.path);
        }
        
        return (
          <Link 
            key={n.id} 
            href={n.path}
            prefetch={true}
            style={{ 
              position: "relative", display: "flex", flexDirection: "column", 
              alignItems: "center", gap: 3, padding: "4px 10px", 
              textDecoration: "none", minWidth: 48,
              WebkitTapHighlightColor: 'transparent'
            }}
          >
            <div style={{ 
              display: 'flex', alignItems: 'center', justifyContent: 'center', height: 26,
              transform: isActive && mounted ? "scale(1.15)" : "scale(1)", 
              transition: "transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)"
            }}>
              <Icon 
                name={n.icon} 
                size={22} 
                color={isActive ? "#111" : "rgba(17,24,39,0.4)"} 
                sw={isActive ? 2.2 : 1.8} 
              />
            </div>
            <span style={{ 
              fontSize: 10, fontWeight: isActive ? 800 : 600, 
              color: isActive ? "#111" : "rgba(17,24,39,0.5)", 
              whiteSpace: "nowrap", transition: "color 0.2s" 
            }}>
              {n.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

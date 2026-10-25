'use client';

import { useUIStore } from '../../store/useUIStore.js';
import { getT } from '../../lib/constants.js';
import { usePathname } from 'next/navigation';
import Icon from '../ui/Icon';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function BottomNav() {
  const pathname = usePathname();
  const dark = useUIStore(state => state.dark);
  const activeCity = useUIStore(state => state.activeCity);
  const T = getT(dark);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Hide BottomNav on menus, map fullscreen, or specific routes where it shouldn't appear
  if (pathname.endsWith('/menu')) return null;

  // Active city: taken from the URL (/:city, /eventos/:city, ...) and otherwise from the store.
  const segments = pathname.split('/').filter(Boolean);
  const SECTION_ROUTES = ['mapa', 'eventos', 'revista', 'experiencias'];
  const OTHER_SYSTEM_ROUTES = ['favoritos', 'cuenta', 'evento', 'precios', 'mis-planes', 'manage', 'stats', 'about', 'privacy', 'terms', 'admin', 'wallet', 'lealtad', 'scan'];
  let city = '';
  if (SECTION_ROUTES.includes(segments[0])) city = segments[1] || '';
  else if (segments[0] && !OTHER_SYSTEM_ROUTES.includes(segments[0])) city = segments[0];
  if (!city) city = activeCity || '';

  // `external` items are served by the Vite app, so they need a full page load.
  const NAV_ITEMS = [
    { id: "home", icon: "home", label: "Inicio", path: "/" },
    { id: "revista", icon: "newspaper", label: "Revista", path: city ? `/revista/${city}` : "/revista", match: "/revista", external: true },
    { id: "map", icon: "map_svg", label: "Mapa", path: "/mapa" },
    { id: "eventos", icon: "ticket", label: "Eventos", path: city ? `/eventos/${city}` : "/eventos", match: "/eventos", external: true },
    { id: "account", icon: "user", label: "Mi Perfil", path: "/cuenta" }
  ];

  return (
    <nav style={{ 
      position: "fixed", bottom: 0, left: 0, right: 0, width: "100%", 
      background: T.white, 
      borderTop: `1px solid ${T.border}`, 
      display: "flex", alignItems: "center", justifyContent: "space-around", 
      padding: "8px 12px", paddingBottom: "calc(8px + env(safe-area-inset-bottom, 8px))", 
      zIndex: 50, boxShadow: "0 -4px 20px rgba(0,0,0,0.03)" 
    }}>
      {NAV_ITEMS.map(n => {
        let isActive = false;
        if (n.id === "home") {
          isActive = pathname === "/" || (pathname.split('/').length === 2 && ![...SECTION_ROUTES, ...OTHER_SYSTEM_ROUTES].includes(pathname.split('/')[1]));
        } else {
          isActive = pathname.startsWith(n.match || n.path);
        }
        const LinkTag = n.external ? 'a' : Link;
        
        return (
          <LinkTag 
            key={n.id} 
            href={n.path}
            {...(n.external ? {} : { prefetch: true })}
            aria-label={n.label}
            aria-current={isActive ? 'page' : undefined}
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
                color={isActive ? T.text : T.sub} 
                sw={isActive ? 2.2 : 1.8} 
              />
            </div>
            <span style={{ 
              fontSize: 10, fontWeight: isActive ? 800 : 600, 
              color: isActive ? T.text : T.sub, 
              whiteSpace: "nowrap", transition: "color 0.2s" 
            }}>
              {n.label}
            </span>
          </LinkTag>
        );
      })}
    </nav>
  );
}

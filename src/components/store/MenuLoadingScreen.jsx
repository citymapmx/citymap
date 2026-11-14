// Una sola pantalla de carga del menú (hallazgo #2, nov 2026).
//
// Antes había dos esqueletos en secuencia: el del negocio en MenuView
// (mientras cargaba el negocio) y «Cargando menú…» en BusinessStore
// (mientras cargaban las categorías). Ahora MenuView muestra ESTA
// pantalla mientras cargan negocio y categorías, y BusinessStore la
// reutiliza cuando carga solo (ficha del negocio).
//
// Es la misma pantalla todo el tiempo: fondo con el tema del negocio
// (degradado) cuando ya se conoce, logo + nombre + «Cargando menú…»
// y barras con el color del tema atenuado (diseño de la PR #306). Sin
// negocio todavía, la misma pantalla en neutro (círculo y nombre como
// huecos): el contenido se rellena en la misma pantalla, no aparece
// un segundo esqueleto distinto.

import { resolveMenuTheme, menuHexAlpha } from '../../lib/menuColorStyles.js';
import OptimizedImage from '../ui/OptimizedImage.jsx';

export default function MenuLoadingScreen({ business = null, storeLabel = 'menú', dark = false }) {
  const menuTheme = resolveMenuTheme(business);
  // El menú público NUNCA va en modo oscuro sin estilo (nov 2026):
  // sin tema, siempre claro aunque la app esté en oscuro.
  const effectiveDark = menuTheme ? dark : false;
  const loadBg = menuTheme ? menuTheme.background : (effectiveDark ? '#18181B' : '#FFFFFF');
  const loadText = menuTheme ? menuTheme.text : (effectiveDark ? '#FAFAFA' : '#18181B');
  const loadSub = menuTheme ? menuHexAlpha(menuTheme.text, 'B3') : (effectiveDark ? '#A1A1AA' : '#71717A');
  const loadBar = menuTheme ? menuHexAlpha(menuTheme.text, '26') : (effectiveDark ? '#232326' : '#F4F4F5');
  const hasLogo = !!(business?.logo_url || business?.logo);

  return (
    <div role="status" aria-label={`Cargando productos del ${storeLabel}`} style={{ minHeight: '100dvh', background: loadBg, color: loadSub, padding: '32px 20px', boxSizing: 'border-box' }}>
      <style>{`@keyframes menuSkeletonPulse { 0%,100% { opacity: 1; } 50% { opacity: 0.55; } }`}</style>
      {hasLogo ? (
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#FFFFFF', overflow: 'hidden', margin: '8px auto 16px', boxShadow: '0 4px 12px rgba(0,0,0,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {/* El logo llena el círculo (cover) SIN padding y con zoom
              1.12 (verificado en la #306 con los dos logos reales):
              sin zoom el emblema llega al 86% del círculo; con 1.12
              llega al borde, recortando los textos diagonales de
              Carrito La Paz y las esquinas negras de KAVA. Igual que
              el logo del encabezado del menú. Con prioridad (hallazgo
              #7): es lo primero que se ve al abrir el menú. */}
          <OptimizedImage src={business.logo_url || business.logo} widthRequest={200} heightRequest={200} priority style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'translateZ(0) scale(1.12)' }} alt={business.name} />
        </div>
      ) : (
        <div aria-hidden="true" style={{ width: 72, height: 72, borderRadius: '50%', background: loadBar, margin: '8px auto 16px', animation: 'menuSkeletonPulse 1.4s ease-in-out infinite' }} />
      )}
      {business?.name ? (
        <p style={{ fontSize: 20, fontWeight: 800, margin: '0 0 4px', color: loadText, textAlign: 'center' }}>{business.name}</p>
      ) : (
        <div aria-hidden="true" style={{ width: '60%', height: 24, background: loadBar, borderRadius: 8, margin: '0 auto 4px', animation: 'menuSkeletonPulse 1.4s ease-in-out infinite' }} />
      )}
      <p style={{ fontSize: 14, margin: '0 0 24px', textAlign: 'center' }}>Cargando {storeLabel}…</p>
      {[1, 2, 3].map((row) => (
        <div key={row} aria-hidden="true" style={{ height: 84, borderRadius: 14, marginBottom: 12, background: loadBar, animation: 'menuSkeletonPulse 1.4s ease-in-out infinite' }} />
      ))}
    </div>
  );
}

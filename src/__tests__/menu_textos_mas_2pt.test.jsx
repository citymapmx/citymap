// Menú con textos 2 pt más grandes (nov 2026, pedido de Jonathan con la
// captura del menú de Carrito La Paz): todos los textos del menú suben
// 2 puntos EXCEPTO el título (nombre del negocio), el horario (texto
// «Cerrado, abre...» / «Abierto ahora», sin píldora desde el 26 nov 2026)
// y la dirección, que no se tocan.
// El cambio es global: BusinessStore es compartido por todos los negocios.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const src = read('../components/store/BusinessStore.jsx');

describe('menú con textos 2 pt más grandes', () => {
  it('título, horario y dirección NO se tocan', () => {
    // Título: nombre del negocio.
    expect(src).toContain('<h1 style={{ margin: 0, fontSize: 26,');
    // Horario: texto discreto en 13 (sin píldora desde el 26 nov 2026).
    expect(src).toContain("<span style={{ fontSize: 13, fontWeight: 700, color: menuTheme ? menuHexAlpha(menuTheme.text, 'B3') : (dark ? '#A1A1AA' : '#71717A') }}>");
    // Dirección: enlace con la dirección corta.
    expect(src).toContain('fontSize: 13,\n                            fontWeight: 600,');
    // El separador • entre píldora y dirección tampoco cambia.
    expect(src).toContain("fontSize: 12, color: menuTheme ? menuHexAlpha(menuTheme.text, 'B3') : (dark ? '#71717A' : '#D4D4D8'), userSelect: 'none' }}>•</span>");
  });

  it('buscador, pestañas y títulos de sección suben 2 pt', () => {
    expect(src).toContain("fontSize: 18, fontWeight: 500, fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none'");
    expect(src).toContain("padding: '6px 14px',\n                      borderRadius: 16,\n                      fontSize: 15,");
    expect(src).toContain("<h3 style={{ fontSize: 21, fontWeight: 800,");
    expect(src).toContain("fontSize: 13, fontWeight: 700, color: menuTheme ? menuHexAlpha(menuTheme.text, 'B3') : (dark ? '#A1A1AA' : '#71717A'), whiteSpace: 'nowrap' }}>\n                  Fuera de servicio");
    expect(src).toContain('No se encontraron productos para "{debouncedSearch}"</p>');
    expect(src).toContain("<p style={{ marginTop: 12, fontSize: 17, color: menuT.sub, fontWeight: 600 }}>");
  });

  it('productos, descripciones y precios suben 2 pt', () => {
    expect(src).toContain("fontSize: viewMode === 'grid' ? 16 : 17, fontWeight: 800");
    expect(src).toContain("fontSize: 15, color: menuTheme ? menuHexAlpha(menuTheme.text, 'B3') : (dark ? '#A1A1AA' : '#6B7280'), display: '-webkit-box', WebkitLineClamp: 2,");
    expect(src).toContain("fontSize: viewMode === 'grid' ? 15 : 18, fontWeight: 800, color: menuTheme ? menuTheme.primary");
    expect(src).toContain("fontSize: viewMode === 'grid' ? 13 : 15, color: '#9CA3AF', textDecoration: 'line-through'");
    expect(src).toContain("fontSize: 14, fontWeight: 600, color: menuTheme ? menuHexAlpha(menuTheme.text, 'B3') : (dark ? '#A1A1AA' : '#6B7280') }}>Desde</span>");
    expect(src).toContain("fontSize: 12, fontWeight: 900, padding: '4px 8px'");
    expect(src).toContain("fontSize: 16, fontWeight: 800, color: dark ? '#FAFAFA' : '#18181B', minWidth: 24, textAlign: 'center' }}>{totalInCart}</div>");
    expect(src).toContain("fontSize: 13, color: menuTheme ? menuHexAlpha(menuTheme.text, 'B3') : (dark ? '#A1A1AA' : '#71717A'), lineHeight: 1.5, margin: 0, fontWeight: 500 }}>\n              Aviso legal:");
  });

  it('carrito y avisos suben 2 pt', () => {
    expect(src).toContain("<span style={{ fontSize: 15, fontWeight: 700 }}>Tienes productos en tu carrito</span>");
    expect(src).toContain("<span style={{ fontSize: 15, fontWeight: 700 }}>Vaciar</span>");
    expect(src).toContain("fontSize: 18, fontWeight: 800, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 8px 32px rgba(24, 24, 27, 0.4)'");
    expect(src).toContain("<div style={{ fontSize: 18, fontWeight: 900, color: '#FFFFFF' }}>{cartCount}</div>");
    expect(src).toContain("<span style={{ fontSize: 18 }}>Ver carrito</span>");
    // Los dos toasts (agregado y fuera de horario) suben de 13 a 15.
    expect(src.split("fontSize: 15,\n          fontWeight: 600,\n          boxShadow: '0 12px 32px").length - 1).toBe(2);
    // El saludo del modo local también sube (no es título, horario ni dirección).
    expect(src).toContain("fontSize: 17, fontWeight: 700, color: menuTheme ? menuTheme.text : (dark ? '#FAFAFA' : '#232326'), letterSpacing: -0.2 }}>");
  });

  it('no quedan los tamaños viejos en los textos que subieron', () => {
    expect(src).not.toContain("fontSize: viewMode === 'grid' ? 14 : 15, fontWeight: 800");
    expect(src).not.toContain("fontSize: viewMode === 'grid' ? 13 : 16, fontWeight: 800, color: menuTheme ? menuTheme.primary");
    expect(src).not.toContain("<h3 style={{ fontSize: 19, fontWeight: 800,");
    expect(src).not.toContain("fontSize: 10, fontWeight: 900, padding: '4px 8px'");
    expect(src).not.toContain("fontSize: viewMode === 'grid' ? 11 : 13, color: '#9CA3AF'");
  });
});

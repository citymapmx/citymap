import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

// Los tres errores del menú (13 nov 2026, capturas de Jonathan):
// 1) la reservación se cargaba en 2 partes (las tarjetas de servicio
//    aparecían en un segundo salto, flotando sin el resto del modal);
// 2) el logo del modal «¿Cómo nos visitas hoy?» no llenaba el círculo;
// 3) antes del menú salía una página blanca con «Cargando menú…» y 3
//    barras grises.

vi.mock('../store/useUIStore.js', () => ({ useUIStore: () => false }));
vi.mock('../store/useAuthStore.js', () => ({ useAuthStore: () => null }));
vi.mock('../hooks/useTranslation.js', () => ({ useTranslation: () => ({ t: (k, d) => d || k, lang: 'es' }) }));

const BIZ_EDUARDO = {
  id: 'dc66830f-b566-4ed8-bdb8-b09d3f566f59',
  name: 'Eduardo Barber',
  booking_config: {
    enabled: true,
    services: [
      { id: 's1', name: 'Corte', durationMin: 90, price: '150' },
      { id: 's2', name: 'Corte + Barba', durationMin: 90, price: '250' },
    ],
  },
  schedule: { vie: '09:00 a.m. - 10:00 p.m.' },
};

describe('1) la reserva se abre completa en una sola vez', () => {
  it('el modal renderiza panel, título, servicios y paginación en el mismo HTML, sin estado inicial oculto (opacity:0)', async () => {
    const { default: BookingModal } = await import('../components/BookingModal.jsx');
    const html = renderToStaticMarkup(<BookingModal biz={BIZ_EDUARDO} onClose={() => {}} />);
    // Todo el modal en un solo render: cabecera, los dos servicios con
    // su precio y duración, y la paginación (Siguiente).
    expect(html).toContain('Reservar');
    expect(html).toContain('Eduardo Barber');
    expect(html).toContain('Corte');
    expect(html).toContain('Corte + Barba');
    expect(html).toContain('$150');
    expect(html).toContain('$250');
    expect(html).toContain('Siguiente');
    // Nada nace oculto: antes el panel, el contenedor del paso y cada
    // tarjeta nacían con opacity:0 y entraban escalonadas (delay por
    // índice) tras la carga lazy del chunk — las tarjetas aparecían en
    // un segundo salto, flotando sin el resto del modal.
    expect(html).not.toContain('opacity:0');
    expect(html).not.toContain('translateY(10px)');
  });

  it('las tarjetas de servicio ya no llevan entrada escalonada (sin delay por índice)', () => {
    const src = read('../components/BookingModal.jsx');
    expect(src).not.toContain('delay: i * 0.05');
  });

  it('la ficha precarga el chunk del modal al abrirse, para que al tocar Reservar no salga el fallback de carga', () => {
    const src = read('../views/DetailView.jsx');
    expect(src).toContain("import('../components/BookingModal.jsx').catch");
  });
});

describe('2) el logo del modal «¿Cómo nos visitas hoy?» llena el círculo', () => {
  it('el círculo del modal (ficha) no lleva padding y la imagen lleva el zoom que llena el círculo', () => {
    // Hallazgo #2: el modal del MENÚ se eliminó (el menú ya no tiene
    // puerta obligatoria); el modal que queda es el de la FICHA, que
    // era el que Jonathan veía chico en su teléfono: seguía en
    // contain + padding 8 (la #306 solo arregló el del menú). El
    // círculo y el zoom son los mismos que verificó la #306.
    const src = read('../views/DetailView.jsx');
    const at = src.indexOf('¿Cómo nos visitas hoy?');
    expect(at).toBeGreaterThan(-1);
    // El bloque cubre el círculo entero: el div del círculo abre ~1900
    // caracteres antes del título (el comentario del logo es largo).
    const block = src.slice(at - 2600, at + 200);
    // Sin padding: con padding 8 la imagen solo ocupaba 58 px dentro
    // del círculo de 80 px y el emblema quedaba chico (~62%).
    expect(block).not.toContain('padding: 8');
    // Con el zoom, el emblema llega al borde del círculo y las esquinas
    // (textos diagonales de Carrito, esquinas negras de KAVA) se recortan.
    expect(block).toContain('scale(1.12)');
    expect(block).toContain("objectFit: 'cover'");
  });

  it('el logo del encabezado del menú sigue en cover sin zoom (no se tocó)', () => {
    const src = read('../components/store/BusinessStore.jsx');
    const header = src.slice(src.indexOf('Profile Logo Circular Superpuesto'), src.indexOf('Profile Logo Circular Superpuesto') + 1500);
    expect(header).toContain("objectFit: 'cover'");
    expect(header).not.toContain('scale(1.12)');
  });

  it('el modal de la ficha no se desborda en 360 px: tarjeta con border-box y título a 20 px', () => {
    // 13 nov 2026 (Jonathan): el título se veía cortado a los lados.
    // A 22 px mide ~281 px en fuentes anchas y el contenido en 360 px
    // es de 272 px; a 20 px cabe en una línea. Con border-box la
    // tarjeta nunca supera los 320 px con su padding.
    const src = read('../views/DetailView.jsx');
    const at = src.indexOf('¿Cómo nos visitas hoy?');
    const block = src.slice(at - 2600, at + 200);
    expect(block).toContain("boxSizing: 'border-box'");
    expect(block).toContain('fontSize: 20');
    expect(block).not.toContain('fontSize: 22');
  });
});

describe('3) la pantalla de carga del menú usa el tema del negocio', () => {
  // Hallazgo #2: la pantalla de carga es ahora UN solo componente
  // compartido (MenuLoadingScreen): lo muestra MenuView mientras
  // cargan negocio + categorías, y BusinessStore lo reutiliza cuando
  // carga solo (ficha). La #306 le puso el tema; la carga única la
  // comparte en vez de tener dos esqueletos.
  const loadingBlock = () => read('../components/store/MenuLoadingScreen.jsx');

  it('el fondo de la carga es el degradado del tema (no blanco fijo) y el texto usa el color del tema', () => {
    const block = loadingBlock();
    expect(block).toContain('menuTheme.background');
    expect(block).toContain('menuTheme.text');
  });

  it('la carga muestra el logo y el nombre del negocio, no solo «Cargando menú…» y barras', () => {
    const block = loadingBlock();
    expect(block).toContain('business.name');
    expect(block).toContain('getThumbUrl(business.logo_url');
    expect(block).toContain('Cargando {storeLabel}');
  });

  it('las barras usan el color del tema atenuado y llevan pulso (no gris fijo sobre blanco)', () => {
    const block = loadingBlock();
    expect(block).toContain("menuHexAlpha(menuTheme.text, '26')");
    expect(block).toContain('menuSkeletonPulse');
    expect(block).not.toContain("background:dark ? '#232326' : '#F4F4F5'");
  });

  it('BusinessStore ya no tiene su propia pantalla de carga: usa la compartida', () => {
    const store = read('../components/store/BusinessStore.jsx');
    expect(store).toContain('<MenuLoadingScreen business={business} storeLabel={storeLabel} dark={dark} />');
    expect(store).not.toContain('menuSkeletonPulse');
  });
});

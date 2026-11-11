import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const read = (rel) => readFileSync(join(here, rel), 'utf8');

// 11 nov 2026 (Jonathan, con capturas de El Tentempié): (1) la portada
// del menú mide lo mismo que la de la ficha, para que el paso ficha →
// menú no se sienta brusco; (2) la píldora «Compartir» sale de la
// página pública del menú y las tarjetas pasan al panel del dueño (el
// icono superior se conserva); (3) la dirección del menú se ajusta a
// la pantalla en vez de cortarse en el borde derecho.
describe('página del menú: portada, compartir y dirección', () => {
  it('la portada del menú mide lo mismo que la de la ficha (220 px con foto, 64 sin foto)', () => {
    const store = read('../components/store/BusinessStore.jsx');
    expect(store).toContain('const coverHeight = coverPhoto ? 220 : 64;');
    expect(store).toContain('height: coverHeight');
    expect(store).not.toContain('800/340');
    const detail = read('../views/DetailView.jsx');
    // La ficha: 220 px con foto (isElite está desactivado), 64 sin foto.
    expect(detail).toContain('(isElite ? "40vh" : 220) : 64');
  });

  it('el círculo del logo del menú está en la misma posición que en la ficha (izquierda, 96 px, 68 px por encima del borde inferior de la portada)', () => {
    const store = read('../components/store/BusinessStore.jsx');
    expect(store).toContain("justifyContent: 'flex-start'");
    expect(store).toContain('marginTop: -68');
    expect(store).toContain('width: 96,');
    const detail = read('../views/DetailView.jsx');
    expect(detail).toContain('top: -48, left: 16, width: 96, height: 96');
  });

  it('la dirección del menú se ajusta a la pantalla (varias líneas, sin recorte en una línea)', () => {
    const store = read('../components/store/BusinessStore.jsx');
    // El viejo span de la dirección recortaba en una línea con puntos
    // suspensivos; ya no existe (otros nowrap/ellipsis del archivo,
    // como el toast, no son la dirección).
    expect(store).not.toContain(
      "overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'",
    );
    expect(store).toContain("overflowWrap: 'break-word'");
    expect(store).toContain("wordBreak: 'break-word'");
  });

  it('el panel del dueño tiene la entrada «Compartir mi negocio» con la hoja de tarjetas', () => {
    const owner = read('../views/OwnerDashboardView.jsx');
    expect(owner).toContain('Compartir mi negocio');
    expect(owner).toContain("lazy(() => import('../components/ShareCardSheet.jsx'))");
    expect(owner).toContain('<ShareCardSheet biz={ownerView} hasMenu');
    expect(owner).toContain('onShareLink={(b) => doShare(b)}');
    expect(owner).toContain('setShowShareCard(true)');
    // El panel es solo del dueño: sin ownerView redirige a inicio.
    expect(owner).toContain('if (!ownerView) return null');
  });

  it('la ficha conserva su botón de compartir', () => {
    const detail = read('../views/DetailView.jsx');
    expect(detail).toContain('setShowShareCard(true)');
    expect(detail).toContain('<ShareCardSheet biz={selected}');
  });
});

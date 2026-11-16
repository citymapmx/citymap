import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

// Botón de Civitatis en el detalle del tour (pedido por Jonathan con
// captura, 15 nov 2026): el logo era el icono cuadrado de la app y la
// palabra medía ~4 px, no se leía; además el botón solo decía
// «Civitatis», sin verbo. Propuestas 1 y 3: logo horizontal oficial en
// blanco + «Reservar ↗», y microcopy de confianza debajo del botón.

describe('Botón de Civitatis en el detalle del tour', () => {
  const src = read('../components/ExperienceViewer.jsx');

  it('usa el logo horizontal blanco, no el icono cuadrado', () => {
    expect(src).toContain('civitatis-logo-blanco.svg');
    expect(src).toContain('isCivitatis');
    // El logo va a 20 px de alto (la palabra pasa de ~4 px a ~20 px).
    expect(src).toContain('height: 20');
  });

  it('el texto es «Reservar ↗», no «Civitatis» solo', () => {
    expect(src).toContain('Reservar ↗');
    expect(src).toContain('revista_reservar');
  });

  it('el fondo es #E60045 (contraste AA) en vez del rosa #FF004F', () => {
    expect(src).toContain("'#E60045'");
    // El resto de plataformas sigue usando su propio color.
    expect(src).toContain("const btnBg = isCivitatis ? '#E60045' : s.color;");
  });

  it('muestra el microcopy de confianza solo cuando hay enlace de Civitatis', () => {
    expect(src).toContain('Serás redirigido a civitatis.com para completar tu reserva');
    expect(src).toContain('revista_redireccion_civitatis');
    expect(src).toContain("externalLinks.some((l) => l.platform === 'civitatis'");
  });

  it('el enlace de afiliado sigue intacto (misma URL, pestaña nueva)', () => {
    expect(src).toContain('onClick={() => openLink(l.url)}');
    expect(src).toContain("window.open(finalUrl, '_blank', 'noopener,noreferrer')");
  });
});

describe('Logo horizontal blanco de Civitatis', () => {
  const svg = read('../../public/civitatis-logo-blanco.svg');

  it('es el wordmark oficial horizontal (145 × 32) con los paths en blanco', () => {
    expect(svg).toContain('viewBox="0 0 145 32"');
    expect(svg).toContain('fill="#fff"');
    expect(svg).not.toContain('fill="#000"');
    // Los 12 paths del logo oficial, sin tocar.
    expect(svg.split('<path').length - 1).toBe(12);
  });

  it('tiene su documento de origen', () => {
    const doc = read('../../public/civitatis-logo-blanco-source.md');
    expect(doc).toContain('https://www.civitatis.com/f/images/logos/civitatis.svg');
    expect(doc).toContain('aad25a041db52afd8357070d1c7975420c3fc90188c6ae17cfb7b96da5c9052d');
  });
});

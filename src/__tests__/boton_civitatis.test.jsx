import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

// Botón de Civitatis en el detalle del tour (pedido por Jonathan con
// captura, 15 nov 2026): el logo era el icono cuadrado de la app y la
// palabra medía ~4 px, no se leía; además el botón solo decía
// «Civitatis», sin verbo. Propuestas 1 y 3: logo horizontal oficial en
// blanco + «Reservar en Civitatis», y microcopy de confianza debajo del
// botón. Ajuste 15 nov ~23:13 (Jonathan): el logo va a la medida de las
// letras (15 px) y el texto dice «Reservar en Civitatis». Ajuste 15 nov
// ~23:31 (Jonathan eligió, con captura del tour de Tolantongo): el texto
// dice solo «Reservar en» y el logo va a la DERECHA — antes la palabra
// «Civitatis» salía dos veces (el logo ya la dice y el texto la repetía).

describe('Botón de Civitatis en el detalle del tour', () => {
  const src = read('../components/ExperienceViewer.jsx');

  it('usa el logo horizontal blanco, no el icono cuadrado, y va a la derecha del texto', () => {
    expect(src).toContain('civitatis-logo-blanco.svg');
    expect(src).toContain('isCivitatis');
    // El logo va a 15 px de alto, a la medida de las letras del texto
    // (la palabra pasa de ~4 px a ~11 px de alto visible).
    expect(src).toContain('height: 15');
    // El texto va ANTES que el logo en el botón (logo a la derecha).
    expect(src.indexOf('t("revista_reservar_en"')).toBeLessThan(src.indexOf('civitatis-logo-blanco.svg'));
  });

  it('el texto es solo «Reservar en»: la palabra «Civitatis» no se repite', () => {
    expect(src).toContain('t("revista_reservar_en", "Reservar en")');
    expect(src).toContain('revista_reservar_en');
    // Sin la palabra repetida: el logo ya dice «civitatis».
    expect(src).not.toContain('Reservar en Civitatis');
    expect(src).not.toContain('revista_reservar_en_civitatis');
    // Sin flecha: la clave vieja «revista_reservar» se traduce como
    // «Reservar» sin flecha, por eso la ↗ nunca se vio en vivo.
    expect(src).not.toContain('Reservar ↗');
  });

  it('la traducción existe en español e inglés', () => {
    expect(read('../lib/i18n.js')).toContain('"revista_reservar_en": "Reservar en"');
    expect(read('../lib/i18n-en.js')).toContain('"revista_reservar_en": "Book on"');
    expect(read('../lib/i18n.js')).not.toContain('revista_reservar_en_civitatis');
    expect(read('../lib/i18n-en.js')).not.toContain('revista_reservar_en_civitatis');
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

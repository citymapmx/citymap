import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

// Tarjeta de eventos solo-imagen (pedido de Jonathan, nov 2026):
// solo la foto con esquinas redondeadas, sin título ni fecha debajo,
// y la fecha como etiqueta pequeña arriba a la izquierda sobre la foto.
describe('event list card: image only', () => {
  const src = read('../views/EventsView.jsx');
  // Bloque de la tarjeta: del botón .event-list-card al botón del corazón.
  const card = src.slice(
    src.indexOf('className="event-list-card"'),
    src.indexOf('handleToggleSaveEvent', src.indexOf('className="event-list-card"')),
  );

  it('has no bottom panel with date and visible title', () => {
    expect(card).not.toContain("padding:'12px 12px 14px'");
    expect(card).not.toContain('<h3');
  });

  it('shows the date as a small pill at the top-left inside the image container', () => {
    // La etiqueta vive dentro del contenedor aspectRatio 5/7, después de la imagen.
    const imageBox = card.slice(card.indexOf("aspectRatio:'5 / 7'"));
    expect(imageBox).toMatch(/position:'absolute', top:8, left:8, zIndex:2/);
    expect(imageBox).toMatch(/borderRadius:999, padding:'4px 10px', fontSize:12, fontWeight:700/);
    expect(imageBox).toMatch(/background:'rgba\(0,0,0,0\.55\)', color:'#FFFFFF'/);
    expect(imageBox).toContain('{fmtCardDate(ev)}');
  });

  it('la foto llena la tarjeta (cover), sin fondo difuminado (PR #153)', () => {
    // La foto llena toda el área 5:7 recortando los lados si hace falta:
    // se acabó el contain con bandas grises y el fondo difuminado de la
    // misma imagen (regla del PR #132, anulada por Jonathan en nov 2026).
    expect(card).toContain("objectFit:'cover'");
    expect(card).not.toContain("objectFit:'contain'");
    expect(card).not.toContain('blur(24px)');
    expect(card).not.toContain('Fondo difuminado');
  });

  it('is only the image: no white background or card border, rounded corners kept', () => {
    const article = src.slice(src.indexOf('<article key={ev.id}'), src.indexOf('className="event-list-card"'));
    expect(article).toContain('borderRadius:18');
    expect(article).toContain("overflow:'hidden'");
    expect(article).not.toContain('background:T.white');
    expect(article).not.toContain('border:');
  });

  it('keeps tap-to-detail, the save heart and screen-reader title/date', () => {
    // onClick y aria-label van antes de className en el botón, se verifican en src.
    expect(src).toContain('onClick={() => handleEventTap(ev)}');
    expect(src).toContain("aria-label={`${localizedTitle(ev, lang) || 'Evento'}. ${fmtCardDate(ev)}`");
    expect(card).toContain("alt={localizedTitle(ev, lang) || 'Evento'}");
    expect(src).toContain('handleToggleSaveEvent(ev, e)');
    // El corazón sigue en top:6, right:6 (ahora va en el buttonStyle de
    // SaveHeartButton, con espacios como el resto del archivo).
    expect(src).toContain("top: 6, right: 6");
  });
});

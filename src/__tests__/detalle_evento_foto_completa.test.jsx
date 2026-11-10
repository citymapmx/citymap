import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

const modalSrc = fs.readFileSync(new URL('../components/modals/EventDetailModal.jsx', import.meta.url), 'utf8');
const posterSrc = fs.readFileSync(new URL('../components/detail/EventPoster.jsx', import.meta.url), 'utf8');

// El detalle de evento muestra el póster COMPLETO arriba y el título
// debajo: la imagen es la protagonista y nada la tapa. Antes el héroe
// recortaba el póster a 200/280 px y el título iba superpuesto sobre
// la foto con un degradado oscuro.
describe('detalle de evento: póster completo y título debajo', () => {
  it('el héroe no recorta la foto: sin maxHeight ni overflow hidden', () => {
    expect(modalSrc).not.toContain('maxHeight: heroLuma');
    expect(modalSrc).not.toContain('maxHeight: 280');
    expect(modalSrc).not.toContain('maxHeight: 200');
    // El contenedor del héroe ya no corta nada: la única altura del
    // héroe es la natural de la imagen.
    expect(modalSrc).not.toMatch(/width: "100%", maxHeight/);
  });

  it('no hay degradado oscuro ni desvanecido inferior sobre la foto', () => {
    expect(modalSrc).not.toContain('rgba(0,0,0,0.55)');
    expect(modalSrc).not.toContain('rgba(0,0,0,0.75)');
    expect(modalSrc).not.toContain('transparent 0%, ${T.bg} 100%');
    expect(modalSrc).not.toContain('Desvanecido sutil del borde inferior');
  });

  it('el título va debajo de la foto, en la tarjeta de contenido', () => {
    // El h1 ya no depende del modo del héroe: se pinta siempre.
    expect(modalSrc).not.toContain('{!heroLuma && (');
    expect(modalSrc).toContain('<h1');
    // Orden en el archivo = orden en la pantalla: primero el póster
    // del héroe, luego la tarjeta de contenido con el h1.
    expect(modalSrc.indexOf('<EventPoster')).toBeLessThan(modalSrc.indexOf('CONTENT CARD'));
    expect(modalSrc.indexOf('CONTENT CARD')).toBeLessThan(modalSrc.indexOf('<h1'));
    // El título es grande (30 px) en vigentes y conserva 24 px en pasados.
    expect(modalSrc).toContain('fontSize: isPast ? 24 : 30');
  });

  it('el recinto va debajo del título y la fecha en su píldora', () => {
    const h1 = modalSrc.indexOf('<h1');
    const venue = modalSrc.indexOf('{!isPast && ev.venue_name && (');
    expect(venue).toBeGreaterThan(h1);
    // La píldora de fecha (solo privados en claro) va antes del título.
    expect(modalSrc).toContain('{!isPast && heroDate && (');
    expect(modalSrc.indexOf('{!isPast && heroDate && (')).toBeLessThan(h1);
  });

  it('se conservan los botones flotantes sobre la foto', () => {
    expect(modalSrc).toContain('Floating Back Button');
    expect(modalSrc).toContain('Floating Share Button');
    expect(modalSrc).toContain('position: "absolute", top: "calc(env(safe-area-inset-top, 0px) + 16px)"');
    // Los dos botones de compartir (héroe y evento pasado) siguen.
    expect(modalSrc.match(/setShowShareCard\(true\)/g)?.length).toBe(2);
  });

  it('se conservan el cambio de foto del anfitrión y el bloque sin foto', () => {
    expect(modalSrc).toContain('eventos_cambiar_foto');
    expect(modalSrc).toContain('photoInputRef');
    expect(modalSrc).toContain('name="calendar"');
  });

  it('la rama de eventos pasados sigue sin foto grande', () => {
    expect(modalSrc).toContain('{isPast ? (');
    expect(modalSrc).toContain('eventos_ya_termino');
  });

  it('la información no duplica el recinto que ya muestra la cabecera', () => {
    expect(modalSrc.match(/heroShowsVenue=\{!isPast\}/g)?.length).toBe(2);
  });
});

describe('detalle de evento: nitidez del póster en retina', () => {
  it('la imagen de detalle se pide a 1200 (1600 efectiva) para 460 px a 2x/3x', () => {
    expect(posterSrc).toContain('getThumbUrl(src, 1200)');
    // La vista previa progresiva sigue siendo chica (400).
    expect(posterSrc).toContain('getThumbUrl(src, 400)');
  });
});

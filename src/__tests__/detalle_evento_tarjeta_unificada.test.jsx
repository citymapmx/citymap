import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import EventInformation from '../components/detail/EventInformation.jsx';

const infoSrc = fs.readFileSync(new URL('../components/detail/EventInformation.jsx', import.meta.url), 'utf8');
const modalSrc = fs.readFileSync(new URL('../components/modals/EventDetailModal.jsx', import.meta.url), 'utf8');
// La tarjeta del reproductor, del comentario MÚSICA al de ASOCIADO CON.
const musicSection = modalSrc.slice(
  modalSrc.indexOf('MÚSICA DEL ARTISTA'),
  modalSrc.indexOf('ASOCIADO CON')
);

const T = { text: '#111', sub: '#666', bg: '#fff', border: '#ddd', shadow: '0 2px 16px rgba(0,0,0,.07)' };
const event = {
  date: '2026-11-11', time: '21:00',
  venue_name: 'Teatro Diana', venue_address: 'Av. 16 de Septiembre 710, Guadalajara',
  description: 'Concierto de Andrés Calamaro.',
  price_type: 'paid', price: 500,
};
const render = (props = {}) => renderToStaticMarkup(<EventInformation event={event} T={T} {...props} />);

// PR #228 (Jonathan, 11 nov 2026, capturas del detalle de Calamaro):
// la tarjeta de información y el reproductor «Música del artista»
// van en UNA sola tarjeta: información con degradado vertical
// #34383B → #050505, reproductor con su rojo original, esquinas
// superiores cuadradas y solo las dos inferiores redondeadas.
// Sin reproductor, la tarjeta de información lleva el radio completo.
describe('tarjeta unificada del detalle del evento', () => {
  it('la tarjeta de información lleva el degradado #34383B → #050505', () => {
    expect(infoSrc).toContain("linear-gradient(180deg, #34383B 0%, #050505 100%)");
    expect(render()).toContain('linear-gradient(180deg, #34383B 0%, #050505 100%)');
  });

  it('el radio de la tarjeta es condicional según exista el reproductor', () => {
    expect(infoSrc).toContain('borderRadius: unified ? 0 : 20');
    // Sin reproductor: las 4 esquinas redondeadas, como antes.
    expect(render()).toContain('border-radius:20px');
    expect(render()).not.toContain('border-radius:0');
    // Con reproductor: esquinas superiores cuadradas (las
    // inferiores redondeadas las pone el reproductor).
    const unified = render({ unified: true });
    expect(unified).toContain('border-radius:0');
    expect(unified).not.toContain('border-radius:20px');
  });

  it('sin reproductor la tarjeta conserva su sombra y su margen inferior', () => {
    const html = render();
    expect(html).toContain('box-shadow:0 2px 16px rgba(0,0,0,.07)');
    expect(html).toContain('margin-bottom:22px');
    // Con reproductor no hay sombra ni margen: se funde con él.
    const unified = render({ unified: true });
    expect(unified).toContain('box-shadow:none');
    expect(unified).toContain('margin-bottom:0');
  });

  it('el texto de la tarjeta es blanco para leerse sobre el fondo oscuro', () => {
    const html = render();
    expect(html).toContain('color:#FFFFFF');
    expect(html).toContain('color:rgba(255,255,255,0.75)');
  });

  it('el contenido y la distribución no cambian', () => {
    const html = render();
    expect(html).toContain('11 de noviembre de 2026');
    expect(html).toContain('9:00 p. m.');
    expect(html).toContain('Teatro Diana');
    expect(html).toContain('Av. 16 de Septiembre 710, Guadalajara');
    expect(html).toContain('Añadir a mi calendario');
    expect(html).toContain('Cómo llegar');
    expect(html).toContain('Entrada: $500');
    // La descripción sigue fuera de la tarjeta, arriba de ella.
    expect(html.indexOf('Acerca del evento')).toBeLessThan(html.indexOf('linear-gradient(180deg, #34383B'));
  });

  it('el modal pasa unified solo cuando el reproductor existe', () => {
    expect(modalSrc).toContain('unified={Boolean(musicQuery && musicTracks && musicTracks.length > 0)}');
    // La pestaña de detalles del evento privado no lleva reproductor.
    expect(modalSrc).toContain("{privateTab === 'detalles' && <EventInformation event={evLocalized} associatedBiz={associatedBiz} T={T} hideTickets={false} hidePriceRow={Boolean(topPriceLabel)} />}");
  });

  it('el reproductor es la mitad inferior: rojo original, esquinas superiores cuadradas e inferiores redondeadas', () => {
    expect(musicSection).toContain('background: APPLE_MUSIC_RED');
    expect(musicSection).toContain("borderRadius: '0 0 20px 20px'");
    // Sin borde: uno claro dibujaría una línea en la junta con la
    // parte oscura (los separadores entre canciones sí se quedan).
    expect(musicSection).not.toContain("border: '1px solid rgba(255,255,255,0.25)'");
  });
});

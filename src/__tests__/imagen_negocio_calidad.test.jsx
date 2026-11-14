import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { getThumbUrl } from '../lib/utils.js';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

// Baja calidad al abrir un negocio (14 nov 2026, Jonathan con capturas):
// la ficha/popup de Eduardo Barber en el mapa se veía borrosa, mientras
// la tarjeta del evento (XV Campeonato Nacional Charro) se veía nítida.
//
// Diagnóstico con evidencia (URLs y dimensiones medidas con la foto real):
// - Eduardo Barber: banner_url null; la foto que se muestra es
//   photos[0] = 1794615235918_kvkaet.webp, fuente ORIGINAL de 1254×1254 px.
//   La fuente NO era el problema.
// - El popup del negocio pedía getThumbUrl(foto, 400, 300): el render de
//   Supabase servía 400×300 px (16,7 KB medidos) para una caja de 320×160
//   CSS con objectFit cover. En un iPhone DPR 3 son 960×480 px físicos:
//   la imagen se estiraba 2,4× → borrosa.
// - El popup del evento pedía getThumbUrl(img, 800) sin alto: el render
//   servía 800×1000 px (75,3 KB medidos) para una caja de 280×373 CSS
//   (~1:1 en DPR 3) → nítido. Por eso los eventos se ven bien.
// - La ficha (DetailView) ya pedía 1200×900 → bucket 1600×1200; el render
//   la limitó a la fuente (1254×1200 medidos), suficiente para su banner
//   de 390×220 CSS. No era la culpable en este negocio.
//
// Arreglo: el popup del negocio pide ahora 800×400 (misma proporción 2:1
// de su caja 320×160, cobertura DPR 2,5, igual que el popup de eventos).
const FOTO_EDUARDO = 'https://dpkjxhjkzdlkvyotoeai.supabase.co/storage/v1/object/public/media/cityguide/1794615235918_kvkaet.webp';
const POSTER_CHARRO = 'https://dpkjxhjkzdlkvyotoeai.supabase.co/storage/v1/object/public/media/cityguide/1791295635795_o0b56q.jpg';

describe('imagen del negocio al abrirlo (popup del mapa)', () => {
  it('getThumbUrl: 800×400 sirve 800 de ancho con resize cover (no 400)', () => {
    const url = getThumbUrl(FOTO_EDUARDO, 800, 400);
    expect(url).toContain('width=800');
    expect(url).toContain('height=400');
    expect(url).toContain('resize=cover');
    expect(url).not.toContain('width=400');
  });

  it('getThumbUrl: el tamaño viejo 400×300 servía solo 400 de ancho', () => {
    expect(getThumbUrl(FOTO_EDUARDO, 400, 300)).toContain('width=400');
  });

  it('MapView: el popup del negocio pide la imagen a 800×400', () => {
    const src = read('../views/MapView.jsx');
    expect(src).toContain('mapPin.photos?.[0]?.url || mapPin.logo_url || mapPin.banner_url, 800, 400');
    expect(src).not.toContain('mapPin.photos?.[0]?.url || mapPin.logo_url || mapPin.banner_url, 400, 300');
  });

  it('MapView: el popup del evento sigue pidiendo 800 de ancho (sin tocar)', () => {
    const src = read('../views/MapView.jsx');
    expect(src).toContain('getThumbUrl(mapPin.img_url || mapPin.img, 800)');
    // El evento se ve nítido porque sirve 800×1000 para 280×373 CSS.
    const url = getThumbUrl(POSTER_CHARRO, 800);
    expect(url).toContain('width=800');
    expect(url).toContain('resize=contain');
  });

  it('DetailView: la ficha sigue pidiendo su banner a 1200×900 (sin tocar)', () => {
    const src = read('../views/DetailView.jsx');
    expect(src).toContain('getThumbUrl(selected.photos?.find(photo => photo?.url)?.url || selected.banner_url || selected.logo_url, 1200, 900)');
  });

  it('BusinessStore: el banner del MENÚ sigue a 800 de ancho (PR #312, sin tocar)', () => {
    const src = read('../components/store/BusinessStore.jsx');
    expect(src).toContain('widthRequest={800}');
  });
});

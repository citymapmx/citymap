import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { getThumbSrcSet, getThumbUrl, SRCSET_WHEEL_FRONT } from '../lib/utils.js';
import { WHEEL_IMG_W, WHEEL_ROW_W } from '../lib/wheelPreload.js';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

// Punto 3 de la lista de lentitud (18 nov 2026): las imágenes de la
// primera pantalla frenaban la salida del splash. El póster frontal de
// la rueda se pedía a 800 px con decoding="sync" (decodificación
// síncrona en el hilo principal). Arreglo: frente a 600 px (la cara se
// ve a ~216 px CSS, a 3x son ~650 px de dispositivo: 600 cubre sin que
// se vea blando, a 400 sí se veía, PR #264) y decoding="async".
//
// Ojo: getThumbUrl redondea a buckets (200/400/600/800/1000/1200/1600/2400), así que
// pedir 600 devolvía el archivo de 800. El bucket de 600 es lo que hace
// real el cambio; sin él, WHEEL_IMG_W = 600 sería un no-op.
const POSTER_SB = 'https://dpkjxhjkzdlkvyotoeai.supabase.co/storage/v1/object/public/media/cityguide/poster.jpg';
const POSTER_CLOUD = 'https://res.cloudinary.com/demo/image/upload/sample.jpg';

describe('primera pantalla: frente de la rueda a 600 px, decodificación asíncrona', () => {
  it('WHEEL_IMG_W es 600 y la hilera simple sigue en 800', () => {
    expect(WHEEL_IMG_W).toBe(600);
    // La hilera (tarjetas de 300 px CSS, ~900 px de dispositivo a 3x)
    // sí necesita 800: a 400 se veía blanda (PR #264).
    expect(WHEEL_ROW_W).toBe(800);
  });

  it('getThumbUrl: pedir 600 sirve un archivo de 600 (bucket nuevo)', () => {
    expect(getThumbUrl(POSTER_SB, 600)).toContain('width=600');
    expect(getThumbUrl(POSTER_SB, 600)).not.toContain('width=800');
    expect(getThumbUrl(POSTER_CLOUD, 600)).toContain('w_600');
  });

  it('getThumbUrl: los límites del bucket no se mueven (400→400, 601→800)', () => {
    expect(getThumbUrl(POSTER_SB, 400)).toContain('width=400');
    expect(getThumbUrl(POSTER_SB, 601)).toContain('width=800');
    expect(getThumbUrl(POSTER_SB, 800)).toContain('width=800');
  });

  it('SRCSET_WHEEL_FRONT es [400, 600] y su srcset no ofrece 800', () => {
    expect([...SRCSET_WHEEL_FRONT]).toEqual([400, 600]);
    const srcset = getThumbSrcSet(POSTER_SB, SRCSET_WHEEL_FRONT);
    expect(srcset).toContain('400w');
    expect(srcset).toContain('600w');
    expect(srcset).not.toContain('800w');
  });

  it('EventWheel3D: la imagen de frente usa el preset de 600 y decoding async', () => {
    const src = read('../components/home/EventWheel3D.jsx');
    expect(src).toContain('getThumbSrcSet(item.img, SRCSET_WHEEL_FRONT)');
    expect(src).toContain('decoding="async"');
    expect(src).not.toContain('decoding="sync"');
    // La hilera simple sigue a 800.
    expect(src).toContain('widthRequest={WHEEL_ROW_W}');
  });

  it('ExperienceViewer y DetailView: la foto de reseña sigue pidiendo 800×800 (sin tocar)', () => {
    // Con el bucket nuevo, el viejo (600, 600) serviría 600: se pidió
    // 800 explícito para que la foto se vea igual que antes.
    const exp = read('../components/ExperienceViewer.jsx');
    expect(exp).toContain('getThumbUrl(r.img_url, 800, 800)');
    const det = read('../views/DetailView.jsx');
    expect(det).toContain('getThumbUrl(r.img_url, 800, 800)');
    const url = getThumbUrl(POSTER_SB, 800, 800);
    expect(url).toContain('width=800');
    expect(url).toContain('height=800');
  });
});

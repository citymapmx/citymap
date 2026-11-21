import { describe, it, expect } from 'vitest';
import { getThumbUrl, getThumbSrcSet, SRCSET_BANNER } from '../lib/utils.js';

// Hallazgo 9 de la auditoría de fluidez (21 nov 2026): el bucket de
// getThumbUrl saltaba de 800 a 1600, así que todo lo pedido a 1000/1080/
// 1200 se servía a 1600 px (~144 KB en vez de ~70 KB a 600 px, medido en
// la auditoría). Arreglo: buckets nuevos 1000 y 1200. El 1600 sigue
// existiendo para pedidos explícitos mayores de 1200; lo que cambia es
// que el detalle (1200) y la exportación (1080) ya no suben a 1600.
// La nitidez no baja: el bucket servido siempre es >= el ancho pedido
// (1200 cubre la exportación a 1080 y el detalle a 1200).

const FOTO_SB = 'https://dpkjxhjkzdlkvyotoeai.supabase.co/storage/v1/object/public/media/cityguide/foto.jpg';
const FOTO_CLOUD = 'https://res.cloudinary.com/demo/image/upload/sample.jpg';

describe('buckets de getThumbUrl: 1000 y 1200', () => {
  it('pedir 1200 sirve 1200 (no 1600) en Supabase y Cloudinary', () => {
    expect(getThumbUrl(FOTO_SB, 1200)).toContain('width=1200');
    expect(getThumbUrl(FOTO_SB, 1200)).not.toContain('width=1600');
    expect(getThumbUrl(FOTO_CLOUD, 1200)).toContain('w_1200');
    expect(getThumbUrl(FOTO_CLOUD, 1200)).not.toContain('w_1600');
  });

  it('pedir 1000 sirve 1000 (no 1600)', () => {
    expect(getThumbUrl(FOTO_SB, 1000)).toContain('width=1000');
    expect(getThumbUrl(FOTO_SB, 1000)).not.toContain('width=1600');
  });

  it('pedir 1080 (tarjetas de compartir) sirve 1200: cubre la exportación a 1080', () => {
    expect(getThumbUrl(FOTO_SB, 1080)).toContain('width=1200');
    expect(getThumbUrl(FOTO_CLOUD, 1080)).toContain('w_1200');
  });

  it('los buckets viejos no cambian: 800 sigue en 800 y 600 en 600', () => {
    expect(getThumbUrl(FOTO_SB, 800)).toContain('width=800');
    expect(getThumbUrl(FOTO_SB, 600)).toContain('width=600');
    expect(getThumbUrl(FOTO_SB, 400)).toContain('width=400');
  });

  it('el 1600 sigue disponible para pedidos mayores de 1200', () => {
    expect(getThumbUrl(FOTO_SB, 1400)).toContain('width=1600');
    expect(getThumbUrl(FOTO_SB, 1600)).toContain('width=1600');
    expect(getThumbUrl(FOTO_SB, 2000)).toContain('width=2400');
  });

  it('1200×900 conserva la proporción: 1200×900 (no 1600×1200)', () => {
    const url = getThumbUrl(FOTO_SB, 1200, 900);
    expect(url).toContain('width=1200');
    expect(url).toContain('height=900');
  });

  it('el srcset con [400, 800, 1200] da 3 candidatos con descriptores exactos', () => {
    const srcset = getThumbSrcSet(FOTO_SB, [400, 800, 1200]);
    expect(srcset).toContain('400w');
    expect(srcset).toContain('800w');
    expect(srcset).toContain('1200w');
    expect(srcset).not.toContain('1600w');
  });

  it('SRCSET_BANNER es [400, 800, 1200]: el banner ya no sube a 1600', () => {
    expect([...SRCSET_BANNER]).toEqual([400, 800, 1200]);
  });
});

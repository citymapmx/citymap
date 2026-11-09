import { describe, it, expect } from 'vitest';

const banners = [
  { id: 'b1', img_url: 'https://ejemplo.com/a.webp', title: 'Akami Sushi', is_advertisement: true, link_url: 'https://akami.example' },
  { id: 'b2', img_url: 'https://ejemplo.com/b.webp', title: 'Promo 2', is_advertisement: true },
  { id: 'b3', img_url: 'https://ejemplo.com/c.webp', title: 'Promo 3', is_advertisement: false },
];

async function renderSlider(list) {
  const React = (await import('react')).default;
  const { renderToStaticMarkup } = await import('react-dom/server');
  const BannerSlider = (await import('../components/home/BannerSlider.jsx')).default;
  return renderToStaticMarkup(<BannerSlider activeBanners={list} />);
}

describe('BannerSlider', () => {
  it('muestra el primer banner con su etiqueta de Publicidad', async () => {
    const html = await renderSlider(banners);
    expect(html).toContain('https://ejemplo.com/a.webp');
    expect(html).toContain('Publicidad');
  });

  it('muestra un punto sutil por banner; el activo es más ancho', async () => {
    const html = await renderSlider(banners);
    expect(html).toContain('Ver banner 1 de 3');
    expect(html).toContain('Ver banner 2 de 3');
    expect(html).toContain('Ver banner 3 de 3');
    expect(html).toContain('width:18px');
    expect(html).toContain('width:6px');
  });

  it('sin puntos con un solo banner y nada sin banners', async () => {
    expect(await renderSlider(banners.slice(0, 1))).not.toContain('Ver banner');
    expect(await renderSlider([])).toBe('');
    expect(await renderSlider(null)).toBe('');
  });
});

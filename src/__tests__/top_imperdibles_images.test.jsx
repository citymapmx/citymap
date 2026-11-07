import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import TopImperdibles from '../components/home/TopImperdibles.jsx';

const T = { text: '#111', sub: '#666', bg: '#fff', card: '#fff', shadow: 'none', border: '#eee' };

function renderExperiences(experiences) {
  return renderToStaticMarkup(
    <MemoryRouter>
      <TopImperdibles experiences={experiences} T={T} city={{ slug: 'tepic', name: 'Tepic' }} />
    </MemoryRouter>
  );
}

describe('TopImperdibles images', () => {
  it('serves gallery photos through the image optimizer at 800 px, not raw', () => {
    const html = renderExperiences([
      { id: 'exp-1', title: 'Cerro de la Cruz', city_slug: 'tepic', gallery: ['https://example.supabase.co/storage/v1/object/public/media/cityguide/foto.webp'] },
    ]);
    const srcs = [...html.matchAll(/<img[^>]+src="([^"]+)"/g)].map((m) => m[1].replaceAll('&amp;', '&'));
    expect(srcs).toHaveLength(1);
    const url = new URL(srcs[0]);
    expect(url.pathname).toContain('/render/image/public/');
    expect(url.searchParams.get('width')).toBe('800');
    expect(url.searchParams.get('format')).toBe('webp');
  });

  it('leaves external gallery URLs untouched', () => {
    const html = renderExperiences([
      { id: 'exp-2', title: 'Mirador del Toro', city_slug: 'tepic', gallery: ['https://example.org/foto.jpg'] },
    ]);
    expect(html).toContain('https://example.org/foto.jpg');
  });

  it('renders nothing without experiences', () => {
    expect(renderExperiences([])).toBe('');
  });
});

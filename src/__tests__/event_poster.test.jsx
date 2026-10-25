import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import EventPoster from '../components/detail/EventPoster.jsx';
import NextEventPoster from '../../web-next/src/components/detail/EventPoster.jsx';

const poster = 'https://example.supabase.co/storage/v1/object/public/media/event.jpeg';

describe.each([['Vite', EventPoster], ['Next.js', NextEventPoster]])('%s event poster', (_name, Poster) => {
  it('requests uncropped preview and detail images with matching proportions', () => {
    const html = renderToStaticMarkup(<Poster src={poster} alt="Festival" />);
    const urls = [...html.matchAll(/<img[^>]+src="([^"]+)"/g)].map(m => m[1].replaceAll('&amp;', '&'));
    expect(urls).toHaveLength(2);
    const preview = new URL(urls[0]);
    const detail = new URL(urls[1]);
    expect(preview.searchParams.get('width')).toBe('400');
    expect(preview.searchParams.has('height')).toBe(false);
    expect(detail.pathname).toContain('/render/image/public/');
    expect(detail.searchParams.get('width')).toBe('800');
    expect([null, 'contain']).toContain(detail.searchParams.get('resize'));
    expect(detail.searchParams.has('height')).toBe(false);
    expect(urls).not.toContain(poster);
  });

  it('prioritizes the detail and exposes its title without repeating the preview to screen readers', () => {
    const html = renderToStaticMarkup(<Poster src={poster} alt="Festival de música" />);
    expect(html).toContain('fetchPriority="high"');
    expect(html).toContain('alt="Festival de música"');
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('decoding="async"');
    expect(html).not.toContain('object-fit:cover');
  });

  it('keeps the complete Cloudinary poster instead of cropping the detail', () => {
    const html = renderToStaticMarkup(<Poster src="https://res.cloudinary.com/demo/image/upload/v123/poster.jpg" alt="Poster" />);
    expect(html).toContain('c_limit,w_800');
    expect(html).toContain('c_limit,w_400');
  });

  it('uses natural image heights without a fixed frame or artificial margins', () => {
    const html = renderToStaticMarkup(<Poster src={poster} alt="Festival" />);
    expect(html).toContain('display:grid');
    expect(html.match(/grid-area:1 \/ 1/g)).toHaveLength(2);
    expect(html.match(/height:auto/g)).toHaveLength(2);
    expect(html).not.toContain('aspect-ratio');
    expect(html).not.toContain('height:100%');
    expect(html).not.toContain('position:absolute');
  });

  it('does not create a duplicate preview request for an unsupported image host', () => {
    const html = renderToStaticMarkup(<Poster src="https://example.org/poster.jpg" alt="Poster" />);
    expect(html.match(/<img /g)).toHaveLength(1);
    expect(html).toContain('opacity:1');
  });
});

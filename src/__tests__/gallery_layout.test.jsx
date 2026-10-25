import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import GalleryLayout from '../components/detail/GalleryLayout.jsx';
import NextGalleryLayout from '../../web-next/src/components/detail/GalleryLayout.jsx';
import Gallery from '../components/Gallery.jsx';
import NextGallery from '../../web-next/src/components/Gallery.jsx';
const T = { text: '#111', sub: '#666', border: '#ddd' };
const photos = Array.from({length: 8}, (_, i) => ({url:`https://example.supabase.co/storage/v1/object/public/media/photo-${i}.jpg`}));

describe.each([['Vite', GalleryLayout], ['Next', NextGalleryLayout]])('%s natural photo gallery', (_name, Layout) => {
  it('shows at most six uncropped images and the total photo count', () => {
    const html=renderToStaticMarkup(<Layout photos={photos} T={T} bizName="KAVA" setShowGallery={()=>{}}/>);
    expect(html.match(/<img /g)).toHaveLength(6);
    expect(html).toContain('Ver todas las fotos (8)');
    expect(html).not.toContain('backdrop-filter');
    const urls=[...html.matchAll(/<img[^>]+src="([^"]+)"/g)].map(match=>new URL(match[1].replaceAll('&amp;', '&')));
    expect(urls.every(url=>!url.searchParams.has('height'))).toBe(true);
    expect(html).toContain('height: auto');
    expect(html).not.toContain('aspect-ratio');
  });
  it('supports a single photo and string URLs', () => {
    const html=renderToStaticMarkup(<Layout photos={['https://example.org/portrait.jpg']} T={T} setShowGallery={()=>{}}/>);
    expect(html).toContain('single-photo');
    expect(html).toContain('Ver todas las fotos (1)');
    expect(html.match(/<img /g)).toHaveLength(1);
  });
  it('keeps the original gallery index when a preceding photo has no URL', () => {
    const html=renderToStaticMarkup(<Layout photos={[null, photos[1]]} T={T} bizName="KAVA" setShowGallery={()=>{}}/>);
    expect(html).toContain('Abrir foto 2 de KAVA');
  });
  it('does not render an empty gallery', () => {
    expect(renderToStaticMarkup(<Layout photos={[]} T={T}/>)).toBe('');
  });
});

describe.each([['Vite', Gallery], ['Next', NextGallery]])('%s fullscreen photo viewer', (_name, Viewer) => {
  it('opens the selected image completely and offers zoom and navigation', () => {
    const html=renderToStaticMarkup(<Viewer photos={photos} initialIndex={2} h="100dvh" fit="contain"/>);
    expect(html).toContain(photos[2].url);
    expect(html).toContain('object-fit:contain');
    expect(html).toContain('aria-label="Ampliar foto"');
    expect(html).toContain('aria-label="Foto siguiente"');
    expect(html).toContain('aria-label="Foto anterior"');
  });
  it('supports string photo URLs in the full screen viewer too', () => {
    const html=renderToStaticMarkup(<Viewer photos={['https://example.org/photo.jpg']} h="100dvh" fit="contain"/>);
    expect(html).toContain('src="https://example.org/photo.jpg"');
    expect(html).not.toContain('Sin fotografías');
  });
});

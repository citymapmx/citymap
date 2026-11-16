import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import fs from 'node:fs';
import GalleryLayout from '../components/detail/GalleryLayout.jsx';
import NextGalleryLayout from '../../web-next/src/components/detail/GalleryLayout.jsx';
import Gallery from '../components/Gallery.jsx';
import NextGallery from '../../web-next/src/components/Gallery.jsx';
const T = { text: '#111', sub: '#666', border: '#ddd' };
const photos = Array.from({length: 8}, (_, i) => ({url:`https://example.supabase.co/storage/v1/object/public/media/photo-${i}.jpg`}));

// Propuesta 8 (galería 2×2, 14 nov 2026): el masonry de 2 columnas
// (hasta 6 fotos, alto natural con `height: auto` y sin `aspect-ratio`)
// se sustituye por un grid 2×2 de celdas cuadradas uniformes
// (`aspect-ratio: 1 / 1`, `object-fit: cover`): el recorte cuadrado es
// deliberado, patrón Facebook/WhatsApp. Solo se renderizan 4 fotos y,
// si hay más, la 4ª casilla lleva el velo «+N fotos más» que abre el
// visor en la foto 0 (la misma llamada que «Ver todas ›»). Por eso las
// aserciones viejas de 6 imágenes, `height: auto` y «sin aspect-ratio»
// se invierten aquí: ahora se exige el grid cuadrado y 4 imágenes.
const buttonBlocks = (html) => [...html.matchAll(/<button[\s\S]*?<\/button>/g)].map(match => match[0]);

describe.each([['Vite', GalleryLayout], ['Next', NextGalleryLayout]])('%s 2x2 photo gallery', (_name, Layout) => {
  it('shows at most four square images and the total photo count', () => {
    const html=renderToStaticMarkup(<Layout photos={photos} T={T} bizName="KAVA" setShowGallery={()=>{}}/>);
    expect(html.match(/<img /g)).toHaveLength(4);
    expect(html).toContain('Ver todas las fotos (8)');
    expect(html).not.toContain('backdrop-filter');
    expect(html).not.toContain('column-count');
    expect(html).toContain('display: grid');
    expect(html).toContain('grid-template-columns: 1fr 1fr');
    expect(html).toContain('aspect-ratio: 1 / 1');
    expect(html).toContain('object-fit: cover');
    const urls=[...html.matchAll(/<img[^>]+src="([^"]+)"/g)].map(match=>new URL(match[1].replaceAll('&amp;', '&')));
    expect(urls.every(url=>!url.searchParams.has('height'))).toBe(true);
  });
  it('shows a "+N more photos" veil button on the fourth cell when there are more than four photos', () => {
    const setShowGallery = vi.fn();
    const html=renderToStaticMarkup(<Layout photos={photos} T={T} bizName="KAVA" setShowGallery={setShowGallery}/>);
    expect(html).toContain('+4 fotos más');
    expect(html).toContain('business-photo-more');
    expect(buttonBlocks(html).some(button => button.includes('+4 fotos más'))).toBe(true);
  });
  it('counts the remaining photos in the veil', () => {
    const html=renderToStaticMarkup(<Layout photos={photos.slice(0, 5)} T={T} bizName="KAVA" setShowGallery={()=>{}}/>);
    expect(html.match(/<img /g)).toHaveLength(4);
    expect(html).toContain('+1 fotos más');
  });
  it('shows no veil with four or fewer photos', () => {
    for (const count of [4, 1]) {
      const html=renderToStaticMarkup(<Layout photos={photos.slice(0, count)} T={T} bizName="KAVA" setShowGallery={()=>{}}/>);
      expect(html).not.toMatch(/\+\d+ fotos más/);
      // La clase sí existe en el <style> siempre; lo que no debe haber es el elemento velo.
      expect(html).not.toContain('<span class="business-photo-more"');
    }
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

// Sin jsdom ni testing-library en el repo, renderToStaticMarkup no
// serializa los onClick, así que el cableado del velo se verifica sobre
// el fuente (misma pauta que detalle_evento_tarjeta_unificada.test.jsx):
// la 4ª casilla llama setShowGallery(items[0].index) — exactamente la
// misma llamada que «Ver todas ›» — y con las 8 fotos del mock la
// primera tiene URL, así que items[0].index es 0.
describe('veil opens the viewer at the first photo', () => {
  it('the more-cell calls setShowGallery(items[0].index) in both versions', () => {
    const viteSrc = fs.readFileSync(new URL('../components/detail/GalleryLayout.jsx', import.meta.url), 'utf8');
    const nextSrc = fs.readFileSync(new URL('../../web-next/src/components/detail/GalleryLayout.jsx', import.meta.url), 'utf8');
    for (const src of [viteSrc, nextSrc]) {
      expect(src).toContain('setShowGallery(isMoreCell ? items[0].index : index)');
      expect(src).toContain('items.slice(0, 4)');
    }
    expect(photos[0].url).toBeTruthy();
  });
});

describe.each([['Vite', Gallery], ['Next', NextGallery]])('%s fullscreen photo viewer', (_name, Viewer) => {
  it('opens the selected image completely and offers navigation (no zoom button)', () => {
    const html=renderToStaticMarkup(<Viewer photos={photos} initialIndex={2} h="100dvh" fit="contain"/>);
    expect(html).toContain(photos[2].url);
    expect(html).toContain('object-fit:contain');
    expect(html).not.toContain('Ampliar foto');
    expect(html).not.toContain('Reducir foto');
    expect(html).toContain('aria-label="Foto siguiente"');
    expect(html).toContain('aria-label="Foto anterior"');
  });
  it('supports string photo URLs in the full screen viewer too', () => {
    const html=renderToStaticMarkup(<Viewer photos={['https://example.org/photo.jpg']} h="100dvh" fit="contain"/>);
    expect(html).toContain('src="https://example.org/photo.jpg"');
    expect(html).not.toContain('Sin fotografías');
  });
});

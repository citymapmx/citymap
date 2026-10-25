import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import EventCoverflow from '../components/home/EventCoverflow.jsx';
import NextCoverflow from '../../web-next/src/components/home/EventCoverflow.jsx';
const T={text:'#111',sub:'#666',bg:'#fff'};
const events=Array.from({length:8},(_,i)=>({id:`event-${i}`,title:`Festival ${i}`,date:'2099-10-18',venue_name:'Teatro de Tepic',img_url:`https://example.supabase.co/storage/v1/object/public/media/poster-${i}.webp`}));
describe.each([['Vite',EventCoverflow],['Next',NextCoverflow]])('%s event coverflow',(_name,Carousel)=>{
  it('keeps posters mounted and preloads neighbours without cropping',()=>{
    const html=renderToStaticMarkup(<Carousel events={events} T={T} onOpen={()=>{}}/>);
    const urls=[...html.matchAll(/<img[^>]+src="([^"]+)"/g)].map(match=>new URL(match[1].replaceAll('&amp;','&')));
    expect(urls).toHaveLength(8);
    expect(html.match(/loading="eager"/g)).toHaveLength(7);
    expect(html.match(/loading="lazy"/g)).toHaveLength(1);
    expect(urls.every(url=>!url.searchParams.has('height'))).toBe(true);
    expect(urls.every(url=>url.searchParams.get('width') === '800')).toBe(true);
    expect(html).toContain('object-fit: contain');
    expect(html).not.toContain('object-fit: cover');
    expect(html).toContain('aria-label="Ver evento: Festival 0"');
  });
  it('exposes accessible navigation and selected event details',()=>{
    const html=renderToStaticMarkup(<Carousel events={events} T={T} onOpen={()=>{}}/>);
    expect(html).not.toContain('aria-label="Evento anterior"');
    expect(html).not.toContain('aria-label="Evento siguiente"');
    expect(html).not.toContain('aria-label="Evento 1 de 8"');
    expect(html).toContain('event-coverflow-loading');
    expect(html).toContain('--drag-progress');
    expect(html).toContain('Teatro de Tepic');
    expect(html).toContain('18 de octubre');
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain('prefers-reduced-motion');
  });
  it('handles a single event without navigation and supports legacy poster fields',()=>{
    const html=renderToStaticMarkup(<Carousel events={[{id:'a',title:'Concierto',img:'https://example.org/event.jpg'}]} T={T} onOpen={()=>{}}/>);
    expect(html.match(/<img /g)).toHaveLength(1);
    expect(html).toContain('https://example.org/event.jpg');
    expect(html).not.toContain('Evento siguiente');
    expect(html).not.toContain('Invalid Date');
  });
  it('uses the same poster layout with distinct labels and long-event dates',()=>{
    const html=renderToStaticMarkup(<Carousel events={[{id:'month',title:'Festival de octubre',poster_url:'https://example.org/poster.jpg'}]} T={T} label="Carrusel de eventos de larga duración" formatEventMeta={()=>'Hasta el 2 nov · Guadalajara'}/>);
    expect(html).toContain('aria-label="Carrusel de eventos de larga duración"');
    expect(html).toContain('Hasta el 2 nov · Guadalajara');
    expect(html).toContain('https://example.org/poster.jpg');
    expect(html).toContain('event-coverflow-card');
    expect(html).toContain('object-fit: contain');
  });
  it('renders no carousel for an empty list',()=>{
    expect(renderToStaticMarkup(<Carousel events={[]} T={T}/>)).toBe('');
  });
});

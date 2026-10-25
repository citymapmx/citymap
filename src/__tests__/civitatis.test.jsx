import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { HelmetProvider } from 'react-helmet-async';
import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import BookingManager from '../components/BookingManager.jsx';
import NextBookingManager from '../../web-next/src/components/BookingManager.jsx';
import DetailView from '../views/DetailView.jsx';
import ReservationsBlock from '../../web-next/src/components/biz/ReservationsBlock.jsx';
import { AppContext } from '../context/AppContext.jsx';
import { CIVITATIS_PLATFORM } from '../lib/reservationPlatforms.js';
import { CIVITATIS_PLATFORM as nextPlatform } from '../../web-next/src/lib/reservationPlatforms.js';
vi.mock('../components/map/useGMaps.js', () => ({ default: () => false }));
vi.mock('react-router-dom', () => ({ useNavigate: () => vi.fn(), useNavigationType: () => 'POP' }));
vi.mock('@tanstack/react-query', () => ({ useQuery: () => ({ data:false, isLoading:false }) }));
vi.hoisted(() => { globalThis.localStorage = { getItem:()=>null, setItem:()=>{}, removeItem:()=>{} }; globalThis.window = { location:{hostname:'localhost',pathname:'/'}, CITY_TZ:'America/Mazatlan' }; });
const T={text:'#111',sub:'#666',bg:'#fff',white:'#fff',border:'#ddd',iconBg:'#eee'};
const url='https://www.civitatis.com/es/madrid/?aid=123&cmp=citymap';
const booking={enabled:true,type:'external',externalLinks:[{platform:'civitatis',url}]};
const fixture=links => ({id:'test-only',name:'Negocio de prueba',category:'hoteles',city_slug:'tepic',plan:'free',photos:[],schedule:{},social_links:{},_fullFetched:true,booking_config:{...booking,externalLinks:links}});
const publicHtml=links => renderToStaticMarkup(<HelmetProvider><AppContext.Provider value={{selected:fixture(links),T,favIds:[],biz:[],city:'Tepic',navigate:vi.fn()}}><DetailView /></AppContext.Provider></HelmetProvider>);
const originalIds=['airbnb','booking','tiqets','tripadvisor','expedia','hoteles','getyourguide','renta_auto','opentable','ubereats','rappi','didifood','whatsapp','comprar_entradas','otro'];
describe('Civitatis integration',()=>{
 it.each([['Vite',BookingManager],['Next',NextBookingManager]])('%s offers Civitatis and preserves every previous selector option',(_name,Manager)=>{
  const html=renderToStaticMarkup(<Manager bookingConfig={booking} onChange={()=>{}} T={T}/>);
  const options=[...html.matchAll(/<option value="([^"]+)"/g)].map(m=>m[1]);
  expect(options.filter(id=>id!=='civitatis')).toEqual(originalIds);
  expect(options.filter(id=>id==='civitatis')).toHaveLength(1);
  expect(html).toContain('value="civitatis" selected=""');
  expect(html).toContain('src="/civitatis.png"');
  expect(html).toContain('https://www.civitatis.com/es/madrid/?aid=123&amp;cmp=citymap');
 });
 it('uses the same Civitatis identity in both clients',()=>{
  expect(nextPlatform).toEqual(CIVITATIS_PLATFORM);
  expect(CIVITATIS_PLATFORM.label).toBe('Civitatis');
 });
 it('renders the public single-platform button with its official image',()=>{
  const html=publicHtml(booking.externalLinks);
  expect(html).toContain('Reservar en');
  expect(html).toContain('Civitatis');
  expect(html).toContain('src="/civitatis.png"');
 });
 it('renders Civitatis alongside Expedia and Booking without changing their labels',()=>{
  const html=publicHtml([{platform:'expedia',url:'https://www.expedia.com/'},...booking.externalLinks,{platform:'booking',url:'https://www.booking.com/'}]);
  expect(html).toContain('Expedia.com'); expect(html).toContain('Booking.com'); expect(html).toContain('Civitatis');
  expect(html).toContain('src="/expedia.png"'); expect(html).toContain('src="/booking.png"');
 });
 it('renders Civitatis in the existing Next reservation block',()=>{
  const html=renderToStaticMarkup(<ReservationsBlock linksStr={JSON.stringify(booking.externalLinks)}/>);
  expect(html).toContain('Civitatis'); expect(html).toContain('src="/civitatis.png"');
 });
 it('stores an unmodified official PNG with the same asset in both clients',()=>{
  const png=readFileSync(new URL('../../public/civitatis.png',import.meta.url));
  const nextPng=readFileSync(new URL('../../web-next/public/civitatis.png',import.meta.url));
  expect(png.equals(nextPng)).toBe(true);
  expect(png.readUInt32BE(16)).toBe(180); expect(png.readUInt32BE(20)).toBe(180);
  expect(png.subarray(1,4).toString()).toBe('PNG');
 });
});

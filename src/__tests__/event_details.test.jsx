import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'node:fs';
import { getEventPrice, getEventLinks, deriveEventBooking, normalizeEventLink, splitDescription, getEventPriceAmount, matchesPriceFilter, priceSortValue, getEventMusicQuery, getEventMusicFallbackQuery, buildItunesSearchUrl, buildServerMusicUrl, fetchServerTracks, fetchItunesTracks, loadMusicTracks, clearMusicTracksCache, eventCurrencyCode, formatEventTime12h } from '../lib/eventDetails.js';
import { getEventPrice as getNextPrice, eventCurrencyCode as getNextCurrencyCode } from '../../web-next/src/lib/eventDetails.js';
import EventInformation, { EventTicketBar } from '../components/detail/EventInformation.jsx';
const T={text:'#111',sub:'#666',bg:'#fff',border:'#ddd'};
const render=(event,hideTickets)=>renderToStaticMarkup(<EventInformation event={event} T={T} hideTickets={hideTickets}/>);
const renderBar=(event,hideTickets)=>renderToStaticMarkup(<EventTicketBar event={event} T={T} hideTickets={hideTickets}/>);

describe('Event entry information',()=>{
  it.each([undefined,null,'','   ','Desde',false])('omits an absent amount %s instead of leaving Desde alone',price=>{
    const event={price_type:'paid',price};
    expect(getEventPrice(event)).toBeNull();
    expect(getNextPrice(event)).toBeNull();
    expect(render(event)).not.toContain('Entradas');
    expect(render(event)).not.toContain('Desde');
  });
  it.each([[150,'Entrada: $150 MXN'],['$150','Entrada: $150 MXN'],['Desde $150','Desde $150 MXN'],['$150 - $300','Desde $150 MXN']])('formats an actual amount %s', (price,expected)=>{
    expect(getEventPrice({price_type:'paid',price})?.text).toBe(expected);
    expect(getNextPrice({price_type:'paid',price})?.text).toBe(expected);
  });
  it('shows free admission only when explicitly recorded',()=>{
    expect(getEventPrice({price_type:'gratis',price:''})?.text).toBe('Entrada gratuita');
    expect(getEventPrice({price:0})?.text).toBe('Entrada gratuita');
    expect(getEventPrice({price_type:'paid',price:''})).toBeNull();
  });
  it('offers consultation when a ticket link exists without a price',()=>{
    // El botón de boletos vive en la barra fija (EventTicketBar, 11 nov
    // 2026), no en la tarjeta de información.
    const html=renderBar({price_type:'paid',booking_config:{enabled:true,type:'external',externalLinks:[{platform:'comprar_entradas',url:'https://tickets.example.com/event'}]}});
    expect(html).toContain('Consultar entradas');
    expect(html).not.toContain('Comprar boletos');
    expect(html).not.toContain('Desde');
  });
  it('offers ticket purchase when an amount and a valid seller are available',()=>{
    expect(renderBar({price:150,booking_config:{enabled:true,type:'external',externalLinks:[{platform:'comprar_entradas',url:'tickets.example.com/event'}]}})).toContain('Comprar boletos');
  });
  it('hides price and ticket links for past events',()=>{
    const event={price:150,price_type:'paid',booking_config:{enabled:true,type:'external',externalLinks:[{platform:'comprar_entradas',url:'https://tickets.example.com/event'}]}};
    const past=renderBar(event,true);
    expect(past).not.toContain('Entradas');
    expect(past).not.toContain('Comprar boletos');
    expect(past).not.toContain('Consultar entradas');
    expect(renderBar(event)).toContain('Comprar boletos');
  });
});
describe('precio del evento: la moneda va tras el monto (nov 2026)', () => {
  // TAEMIN en Madrid (captura de Jonathan, 21 nov 2026): la ficha decía
  // «BOLETOS DESDE: $65.00» sin decir si eran euros o dólares. El dato
  // en base estaba bien (price 65.00, currency EUR): solo faltaba
  // pintarlo. Misma convención que los tours (PR #408): código ISO
  // tras el monto, «$65.00 EUR» / «$1,200 MXN».
  it('TAEMIN: $65.00 EUR (fila real de la base: price "65.00", currency EUR)', () => {
    const event = { price_type: 'paid', price: '65.00', currency: 'EUR' };
    expect(getEventPrice(event)?.text).toBe('Entrada: $65.00 EUR');
    expect(getNextPrice(event)?.text).toBe('Entrada: $65.00 EUR');
    expect(getEventPriceAmount(event)).toBe('$65.00 EUR');
  });
  it('USD y JPY salen de la columna currency (también en minúsculas)', () => {
    expect(getEventPrice({ price_type: 'paid', price: 40.88, currency: 'USD' })?.text).toBe('Entrada: $40.88 USD');
    expect(getEventPrice({ price_type: 'paid', price: 5000, currency: 'jpy' })?.text).toBe('Entrada: $5000 JPY');
    expect(getNextPrice({ price_type: 'paid', price: 5000, currency: 'jpy' })?.text).toBe('Entrada: $5000 JPY');
  });
  it('sin currency (filas viejas o fetch sin la columna) es MXN', () => {
    expect(getEventPrice({ price_type: 'paid', price: 1200 })?.text).toBe('Entrada: $1200 MXN');
    expect(getEventPrice({ price_type: 'paid', price: 1200, currency: null })?.text).toBe('Entrada: $1200 MXN');
    expect(getEventPrice({ price_type: 'paid', price: 1200, currency: '' })?.text).toBe('Entrada: $1200 MXN');
    expect(eventCurrencyCode({})).toBe('MXN');
    expect(getNextCurrencyCode({})).toBe('MXN');
  });
  it('un valor de currency que no es un código de 3 letras se ignora', () => {
    expect(getEventPrice({ price_type: 'paid', price: 1200, currency: 'pesos' })?.text).toBe('Entrada: $1200 MXN');
    expect(getEventPrice({ price_type: 'paid', price: 1200, currency: 'MX' })?.text).toBe('Entrada: $1200 MXN');
    expect(eventCurrencyCode({ currency: '123' })).toBe('MXN');
  });
  it('no duplica la moneda cuando el precio guardado ya la trae', () => {
    expect(getEventPrice({ price_type: 'paid', price: '$65 EUR', currency: 'EUR' })?.text).toBe('Entrada: $65 EUR');
    expect(getEventPrice({ price_type: 'paid', price: '$65 USD', currency: 'USD' })?.text).toBe('Entrada: $65 USD');
    expect(getEventPrice({ price_type: 'paid', price: '$150 - $300', currency: 'EUR' })?.text).toBe('Desde $150 EUR');
    expect(getNextPrice({ price_type: 'paid', price: '$65 EUR', currency: 'EUR' })?.text).toBe('Entrada: $65 EUR');
  });
  it('un símbolo propio (€, £) ya dice la moneda: no se agrega el código', () => {
    expect(getEventPrice({ price_type: 'paid', price: '€65', currency: 'EUR' })?.text).toBe('Entrada: €65');
    expect(getEventPrice({ price_type: 'paid', price: '£40', currency: 'GBP' })?.text).toBe('Entrada: £40');
  });
  it('precio 0 con otra moneda sigue siendo entrada gratuita', () => {
    expect(getEventPrice({ price_type: 'paid', price: '0 JPY', currency: 'JPY' })?.text).toBe('Entrada gratuita');
    expect(getEventPrice({ price_type: 'paid', price: '0.00 EUR', currency: 'EUR' })?.text).toBe('Entrada gratuita');
  });
  it('el orden por precio sigue siendo numérico con la moneda puesta', () => {
    expect(priceSortValue({ price: 65, currency: 'EUR' })).toBe(65);
    expect(priceSortValue({ price: '$1,200', currency: 'MXN' })).toBe(1200);
  });
});
describe('Event links and schedule',()=>{
  it.each(['javascript:alert(1)','data:text/html,test','not-a-url',''])('does not offer invalid destination %s',url=>{
    expect(normalizeEventLink(url)).toBeNull();
    expect(getEventLinks({booking_config:{enabled:true,type:'external',externalLinks:[{url}]}})).toEqual([]);
  });
  it('normalizes a WhatsApp address and ignores disabled booking links',()=>{
    expect(normalizeEventLink('wa.me/523221234567')).toBe('https://wa.me/523221234567');
    expect(getEventLinks({booking_config:{enabled:false,type:'external',externalLinks:[{url:'https://tickets.example.com'}]}})).toEqual([]);
  });
  it('shows the full date range, times and directions even with only an address',()=>{
    const html=render({date:'2026-10-01',end_date:'2026-11-02',time:'18:30',end_time:'23:00',venue_address:'Centro, Tepic'});
    expect(html).toContain('1 de octubre de 2026');
    expect(html).toContain('al 2 de noviembre');
    expect(html).not.toContain('2 de noviembre de 2026');
    expect(html).toContain('6:30 p. m. – 11:00 p. m.');
    expect(html).toContain('Cómo llegar');
    expect(html).toContain('destination=Centro%2C%20Tepic');
  });
  it('shows no Cuándo/Dónde/Entradas labels, only the data',()=>{
    const html=render({date:'2026-11-29',time:'13:00',venue_name:'Titanes',venue_address:'Zapopan, Jal.',price:1208,price_type:'paid'});
    expect(html).not.toContain('Cuándo');
    expect(html).not.toContain('Dónde');
    expect(html).not.toContain('Entradas');
    expect(html).toContain('29 de noviembre de 2026');
    expect(html).toContain('Titanes');
    expect(html).toContain('Entrada: $1208 MXN');
  });
  it('shows the venue name in the row now that the header no longer shows it',()=>{
    const event={venue_name:'Titanes',venue_address:'Zapopan, Jal.'};
    expect(render(event)).toContain('>Titanes<');
    expect(render(event)).toContain('Zapopan, Jal.');
  });
  it('does not repeat the venue when the address already includes it',()=>{
    const event={venue_name:'Auditorio Telmex',venue_address:'Auditorio Telmex, Industrial los Belenes, 45157 Zapopan, Jal., México'};
    const html=render(event);
    expect(html).toContain('Auditorio Telmex, Industrial los Belenes');
    expect(html).not.toContain('>Auditorio Telmex<');
  });
  it('shows the venue alone when there is no address',()=>{
    const event={venue_name:'Auditorio Telmex'};
    expect(render(event)).toContain('>Auditorio Telmex<');
  });
  it('splits long descriptions into short paragraphs with a lead line',()=>{
    const text='¡El día más bonito del año ya está aquí! Este 2026, la tarde se pinta de dorado con Arcade Fire. Santa Pirata presenta su show, la magia de Chet Faker llega por primera vez. Bándalos Chinos y Kakkmaddafakka cierran la noche con todo. Trae a tus amigos y llega temprano para agarrar buen lugar. Habrá comida, bebidas y muchas sorpresas durante toda la tarde.';
    const { lead, paragraphs } = splitDescription(text);
    expect(lead).toBe('¡El día más bonito del año ya está aquí!');
    expect(paragraphs).toHaveLength(3);
    expect(paragraphs.every(p => p.split('. ').length <= 2)).toBe(true);
    const html=render({description:text});
    expect(html).toContain('Leer más');
    expect(html).toContain('¡El día más bonito del año ya está aquí!');
  });
  it('keeps short descriptions whole without a lead or a Leer más button',()=>{
    const { lead, paragraphs } = splitDescription('Una noche de música en vivo bajo las estrellas.');
    expect(lead).toBe(null);
    expect(paragraphs).toEqual(['Una noche de música en vivo bajo las estrellas.']);
    const html=render({description:'Una noche de música en vivo bajo las estrellas.'});
    expect(html).not.toContain('Leer más');
  });
  it.each([[150,'$150 MXN'],['$150','$150 MXN'],['Desde $150','$150 MXN'],['$150 - $300','$150 MXN']])('returns only the amount %s', (price,expected)=>{
    expect(getEventPriceAmount({price_type:'paid',price})).toBe(expected);
  });
  it('returns no amount for free or missing prices',()=>{
    expect(getEventPriceAmount({price_type:'gratis',price:''})).toBeNull();
    expect(getEventPriceAmount({price_type:'paid',price:''})).toBeNull();
  });
  it('hides the price row when the modal already shows it on top',()=>{
    const event={price:1208,price_type:'paid'};
    expect(render(event)).toContain('Entrada: $1208 MXN');
    expect(renderToStaticMarkup(<EventInformation event={event} T={T} hidePriceRow />)).not.toContain('Entrada: $1208 MXN');
  });
  it('shows plain bigger icons without the tinted circle',()=>{
    const html=render({date:'2026-11-29',time:'20:00',venue_address:'Zapopan, Jal.'});
    expect(html).toContain('width="26"');
    expect(html).not.toContain('#EFF6F1');
  });
  it('shows the ticket button bigger, in uppercase and with a proper arrow icon',()=>{
    const html=renderBar({price:150,booking_config:{enabled:true,type:'external',externalLinks:[{platform:'comprar_entradas',url:'https://tickets.example.com/event'}]}});
    expect(html).toContain('Comprar boletos');
    expect(html).toContain('text-transform:uppercase');
    expect(html).toContain('font-size:16px');
    expect(html).toContain('M5 12h14');
    expect(html).not.toContain('↗');
  });
  it('does not repeat the year in a same-year date range',()=>{
    const html=render({date:'2026-11-20',end_date:'2026-11-21',time:'20:00',venue_name:'Auditorio Telmex'});
    expect(html).toContain(' al ');
    // El año se cuenta solo en el texto visible: el enlace de
    // «Añadir a mi calendario» (11 nov 2026) lleva las fechas
    // completas en su URL y no es texto visible.
    const visible=html.replace(/<[^>]*>/g,'');
    expect((visible.match(/2026/g) || []).length).toBe(1);
    expect(html).not.toContain('21 de noviembre de 2026');
  });
  it('softens the ticket button in dark mode instead of a solid white pill',()=>{
    const darkT={...T,dark:true,greenD:'#E4E4E7'};
    const html=renderToStaticMarkup(<EventTicketBar event={{price:150,booking_config:{enabled:true,type:'external',externalLinks:[{platform:'comprar_entradas',url:'https://tickets.example.com/event'}]}}} T={darkT} />);
    expect(html).toContain('background:#E4E4E7');
  });
});

describe('filtro por precio y orden por precio', () => {
  it('distingue gratis, de pago y sin precio publicado', () => {
    expect(matchesPriceFilter({ price_type: 'gratis', price: '' }, 'gratis')).toBe(true);
    expect(matchesPriceFilter({ price_type: 'gratis', price: '' }, 'pago')).toBe(false);
    expect(matchesPriceFilter({ price: 150 }, 'pago')).toBe(true);
    expect(matchesPriceFilter({ price: 150 }, 'gratis')).toBe(false);
    expect(matchesPriceFilter({ price_type: 'paid', price: '' }, 'pago')).toBe(true);
    expect(matchesPriceFilter({}, 'gratis')).toBe(false);
    expect(matchesPriceFilter({}, 'pago')).toBe(false);
    expect(matchesPriceFilter({ price: 150 }, 'todos')).toBe(true);
  });
  it('ordena gratis primero, luego por monto y al final sin precio', () => {
    expect(priceSortValue({ price_type: 'gratis', price: '' })).toBe(0);
    expect(priceSortValue({ price: 150 })).toBe(150);
    expect(priceSortValue({ price: '$1,200' })).toBe(1200);
    expect(priceSortValue({})).toBe(Number.POSITIVE_INFINITY);
    const sorted = [
      { price: 600 },
      { price_type: 'gratis', price: '' },
      {},
      { price: 150 },
    ].sort((a, b) => priceSortValue(a) - priceSortValue(b));
    expect(sorted.map(e => priceSortValue(e))).toEqual([0, 150, 600, Number.POSITIVE_INFINITY]);
  });
});

describe('reproductor de música del evento', () => {
  it('usa el título como búsqueda solo en conciertos', () => {
    expect(getEventMusicQuery({ title: 'Omar Camacho', event_category: 'Concierto' })).toBe('Omar Camacho');
    expect(getEventMusicQuery({ title: 'Alfredo Olivas en Tepic', event_category: 'Concierto ' })).toBe('Alfredo Olivas');
    expect(getEventMusicQuery({ title: 'Tributo a Queen', event_category: 'Concierto tributo' })).toBe('Tributo a Queen');
    expect(getEventMusicQuery({ title: 'Festival Pixelatl 2026', event_category: 'Festival' })).toBeNull();
    expect(getEventMusicQuery({ title: 'Calaverandia 2026', event_category: 'Show familiar' })).toBeNull();
    expect(getEventMusicQuery({ title: 'Omar Camacho' })).toBeNull();
    expect(getEventMusicQuery({ event_category: 'Concierto' })).toBeNull();
  });
  it('usa solo el artista cuando el título es el nombre de la gira', () => {
    // Verificado contra iTunes: con el título completo estas búsquedas
    // devuelven 0 resultados y el reproductor no aparecía; con el artista
    // devuelven 5.
    expect(getEventMusicQuery({ title: 'Ricardo Arjona — ¿Qué haría si pudiera? Tour', event_category: 'Concierto' })).toBe('Ricardo Arjona');
    expect(getEventMusicQuery({ title: 'Ricardo Arjona – Lo que el seco no dijo', event_category: 'Concierto' })).toBe('Ricardo Arjona');
    expect(getEventMusicQuery({ title: 'ZZ Top – The Elevation Tour', event_category: 'Concierto' })).toBe('ZZ Top');
    expect(getEventMusicQuery({ title: 'Maroon 5 - VidantaWorld Concert Series', event_category: 'Concierto' })).toBe('Maroon 5');
    expect(getEventMusicQuery({ title: 'Los Auténticos Decadentes y Los Caligaris – La Fórmula Perfecta', event_category: 'Concierto' })).toBe('Los Auténticos Decadentes y Los Caligaris');
    expect(getEventMusicQuery({ title: 'Orquesta Filarmónica de Jalisco: Tercera Temporada – Programa 6', event_category: 'Concierto' })).toBe('Orquesta Filarmónica de Jalisco');
    expect(getEventMusicQuery({ title: 'Morat en Guadalajara', event_category: 'Concierto' })).toBe('Morat');
    expect(getEventMusicQuery({ title: 'Ed Sheeran – Loop Tour', event_category: 'Concierto' })).toBe('Ed Sheeran');
  });
  it('la consulta de respaldo es el título completo solo cuando difiere de la del artista', () => {
    expect(getEventMusicFallbackQuery({ title: 'Ricardo Arjona — ¿Qué haría si pudiera? Tour', event_category: 'Concierto' })).toBe('Ricardo Arjona — ¿Qué haría si pudiera? Tour');
    expect(getEventMusicFallbackQuery({ title: 'Morat en Guadalajara', event_category: 'Concierto' })).toBeNull();
    expect(getEventMusicFallbackQuery({ title: 'Tributo a Queen', event_category: 'Concierto' })).toBeNull();
    expect(getEventMusicFallbackQuery({ title: 'Festival Pixelatl 2026', event_category: 'Festival' })).toBeNull();
  });
  it('arma la búsqueda de iTunes con el artista y límite de canciones', () => {
    expect(buildItunesSearchUrl('Omar Camacho')).toBe('https://itunes.apple.com/search?term=Omar%20Camacho&media=music&entity=song&limit=5');
    expect(buildItunesSearchUrl('Alfredo Olivas', 3)).toContain('limit=3');
  });
});

describe('carga de pistas con reintento (opción C: endpoint propio primero, iTunes directo de respaldo)', () => {
  beforeEach(() => clearMusicTracksCache());
  const track = (id) => ({ trackId: id, trackName: `Canción ${id}`, artistName: 'Artista', artworkUrl100: 'https://x/100.jpg', previewUrl: `https://x/${id}.m4a`, trackViewUrl: `https://x/${id}` });
  const ok = (results) => ({ ok: true, status: 200, json: async () => ({ resultCount: results.length, results }) });
  const fail = () => ({ ok: false, status: 500, json: async () => ({}) });
  // Respuesta del endpoint propio: pistas ya normalizadas ({ tracks }).
  const normalized = (id) => ({ id, name: `Canción ${id}`, artist: 'Artista', artwork: 'https://x/100.jpg', preview: `https://x/${id}.m4a`, url: `https://x/${id}` });
  const serverOk = (tracks) => ({ ok: true, status: 200, json: async () => ({ tracks }) });
  const isServer = (url) => String(url).includes('/api/tiktok-resolve?action=apple-music');

  it('arma la URL del endpoint propio con el artista y límite de canciones', () => {
    expect(buildServerMusicUrl('Beéle')).toBe('/api/tiktok-resolve?action=apple-music&term=Be%C3%A9le&limit=5');
    expect(buildServerMusicUrl('Alfredo Olivas', 3)).toContain('limit=3');
  });

  it('primero pregunta al endpoint propio y no toca iTunes directo si responde', async () => {
    let directCalls = 0;
    const fetchFn = async (url) => {
      if (isServer(url)) return serverOk([normalized(11)]);
      directCalls += 1;
      return ok([track(11)]);
    };
    const tracks = await loadMusicTracks(['Artista'], { fetchFn, sleepFn: async () => {} });
    expect(tracks.map((t) => t.id)).toEqual([11]);
    expect(directCalls).toBe(0);
  });

  it('fetchServerTracks normaliza la respuesta del servidor y descarta las que no tienen adelanto', async () => {
    const fetchFn = async () => serverOk([normalized(21), { ...normalized(22), preview: undefined }]);
    const tracks = await fetchServerTracks('Artista', { fetchFn });
    expect(tracks.map((t) => t.id)).toEqual([21]);
    expect(tracks[0]).toEqual(normalized(21));
  });

  it('si el endpoint propio falla, cae al iTunes directo', async () => {
    const fetchFn = async (url) => (isServer(url) ? fail() : ok([track(12)]));
    const tracks = await loadMusicTracks(['Artista'], { fetchFn, sleepFn: async () => {} });
    expect(tracks.map((t) => t.id)).toEqual([12]);
  });

  it('si el endpoint propio responde vacío, cae al iTunes directo', async () => {
    const fetchFn = async (url) => (isServer(url) ? serverOk([]) : ok([track(13)]));
    const tracks = await loadMusicTracks(['Artista'], { fetchFn, sleepFn: async () => {} });
    expect(tracks.map((t) => t.id)).toEqual([13]);
  });

  it('devuelve las pistas con adelanto y descarta las que no lo tienen', async () => {
    const fetchFn = async () => ok([track(1), { ...track(2), previewUrl: undefined }, track(3)]);
    const tracks = await loadMusicTracks(['Artista'], { fetchFn, sleepFn: async () => {} });
    expect(tracks.map((t) => t.id)).toEqual([1, 3]);
    expect(tracks[0]).toEqual({ id: 1, name: 'Canción 1', artist: 'Artista', artwork: 'https://x/100.jpg', preview: 'https://x/1.m4a', url: 'https://x/1' });
  });
  it('ante un fallo de la API reintenta una vez y no se queda con el fallo', async () => {
    let calls = 0;
    const fetchFn = async () => { calls += 1; return calls === 1 ? fail() : ok([track(7)]); };
    const tracks = await loadMusicTracks(['Artista'], { fetchFn, sleepFn: async () => {} });
    expect(calls).toBe(2);
    expect(tracks.map((t) => t.id)).toEqual([7]);
  });
  it('ante 0 resultados del endpoint propio, el reintento es el iTunes directo', async () => {
    let calls = 0;
    const seen = [];
    const fetchFn = async (url) => { calls += 1; seen.push(url); return ok(calls === 1 ? [] : [track(5)]); };
    const tracks = await loadMusicTracks(['Artista'], { fetchFn, sleepFn: async () => {} });
    expect(calls).toBe(2);
    expect(isServer(seen[0])).toBe(true);
    expect(seen[1]).toContain('itunes.apple.com/search');
    expect(tracks.map((t) => t.id)).toEqual([5]);
  });
  it('si la consulta del artista no devuelve nada, reintenta y luego prueba la de respaldo', async () => {
    const seen = [];
    const fetchFn = async (url) => {
      seen.push(url);
      const empty = seen.length <= 2;
      return isServer(url) ? serverOk(empty ? [] : [normalized(9)]) : ok(empty ? [] : [track(9)]);
    };
    const tracks = await loadMusicTracks(['Artista', 'Artista — Gira'], { fetchFn, sleepFn: async () => {} });
    expect(tracks.map((t) => t.id)).toEqual([9]);
    expect(seen).toHaveLength(3);
    expect(seen[2]).toContain(encodeURIComponent('Artista — Gira'));
  });
  it('guarda en caché los éxitos: la segunda apertura no vuelve a pedirlos', async () => {
    let calls = 0;
    const fetchFn = async (url) => { calls += 1; return isServer(url) ? serverOk([normalized(3)]) : ok([track(3)]); };
    const opts = { fetchFn, sleepFn: async () => {} };
    expect((await loadMusicTracks(['Artista'], opts)).map((t) => t.id)).toEqual([3]);
    expect((await loadMusicTracks(['Artista'], opts)).map((t) => t.id)).toEqual([3]);
    expect(calls).toBe(1);
  });
  it('un fallo no queda en caché, pero un éxito posterior sí', async () => {
    let calls = 0;
    const fetchFn = async () => { calls += 1; if (calls <= 2) throw new Error('red caída'); return ok([track(8)]); };
    const opts = { fetchFn, sleepFn: async () => {} };
    expect(await loadMusicTracks(['Artista'], opts)).toEqual([]);
    expect((await loadMusicTracks(['Artista'], opts)).map((t) => t.id)).toEqual([8]);
    expect((await loadMusicTracks(['Artista'], opts)).map((t) => t.id)).toEqual([8]);
    expect(calls).toBe(4);
  });
  it('el tiempo límite por defecto es 12 s (antes 8 s, corto con red móvil lenta)', () => {
    const src = fs.readFileSync(new URL('../lib/eventDetails.js', import.meta.url), 'utf8');
    expect(src.match(/timeoutMs = 12000/g)).toHaveLength(2);
    expect(src).not.toContain('timeoutMs = 8000');
  });
  it('si todo falla devuelve vacío (sin guardar el fallo como caché)', async () => {
    let calls = 0;
    const fetchFn = async () => { calls += 1; throw new Error('red caída'); };
    expect(await loadMusicTracks(['Artista'], { fetchFn, sleepFn: async () => {} })).toEqual([]);
    // La próxima llamada vuelve a intentarlo: nada quedó cacheado.
    expect(await loadMusicTracks(['Artista'], { fetchFn, sleepFn: async () => {} })).toEqual([]);
    expect(calls).toBe(4);
  });
  it('aborta la consulta si pasa el tiempo límite', async () => {
    const fetchFn = async (_url, { signal } = {}) => {
      await new Promise((resolve, reject) => { signal?.addEventListener('abort', () => reject(new Error('AbortError')), { once: true }); });
    };
    const tracks = await fetchItunesTracks('Artista', { fetchFn, timeoutMs: 5, sleepFn: async () => {} }).catch(() => null);
    expect(tracks).toBeNull();
  });
});

describe('Botón de boletos en carga directa (nov 2026)', () => {
  // La ficha abierta por URL directa o refresh recibía la fila cruda de
  // la base, sin booking_config (que no es columna: se deriva de
  // `website`), y el botón COMPRAR BOLETOS no aparecía. La derivación
  // ahora vive en deriveEventBooking y getEventLinks la aplica a
  // cualquier fila cruda, no solo a las de la lista del muro.
  const ticketmasterJson = JSON.stringify({ enabled: true, type: 'external', externalLinks: [{ platform: 'comprar_entradas', url: 'https://www.ticketmaster.com.mx/david-bisbal/event/123' }] });
  it('deriva los enlaces de un website JSON sin booking_config (caso David Bisbal)', () => {
    expect(getEventLinks({ website: ticketmasterJson })).toEqual([
      { platform: 'comprar_entradas', url: 'https://www.ticketmaster.com.mx/david-bisbal/event/123' },
    ]);
  });
  it('deriva un enlace de una URL plana sin booking_config', () => {
    expect(getEventLinks({ website: 'https://boletos.example.com/evento' })).toEqual([
      { platform: 'otro', url: 'https://boletos.example.com/evento', label: 'Sitio Web / Boletos' },
    ]);
  });
  it('no ofrece enlaces sin website ni booking_config', () => {
    expect(getEventLinks({ website: null })).toEqual([]);
    expect(getEventLinks({})).toEqual([]);
  });
  it('respeta un booking_config ya presente y no lo re-deriva del website', () => {
    expect(getEventLinks({
      website: 'https://boletos.example.com/evento',
      booking_config: { enabled: true, type: 'external', externalLinks: [{ platform: 'comprar_entradas', url: 'https://tickets.example.com/event' }] },
    })).toEqual([{ platform: 'comprar_entradas', url: 'https://tickets.example.com/event' }]);
  });
  it('la barra fija muestra Comprar boletos para una fila cruda con website JSON', () => {
    const html = renderBar({ price: 700, price_type: 'paid', website: ticketmasterJson });
    expect(html).toContain('Comprar boletos');
  });
  it('deriveEventBooking limpia el website cuando era el JSON de booking_config', () => {
    expect(deriveEventBooking({ website: ticketmasterJson })).toEqual({
      booking_config: { enabled: true, type: 'external', externalLinks: [{ platform: 'comprar_entradas', url: 'https://www.ticketmaster.com.mx/david-bisbal/event/123' }] },
      website: null,
    });
  });
  it('deriveEventBooking deja la URL plana como website y arma el enlace', () => {
    expect(deriveEventBooking({ website: 'https://boletos.example.com/evento' })).toEqual({
      booking_config: { enabled: true, type: 'external', externalLinks: [{ platform: 'otro', url: 'https://boletos.example.com/evento', label: 'Sitio Web / Boletos' }] },
      website: 'https://boletos.example.com/evento',
    });
  });
  it('deriveEventBooking no inventa enlaces con un JSON roto ni sin website', () => {
    expect(deriveEventBooking({ website: '{"enabled":true,' })).toEqual({ booking_config: null, website: '{"enabled":true,' });
    expect(deriveEventBooking({ website: null })).toEqual({ booking_config: null, website: null });
  });
});

describe('ficha de evento recurrente: «Todos los jueves» en vez del rango', () => {
  // Art & Market Marina Vallarta (captura de Jonathan, 20 nov 2026):
  // evento semanal los jueves 6:00–10:00 p. m. con date 2026-11-19 y
  // end_date 2027-05-13. Antes la ficha mostraba el rango completo
  // («19 de noviembre de 2026 al 13 de mayo de 2027»), como si fuera
  // un evento corrido; ahora dice el día que se repite.
  const weekly = { date: '2026-11-19', end_date: '2027-05-13', time: '18:00', end_time: '22:00', is_recurring: true, venue_name: 'Malecón de Marina Vallarta' };
  it('muestra «Todos los jueves» y no el rango', () => {
    const html = render(weekly);
    expect(html).toContain('Todos los jueves');
    expect(html).not.toContain('19 de noviembre de 2026');
    expect(html).not.toContain('al 13 de mayo');
    expect(html).not.toContain('13 de mayo de 2027');
  });
  it('el horario se queda como está', () => {
    const html = render(weekly);
    expect(html).toContain('6:00 p. m. – 10:00 p. m.');
  });
  it('el día sale del día real del evento, no de un texto fijo', () => {
    // Martes de Glamour CMLL: 17 nov 2026 es martes.
    expect(render({ ...weekly, date: '2026-11-17', end_date: '2027-01-12' })).toContain('Todos los martes');
    // Tianguis Cultural GDL: 21 nov 2026 es sábado.
    expect(render({ ...weekly, date: '2026-11-21', end_date: '2027-05-01' })).toContain('Todos los sábados');
    // Vía RecreActiva GDL: 22 nov 2026 es domingo.
    expect(render({ ...weekly, date: '2026-11-22', end_date: '2027-05-02' })).toContain('Todos los domingos');
  });
  it('un evento NO recurrente de varias fechas sigue mostrando su rango', () => {
    const html = render({ date: '2026-11-20', end_date: '2026-11-21', time: '21:00', is_recurring: false });
    expect(html).toContain('20 de noviembre de 2026');
    expect(html).toContain('al 21 de noviembre');
    expect(html).not.toContain('Todos los');
  });
  it('sin is_recurring tampoco cambia nada', () => {
    const html = render({ date: '2026-11-20', end_date: '2026-11-21', time: '21:00' });
    expect(html).toContain('al 21 de noviembre');
    expect(html).not.toContain('Todos los');
  });
  it('la clave i18n existe en español y en inglés', () => {
    const es = fs.readFileSync(new URL('../lib/i18n.js', import.meta.url), 'utf8');
    const en = fs.readFileSync(new URL('../lib/i18n-en.js', import.meta.url), 'utf8');
    expect(es).toContain('"eventos_todos_los_dias": "Todos los ${dia}"');
    expect(en).toContain('"eventos_todos_los_dias": "Every ${dia}"');
  });
});

// R2 (UX 26 nov 2026): sin precio ni hora publicados, la ficha dice
// «Precio no publicado» / «Hora por confirmar» en vez de quedarse en
// silencio — que no se confunda con «gratis» ni con «todo el día».
describe('Precio y hora no publicados (R2)', () => {
  it('formats event times in 12-hour time', () => {
    expect(formatEventTime12h('21:00')).toBe('9:00 p. m.');
    expect(formatEventTime12h('09:30')).toBe('9:30 a. m.');
    expect(formatEventTime12h('12:00')).toBe('12:00 p. m.');
    expect(formatEventTime12h('00:15')).toBe('12:15 a. m.');
    expect(formatEventTime12h('21:00', 'en')).toBe('9:00 PM');
    expect(formatEventTime12h('')).toBe('');
    expect(formatEventTime12h('25:00')).toBe('');
    expect(formatEventTime12h(null)).toBe('');
  });
  it('shows "Precio no publicado" when the event has no price', () => {
    const html = render({ date: '2026-12-05', time: '20:00', venue_name: 'Teatro', price_type: 'paid', price: '' });
    expect(html).toContain('Precio no publicado');
    expect(html).not.toContain('Entrada gratuita');
  });
  it('shows "Hora por confirmar" when the event has a date but no time', () => {
    const html = render({ date: '2026-12-05', venue_name: 'Teatro', price_type: 'paid', price: '$200' });
    expect(html).toContain('Hora por confirmar');
    expect(html).toContain('Entrada: $200 MXN');
  });
  it('keeps free and priced events as before', () => {
    expect(render({ date: '2026-12-05', time: '20:00', price_type: 'gratis' })).toContain('Entrada gratuita');
    expect(render({ date: '2026-12-05', time: '20:00', price_type: 'paid', price: '$200' })).toContain('Entrada: $200 MXN');
  });
});

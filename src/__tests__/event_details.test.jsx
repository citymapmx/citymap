import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect } from 'vitest';
import { getEventPrice, getEventLinks, normalizeEventLink, splitDescription, getEventPriceAmount, matchesPriceFilter, priceSortValue, getEventMusicQuery, buildItunesSearchUrl } from '../lib/eventDetails.js';
import { getEventPrice as getNextPrice } from '../../web-next/src/lib/eventDetails.js';
import EventInformation from '../components/detail/EventInformation.jsx';
const T={text:'#111',sub:'#666',bg:'#fff',border:'#ddd'};
const render=(event,hideTickets)=>renderToStaticMarkup(<EventInformation event={event} T={T} hideTickets={hideTickets}/>);

describe('Event entry information',()=>{
  it.each([undefined,null,'','   ','Desde',false])('omits an absent amount %s instead of leaving Desde alone',price=>{
    const event={price_type:'paid',price};
    expect(getEventPrice(event)).toBeNull();
    expect(getNextPrice(event)).toBeNull();
    expect(render(event)).not.toContain('Entradas');
    expect(render(event)).not.toContain('Desde');
  });
  it.each([[150,'Entrada: $150'],['$150','Entrada: $150'],['Desde $150','Desde $150'],['$150 - $300','Desde $150']])('formats an actual amount %s', (price,expected)=>{
    expect(getEventPrice({price_type:'paid',price})?.text).toBe(expected);
    expect(getNextPrice({price_type:'paid',price})?.text).toBe(expected);
  });
  it('shows free admission only when explicitly recorded',()=>{
    expect(getEventPrice({price_type:'gratis',price:''})?.text).toBe('Entrada gratuita');
    expect(getEventPrice({price:0})?.text).toBe('Entrada gratuita');
    expect(getEventPrice({price_type:'paid',price:''})).toBeNull();
  });
  it('offers consultation when a ticket link exists without a price',()=>{
    const html=render({price_type:'paid',booking_config:{enabled:true,type:'external',externalLinks:[{platform:'comprar_entradas',url:'https://tickets.example.com/event'}]}});
    expect(html).toContain('Consultar entradas');
    expect(html).not.toContain('Comprar boletos');
    expect(html).not.toContain('Desde');
  });
  it('offers ticket purchase when an amount and a valid seller are available',()=>{
    expect(render({price:150,booking_config:{enabled:true,type:'external',externalLinks:[{platform:'comprar_entradas',url:'tickets.example.com/event'}]}})).toContain('Comprar boletos');
  });
  it('hides price and ticket links for past events',()=>{
    const event={price:150,price_type:'paid',booking_config:{enabled:true,type:'external',externalLinks:[{platform:'comprar_entradas',url:'https://tickets.example.com/event'}]}};
    const past=render(event,true);
    expect(past).not.toContain('Entradas');
    expect(past).not.toContain('Comprar boletos');
    expect(past).not.toContain('Consultar entradas');
    expect(render(event)).toContain('Comprar boletos');
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
    expect(html).toContain('Entrada: $1208');
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
  it.each([[150,'$150'],['$150','$150'],['Desde $150','$150'],['$150 - $300','$150']])('returns only the amount %s', (price,expected)=>{
    expect(getEventPriceAmount({price_type:'paid',price})).toBe(expected);
  });
  it('returns no amount for free or missing prices',()=>{
    expect(getEventPriceAmount({price_type:'gratis',price:''})).toBeNull();
    expect(getEventPriceAmount({price_type:'paid',price:''})).toBeNull();
  });
  it('hides the price row when the modal already shows it on top',()=>{
    const event={price:1208,price_type:'paid'};
    expect(render(event)).toContain('Entrada: $1208');
    expect(renderToStaticMarkup(<EventInformation event={event} T={T} hidePriceRow />)).not.toContain('Entrada: $1208');
  });
  it('shows plain bigger icons without the tinted circle',()=>{
    const html=render({date:'2026-11-29',time:'20:00',venue_address:'Zapopan, Jal.'});
    expect(html).toContain('width="26"');
    expect(html).not.toContain('#EFF6F1');
  });
  it('shows the ticket button bigger, in uppercase and with a proper arrow icon',()=>{
    const html=render({price:150,booking_config:{enabled:true,type:'external',externalLinks:[{platform:'comprar_entradas',url:'https://tickets.example.com/event'}]}});
    expect(html).toContain('Comprar boletos');
    expect(html).toContain('text-transform:uppercase');
    expect(html).toContain('font-size:16px');
    expect(html).toContain('M5 12h14');
    expect(html).not.toContain('↗');
  });
  it('does not repeat the year in a same-year date range',()=>{
    const html=render({date:'2026-11-20',end_date:'2026-11-21',time:'20:00',venue_name:'Auditorio Telmex'});
    expect(html).toContain(' al ');
    expect((html.match(/2026/g) || []).length).toBe(1);
    expect(html).not.toContain('21 de noviembre de 2026');
  });
  it('softens the ticket button in dark mode instead of a solid white pill',()=>{
    const darkT={...T,dark:true,greenD:'#E4E4E7'};
    const html=renderToStaticMarkup(<EventInformation event={{price:150,booking_config:{enabled:true,type:'external',externalLinks:[{platform:'comprar_entradas',url:'https://tickets.example.com/event'}]}}} T={darkT} />);
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
  it('arma la búsqueda de iTunes con el artista y límite de canciones', () => {
    expect(buildItunesSearchUrl('Omar Camacho')).toBe('https://itunes.apple.com/search?term=Omar%20Camacho&media=music&entity=song&limit=5');
    expect(buildItunesSearchUrl('Alfredo Olivas', 3)).toContain('limit=3');
  });
});

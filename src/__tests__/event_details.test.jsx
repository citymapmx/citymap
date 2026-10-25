import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect } from 'vitest';
import { getEventPrice, getEventLinks, normalizeEventLink } from '../lib/eventDetails.js';
import { getEventPrice as getNextPrice } from '../../web-next/src/lib/eventDetails.js';
import EventInformation from '../components/detail/EventInformation.jsx';
const T={text:'#111',sub:'#666',bg:'#fff',border:'#ddd'};
const render=event=>renderToStaticMarkup(<EventInformation event={event} T={T}/>);

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
    expect(html).toContain('2 de noviembre de 2026');
    expect(html).toContain('6:30 p. m. – 11:00 p. m.');
    expect(html).toContain('Cómo llegar');
    expect(html).toContain('destination=Centro%2C%20Tepic');
  });
});

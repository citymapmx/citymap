import {describe,it,expect} from 'vitest';
import {getSearchPrompts} from '../lib/searchPrompts.js';
import {getSearchPrompts as nextPrompts} from '../../web-next/src/lib/searchPrompts.js';
import {eventMatchesQuery} from '../lib/eventSearch.js';

describe('contextual search prompts',()=>{
  it('uses the selected city time rather than the machine time',()=>{
    const date=new Date('2026-10-20T15:00:00Z');
    expect(getSearchPrompts('Tepic',date,'America/Mazatlan')[0]).toContain('desayuno');
    expect(getSearchPrompts('Madrid',date,'Europe/Madrid')[0]).toContain('tarde');
    expect(getSearchPrompts('Tepic',date,'America/Mazatlan')[0]).toContain('Tepic');
  });
  it('provides a broad catalogue and adds weekend ideas',()=>{
    const weekday=[0,6,12,17,20,23].flatMap(hour=>getSearchPrompts('Tepic',new Date(2026,9,19,hour)));
    const weekend=getSearchPrompts('Tepic',new Date(2026,9,17,12));
    expect(weekday).toHaveLength(60);
    expect(weekend).toHaveLength(20);
    expect(new Set([...weekday,...weekend]).size).toBeGreaterThan(60);
    expect(weekend.some(text=>text.includes('fin de semana'))).toBe(true);
    expect(weekday.every(text=>!text.includes('{city}'))).toBe(true);
    expect(weekday.every(text=>text.length<45)).toBe(true);
  });
  it('keeps both clients consistent and tolerates an unknown timezone',()=>{
    const date=new Date('2026-10-20T03:00:00Z');
    expect(getSearchPrompts('Tepic',date,'America/Mazatlan')).toEqual(nextPrompts('Tepic',date,'America/Mazatlan'));
    expect(()=>getSearchPrompts('Tepic',date,'invalid-zone')).not.toThrow();
  });
});

describe('event search',()=>{
  const event={title:'Serie inaugural Jaguares vs Charros',category:'Deportes',venue_name:'Estadio Coloso del Pacífico',city_slug:'tepic'};
  it('shows the catalogue for generic event searches',()=>{
    expect(eventMatchesQuery('eventos',event)).toBe(true);
    expect(eventMatchesQuery('evento',event)).toBe(true);
  });
  it('matches names and venues with small typos and accents',()=>{
    expect(eventMatchesQuery('jaguarez',event)).toBe(true);
    expect(eventMatchesQuery('eventos jaguares',event)).toBe(true);
    expect(eventMatchesQuery('pacifico',event)).toBe(true);
    expect(eventMatchesQuery('pizza',event)).toBe(false);
  });
  it('uses the actual category field and ignores missing metadata',()=>{
    expect(eventMatchesQuery('musica',{title:'Concierto',event_category:'Música'})).toBe(true);
    expect(eventMatchesQuery('',event)).toBe(false);
    expect(eventMatchesQuery('eventos',{title:'Un evento sin categoría'})).toBe(true);
  });
});

import {describe,it,expect} from 'vitest';
import {selectHomeEvents,eventDayKey,isEventUpcoming} from '../lib/homeEventSelection.js';
import {selectHomeEvents as selectNext} from '../../web-next/src/lib/homeEventSelection.js';
import {CITY_TZ} from '../lib/constants.js';
const event=(id,date,end_date)=>({id,title:id,date,end_date,status:'approved'});
const ids=rows=>rows.map(row=>row.id);
describe('chronological home event selection',()=>{
  it('prioritizes today, the next week and then later dates',()=>{
    const result=selectHomeEvents([event('later','2026-11-05'),event('week','2026-10-23'),event('today','2026-10-18'),event('sooner','2026-10-29')],'2026-10-18');
    expect(ids(result.featured)).toEqual(['today','week','sooner','later']);
  });
  it('separates week-long and monthly events without duplicating or losing them',()=>{
    const rows=[event('palenque','2026-10-01','2026-10-31'),event('festival','2026-10-22','2026-10-28'),event('weekend','2026-10-17','2026-10-19'),event('gig','2026-10-19')];
    const result=selectHomeEvents(rows,'2026-10-18');
    expect(ids(result.seasonal).sort()).toEqual(['festival','palenque']);
    expect(ids(result.featured).sort()).toEqual(['gig','weekend']);
    expect(new Set([...ids(result.featured),...ids(result.seasonal)]).size).toBe(rows.length);
  });
  it('keeps long future events available until their month arrives',()=>{
    const rows=[event('november','2026-11-01','2026-11-30')];
    expect(ids(selectHomeEvents(rows,'2026-10-18').featured)).toEqual(['november']);
    expect(ids(selectHomeEvents(rows,'2026-11-01').seasonal)).toEqual(['november']);
  });
  it('orders all next-week events by event date regardless of creation order',()=>{
    const rows=[
      {...event('newest','2026-10-25'),created_at:'2026-10-18T12:00:00Z'},
      {...event('oldest','2026-10-19'),created_at:'2026-08-01T12:00:00Z'},
      {...event('middle','2026-10-21'),created_at:'2026-09-01T12:00:00Z'}
    ];
    expect(ids(selectHomeEvents(rows,'2026-10-18').featured)).toEqual(['oldest','middle','newest']);
    expect(selectHomeEvents(rows,'2026-10-18')).toEqual(selectHomeEvents([...rows].reverse(),'2026-10-18'));
  });
  it('orders same-day events by time with stable ties and undated times last',()=>{
    const rows=[{...event('night','2026-10-24'),time:'20:00:00'},event('unknown','2026-10-24'),{...event('morning','2026-10-24'),time:'9:00'}];
    expect(ids(selectHomeEvents(rows,'2026-10-18').featured)).toEqual(['morning','night','unknown']);
    expect(ids(selectHomeEvents(rows,'2026-10-19').featured)).toEqual(['morning','night','unknown']);
  });
  it('orders long-duration events by start date without daily rotation',()=>{
    const rows=[event('later','2026-10-22','2026-10-31'),event('earlier','2026-10-01','2026-10-31')];
    expect(ids(selectHomeEvents(rows,'2026-10-18').seasonal)).toEqual(['earlier','later']);
    expect(ids(selectHomeEvents(rows,'2026-10-19').seasonal)).toEqual(['earlier','later']);
  });
  it('removes expired, unapproved and invalid dates, including month boundaries',()=>{
    const rows=[event('ended','2026-10-01','2026-10-17'),event('current','2026-10-17','2026-10-18'),{...event('draft','2026-10-18'),status:'pending'},event('bad','2026-02-30'),null,event('missing',null)];
    expect(ids(selectHomeEvents(rows,'2026-10-18').featured)).toEqual(['current']);
    expect(selectHomeEvents(rows,'2026-10-19').featured).toEqual([]);
    const december=[event('december','2026-12-01','2026-12-31')];
    expect(selectHomeEvents(december,'2026-12-31').seasonal).toHaveLength(1);
    expect(selectHomeEvents(december,'2027-01-01').seasonal).toHaveLength(0);
  });
  it('uses the selected city calendar and behaves identically in both clients',()=>{
    const now=new Date('2026-10-19T05:30:00Z');
    expect(eventDayKey(now,'America/Mazatlan')).toBe('2026-10-18');
    expect(eventDayKey(now,'Europe/Madrid')).toBe('2026-10-19');
    expect(()=>eventDayKey(now,'invalid')).not.toThrow();
    const rows=[event('today','2026-10-18'),event('monthly','2026-10-01','2026-10-31')];
    expect(selectHomeEvents(rows,'2026-10-18')).toEqual(selectNext(rows,'2026-10-18'));
  });
});

describe('isEventUpcoming (rueda del inicio global: hoy en la zona de SU ciudad)',()=>{
  // 2026-11-20T05:30:00Z: en Tijuana (UTC-7) aún es 19 nov 22:30;
  // en Madrid (UTC+1) ya es 20 nov 06:30.
  const now=new Date('2026-11-20T05:30:00Z');
  const ev=(id,date,end_date,city_slug)=>({id,title:id,date,end_date,city_slug,status:'approved'});
  it('un evento de ayer sigue vigente si en su ciudad aún es ayer',()=>{
    expect(isEventUpcoming(ev('tj','2026-11-19',null,'tijuana'),now,CITY_TZ)).toBe(true);
    expect(isEventUpcoming(ev('madrid','2026-11-19',null,'madrid'),now,CITY_TZ)).toBe(false);
  });
  it('un evento de varios días vale mientras no haya pasado su fin en su ciudad',()=>{
    expect(isEventUpcoming(ev('ludo','2026-10-01','2026-12-31','nuevo-vallarta'),now,CITY_TZ)).toBe(true);
    expect(isEventUpcoming(ev('pasado','2026-11-01','2026-11-19','tijuana'),now,CITY_TZ)).toBe(true);
    expect(isEventUpcoming(ev('pasado-madrid','2026-11-01','2026-11-19','madrid'),now,CITY_TZ)).toBe(false);
  });
  it('un evento futuro siempre vale y uno pasado nunca',()=>{
    expect(isEventUpcoming(ev('futuro','2026-11-21',null,'guadalajara'),now,CITY_TZ)).toBe(true);
    expect(isEventUpcoming(ev('viejo','2026-11-01',null,'guadalajara'),now,CITY_TZ)).toBe(false);
  });
  it('multi-ciudad usa la primera ciudad; sin ciudad o fecha inválida no vale',()=>{
    expect(isEventUpcoming(ev('multi','2026-11-19',null,'tijuana,guadalajara'),now,CITY_TZ)).toBe(true);
    expect(isEventUpcoming(ev('multi2','2026-11-19',null,'madrid,tijuana'),now,CITY_TZ)).toBe(false);
    expect(isEventUpcoming(ev('sin-ciudad','2026-11-19',null,''),now,CITY_TZ)).toBe(false);
    expect(isEventUpcoming(ev('mala-fecha','2026-02-30',null,'guadalajara'),now,CITY_TZ)).toBe(false);
    expect(isEventUpcoming(ev('sin-fecha',null,null,'guadalajara'),now,CITY_TZ)).toBe(false);
    expect(isEventUpcoming(null,now,CITY_TZ)).toBe(false);
  });
  it('sin zona conocida para la ciudad usa hoy del dispositivo',()=>{
    // 05:30Z: en hora UTC (dispositivo) es 20 nov; el evento del 19 ya pasó.
    expect(isEventUpcoming(ev('desconocida','2026-11-19',null,'bogota'),now,CITY_TZ)).toBe(false);
    expect(isEventUpcoming(ev('desconocida-hoy','2026-11-20',null,'bogota'),now,CITY_TZ)).toBe(true);
  });
});

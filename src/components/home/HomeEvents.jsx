import React, {memo, useEffect, useState} from 'react';
import {isNear} from '../../lib/utils.js';
import {CITY_TZ} from '../../lib/constants.js';
import {eventDayKey, selectHomeEvents} from '../../lib/homeEventSelection.js';
import {EventSk} from '../ui/Skeleton.jsx';
import EventCoverflow from './EventCoverflow.jsx';

export default memo(function HomeEvents({events = [], activeCity, userCoords, dbReady, dark, cityImg, handleEventTap, T}) {
  const timeZone = CITY_TZ[activeCity];
  const [today, setToday] = useState(() => eventDayKey(new Date(), timeZone));
  useEffect(() => {
    const update = () => setToday(eventDayKey(new Date(), timeZone));
    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, [timeZone]);
  const {featured, seasonal} = selectHomeEvents(events.filter(event => isNear(event, userCoords, activeCity)), today);
  if (!featured.length && !seasonal.length) return !dbReady ? <div style={{padding:'4px 0 0'}}><EventSk dark={dark}/></div> : null;
  const shortDate = value => new Date(`${value}T12:00:00Z`).toLocaleDateString('es-MX',{day:'numeric',month:'short',timeZone:'UTC'});
  return <div style={{padding:'4px 0 0'}}>
    {featured.length > 0 && <EventCoverflow events={featured} fallbackImage={cityImg} onOpen={handleEventTap} T={T}/>}
    {seasonal.length > 0 && <section aria-label="Eventos de larga duración" style={{marginTop:featured.length ? 28 : 0,paddingTop:featured.length ? 22 : 0,borderTop:featured.length ? `1px solid ${T.border}` : 'none'}}>
      <header style={{margin:'0 20px 16px',textAlign:'center'}}>
        <h2 style={{margin:'0 0 5px',fontSize:16,fontWeight:800,color:T.text}}>Eventos de larga duración</h2>
        <p style={{margin:0,fontSize:13,lineHeight:1.4,color:T.sub}}>Para disfrutar durante varios días</p>
      </header>
      <EventCoverflow events={seasonal} fallbackImage={cityImg} onOpen={handleEventTap} T={T} label="Carrusel de eventos de larga duración" formatEventMeta={event => {
        const dates = event.date <= today ? `Hasta el ${shortDate(event.end_date || event.date)}` : `${shortDate(event.date)} — ${shortDate(event.end_date || event.date)}`;
        return [dates,event.venue_name].filter(Boolean).join(' · ');
      }}/>
    </section>}
  </div>;
});

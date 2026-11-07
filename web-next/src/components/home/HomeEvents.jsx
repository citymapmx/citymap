import React, {memo, useEffect, useState} from 'react';
import {isNear} from '../../lib/utils.js';
import {CITY_TZ} from '../../lib/constants.js';
import {eventDayKey, selectHomeEvents} from '../../lib/homeEventSelection.js';
import {EventSk} from '../ui/Skeleton.jsx';
import EventCoverflow from './EventCoverflow.jsx';

// En la página de ciudad todos los eventos van en el mismo carrusel: los
// de larga duración ya no tienen sección propia (eliminada a petición de
// Jonathan el 7 Nov 2026) y se mezclan con los próximos por fecha de
// inicio. Su etiqueta muestra el rango ("28 NOV — 6 DIC", o "HASTA 6 DIC"
// si ya empezó) en vez de solo el día de inicio.
export default memo(function HomeEvents({events = [], activeCity, userCoords, dbReady, dark, handleEventTap, T}) {
  const timeZone = CITY_TZ[activeCity];
  const [today, setToday] = useState(() => eventDayKey(new Date(), timeZone));
  useEffect(() => {
    const update = () => setToday(eventDayKey(new Date(), timeZone));
    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, [timeZone]);
  const {featured, seasonal} = selectHomeEvents(events.filter(event => isNear(event, userCoords, activeCity)), today);
  const all = [...featured, ...seasonal].sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')));
  if (!all.length) return !dbReady ? <div style={{padding:'4px 0 0'}}><EventSk dark={dark}/></div> : null;
  const shortDate = value => new Date(`${value}T12:00:00Z`).toLocaleDateString('es-MX',{day:'numeric',month:'short',timeZone:'UTC'});
  const tagDate = value => new Date(`${value}T12:00:00Z`).toLocaleDateString('es-MX',{day:'numeric',month:'short',timeZone:'UTC'}).replace('.','').toUpperCase();
  const longDate = value => new Date(`${value}T12:00:00`).toLocaleDateString('es-MX',{day:'numeric',month:'long'});
  const isMultiDay = event => event.end_date && event.end_date > event.date;
  const rangeLabel = event => {
    const end = event.end_date || event.date;
    return event.date <= today ? `Hasta el ${shortDate(end)}` : `${shortDate(event.date)} — ${shortDate(end)}`;
  };
  const rangeTag = event => {
    const start = tagDate(event.date);
    const end = tagDate(event.end_date || event.date);
    if (event.date <= today) return `HASTA ${end}`;
    return start === end ? start : `${start} — ${end}`;
  };
  return <div style={{padding:'4px 0 0'}}>
    <EventCoverflow events={all} onOpen={handleEventTap} T={T} heading="Próximos eventos" subheading="Los eventos que vienen en tu ciudad" formatEventMeta={event => {
      const dates = isMultiDay(event) ? rangeLabel(event) : longDate(event.date);
      return [dates, event.venue_name].filter(Boolean).join(' · ');
    }} formatEventTag={event => isMultiDay(event) ? rangeTag(event) : tagDate(event.date)}/>
  </div>;
});

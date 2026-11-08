import React, {memo, useEffect, useState} from 'react';
import {isNear} from '../../lib/utils.js';
import {CITY_TZ} from '../../lib/constants.js';
import {eventDayKey, selectHomeEvents} from '../../lib/homeEventSelection.js';
import {EventSk, CoverflowSk} from '../ui/Skeleton.jsx';
import EventWheel3D from './EventWheel3D.jsx';

// En la página de ciudad los eventos van en la misma rueda 3D del inicio
// global (más fluida y con todas las tarjetas del mismo tamaño), no en el
// coverflow: los de larga duración se mezclan con los próximos por fecha
// de inicio y su píldora muestra el rango ("28 NOV — 6 DIC", o "HASTA
// 6 DIC" si ya empezó) en vez de solo el día de inicio. La rueda muestra
// los 10 más próximos; la lista completa sigue en la pestaña Eventos.
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
  if (!all.length) return !dbReady ? <CoverflowSk dark={dark}/> : null;
  const tagDate = value => new Date(`${value}T12:00:00Z`).toLocaleDateString('es-MX',{day:'numeric',month:'short',timeZone:'UTC'}).replace('.','').toUpperCase();
  const isMultiDay = event => event.end_date && event.end_date > event.date;
  const rangeTag = event => {
    const start = tagDate(event.date);
    const end = tagDate(event.end_date || event.date);
    if (event.date <= today) return `HASTA ${end}`;
    return start === end ? start : `${start} — ${end}`;
  };
  const items = all.map(event => ({ ...event, key: event.id || event.slug, img: event.img_url || event.img || event.poster_url }));
  return <div style={{padding:'4px 0 0'}}>
    <EventWheel3D events={items} onSelect={handleEventTap} T={T} heading="Próximos eventos" subheading="Los eventos que vienen en tu ciudad" pillLabel={event => isMultiDay(event) ? rangeTag(event) : tagDate(event.date)} />
  </div>;
});

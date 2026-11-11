import React, {memo, useEffect, useState} from 'react';
import {isNear} from '../../lib/utils.js';
import {CITY_TZ} from '../../lib/constants.js';
import {eventDayKey, selectHomeEvents} from '../../lib/homeEventSelection.js';
import { localizedTitle } from '../../lib/i18nContent.js';
import {EventSk, CoverflowSk} from '../ui/Skeleton.jsx';
import EventWheel3D from './EventWheel3D.jsx';
import NearbyEventsList from './NearbyEventsList.jsx';
import { cityDisplayName } from '../../lib/nearbyEvents.js';

// En la página de ciudad los eventos van en la misma rueda 3D del inicio
// global (más fluida y con todas las tarjetas del mismo tamaño), no en el
// coverflow: los de larga duración se mezclan con los próximos por fecha
// de inicio y su píldora muestra el rango ("28 NOV — 6 DIC", o "HASTA
// 6 DIC" si ya empezó) en vez de solo el día de inicio. La rueda muestra
// los 10 más próximos; la lista completa sigue en la pestaña Eventos.
export default memo(function HomeEvents({events = [], activeCity, userCoords, dbReady, secondaryReady = true, dark, handleEventTap, T, t = (k, f) => (f !== undefined ? f : k), lang = 'es', cities = [], nearbyEvents = [], onRequestNearbyEvents}) {
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
  const tagDate = value => new Date(`${value}T12:00:00Z`).toLocaleDateString(lang === 'en' ? 'en-US' : 'es-MX',{day:'numeric',month:'short',timeZone:'UTC'}).replace('.','').toUpperCase();
  const isMultiDay = event => event.end_date && event.end_date > event.date;
  const rangeTag = event => {
    const start = tagDate(event.date);
    const end = tagDate(event.end_date || event.date);
    if (event.date <= today) return `${t("home_hasta", "HASTA")} ${end}`;
    return start === end ? start : `${start} — ${end}`;
  };
  // Interpolar ${ciudad} aunque el t() que llegue no lo haga (el t() por
  // defecto de las pruebas solo devuelve el fallback): el t() real ya
  // interpola y el reemplazo no encuentra nada.
  const tt = (key, fallback, vars) => {
    const value = t(key, fallback, vars);
    if (vars && typeof value === 'string') {
      return value.replace(/\$\{(\w+)\}/g, (m, name) => vars[name] !== undefined && vars[name] !== null ? String(vars[name]) : m);
    }
    return value;
  };
  const cityName = cityDisplayName(activeCity, cities);
  // Sin eventos en la ciudad (ni en su zona): pedir los cercanos una vez.
  useEffect(() => {
    if (!all.length && dbReady && onRequestNearbyEvents) onRequestNearbyEvents(activeCity);
  }, [all.length, dbReady, activeCity, onRequestNearbyEvents]);
  if (!all.length) {
    // Sin eventos todavía: el esqueleto mientras falte CUALQUIER carga
    // (la principal o la secundaria, que trae los eventos). Antes, al
    // hacerse dbReady=true con los eventos aún en camino, se pintaba un
    // instante el estado vacío (~123 px) y luego la rueda (355 px): la
    // tarjeta de abajo saltaba dos veces (CLS 0.129 + 0.076). El estado
    // vacío honesto solo aparece cuando la secundaria ya resolvió y
    // confirmó que no hay eventos.
    if (!dbReady || !secondaryReady) return <CoverflowSk dark={dark}/>;
    // Estado vacío honesto: la ciudad no tiene eventos, pero hay cerca.
    // Cada evento cercano lleva su ciudad visible en su fila, nunca se
    // presenta como si fuera de esta ciudad.
    return <div style={{padding:'4px 0 0'}}>
      <header style={{ margin: '0 20px 16px', textAlign: 'center' }}>
        <h2 style={{ margin: 0, fontFamily: 'var(--heading)', fontSize: 22, fontWeight: 900, letterSpacing: '-0.5px', textTransform: 'uppercase', color: T.text }}>{t("home_proximos_eventos", "Próximos eventos")}</h2>
      </header>
      <p style={{ margin: '0 20px 8px', textAlign: 'center', fontSize: 15, fontWeight: 700, color: T.text }}>{tt("eventos_ciudad_vacia", "En ${ciudad} todavía no hay eventos", { ciudad: cityName })}</p>
      <p style={{ margin: '0 20px 16px', textAlign: 'center', fontSize: 13, lineHeight: 1.4, color: T.sub }}>{t("eventos_ciudad_vacia_desc", "Pero hay eventos cerca que te pueden gustar.")}</p>
      {nearbyEvents.length > 0 && (
        <div style={{ margin: '0 20px' }}>
          <h3 style={{ margin: '0 0 10px', textAlign: 'center', fontFamily: 'var(--heading)', fontSize: 17, fontWeight: 800, color: T.text }}>{tt("eventos_cerca_de", "Eventos cerca de ${ciudad}", { ciudad: cityName })}</h3>
          <NearbyEventsList events={nearbyEvents} cities={cities} T={T} dark={dark} lang={lang} onSelect={handleEventTap} />
        </div>
      )}
    </div>;
  }
  // La rueda renderiza item.title (alt y póster sin imagen): se le pasa ya
  // localizado, como hace GlobalHomeView; el resto del evento (slug, id,
  // title_en) queda intacto para el modal de detalle.
  const items = all.map(event => ({ ...event, key: event.id || event.slug, title: localizedTitle(event, lang), img: event.img_url || event.img || event.poster_url }));
  return <div style={{padding:'4px 0 0'}}>
    <EventWheel3D events={items} onSelect={handleEventTap} T={T} heading={t("home_proximos_eventos", "Próximos eventos")} pillLabel={event => isMultiDay(event) ? rangeTag(event) : tagDate(event.date)} />
  </div>;
});

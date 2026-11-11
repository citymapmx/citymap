// Lista compacta de eventos cercanos para el estado vacío de una ciudad
// sin eventos (HomeEvents y EventsView la comparten). Cada fila muestra
// la ciudad del evento: nunca se presentan como si fueran de la ciudad
// activa, van etiquetados como cercanos.
import React from 'react';
import { localizedTitle } from '../../lib/i18nContent.js';
import { cityDisplayName } from '../../lib/nearbyEvents.js';
import OptimizedImage from '../ui/OptimizedImage.jsx';
import EventPosterFallback from './EventPosterFallback.jsx';

export default function NearbyEventsList({ events = [], cities = [], T = {}, dark = false, lang = 'es', onSelect }) {
  const tagDate = value => new Date(`${value}T12:00:00Z`).toLocaleDateString(lang === 'en' ? 'en-US' : 'es-MX', { day: 'numeric', month: 'short', timeZone: 'UTC' }).replace('.', '').toUpperCase();
  const dateTag = event => {
    if (event.end_date && event.end_date > event.date) return `${tagDate(event.date)} — ${tagDate(event.end_date)}`;
    return tagDate(event.date);
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {events.map(event => {
        const img = event.img_url || event.img || event.poster_url;
        const title = localizedTitle(event, lang) || 'Evento';
        const citySlug = String(event.city_slug || '').split(',')[0];
        return (
          <button
            key={event.id || event.slug}
            type="button"
            onClick={() => onSelect?.(event)}
            style={{ display: 'flex', gap: 12, alignItems: 'center', textAlign: 'left', width: '100%', padding: 10, borderRadius: 16, border: `1px solid ${T.border}`, background: T.card, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            <div style={{ width: 64, height: 80, borderRadius: 10, overflow: 'hidden', flexShrink: 0, background: dark ? '#23252b' : '#edf0f4' }}>
              {img ? (
                <OptimizedImage src={img} alt={title} widthRequest={200} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              ) : <EventPosterFallback title={title} radius={0} />}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: 15, lineHeight: 1.3, color: T.text, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{title}</div>
              <div style={{ fontSize: 13, color: T.sub, marginTop: 4 }}>{dateTag(event)} · {cityDisplayName(citySlug, cities)}</div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

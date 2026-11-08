import React, { useState } from 'react';
import Icon from '../ui/Icon.jsx';
import { getEventPrice, getEventLinks, splitDescription } from '../../lib/eventDetails.js';
import { isPrivateEvent } from '../../lib/privateEvents.js';

function dateLabel(value, options) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return '';
  const date = new Date(`${value}T12:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) return '';
  return date.toLocaleDateString('es-MX', { timeZone: 'UTC', ...options });
}
function timeLabel(value) {
  if (!/^\d{1,2}:\d{2}(?::\d{2})?$/.test(value || '')) return '';
  const [hours, minutes] = value.split(':').map(Number);
  if (hours > 23 || minutes > 59) return '';
  return `${hours % 12 || 12}:${String(minutes).padStart(2, '0')} ${hours >= 12 ? 'p. m.' : 'a. m.'}`;
}

// Información del evento: fecha, lugar y entradas en una sola tarjeta,
// sin etiquetas ("Cuándo", "Dónde") — el icono ya dice qué es cada dato.
// El botón de entradas queda fijo abajo mientras se lee la descripción.
// heroShowsVenue: el héroe ya muestra el lugar, así que la fila solo
// lleva la dirección (si no hay dirección, se muestra el lugar).
// hidePriceRow: el precio ya se muestra en la fila superior del modal.
export default function EventInformation({ event, associatedBiz, T, hideTickets = false, heroShowsVenue = false, hidePriceRow = false }) {
  const price = getEventPrice(event);
  const links = getEventLinks(event);
  const showLinks = !hideTickets && links.length > 0;
  const start = dateLabel(event.date, { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' });
  const end = event.end_date > event.date ? dateLabel(event.end_date, { day: 'numeric', month: 'long', year: 'numeric' }) : '';
  const times = [timeLabel(event.time), timeLabel(event.end_time)].filter(Boolean).join(' – ');
  const venue = event.venue_name || associatedBiz?.name;
  const address = event.venue_address || associatedBiz?.address;
  const coordinates = event.lat !== null && event.lat !== undefined && event.lat !== '' && event.lng !== null && event.lng !== undefined && event.lng !== '' && Number.isFinite(Number(event.lat)) && Number.isFinite(Number(event.lng));
  const destination = coordinates ? `${event.lat},${event.lng}` : [venue, address].filter(Boolean).join(', ');
  const showVenueLine = venue && (!heroShowsVenue || !address);
  const showPriceRow = Boolean(price && !hideTickets && !(isPrivateEvent(event) && price.free) && !hidePriceRow);
  const hasInfo = Boolean((start || times) || (venue || address || coordinates) || showPriceRow);
  const { lead, paragraphs } = splitDescription(event.description);
  const [expanded, setExpanded] = useState(false);
  const shownParagraphs = expanded ? paragraphs : paragraphs.slice(0, 2);
  const needsMore = paragraphs.length > 2;
  const rowStyle = { display: 'flex', gap: 12, alignItems: 'flex-start', padding: '12px 0', textAlign: 'left' };
  const iconCircle = { width: 36, height: 36, borderRadius: '50%', background: T.dark ? 'rgba(255,255,255,0.06)' : '#EFF6F1', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 };
  return <>
    {hasInfo && <div style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 20, padding: '2px 16px', boxShadow: T.shadow, marginBottom: event.description || showLinks ? 22 : 0 }}>
      {(start || times) && <div style={rowStyle}>
        <div style={iconCircle}><Icon name="calendar" size={18} color={T.text} /></div>
        <div style={{ minWidth: 0 }}>
          {start && <p style={{ margin: 0, color: T.text, fontSize: 15, lineHeight: 1.5, fontWeight: 650 }}>{start}{end ? ` al ${end}` : ''}</p>}
          {times && <p style={{ margin: start ? '3px 0 0' : 0, color: T.sub, fontSize: 14, lineHeight: 1.5 }}>{times}</p>}
        </div>
      </div>}
      {(venue || address || coordinates) && <div style={rowStyle}>
        <div style={iconCircle}><Icon name="map-pin" size={18} color={T.text} /></div>
        <div style={{ minWidth: 0 }}>
          {showVenueLine && <p style={{ margin: 0, color: T.text, fontWeight: 650, fontSize: 15, lineHeight: 1.5 }}>{venue}</p>}
          {address && <p style={{ margin: showVenueLine ? '3px 0 0' : 0, color: T.sub, fontSize: 14, lineHeight: 1.5 }}>{address}</p>}
          <a href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', minHeight: 36, marginTop: 2, color: T.text, fontSize: 13, fontWeight: 600, textUnderlineOffset: 3 }}>Cómo llegar ↗</a>
        </div>
      </div>}
      {showPriceRow && <div style={rowStyle}>
        <div style={iconCircle}><Icon name="ticket" size={18} color={T.text} /></div>
        <div><p style={{ margin: 0, color: T.text, fontSize: 15, lineHeight: 1.5, fontWeight: 650 }}>{price.text}</p></div>
      </div>}
    </div>}
    {showLinks && <div style={{ position: 'sticky', bottom: 0, zIndex: 5, margin: '0 -16px', padding: '20px 16px 8px', background: `linear-gradient(180deg, transparent, ${T.bg} 55%)` }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {links.map((link, index) => {
          const ticketSeller = ['tiqets', 'comprar_entradas'].includes(link.platform);
          const label = link.platform === 'whatsapp' ? 'Consultar por WhatsApp' : ticketSeller && price && !price.free ? 'Comprar boletos' : 'Consultar entradas';
          return <a key={link.url} href={link.url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 48, padding: '10px 14px', boxSizing: 'border-box', borderRadius: 12, border: index ? `1px solid ${T.border}` : 0, background: index ? 'transparent' : T.text, color: index ? T.text : T.bg, textDecoration: 'none', fontSize: 14, fontWeight: 700, textAlign: 'center' }}>{label}{links.length > 1 ? ` · ${new URL(link.url).hostname.replace(/^www\./, '')}` : ''}<span aria-hidden="true">↗</span></a>;
        })}
      </div>
    </div>}
    {(lead || paragraphs.length > 0) && <section style={{ textAlign: 'left', margin: '16px 0 24px' }}><h2 style={{ margin: '0 0 8px', color: T.text, fontSize: 17, fontWeight: 800 }}>Acerca del evento</h2>
      {lead && <p style={{ margin: '0 0 10px', color: T.text, fontSize: 16, lineHeight: 1.5, fontWeight: 700 }}>{lead}</p>}
      {shownParagraphs.map((p, i) => (
        <p key={i} style={{ margin: i === 0 ? 0 : '10px 0 0', color: T.text, fontSize: 15, lineHeight: 1.5 }}>{p}</p>
      ))}
      {needsMore && (
        <button onClick={() => setExpanded(v => !v)} style={{ marginTop: 10, padding: 0, background: 'none', border: 'none', color: T.text, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline', textUnderlineOffset: 3 }}>
          {expanded ? 'Leer menos' : 'Leer más'}
        </button>
      )}
    </section>}
  </>;
}

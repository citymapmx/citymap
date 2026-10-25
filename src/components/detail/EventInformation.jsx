import React from 'react';
import Icon from '../ui/Icon.jsx';
import { getEventPrice, getEventLinks } from '../../lib/eventDetails.js';

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

export default function EventInformation({ event, associatedBiz, T }) {
  const price = getEventPrice(event);
  const links = getEventLinks(event);
  const start = dateLabel(event.date, { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' });
  const end = event.end_date > event.date ? dateLabel(event.end_date, { day: 'numeric', month: 'long', year: 'numeric' }) : '';
  const times = [timeLabel(event.time), timeLabel(event.end_time)].filter(Boolean).join(' – ');
  const venue = event.venue_name || associatedBiz?.name;
  const address = event.venue_address || associatedBiz?.address;
  const coordinates = event.lat !== null && event.lat !== undefined && event.lat !== '' && event.lng !== null && event.lng !== undefined && event.lng !== '' && Number.isFinite(Number(event.lat)) && Number.isFinite(Number(event.lng));
  const destination = coordinates ? `${event.lat},${event.lng}` : [venue, address].filter(Boolean).join(', ');
  const rowStyle = { display: 'flex', gap: 12, padding: '14px 0', borderBottom: `1px solid ${T.border}`, textAlign: 'left' };
  const labelStyle = { fontSize: 12, color: T.sub, fontWeight: 600, margin: '0 0 4px' };
  return <>
    <div style={{ marginBottom: event.description || links.length ? 22 : 0 }}>
      {(start || times) && <div style={rowStyle}>
        <Icon name="calendar" size={21} color={T.sub} style={{ flexShrink: 0, marginTop: 2 }} />
        <div style={{ minWidth: 0 }}><p style={labelStyle}>Cuándo</p>
          {start && <p style={{ margin: 0, color: T.text, fontSize: 15, lineHeight: 1.5, fontWeight: 650 }}>{start}{end ? ` al ${end}` : ''}</p>}
          {times && <p style={{ margin: start ? '3px 0 0' : 0, color: T.sub, fontSize: 14, lineHeight: 1.5 }}>{times}</p>}
        </div>
      </div>}
      {(venue || address || coordinates) && <div style={rowStyle}>
        <Icon name="map-pin" size={21} color={T.sub} style={{ flexShrink: 0, marginTop: 2 }} />
        <div style={{ minWidth: 0 }}><p style={labelStyle}>Dónde</p>
          {venue && <p style={{ margin: 0, color: T.text, fontWeight: 650, fontSize: 15, lineHeight: 1.5 }}>{venue}</p>}
          {address && <p style={{ margin: '3px 0 0', color: T.sub, fontSize: 14, lineHeight: 1.5 }}>{address}</p>}
          <a href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', minHeight: 36, marginTop: 2, color: T.text, fontSize: 13, fontWeight: 600, textUnderlineOffset: 3 }}>Cómo llegar ↗</a>
        </div>
      </div>}
      {price && <div style={rowStyle}>
        <Icon name="ticket" size={21} color={T.sub} style={{ flexShrink: 0, marginTop: 2 }} />
        <div><p style={labelStyle}>Entradas</p><p style={{ margin: 0, color: T.text, fontSize: 15, lineHeight: 1.5, fontWeight: 650 }}>{price.text}</p></div>
      </div>}
    </div>
    {links.length > 0 && <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
      {links.map((link, index) => {
        const ticketSeller = ['tiqets', 'comprar_entradas'].includes(link.platform);
        const label = link.platform === 'whatsapp' ? 'Consultar por WhatsApp' : ticketSeller && price && !price.free ? 'Comprar boletos' : 'Consultar entradas';
        return <a key={link.url} href={link.url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 48, padding: '10px 14px', boxSizing: 'border-box', borderRadius: 12, border: index ? `1px solid ${T.border}` : 0, background: index ? 'transparent' : T.text, color: index ? T.text : T.bg, textDecoration: 'none', fontSize: 14, fontWeight: 700, textAlign: 'center' }}>{label}{links.length > 1 ? ` · ${new URL(link.url).hostname.replace(/^www\./, '')}` : ''}<span aria-hidden="true">↗</span></a>;
      })}
    </div>}
    {event.description?.trim() && <section style={{ textAlign: 'left', marginBottom: 24 }}><h2 style={{ margin: '0 0 8px', color: T.text, fontSize: 17, fontWeight: 800 }}>Acerca del evento</h2><p style={{ margin: 0, color: T.sub, fontSize: 15, lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>{event.description}</p></section>}
  </>;
}

import React, { useState } from 'react';
import Icon from '../ui/Icon.jsx';
import { getEventPrice, getEventLinks, splitDescription } from '../../lib/eventDetails.js';
import { getEventCalendarUrl } from '../../lib/eventCalendar.js';
import { isPrivateEvent } from '../../lib/privateEvents.js';
import { useTranslation } from '../../hooks/useTranslation.js';

function dateLabel(value, options, locale = 'es-MX') {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return '';
  const date = new Date(`${value}T12:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) return '';
  return date.toLocaleDateString(locale, { timeZone: 'UTC', ...options });
}
function timeLabel(value, lang = 'es') {
  if (!/^\d{1,2}:\d{2}(?::\d{2})?$/.test(value || '')) return '';
  const [hours, minutes] = value.split(':').map(Number);
  if (hours > 23 || minutes > 59) return '';
  const suffix = lang === 'en' ? (hours >= 12 ? 'PM' : 'AM') : (hours >= 12 ? 'p. m.' : 'a. m.');
  return `${hours % 12 || 12}:${String(minutes).padStart(2, '0')} ${suffix}`;
}

// Información del evento: fecha, lugar y entradas en una sola tarjeta,
// sin etiquetas ("Cuándo", "Dónde") — el icono ya dice qué es cada dato.
// La descripción ("Acerca del evento") va dentro de la tarjeta, como
// primer bloque (PR #231, Jonathan 11 nov 2026), con texto blanco.
// La barra fija de boletos vive en EventTicketBar (exportada aquí abajo):
// el modal la pinta como hija directa del wrapper del detalle, NO dentro
// de esta tarjeta — dentro de aquí su bloque contenedor terminaba a mitad
// del contenido y la barra se iba al bajar en vez de quedarse pegada
// abajo. La tarjeta de fecha lleva «Añadir a mi calendario» (enlace a
// Google Calendar con fecha, hora, título y recinto reales del evento).
// El recinto se muestra en la fila de lugar, junto a la dirección
// (antes lo mostraba la cabecera bajo la foto). Si la dirección ya
// lo trae («Auditorio Telmex, Industrial los Belenes…»), no se
// repite: la fila solo lleva la dirección.
// hidePriceRow: el precio ya se muestra en la fila superior del modal.
// En la barra fija NO va el precio (nov 2026, Jonathan): solo el botón
// de boletos y el compartir; el precio queda en la fila de precio de
// esta tarjeta (y en la fila superior del modal).
// El corazón para guardar NO va aquí: va arriba, sobre la foto, a lado
// del compartir (PR #219; antes estuvo en esta barra, PR #216).
export function EventTicketBar({ event, T, hideTickets = false, onShare = null }) {
  const { t } = useTranslation();
  const price = getEventPrice(event);
  const links = getEventLinks(event);
  const showLinks = !hideTickets && links.length > 0;
  // Etiqueta del botón de entradas según la boletera (misma lógica de
  // antes) y botón reutilizable: el primero va lleno y junto al de
  // compartir; los demás, en borde, apilados debajo.
  const ticketLabel = (link) => {
    const ticketSeller = ['tiqets', 'comprar_entradas'].includes(link.platform);
    return link.platform === 'whatsapp' ? t("eventos_consultar_whatsapp", "Consultar por WhatsApp") : ticketSeller && price && !price.free ? t("eventos_comprar_boletos", "Comprar boletos") : t("eventos_consultar_entradas", "Consultar entradas");
  };
  const ticketButton = (link, primary) => (
    <a key={link.url} href={link.url} target="_blank" rel="noopener noreferrer" style={{ ...(primary ? { flex: 1 } : {}), display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 48, padding: '10px 14px', boxSizing: 'border-box', borderRadius: 12, border: primary ? 0 : `1px solid ${T.border}`, background: primary ? (T.dark ? T.greenD : T.text) : 'transparent', color: primary ? T.bg : T.text, textDecoration: 'none', fontSize: 16, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'center' }}>{ticketLabel(link)}{links.length > 1 ? ` · ${new URL(link.url).hostname.replace(/^www\./, '')}` : ''}<Icon name="arrow_right" size={18} /></a>
  );
  // Hija directa del wrapper del modal (maxWidth 460): su bloque
  // contenedor es todo el contenido del detalle, así el sticky
  // bottom:0 la mantiene pegada abajo durante todo el scroll y al
  // llegar al final queda en su sitio, sin tapar el último botón.
  if (!showLinks) return null;
  return (
    <div style={{ position: 'sticky', bottom: 0, zIndex: 5, padding: '20px 16px calc(8px + env(safe-area-inset-bottom, 0px))', background: `linear-gradient(180deg, transparent, ${T.bg} 55%)` }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {ticketButton(links[0], true)}
          {onShare && <button type="button" aria-label={t("eventos_compartir_evento", "Compartir evento")} onClick={onShare} style={{ flexShrink: 0, width: 48, minHeight: 48, borderRadius: 12, border: `1px solid ${T.border}`, background: 'transparent', color: T.text, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}><Icon name="share" size={20} color={T.text} /></button>}
        </div>
        {links.slice(1).map((link) => ticketButton(link, false))}
      </div>
    </div>
  );
}

// Tarjeta unificada (PR #228, Jonathan 11 nov 2026, capturas del
// detalle de Calamaro): la tarjeta de información lleva degradado
// vertical #34383B → #050505 con texto blanco, fijo en los dos modos.
// `unified` = el reproductor de Apple Music va pegado debajo: la
// tarjeta pierde su sombra y su margen inferior para fundirse con él
// en una sola tarjeta (PR #231: las 4 esquinas redondeadas — la
// información `20px 20px 0 0`, el reproductor `0 0 20px 20px`). Sin
// reproductor, la tarjeta lleva el radio completo (20, como antes)
// y su sombra. La descripción («Acerca del evento») va dentro de la
// tarjeta, como primer bloque, antes de la fecha.
export default function EventInformation({ event, associatedBiz, T, hideTickets = false, hidePriceRow = false, unified = false }) {
  const { t, lang } = useTranslation();
  const locale = lang === 'en' ? 'en-US' : 'es-MX';
  const price = getEventPrice(event);
  const links = getEventLinks(event);
  const showLinks = !hideTickets && links.length > 0;
  const start = dateLabel(event.date, { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' }, locale);
  // El año del fin solo se repite si cambia de año: "vie, 20 de noviembre
  // de 2026 al 21 de noviembre" en vez de repetir "de 2026" y partirse mal.
  const endYear = event.end_date > event.date ? new Date(`${event.end_date}T12:00:00Z`).getUTCFullYear() : null;
  const startYear = event.date ? new Date(`${event.date}T12:00:00Z`).getUTCFullYear() : null;
  const end = event.end_date > event.date ? dateLabel(event.end_date, { day: 'numeric', month: 'long', ...(endYear !== startYear ? { year: 'numeric' } : {}) }, locale) : '';
  const times = [timeLabel(event.time, lang), timeLabel(event.end_time, lang)].filter(Boolean).join(' – ');
  const venue = event.venue_name || associatedBiz?.name;
  const address = event.venue_address || associatedBiz?.address;
  const coordinates = event.lat !== null && event.lat !== undefined && event.lat !== '' && event.lng !== null && event.lng !== undefined && event.lng !== '' && Number.isFinite(Number(event.lat)) && Number.isFinite(Number(event.lng));
  const destination = coordinates ? `${event.lat},${event.lng}` : [venue, address].filter(Boolean).join(', ');
  // El recinto va en la fila de lugar, junto a la dirección. Si la
  // dirección ya lo incluye («Auditorio Telmex, Industrial los
  // Belenes…»), no se repite: se compara por palabras completas en
  // orden, no por subcadena, para no esconderlo por una coincidencia
  // parcial («La» dentro de «Guadalajara»).
  const words = (s) => (s || '').toLowerCase().replace(/[^a-z0-9áéíóúñü]+/g, ' ').split(' ').filter(Boolean);
  const venueWords = words(venue);
  const addressWords = words(address);
  const venueInAddress = venueWords.length > 0 && addressWords.some((_, i) => venueWords.every((w, j) => addressWords[i + j] === w));
  const showVenueLine = Boolean(venue && !venueInAddress);
  const showPriceRow = Boolean(price && !hideTickets && !(isPrivateEvent(event) && price.free) && !hidePriceRow);
  // «Añadir a mi calendario»: enlace a Google Calendar con fecha, hora,
  // título y recinto reales del evento; null si la fecha no es válida.
  const calendarUrl = getEventCalendarUrl(event);
  const { lead, paragraphs } = splitDescription(event.description);
  const hasDescription = Boolean(lead || paragraphs.length > 0);
  const hasInfo = Boolean((start || times) || (venue || address || coordinates) || showPriceRow);
  const [expanded, setExpanded] = useState(false);
  const shownParagraphs = expanded ? paragraphs : paragraphs.slice(0, 2);
  const needsMore = paragraphs.length > 2;
  const rowStyle = { display: 'flex', gap: 12, alignItems: 'flex-start', padding: '12px 0', textAlign: 'left' };
  const iconStyle = { flexShrink: 0, marginTop: 2 };
  return <>
    {(hasInfo || hasDescription) && <div style={{ background: 'linear-gradient(180deg, #34383B 0%, #050505 100%)', borderRadius: unified ? '20px 20px 0 0' : 20, padding: '2px 16px', boxShadow: unified ? 'none' : T.shadow, marginBottom: unified ? 0 : (event.description || showLinks ? 22 : 0) }}>
      {hasDescription && <section style={{ textAlign: 'left', padding: '14px 0 12px' }}><h2 style={{ margin: '0 0 8px', color: '#FFFFFF', fontSize: 17, fontWeight: 800 }}>{t("eventos_acerca", "Acerca del evento")}</h2>
        {lead && <p style={{ margin: '0 0 10px', color: '#FFFFFF', fontSize: 16, lineHeight: 1.5, fontWeight: 700 }}>{lead}</p>}
        {shownParagraphs.map((p, i) => (
          <p key={i} style={{ margin: i === 0 ? 0 : '10px 0 0', color: 'rgba(255,255,255,0.75)', fontSize: 15, lineHeight: 1.5 }}>{p}</p>
        ))}
        {needsMore && (
          <button onClick={() => setExpanded(v => !v)} style={{ marginTop: 10, padding: 0, background: 'none', border: 'none', color: '#FFFFFF', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline', textUnderlineOffset: 3 }}>
            {expanded ? t("eventos_leer_menos", "Leer menos") : t("eventos_leer_mas", "Leer más")}
          </button>
        )}
      </section>}
      {(start || times) && <div style={rowStyle}>
        <Icon name="calendar" size={26} color="#FFFFFF" style={iconStyle} />
        <div style={{ minWidth: 0 }}>
          {start && <p style={{ margin: 0, color: '#FFFFFF', fontSize: 15, lineHeight: 1.5, fontWeight: 650, textWrap: 'balance' }}>{start}{end ? (lang === 'en' ? ` to ${end}` : ` al ${end}`) : ''}</p>}
          {times && <p style={{ margin: start ? '3px 0 0' : 0, color: 'rgba(255,255,255,0.75)', fontSize: 14, lineHeight: 1.5 }}>{times}</p>}
          {calendarUrl && <a href={calendarUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, minHeight: 36, marginTop: 2, color: '#FFFFFF', fontSize: 13, fontWeight: 700, textDecoration: 'underline', textUnderlineOffset: 3 }}><Icon name="calendar" size={14} color="#FFFFFF" />{t("eventos_anadir_calendario", "Añadir a mi calendario")}</a>}
        </div>
      </div>}
      {(venue || address || coordinates) && <div style={rowStyle}>
        <Icon name="map-pin" size={26} color="#FFFFFF" style={iconStyle} />
        <div style={{ minWidth: 0 }}>
          {showVenueLine && <p style={{ margin: 0, color: '#FFFFFF', fontWeight: 650, fontSize: 15, lineHeight: 1.5 }}>{venue}</p>}
          {address && <p style={{ margin: showVenueLine ? '3px 0 0' : 0, color: 'rgba(255,255,255,0.75)', fontSize: 14, lineHeight: 1.5 }}>{address}</p>}
          <a href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', minHeight: 36, marginTop: 2, color: '#FFFFFF', fontSize: 13, fontWeight: 600, textUnderlineOffset: 3 }}>{t("como_llegar", "Cómo llegar")} ↗</a>
        </div>
      </div>}
      {showPriceRow && <div style={rowStyle}>
        <Icon name="ticket" size={26} color="#FFFFFF" style={iconStyle} />
        <div><p style={{ margin: 0, color: '#FFFFFF', fontSize: 15, lineHeight: 1.5, fontWeight: 650 }}>{price.text}</p></div>
      </div>}
    </div>}
  </>;
}


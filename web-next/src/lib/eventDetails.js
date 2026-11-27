// Código ISO de la moneda del evento (columna `currency` de events):
// por defecto MXN cuando falta (filas viejas o fetches sin la columna).
// Solo se acepta un código de 3 letras; cualquier otro valor se ignora
// para no pintar basura en el precio. Espejo de src/lib/eventDetails.js
// (el test de paridad de event_details.test.jsx exige que ambos devuelvan
// el mismo texto).
export function eventCurrencyCode(event) {
  const code = String(event?.currency || '').trim().toUpperCase();
  return /^[A-Z]{3}$/.test(code) ? code : 'MXN';
}

export function getEventPrice(event) {
  if (['gratis', 'free'].includes(event.price_type)) return { text: 'Entrada gratuita', free: true };
  if (event.price === null || event.price === undefined || typeof event.price === 'boolean') return null;
  const raw = String(event.price).trim();
  if (!raw || !/\d/.test(raw)) return null;
  const value = raw.replace(/^desde\s*/i, '').trim();
  if (!value || !/\d/.test(value) || /^-\d/.test(value)) return null;
  if (/^(?:[$€£]\s*)?0+(?:[.,]0+)?(?:\s*[A-Z]{3})?$/i.test(value)) return { text: 'Entrada gratuita', free: true };
  const range = value.match(/^([$€£]?\s*\d[\d.,]*(?:\s*[A-Z]{3})?)\s*(?:[-–—]|\ba\b)\s*[$€£]?\s*\d/i);
  const amount = range ? range[1].trim() : value;
  const formatted = /^\d[\d.,]*$/.test(amount) ? `$${amount}` : amount;
  // La moneda va tras el monto (misma convención que los tours, PR #408):
  // «Boletos desde: $65.00 EUR». Sin duplicar cuando el precio guardado
  // ya trae el código («$65 EUR») o un símbolo propio (€, £).
  const hasCurrency = /(?:^|\s)[A-Z]{3}$/.test(formatted) || /[€£]/.test(formatted);
  const withCurrency = hasCurrency ? formatted : `${formatted} ${eventCurrencyCode(event)}`;
  const from = Boolean(range) || /^desde\b/i.test(raw) || ['desde', 'from', 'range'].includes(event.price_type);
  return { text: `${from ? 'Desde' : 'Entrada:'} ${withCurrency}`, free: false };
}

// Hora "HH:MM" (24 h, la de la base) en 12 h («9:00 p. m.» / «9:00 PM»).
// '' cuando no hay hora válida: el que llama muestra «Hora por
// confirmar» (R2, UX 26 nov 2026) en vez de inventar una hora.
export function formatEventTime12h(value, lang = 'es') {
  if (!/^\d{1,2}:\d{2}(?::\d{2})?$/.test(value || '')) return '';
  const [hours, minutes] = value.split(':').map(Number);
  if (hours > 23 || minutes > 59) return '';
  const suffix = lang === 'en' ? (hours >= 12 ? 'PM' : 'AM') : (hours >= 12 ? 'p. m.' : 'a. m.');
  return `${hours % 12 || 12}:${String(minutes).padStart(2, '0')} ${suffix}`;
}

export function normalizeEventLink(value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  const raw = value.trim();
  if (/^[a-z][a-z\d+.-]*:/i.test(raw) && !/^https?:\/\//i.test(raw)) return null;
  try {
    const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    return ['http:', 'https:'].includes(url.protocol) && url.hostname.includes('.') && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}

export function getEventLinks(event) {
  const booking = event.booking_config;
  const configured = booking?.enabled && booking.type === 'external' && Array.isArray(booking.externalLinks) ? booking.externalLinks : [];
  const links = configured.map(link => ({ ...link, url: normalizeEventLink(link.url) })).filter(link => link.url);
  if (!links.length) {
    const url = normalizeEventLink(event.website);
    if (url) links.push({ platform: 'otro', url });
  }
  return links.filter((link, index) => links.findIndex(other => other.url === link.url) === index);
}

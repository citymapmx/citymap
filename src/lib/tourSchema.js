// JSON-LD para tours (TouristTrip + oferta con precio).
// Lo usan dos sitios que deben decir lo mismo:
//  - src/components/ExperienceViewer.jsx (Helmet, lo que ve Google al renderizar)
//  - api/og.js (HTML que reciben los bots sin JavaScript)
// TouristTrip no tiene propiedad estándar de duración en schema.org; se
// incluye `duration` en ISO 8601 como dato informativo (los validadores la
// ignoran si no la reconocen, no es un error).

// "8 horas 30 minutos" -> "PT8H30M"; "5–6 horas" -> "PT5H" (primer valor);
// "1 hora 30 minutos - 2 horas" -> "PT1H30M". Sin horas/minutos -> null.
export function parseDurationToISO(duration) {
  if (!duration || typeof duration !== 'string') return null;
  // Rango ("5–6 horas", "1 hora 30 minutos - 2 horas"): se toma el primer valor.
  const m = duration.match(/(\d+)\s*(?:[–-]\s*\d+\s*)?hora[s]?(?:\s*(\d+)\s*minuto[s]?)?/i);
  if (!m) return null;
  const hours = parseInt(m[1], 10);
  const minutes = m[2] ? parseInt(m[2], 10) : 0;
  if (hours === 0 && minutes === 0) return null;
  return `PT${hours}H${minutes ? `${minutes}M` : ''}`;
}

export function bookingUrlOf(exp, canonicalUrl) {
  const links = exp?.booking_config?.externalLinks;
  if (Array.isArray(links) && links[0]?.url) return links[0].url;
  return canonicalUrl;
}

// Nodos JSON-LD extra para un Tour. Para otros tipos devuelve [].
export function tourSchemaNodes(exp, canonicalUrl, coverImage) {
  if (!exp || exp.activity_type !== 'Tour') return [];
  const desc = exp.description ? exp.description.substring(0, 160) : '';
  const image = coverImage || (Array.isArray(exp.gallery) ? exp.gallery[0] : null);
  const nodes = [];
  const trip = {
    '@context': 'https://schema.org',
    '@type': 'TouristTrip',
    name: exp.title,
    description: desc,
    url: canonicalUrl,
    ...(image ? { image: [image] } : {}),
  };
  const isoDuration = parseDurationToISO(exp.duration);
  if (isoDuration) trip.duration = isoDuration;
  nodes.push(trip);
  const price = Number(exp.price);
  if (Number.isFinite(price) && price > 0) {
    nodes.push({
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: exp.title,
      description: desc,
      ...(image ? { image: [image] } : {}),
      offers: {
        '@type': 'Offer',
        price,
        priceCurrency: 'MXN',
        availability: 'https://schema.org/InStock',
        url: bookingUrlOf(exp, canonicalUrl),
      },
    });
  }
  return nodes;
}

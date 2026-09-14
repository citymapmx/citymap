import { notFound } from 'next/navigation';
import EventsClient from '../../../components/events/EventsClient';

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SB_HEADERS = {
  apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
  "Content-Type": "application/json"
};

async function getCityEvents(citySlug) {
  const [cityRes, eventsRes] = await Promise.all([
    fetch(`${SB_URL}/rest/v1/cities?slug=eq.${citySlug}&select=*&limit=1`, { headers: SB_HEADERS }),
    fetch(`${SB_URL}/rest/v1/events?city_slug=eq.${citySlug}&status=eq.approved&select=*&order=date.asc&limit=150`, { headers: SB_HEADERS }),
  ]);
  
  const cities = await cityRes.json();
  let events = await eventsRes.json();
  
  if (!Array.isArray(events)) events = [];

  // Filter and decorate events
  const tz = 'America/Mexico_City'; // Fallback
  const now = new Date();
  
  const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' });
  const todayStr = formatter.format(now);
  const tomorrow = new Date(now.getTime() + 86400000);
  const tomorrowStr = formatter.format(tomorrow);

  const upcomingEvents = events.filter(ev => {
    if (ev.date) {
      const endDateStr = ev.end_date || ev.date;
      const evDT = ev.time ? new Date(`${endDateStr}T${ev.time}:00`) : new Date(`${endDateStr}T23:59:00`);
      if ((now - evDT) > 86400000) return false;
    }
    return true;
  }).map(ev => {
    const isToday = ev.date === todayStr || (ev.end_date && ev.date <= todayStr && ev.end_date >= todayStr);
    const isTomorrow = ev.date === tomorrowStr || (ev.end_date && ev.date <= tomorrowStr && ev.end_date >= tomorrowStr);
    return { ...ev, _isToday: isToday, _isTomorrow: isTomorrow };
  });
  
  return { 
    city: cities?.[0] || null, 
    events: upcomingEvents
  };
}

export async function generateMetadata({ params }) {
  const resolvedParams = await params;
  const { city: citySlug } = resolvedParams;
  const { city, events } = await getCityEvents(citySlug);
  if (!city) return { title: 'CityMap' };
  
  const cityName = city.name;
  return {
    title: `Eventos en ${cityName} hoy - Agenda CityMap`,
    description: `Descubre los mejores eventos, conciertos, fiestas y más cosas que hacer en ${cityName}.`,
    openGraph: {
      title: `Agenda de Eventos en ${cityName} - CityMap`,
      description: `Hay ${events.length} eventos próximos en ${cityName}. Descubre qué hacer hoy.`,
      images: city.bg_image ? [city.bg_image] : [],
    },
    alternates: { 
      canonical: `https://citymap.mx/${citySlug}/eventos`,
      languages: {
        "es-MX": `https://citymap.mx/${citySlug}/eventos`
      }
    },
  };
}

export default async function EventsPage({ params }) {
  const resolvedParams = await params;
  const { city: citySlug } = resolvedParams;
  const { city, events } = await getCityEvents(citySlug);

  if (!city) {
    return <div className="p-10 text-center font-bold">Ciudad no encontrada</div>;
  }

  const cityName = city.name;
  
  const breadcrumb = {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'CityMap', item: 'https://citymap.mx' },
      { '@type': 'ListItem', position: 2, name: cityName, item: `https://citymap.mx/${citySlug}` },
      { '@type': 'ListItem', position: 3, name: 'Eventos', item: `https://citymap.mx/${citySlug}/eventos` },
    ],
  };

  const schema = {
    '@context': 'https://schema.org', '@type': 'ItemList',
    name: `Eventos en ${cityName}`, description: `Eventos próximos en ${cityName}`,
    url: `https://citymap.mx/${citySlug}/eventos`,
    numberOfItems: events.length,
    itemListElement: events.slice(0, 20).map((ev, i) => ({
      '@type': 'ListItem', position: i + 1,
      item: {
        '@type': 'Event', name: ev.title,
        url: `https://citymap.mx/${citySlug}/eventos`,
        startDate: ev.date ? `${ev.date}${ev.time ? 'T'+ev.time : ''}` : undefined,
        endDate: ev.end_date ? `${ev.end_date}${ev.end_time ? 'T'+ev.end_time : ''}` : undefined,
        location: {
          '@type': 'Place', name: ev.venue_name || ev.location_text || cityName,
          address: { '@type': 'PostalAddress', addressLocality: cityName, addressCountry: 'MX' }
        },
        image: ev.img_url || ev.img || undefined,
        description: ev.description || undefined,
      },
    })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <EventsClient city={city} citySlug={citySlug} events={events} />
    </>
  );
}

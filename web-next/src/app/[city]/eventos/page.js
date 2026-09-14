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
  const { city: citySlug } = await params;
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
    },
  };
}

export default async function EventsPage({ params }) {
  const { city: citySlug } = await params;
  const { city, events } = await getCityEvents(citySlug);

  if (!city) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: 24, fontWeight: 800 }}>Ciudad no encontrada</h1>
          <a href="https://citymap.mx" style={{ color: '#1A7A5E', marginTop: 12, display: 'block' }}>← Ir a CityMap</a>
        </div>
      </div>
    );
  }

  return (
    <EventsClient city={city} citySlug={citySlug} events={events} />
  );
}

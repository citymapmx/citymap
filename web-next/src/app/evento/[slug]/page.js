export const revalidate = 3600; // ISR: regenerate every hour

import Image from 'next/image';
import BackButton from '../../../components/BackButton';

const SB_URL = (process.env.VITE_SUPABASE_URL || "https://dpkjxhjkzdlkvyotoeai.supabase.co");
const SB_KEY = (process.env.VITE_SUPABASE_ANON_KEY || "");
const H = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` };

async function getEvent(slug) {
  const query = `?or=(slug.eq.${slug},id.eq.${slug})&select=*,businesses(name,city_slug)&limit=1`;
  const res = await fetch(`${SB_URL}/rest/v1/events${query}`, { headers: H });
  const data = await res.json();
  return data?.[0] || null;
}

function todayInMexicoCity() {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Mexico_City', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const part = type => parts.find(p => p.type === type).value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}

const lastDayOf = ev => {
  const ok = v => /^\d{4}-\d{2}-\d{2}$/.test(v || '') ? v : null;
  const start = ok(ev.date), end = ok(ev.end_date);
  return end && (!start || end >= start) ? end : start;
};

const shortDate = value => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return '';
  const [year, month, day] = value.split('-').map(Number);
  return new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short' }).format(new Date(year, month - 1, day));
};

async function getUpcomingEvents(ev, today) {
  try {
    const res = await fetch(`${SB_URL}/rest/v1/events?select=id,slug,title,date,end_date,venue_name,city_slug&status=eq.approved&order=date.asc&limit=20`, { headers: H });
    const rows = await res.json();
    if (!Array.isArray(rows)) return [];
    const city = String(ev.city_slug || '').split(',')[0].trim().toLowerCase();
    const sameCity = c => {
      const list = String(c.city_slug || '').split(',').map(s => s.trim().toLowerCase());
      return !city || city === 'all' || list.includes('all') || list.includes(city);
    };
    return rows
      .filter(c => c.id !== ev.id && sameCity(c) && (lastDayOf(c) || '') >= today)
      .slice(0, 4);
  } catch { return []; }
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const ev = await getEvent(slug);
  
  if (!ev) return { title: 'Evento no encontrado | CityMap' };

  const cityLabel = ev.city_slug !== 'all' ? (ev.city_slug || '').charAt(0).toUpperCase() + (ev.city_slug || '').slice(1) : 'Múltiples Ciudades';
  const title = `${ev.title} en ${cityLabel} | Eventos CityMap`;
  const desc = ev.description
    ? ev.description.slice(0, 155) + (ev.description.length > 155 ? "…" : "")
    : `Encuentra información, horarios y ubicación para el evento ${ev.title} en ${cityLabel}.`;
  
  const img = ev.image_url || "https://citymap.mx/og-image.png";

  return {
    title,
    description: desc,
    alternates: { 
      canonical: `https://citymap.mx/evento/${slug}`,
      languages: {
        "es-MX": `https://citymap.mx/evento/${slug}`,
        "es": `https://citymap.world/evento/${slug}`,
        "x-default": `https://citymap.world/evento/${slug}`,
      }
    },
    openGraph: {
      title,
      description: desc,
      url: `https://citymap.mx/evento/${slug}`,
      siteName: 'CityMap',
      images: [{ url: img, width: 1200, height: 630 }],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: desc,
      images: [img],
    }
  };
}

export default async function EventPage({ params }) {
  const { slug } = await params;
  const ev = await getEvent(slug);

  if (!ev) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: 24, fontWeight: 800 }}>Evento no encontrado</h1>
          <a href="https://citymap.mx" style={{ color: '#1A7A5E', marginTop: 12, display: 'block', textDecoration: 'none' }}>← Ir a CityMap</a>
        </div>
      </div>
    );
  }

  const cityLabel = ev.city_slug !== 'all' ? (ev.city_slug || '').charAt(0).toUpperCase() + (ev.city_slug || '').slice(1) : 'Múltiples Ciudades';
  const today = todayInMexicoCity();
  const lastDay = lastDayOf(ev);
  const isPast = Boolean(lastDay) && lastDay < today;
  const upcoming = isPast ? await getUpcomingEvents(ev, today) : [];
  
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: ev.title,
    description: ev.description,
    startDate: ev.date || ev.created_at,
    endDate: ev.date || ev.created_at,
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    image: ev.image_url ? [ev.image_url] : [],
    location: {
      '@type': 'Place',
      name: ev.location || ev.businesses?.name || cityLabel,
      address: {
        '@type': 'PostalAddress',
        addressLocality: cityLabel,
        addressCountry: 'MX'
      }
    }
  };

  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', background: '#fafafa', minHeight: '100vh' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <BackButton citySlug={ev.city_slug !== 'all' ? ev.city_slug : ''} />
      
      <div style={{ position: 'relative', width: '100%', height: 320, background: '#111' }}>
        {ev.image_url && (
          <Image src={ev.image_url} alt={ev.title} fill style={{ objectFit: 'cover', opacity: 0.8 }} priority sizes="100vw" unoptimized={ev.image_url.startsWith('data:')}/>
        )}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.9) 100%)' }} />
        
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '24px 20px', color: '#fff', maxWidth: 680, margin: '0 auto' }}>
          {ev.category && (
            <span style={{ display: 'inline-block', background: 'rgba(255,255,255,0.2)', padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 700, marginBottom: 12, backdropFilter: 'blur(4px)' }}>
              {ev.category}
            </span>
          )}
          <h1 style={{ fontSize: 32, fontWeight: 900, margin: '0 0 8px', lineHeight: 1.2, letterSpacing: '-0.5px' }}>{ev.title}</h1>
          <div style={{ display: 'flex', gap: 16, fontSize: 14, opacity: 0.9 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>📍 {ev.location || cityLabel}</span>
            {ev.date && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>📅 {new Date(ev.date).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}</span>}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '32px 20px 80px' }}>
        <div style={{ background: '#fff', borderRadius: 20, padding: 24, boxShadow: '0 4px 20px rgba(0,0,0,0.03)', border: '1px solid #f1f5f9' }}>
          
          {isPast && (
            <div style={{ background: '#FEF3C7', border: '1px solid #FDE68A', borderRadius: 14, padding: 16, marginBottom: 24 }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#111' }}>Este evento ya terminó</div>
              <p style={{ fontSize: 14, lineHeight: 1.5, color: '#4b5563', margin: '4px 0 12px' }}>Pero hay más cosas pasando en {cityLabel}. Explora los próximos eventos.</p>
              <a href={`https://citymap.mx/eventos/${ev.city_slug && ev.city_slug !== 'all' ? ev.city_slug.split(',')[0].trim() : ''}`}
                 style={{ display: 'inline-block', background: '#1A7A5E', color: '#fff', borderRadius: 9999, padding: '10px 18px', fontSize: 15, fontWeight: 800, textDecoration: 'none' }}>
                Explora nuevos eventos
              </a>
            </div>
          )}

          <h2 style={{ fontSize: 18, fontWeight: 800, margin: '0 0 16px' }}>Acerca del evento</h2>
          {ev.description ? (
            <p style={{ fontSize: 15, lineHeight: 1.6, color: '#4b5563', margin: 0, whiteSpace: 'pre-wrap' }}>
              {ev.description}
            </p>
          ) : (
            <p style={{ fontSize: 15, color: '#9ca3af', fontStyle: 'italic', margin: 0 }}>Sin descripción disponible.</p>
          )}

          {isPast && upcoming.length > 0 && (
            <div style={{ marginTop: 32 }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, margin: '0 0 8px' }}>Próximos eventos en {cityLabel}</h2>
              {upcoming.map(u => (
                <a key={u.id} href={`https://citymap.mx/evento/${u.slug || u.id}`} style={{ display: 'block', padding: '12px 0', borderTop: '1px solid #f1f5f9', textDecoration: 'none' }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: '#111' }}>{u.title}</div>
                  <div style={{ fontSize: 13, color: '#6b7280' }}>
                    {shortDate(u.date)}{u.end_date && u.end_date > u.date ? ` – ${shortDate(u.end_date)}` : ''}{u.venue_name ? ` · ${u.venue_name}` : ''}
                  </div>
                </a>
              ))}
            </div>
          )}

          <div style={{ marginTop: 32, paddingTop: 32, borderTop: '1px solid #f1f5f9' }}>
            <a href={`https://citymap.mx/evento/${slug}`} 
               style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', padding: '16px', background: '#1A7A5E', color: '#fff', borderRadius: 14, fontSize: 16, fontWeight: 800, textDecoration: 'none' }}>
              Ver detalles en la app →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

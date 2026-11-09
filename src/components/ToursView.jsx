// Página /tours: todos los tours de la Revista agrupados por ciudad, con
// píldoras para filtrar. La tarjeta lleva a su artículo en la Revista, donde
// está el botón de reserva con el enlace de afiliado.
import { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { sb } from '../lib/supabase.js';
import { groupToursByCity, tourCardUrl, formatTourPrice } from '../lib/tours.js';
import OptimizedImage from './ui/OptimizedImage.jsx';
import Footer from './Footer.jsx';

function tourImage(tour) {
  const gallery = tour?.gallery;
  if (Array.isArray(gallery) && gallery[0]) return gallery[0]?.url || gallery[0];
  if (typeof gallery === 'string') {
    try {
      const parsed = JSON.parse(gallery);
      if (Array.isArray(parsed) && parsed[0]) return parsed[0]?.url || parsed[0];
    } catch { return null; }
  }
  return null;
}

function TourCard({ tour, cityName, T, dark, navigate }) {
  const img = tourImage(tour);
  const price = formatTourPrice(tour?.price);
  return (
    <article
      onClick={() => navigate(tourCardUrl(tour))}
      style={{ flex: '0 0 260px', borderRadius: 16, overflow: 'hidden', border: `1px solid ${T.border}`, background: dark ? '#1e1e1e' : '#fff', cursor: 'pointer', boxShadow: '0 1px 6px rgba(0,0,0,0.07)' }}
    >
      <div style={{ position: 'relative', height: 150, background: 'linear-gradient(135deg,#111,#333)' }}>
        {typeof img === 'string' && img
          ? <OptimizedImage src={img} alt={tour.title || ''} widthRequest={520} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36 }}>🗺️</div>}
        <span style={{ position: 'absolute', top: 10, left: 10, background: '#fff', color: '#111', fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 999 }}>🗺️ Tour</span>
      </div>
      <div style={{ padding: '12px 14px 16px' }}>
        <h3 style={{ fontSize: 15, fontWeight: 800, color: T.text, lineHeight: 1.3, margin: '0 0 6px' }}>{tour.title}</h3>
        <p style={{ fontSize: 13, color: T.sub, margin: '0 0 8px' }}>
          {cityName}{tour.duration ? ` · ⏱ ${tour.duration}` : ''}
        </p>
        <p style={{ fontSize: 14, fontWeight: 800, color: T.text, margin: '0 0 8px' }}>{price || 'Precio no publicado'}</p>
        <span style={{ fontSize: 13, fontWeight: 700, color: T.text, textDecoration: 'underline', textUnderlineOffset: 3 }}>Reservar →</span>
      </div>
    </article>
  );
}

export default function ToursView({ T, dark, navigate, cities, initialTours }) {
  const [tours, setTours] = useState(initialTours || []);
  const [loading, setLoading] = useState(!initialTours);
  const [selectedCity, setSelectedCity] = useState('todas');

  useEffect(() => {
    if (initialTours) return;
    let cancelled = false;
    sb.get('experiences', '?select=id,title,city_slug,price,duration,gallery,created_at&activity_type=eq.Tour&status=eq.approved&active=eq.true&order=created_at.desc&limit=100')
      .then((res) => { if (!cancelled) setTours(Array.isArray(res) ? res : []); })
      .catch(() => { if (!cancelled) setTours([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [initialTours]);

  const groups = useMemo(() => groupToursByCity(tours, cities || []), [tours, cities]);
  const visibleGroups = selectedCity === 'todas' ? groups : groups.filter((g) => g.slug === selectedCity);
  const minPrice = useMemo(() => {
    const prices = tours.map((t) => Number(t.price)).filter((p) => Number.isFinite(p) && p > 0);
    return prices.length > 0 ? Math.min(...prices) : null;
  }, [tours]);

  return (
    <div style={{ minHeight: '100vh', background: T.bg, color: T.text }}>
      <Helmet>
        <title>Tours en Guadalajara, Tepic, Puerto Vallarta y más | CityMap</title>
        <meta name="description" content="Tours guiados y excursiones en Guadalajara, Tepic, Puerto Vallarta, Ciudad de México y más, con precio desde y reserva en línea. Encuentra tu próximo tour en CityMap." />
        <link rel="canonical" href="https://citymap.mx/tours" />
      </Helmet>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '20px 16px 40px' }}>
        <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', color: T.sub, fontSize: 14, fontWeight: 700, cursor: 'pointer', padding: '4px 0 16px' }}>← Inicio</button>
        <h1 style={{ fontSize: 28, fontWeight: 800, margin: '0 0 6px' }}>🗺️ Tours</h1>
        <p style={{ fontSize: 15, color: T.sub, margin: '0 0 20px' }}>
          {loading ? 'Cargando tours…' : `${tours.length} tours en ${groups.length} ciudades${minPrice ? ` · desde $${minPrice.toLocaleString('es-MX')} MXN` : ''}`}
        </p>

        {!loading && groups.length > 0 && (
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 12, marginBottom: 8, scrollbarWidth: 'none' }}>
            <button
              key="todas"
              onClick={() => setSelectedCity('todas')}
              style={{ flex: '0 0 auto', padding: '8px 14px', borderRadius: 999, border: `1px solid ${T.border}`, background: selectedCity === 'todas' ? T.text : 'transparent', color: selectedCity === 'todas' ? T.bg : T.text, fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
            >
              Todas ({tours.length})
            </button>
            {groups.map((g) => (
              <button
                key={g.slug}
                onClick={() => setSelectedCity(g.slug)}
                style={{ flex: '0 0 auto', padding: '8px 14px', borderRadius: 999, border: `1px solid ${T.border}`, background: selectedCity === g.slug ? T.text : 'transparent', color: selectedCity === g.slug ? T.bg : T.text, fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
              >
                {g.name} ({g.count})
              </button>
            ))}
          </div>
        )}

        {!loading && tours.length === 0 && (
          <p style={{ fontSize: 15, color: T.sub }}>Aún no hay tours publicados. Vuelve pronto.</p>
        )}

        {visibleGroups.map((g) => (
          <section key={g.slug} style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 14px' }}>{g.name} · {g.count} {g.count === 1 ? 'tour' : 'tours'}</h2>
            <div style={{ display: 'flex', gap: 14, overflowX: 'auto', paddingBottom: 6, scrollbarWidth: 'none' }}>
              {g.tours.map((tour) => (
                <TourCard key={tour.id || tour.slug} tour={tour} cityName={g.name} T={T} dark={dark} navigate={navigate} />
              ))}
            </div>
          </section>
        ))}
      </div>
      <Footer />
    </div>
  );
}

export const dynamic = 'force-dynamic';

import Image from 'next/image';

const SB_URL = process.env.VITE_SUPABASE_URL;
const SB_KEY = process.env.VITE_SUPABASE_ANON_KEY;

const SB_HEADERS = {
  apikey: SB_KEY,
  Authorization: `Bearer ${SB_KEY}`,
};

const CAT_LABEL = {
  restaurantes: 'Restaurantes', cafeterias: 'Cafeterías', bares: 'Bares', hoteles: 'Hoteles',
  salud: 'Salud', belleza: 'Belleza', deportes: 'Deportes', entretenimiento: 'Entretenimiento',
  Servicios: 'Servicios', tiendas: 'Tiendas', educacion: 'Educación',
};

async function getCityData(citySlug) {
  const [cityRes, bizRes] = await Promise.all([
    fetch(`${SB_URL}/rest/v1/cities?slug=eq.${citySlug}&select=*&limit=1`, { headers: SB_HEADERS }),
    fetch(`${SB_URL}/rest/v1/businesses?city_slug=eq.${citySlug}&select=id,name,slug,category,rating,review_count,logo_url,banner_url,plan&order=plan.desc,rating.desc&limit=100`, { headers: SB_HEADERS }),
  ]);
  const cities = await cityRes.json();
  const businesses = await bizRes.json();
  return { city: cities?.[0] || null, businesses: Array.isArray(businesses) ? businesses : [] };
}

export async function generateMetadata({ params }) {
  const { city: citySlug } = await params;
  const { city, businesses } = await getCityData(citySlug);
  if (!city) return { title: 'CityMap' };
  const cityName = city.name;
  const bizCount = businesses.length;
  return {
    title: `Negocios en ${cityName} - CityMap`,
    description: `Descubre los ${bizCount}+ mejores restaurantes, cafeterías, bares y negocios en ${cityName}. Directorio local con reseñas, horarios y ubicaciones.`,
    openGraph: {
      title: `Negocios en ${cityName} - CityMap`,
      description: `${bizCount}+ negocios locales en ${cityName} con reseñas y horarios.`,
      images: city.bg_image ? [city.bg_image] : [],
    },
    alternates: { canonical: `https://citymap.mx/${citySlug}` },
  };
}

export default async function CityPage({ params }) {
  const { city: citySlug } = await params;
  const { city, businesses } = await getCityData(citySlug);

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

  const byCategory = businesses.reduce((acc, b) => {
    const cat = b.category || 'otros';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(b);
    return acc;
  }, {});

  const topBiz = businesses.slice(0, 12);
  const categories = Object.entries(byCategory).sort((a, b) => b[1].length - a[1].length);

  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', background: '#fafafa', minHeight: '100vh' }}>
      {/* Hero */}
      <div style={{ position: 'relative', width: '100%', height: 200, background: '#1A7A5E', overflow: 'hidden' }}>
        {city.bg_image && (
          <Image src={city.bg_image} alt={city.name} fill style={{ objectFit: 'cover', opacity: 0.5 }} priority />
        )}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.3), rgba(0,0,0,0.7))' }} />
        <div style={{ position: 'relative', zIndex: 1, padding: '40px 24px 24px', color: '#fff' }}>
          <a href="https://citymap.mx" style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, textDecoration: 'none', marginBottom: 12, display: 'inline-block' }}>← CityMap</a>
          <h1 style={{ fontSize: 32, fontWeight: 900, margin: 0, letterSpacing: '-0.5px' }}>{city.name}</h1>
          <p style={{ margin: '4px 0 0', fontSize: 14, opacity: 0.85 }}>
            {city.state}{city.country && ` · ${city.country}`} · {businesses.length} negocios
          </p>
        </div>
      </div>

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '24px 20px 60px' }}>
        {/* Categories */}
        {categories.length > 0 && (
          <div style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, margin: '0 0 14px', color: '#111' }}>Categorías</h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {categories.map(([cat, items]) => (
                <a key={cat} href={`https://citymap.mx/${citySlug}?cat=${cat}`}
                  style={{ padding: '8px 14px', borderRadius: 999, background: '#fff', border: '1px solid #e5e7eb', fontSize: 13, fontWeight: 700, color: '#111', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  {CAT_LABEL[cat] || cat}
                  <span style={{ background: '#f3f4f6', borderRadius: 999, padding: '1px 7px', fontSize: 11, color: '#6b7280' }}>{items.length}</span>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Top businesses */}
        <h2 style={{ fontSize: 18, fontWeight: 800, margin: '0 0 14px', color: '#111' }}>Negocios destacados</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {topBiz.map((b) => {
            const imgSrc = b.logo_url || b.banner_url;
            return (
              <a key={b.id} href={`https://citymap.mx/${citySlug}/${b.slug}`}
                style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 14px', background: '#fff', borderRadius: 16, border: '1px solid #e5e7eb', textDecoration: 'none', color: '#111', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                <div style={{ width: 60, height: 60, borderRadius: 12, background: '#f3f4f6', overflow: 'hidden', flexShrink: 0, position: 'relative' }}>
                  {imgSrc
                    ? <Image src={imgSrc} alt={b.name} fill style={{ objectFit: 'cover' }} />
                    : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>🏪</div>
                  }
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: 15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.name}</div>
                  <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{CAT_LABEL[b.category] || b.category}</div>
                  {b.review_count > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 3 }}>
                      <span style={{ fontSize: 12 }}>⭐</span>
                      <span style={{ fontSize: 12, fontWeight: 700 }}>{Number(b.rating).toFixed(1)}</span>
                      <span style={{ fontSize: 11, color: '#9ca3af' }}>({b.review_count})</span>
                    </div>
                  )}
                </div>
                <span style={{ color: '#9ca3af', fontSize: 18 }}>›</span>
              </a>
            );
          })}
        </div>

        {businesses.length > 12 && (
          <a href={`https://citymap.mx/${citySlug}`}
            style={{ display: 'block', textAlign: 'center', marginTop: 20, padding: '14px', background: '#1A7A5E', color: '#fff', borderRadius: 14, fontWeight: 800, fontSize: 15, textDecoration: 'none' }}>
            Ver los {businesses.length} negocios en la app →
          </a>
        )}

        {/* SEO text */}
        <div style={{ marginTop: 40, padding: '20px', background: '#fff', borderRadius: 16, border: '1px solid #e5e7eb' }}>
          <h2 style={{ fontSize: 16, fontWeight: 800, margin: '0 0 8px' }}>Directorio de negocios en {city.name}</h2>
          <p style={{ fontSize: 14, color: '#4b5563', lineHeight: 1.6, margin: 0 }}>
            Encuentra los mejores restaurantes, cafeterías, bares, hoteles y negocios locales en {city.name}
            {city.state ? `, ${city.state}` : ''}. CityMap te muestra horarios, reseñas, ubicación en mapa y formas de contacto de cada negocio.
          </p>
        </div>
      </div>
    </div>
  );
}

export const dynamic = 'force-dynamic';

import Image from 'next/image';

const SB_URL = process.env.VITE_SUPABASE_URL;
const SB_KEY = process.env.VITE_SUPABASE_ANON_KEY;

export const metadata = {
  title: 'CityMap — Descubre los mejores negocios de tu ciudad',
  description: 'Directorio local de negocios con reseñas, horarios en tiempo real, mapa interactivo y notificaciones de ofertas. Restaurantes, cafeterías, bares y más.',
  openGraph: {
    title: 'CityMap — Directorio local de negocios',
    description: 'Encuentra los mejores negocios cerca de ti. Reseñas reales, horarios y mapa.',
    images: ['https://citymap.mx/og-image.png'],
  },
};

async function getCities() {
  try {
    const res = await fetch(`${SB_URL}/rest/v1/cities?active=eq.true&select=id,name,slug,state,country,country_code,bg_image&order=name.asc`, {
      headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` },
    });
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch { return []; }
}

const FLAG = { mx: '🇲🇽', us: '🇺🇸', fr: '🇫🇷', es: '🇪🇸', ar: '🇦🇷', co: '🇨🇴', pe: '🇵🇪', cl: '🇨🇱' };

export default async function HomePage() {
  const cities = await getCities();

  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', background: '#fafafa', minHeight: '100vh' }}>
      {/* Hero */}
      <div style={{ background: 'linear-gradient(135deg, #0f4c35 0%, #1A7A5E 60%, #22a876 100%)', padding: '60px 24px 48px', textAlign: 'center', color: '#fff' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🗺️</div>
        <h1 style={{ fontSize: 32, fontWeight: 900, margin: '0 0 12px', letterSpacing: '-0.5px', lineHeight: 1.2 }}>
          Descubre los mejores<br />negocios de tu ciudad
        </h1>
        <p style={{ fontSize: 16, opacity: 0.85, margin: '0 0 28px', maxWidth: 400, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.5 }}>
          Directorio local con reseñas, horarios en tiempo real y mapa interactivo.
        </p>
        <a href="https://citymap.mx" style={{ display: 'inline-block', background: '#fff', color: '#1A7A5E', padding: '14px 28px', borderRadius: 999, fontWeight: 800, fontSize: 15, textDecoration: 'none' }}>
          Abrir la app →
        </a>
      </div>

      {/* Cities */}
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '32px 20px 60px' }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 18px', color: '#111' }}>
          Ciudades disponibles
        </h2>

        {cities.length === 0 ? (
          <p style={{ color: '#6b7280', fontSize: 15 }}>Cargando ciudades...</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
            {cities.map((city) => (
              <a key={city.id} href={`https://citymap.mx/${city.slug}`}
                style={{ display: 'block', borderRadius: 16, overflow: 'hidden', border: '1px solid #e5e7eb', textDecoration: 'none', background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                <div style={{ position: 'relative', width: '100%', height: 110, background: '#1A7A5E' }}>
                  {city.bg_image && (
                    <Image src={city.bg_image} alt={city.name} fill style={{ objectFit: 'cover', opacity: 0.7 }} />
                  )}
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent)' }} />
                  <div style={{ position: 'absolute', bottom: 10, left: 12, color: '#fff' }}>
                    <div style={{ fontSize: 22 }}>{FLAG[city.country_code] || '🌎'}</div>
                  </div>
                </div>
                <div style={{ padding: '10px 12px' }}>
                  <div style={{ fontWeight: 800, fontSize: 14, color: '#111', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{city.name}</div>
                  <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{city.state}</div>
                </div>
              </a>
            ))}
          </div>
        )}

        {/* Features */}
        <div style={{ marginTop: 48, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
          {[
            { icon: '⏰', title: 'Horarios en tiempo real', desc: 'Sabe si está abierto o cerrado ahora mismo.' },
            { icon: '⭐', title: 'Reseñas verificadas', desc: 'Opiniones de clientes reales de tu ciudad.' },
            { icon: '🗺️', title: 'Mapa interactivo', desc: 'Encuentra negocios cerca de ti en el mapa.' },
            { icon: '🔔', title: 'Notificaciones', desc: 'Recibe ofertas y novedades de tus favoritos.' },
          ].map((f) => (
            <div key={f.title} style={{ padding: '18px', background: '#fff', borderRadius: 16, border: '1px solid #e5e7eb' }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>{f.icon}</div>
              <div style={{ fontWeight: 800, fontSize: 14, color: '#111', marginBottom: 4 }}>{f.title}</div>
              <div style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.4 }}>{f.desc}</div>
            </div>
          ))}
        </div>

        {/* SEO paragraph */}
        <div style={{ marginTop: 40, padding: '20px', background: '#fff', borderRadius: 16, border: '1px solid #e5e7eb' }}>
          <h2 style={{ fontSize: 16, fontWeight: 800, margin: '0 0 8px' }}>El directorio local más completo de México</h2>
          <p style={{ fontSize: 14, color: '#4b5563', lineHeight: 1.6, margin: 0 }}>
            CityMap es el directorio local que conecta a los usuarios con los mejores negocios de cada ciudad. Encuentra restaurantes, cafeterías, bares, hoteles, salones de belleza y mucho más.
            Consulta horarios actualizados, lee reseñas de clientes reales y descubre los lugares mejor calificados cerca de ti.
          </p>
        </div>
      </div>
    </div>
  );
}

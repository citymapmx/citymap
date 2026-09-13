export const dynamic = 'force-dynamic';

import MapWrapper from '../../../components/map/MapWrapper';

const SB_URL = process.env.VITE_SUPABASE_URL;
const SB_KEY = process.env.VITE_SUPABASE_ANON_KEY;

async function getCity(citySlug) {
  if (!SB_URL || !SB_KEY) return null;
  try {
    const res = await fetch(`${SB_URL}/rest/v1/cities?slug=eq.${citySlug}&select=name`, {
      headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` },
    });
    const data = await res.json();
    return data?.[0] || null;
  } catch { return null; }
}

export async function generateMetadata({ params }) {
  const { city } = await params;
  const cityData = await getCity(city);
  
  if (!cityData) return { title: 'Mapa | CityMap' };

  return {
    title: `Mapa interactivo de ${cityData.name} — CityMap`,
    description: `Explora el mapa interactivo de ${cityData.name} y descubre restaurantes, cafeterías, tiendas y eventos cerca de ti.`,
    alternates: { 
      canonical: `https://citymap.mx/mapa/${city}`,
      languages: {
        "es-MX": `https://citymap.mx/mapa/${city}`,
        "es": `https://citymap.world/mapa/${city}`,
        "x-default": `https://citymap.world/mapa/${city}`,
      }
    }
  };
}

export default async function MapPage({ params }) {
  const { city } = await params;
  const cityData = await getCity(city);

  if (!cityData) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: 24, fontWeight: 800 }}>Ciudad no encontrada</h1>
          <a href="https://citymap.mx" style={{ color: '#1A7A5E', marginTop: 12, display: 'block' }}>← Volver al inicio</a>
        </div>
      </div>
    );
  }

  return <MapWrapper citySlug={city} />;
}

export const dynamic = 'force-dynamic';

import Image from 'next/image';
import BackButton from '../../../../components/BackButton';

const SB_URL = process.env.VITE_SUPABASE_URL;
const SB_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const H = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` };

async function getExperience(city, slug) {
  const query = `?or=(slug.eq.${slug},id.eq.${slug})&or=(city_slug.eq.${city},city_slug.eq.all)&select=*&limit=1`;
  const res = await fetch(`${SB_URL}/rest/v1/experiences${query}`, { headers: H });
  const data = await res.json();
  return data?.[0] || null;
}

export async function generateMetadata({ params }) {
  const { city, slug } = await params;
  const exp = await getExperience(city, slug);
  
  if (!exp) return { title: 'Experiencia no encontrada | CityMap' };

  const cityCapitalized = city.charAt(0).toUpperCase() + city.slice(1);
  const title = `${exp.title} en ${cityCapitalized} | Experiencias CityMap`;
  const desc = exp.description
    ? exp.description.slice(0, 155) + (exp.description.length > 155 ? "…" : "")
    : `Descubre y reserva la experiencia ${exp.title} en ${cityCapitalized}.`;
  
  const img = exp.image_url || "https://citymap.mx/og-image.png";

  return {
    title,
    description: desc,
    alternates: { 
      canonical: `https://citymap.mx/experiencias/${city}/${slug}`,
      languages: {
        "es-MX": `https://citymap.mx/experiencias/${city}/${slug}`,
        "es": `https://citymap.world/experiencias/${city}/${slug}`,
        "x-default": `https://citymap.world/experiencias/${city}/${slug}`,
      }
    },
    openGraph: {
      title,
      description: desc,
      url: `https://citymap.mx/experiencias/${city}/${slug}`,
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

export default async function ExperiencePage({ params }) {
  const { city, slug } = await params;
  const exp = await getExperience(city, slug);

  if (!exp) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: 24, fontWeight: 800 }}>Experiencia no encontrada</h1>
          <a href="https://citymap.mx" style={{ color: '#1A7A5E', marginTop: 12, display: 'block', textDecoration: 'none' }}>← Ir a CityMap</a>
        </div>
      </div>
    );
  }

  const cityCapitalized = city.charAt(0).toUpperCase() + city.slice(1);
  
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'TouristAttraction',
    name: exp.title,
    description: exp.description,
    image: exp.image_url ? [exp.image_url] : [],
    touristType: 'Experience',
    availableLanguage: 'es',
    location: {
      '@type': 'Place',
      name: cityCapitalized,
      address: {
        '@type': 'PostalAddress',
        addressLocality: cityCapitalized,
        addressCountry: 'MX'
      }
    }
  };

  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', background: '#fafafa', minHeight: '100vh' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <BackButton citySlug={city} />
      
      <div style={{ position: 'relative', width: '100%', height: 380, background: '#111' }}>
        {exp.image_url && (
          <Image src={exp.image_url} alt={exp.title} fill style={{ objectFit: 'cover', opacity: 0.8 }} priority sizes="100vw" unoptimized={exp.image_url.startsWith('data:')}/>
        )}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.95) 100%)' }} />
        
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '24px 20px', color: '#fff', maxWidth: 680, margin: '0 auto' }}>
          <h1 style={{ fontSize: 34, fontWeight: 900, margin: '0 0 12px', lineHeight: 1.15, letterSpacing: '-0.5px' }}>{exp.title}</h1>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, fontSize: 14, opacity: 0.9 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(255,255,255,0.15)', padding: '6px 12px', borderRadius: 20, backdropFilter: 'blur(4px)' }}>
              📍 {cityCapitalized}
            </span>
            {exp.price_mxn && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(255,255,255,0.15)', padding: '6px 12px', borderRadius: 20, backdropFilter: 'blur(4px)', fontWeight: 700 }}>
                Desde ${exp.price_mxn} MXN
              </span>
            )}
            {exp.duration_text && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(255,255,255,0.15)', padding: '6px 12px', borderRadius: 20, backdropFilter: 'blur(4px)' }}>
                ⏱️ {exp.duration_text}
              </span>
            )}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '32px 20px 80px' }}>
        <div style={{ background: '#fff', borderRadius: 24, padding: 28, boxShadow: '0 4px 24px rgba(0,0,0,0.04)', border: '1px solid #f1f5f9' }}>
          
          <h2 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 16px' }}>La Experiencia</h2>
          {exp.description ? (
            <p style={{ fontSize: 16, lineHeight: 1.7, color: '#4b5563', margin: 0, whiteSpace: 'pre-wrap' }}>
              {exp.description}
            </p>
          ) : (
            <p style={{ fontSize: 15, color: '#9ca3af', fontStyle: 'italic', margin: 0 }}>Sin descripción disponible.</p>
          )}

          <div style={{ marginTop: 32, paddingTop: 32, borderTop: '1px solid #f1f5f9' }}>
            <a href={`https://citymap.mx/experiencias/${city}/${slug}`} 
               style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', padding: '16px', background: '#0F172A', color: '#fff', borderRadius: 16, fontSize: 16, fontWeight: 800, textDecoration: 'none' }}>
              Reservar Experiencia →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

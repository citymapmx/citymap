export const dynamic = 'force-dynamic';

import Image from 'next/image';
import BackButton from '../../../../components/BackButton';

const SB_URL = (process.env.VITE_SUPABASE_URL || "https://dpkjxhjkzdlkvyotoeai.supabase.co");
const SB_KEY = (process.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRwa2p4aGpremRsa3Z5b3RvZWFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0MzYzNTAsImV4cCI6MjA5NjAxMjM1MH0.R6ZoNQHKP-DDA4F8phgolf82AEOTII-mLUlWc3DWHyE");
const H = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` };

async function getExperience(city, slug) {
  const query = `?or=(slug.eq.${slug},id.eq.${slug})&or=(city_slug.eq.${city},city_slug.eq.all)&select=*&limit=1`;
  const res = await fetch(`${SB_URL}/rest/v1/experiences${query}`, { headers: H });
  const data = await res.json();
  return data?.[0] || null;
}

export async function generateMetadata({ params }) {
  const resolvedParams = await params;
  const { city, slug } = resolvedParams;
  const exp = await getExperience(city, slug);
  
  if (!exp) return { title: 'No encontrado | CityMap' };

  const cityCapitalized = city.charAt(0).toUpperCase() + city.slice(1);
  const isBlog = exp.activity_type === "📝 Blog / Guía";
  
  const title = isBlog 
    ? `${exp.title} | Guía de ${cityCapitalized}`
    : `${exp.title} en ${cityCapitalized} | Experiencias CityMap`;
    
  const desc = exp.description
    ? exp.description.slice(0, 155) + (exp.description.length > 155 ? "…" : "")
    : isBlog ? `Lee nuestra guía sobre ${exp.title} en ${cityCapitalized}.` : `Descubre y reserva la experiencia ${exp.title} en ${cityCapitalized}.`;
  
  const img = (exp.gallery && exp.gallery.length > 0) ? exp.gallery[0] : "https://citymap.mx/og-image.png";

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
      type: isBlog ? 'article' : 'website',
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
  const resolvedParams = await params;
  const { city, slug } = resolvedParams;
  const exp = await getExperience(city, slug);

  if (!exp) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: 24, fontWeight: 800 }}>Contenido no encontrado</h1>
          <a href="https://citymap.mx" style={{ color: '#1A7A5E', marginTop: 12, display: 'block', textDecoration: 'none' }}>← Ir a CityMap</a>
        </div>
      </div>
    );
  }

  const cityCapitalized = city.charAt(0).toUpperCase() + city.slice(1);
  const isBlog = exp.activity_type === "📝 Blog / Guía";
  const mainImg = (exp.gallery && exp.gallery.length > 0) ? exp.gallery[0] : null;
  
  const schema = isBlog ? {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: exp.title,
    image: mainImg ? [mainImg] : [],
    author: {
      '@type': 'Person',
      name: exp.author_name || 'CityMap'
    },
    description: exp.description ? exp.description.slice(0, 150) : '',
  } : {
    '@context': 'https://schema.org',
    '@type': 'TouristAttraction',
    name: exp.title,
    description: exp.description,
    image: mainImg ? [mainImg] : [],
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
        {mainImg && (
          <Image src={mainImg} alt={exp.title} fill style={{ objectFit: 'cover', opacity: 0.8 }} priority sizes="100vw" unoptimized={mainImg.startsWith('data:')}/>
        )}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.95) 100%)' }} />
        
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '24px 20px', color: '#fff', maxWidth: 680, margin: '0 auto' }}>
          <h1 style={{ fontSize: 34, fontWeight: 900, margin: '0 0 12px', lineHeight: 1.15, letterSpacing: '-0.5px' }}>{exp.title}</h1>
          
          {isBlog ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, opacity: 0.9 }}>
              {exp.author_name && <span style={{ fontWeight: 600 }}>Por {exp.author_name}</span>}
              <span>📍 {cityCapitalized}</span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, fontSize: 14, opacity: 0.9 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(255,255,255,0.15)', padding: '6px 12px', borderRadius: 20, backdropFilter: 'blur(4px)' }}>
                📍 {cityCapitalized}
              </span>
              {exp.price > 0 ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(255,255,255,0.15)', padding: '6px 12px', borderRadius: 20, backdropFilter: 'blur(4px)', fontWeight: 700 }}>
                  Desde ${exp.price} MXN
                </span>
              ) : (
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(255,255,255,0.15)', padding: '6px 12px', borderRadius: 20, backdropFilter: 'blur(4px)', fontWeight: 700 }}>
                  Gratis
                </span>
              )}
              {exp.duration && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(255,255,255,0.15)', padding: '6px 12px', borderRadius: 20, backdropFilter: 'blur(4px)' }}>
                  ⏱️ {exp.duration}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '32px 20px 80px' }}>
        <div style={{ background: '#fff', borderRadius: 24, padding: 28, boxShadow: '0 4px 24px rgba(0,0,0,0.04)', border: '1px solid #f1f5f9' }}>
          
          <h2 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 16px' }}>{isBlog ? 'Contenido' : 'La Experiencia'}</h2>
          {exp.description ? (
            <p style={{ fontSize: 16, lineHeight: 1.7, color: '#4b5563', margin: 0, whiteSpace: 'pre-wrap' }}>
              {exp.description}
            </p>
          ) : (
            <p style={{ fontSize: 15, color: '#9ca3af', fontStyle: 'italic', margin: 0 }}>Sin descripción disponible.</p>
          )}

          {!isBlog && (
            <div style={{ marginTop: 32, paddingTop: 32, borderTop: '1px solid #f1f5f9' }}>
              <a href={`https://citymap.mx/experiencias/${city}/${slug}`} 
                 style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', padding: '16px', background: '#0F172A', color: '#fff', borderRadius: 16, fontSize: 16, fontWeight: 800, textDecoration: 'none' }}>
                Abrir en la App para Reservar →
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

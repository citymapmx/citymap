export const dynamic = 'force-dynamic';

import Image from 'next/image';
import StarRow from '../../../components/ui/StarRow';
import Icon from '../../../components/ui/Icon';
import MapButton from '../../../components/MapButton';
import ActionButtons from '../../../components/ActionButtons';
import BackButton from '../../../components/BackButton';
import FavButton from '../../../components/biz/FavButton';
import ReviewSection from '../../../components/biz/ReviewSection';
import ReservationsBlock from '../../../components/biz/ReservationsBlock';
import EventsAgenda from '../../../components/biz/EventsAgenda';
import AuthClient from '../../../components/auth/AuthClient';

const SB_URL = (process.env.VITE_SUPABASE_URL || "https://dpkjxhjkzdlkvyotoeai.supabase.co");
const SB_KEY = (process.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRwa2p4aGpremRsa3Z5b3RvZWFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0MzYzNTAsImV4cCI6MjA5NjAxMjM1MH0.R6ZoNQHKP-DDA4F8phgolf82AEOTII-mLUlWc3DWHyE");
const H = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` };

// ─── CATEGORY DEFINITIONS ───────────────────────────────────────────────────
const CATS = {
  restaurantes:  { label: 'Restaurantes',     emoji: '🍽️', color: '#EF4444' },
  cafe:          { label: 'Cafeterías',        emoji: '☕',  color: '#92400E' },
  cafeteria:     { label: 'Cafeterías',        emoji: '☕',  color: '#92400E' },
  cafeterias:    { label: 'Cafeterías',        emoji: '☕',  color: '#92400E' },
  salud:         { label: 'Salud',             emoji: '🏥',  color: '#059669' },
  belleza:       { label: 'Belleza y Spa',     emoji: '💅',  color: '#EC4899' },
  fitness:       { label: 'Fitness',           emoji: '💪',  color: '#F97316' },
  gimnasios:     { label: 'Gimnasios',         emoji: '💪',  color: '#F97316' },
  compras:       { label: 'Compras',           emoji: '🛍️', color: '#8B5CF6' },
  tiendas:       { label: 'Tiendas',           emoji: '🛍️', color: '#8B5CF6' },
  tech:          { label: 'Tecnología',        emoji: '💻',  color: '#3B82F6' },
  ocio:          { label: 'Entretenimiento',   emoji: '🎭',  color: '#F59E0B' },
  hoteles:       { label: 'Hoteles',           emoji: '🏨',  color: '#0EA5E9' },
  hospedaje:     { label: 'Hospedaje',         emoji: '🏨',  color: '#0EA5E9' },
  educacion:     { label: 'Educación',         emoji: '📚',  color: '#6366F1' },
  bares:         { label: 'Bares',             emoji: '🍻',  color: '#7C3AED' },
  servicios:     { label: 'Servicios',         emoji: '🔧',  color: '#6B7280' },
};

function getCatDesc(catId, cityName) {
  const city = cityName || 'tu ciudad';
  const id = catId.toLowerCase();
  if (id === 'salud') return `Encuentra la mejor atención médica en ${city}. Especialistas, clínicas y hospitales de confianza con servicios y horarios verificados.`;
  if (id === 'educacion') return `Impulsa tu futuro en las mejores escuelas y academias de ${city}. Encuentra la institución ideal para tu desarrollo y aprendizaje.`;
  if (id === 'restaurantes') return `Deléitate con los mejores restaurantes en ${city}. Desde joyas locales hasta alta cocina con menús, horarios y reseñas.`;
  if (id === 'cafe' || id === 'cafeteria' || id === 'cafeterias') return `Disfruta del mejor café y repostería en ${city}. Cafeterías acogedoras perfectas para trabajar, estudiar o charlar.`;
  if (id === 'hoteles' || id === 'hospedaje') return `Planea tu estancia perfecta en los mejores hoteles de ${city}. Boutique hasta lujo con todas las comodidades.`;
  if (id === 'bares') return `Vive la vida nocturna en los mejores bares de ${city}. Dónde salir por unas copas o a bailar con amigos.`;
  if (id === 'belleza') return `Consiéntete en los mejores salones, spas y barberías de ${city}. Lugares increíbles para relajarte y cuidar tu imagen.`;
  if (id === 'fitness' || id === 'gimnasios') return `Actívate en los mejores gimnasios y centros deportivos en ${city}. Encuentra la disciplina perfecta para tu rutina.`;
  if (id === 'compras' || id === 'tiendas') return `Vete de shopping por ${city}. Desde plazas comerciales hasta boutiques locales.`;
  if (id === 'tech') return `Actualízate con las mejores tiendas de tecnología en ${city}. Smartphones, accesorios y expertos en reparaciones.`;
  if (id === 'ocio') return `Rompe la rutina con el mejor entretenimiento en ${city}. Cines, parques y actividades para toda la familia.`;
  return `Descubre los mejores lugares de ${id} en ${city}. Horarios, reseñas y cómo llegar.`;
}

async function getCategoryData(citySlug, category) {
  const [cityRes, bizRes] = await Promise.all([
    fetch(`${SB_URL}/rest/v1/cities?slug=eq.${citySlug}&select=id,name,state,country,bg_image&limit=1`, { headers: H }),
    fetch(`${SB_URL}/rest/v1/businesses?city_slug=eq.${citySlug}&category=ilike.*${encodeURIComponent(category)}*&status=eq.approved&plan=neq.menu&select=id,name,slug,category,rating,review_count,logo_url,banner_url,plan,description&order=plan.desc,rating.desc.nullslast&limit=120`, { headers: H }),
  ]);
  const cities = await cityRes.json();
  const businesses = await bizRes.json();
  return { city: cities?.[0] || null, businesses: Array.isArray(businesses) ? businesses : [] };
}

// ─── CATEGORY PAGE RENDERER ──────────────────────────────────────────────────
async function CategoryPage({ city: citySlug, slug: category }) {
  const catKey = category.toLowerCase();
  const catInfo = CATS[catKey];
  const { city, businesses } = await getCategoryData(citySlug, category);
  const cityName = city?.name || citySlug.charAt(0).toUpperCase() + citySlug.slice(1);
  const desc = getCatDesc(category, cityName);
  const coverImg = city?.bg_image;

  const schema = {
    '@context': 'https://schema.org', '@type': 'ItemList',
    name: `${catInfo.label} en ${cityName}`, description: desc,
    url: `https://citymap.mx/${citySlug}/${category}`,
    numberOfItems: businesses.length,
    itemListElement: businesses.slice(0, 20).map((b, i) => ({
      '@type': 'ListItem', position: i + 1,
      item: {
        '@type': 'LocalBusiness', name: b.name,
        url: `https://citymap.mx/${citySlug}/${b.slug}`,
        image: b.logo_url || b.banner_url || undefined,
        ...(b.rating && b.review_count > 0 ? { aggregateRating: { '@type': 'AggregateRating', ratingValue: b.rating, reviewCount: b.review_count } } : {}),
      },
    })),
  };
  const breadcrumb = {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'CityMap', item: 'https://citymap.mx' },
      { '@type': 'ListItem', position: 2, name: cityName, item: `https://citymap.mx/${citySlug}` },
      { '@type': 'ListItem', position: 3, name: catInfo.label, item: `https://citymap.mx/${citySlug}/${category}` },
    ],
  };

  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', background: '#fafafa', minHeight: '100vh' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <BackButton citySlug={citySlug} />

      {/* Hero */}
      <div style={{ position: 'relative', width: '100%', height: 180, background: catInfo.color, overflow: 'hidden' }}>
        {coverImg && <Image src={coverImg} alt={cityName} fill style={{ objectFit: 'cover', opacity: 0.35 }} priority sizes="100vw" />}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.2), rgba(0,0,0,0.65))' }} />
        <div style={{ position: 'relative', zIndex: 1, padding: '44px 20px 20px', color: '#fff' }}>
          <nav style={{ fontSize: 12, opacity: 0.8, marginBottom: 8 }}>
            <a href="https://citymap.mx" style={{ color: 'inherit', textDecoration: 'none' }}>CityMap</a>{' › '}
            <a href={`https://citymap.mx/${citySlug}`} style={{ color: 'inherit', textDecoration: 'none' }}>{cityName}</a>{' › '}
            <span>{catInfo.label}</span>
          </nav>
          <h1 style={{ fontSize: 28, fontWeight: 900, margin: 0, letterSpacing: '-0.5px', lineHeight: 1.2 }}>
            {catInfo.emoji} {catInfo.label} en {cityName}
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: 13, opacity: 0.9 }}>{businesses.length} lugares encontrados</p>
        </div>
      </div>

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '20px 16px 80px' }}>
        <p style={{ fontSize: 14, color: '#4B5563', lineHeight: 1.7, marginBottom: 24, padding: '14px 16px', background: '#fff', borderRadius: 14, border: '1px solid #F1F5F9' }}>{desc}</p>

        {businesses.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94A3B8' }}>
            <p style={{ fontSize: 40 }}>{catInfo.emoji}</p>
            <p style={{ fontWeight: 700, marginTop: 12 }}>Aún no hay negocios en esta categoría</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {businesses.map((b) => {
              const imgSrc = b.logo_url || b.banner_url;
              const bizSlug = b.slug?.startsWith(`${citySlug}-`) ? b.slug.slice(citySlug.length + 1) : b.slug;
              return (
                <a key={b.id} href={`https://citymap.mx/${citySlug}/${bizSlug}`}
                  style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 14px', background: '#fff', borderRadius: 16, border: '1px solid #F1F5F9', textDecoration: 'none', color: '#111', boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
                  <div style={{ width: 64, height: 64, borderRadius: 14, background: '#F1F5F9', overflow: 'hidden', flexShrink: 0, position: 'relative' }}>
                    {imgSrc
                      ? <Image src={imgSrc} alt={b.name} fill style={{ objectFit: 'cover' }} sizes="64px" unoptimized={imgSrc.startsWith('data:')} />
                      : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>{catInfo.emoji}</div>}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: 15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.name}</div>
                    {b.description && <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{b.description}</div>}
                    {b.review_count > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                        <span style={{ fontSize: 11 }}>⭐</span>
                        <span style={{ fontSize: 12, fontWeight: 700 }}>{Number(b.rating).toFixed(1)}</span>
                        <span style={{ fontSize: 11, color: '#9CA3AF' }}>({b.review_count})</span>
                      </div>
                    )}
                  </div>
                  <span style={{ color: '#CBD5E1', fontSize: 20 }}>›</span>
                </a>
              );
            })}
          </div>
        )}

        {businesses.length > 0 && (
          <a href={`https://citymap.mx/${citySlug}?cat=${category}`}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 24, padding: '16px', background: '#0F172A', color: '#fff', borderRadius: 16, fontWeight: 800, fontSize: 15, textDecoration: 'none' }}>
            {catInfo.emoji} Abrir en la app de CityMap →
          </a>
        )}

        {/* Internal linking to other categories */}
        <div style={{ marginTop: 32, padding: '16px', background: '#fff', borderRadius: 16, border: '1px solid #F1F5F9' }}>
          <h2 style={{ fontSize: 14, fontWeight: 800, margin: '0 0 12px', color: '#374151' }}>Más categorías en {cityName}</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {Object.entries(CATS).filter(([k]) => k !== catKey && !['cafeteria','cafeterias','gimnasios','tiendas','hospedaje'].includes(k)).map(([k, v]) => (
              <a key={k} href={`https://citymap.mx/${citySlug}/${k}`}
                style={{ padding: '7px 12px', borderRadius: 999, background: '#F8FAFC', border: '1px solid #E2E8F0', fontSize: 13, fontWeight: 600, color: '#374151', textDecoration: 'none' }}>
                {v.emoji} {v.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

async function getBusiness(city, slug) {
  let q = `slug=eq.${slug}`;
  let res = await fetch(`${(process.env.VITE_SUPABASE_URL || "https://dpkjxhjkzdlkvyotoeai.supabase.co")}/rest/v1/businesses?${q}&city_slug=eq.${city}&select=*`, {
    headers: { apikey: (process.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRwa2p4aGpremRsa3Z5b3RvZWFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0MzYzNTAsImV4cCI6MjA5NjAxMjM1MH0.R6ZoNQHKP-DDA4F8phgolf82AEOTII-mLUlWc3DWHyE"), Authorization: `Bearer ${(process.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRwa2p4aGpremRsa3Z5b3RvZWFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0MzYzNTAsImV4cCI6MjA5NjAxMjM1MH0.R6ZoNQHKP-DDA4F8phgolf82AEOTII-mLUlWc3DWHyE")}` }
  });
  let data = await res.json();
  
  if (!data || data.length === 0) {
    const searchName = slug.split("-").join("%25");
    res = await fetch(`${(process.env.VITE_SUPABASE_URL || "https://dpkjxhjkzdlkvyotoeai.supabase.co")}/rest/v1/businesses?name=ilike.*${searchName}*&city_slug=eq.${city}&select=*`, {
      headers: { apikey: (process.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRwa2p4aGpremRsa3Z5b3RvZWFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0MzYzNTAsImV4cCI6MjA5NjAxMjM1MH0.R6ZoNQHKP-DDA4F8phgolf82AEOTII-mLUlWc3DWHyE"), Authorization: `Bearer ${(process.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRwa2p4aGpremRsa3Z5b3RvZWFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0MzYzNTAsImV4cCI6MjA5NjAxMjM1MH0.R6ZoNQHKP-DDA4F8phgolf82AEOTII-mLUlWc3DWHyE")}` }
    });
    data = await res.json();
  }
  return data && data[0] ? data[0] : null;
}

export async function generateMetadata({ params }) {
  const resolvedParams = await params;
  const { city, slug } = resolvedParams;

  // If slug is a known category, return category metadata
  const catInfo = CATS[slug.toLowerCase()];
  if (catInfo) {
    const { city: cityData, businesses } = await getCategoryData(city, slug);
    const cityName = cityData?.name || city.charAt(0).toUpperCase() + city.slice(1);
    const desc = getCatDesc(slug, cityName);
    const img = cityData?.bg_image || 'https://citymap.mx/og-image.png';
    const title = `${catInfo.emoji} ${catInfo.label} en ${cityName} — ${businesses.length}+ lugares | CityMap`;
    return {
      title, description: desc,
      alternates: { 
        canonical: `https://citymap.mx/${city}/${slug}`,
        languages: {
          "es-MX": `https://citymap.mx/${city}/${slug}`,
          "es": `https://citymap.world/${city}/${slug}`,
          "x-default": `https://citymap.world/${city}/${slug}`,
        }
      },
      openGraph: { title, description: desc, url: `https://citymap.mx/${city}/${slug}`, siteName: 'CityMap', images: [{ url: img, width: 1200, height: 630 }], type: 'website' },
      twitter: { card: 'summary_large_image', title, description: desc, images: [img] },
    };
  }

  const biz = await getBusiness(city, slug);
  if (!biz) return { title: 'Negocio no encontrado | CityMap' };

  const cityCapitalized = city.charAt(0).toUpperCase() + city.slice(1);
  const catLabel = biz.category ? biz.category.charAt(0).toUpperCase() + biz.category.slice(1) : "Negocio";
  
  const title = `${biz.name} — ${catLabel} en ${cityCapitalized} | Horarios y Reseñas`;
  const desc = biz.description 
    ? biz.description.slice(0, 155) + (biz.description.length > 155 ? "…" : "")
    : `Encuentra toda la información sobre ${biz.name} en ${cityCapitalized}. Conoce sus horarios, ubicación, fotos y lee reseñas de otros usuarios en CityMap.`;
  
  const img = biz.banner_url || biz.logo_url || "https://citymap.mx/og-image.png";

  return {
    title,
    description: desc,
    alternates: { 
      canonical: `https://citymap.mx/${city}/${slug}`,
      languages: {
        "es-MX": `https://citymap.mx/${city}/${slug}`,
        "es": `https://citymap.world/${city}/${slug}`,
        "x-default": `https://citymap.world/${city}/${slug}`,
      }
    },
    openGraph: {
      title,
      description: desc,
      url: `https://citymap.mx/${city}/${slug}`,
      siteName: 'CityMap',
      images: [
        {
          url: img,
          width: 1200,
          height: 630,
        },
      ],
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

export default async function BusinessProfile({ params }) {
  const resolvedParams = await params;
  const { city, slug } = resolvedParams;

  // If slug is a known category, render category page
  if (CATS[slug.toLowerCase()]) {
    return CategoryPage({ city, slug });
  }


  try {
    const biz = await getBusiness(city, slug);

    if (!biz) {
      return <div className="p-10 text-center text-2xl font-bold">Negocio no encontrado</div>;
    }

    const eventsRes = await fetch(`${(process.env.VITE_SUPABASE_URL || "https://dpkjxhjkzdlkvyotoeai.supabase.co")}/rest/v1/events?biz_id=eq.${biz.id}&status=eq.approved&select=*`, {
      headers: { apikey: (process.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRwa2p4aGpremRsa3Z5b3RvZWFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0MzYzNTAsImV4cCI6MjA5NjAxMjM1MH0.R6ZoNQHKP-DDA4F8phgolf82AEOTII-mLUlWc3DWHyE"), Authorization: `Bearer ${(process.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRwa2p4aGpremRsa3Z5b3RvZWFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0MzYzNTAsImV4cCI6MjA5NjAxMjM1MH0.R6ZoNQHKP-DDA4F8phgolf82AEOTII-mLUlWc3DWHyE")}` }
    });
    const events = await eventsRes.json();

    const reviewsRes = await fetch(`${(process.env.VITE_SUPABASE_URL || "https://dpkjxhjkzdlkvyotoeai.supabase.co")}/rest/v1/reviews?biz_id=eq.${biz.id}&select=*&order=created_at.desc`, {
      headers: { apikey: (process.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRwa2p4aGpremRsa3Z5b3RvZWFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0MzYzNTAsImV4cCI6MjA5NjAxMjM1MH0.R6ZoNQHKP-DDA4F8phgolf82AEOTII-mLUlWc3DWHyE"), Authorization: `Bearer ${(process.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRwa2p4aGpremRsa3Z5b3RvZWFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0MzYzNTAsImV4cCI6MjA5NjAxMjM1MH0.R6ZoNQHKP-DDA4F8phgolf82AEOTII-mLUlWc3DWHyE")}` }
    });
    const reviews = await reviewsRes.json();

    const rating = biz.rating || 5.0;
    const reviewsCount = biz.reviews_count || (reviews ? reviews.length : 0);

    let photos = [];
    if (biz.photos) {
      try { photos = JSON.parse(biz.photos); } catch(e){}
    }

    // Helper to format date
    const formatDate = (dateString) => {
      const d = new Date(dateString);
      return d.toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' });
    };

    // Build JSON-LD for Google
    const cityCapitalized = city.charAt(0).toUpperCase() + city.slice(1);
    const bizUrl = `https://citymap.mx/${city}/${slug}`;
    const schema = {
      "@context": "https://schema.org",
      "@type": "LocalBusiness",
      "name": biz.name,
      "description": biz.description || '',
      "url": bizUrl,
      "image": biz.banner_url || biz.logo_url || '',
      "telephone": biz.phone || undefined,
      "address": {
        "@type": "PostalAddress",
        "streetAddress": biz.address || '',
        "addressLocality": cityCapitalized,
        "addressCountry": "MX"
      },
      ...(biz.lat && biz.lng ? {
        "geo": { "@type": "GeoCoordinates", "latitude": biz.lat, "longitude": biz.lng }
      } : {}),
      ...(biz.rating ? {
        "aggregateRating": {
          "@type": "AggregateRating",
          "ratingValue": biz.rating,
          "reviewCount": biz.reviews_count || reviews.length || 1
        }
      } : {}),
      ...(reviews && reviews.length > 0 ? {
        "review": reviews.slice(0, 5).map(r => ({
          "@type": "Review",
          "author": { "@type": "Person", "name": r.user_name || "Usuario" },
          "datePublished": (r.created_at || "").split('T')[0],
          "reviewBody": r.content || "",
          "reviewRating": { "@type": "Rating", "ratingValue": r.rating || 5 }
        }))
      } : {}),
      "openingHoursSpecification": (() => {
        if (!biz.schedule) return [];
        let sched = {};
        try { sched = typeof biz.schedule === 'string' ? JSON.parse(biz.schedule) : biz.schedule; } catch(e){}
        const spec = [];
        const dayMap = { dom: "Sunday", lun: "Monday", mar: "Tuesday", mie: "Wednesday", jue: "Thursday", vie: "Friday", sab: "Saturday" };
        for (const [es, en] of Object.entries(dayMap)) {
          const txt = sched[es];
          if (txt && !/cerrado/i.test(txt)) {
            // Intento de extraer HH:MM
            const segs = txt.split(/[-a]/i).map(s => s.trim());
            let opens = "09:00", closes = "22:00"; // default fallback
            if (segs[0]) {
               const m = segs[0].match(/(\d{1,2})(:\d{2})?/);
               if (m) {
                 let h = parseInt(m[1]);
                 if (/p/i.test(segs[0]) && h < 12) h += 12;
                 opens = `${String(h).padStart(2,'0')}:${m[2] ? m[2].slice(1) : '00'}`;
               }
            }
            if (segs[1]) {
               const m = segs[1].match(/(\d{1,2})(:\d{2})?/);
               if (m) {
                 let h = parseInt(m[1]);
                 if (/p/i.test(segs[1]) && h < 12) h += 12;
                 closes = `${String(h).padStart(2,'0')}:${m[2] ? m[2].slice(1) : '00'}`;
               }
            }
            spec.push({
              "@type": "OpeningHoursSpecification",
              "dayOfWeek": en,
              "opens": opens,
              "closes": closes
            });
          }
        }
        return spec;
      })()
    };

    return (
      <div className="max-w-[1126px] mx-auto min-h-screen bg-[#fafafa]">
        {/* JSON-LD para Google */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />

        <AuthClient />

        {/* Botones Flotantes Superiores */}
        <BackButton citySlug={city} />
        <FavButton bizId={biz.id} />

        {/* Banner */}
        <div className="relative w-full h-[250px] bg-gray-200">
          {(biz.banner_url || biz.logo_url) && <Image src={biz.banner_url || biz.logo_url} alt={biz.name} fill className="object-cover rounded-b-[32px]" sizes="100vw" priority />}
        </div>
        <div className="px-5 pt-5 pb-20 max-w-2xl mx-auto">
          <div className="mb-2">
            <h1 className="text-[28px] font-black tracking-tight leading-tight text-gray-900 flex items-center gap-2">
              {biz.name}
            </h1>
            {biz.description && (
              <p className="text-gray-600 mt-2 text-[15px] leading-relaxed">
                {biz.description}
              </p>
            )}
            <div className="flex items-center justify-between mt-3">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-[#16a34a]"></div>
                <span className="text-[13px] font-bold text-[#16a34a]">Abierto</span>
              </div>
              <div className="flex items-center gap-1.5">
                <StarRow n={rating} size={14} />
                <span className="text-[14px] font-bold text-gray-900">{rating.toFixed(1)}</span>
                <span className="text-[13px] text-gray-500">({reviewsCount})</span>
              </div>
            </div>
          </div>

          {/* Botones de acción rápida */}
          <ActionButtons
            id={biz.id}
            citySlug={city}
            phone={biz.phone}
            whatsapp={biz.whatsapp}
            lat={biz.lat}
            lng={biz.lng}
            name={biz.name}
            url={bizUrl}
          />

          {/* Menú digital */}
          {biz.plan === 'menu' && (
            <a
              href={`/${city}/${slug}/menu`}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                background: '#0F172A', color: '#fff', borderRadius: 16, padding: '14px 20px',
                textDecoration: 'none', fontWeight: 700, fontSize: 16, marginBottom: 16,
              }}
            >
              <span>🍽</span> Ver Menú Digital
            </a>
          )}

          {/* GALERÍA */}
          {photos && photos.length > 0 && (
            <div className="mb-8 mt-6">
              <h3 className="text-[17px] font-extrabold text-gray-900 mb-4">Galería de fotos</h3>
              <div className="flex gap-3 overflow-x-auto pb-4 snap-x snap-mandatory" style={{ scrollbarWidth: 'none' }}>
                {photos.map((photoUrl, idx) => (
                  <div key={idx} className="shrink-0 snap-center">
                    <Image src={photoUrl} width={180} height={180} className="w-[180px] h-[180px] object-cover rounded-2xl border border-gray-200" alt={`Foto ${idx+1} de ${biz.name}`} unoptimized={photoUrl.includes('data:image')} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* RESERVAS */}
          <ReservationsBlock linksStr={biz.reservation_urls} />

          {/* EVENTOS */}
          <EventsAgenda events={events} citySlug={city} />

          {/* RESEÑAS */}
          <ReviewSection bizId={biz.id} initialReviews={reviews || []} />
          {reviews && reviews.length > 0 && (
            <div className="mb-8">
              <h3 className="text-[17px] font-extrabold text-gray-900 mb-4">Reseñas de la comunidad</h3>
              <div className="flex flex-col gap-4">
                {reviews.map(rev => (
                  <div key={rev.id} className="p-4 rounded-2xl bg-white border border-gray-200 shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                          {rev.user_avatar ? <Image src={rev.user_avatar} alt={rev.user_name || 'User'} width={32} height={32} className="w-full h-full object-cover" unoptimized={rev.user_avatar.includes('data:image')}/> : <span className="text-gray-500 text-xs font-bold">{rev.user_name?.charAt(0) || 'U'}</span>}
                        </div>
                        <div>
                          <div className="text-[14px] font-bold text-gray-900">{rev.user_name || 'Usuario CityMap'}</div>
                          <div className="text-[11px] text-gray-500">{formatDate(rev.created_at)}</div>
                        </div>
                      </div>
                      <StarRow n={rev.rating} size={12} />
                    </div>
                    {rev.text && <p className="text-[14px] text-gray-700 leading-relaxed mt-2">{rev.text}</p>}
                    {rev.photo_url && (
                      <div className="mt-3">
                        <Image src={rev.photo_url} alt="Foto de reseña" width={120} height={120} className="w-[120px] h-[120px] object-cover rounded-xl border border-gray-100" unoptimized={rev.photo_url.includes('data:image')} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    );
  } catch (err) {
    console.error("ERROR EN FETCH:", err);
    return <div className="p-10 text-center text-red-500 font-bold">Error interno del servidor</div>;
  }
}

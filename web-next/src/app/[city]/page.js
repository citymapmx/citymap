import { notFound } from 'next/navigation';
import Image from 'next/image';

import HomeClient from '../../components/home/HomeClient';

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SB_HEADERS = {
  apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
  "Content-Type": "application/json"
};

const CAT_LABEL = {
  restaurantes: "Restaurantes",
  cafeterias: "Cafeterías",
  "antros-y-bares": "Vida Nocturna",
  salud: "Salud y Belleza",
  shopping: "Compras",
  hospedaje: "Hoteles",
  eventos: "Eventos",
  otros: "Otros"
};

const CAT_EMOJI = {
  restaurantes: "🍽️",
  cafeterias: "☕",
  "antros-y-bares": "🍸",
  salud: "💅",
  shopping: "🛍️",
  hospedaje: "🏨",
  eventos: "🎟️",
  otros: "📍"
};

async function getCityData(citySlug) {
  const [cityRes, bizRes, bannerRes] = await Promise.all([
    fetch(`${SB_URL}/rest/v1/cities?slug=eq.${citySlug}&select=*&limit=1`, { headers: SB_HEADERS }),
    fetch(`${SB_URL}/rest/v1/businesses?city_slug=eq.${citySlug}&select=id,name,slug,category,rating,review_count,logo_url,banner_url,plan&order=plan.desc,rating.desc&limit=100`, { headers: SB_HEADERS }),
    fetch(`${SB_URL}/rest/v1/banners?city_slug=eq.${citySlug}&status=eq.active&order=sort_order.asc`, { headers: SB_HEADERS })
  ]);
  
  const cities = await cityRes.json();
  const businesses = await bizRes.json();
  const banners = await bannerRes.json();
  
  return { 
    city: cities?.[0] || null, 
    businesses: Array.isArray(businesses) ? businesses : [],
    banners: Array.isArray(banners) ? banners : []
  };
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
    alternates: { 
      canonical: `https://citymap.mx/${citySlug}`,
      languages: {
        "es-MX": `https://citymap.mx/${citySlug}`
      }
    },
  };
}

export default async function CityPage({ params }) {
  const { city: citySlug } = await params;
  const { city, businesses, banners } = await getCityData(citySlug);

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

  // Infer categories from businesses
  const byCategory = businesses.reduce((acc, b) => {
    const cat = b.category || 'otros';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(b);
    return acc;
  }, {});

  const categories = Object.entries(byCategory)
    .sort((a, b) => b[1].length - a[1].length)
    .map(([cat, items]) => ({
      id: cat,
      name: CAT_LABEL[cat] || cat,
      emoji: CAT_EMOJI[cat] || "📍",
      count: items.length
    }));

  const schema = {
    '@context': 'https://schema.org', '@type': 'ItemList',
    name: `Negocios locales en ${city.name}`, description: `Los mejores lugares en ${city.name}`,
    url: `https://citymap.mx/${citySlug}`,
    numberOfItems: businesses.length,
    itemListElement: businesses.slice(0, 30).map((b, i) => ({
      '@type': 'ListItem', position: i + 1,
      item: {
        '@type': 'LocalBusiness', name: b.name,
        url: `https://citymap.mx/${citySlug}/${b.slug}`,
        image: b.logo_url || b.banner_url || undefined,
        address: { '@type': 'PostalAddress', addressLocality: city.name, addressCountry: 'MX' },
        ...(b.rating && b.review_count > 0 ? { aggregateRating: { '@type': 'AggregateRating', ratingValue: b.rating, reviewCount: b.review_count } } : {}),
      },
    })),
  };

  const breadcrumb = {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'CityMap', item: 'https://citymap.mx' },
      { '@type': 'ListItem', position: 2, name: city.name, item: `https://citymap.mx/${citySlug}` },
    ],
  };

  return (
    <div className="bg-[#f8fafc] min-h-screen font-sans">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <HomeClient 
        city={city} 
        citySlug={citySlug} 
        data={{ categories, banners, businesses, events: [] }} 
      />
    </div>
  );
}

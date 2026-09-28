import { notFound } from 'next/navigation';

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

async function getCategoryData(citySlug, categorySlug) {
  const [cityRes, bizRes] = await Promise.all([
    fetch(`${SB_URL}/rest/v1/cities?slug=eq.${citySlug}&select=*&limit=1`, { headers: SB_HEADERS }),
    fetch(`${SB_URL}/rest/v1/businesses?city_slug=eq.${citySlug}&category=eq.${categorySlug}&status=eq.approved&select=id,name,slug,category,rating,review_count,logo_url,banner_url,plan&order=plan.desc,rating.desc&limit=100`, { headers: SB_HEADERS })
  ]);
  
  const cities = await cityRes.json();
  const businesses = await bizRes.json();
  
  return { 
    city: cities?.[0] || null, 
    businesses: Array.isArray(businesses) ? businesses : []
  };
}

export async function generateMetadata({ params }) {
  const { city: citySlug, category: categorySlug } = await params;
  const { city, businesses } = await getCategoryData(citySlug, categorySlug);
  
  if (!city) return { title: 'CityMap' };
  
  const cityName = city.name;
  const catName = CAT_LABEL[categorySlug] || categorySlug.charAt(0).toUpperCase() + categorySlug.slice(1);
  const bizCount = businesses.length;
  
  return {
    title: `Los mejores ${catName} en ${cityName} - CityMap`,
    description: `Descubre ${bizCount}+ ${catName.toLowerCase()} en ${cityName}. Guía local con reseñas, horarios y menús.`,
    openGraph: {
      title: `Los mejores ${catName} en ${cityName} - CityMap`,
      description: `Guía con ${bizCount}+ ${catName.toLowerCase()} recomendados en ${cityName}.`,
      images: city.bg_image ? [city.bg_image] : [],
    },
    alternates: { 
      canonical: `https://citymap.mx/${citySlug}/c/${categorySlug}`
    },
  };
}

export default async function CategoryPage({ params }) {
  const { city: citySlug, category: categorySlug } = await params;
  const { city, businesses } = await getCategoryData(citySlug, categorySlug);

  if (!city) {
    return notFound();
  }

  const catName = CAT_LABEL[categorySlug] || categorySlug.charAt(0).toUpperCase() + categorySlug.slice(1);

  const schema = {
    '@context': 'https://schema.org', 
    '@type': 'ItemList',
    name: `Mejores ${catName} en ${city.name}`, 
    description: `Directorio de ${catName.toLowerCase()} recomendados en ${city.name}`,
    url: `https://citymap.mx/${citySlug}/c/${categorySlug}`,
    numberOfItems: businesses.length,
    itemListElement: businesses.slice(0, 30).map((b, i) => ({
      '@type': 'ListItem', position: i + 1,
      item: {
        '@type': 'LocalBusiness', name: b.name,
        url: `https://citymap.mx/${citySlug}/${b.slug || b.id}`,
        image: b.logo_url || b.banner_url || undefined,
        address: { '@type': 'PostalAddress', addressLocality: city.name, addressCountry: 'MX' }
      },
    })),
  };

  const breadcrumb = {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'CityMap', item: 'https://citymap.mx' },
      { '@type': 'ListItem', position: 2, name: city.name, item: `https://citymap.mx/${citySlug}` },
      { '@type': 'ListItem', position: 3, name: catName, item: `https://citymap.mx/${citySlug}/c/${categorySlug}` }
    ],
  };

  return (
    <div className="bg-[#f8fafc] min-h-screen font-sans">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      
      {/* Fallback client for bots. Real users will be redirected to SPA via vercel edge/client logic */}
      <div className="max-w-2xl mx-auto p-8">
        <h1 className="text-3xl font-black mb-4">{catName} en {city.name}</h1>
        <div className="grid gap-4">
          {businesses.map(b => (
            <a key={b.id} href={`/${citySlug}/${b.slug || b.id}`} className="block p-4 bg-white rounded-xl shadow-sm border border-gray-100">
              <h2 className="font-bold text-lg">{b.name}</h2>
              <p className="text-sm text-gray-500 capitalize">{b.category}</p>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

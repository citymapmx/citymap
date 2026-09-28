import { notFound } from 'next/navigation';

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SB_HEADERS = {
  apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
  "Content-Type": "application/json"
};

// Genera un slug basado en el título, igual que la app Vite
const createSlug = (text) => {
  if (!text) return "";
  return text.toString().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
};

async function getExperienceData(citySlug, expSlug) {
  // En la base de datos, el slug podría no estar guardado como columna, sino que se genera desde el título.
  // Pero si el usuario ya le añadió slug, usamos slug. Como precaución, traemos todas las de la ciudad y buscamos en memoria.
  const res = await fetch(`${SB_URL}/rest/v1/experiences?city_slug=eq.${citySlug}&status=eq.approved`, { headers: SB_HEADERS, next: { revalidate: 60 } });
  const experiences = await res.json();
  
  if (!Array.isArray(experiences)) return null;

  // Buscar por slug exacto o por título convertido a slug
  return experiences.find(e => e.slug === expSlug || createSlug(e.title) === expSlug) || null;
}

export async function generateMetadata({ params }) {
  const { city: citySlug, slug: expSlug } = await params;
  const exp = await getExperienceData(citySlug, expSlug);
  
  if (!exp) return { title: 'CityMap' };
  
  const title = `${exp.title} en ${citySlug.charAt(0).toUpperCase() + citySlug.slice(1)} - CityMap`;
  const desc = exp.description ? exp.description.slice(0, 150) + "..." : `Descubre la experiencia: ${exp.title}`;
  const image = Array.isArray(exp.gallery) && exp.gallery[0] ? exp.gallery[0] : (exp.cover_image || null);
  
  return {
    title,
    description: desc,
    openGraph: {
      title,
      description: desc,
      images: image ? [image] : [],
    },
    alternates: { 
      canonical: `https://citymap.mx/experiencias/${citySlug}/${expSlug}`
    },
  };
}

export default async function ExperiencePage({ params }) {
  const { city: citySlug, slug: expSlug } = await params;
  const exp = await getExperienceData(citySlug, expSlug);

  if (!exp) {
    return notFound();
  }

  const title = exp.title;
  const desc = exp.description || "";
  const image = Array.isArray(exp.gallery) && exp.gallery[0] ? exp.gallery[0] : (exp.cover_image || null);

  const schema = {
    '@context': 'https://schema.org', 
    '@type': 'Article',
    headline: title,
    description: desc,
    image: image ? [image] : [],
    author: {
      '@type': 'Person',
      name: exp.author_name || 'CityMap'
    },
    datePublished: exp.created_at,
    publisher: {
      '@type': 'Organization',
      name: 'CityMap',
      logo: {
        '@type': 'ImageObject',
        url: 'https://citymap.mx/logo.png'
      }
    }
  };

  return (
    <div className="bg-[#f8fafc] min-h-screen font-sans">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      
      {/* Fallback client for bots. Real users will be redirected to SPA via vercel edge/client logic */}
      <div className="max-w-2xl mx-auto p-8 bg-white mt-10 rounded-xl shadow-sm">
        <div className="text-sm text-gray-500 font-bold uppercase tracking-wider mb-2">
          {exp.activity_type || "BLOG / GUÍA"}
        </div>
        <h1 className="text-4xl font-black mb-4">{title}</h1>
        {exp.author_name && (
          <div className="text-gray-500 mb-8">
            Escrito por <strong>{exp.author_name}</strong>
          </div>
        )}
        <div className="prose prose-lg max-w-none">
          {desc.split('\n').map((para, i) => (
            <p key={i}>{para}</p>
          ))}
        </div>
      </div>
    </div>
  );
}

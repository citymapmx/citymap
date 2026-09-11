export const dynamic = 'force-dynamic';

import Image from 'next/image';
import StarRow from '../../../components/ui/StarRow';
import Icon from '../../../components/ui/Icon';
import MapButton from '../../../components/MapButton';
import ActionButtons from '../../../components/ActionButtons';
import BackButton from '../../../components/BackButton';

async function getBusiness(city, slug) {
  let q = `slug=eq.${slug}`;
  let res = await fetch(`${process.env.VITE_SUPABASE_URL}/rest/v1/businesses?${q}&city_slug=eq.${city}&select=*`, {
    headers: { apikey: process.env.VITE_SUPABASE_ANON_KEY, Authorization: `Bearer ${process.env.VITE_SUPABASE_ANON_KEY}` }
  });
  let data = await res.json();
  
  if (!data || data.length === 0) {
    const searchName = slug.split("-").join("%25");
    res = await fetch(`${process.env.VITE_SUPABASE_URL}/rest/v1/businesses?name=ilike.*${searchName}*&city_slug=eq.${city}&select=*`, {
      headers: { apikey: process.env.VITE_SUPABASE_ANON_KEY, Authorization: `Bearer ${process.env.VITE_SUPABASE_ANON_KEY}` }
    });
    data = await res.json();
  }
  return data && data[0] ? data[0] : null;
}

export async function generateMetadata({ params }) {
  const resolvedParams = await params;
  const { city, slug } = resolvedParams;
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

  try {
    const biz = await getBusiness(city, slug);

    if (!biz) {
      return <div className="p-10 text-center text-2xl font-bold">Negocio no encontrado</div>;
    }

    const eventsRes = await fetch(`${process.env.VITE_SUPABASE_URL}/rest/v1/events?biz_id=eq.${biz.id}&status=eq.approved&select=*`, {
      headers: { apikey: process.env.VITE_SUPABASE_ANON_KEY, Authorization: `Bearer ${process.env.VITE_SUPABASE_ANON_KEY}` }
    });
    const events = await eventsRes.json();

    const reviewsRes = await fetch(`${process.env.VITE_SUPABASE_URL}/rest/v1/reviews?biz_id=eq.${biz.id}&select=*&order=created_at.desc`, {
      headers: { apikey: process.env.VITE_SUPABASE_ANON_KEY, Authorization: `Bearer ${process.env.VITE_SUPABASE_ANON_KEY}` }
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
      } : {})
    };

    return (
      <div className="max-w-[1126px] mx-auto min-h-screen bg-[#fafafa]">
        {/* JSON-LD para Google */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />

        {/* Botón de regreso */}
        <BackButton citySlug={city} />

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

          {/* EVENTOS */}
          {events && events.length > 0 && (
            <div className="mb-8">
              <h3 className="text-[17px] font-extrabold text-gray-900 mb-4">Eventos de este negocio</h3>
              <div className="flex flex-col gap-3">
                {events.map(ev => (
                  <a key={ev.id} href={`/evento/${ev.id}`} className="flex items-center gap-3 p-3 rounded-2xl border border-gray-200 bg-white hover:bg-gray-50 transition-colors">
                    {(ev.img_url || ev.img) ? <Image src={ev.img_url || ev.img} width={60} height={60} className="w-[60px] h-[60px] rounded-[10px] object-cover bg-gray-100" alt={ev.title} unoptimized={(ev.img_url || ev.img).includes('data:image')} /> : <div className="w-[60px] h-[60px] rounded-[10px] bg-gray-100" />}
                    <div className="flex-1">
                      <div className="text-[15px] font-bold text-gray-900 leading-snug">{ev.title}</div>
                      <div className="text-[13px] text-gray-500 mt-1 flex items-center gap-1"><span>📅</span> {ev.date}</div>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* RESEÑAS */}
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

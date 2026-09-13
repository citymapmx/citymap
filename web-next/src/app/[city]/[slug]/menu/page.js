export const dynamic = 'force-dynamic';

import Image from 'next/image';
import BackButton from '../../../../components/BackButton';

const SB_URL = process.env.VITE_SUPABASE_URL;
const SB_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const HEADERS = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` };

async function getBusiness(city, slug) {
  let res = await fetch(
    `${SB_URL}/rest/v1/businesses?slug=eq.${slug}&city_slug=eq.${city}&select=*`,
    { headers: HEADERS }
  );
  let data = await res.json();
  if (!data || data.length === 0) {
    // try city-prefixed slug
    res = await fetch(
      `${SB_URL}/rest/v1/businesses?slug=eq.${city}-${slug}&city_slug=eq.${city}&select=*`,
      { headers: HEADERS }
    );
    data = await res.json();
  }
  return data && data[0] ? data[0] : null;
}

async function getMenuCategories(bizId) {
  const res = await fetch(
    `${SB_URL}/rest/v1/store_categories?business_id=eq.${bizId}&select=id,name,sort_order,store_products(id,name,description,price,image_url,is_available,sort_order)&order=sort_order.asc`,
    { headers: HEADERS }
  );
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

export async function generateMetadata({ params }) {
  const { city, slug } = await params;
  const biz = await getBusiness(city, slug);
  if (!biz) return { title: 'Menú no encontrado | CityMap' };

  const cityCapitalized = city.charAt(0).toUpperCase() + city.slice(1);
  const title = `Menú de ${biz.name} en ${cityCapitalized} | Precios y Pedidos`;
  const desc = `Consulta el menú completo de ${biz.name} en ${cityCapitalized}. Precios actualizados, opciones y realiza tu pedido fácilmente.`;
  const img = biz.banner_url || biz.logo_url || 'https://citymap.mx/og-image.png';

  return {
    title,
    description: desc,
    alternates: { 
      canonical: `https://citymap.mx/${city}/${slug}/menu`,
      languages: {
        "es-MX": `https://citymap.mx/${city}/${slug}/menu`,
        "es": `https://citymap.world/${city}/${slug}/menu`,
        "x-default": `https://citymap.world/${city}/${slug}/menu`,
      }
    },
    openGraph: {
      title,
      description: desc,
      url: `https://citymap.mx/${city}/${slug}/menu`,
      siteName: 'CityMap',
      images: [{ url: img, width: 1200, height: 630 }],
      type: 'website',
    },
    twitter: { card: 'summary_large_image', title, description: desc, images: [img] },
  };
}

function formatPrice(price) {
  if (!price) return '';
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0 }).format(price);
}

export default async function MenuPage({ params }) {
  const { city, slug } = await params;

  const biz = await getBusiness(city, slug);
  if (!biz) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40, textAlign: 'center' }}>
        <p style={{ fontSize: 40 }}>🍽️</p>
        <h2 style={{ fontWeight: 800, fontSize: 22, marginTop: 16 }}>Negocio no encontrado</h2>
        <a href={`/${city}`} style={{ marginTop: 16, display: 'inline-block', padding: '12px 24px', background: '#0F172A', color: '#fff', borderRadius: 16, textDecoration: 'none', fontWeight: 700 }}>
          Volver
        </a>
      </div>
    );
  }

  const rawCategories = await getMenuCategories(biz.id);
  // Filter out empty categories & unavailable products
  const categories = rawCategories
    .map(cat => ({
      ...cat,
      store_products: (cat.store_products || [])
        .filter(p => p.is_available !== false)
        .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)),
    }))
    .filter(cat => cat.store_products.length > 0);

  const cover = biz.banner_url || biz.logo_url;
  const cityCapitalized = city.charAt(0).toUpperCase() + city.slice(1);

  // JSON-LD schema for Google
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Restaurant',
    name: biz.name,
    description: biz.description || '',
    url: `https://citymap.mx/${city}/${slug}/menu`,
    image: cover || '',
    address: {
      '@type': 'PostalAddress',
      addressLocality: cityCapitalized,
      addressCountry: 'MX',
    },
    ...(biz.rating ? {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: biz.rating,
        reviewCount: biz.reviews_count || 1,
      },
    } : {}),
    hasMenu: {
      '@type': 'Menu',
      name: `Menú de ${biz.name}`,
      hasMenuSection: categories.map(cat => ({
        '@type': 'MenuSection',
        name: cat.name,
        hasMenuItem: cat.store_products.map(p => ({
          '@type': 'MenuItem',
          name: p.name,
          description: p.description || '',
          offers: {
            '@type': 'Offer',
            price: p.price,
            priceCurrency: 'MXN',
          },
        })),
      })),
    },
  };

  return (
    <div style={{ minHeight: '100vh', background: '#fff', fontFamily: 'inherit' }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />

      <BackButton citySlug={city} />

      {/* Banner */}
      <div style={{ position: 'relative', width: '100%', height: 200, background: '#E2E8F0' }}>
        {cover && (
          <Image src={cover} alt={biz.name} fill style={{ objectFit: 'cover' }} sizes="100vw" priority />
        )}
        {/* Gradient overlay for readability */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 60%)' }} />
        {/* Biz name on top of banner */}
        <div style={{ position: 'absolute', bottom: 16, left: 20, right: 20 }}>
          <h1 style={{ color: '#fff', fontSize: 26, fontWeight: 900, margin: 0, textShadow: '0 1px 6px rgba(0,0,0,0.4)', lineHeight: 1.2 }}>
            {biz.name}
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, margin: '4px 0 0', fontWeight: 500 }}>
            Menú · {cityCapitalized}
          </p>
        </div>
      </div>

      {/* Menu sections */}
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '16px 16px 100px' }}>
        {categories.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94A3B8' }}>
            <p style={{ fontSize: 40 }}>📋</p>
            <p style={{ fontWeight: 700, marginTop: 12 }}>El menú aún no tiene productos disponibles</p>
          </div>
        )}

        {categories.map(cat => (
          <section key={cat.id} style={{ marginBottom: 32 }}>
            {/* Category header */}
            <h2 style={{
              fontSize: 17,
              fontWeight: 800,
              color: '#0F172A',
              margin: '0 0 12px',
              paddingBottom: 8,
              borderBottom: '2px solid #F1F5F9',
            }}>
              {cat.name}
            </h2>

            {/* Products grid */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {cat.store_products.map(product => (
                <div
                  key={product.id}
                  style={{
                    display: 'flex',
                    gap: 14,
                    padding: '12px',
                    background: '#fff',
                    borderRadius: 16,
                    border: '1px solid #F1F5F9',
                    boxShadow: '0 1px 6px rgba(0,0,0,0.04)',
                  }}
                >
                  {/* Text */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 700, fontSize: 15, color: '#0F172A', margin: '0 0 4px', lineHeight: 1.3 }}>
                      {product.name}
                    </p>
                    {product.description && (
                      <p style={{ fontSize: 13, color: '#64748B', margin: '0 0 8px', lineHeight: 1.5 }}>
                        {product.description}
                      </p>
                    )}
                    {product.price > 0 && (
                      <p style={{ fontWeight: 800, fontSize: 16, color: '#0F172A', margin: 0 }}>
                        {formatPrice(product.price)}
                      </p>
                    )}
                  </div>

                  {/* Image */}
                  {product.image_url && (
                    <div style={{ position: 'relative', width: 90, height: 90, flexShrink: 0, borderRadius: 12, overflow: 'hidden', background: '#F1F5F9' }}>
                      <Image
                        src={product.image_url}
                        alt={product.name}
                        fill
                        style={{ objectFit: 'cover' }}
                        sizes="90px"
                        unoptimized={product.image_url.startsWith('data:')}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        ))}

        {/* CTA — open full app */}
        <div style={{
          marginTop: 24,
          padding: '20px',
          background: '#F8FAFC',
          borderRadius: 20,
          textAlign: 'center',
          border: '1px solid #E2E8F0',
        }}>
          <p style={{ fontSize: 14, color: '#64748B', margin: '0 0 12px' }}>
            ¿Quieres ordenar o ver más información?
          </p>
          <a
            href={`https://citymap.mx/${city}/${slug}?intent=order`}
            style={{
              display: 'inline-block',
              padding: '12px 28px',
              background: '#0F172A',
              color: '#fff',
              borderRadius: 16,
              textDecoration: 'none',
              fontWeight: 700,
              fontSize: 15,
            }}
          >
            Abrir en CityMap →
          </a>
        </div>
      </div>
    </div>
  );
}

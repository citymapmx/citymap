import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || "https://dpkjxhjkzdlkvyotoeai.supabase.co",
  process.env.VITE_SUPABASE_ANON_KEY
);

export const revalidate = 3600;

export default async function sitemap() {
  const baseUrl = 'https://citymap.mx';

  // 1. Obtener todas las ciudades activas (la tabla `cities` tiene booleano `active`, no columna `status` ni `updated_at`)
  const { data: cities } = await supabase
    .from('cities')
    .select('slug')
    .eq('active', true);

  // 2. Obtener todos los negocios aprobados (la tabla `businesses` no tiene columna `city`; es `city_slug`)
  const { data: businesses } = await supabase
    .from('businesses')
    .select('slug, city_slug, updated_at')
    .eq('status', 'approved');

  // 3. Crear las rutas
  const sitemapData = [];

  // Rutas estáticas principales y por ciudad
  sitemapData.push({
    url: baseUrl,
    lastModified: new Date(),
    changeFrequency: 'daily',
    priority: 1,
  });

  if (cities) {
    cities.forEach(city => {
      // Home de la ciudad
      sitemapData.push({
        url: `${baseUrl}/${city.slug}`,
        lastModified: new Date(),
        changeFrequency: 'daily',
        priority: 0.9,
      });
      // Agenda de Eventos de la ciudad
      sitemapData.push({
        url: `${baseUrl}/${city.slug}/eventos`,
        lastModified: new Date(), // Los eventos cambian muy seguido
        changeFrequency: 'hourly',
        priority: 0.9,
      });
    });
  }

  // Rutas de Negocios (URL canónica: slug sin el prefijo de ciudad, como la raíz y la app de Vite)
  if (businesses) {
    businesses.forEach(biz => {
      const city = biz.city_slug || 'tepic';
      const slug = String(biz.slug || '').replace(new RegExp(`^${city}-`), '');
      if (!slug) return;
      sitemapData.push({
        url: `${baseUrl}/${city}/${slug}`,
        lastModified: biz.updated_at ? new Date(biz.updated_at) : new Date(),
        changeFrequency: 'weekly',
        priority: 0.8,
      });
    });
  }

  return sitemapData;
}

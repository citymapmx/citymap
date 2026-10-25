import { seoSite } from '../src/lib/seoRoutes.js';

export default function handler(req) {
  const { origin } = seoSite(new URL(req.url).hostname);
  const robots = `User-agent: *
Allow: /
Disallow: /admin
Disallow: /manage
Disallow: /stats/
Disallow: /cuenta
Disallow: /favoritos
Disallow: /wallet
Disallow: /scan/
Disallow: /native-auth.html
Disallow: /api/
Disallow: /*?buscar=*
Disallow: /*?q=*

Sitemap: ${origin}/sitemap.xml
`;
  return new Response(robots, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, s-maxage=3600' } });
}
export const config = { runtime: 'edge' };

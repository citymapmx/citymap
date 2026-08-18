export default async function middleware(request) {
  const ua = request.headers.get("user-agent") || "";
  const lower = ua.toLowerCase();
  
  const SEARCH_BOTS = ["googlebot", "bingbot", "yandex", "duckduckbot", "slurp"];
  const isSearchBot = SEARCH_BOTS.some(b => lower.includes(b));
  
  if (isSearchBot) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/') || url.pathname === '/sitemap.xml' || url.pathname.includes('.')) return;
    
    // Configura tu token de Prerender.io en Vercel Env (PRERENDER_TOKEN)
    const PRERENDER_TOKEN = process.env.PRERENDER_TOKEN || ""; 
    const prerenderUrl = `https://service.prerender.io/${request.url}`;
    
    try {
      const res = await fetch(prerenderUrl, {
        headers: {
          'X-Prerender-Token': PRERENDER_TOKEN,
          'User-Agent': ua
        }
      });
      if (res.ok) {
        const html = await res.text();
        return new Response(html, {
          status: 200,
          headers: { 'Content-Type': 'text/html; charset=utf-8' }
        });
      }
    } catch (e) {
      console.error("Prerender error:", e);
    }
  }
  
  // Lógica anterior para rutas con parámetros
  const url = new URL(request.url);
  const b = url.searchParams.get("b");
  const ev = url.searchParams.get("ev");
  const lugar = url.searchParams.get("lugar");
  const evento = url.searchParams.get("evento");
  const vista = url.searchParams.get("vista");
  
  if (vista) return new Response(null, { status: 302, headers: { Location: `/api/og?vista=${vista}` } });
  if (b || lugar) {
    const finalId = b || lugar.split("_").pop();
    return new Response(null, { status: 302, headers: { Location: `/api/og?b=${finalId}` } });
  }
  if (ev || evento) {
    const finalId = ev || evento.split("_").pop();
    return new Response(null, { status: 302, headers: { Location: `/api/og?ev=${finalId}` } });
  }
  
  // Los bots sociales como Facebook o WhatsApp pasarán de largo aquí
  // y serán atrapados por vercel.json que los mandará a /api/og de forma nativa.
}

export const config = {
  matcher: "/(.*)",
};

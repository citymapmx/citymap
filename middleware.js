const BOTS = ["googlebot","facebookexternalhit","twitterbot","linkedinbot","whatsapp","telegrambot","discordbot","slackbot","applebot","bingbot","pinterest","vkshare","w3c_validator"];

export default function middleware(request) {
  const ua = request.headers.get("user-agent") || "";
  const lower = ua.toLowerCase();
  const bot = BOTS.some(b => lower.includes(b));
  
  if (!bot) return;

  const url = new URL(request.url);
  
  // Prevent infinite redirects or intercepting api/sitemaps
  if (url.pathname.startsWith('/api/') || url.pathname === '/sitemap.xml') return;

  const segments = url.pathname.split('/').filter(Boolean);

  // Legacy search params
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

  // Allow clean URLs to fall through to vercel.json native rewrites
  // which return 200 OK (Facebook requires 200 OK, not 302 Redirects).
}

export const config = {
  matcher: "/(.*)",
};

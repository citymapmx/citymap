export default function handler(req) {
  const host = req.headers.get("host") || "";
  const isWorld = host.endsWith("citymap.world");
  const domain = isWorld ? "https://citymap.world" : "https://citymap.mx";
  
  const robots = `User-agent: *
Allow: /

Sitemap: ${domain}/sitemap.xml`;

  return new Response(robots, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400, s-maxage=86400",
    },
  });
}

export const config = { runtime: "edge" };

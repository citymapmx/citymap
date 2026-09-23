const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

export async function OPTIONS() {
  return new Response(null, { status: 200, headers: CORS });
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get('url');
  if (!url) return Response.json({ error: 'Missing url parameter' }, { status: 400, headers: CORS });

  try {
    const response = await fetch(url, {
      redirect: 'follow',
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    });
    const finalUrl = response.url;
    const match = finalUrl.match(/video\/(\d+)/);
    if (match?.[1]) return Response.json({ videoId: match[1], finalUrl }, { headers: CORS });
    return Response.json({ error: 'Could not extract ID from the redirected URL' }, { status: 400, headers: CORS });
  } catch (error) {
    console.error('TikTok resolve error:', error);
    return Response.json({ error: 'Fetch failed' }, { status: 500, headers: CORS });
  }
}

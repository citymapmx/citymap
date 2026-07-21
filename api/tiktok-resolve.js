export default async function handler(req, res) {
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'Missing url parameter' });

  try {
    // Realizamos la petición para seguir las redirecciones de vm.tiktok.com o similares
    const response = await fetch(url, { 
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    
    // La URL final después de la redirección
    const finalUrl = response.url;
    
    // Extraer el ID del video
    const match = finalUrl.match(/video\/(\d+)/);
    if (match && match[1]) {
      return res.status(200).json({ videoId: match[1] });
    }

    return res.status(400).json({ error: 'Could not extract ID from the redirected URL' });
  } catch (error) {
    console.error("TikTok resolve error:", error);
    return res.status(500).json({ error: 'Fetch failed' });
  }
}

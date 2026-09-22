export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!process.env.GEMINI_API_KEY) return res.status(500).json({ error: 'Falta GEMINI_API_KEY' });

  const { city, time, group, budget, vibe, businesses } = req.body;
  if (!businesses || businesses.length === 0) return res.status(400).json({ error: 'Se requieren negocios' });

  const bizList = businesses.slice(0, 40)
    .map(b => `- ${b.name} (${b.category}, ${b.isOpen ? 'abierto' : 'cerrado'})`)
    .join('\n');

  const prompt = `Eres un experto local de ${city}, México. Crea el itinerario perfecto usando SOLO los negocios de la lista.

DATOS: Hora: ${time||'ahora'} | Grupo: ${group||'2 personas'} | Presupuesto: ${budget||'moderado'} | Ambiente: ${vibe||'relajado'}

NEGOCIOS EN ${city.toUpperCase()}:
${bizList}

Crea 3-4 paradas en secuencia lógica. Prioriza negocios abiertos. Usa el nombre EXACTO de la lista.

Responde SOLO con este esquema JSON estricto y NADA MÁS:
{"titulo":"nombre creativo 4-5 palabras","emoji":"emoji del plan","paradas":[{"nombre":"Nombre Exacto","tipo":"tipo de parada","descripcion":"por qué es perfecta (1-2 oraciones)","tip":"tip local corto"}],"resumen":"frase motivadora final max 15 palabras"}`;

  const apiKey = process.env.GEMINI_API_KEY.replace(/['"]/g, '').trim();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      contents: [{ role: 'user', parts: [{ text: prompt }] }], 
      generationConfig: { temperature: 0.85, responseMimeType: 'application/json' } 
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    return res.status(500).json({ error: 'Error IA: ' + errText });
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!text) return res.status(500).json({ error: 'Sin contenido' });

  try {
    return res.status(200).json({ plan: JSON.parse(text) });
  } catch {
    return res.status(500).json({ error: 'JSON inválido', raw: text });
  }
}

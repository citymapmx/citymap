export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!process.env.GROQ_API_KEY) return res.status(500).json({ error: 'Falta GROQ_API_KEY' });

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

Responde SOLO este JSON:
{"titulo":"nombre creativo 4-5 palabras","emoji":"emoji del plan","paradas":[{"nombre":"Nombre Exacto","tipo":"tipo de parada","descripcion":"por qué es perfecta (1-2 oraciones)","tip":"tip local corto"}],"resumen":"frase motivadora final max 15 palabras"}`;

  const models = ['llama-3.3-70b-versatile','llama-3.1-70b-versatile','llama3-70b-8192','mixtral-8x7b-32768'];
  let response, errText = '';

  for (const model of models) {
    response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.GROQ_API_KEY}` },
      body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }], max_tokens: 800, temperature: 0.85, response_format: { type: 'json_object' } })
    });
    if (response.ok) break;
    errText = await response.text();
    if (response.status === 401 || response.status === 429) break;
  }

  if (!response?.ok) return res.status(500).json({ error: 'Error IA: ' + errText });

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) return res.status(500).json({ error: 'Sin contenido' });

  try {
    return res.status(200).json({ plan: JSON.parse(text) });
  } catch {
    return res.status(500).json({ error: 'JSON inválido', raw: text });
  }
}

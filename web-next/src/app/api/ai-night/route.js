const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new Response(null, { status: 200, headers: CORS });
}

export async function POST(req) {
  if (!process.env.GEMINI_API_KEY)
    return Response.json({ error: 'Falta GEMINI_API_KEY' }, { status: 500, headers: CORS });

  const { city, time, group, budget, vibe, businesses } = await req.json();
  if (!businesses || businesses.length === 0)
    return Response.json({ error: 'Se requieren negocios' }, { status: 400, headers: CORS });

  const bizList = businesses.slice(0, 40)
    .map(b => `- ${b.name} (${b.category}, ${b.isOpen ? 'abierto' : 'cerrado'})`)
    .join('\n');

  const prompt = `Eres un experto local de ${city}, México. Crea el itinerario perfecto usando SOLO los negocios de la lista.

DATOS: Hora: ${time || 'ahora'} | Grupo: ${group || '2 personas'} | Presupuesto: ${budget || 'moderado'} | Ambiente: ${vibe || 'relajado'}

NEGOCIOS EN ${city.toUpperCase()}:
${bizList}

Crea 3-4 paradas en secuencia lógica. Prioriza negocios abiertos. Usa el nombre EXACTO de la lista.

Responde SOLO con este esquema JSON estricto y NADA MÁS:
{"titulo":"nombre creativo 4-5 palabras","emoji":"emoji del plan","paradas":[{"nombre":"Nombre Exacto","tipo":"tipo de parada","descripcion":"por qué es perfecta (1-2 oraciones)","tip":"tip local corto"}],"resumen":"frase motivadora final max 15 palabras"}`;

  const apiKey = process.env.GEMINI_API_KEY.replace(/['"]/g, '').trim();
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.85, responseMimeType: 'application/json' },
      }),
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    return Response.json({ error: 'Error IA: ' + errText }, { status: 500, headers: CORS });
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!text) return Response.json({ error: 'Sin contenido' }, { status: 500, headers: CORS });

  try {
    return Response.json({ plan: JSON.parse(text) }, { headers: CORS });
  } catch {
    return Response.json({ error: 'JSON inválido', raw: text }, { status: 500, headers: CORS });
  }
}

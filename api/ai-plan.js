export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const authHeader = req.headers['authorization'];
  const secret = authHeader?.replace('Bearer ', '');
  if (!secret || secret !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  if (!process.env.GROQ_API_KEY) {
    return res.status(500).json({ error: 'Falta configurar GROQ_API_KEY' });
  }

  const { title, tags, planType } = req.body;

  if (!title) {
    return res.status(400).json({ error: 'Se requiere un título' });
  }

  const prompt = `Eres un copywriter experto en viajes y experiencias. Escribe una descripción atractiva e informal de máximo 280 caracteres para un "${planType || 'plan'}" llamado "${title}". ${tags?.length > 0 ? `Considera estas temáticas: ${tags.join(', ')}.` : ''} 
  
La descripción debe entusiasmar e invitar a la gente a participar. Usa un tono moderno.
Responde ÚNICAMENTE con el texto de la descripción, sin usar comillas al inicio ni al final, sin saludos, sin "Aquí tienes la descripción". Solo el texto directo.`;

  const modelsToTry = [
    'llama-3.3-70b-versatile',
    'llama-3.1-70b-versatile',
    'llama3-70b-8192', 
    'mixtral-8x7b-32768'
  ];

  let response;
  let errText = '';

  for (const model of modelsToTry) {
    response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 150,
        temperature: 0.7,
      })
    });

    if (response.ok) break;
    else {
      errText = await response.text();
      // Break only on Auth errors or Rate limits. Continue to next model on other errors (like model not found).
      if (response.status === 401 || response.status === 429) break;
    }
  }

  if (!response || !response.ok) {
    return res.status(500).json({ error: 'Error de IA (Groq ' + response?.status + '): ' + errText });
  }

  const data = await response.json();
  let text = data.choices?.[0]?.message?.content?.trim();

  if (!text) {
    return res.status(500).json({ error: 'Groq no devolvió contenido' });
  }

  // Remove quotes if the AI added them anyway
  text = text.replace(/^["']|["']$/g, '').trim();

  return res.status(200).json({ description: text });
}

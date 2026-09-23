const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new Response(null, { status: 200, headers: CORS });
}

export async function POST(req) {
  const authHeader = req.headers.get('authorization');
  const secret = authHeader?.replace('Bearer ', '');
  if (!secret || secret !== process.env.ADMIN_SECRET)
    return Response.json({ error: 'No autorizado' }, { status: 401, headers: CORS });

  if (!process.env.GEMINI_API_KEY)
    return Response.json({ error: 'Falta configurar GEMINI_API_KEY' }, { status: 500, headers: CORS });

  const { imageBase64, mimeType } = await req.json();
  if (!imageBase64)
    return Response.json({ error: 'Se requiere una imagen en base64' }, { status: 400, headers: CORS });

  const prompt = `Analiza la imagen y extrae todos los productos visibles.

Responde SOLO con JSON válido:

{
  "categories": [
    {
      "name": "",
      "items": [
        { "name": "", "description": "", "price": null }
      ]
    }
  ]
}

Reglas:
- Sin texto adicional.
- price = número sin símbolo de moneda.
- Si no se ve el precio, usa null.
- Si no hay categorías, usa "General".
- Mantén nombres exactamente como aparecen.
- description vacía si no existe.`;

  try {
    const apiKey = process.env.GEMINI_API_KEY.replace(/['"]/g, '').trim();
    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              { inline_data: { mime_type: mimeType || 'image/jpeg', data: imageBase64 } },
            ],
          }],
          generationConfig: { temperature: 0.1, response_mime_type: 'application/json' },
        }),
      }
    );

    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || 'Error en la API de Gemini');

    let textResult = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textResult) throw new Error('Respuesta vacía de la IA');

    let parsedJson;
    try {
      parsedJson = JSON.parse(textResult);
    } catch {
      textResult = textResult.replace(/```json/g, '').replace(/```/g, '').trim();
      parsedJson = JSON.parse(textResult);
    }

    return Response.json({ success: true, result: parsedJson }, { headers: CORS });
  } catch (error) {
    console.error('AI Processing Error:', error);
    return Response.json({ error: error.message || 'Error procesando la imagen' }, { status: 500, headers: CORS });
  }
}

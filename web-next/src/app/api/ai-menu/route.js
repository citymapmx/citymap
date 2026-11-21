import { requireAdmin } from '../../../lib/requireAdmin.js';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new Response(null, { status: 200, headers: CORS });
}

export async function POST(req) {
  // Auth de admin por JWT de sesión. El secreto compartido (ADMIN_SECRET)
  // ya NO autoriza: vivía incrustado en el bundle del cliente y cualquier
  // visitante podía leerlo y gastar la cuota de Gemini. Ver
  // web-next/src/lib/requireAdmin.js.
  const admin = await requireAdmin(req);
  if (!admin.ok) {
    return Response.json(
      { error: admin.status === 403 ? 'Forbidden: se requiere administrador' : 'No autorizado' },
      { status: admin.status || 401, headers: CORS },
    );
  }

  const body = await req.json();

  // Modo "generar-descripcion": el panel de experiencias pedía a un
  // webhook de Make.com directamente desde el navegador (URL y secreto en
  // el cliente). Ahora el proxy vive aquí: la URL y el secreto solo existen
  // en variables de entorno del servidor (MAKE_WEBHOOK_URL y
  // MAKE_WEBHOOK_SECRET; si esta última no está, se usa ADMIN_SECRET solo
  // en el servidor). Sin función nueva: mismo endpoint de IA.
  if (body?.action === 'generar-descripcion') {
    return handleGenerarDescripcion(body);
  }

  if (!process.env.GEMINI_API_KEY)
    return Response.json({ error: 'Falta configurar GEMINI_API_KEY' }, { status: 500, headers: CORS });

  const { imageBase64, mimeType } = body;
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

// Generar la descripción de una experiencia con el webhook de Make.com.
// El cliente solo manda título y tipo; la URL del webhook y su secreto
// nunca salen del servidor.
async function handleGenerarDescripcion(body) {
  const webhookUrl = process.env.MAKE_WEBHOOK_URL;
  if (!webhookUrl) {
    return Response.json({ error: 'Falta configurar MAKE_WEBHOOK_URL en las variables de entorno' }, { status: 500, headers: CORS });
  }
  const { title, planType } = body || {};
  if (!title || typeof title !== 'string') {
    return Response.json({ error: 'Se requiere un título' }, { status: 400, headers: CORS });
  }
  try {
    const webhookSecret = process.env.MAKE_WEBHOOK_SECRET || process.env.ADMIN_SECRET;
    const r = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(webhookSecret ? { Authorization: `Bearer ${webhookSecret}` } : {}),
      },
      body: JSON.stringify({ title, planType: planType || 'experiencia' }),
    });
    if (!r.ok) {
      return Response.json({ error: `El generador de descripciones devolvió HTTP ${r.status}` }, { status: 502, headers: CORS });
    }
    const data = await r.json().catch(() => ({}));
    return Response.json(data, { headers: CORS });
  } catch (error) {
    console.error('generar-descripcion error:', error);
    return Response.json({ error: error.message || 'Error generando la descripción' }, { status: 500, headers: CORS });
  }
}

/* global process */
import { requireAdmin } from '../src/lib/requireAdmin.js';

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Auth de admin por JWT de sesión. El secreto compartido (ADMIN_SECRET)
  // ya NO autoriza: vivía incrustado en el bundle del cliente y cualquier
  // visitante podía leerlo y gastar la cuota de Gemini. Ver
  // src/lib/requireAdmin.js.
  const admin = await requireAdmin(req);
  if (!admin.ok) {
    return res.status(admin.status || 401).json({ error: admin.status === 403 ? 'Forbidden: se requiere administrador' : 'No autorizado' });
  }

  // Modo "generar-descripcion": el panel de experiencias pedía a un
  // webhook de Make.com directamente desde el navegador (URL y secreto en
  // el cliente). Ahora el proxy vive aquí: la URL y el secreto solo existen
  // en variables de entorno del servidor (MAKE_WEBHOOK_URL y
  // MAKE_WEBHOOK_SECRET; si esta última no está, se usa ADMIN_SECRET solo
  // en el servidor). Sin función nueva: mismo endpoint de IA.
  if (req.body?.action === 'generar-descripcion') {
    return handleGenerarDescripcion(req, res);
  }

  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ error: 'Falta configurar GEMINI_API_KEY en las variables de entorno' });
  }

  const { imageBase64, mimeType, businessType } = req.body;

  if (!imageBase64) {
    return res.status(400).json({ error: 'Se requiere una imagen en base64' });
  }

  const prompt = `Analiza la imagen y extrae todos los productos visibles.

Responde SOLO con JSON válido:

{
  "categories": [
    {
      "name": "",
      "items": [
        {
          "name": "",
          "description": "",
          "price": null
        }
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
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inline_data: {
                  mime_type: mimeType || 'image/jpeg',
                  data: imageBase64
                }
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.1,
          response_mime_type: "application/json"
        }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || 'Error en la API de Gemini');
    }

    const textResult = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!textResult) {
      throw new Error('Respuesta vacía de la IA');
    }

    let parsedJson;
    try {
      parsedJson = JSON.parse(textResult);
    } catch (e) {
      // Limpiar posibles etiquetas markdown residuales
      let clean = textResult.replace(/```json/g, '').replace(/```/g, '').trim();
      parsedJson = JSON.parse(clean);
    }

    return res.status(200).json({ success: true, result: parsedJson });
  } catch (error) {
    console.error('AI Processing Error:', error);
    return res.status(500).json({ error: error.message || 'Error procesando la imagen' });
  }
}

// Generar la descripción de una experiencia con el webhook de Make.com.
// El cliente solo manda título y tipo; la URL del webhook y su secreto
// nunca salen del servidor.
async function handleGenerarDescripcion(req, res) {
  const webhookUrl = process.env.MAKE_WEBHOOK_URL;
  if (!webhookUrl) {
    return res.status(500).json({ error: 'Falta configurar MAKE_WEBHOOK_URL en las variables de entorno' });
  }
  const { title, planType } = req.body || {};
  if (!title || typeof title !== 'string') {
    return res.status(400).json({ error: 'Se requiere un título' });
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
      return res.status(502).json({ error: `El generador de descripciones devolvió HTTP ${r.status}` });
    }
    const data = await r.json().catch(() => ({}));
    return res.status(200).json(data);
  } catch (error) {
    console.error('generar-descripcion error:', error);
    return res.status(500).json({ error: error.message || 'Error generando la descripción' });
  }
}

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Admin Auth
  const authHeader = req.headers['authorization'];
  const secret = authHeader?.replace('Bearer ', '');
  if (!secret || secret !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  if (!process.env.GROQ_API_KEY) {
    return res.status(500).json({ error: 'Falta configurar GROQ_API_KEY en Vercel' });
  }

  const { imageBase64, mimeType, businessType } = req.body;

  if (!imageBase64) {
    return res.status(400).json({ error: 'Se requiere una imagen en base64' });
  }

  const prompt = `Eres un asistente experto en digitalizar menús y catálogos de negocios en México.

Analiza esta imagen y extrae TODOS los productos/platillos/servicios que veas.

Devuelve ÚNICAMENTE un JSON válido con esta estructura exacta (sin texto adicional, sin markdown, solo el JSON):
{
  "categories": [
    {
      "name": "Nombre de categoría",
      "items": [
        {
          "name": "Nombre del producto",
          "description": "Descripción breve si existe",
          "price": 120
        }
      ]
    }
  ]
}

Reglas:
- Si el precio no es claro, usa null
- Si no hay categorías visibles, agrupa todos en "General"
- Infiere categorías lógicas si el menú no las tiene (Entradas, Platos Fuertes, Bebidas, Postres, etc.)
- Los precios deben ser números sin símbolo de moneda
- Los nombres deben ser exactamente como aparecen en el menú
- El negocio es de tipo: ${businessType || 'restaurante/tienda'}`;

  try {
    const modelsToTry = [
      'llama-3.2-90b-vision-instruct',
      'llama-3.2-11b-vision-instruct',
      'llama-3.2-90b-vision',
      'llama-3.2-11b-vision',
      'llama-3.2-11b-vision-preview',
      'llama-3.2-90b-vision-preview',
      'qwen-vl-plus',
      'qwen/qwen3.6-27b'
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
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: prompt + '\nCRÍTICO: NO uses etiquetas <think>. NO pienses en voz alta. Genera el JSON directamente.' },
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:${mimeType || 'image/jpeg'};base64,${imageBase64}`,
                  }
                }
              ]
            }
          ],
          max_tokens: 8192,
          temperature: 0.1,
        })
      });

      if (response.ok) {
        break; // Success!
      } else {
        errText = await response.text();
        console.warn(`Groq API error with model ${model}:`, errText);
        // If it's a decommissioned error or similar model error, try the next one.
        if (!errText.includes('decommissioned') && !errText.includes('does not exist')) {
          break; // It's another type of error, stop trying.
        }
      }
    }

    if (!response || !response.ok) {
      let parsedErr;
      try {
        parsedErr = JSON.parse(errText);
      } catch (e) {}
      
      const details = parsedErr?.error?.message || errText;
      return res.status(500).json({ error: 'Error de IA (Groq ' + response?.status + '): ' + details });
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content;

    if (!text) {
      return res.status(500).json({ error: 'Groq no devolvió contenido' });
    }

    // Parse JSON from response
    let jsonText = text.trim();
    
    if (jsonText.includes('<think>')) {
      jsonText = jsonText.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
    }

    if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    }

    const startIndex = jsonText.indexOf('{');
    const endIndex = jsonText.lastIndexOf('}');
    if (startIndex !== -1 && endIndex !== -1) {
      jsonText = jsonText.substring(startIndex, endIndex + 1);
    }

    const parsed = JSON.parse(jsonText);
    return res.status(200).json({ success: true, result: parsed });

  } catch (err) {
    console.error('Error en ai-menu:', err);
    return res.status(500).json({ error: 'Error procesando la imagen: ' + err.message });
  }
}

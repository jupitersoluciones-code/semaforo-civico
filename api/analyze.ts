// Endpoint Serverless Vercel: /api/analyze
// Responsable: Security Engineer & Backend Architect
// Oculta GEMINI_API_KEY, aplica control de rate-limit por IP y manejo resiliente de errores.

const ipLimits = new Map<string, number[]>();

function getClientIp(req: any): string {
  const forwarded = req.headers?.['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.headers?.['x-real-ip'] || req.socket?.remoteAddress || '127.0.0.1';
}

function checkRateLimit(key: string, max: number, windowMs: number) {
  const now = Date.now();
  let record = ipLimits.get(key) || [];
  record = record.filter((t) => now - t < windowMs);

  if (record.length >= max) {
    const resetInMs = Math.max(0, windowMs - (now - record[0]));
    return { allowed: false, remaining: 0, resetInMs };
  }

  record.push(now);
  ipLimits.set(key, record);
  return { allowed: true, remaining: max - record.length, resetInMs: windowMs };
}

export default async function handler(req: any, res: any) {
  const allowedOrigin = process.env.ALLOWED_ORIGIN || '*';
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido. Utiliza POST.' });
  }

  // Rate Limiting: Máximo 6 análisis de IA por IP cada 5 minutos
  const clientIp = getClientIp(req);
  const limit = checkRateLimit(`ai_${clientIp}`, 6, 300000);
  res.setHeader('X-RateLimit-Remaining', limit.remaining);

  if (!limit.allowed) {
    return res.status(429).json({
      error: `Has superado el límite de consultas al Asistente IA. Por favor espera ${Math.ceil(
        limit.resetInMs / 1000,
      )} segundos antes de volver a consultar.`,
    });
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
  if (!apiKey || apiKey === 'PLACEHOLDER_API_KEY') {
    return res.status(503).json({
      error: 'El servicio de IA no está configurado en el servidor (falta GEMINI_API_KEY).',
    });
  }

  try {
    const { contract } = req.body || {};
    if (!contract || typeof contract !== 'object') {
      return res.status(400).json({ error: 'Se requiere el objeto contract en el cuerpo de la solicitud.' });
    }

    const { name, contractor, value, procurementMethod, executionPercentage } = contract;

    const cleanName = String(name || 'N/A').substring(0, 500);
    const cleanContractor = String(contractor || 'N/A').substring(0, 200);
    const cleanProcurement = String(procurementMethod || 'N/A').substring(0, 100);

    const prompt = `
Analiza este contrato público colombiano y señala riesgos de corrupción o irregularidades:

- Objeto: ${cleanName}
- Contratista: ${cleanContractor}
- Valor: COP ${(Number(value) || 0).toLocaleString('es-CO')}
- Modalidad: ${cleanProcurement}
- Ejecución física/financiera estimada: ${Number(executionPercentage) || 0}%

Proporciona de forma concisa y estructurada:
1. Resumen ejecutivo de la contratación
2. Señales de alerta específicas (si existen: sobrecostos, fraccionamiento, adición excesiva >50%, concentración o plazos desproporcionados)
3. Preguntas clave y recomendaciones para las veedurías ciudadanas y órganos de control (Contraloría/Procuraduría)

Responde en español de forma profesional, clara y objetiva.
`;

    const geminiModel = process.env.GEMINI_MODEL || 'gemini-3.6-flash';
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${encodeURIComponent(
      apiKey,
    )}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);

    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 900,
        },
      }),
    });

    clearTimeout(timeout);

    if (!response.ok) {
      if (response.status === 429) {
        return res.status(429).json({
          error: 'La cuota de la API de IA está saturada momentáneamente. Por favor reintenta en un minuto.',
        });
      }
      if (response.status === 503) {
        return res.status(503).json({
          error: 'El servicio de IA de Google está experimentando alta demanda momentánea. Por favor intenta nuevamente en unos segundos.',
        });
      }
      const errText = await response.text();
      console.error('Error de Gemini API:', errText);
      return res.status(response.status).json({
        error: `Error del proveedor de IA (${response.status}): ${response.statusText}`,
      });
    }

    const data = await response.json();
    const candidate = data.candidates?.[0];
    const text = candidate?.content?.parts?.map((p: any) => p.text || '').join('\n').trim();

    if (!text) {
      return res.status(500).json({ error: 'La IA no devolvió ninguna respuesta válida.' });
    }

    return res.status(200).json({ text });
  } catch (error: any) {
    console.error('Error en /api/analyze:', error);
    const isTimeout = error.name === 'AbortError';
    return res.status(500).json({
      error: isTimeout
        ? 'El servicio de IA tardó demasiado en responder (tiempo límite excedido).'
        : error?.message || 'Error interno al procesar el análisis con IA.',
    });
  }
}

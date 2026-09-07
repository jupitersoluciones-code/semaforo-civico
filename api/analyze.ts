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
    const { contract, mode = 'forensic', auditFocus = 'forensic' } = req.body || {};
    if (!contract || typeof contract !== 'object') {
      return res.status(400).json({ error: 'Se requiere el objeto contract en el cuerpo de la solicitud.' });
    }

    const {
      id,
      name,
      contractor,
      value,
      initialValue,
      procurementMethod,
      executionPercentage,
      entityName,
      processNumber,
      moneyAdditionPercentage,
      timeAdditionPercentage,
      status,
    } = contract;

    const cleanId = String(id || 'N/A');
    const cleanName = String(name || 'N/A').substring(0, 500);
    const cleanContractor = String(contractor || 'N/A').substring(0, 200);
    const cleanProcurement = String(procurementMethod || 'N/A').substring(0, 100);
    const cleanEntity = String(entityName || 'Entidad Pública').substring(0, 200);
    const valNum = Number(value) || 0;
    const initialNum = Number(initialValue) || valNum;
    const execPct = Number(executionPercentage) || 0;
    const addMoneyPct = Number(moneyAdditionPercentage) || 0;
    const addTimePct = Number(timeAdditionPercentage) || 0;

    const systemPrompt = `
# SYSTEM INSTRUCTION: FORENSIC AUDIT ENGINE FOR PUBLIC PROCUREMENT (FAEPP)
Eres la inteligencia central de auditoría forense en contratación pública estatal (Estatuto General de Contratación Ley 80/1993, Ley 1150/2007, Ley 1474/2011 Estatuto Anticorrupción, Ley 2195/2022).
Operas con 30 años de experiencia pericial de élite y bajo el principio de **EXTREMO ESCEPTICISMO PROFESIONAL**: la documentación oficial puede ser formalmente legal mientras materialmente es fraudulenta o lesiva para el erario.

Módulos de investigación forense a evaluar:
- **MÓDULO A (Colusión, Proformas Falsas y Bid Rigging)**: Vínculos operacionales, empresas de papel/fachada creadas para licitar, ofertas de cobertura, variación lineal en propuestas competidoras.
- **MÓDULO B (Pliegos Sastre y Direccionamiento)**: Exigencias hiper-restrictivas desproporcionadas, cronogramas comprimidos, índices financieros a la medida del proponente preseleccionado.
- **MÓDULO C (Anticipos, Sobrecostos y Desfase Físico-Financiero)**: Amortización de anticipos vs avance físico real, adiciones presupuestales lesivas (>50% Contratos Avispa), facturación apócrifa.

Enfoque de auditoría solicitado: ${auditFocus.toUpperCase()} (Preventiva, Disuasiva o Forense).

## DATOS DEL PROCESO AUDITADO:
- ID Contrato / Proceso: ${cleanId} ${processNumber ? `(Proceso: ${processNumber})` : ''}
- Entidad Contratante: ${cleanEntity}
- Contratista / Licitante Adjudicado: ${cleanContractor}
- Objeto Contractual: ${cleanName}
- Valor Actual: COP ${valNum.toLocaleString('es-CO')} ${initialNum && initialNum !== valNum ? `(Valor Inicial: COP ${initialNum.toLocaleString('es-CO')})` : ''}
- Modalidad de Contratación: ${cleanProcurement}
- Porcentaje de Adición Presupuestal: ${addMoneyPct}%
- Porcentaje de Adición de Plazo: ${addTimePct}%
- Avance Físico/Financiero Reportado: ${execPct}%
- Semáforo Preliminar: ${status || 'No determinado'}

## INSTRUCCIÓN DE SALIDA:
Genera un informe pericial estructurado en formato Markdown impecable con:
1. **DICTAMEN EJECUTIVO FORENSE**: Conclusión categórica sobre el cumplimiento de los principios de transparencia, objetividad y economía.
2. **EVALUACIÓN DE MÓDULOS PERICIALES**:
   - Módulo A: Riesgo de colusión y evaluación de empresa de papel.
   - Módulo B: Riesgo de pliego sastre y direccionamiento contractual.
   - Módulo C: Riesgo de sobrecostos, anticipos y desfase de ejecución de obra.
3. **MATRIZ ESTANDARIZADA DE HALLAZGOS FORENSES (HAL-FORENSIC)**:
   Presenta una tabla clara con:
   | Código Hallazgo | Criterio (Norma Violada) | Condición (Hecho Probado) | Causa Raíz | Efecto (Detrimento/Impacto) | Responsabilidad (Cargos) | Alcance Legal (Penal / Fiscal / Disciplinario) |
4. **ACCIONES PROBATORIAS INMEDIATAS (PARA VEEDURÍAS Y ENTES DE CONTROL)**:
   Lista numerada con pruebas documentales y técnicas a requerir formalmente (inspección de obra, libros contables, trazabilidad bancaria de anticipos).

Sé incisivo, técnico, objetivo y jurídicamente riguroso.`;

    const geminiModel = process.env.GEMINI_MODEL || 'gemini-3.6-flash';
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${encodeURIComponent(
      apiKey,
    )}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);

    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [{ parts: [{ text: systemPrompt }] }],
        generationConfig: {
          temperature: 0.15,
          maxOutputTokens: 1800,
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

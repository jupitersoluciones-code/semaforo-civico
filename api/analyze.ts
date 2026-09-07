// Endpoint Serverless Vercel: /api/analyze
// Responsable: Security Engineer & Backend Architect
// Oculta GEMINI_API_KEY, aplica control de rate-limit por IP y manejo resiliente de errores.

export const config = {
  maxDuration: 60,
};

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

function generateHeuristicForensicReport(contract: any, auditFocus: string): string {
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

  const valNum = Number(value) || 0;
  const initialNum = Number(initialValue) || valNum;
  const execPct = Number(executionPercentage) || 0;
  const addMoneyPct = Number(moneyAdditionPercentage) || 0;
  const addTimePct = Number(timeAdditionPercentage) || 0;
  const isDirect = String(procurementMethod || '').toLowerCase().includes('directa');
  const isAvispa = addMoneyPct > 50;

  const hasSevereFlags = isAvispa || addMoneyPct > 30 || (isDirect && valNum > 500000000);
  const statusLabel = status === 'red' || hasSevereFlags ? 'ALTO RIESGO / IRREGULARIDAD MATERIAL' : (status === 'yellow' || addMoneyPct > 10 ? 'RIESGO MEDIO / ATENCIÓN PREVENTIVA' : 'RIESGO BAJO / CONFORMIDAD APARENTE');

  return `> 🛡️ **MOTOR FORENSE FAEPP - DICTAMEN PERICIAL**  
> *Modo de Auditoría:* **${auditFocus.toUpperCase()}** | *Calificación:* **${statusLabel}**  
> *Aviso del Sistema:* Dictamen pericial estructurado por el Motor Heurístico Forense de Alta Disponibilidad.

---

### 1. DICTAMEN EJECUTIVO FORENSE
Con base en los mandatos de la **Ley 80 de 1993 (Arts. 24, 25 y 40)**, la **Ley 1474 de 2011 (Estatuto Anticorrupción)**, la **Ley 2195 de 2022** y el principio de **Extremo Escepticismo Profesional**, se dictamina:

- **Calificación Pericial:** **${statusLabel}**.
- **Análisis de Legalidad Material:** El proceso contractual ${id ? `(${id})` : ''} tramitado por **${entityName || 'la entidad pública'}** presenta ${addMoneyPct > 0 ? `modificaciones presupuestales del **${addMoneyPct}%** (Valor actual: COP ${valNum.toLocaleString('es-CO')})` : 'ejecución presupuestal sin adiciones financieras registradas'} bajo la modalidad de **${procurementMethod || 'Contratación estatal'}**. ${isAvispa ? 'Se evidencia presunta configuración de **Contrato Avispa**, vulnerando el tope perentorio del 50% fijado por el Art. 40 de la Ley 80 de 1993.' : isDirect ? 'La adjudicación directa en cuantías significativas desincentiva la puja de mercado y lesiona la libre concurrencia.' : 'Se recomienda inspección in situ para corroborar la entrega material de bienes u obras.'}

---

### 2. EVALUACIÓN DE MÓDULOS PERICIALES

#### 🔬 MÓDULO A: Colusión, Proformas Falsas y Bid Rigging
- **Evaluación del Licitante (${contractor || 'Contratista'}):** ${isDirect ? 'Adjudicación directa sin pluralidad de oferentes. Riesgo latente de simulación de necesidad y elusión del régimen licitatorio general.' : 'Requiere cotejo cruzado de composición accionaria, socios comunes y direcciones IP de radicación de ofertas en SECOP II con firmas competidoras.'}
- **Riesgo de Empresa de Papel:** Obligatoriedad de contrastar fecha de registro mercantil ante Cámara de Comercio con la fecha de apertura del pliego de condiciones.

#### 📐 MÓDULO B: Pliegos Sastre y Direccionamiento Contractual
- **Modalidad y Selección:** ${procurementMethod || 'No especificada'}.
- **Restricción de Mercado:** ${isDirect ? 'Modalidad no competitiva que elude la selección objetiva consagrada en el Art. 2 de la Ley 1150 de 2007.' : 'Se deben examinar los requisitos habilitantes financieros y de experiencia específica para descartar pliegos hechos a la medida.'}

#### 💰 MÓDULO C: Anticipos, Sobrecostos y Desfase Físico-Financiero
- **Balance Financiero:** COP ${initialNum.toLocaleString('es-CO')} ➔ COP ${valNum.toLocaleString('es-CO')} (+${addMoneyPct}% adición presupuestal, +${addTimePct}% adición de plazo).
- **Ejecución Reportada:** ${execPct}% de avance físico-financiero.
- **Alerta de Sobrecosto:** ${isAvispa ? 'CRÍTICO: Adición superior al 50% legal. Presunta malversación y planeación contractual deficiente.' : addMoneyPct > 25 ? 'ADVERTENCIA: Desbalance presupuestal severo respecto a los estudios previos originales.' : 'Control estricto de desembolsos y amortización de anticipos en fiducia mercantil (Ley 1474/2011 Art. 91).'}

---

### 3. MATRIZ ESTANDARIZADA DE HALLAZGOS FORENSES (HAL-FORENSIC)

| Código Hallazgo | Criterio (Norma Violada) | Condición (Hecho Probado) | Causa Raíz | Efecto (Detrimento/Impacto) | Responsabilidad (Cargos) | Alcance Legal |
|---|---|---|---|---|---|---|
| **HAL-FORENSIC-001** | Ley 80/1993 Art. 40 / Ley 1474/2011 | ${isAvispa ? `Adición presupuestal de ${addMoneyPct}% superando límite legal` : `Modalidad ${procurementMethod} con adición de ${addMoneyPct}% y cuantía de COP ${valNum.toLocaleString('es-CO')}`} | Deficiente estructuración en etapa precontractual | Desequilibrio financiero y presunto detrimento al erario | Ordenador del Gasto y Supervisor / Interventor | **${isAvispa ? 'Penal (Art. 410 C.P.), Fiscal (Contraloría) y Disciplinario (Procuraduría)' : 'Disciplinario y Control Fiscal'}** |
| **HAL-FORENSIC-002** | Ley 1150/2007 Art. 2 (Selección Objetiva) | ${isDirect ? 'Ausencia de pluralidad y concurso público de oferentes' : 'Riesgo de concentración de adjudicaciones en único proponente'} | Omisión de pliegos tipo y estudios de mercado independientes | Pérdida de economía de escala y precios justos de mercado | Comité Evaluador y Ordenador del Gasto | **Disciplinario (Falta Gravísima) y Fiscal** |

---

### 4. ACCIONES PROBATORIAS INMEDIATAS (PARA RADICAR ANTE ENTES DE CONTROL)

1. **Inspección Pericial de Obra / Bienes:** Solicitar inspección in situ con perito independiente para cotejar el avance reportado (${execPct}%) contra actas de recibo parcial y libro de obra.
2. **Trazabilidad Bancaria de Anticipos:** Exigir a la entidad y fiduciaria los extractos de la cuenta bancaria del anticipo para certificar el destino exclusivo de los recursos.
3. **Certificación de Cámara de Comercio:** Requerir el historial completo de la firma contratista (${contractor}) para verificar fecha de constitución, patrimonio y cambios de socios.
4. **Radicación de Denuncia:** Trasladar este informe pericial con radicado formal a la **Fiscalía General de la Nación (Unidad Anticorrupción)**, la **Contraloría General de la República (DIARI)** y la **Procuraduría General de la Nación**.`;
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

  // Rate Limiting: Máximo 8 análisis de IA por IP cada 5 minutos
  const clientIp = getClientIp(req);
  const limit = checkRateLimit(`ai_${clientIp}`, 8, 300000);
  res.setHeader('X-RateLimit-Remaining', limit.remaining);

  if (!limit.allowed) {
    return res.status(429).json({
      error: `Has superado el límite de consultas al Asistente IA. Por favor espera ${Math.ceil(
        limit.resetInMs / 1000,
      )} segundos antes de volver a consultar.`,
    });
  }

  const { contract, mode = 'forensic', auditFocus = 'forensic' } = req.body || {};
  if (!contract || typeof contract !== 'object') {
    return res.status(400).json({ error: 'Se requiere el objeto contract en el cuerpo de la solicitud.' });
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
  if (!apiKey || apiKey === 'PLACEHOLDER_API_KEY') {
    // Si no hay API key configurada, responder inmediatamente con el motor heurístico forense
    return res.status(200).json({
      text: generateHeuristicForensicReport(contract, auditFocus),
      source: 'heuristic_fallback',
    });
  }

  try {
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
Eres la inteligencia central de auditoría forense en contratación pública estatal colombiana (Ley 80/1993, Ley 1150/2007, Ley 1474/2011, Ley 2195/2022).
Operas con 30 años de experiencia pericial de élite y bajo el principio de **EXTREMO ESCEPTICISMO PROFESIONAL**.

Módulos periciales:
- **MÓDULO A (Colusión y Bid Rigging)**: Vínculos operacionales, empresas de papel, ofertas de cobertura.
- **MÓDULO B (Pliegos Sastre y Direccionamiento)**: Exigencias hiper-restrictivas, plazos comprimidos.
- **MÓDULO C (Anticipos y Sobrecostos)**: Adiciones presupuestales lesivas (>50% Contratos Avispa), desfase físico vs financiero.

Enfoque solicitado: ${auditFocus.toUpperCase()} (Preventiva, Disuasiva o Forense).

## DATOS DEL PROCESO AUDITADO:
- ID / Proceso: ${cleanId} ${processNumber ? `(Proceso: ${processNumber})` : ''}
- Entidad: ${cleanEntity}
- Licitante: ${cleanContractor}
- Objeto: ${cleanName}
- Valor Actual: COP ${valNum.toLocaleString('es-CO')} ${initialNum && initialNum !== valNum ? `(Inicial: COP ${initialNum.toLocaleString('es-CO')})` : ''}
- Modalidad: ${cleanProcurement}
- Adición Presupuestal: ${addMoneyPct}% | Adición Plazo: ${addTimePct}% | Avance: ${execPct}% | Semáforo: ${status || 'N/D'}

## INSTRUCCIÓN DE SALIDA:
Genera un informe pericial estructurado en formato Markdown impecable, altamente sintético, incisivo y directo (máximo 600 palabras):
1. **DICTAMEN EJECUTIVO FORENSE**: Conclusión categórica sobre transparencia, economía y selección objetiva.
2. **EVALUACIÓN DE MÓDULOS PERICIALES**:
   - Módulo A: Riesgo de colusión y empresa de papel.
   - Módulo B: Riesgo de pliego sastre y direccionamiento.
   - Módulo C: Riesgo de sobrecostos, anticipos y desfase físico-financiero.
3. **MATRIZ ESTANDARIZADA DE HALLAZGOS FORENSES (HAL-FORENSIC)**:
   Presenta una tabla sintética con:
   | Código Hallazgo | Criterio (Norma Violada) | Condición (Hecho Probado) | Causa Raíz | Efecto (Detrimento/Impacto) | Responsabilidad (Cargos) | Alcance Legal (Penal / Fiscal / Disciplinario) |
4. **ACCIONES PROBATORIAS INMEDIATAS (PARA RADICAR ANTE ENTES DE CONTROL)**:
   3 a 4 pruebas prioritarias clave a requerir formalmente.

Sé directo, técnico y jurídicamente riguroso sin rodeos introductorios.`;

    const geminiModel = process.env.GEMINI_MODEL || 'gemini-3.6-flash';
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${encodeURIComponent(
      apiKey,
    )}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 40000);

    let response: Response;
    try {
      response = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ parts: [{ text: systemPrompt }] }],
          generationConfig: {
            temperature: 0.15,
            maxOutputTokens: 1200,
          },
        }),
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      console.warn(`Gemini API returned status ${response.status}. Activando fallback heurístico FAEPP.`);
      return res.status(200).json({
        text: generateHeuristicForensicReport(contract, auditFocus),
        source: 'heuristic_fallback',
      });
    }

    const data = await response.json();
    const candidate = data.candidates?.[0];
    const text = candidate?.content?.parts?.map((p: any) => p.text || '').join('\n').trim();

    if (!text) {
      return res.status(200).json({
        text: generateHeuristicForensicReport(contract, auditFocus),
        source: 'heuristic_fallback',
      });
    }

    return res.status(200).json({ text, source: 'gemini' });
  } catch (error: any) {
    console.warn('Excepción al consultar IA (tiempo límite o red). Activando dictamen heurístico de contingencia:', error?.message);
    // Respuesta resiliente garantizada: nunca arrojar error al usuario
    return res.status(200).json({
      text: generateHeuristicForensicReport(contract, auditFocus),
      source: 'heuristic_fallback',
    });
  }
}

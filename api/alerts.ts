// Endpoint Serverless Vercel: /api/alerts
// Responsable: Backend Architect & Security Engineer
// Permite registrar y listar alertas ciudadanas colectivas con persistencia en Base de Datos y rate limit.

import { getAlertsFromDb, saveAlertToDb, CitizenAlertRecord } from './_lib/db';
import { checkRateLimit, getClientIp } from './_lib/rateLimiter';

export default async function handler(req: any, res: any) {
  const allowedOrigin = process.env.ALLOWED_ORIGIN || '*';
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // GET /api/alerts - Listar alertas (soporta filtro opcional ?projectId=...)
  if (req.method === 'GET') {
    try {
      const { projectId } = req.query || {};
      const alerts = await getAlertsFromDb(projectId ? String(projectId) : undefined);
      return res.status(200).json({ ok: true, data: alerts });
    } catch (err: any) {
      console.error('Error al listar alertas:', err);
      return res.status(500).json({ ok: false, error: 'Error al consultar alertas ciudadanas.' });
    }
  }

  // POST /api/alerts - Crear nueva alerta ciudadana
  if (req.method === 'POST') {
    const clientIp = getClientIp(req);
    // Rate limit: Máximo 15 alertas por IP cada 1 hora
    const limit = checkRateLimit(`alert_${clientIp}`, 15, 3600000);
    res.setHeader('X-RateLimit-Remaining', limit.remaining);

    if (!limit.allowed) {
      return res.status(429).json({
        ok: false,
        error: `Has alcanzado el límite de reportes por hora. Intenta nuevamente en ${Math.ceil(
          limit.resetInMs / 60000,
        )} minutos.`,
      });
    }

    try {
      const { projectId, projectName, description, photoUrl, municipalityCode } = req.body || {};

      if (!projectId || typeof projectId !== 'string') {
        return res.status(400).json({ ok: false, error: 'El campo projectId es obligatorio.' });
      }

      if (!description || typeof description !== 'string' || description.trim().length < 10) {
        return res.status(400).json({
          ok: false,
          error: 'La descripción de la irregularidad debe tener al menos 10 caracteres.',
        });
      }

      const newAlert: CitizenAlertRecord = {
        id: `alert-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        projectId: projectId.trim(),
        projectName: (projectName || 'Contrato sin nombre').substring(0, 300),
        description: description.trim().substring(0, 3000),
        photoUrl: photoUrl && typeof photoUrl === 'string' ? photoUrl.substring(0, 1000) : null,
        status: 'Recibida',
        createdAt: new Date().toISOString(),
        municipalityCode: municipalityCode ? String(municipalityCode) : null,
      };

      const saved = await saveAlertToDb(newAlert);
      return res.status(201).json({ ok: true, data: saved });
    } catch (error: any) {
      console.error('Error procesando POST /api/alerts:', error);
      return res.status(500).json({
        ok: false,
        error: error?.message || 'Error interno al procesar el reporte de alerta.',
      });
    }
  }

  return res.status(405).json({ ok: false, error: 'Método no permitido. Utiliza GET o POST.' });
}

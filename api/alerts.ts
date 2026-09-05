// Endpoint Serverless Vercel: /api/alerts
// Responsable: Backend Architect & Security Engineer
// Permite registrar y listar alertas ciudadanas colectivas con persistencia en Supabase (PostgreSQL) y rate limit.

export interface CitizenAlertRecord {
  id: string;
  projectId: string;
  projectName: string;
  description: string;
  photoUrl?: string | null;
  status: 'Recibida' | 'En Revisión' | 'Atendida';
  createdAt: string;
  municipalityCode?: string | null;
}

// Almacén en memoria de respaldo para el ciclo de vida del contenedor
const memoryFallback: CitizenAlertRecord[] = [];
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

async function getAlertsFromDb(projectId?: string): Promise<CitizenAlertRecord[]> {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

  if (supabaseUrl && supabaseKey) {
    try {
      let endpoint = `${supabaseUrl.replace(/\/$/, '')}/rest/v1/citizen_alerts?select=*&order=created_at.desc`;
      if (projectId) {
        endpoint += `&project_id=eq.${encodeURIComponent(projectId)}`;
      }

      const response = await fetch(endpoint, {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const rows: any[] = await response.json();
        return rows.map((r) => ({
          id: r.id,
          projectId: r.project_id,
          projectName: r.project_name,
          description: r.description,
          photoUrl: r.photo_url || null,
          status: r.status || 'Recibida',
          createdAt: r.created_at || new Date().toISOString(),
          municipalityCode: r.municipality_code || null,
        }));
      }
    } catch (err) {
      console.error('Error al conectar con Supabase en /api/alerts:', err);
    }
  }

  let result = memoryFallback;
  if (projectId) {
    result = result.filter((a) => a.projectId === projectId);
  }
  return result;
}

async function saveAlertToDb(alert: CitizenAlertRecord): Promise<CitizenAlertRecord> {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

  if (supabaseUrl && supabaseKey) {
    try {
      const endpoint = `${supabaseUrl.replace(/\/$/, '')}/rest/v1/citizen_alerts`;
      const payload = {
        id: alert.id,
        project_id: alert.projectId,
        project_name: alert.projectName,
        description: alert.description,
        photo_url: alert.photoUrl || null,
        status: alert.status,
        created_at: alert.createdAt,
        municipality_code: alert.municipalityCode || null,
      };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          Prefer: 'return=representation',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        return alert;
      }
    } catch (err) {
      console.error('Error insertando en Supabase:', err);
    }
  }

  memoryFallback.unshift(alert);
  return alert;
}

export default async function handler(req: any, res: any) {
  const allowedOrigin = process.env.ALLOWED_ORIGIN || '*';
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

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

  if (req.method === 'POST') {
    const clientIp = getClientIp(req);
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

// Endpoint Serverless Vercel: /api/secop
// Responsable: Backend Architect & Security Engineer
// Proxy seguro hacia Datos Abiertos Colombia (SECOP II) con inyección de App Token y caché Edge.

const BASE_URL = 'https://www.datos.gov.co/resource';
const DEFAULT_RESOURCE_ID = 'jbjy-vk9h'; // Contratos SECOP II

export default async function handler(req: any, res: any) {
  const allowedOrigin = process.env.ALLOWED_ORIGIN || '*';
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido. Utiliza GET.' });
  }

  try {
    const {
      departamento,
      ciudad,
      limit = '100',
      query,
      resourceId = DEFAULT_RESOURCE_ID,
      where,
    } = req.query || {};

    const headers: Record<string, string> = {
      Accept: 'application/json',
    };

    // Soporte para Autenticación con API Key (Key ID + Secret via Basic Auth)
    const keyId = process.env.SOCRATA_KEY_ID;
    const keySecret = process.env.SOCRATA_KEY_SECRET || process.env.SOCRATA_SECRET_TOKEN;

    if (keyId && keySecret) {
      const basicAuth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
      headers['Authorization'] = `Basic ${basicAuth}`;
    } else if (process.env.SOCRATA_APP_TOKEN) {
      headers['X-App-Token'] = process.env.SOCRATA_APP_TOKEN;
    }

    const params = new URLSearchParams();

    // Soporte para cláusula WHERE personalizada o autoconstruida
    if (where) {
      params.append('$where', String(where));
    } else if (query) {
      const cleanQuery = String(query).replace(/'/g, "''");
      params.append('$where', `objeto_del_contrato like '%25${cleanQuery}%25'`);
    } else if (departamento) {
      const cleanDept = String(departamento).toUpperCase().replace(/'/g, "''");
      let whereClause = `upper(departamento)='${cleanDept}'`;
      if (ciudad) {
        const cleanCity = String(ciudad).toUpperCase().replace(/'/g, "''");
        whereClause += ` AND upper(ciudad)='${cleanCity}'`;
      }
      params.append('$where', whereClause);
    }

    params.append('$order', 'fecha_de_firma DESC');
    params.append('$limit', String(Math.min(500, Math.max(1, Number(limit) || 100))));

    const targetResource = String(resourceId).replace(/[^a-z0-9-]/gi, '') || DEFAULT_RESOURCE_ID;
    const url = `${BASE_URL}/${targetResource}.json?${params.toString()}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);

    const response = await fetch(url, {
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errorText = await response.text();
      console.warn(`Respuesta fallida de datos.gov.co (${response.status}):`, errorText);
      return res.status(response.status).json({
        error: `Error al consultar datos.gov.co: ${response.statusText}`,
      });
    }

    const data = await response.json();

    // Cache-Control para CDN de Vercel (Edge Cache por 1 hora, revalidación en segundo plano)
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
    return res.status(200).json(data);
  } catch (error: any) {
    console.error('Error en proxy /api/secop:', error);
    const isTimeout = error.name === 'AbortError';
    return res.status(502).json({
      error: isTimeout
        ? 'Tiempo de espera agotado al conectar con Datos Abiertos Colombia.'
        : error?.message || 'Error al conectar con la API de Datos Abiertos.',
    });
  }
}

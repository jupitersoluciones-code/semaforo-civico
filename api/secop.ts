// Endpoint Serverless Vercel: /api/secop
// Responsable: Backend Architect & Security Engineer
// Proxy seguro hacia Datos Abiertos Colombia (SECOP II) con inyección de App Token y caché Edge.

const BASE_URL = 'https://www.datos.gov.co/resource';
const DEFAULT_RESOURCE_ID = 'jbjy-vk9h'; // Contratos SECOP II

const DEPT_ALIASES: Record<string, string[]> = {
  '05': ['Antioquia'],
  '08': ['Atlántico', 'Atlantico'],
  '11': ['Distrito Capital de Bogotá', 'Bogotá', 'Bogota'],
  '13': ['Bolívar', 'Bolivar'],
  '15': ['Boyacá', 'Boyaca'],
  '17': ['Caldas'],
  '18': ['Caquetá', 'Caqueta'],
  '19': ['Cauca'],
  '20': ['Cesar'],
  '23': ['Córdoba', 'Cordoba'],
  '25': ['Cundinamarca'],
  '27': ['Chocó', 'Choco'],
  '41': ['Huila'],
  '44': ['La Guajira', 'Guajira'],
  '47': ['Magdalena'],
  '50': ['Meta'],
  '52': ['Nariño', 'Narino'],
  '54': ['Norte de Santander'],
  '63': ['Quindío', 'Quindio'],
  '66': ['Risaralda'],
  '68': ['Santander'],
  '70': ['Sucre'],
  '73': ['Tolima'],
  '76': ['Valle del Cauca'],
  '81': ['Arauca'],
  '85': ['Casanare'],
  '86': ['Putumayo'],
  '88': ['San Andrés, Providencia y Santa Catalina', 'San Andrés y Providencia'],
  '91': ['Amazonas'],
  '94': ['Guainía', 'Guainia'],
  '95': ['Guaviare'],
  '97': ['Vaupés', 'Vaupes'],
  '99': ['Vichada'],
};

const DECENTRALIZED_PATTERNS: Record<string, string[]> = {
  ese_hospital: ['HOSPITAL', 'EMPRESA SOCIAL DEL ESTADO', 'E.S.E.'],
  sena: ['SERVICIO NACIONAL DE APRENDIZAJE', 'SENA'],
  ica: ['INSTITUTO COLOMBIANO AGROPECUARIO', 'ICA'],
  ant: ['AGENCIA NACIONAL DE TIERRAS', 'ANT'],
  inder: ['INDER', 'IMDER', 'INDEPORTES', 'INSTITUTO DE DEPORTE', 'INSTITUTO MUNICIPAL DE DEPORTE'],
  aunap: ['AUNAP', 'AUTORIDAD NACIONAL DE ACUICULTURA', 'UNAP'],
};

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
      entidadDescentralizada,
      limit = '100',
      query,
      resourceId = DEFAULT_RESOURCE_ID,
      where,
      select,
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

    if (select) {
      params.append('$select', String(select));
    }

    const targetResource = String(resourceId).replace(/[^a-z0-9-]/gi, '') || DEFAULT_RESOURCE_ID;
    const isProcessResource = targetResource === 'p6dx-8zbt';

    const deptCol = isProcessResource ? 'departamento_entidad' : 'departamento';
    const cityCol = isProcessResource ? 'ciudad_entidad' : 'ciudad';
    const entityCol = isProcessResource ? 'entidad' : 'nombre_entidad';

    // Soporte para cláusula WHERE personalizada o autoconstruida
    if (where) {
      params.append('$where', String(where));
    } else if (query) {
      const cleanQuery = String(query).replace(/'/g, "''").toUpperCase();
      const queryCol = isProcessResource ? 'descripci_n_del_procedimiento' : 'objeto_del_contrato';
      params.append('$where', `upper(${queryCol}) like '%${cleanQuery}%'`);
    } else if (departamento) {
      const rawDept = String(departamento).trim();
      const normDept = rawDept.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
      let candidateNames: string[] = [];

      if (DEPT_ALIASES[rawDept]) {
        candidateNames = DEPT_ALIASES[rawDept];
      } else {
        for (const names of Object.values(DEPT_ALIASES)) {
          if (
            names.some((n) => {
              const nNorm = n.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
              return nNorm === normDept || nNorm.includes(normDept) || normDept.includes(nNorm);
            })
          ) {
            candidateNames = names;
            break;
          }
        }
      }

      if (candidateNames.length === 0) {
        candidateNames = [rawDept];
      }

      const deptConds: string[] = [];
      for (const name of candidateNames) {
        const u = name.toUpperCase().replace(/'/g, "''");
        const uNoAcc = u.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        deptConds.push(`upper(${deptCol})='${u}'`);
        if (uNoAcc !== u) {
          deptConds.push(`upper(${deptCol})='${uNoAcc}'`);
        }
      }

      const queryCol = isProcessResource ? 'descripci_n_del_procedimiento' : 'objeto_del_contrato';
      let whereClause = '';

      if (entidadDescentralizada && DECENTRALIZED_PATTERNS[entidadDescentralizada]) {
        const patterns = DECENTRALIZED_PATTERNS[entidadDescentralizada];
        const entConds = patterns.map((p) => `upper(${entityCol}) like '%${p}%'`);
        const entMatch = `(${entConds.join(' OR ')})`;

        if (entidadDescentralizada === 'ant' || entidadDescentralizada === 'aunap') {
          const deptMatch = candidateNames
            .map((name) => {
              const u = name.toUpperCase().replace(/'/g, "''");
              return `upper(${queryCol}) like '%${u}%' OR upper(${deptCol})='${u}'`;
            })
            .join(' OR ');
          whereClause = `${entMatch} AND (${deptMatch})`;
        } else {
          whereClause = `(${deptConds.join(' OR ')}) AND ${entMatch}`;
        }
      } else {
        whereClause = `(${deptConds.join(' OR ')})`;

        if (ciudad && String(ciudad).trim()) {
          const cityStr = String(ciudad).trim();
          if (/bogot/i.test(cityStr)) {
            whereClause += ` AND (upper(${cityCol})='BOGOTÁ' OR upper(${cityCol})='BOGOTA' OR upper(${cityCol})='DISTRITO CAPITAL' OR upper(${cityCol})='NO DEFINIDO')`;
          } else {
            const cleanCity = cityStr.toUpperCase().replace(/'/g, "''");
            const cleanCityNoAccents = cleanCity.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            const cityConds = [
              `upper(${cityCol})='${cleanCity}'`,
              `upper(${cityCol})='${cleanCityNoAccents}'`,
              `upper(${entityCol}) like '%${cleanCity}%'`,
              `upper(${entityCol}) like '%${cleanCityNoAccents}%'`,
            ];
            const uniqueConds = Array.from(new Set(cityConds));
            whereClause += ` AND (${uniqueConds.join(' OR ')})`;
          }
        }
      }

      params.append('$where', whereClause);
    }

    if (isProcessResource) {
      params.append('$order', 'fecha_de_publicacion_del DESC');
    } else {
      params.append('$order', 'fecha_de_firma DESC');
    }
    params.append('$limit', String(Math.min(500, Math.max(1, Number(limit) || 100))));

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

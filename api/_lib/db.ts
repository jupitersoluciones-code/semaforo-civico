// Helper de Base de Datos para Serverless Functions (/api)
// Soporta Supabase REST (PostgreSQL nativo sin dependencias pesadas) y fallback controlado.

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

// Almacén en memoria de respaldo para entornos de desarrollo local o testing
const memoryFallback: CitizenAlertRecord[] = [];

/**
 * Consulta alertas persistidas.
 * Si están configuradas las credenciales de Supabase (SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY / SUPABASE_ANON_KEY),
 * consulta directamente vía PostgREST API (https://supabase.com/docs/guides/api).
 */
export async function getAlertsFromDb(projectId?: string): Promise<CitizenAlertRecord[]> {
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
      } else {
        console.error('Error consultando Supabase REST:', await response.text());
      }
    } catch (err) {
      console.error('Excepción al conectar con Supabase:', err);
    }
  }

  // Fallback en memoria si la BD no está conectada o durante desarrollo
  let result = memoryFallback;
  if (projectId) {
    result = result.filter((a) => a.projectId === projectId);
  }
  return result;
}

/**
 * Inserta una nueva alerta ciudadana en la base de datos persistente.
 */
export async function saveAlertToDb(alert: CitizenAlertRecord): Promise<CitizenAlertRecord> {
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
      } else {
        const errText = await response.text();
        console.error('Error insertando en Supabase:', errText);
        throw new Error(`Error de persistencia en base de datos: ${response.statusText}`);
      }
    } catch (err) {
      console.error('Excepción al persistir alerta:', err);
      // Si falla la red con Supabase, resguardar en fallback de emergencia
      memoryFallback.unshift(alert);
      return alert;
    }
  }

  // Si no hay variables de base de datos configuradas
  memoryFallback.unshift(alert);
  return alert;
}

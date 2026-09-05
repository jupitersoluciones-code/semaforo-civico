export interface CitizenAlert {
  id: string;
  projectId: string;
  projectName: string;
  description: string;
  photo?: string | null;
  status: 'Recibida' | 'En Revisión' | 'Atendida';
  createdAt: string;
  municipalityCode?: string | null;
}

const STORAGE_KEY = 'semaforo_civico_alertas';

/**
 * Guarda una alerta ciudadana enviándola al servidor (/api/alerts)
 * con respaldo inmediato en localStorage para modo offline o resiliencia.
 */
export async function saveAlert(
  alert: Omit<CitizenAlert, 'id' | 'createdAt' | 'status'>,
): Promise<CitizenAlert> {
  const alerts = getAlerts();

  // Crear objeto optimista preliminar
  const localAlert: CitizenAlert = {
    ...alert,
    id: `alert-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    status: 'Recibida',
    createdAt: new Date().toISOString(),
    photo: alert.photo ? '[Adjunto fotográfico registrado]' : null,
  };

  try {
    const response = await fetch('/api/alerts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId: alert.projectId,
        projectName: alert.projectName,
        description: alert.description,
        photoUrl: alert.photo ? '[Adjunto registrado]' : null,
      }),
    });

    if (response.ok) {
      const json = await response.json();
      if (json.ok && json.data) {
        localAlert.id = json.data.id;
        localAlert.createdAt = json.data.createdAt;
      }
    } else {
      const err = await response.json().catch(() => ({}));
      if (response.status === 429) {
        throw new Error(err.error || 'Límite de reportes excedido. Intenta más tarde.');
      }
    }
  } catch (error: any) {
    if (error?.message && error.message.includes('Límite')) {
      throw error;
    }
    console.warn('No se pudo sincronizar en línea, guardando localmente:', error);
  }

  // Persistir en el almacenamiento local seguro
  alerts.unshift(localAlert);
  saveToLocalStorage(alerts);

  return localAlert;
}

/**
 * Consulta las alertas ciudadanas registradas en el backend
 * y actualiza la caché local.
 */
export async function fetchRemoteAlerts(projectId?: string): Promise<CitizenAlert[]> {
  try {
    const url = projectId ? `/api/alerts?projectId=${encodeURIComponent(projectId)}` : '/api/alerts';
    const response = await fetch(url);
    if (response.ok) {
      const json = await response.json();
      if (json.ok && Array.isArray(json.data)) {
        const remoteAlerts: CitizenAlert[] = json.data.map((r: any) => ({
          id: r.id,
          projectId: r.projectId || r.project_id,
          projectName: r.projectName || r.project_name,
          description: r.description,
          photo: r.photoUrl || r.photo_url || null,
          status: r.status || 'Recibida',
          createdAt: r.createdAt || r.created_at,
          municipalityCode: r.municipalityCode || r.municipality_code || null,
        }));

        // Mezclar sin duplicados
        const local = getAlerts();
        const map = new Map<string, CitizenAlert>();
        remoteAlerts.forEach((a) => map.set(a.id, a));
        local.forEach((a) => {
          if (!map.has(a.id)) map.set(a.id, a);
        });

        const merged = Array.from(map.values()).sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
        saveToLocalStorage(merged);
        return merged;
      }
    }
  } catch (err) {
    console.warn('Error sincronizando alertas remotas:', err);
  }
  return getAlerts();
}

export function getAlerts(): CitizenAlert[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CitizenAlert[]) : [];
  } catch {
    return [];
  }
}

function saveToLocalStorage(alerts: CitizenAlert[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(alerts.slice(0, 50)));
  } catch (error) {
    console.warn('LocalStorage saturado, limitando a 15 alertas:', error);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(alerts.slice(0, 15)));
    } catch {
      // Ignorar si el almacenamiento privado está totalmente bloqueado
    }
  }
}

export function clearAlerts(): void {
  localStorage.removeItem(STORAGE_KEY);
}

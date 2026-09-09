const CACHE_PREFIX = 'semaforo_cache_v3_';
const DEFAULT_TTL = 24 * 60 * 60 * 1000; // 24 hours

// Limpieza automática de versiones de caché anteriores (para descartar datos antiguos con fallback a Montería)
try {
  if (typeof window !== 'undefined' && window.localStorage) {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k && k.startsWith('semaforo_cache_') && !k.startsWith(CACHE_PREFIX)) {
        localStorage.removeItem(k);
      }
    }
  }
} catch {
  // Ignorar si el almacenamiento local está restringido
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

function getFromCache<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const entry: CacheEntry<T> = JSON.parse(raw);
    if (Date.now() - entry.timestamp > DEFAULT_TTL) {
      localStorage.removeItem(CACHE_PREFIX + key);
      return null;
    }
    return entry.data;
  } catch {
    return null;
  }
}

function setInCache<T>(key: string, data: T): void {
  try {
    const entry: CacheEntry<T> = { data, timestamp: Date.now() };
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry));
  } catch {
    // Storage full or unavailable, silently fail
  }
}

export async function fetchWithCache<T>(
  url: string,
  cacheKey: string,
  options: RequestInit = {},
): Promise<T> {
  const cached = getFromCache<T>(cacheKey);
  if (cached !== null) {
    // No retornar caché de arrays vacíos — podrían ser resultados fallidos anteriores
    if (Array.isArray(cached) && (cached as unknown[]).length === 0) {
      // Ignorar caché vacía y forzar nueva consulta
    } else {
      return cached;
    }
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data: T = await response.json();
    // Solo cachear si el resultado tiene contenido real (no arrays vacíos)
    const isEmpty = Array.isArray(data) && (data as unknown[]).length === 0;
    if (!isEmpty) {
      setInCache(cacheKey, data);
    }
    return data;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function fetchJson<T>(url: string, options: RequestInit = {}): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } finally {
    clearTimeout(timeoutId);
  }
}

export function clearCache(): void {
  const keys = Object.keys(localStorage).filter((k) => k.startsWith(CACHE_PREFIX));
  keys.forEach((k) => localStorage.removeItem(k));
}

/** Invalida una clave específica del caché (útil para forzar reintento tras resultado vacío) */
export function clearCacheForKey(cacheKey: string): void {
  try {
    localStorage.removeItem(CACHE_PREFIX + cacheKey);
  } catch {
    // Ignorar si localStorage no está disponible
  }
}

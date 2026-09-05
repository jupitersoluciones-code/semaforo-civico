// Middleware de Rate Limiting para Serverless Functions (/api)
// Protege los endpoints de abusos por IP usando ventana deslizante en memoria.

interface RateLimitRecord {
  timestamps: number[];
}

const ipStore = new Map<string, RateLimitRecord>();

// Limpieza de IPs inactivas cada 10 minutos
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of ipStore.entries()) {
    // Filtrar marcas de tiempo mayores a 1 hora
    record.timestamps = record.timestamps.filter((t) => now - t < 3600000);
    if (record.timestamps.length === 0) {
      ipStore.delete(ip);
    }
  }
}, 600000);

export function getClientIp(req: any): string {
  const forwarded = req.headers?.['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.headers?.['x-real-ip'] || req.socket?.remoteAddress || '127.0.0.1';
}

/**
 * Verifica si la IP solicitante excede el límite configurado.
 * @param ip Identificador de la IP
 * @param maxRequests Máximo número de peticiones permitidas en la ventana
 * @param windowMs Tamaño de la ventana en milisegundos
 */
export function checkRateLimit(
  ip: string,
  maxRequests: number,
  windowMs: number,
): { allowed: boolean; remaining: number; resetInMs: number } {
  const now = Date.now();
  let record = ipStore.get(ip);

  if (!record) {
    record = { timestamps: [] };
    ipStore.set(ip, record);
  }

  // Descartar marcas de tiempo fuera de la ventana
  record.timestamps = record.timestamps.filter((t) => now - t < windowMs);

  if (record.timestamps.length >= maxRequests) {
    const oldest = record.timestamps[0];
    const resetInMs = Math.max(0, windowMs - (now - oldest));
    return {
      allowed: false,
      remaining: 0,
      resetInMs,
    };
  }

  record.timestamps.push(now);
  return {
    allowed: true,
    remaining: maxRequests - record.timestamps.length,
    resetInMs: windowMs,
  };
}

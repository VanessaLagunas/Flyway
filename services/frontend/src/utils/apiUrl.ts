/**
 * Retorna la URL base del API Gateway (BFF).
 * - En la nube (GCP, dominio público o IP pública de Kubernetes/Ingress/LoadBalancer): siempre usa la ruta relativa '/api/v1'
 *   para que las peticiones se resuelvan en el mismo host y protocolo a través del reverse proxy Nginx o Ingress.
 * - Si VITE_BFF_URL está configurada explícitamente y no apunta a localhost en un host remoto, se respeta.
 * - En desarrollo local (localhost / 127.0.0.1): si VITE_BFF_URL no está definida, utiliza 'http://localhost:4000/api/v1'.
 */
export function getBffUrl(): string {
  const envUrl = (typeof import.meta !== 'undefined' && import.meta.env && typeof import.meta.env.VITE_BFF_URL === 'string'
    ? import.meta.env.VITE_BFF_URL
    : '')?.trim();

  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0';

    // En GCP, VPS o cualquier despliegue público en la nube:
    if (!isLocalhost) {
      // Si la URL en la build contiene "localhost" o "127.0.0.1" o está vacía,
      // DEBE usar la ruta relativa '/api/v1' para que el navegador resuelva contra el proxy Nginx / Ingress de GCP.
      if (!envUrl || envUrl.includes('localhost') || envUrl.includes('127.0.0.1')) {
        return '/api/v1';
      }
    }
  }

  if (envUrl) {
    return envUrl;
  }

  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:4000/api/v1';
    }
  }

  return '/api/v1';
}

/**
 * Parsea de forma segura una respuesta HTTP como JSON.
 * Si un proxy intermedio devuelve HTML (ej. 405, 502, 504), entrega un error diagnóstico claro en lugar de un SyntaxError críptico.
 */
export async function parseJsonSafe<T = any>(res: Response): Promise<T> {
  const text = await res.text();
  if (!text) {
    return {} as T;
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    const trimmed = text.trim();
    if (trimmed.startsWith('<')) {
      throw new Error(
        `El proxy o balanceador respondió con HTML en lugar de JSON (HTTP ${res.status}). Verifica que los contenedores frontend y bff-service estén actualizados.`
      );
    }
    throw new Error(`Respuesta inválida del servidor (HTTP ${res.status}).`);
  }
}

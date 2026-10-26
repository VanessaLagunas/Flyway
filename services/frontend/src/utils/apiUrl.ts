/**
 * Retorna la URL base del API Gateway (BFF).
 * - En la nube (GCP, dominio público o IP pública de Kubernetes/Ingress): siempre usa la ruta relativa '/api/v1'
 *   para que las peticiones se resuelvan en el mismo host y protocolo (evitando llamadas a localhost y errores de Mixed Content).
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
      // DEBE usar la ruta relativa '/api/v1' para que el navegador resuelva contra el Ingress de GCP.
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

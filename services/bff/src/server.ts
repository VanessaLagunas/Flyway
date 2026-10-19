import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 4000;

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://auth-service:4003';
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://ai-service:4001';
const CATALOG_SERVICE_URL = process.env.CATALOG_SERVICE_URL || 'http://catalog-service:4002';

app.use(cors());
app.use(express.json({ limit: '10mb' }));

interface AuthenticatedUser {
  id: number;
  email: string;
  name: string;
}

interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

// Helper para llamadas con timeout
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 25000): Promise<globalThis.Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(id);
  }
}

// -------------------------------------------------------------
// Middleware de Autenticación JWT (consulta a auth-service)
// -------------------------------------------------------------
async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No autorizado. Se requiere header Authorization: Bearer <token>.' });
  }

  try {
    const authRes = await fetchWithTimeout(
      `${AUTH_SERVICE_URL}/me`,
      {
        method: 'GET',
        headers: {
          Authorization: authHeader,
        },
      },
      5000
    );

    if (!authRes.ok) {
      return res.status(401).json({ error: 'Token inválido o sesión expirada.' });
    }

    const data = (await authRes.json()) as any;
    req.user = data.user || { id: data.id, email: data.email, name: data.name };
    return next();
  } catch (err: any) {
    console.error('[BFF] Error verificando token con auth-service:', err.message);
    return res.status(502).json({ error: 'Error de comunicación con auth-service.' });
  }
}

// -------------------------------------------------------------
// 1. Healthcheck (/api/v1/health)
// -------------------------------------------------------------
app.get(['/api/v1/health', '/api/health'], async (_req: Request, res: Response) => {
  const start = Date.now();
  let authHealth: any = { status: 'unknown' };
  let aiHealth: any = { status: 'unknown' };
  let catalogHealth: any = { status: 'unknown' };

  await Promise.all([
    (async () => {
      try {
        const r = await fetchWithTimeout(`${AUTH_SERVICE_URL}/health`, {}, 3000);
        authHealth = r.ok ? await r.json() : { status: `HTTP ${r.status}` };
      } catch (err: any) {
        authHealth = { status: 'unreachable', error: err.message };
      }
    })(),
    (async () => {
      try {
        const r = await fetchWithTimeout(`${AI_SERVICE_URL}/health`, {}, 3000);
        aiHealth = r.ok ? await r.json() : { status: `HTTP ${r.status}` };
      } catch (err: any) {
        aiHealth = { status: 'unreachable', error: err.message };
      }
    })(),
    (async () => {
      try {
        const r = await fetchWithTimeout(`${CATALOG_SERVICE_URL}/health`, {}, 3000);
        catalogHealth = r.ok ? await r.json() : { status: `HTTP ${r.status}` };
      } catch (err: any) {
        catalogHealth = { status: 'unreachable', error: err.message };
      }
    })(),
  ]);

  const allHealthy =
    authHealth.status === 'ok' &&
    aiHealth.status === 'ok' &&
    catalogHealth.status === 'ok';

  const authInfo = { url: AUTH_SERVICE_URL, ...authHealth };
  const aiInfo = { url: AI_SERVICE_URL, ...aiHealth };
  const catalogInfo = { url: CATALOG_SERVICE_URL, ...catalogHealth };

  return res.json({
    status: allHealthy ? 'ok' : 'degraded',
    service: 'bff-gateway',
    port: PORT,
    uptimeSeconds: Math.floor(process.uptime()),
    latencyMs: Date.now() - start,
    timestamp: new Date().toISOString(),
    services: {
      'auth-service': authInfo,
      'ai-service': aiInfo,
      'catalog-service': catalogInfo,
      auth_service: authInfo,
      ai_service: aiInfo,
      catalog_service: catalogInfo,
    },
  });
});

// -------------------------------------------------------------
// 2. Autenticación Local (/api/v1/auth/*)
// -------------------------------------------------------------
app.post('/api/v1/auth/register', async (req: Request, res: Response) => {
  try {
    const authRes = await fetchWithTimeout(
      `${AUTH_SERVICE_URL}/register`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req.body),
      },
      8000
    );
    const data = await authRes.json();
    return res.status(authRes.status).json(data);
  } catch (err: any) {
    console.error('[BFF] Error en POST /api/v1/auth/register:', err.message);
    return res.status(502).json({ error: 'Error de comunicación con auth-service', detail: err.message });
  }
});

app.post('/api/v1/auth/login', async (req: Request, res: Response) => {
  try {
    const authRes = await fetchWithTimeout(
      `${AUTH_SERVICE_URL}/login`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req.body),
      },
      8000
    );
    const data = await authRes.json();
    return res.status(authRes.status).json(data);
  } catch (err: any) {
    console.error('[BFF] Error en POST /api/v1/auth/login:', err.message);
    return res.status(502).json({ error: 'Error de comunicación con auth-service', detail: err.message });
  }
});

app.get('/api/v1/auth/me', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization || '';
    const authRes = await fetchWithTimeout(
      `${AUTH_SERVICE_URL}/me`,
      {
        method: 'GET',
        headers: { Authorization: authHeader },
      },
      5000
    );
    const data = await authRes.json();
    return res.status(authRes.status).json(data);
  } catch (err: any) {
    console.error('[BFF] Error en GET /api/v1/auth/me:', err.message);
    return res.status(502).json({ error: 'Error de comunicación con auth-service', detail: err.message });
  }
});

// -------------------------------------------------------------
// 3. Itinerary Generate (/api/v1/itinerary/generate)
// -------------------------------------------------------------
async function handleGenerateItinerary(req: Request, res: Response) {
  try {
    const { destination, startDate, endDate, budget, interests } = req.body;

    if (!destination || typeof destination !== 'string' || !destination.trim()) {
      return res.status(400).json({ error: 'El parámetro destination es obligatorio y debe ser texto.' });
    }

    const payload = {
      destination: destination.trim(),
      startDate: startDate || new Date().toISOString().split('T')[0],
      endDate: endDate || new Date().toISOString().split('T')[0],
      budget: budget || 'standard',
      interests: Array.isArray(interests) ? interests : [],
    };

    console.log(`[BFF] Enrutando generación hacia ai-service (${AI_SERVICE_URL}/generate) para "${payload.destination}"`);

    const aiRes = await fetchWithTimeout(
      `${AI_SERVICE_URL}/generate`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
      30000
    );

    const data = await aiRes.json();
    return res.status(aiRes.status).json(data);
  } catch (err: any) {
    console.error('[BFF] Error conectando con ai-service:', err);
    return res.status(502).json({
      error: 'Error de comunicación con el microservicio de IA (ai-service)',
      detail: err.message,
    });
  }
}

app.post('/api/v1/itinerary/generate', handleGenerateItinerary);
app.post('/api/plan-route', handleGenerateItinerary);

// -------------------------------------------------------------
// 4. Destinations (/api/v1/destinations)
// -------------------------------------------------------------
async function handleGetDestinations(_req: Request, res: Response) {
  try {
    const catRes = await fetchWithTimeout(`${CATALOG_SERVICE_URL}/destinations`, {}, 8000);
    const data = await catRes.json();
    return res.status(catRes.status).json(data);
  } catch (err: any) {
    console.error('[BFF] Error consultando destinos a catalog-service:', err);
    return res.status(502).json({
      error: 'Error de comunicación con catalog-service para destinos',
      detail: err.message,
    });
  }
}

app.get('/api/v1/destinations', handleGetDestinations);
app.get('/api/destinations', handleGetDestinations);

// -------------------------------------------------------------
// 5. Photos (/api/v1/photos)
// -------------------------------------------------------------
async function handleGetPhotos(req: Request, res: Response) {
  try {
    const query = req.query.query as string;
    const count = req.query.count as string;

    if (!query) {
      return res.status(400).json({ error: 'Parámetro query es requerido.' });
    }

    const params = new URLSearchParams();
    params.set('query', query);
    if (count) params.set('count', count);

    const catRes = await fetchWithTimeout(`${CATALOG_SERVICE_URL}/photos?${params.toString()}`, {}, 10000);
    const data = await catRes.json();
    return res.status(catRes.status).json(data);
  } catch (err: any) {
    console.error('[BFF] Error consultando fotos a catalog-service:', err);
    return res.status(502).json({
      error: 'Error de comunicación con catalog-service para fotos',
      detail: err.message,
    });
  }
}

app.get('/api/v1/photos', handleGetPhotos);
app.get('/api/destination-photos', handleGetPhotos);

// -------------------------------------------------------------
// 6. Saved Itineraries Protegidos por JWT (/api/v1/saved)
// -------------------------------------------------------------
app.get('/api/v1/saved', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id ?? 1;
    const catRes = await fetchWithTimeout(`${CATALOG_SERVICE_URL}/saved/${userId}`, {}, 8000);
    const data = await catRes.json();
    return res.status(catRes.status).json(data);
  } catch (err: any) {
    console.error('[BFF] Error obteniendo itinerarios guardados de catalog-service:', err);
    return res.status(502).json({
      error: 'Error de comunicación con catalog-service para itinerarios guardados',
      detail: err.message,
    });
  }
});

app.post('/api/v1/saved', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id ?? 1;
    const payload = {
      ...req.body,
      userId,
    };
    const catRes = await fetchWithTimeout(
      `${CATALOG_SERVICE_URL}/saved`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
      10000
    );
    const data = await catRes.json();
    return res.status(catRes.status).json(data);
  } catch (err: any) {
    console.error('[BFF] Error guardando itinerario en catalog-service:', err);
    return res.status(502).json({
      error: 'Error de comunicación con catalog-service al guardar itinerario',
      detail: err.message,
    });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🌐 Flyway API Gateway (BFF) corriendo en http://0.0.0.0:${PORT}`);
});

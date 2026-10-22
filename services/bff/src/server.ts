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

// Helper para llamadas con timeout usando fetch nativo de Node.js 20
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

app.post('/api/v1/auth/google', async (req: Request, res: Response) => {
  try {
    const authRes = await fetchWithTimeout(
      `${AUTH_SERVICE_URL}/google`,
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
    console.error('[BFF] Error en POST /api/v1/auth/google:', err.message);
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
// Orquestación Asíncrona:
//  1) Solicita itinerario a http://ai-service:4001/generate
//  2) a) Inyecta síncronamente la foto desde http://catalog-service:4002/photos?destination=...
//     b) En segundo plano (fire-and-forget no bloqueante), dispara POST http://catalog-service:4002/destinations/upsert
// -------------------------------------------------------------
async function handleGenerateItinerary(req: Request, res: Response) {
  try {
    const { destination, startDate, endDate, budget, interests } = req.body || {};

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
      90000
    );

    const aiData = (await aiRes.json()) as any;
    if (!aiRes.ok) {
      return res.status(aiRes.status).json(aiData);
    }

    const targetDestination = String(aiData.destination || payload.destination).trim();

    // (a) Consulta síncrona de fotografía a catalog-service (Cache-Aside en PostgreSQL)
    try {
      const photoRes = await fetchWithTimeout(
        `${CATALOG_SERVICE_URL}/photos?destination=${encodeURIComponent(targetDestination)}&count=15`,
        { method: 'GET' },
        6000
      );

      if (photoRes.ok) {
        const photoData = (await photoRes.json()) as any;
        const photosList: any[] = Array.isArray(photoData.photos) && photoData.photos.length > 0
          ? photoData.photos
          : (photoData.photo ? [photoData.photo] : []);

        const primaryPhoto = photosList[0] || photoData.photo;
        const resolvedPhotoUrl =
          primaryPhoto?.url ||
          photoData.photoUrl ||
          photoData.photo_url ||
          photoData.photo?.url;
        const resolvedPhotographer =
          primaryPhoto?.photographer ||
          photoData.photographer ||
          photoData.photo?.photographer;
        const resolvedPhotographerUrl =
          primaryPhoto?.photographerUrl ||
          photoData.photographerUrl ||
          photoData.photo?.photographerUrl;

        if (resolvedPhotoUrl) {
          aiData.imageUrl = resolvedPhotoUrl;
          aiData.photoUrl = resolvedPhotoUrl;
          aiData.photo_url = resolvedPhotoUrl;
          aiData.imagePhotographer = resolvedPhotographer || aiData.imagePhotographer;
          aiData.imagePhotographerUrl = resolvedPhotographerUrl || aiData.imagePhotographerUrl;
          aiData.photo = {
            url: resolvedPhotoUrl,
            photographer: resolvedPhotographer || 'Pexels Contributor',
            photographerUrl: resolvedPhotographerUrl || 'https://www.pexels.com',
            source: photoData.source || 'catalog-service',
            cacheHit: Boolean(photoData.cacheHit),
          };

          if (aiData.trip && typeof aiData.trip === 'object') {
            aiData.trip.imageUrl = resolvedPhotoUrl;
            aiData.trip.photoUrl = resolvedPhotoUrl;
            aiData.trip.imagePhotographer = resolvedPhotographer || aiData.trip.imagePhotographer;
            aiData.trip.imagePhotographerUrl = resolvedPhotographerUrl || aiData.trip.imagePhotographerUrl;
          }

          // Inyección de fotografías auténticas del destino en cada día y actividades del itinerario
          if (Array.isArray(aiData.days) && aiData.days.length > 0 && photosList.length > 0) {
            aiData.days.forEach((day: any, dIdx: number) => {
              const assignedDayPhoto = photosList[(dIdx + 1) % photosList.length] || photosList[0];
              day.imageUrl = assignedDayPhoto.url;
              day.imagePhotographer = assignedDayPhoto.photographer || 'Pexels Contributor';
              day.imagePhotographerUrl = assignedDayPhoto.photographerUrl || 'https://www.pexels.com';

              if (Array.isArray(day.items)) {
                day.items.forEach((item: any, iIdx: number) => {
                  if (item.type === 'activity' && item.data) {
                    const assignedActPhoto = photosList[(dIdx * 3 + iIdx + 2) % photosList.length] || assignedDayPhoto;
                    item.data.imageUrl = assignedActPhoto.url;
                    item.data.imagePhotographer = assignedActPhoto.photographer || 'Pexels Contributor';
                    item.data.imagePhotographerUrl = assignedActPhoto.photographerUrl || 'https://www.pexels.com';
                  }
                });
              }
            });

            if (aiData.trip && Array.isArray(aiData.trip.days)) {
              aiData.trip.days = aiData.days;
            }
          }
        }
      } else {
        console.warn(`[BFF] catalog-service /photos devolvió HTTP ${photoRes.status}, conservando imagen de respaldo.`);
      }
    } catch (photoErr: any) {
      console.warn(`[BFF] No se pudo obtener foto desde catalog-service (${photoErr?.message || photoErr}), usando imagen de respaldo.`);
    }

    // (b) Disparo en segundo plano (sin bloquear el HTTP 200 al frontend) hacia /destinations/upsert
    const daysLen = Array.isArray(aiData.days) && aiData.days.length > 0 ? aiData.days.length : 1;
    const upsertMetadata = {
      destination: targetDestination,
      name: targetDestination,
      country: aiData.country || 'Chile',
      region: aiData.region || 'Región de Chile',
      commune: aiData.commune || targetDestination,
      avgDailyCostCLP:
        Number(aiData.avgDailyCostCLP) ||
        Math.round((Number(aiData.totalEstimatedCostCLP ?? aiData.totalCost) || 50000) / daysLen),
      tags: Array.isArray(aiData.tags) && aiData.tags.length > 0 ? aiData.tags : payload.interests,
      description:
        aiData.description ||
        aiData.summary ||
        `Destino turístico ${targetDestination}.`,
    };

    void fetchWithTimeout(
      `${CATALOG_SERVICE_URL}/destinations/upsert`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(upsertMetadata),
      },
      5000
    )
      .then((upsertRes) => {
        if (!upsertRes.ok) {
          console.warn(`[BFF] Upsert en segundo plano en catalog-service respondió HTTP ${upsertRes.status}`);
        }
      })
      .catch((upsertErr: any) => {
        console.warn('[BFF] Error no bloqueante en upsert asíncrono de destino:', upsertErr?.message || upsertErr);
      });

    return res.status(200).json(aiData);
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

app.get(['/api/v1/weather', '/api/weather'], async (req: Request, res: Response) => {
  try {
    const params = new URLSearchParams();
    if (req.query.destination) params.set('destination', String(req.query.destination));
    if (req.query.startDate) params.set('startDate', String(req.query.startDate));
    if (req.query.endDate) params.set('endDate', String(req.query.endDate));

    const weatherRes = await fetchWithTimeout(`${AI_SERVICE_URL}/weather?${params.toString()}`, {}, 8000);
    const data = await weatherRes.json();
    return res.status(weatherRes.status).json(data);
  } catch (err: any) {
    console.error('[BFF] Error consultando clima a ai-service:', err?.message || err);
    return res.status(502).json({
      error: 'Error de comunicación con ai-service para clima',
      detail: err?.message,
    });
  }
});

// -------------------------------------------------------------
// 4. Destinations (/api/v1/destinations y /api/v1/destinations/upsert)
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

app.post('/api/v1/destinations/upsert', async (req: Request, res: Response) => {
  try {
    const catRes = await fetchWithTimeout(
      `${CATALOG_SERVICE_URL}/destinations/upsert`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req.body),
      },
      8000
    );
    const data = await catRes.json();
    return res.status(catRes.status).json(data);
  } catch (err: any) {
    console.error('[BFF] Error en POST /api/v1/destinations/upsert:', err);
    return res.status(502).json({
      error: 'Error de comunicación con catalog-service para upsert de destino',
      detail: err.message,
    });
  }
});

// -------------------------------------------------------------
// 5. Photos (/api/v1/photos)
// -------------------------------------------------------------
async function handleGetPhotos(req: Request, res: Response) {
  try {
    const destinationOrQuery = (req.query.destination as string) || (req.query.query as string) || (req.query.q as string);
    const count = req.query.count as string;

    if (!destinationOrQuery) {
      return res.status(400).json({ error: 'Parámetro destination o query es requerido.' });
    }

    const params = new URLSearchParams();
    params.set('destination', destinationOrQuery);
    params.set('query', destinationOrQuery);
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

export { app };

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🌐 Flyway API Gateway (BFF) corriendo en http://0.0.0.0:${PORT}`);
  });
}

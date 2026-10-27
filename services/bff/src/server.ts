import path from 'node:path';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const app = express();
const PORT = Number(process.env.PORT) || 4000;

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://auth-service:4003';
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://ai-service:4001';
const CATALOG_SERVICE_URL = process.env.CATALOG_SERVICE_URL || 'http://catalog-service:4002';

function getAuthServiceUrl(): string {
  return process.env.AUTH_SERVICE_URL || AUTH_SERVICE_URL;
}

function getAiServiceUrl(): string {
  return process.env.AI_SERVICE_URL || AI_SERVICE_URL;
}

function getCatalogServiceUrl(): string {
  return process.env.CATALOG_SERVICE_URL || CATALOG_SERVICE_URL;
}

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
// Garantiza un margen superior a OPENAI_TIMEOUT_MS para evitar abortos prematuros mientras ai-service genera con gpt-6-luna
const envBffTimeout = Number(process.env.AI_SERVICE_TIMEOUT_MS);
const envOpenAiTimeout = Number(process.env.OPENAI_TIMEOUT_MS);
const baseTimeout = Number.isFinite(envBffTimeout) && envBffTimeout > 0 ? envBffTimeout : 210000;
export const AI_SERVICE_TIMEOUT_MS = Number.isFinite(envOpenAiTimeout) && envOpenAiTimeout > 0
  ? Math.max(baseTimeout, envOpenAiTimeout + 30000)
  : baseTimeout;

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
  if (!authHeader || !authHeader.startsWith('Bearer ') || !authHeader.slice(7).trim()) {
    return res.status(401).json({
      error: 'Debes iniciar sesión previamente para guardar o consultar tus rutas.',
    });
  }

  try {
    const authRes = await fetchWithTimeout(
      `${getAuthServiceUrl()}/me`,
      {
        method: 'GET',
        headers: {
          Authorization: authHeader,
        },
      },
      5000
    );

    if (!authRes.ok) {
      return res.status(401).json({
        error: 'Sesión inválida o expirada. Debes iniciar sesión para guardar la ruta.',
      });
    }

    const data = (await authRes.json()) as any;
    const resolvedUser = data.user || data;
    const numericId = Number(resolvedUser?.id);
    if (!Number.isFinite(numericId) || numericId <= 0 || !resolvedUser?.email) {
      return res.status(401).json({
        error: 'Sesión inválida. Debes iniciar sesión previamente para guardar la ruta.',
      });
    }

    req.user = {
      id: numericId,
      email: String(resolvedUser.email),
      name: String(resolvedUser.name || ''),
    };
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
  const authServiceUrl = getAuthServiceUrl();
  const aiServiceUrl = getAiServiceUrl();
  const catalogServiceUrl = getCatalogServiceUrl();

  let authHealth: any = { status: 'unknown' };
  let aiHealth: any = { status: 'unknown' };
  let catalogHealth: any = { status: 'unknown' };

  await Promise.all([
    (async () => {
      try {
        const r = await fetchWithTimeout(`${authServiceUrl}/health`, {}, 3000);
        authHealth = r.ok ? await r.json() : { status: `HTTP ${r.status}` };
      } catch (err: any) {
        authHealth = { status: 'unreachable', error: err.message };
      }
    })(),
    (async () => {
      try {
        const r = await fetchWithTimeout(`${aiServiceUrl}/health`, {}, 3000);
        aiHealth = r.ok ? await r.json() : { status: `HTTP ${r.status}` };
      } catch (err: any) {
        aiHealth = { status: 'unreachable', error: err.message };
      }
    })(),
    (async () => {
      try {
        const r = await fetchWithTimeout(`${catalogServiceUrl}/health`, {}, 3000);
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

  const authInfo = { url: authServiceUrl, ...authHealth };
  const aiInfo = { url: aiServiceUrl, ...aiHealth };
  const catalogInfo = { url: catalogServiceUrl, ...catalogHealth };

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
app.get('/api/v1/auth/config', async (_req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  const fallbackClientId = (
    process.env.GOOGLE_CLIENT_ID ||
    process.env.GOOGLE_CLIENT_ID_SECRET ||
    process.env.VITE_GOOGLE_CLIENT_ID ||
    ''
  ).trim();
  const fallbackConfig = {
    googleEnabled: Boolean(fallbackClientId),
    googleClientId: fallbackClientId,
  };

  try {
    const authRes = await fetchWithTimeout(
      `${getAuthServiceUrl()}/config`,
      { method: 'GET' },
      5000
    );
    if (authRes.ok) {
      const data = await authRes.json();
      return res.status(200).json(data);
    }
    return res.status(200).json(fallbackConfig);
  } catch (err: any) {
    console.warn('[BFF] auth-service /config no disponible, usando fallback local:', err?.message || err);
    return res.status(200).json(fallbackConfig);
  }
});

app.post('/api/v1/auth/register', async (req: Request, res: Response) => {
  try {
    const authRes = await fetchWithTimeout(
      `${getAuthServiceUrl()}/register`,
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
      `${getAuthServiceUrl()}/login`,
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
      `${getAuthServiceUrl()}/google`,
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
      `${getAuthServiceUrl()}/me`,
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
//  2) a) Enriquece síncronamente con fotos por destino + por parada vía POST catalog-service/photos/enrich-trip
//        (con fallback resiliente a GET catalog-service/photos?destination=...&country=...&count=15&refresh=true)
//     b) En segundo plano (fire-and-forget no bloqueante), dispara POST http://catalog-service:4002/destinations/upsert
// -------------------------------------------------------------
async function handleGenerateItinerary(req: Request, res: Response) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

  try {
    const { destination, startDate, endDate, budget, interests } = req.body || {};

    if (!destination || typeof destination !== 'string' || !destination.trim()) {
      return res.status(400).json({ error: 'El parámetro destination es obligatorio y debe ser texto.' });
    }

    const payload: any = {
      destination: destination.trim(),
      startDate: startDate || new Date().toISOString().split('T')[0],
      endDate: endDate || new Date().toISOString().split('T')[0],
      budget: budget || 'standard',
      interests: Array.isArray(interests) ? interests : [],
    };
    if (req.body?.offline !== undefined) {
      payload.offline = req.body.offline;
    }
    if (req.body?.enableOfflineMode !== undefined) {
      payload.enableOfflineMode = req.body.enableOfflineMode;
    }

    const targetAiServiceUrl = getAiServiceUrl();
    const targetCatalogServiceUrl = getCatalogServiceUrl();
    console.log(`[BFF] Enrutando generación hacia ai-service (${targetAiServiceUrl}/generate) para "${payload.destination}"`);

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (req.headers['x-offline-mode']) {
      headers['x-offline-mode'] = String(req.headers['x-offline-mode']);
    }
    if (req.headers['x-allow-offline']) {
      headers['x-allow-offline'] = String(req.headers['x-allow-offline']);
    }
    if (!headers['x-offline-mode'] && (process.env.ENABLE_OFFLINE_MODE === 'true' || process.env.ENABLE_OFFLINE_MODE === '1')) {
      headers['x-offline-mode'] = 'true';
    }

    const aiRes = await fetchWithTimeout(
      `${targetAiServiceUrl}/generate`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      },
      AI_SERVICE_TIMEOUT_MS
    );

    const aiData = (await aiRes.json()) as any;
    if (!aiRes.ok) {
      return res.status(aiRes.status).json(aiData);
    }

    const targetDestination = String(aiData.destination || payload.destination).trim();
    const targetCountry = String(aiData.country || aiData.destinationCountry || '').trim();

    // (a.1) Enriquecimiento primario por destino + por parada vía POST /photos/enrich-trip
    let enrichedViaTripEndpoint = false;
    try {
      const enrichRes = await fetchWithTimeout(
        `${targetCatalogServiceUrl}/photos/enrich-trip`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ trip: aiData, refresh: true }),
        },
        15000
      );

      if (enrichRes.ok) {
        const enrichPayload = (await enrichRes.json()) as any;
        const enrichedTrip = enrichPayload?.trip || enrichPayload;

        if (enrichedTrip && typeof enrichedTrip === 'object') {
          const resolvedPhotoUrl =
            enrichedTrip.imageUrl ||
            enrichedTrip.photoUrl ||
            enrichedTrip.photo_url ||
            aiData.imageUrl ||
            aiData.photoUrl;
          const resolvedPhotographer =
            enrichedTrip.imagePhotographer ||
            aiData.imagePhotographer ||
            'Pexels Contributor';
          const resolvedPhotographerUrl =
            enrichedTrip.imagePhotographerUrl ||
            aiData.imagePhotographerUrl ||
            'https://www.pexels.com';

          if (resolvedPhotoUrl) {
            aiData.imageUrl = resolvedPhotoUrl;
            aiData.photoUrl = resolvedPhotoUrl;
            aiData.photo_url = resolvedPhotoUrl;
            aiData.imagePhotographer = resolvedPhotographer;
            aiData.imagePhotographerUrl = resolvedPhotographerUrl;
            aiData.photo = enrichedTrip.photo || {
              url: resolvedPhotoUrl,
              photographer: resolvedPhotographer,
              photographerUrl: resolvedPhotographerUrl,
              source: enrichPayload?.source || 'pexels_api',
              cacheHit: false,
            };
          }

          if (Array.isArray(enrichedTrip.days)) {
            aiData.days = enrichedTrip.days;
          }

          if (aiData.trip && typeof aiData.trip === 'object') {
            if (resolvedPhotoUrl) {
              aiData.trip.imageUrl = resolvedPhotoUrl;
              aiData.trip.photoUrl = resolvedPhotoUrl;
              aiData.trip.photo_url = resolvedPhotoUrl;
              aiData.trip.imagePhotographer = resolvedPhotographer;
              aiData.trip.imagePhotographerUrl = resolvedPhotographerUrl;
            }
            if (Array.isArray(enrichedTrip.days)) {
              aiData.trip.days = enrichedTrip.days;
            }
          }

          enrichedViaTripEndpoint = true;
        }
      } else {
        console.warn(`[BFF] catalog-service /photos/enrich-trip devolvió HTTP ${enrichRes.status}, usando fallback GET /photos.`);
      }
    } catch (enrichErr: any) {
      console.warn(`[BFF] Falló /photos/enrich-trip (${enrichErr?.message || enrichErr}), intentando fallback GET /photos.`);
    }

    // (a.2) Fallback resiliente a GET /photos ONLY si /photos/enrich-trip falló o devolvió non-OK
    if (!enrichedViaTripEndpoint) {
      try {
        const photoRes = await fetchWithTimeout(
          `${targetCatalogServiceUrl}/photos?destination=${encodeURIComponent(targetDestination)}&country=${encodeURIComponent(targetCountry)}&count=15&refresh=true`,
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
              aiData.trip.photo_url = resolvedPhotoUrl;
              aiData.trip.imagePhotographer = resolvedPhotographer || aiData.trip.imagePhotographer;
              aiData.trip.imagePhotographerUrl = resolvedPhotographerUrl || aiData.trip.imagePhotographerUrl;
            }

            if (Array.isArray(aiData.days) && aiData.days.length > 0 && photosList.length > 0) {
              let cursor = 1;
              aiData.days.forEach((day: any) => {
                const assignedDayPhoto = photosList[cursor % photosList.length] || photosList[0];
                cursor++;
                day.imageUrl = assignedDayPhoto.url;
                day.imagePhotographer = assignedDayPhoto.photographer || 'Pexels Contributor';
                day.imagePhotographerUrl = assignedDayPhoto.photographerUrl || 'https://www.pexels.com';

                if (Array.isArray(day.items)) {
                  day.items.forEach((item: any) => {
                    if (item.type === 'activity' && item.data) {
                      const assignedActPhoto = photosList[cursor % photosList.length] || assignedDayPhoto;
                      cursor++;
                      item.data.imageUrl = assignedActPhoto.url;
                      item.data.imagePhotographer = assignedActPhoto.photographer || 'Pexels Contributor';
                      item.data.imagePhotographerUrl = assignedActPhoto.photographerUrl || 'https://www.pexels.com';
                    }
                  });
                }

                if (Array.isArray(day.activities)) {
                  const enrichedItems = Array.isArray(day.items)
                    ? day.items.filter((it: any) => it.type === 'activity' && it.data).map((it: any) => it.data)
                    : [];
                  day.activities.forEach((act: any, actIdx: number) => {
                    if (!act || typeof act !== 'object') return;
                    const synced = enrichedItems[actIdx];
                    if (synced?.imageUrl) {
                      act.imageUrl = synced.imageUrl;
                      act.imagePhotographer = synced.imagePhotographer;
                      act.imagePhotographerUrl = synced.imagePhotographerUrl;
                    } else {
                      const assignedActPhoto = photosList[cursor % photosList.length] || assignedDayPhoto;
                      cursor++;
                      act.imageUrl = assignedActPhoto.url;
                      act.imagePhotographer = assignedActPhoto.photographer || 'Pexels Contributor';
                      act.imagePhotographerUrl = assignedActPhoto.photographerUrl || 'https://www.pexels.com';
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
      `${targetCatalogServiceUrl}/destinations/upsert`,
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

    const weatherRes = await fetchWithTimeout(`${getAiServiceUrl()}/weather?${params.toString()}`, {}, 8000);
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
    const catRes = await fetchWithTimeout(`${getCatalogServiceUrl()}/destinations`, {}, 8000);
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
      `${getCatalogServiceUrl()}/destinations/upsert`,
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
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

  try {
    const destinationOrQuery =
      (req.query.destination as string) ||
      (req.query.query as string) ||
      (req.query.q as string);
    const count = req.query.count as string | undefined;
    const country = req.query.country as string | undefined;
    const refresh =
      (req.query.refresh as string | undefined) ??
      (req.query.nocache as string | undefined);

    if (!destinationOrQuery) {
      return res.status(400).json({ error: 'Parámetro destination o query es requerido.' });
    }

    const params = new URLSearchParams();
    params.set('destination', destinationOrQuery);
    params.set('query', destinationOrQuery);
    if (count) params.set('count', String(count));
    if (country) params.set('country', String(country));
    if (refresh !== undefined) params.set('refresh', String(refresh));

    const catRes = await fetchWithTimeout(`${getCatalogServiceUrl()}/photos?${params.toString()}`, {}, 10000);
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
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        error: 'Debes iniciar sesión previamente para consultar tus rutas guardadas.',
      });
    }
    const catRes = await fetchWithTimeout(`${getCatalogServiceUrl()}/saved/${userId}`, {}, 8000);
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
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        error: 'Debes iniciar sesión previamente para guardar la ruta.',
      });
    }
    const payload = {
      ...req.body,
      userId,
    };
    const catRes = await fetchWithTimeout(
      `${getCatalogServiceUrl()}/saved`,
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

if (process.env.NODE_ENV !== 'test' && !process.argv.some(arg => arg.includes('test'))) {
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`🌐 Flyway API Gateway (BFF) corriendo en http://0.0.0.0:${PORT}`);
  });
  server.setTimeout(AI_SERVICE_TIMEOUT_MS + 30000);
  if ('requestTimeout' in server) {
    (server as any).requestTimeout = AI_SERVICE_TIMEOUT_MS + 30000;
  }
}

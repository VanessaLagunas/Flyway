import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import { Pool } from 'pg';
import { DESTINATIONS_CATALOG } from './data/destinationsData';
import { searchPexelsPhotos } from './pexels';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 4002;

app.use(express.json({ limit: '10mb' }));

// PostgreSQL Pool (resiliente ante desconexión)
const dbUrl = process.env.DATABASE_URL || 'postgres://flyway:flyway_pass@postgres-db:5432/flyway_db';
const pool = new Pool({
  connectionString: dbUrl,
  connectionTimeoutMillis: 3000,
});

// Verificador de conexión a DB
async function checkDbConnection(): Promise<boolean> {
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    return true;
  } catch {
    return false;
  }
}

// In-memory fallback para itinerarios guardados si no hay DB
interface InMemSaved {
  id: number;
  user_id: number;
  destination_name: string;
  total_budget_clp: number;
  itinerary_data: any;
  created_at: string;
}
const inMemorySavedItineraries: InMemSaved[] = [];
let nextInMemSavedId = 1;

// Fallback de catálogo estático mapeado a la estructura de la base de datos
function getStaticDestinations() {
  return DESTINATIONS_CATALOG.map((dest, idx) => {
    const firstComuna = dest.comunasOrSectors && dest.comunasOrSectors[0] ? dest.comunasOrSectors[0].name : dest.name;
    let avgCost = 50000;
    if (dest.dailyPlans && dest.dailyPlans.length > 0) {
      const sum = dest.dailyPlans.reduce((acc, p) => acc + (p.costStandard || 50000), 0);
      avgCost = Math.round(sum / dest.dailyPlans.length);
    }
    return {
      id: idx + 1,
      slug: dest.id,
      name: dest.name,
      region: dest.region || (dest.isChile ? 'Chile' : 'Mundo'),
      commune: firstComuna,
      country: dest.country || (dest.isChile ? 'Chile' : 'Internacional'),
      avg_daily_cost_clp: avgCost,
      tags: dest.popularInterests || ['turismo', 'cultura'],
      description: dest.description || `Destino turístico ${dest.name}`,
      hero_image: dest.heroImage || null,
      photographer: dest.photographer || null,
    };
  });
}

// 1. Healthcheck
app.get('/health', async (_req: Request, res: Response) => {
  const dbOk = await checkDbConnection();
  res.json({
    status: 'ok',
    service: 'catalog-service',
    port: PORT,
    database: {
      connected: dbOk,
      url: dbUrl.replace(/:[^:@]+@/, ':****@'),
    },
    timestamp: new Date().toISOString(),
  });
});

// 2. Destinos (DB con Fallback a estático)
app.get('/destinations', async (_req: Request, res: Response) => {
  try {
    if (await checkDbConnection()) {
      const result = await pool.query(
        'SELECT id, name, region, commune, country, avg_daily_cost_clp, tags, description FROM destinations ORDER BY id ASC'
      );
      if (result.rows.length > 0) {
        return res.json(result.rows);
      }
    }
  } catch (err: any) {
    console.warn('[catalog-service] Error consultando PostgreSQL para destinos, usando catálogo estático:', err.message);
  }

  const staticData = getStaticDestinations();
  return res.json(staticData);
});

// 3. Fotos con caché en PostgreSQL
app.get('/photos', async (req: Request, res: Response) => {
  const query = (req.query.query as string) || '';
  const count = Number(req.query.count) || 4;

  if (!query.trim()) {
    return res.status(400).json({ error: 'El parámetro query es requerido.' });
  }

  const queryKey = query.trim().toLowerCase();

  try {
    if (await checkDbConnection()) {
      const cacheResult = await pool.query(
        'SELECT query_key, photo_url, photographer, updated_at FROM photo_cache WHERE query_key = $1',
        [queryKey]
      );
      if (cacheResult.rows.length > 0) {
        const cached = cacheResult.rows[0];
        return res.json({
          success: true,
          query,
          source: 'database_cache',
          photos: [
            {
              url: cached.photo_url,
              photographer: cached.photographer || 'Pexels Contributor',
              photographerUrl: 'https://www.pexels.com',
              alt: query,
            },
          ],
        });
      }
    }
  } catch (dbErr: any) {
    console.warn('[catalog-service] Error consultando photo_cache en DB:', dbErr.message);
  }

  try {
    const photos = await searchPexelsPhotos(query, count);

    if (photos.length > 0) {
      const firstPhoto = photos[0];
      checkDbConnection().then((connected) => {
        if (connected) {
          pool
            .query(
              `INSERT INTO photo_cache (query_key, photo_url, photographer, updated_at)
               VALUES ($1, $2, $3, NOW())
               ON CONFLICT (query_key) DO UPDATE
               SET photo_url = EXCLUDED.photo_url,
                   photographer = EXCLUDED.photographer,
                   updated_at = NOW()`,
              [queryKey, firstPhoto.url, firstPhoto.photographer]
            )
            .catch((e) => console.warn('[catalog-service] Error guardando en photo_cache:', e.message));
        }
      });
    }

    return res.json({
      success: true,
      query,
      source: 'pexels_api',
      photos,
    });
  } catch (err: any) {
    console.error('[catalog-service] Error buscando fotos en Pexels:', err);
    return res.status(500).json({ error: err.message || 'Error buscando fotos' });
  }
});

// 4. Itinerarios guardados por usuario (GET /saved/:userId y GET /saved)
async function handleGetSaved(req: Request, res: Response) {
  const rawUserId = req.params.userId || (req.query.userId as string);
  const numericUserId = rawUserId && !Number.isNaN(Number(rawUserId)) ? Number(rawUserId) : null;

  try {
    if (await checkDbConnection()) {
      const result = numericUserId !== null
        ? await pool.query(
            'SELECT id, user_id, destination_name, total_budget_clp, itinerary_data, created_at FROM saved_itineraries WHERE user_id = $1 ORDER BY created_at DESC',
            [numericUserId]
          )
        : await pool.query(
            'SELECT id, user_id, destination_name, total_budget_clp, itinerary_data, created_at FROM saved_itineraries ORDER BY created_at DESC'
          );

      return res.json({
        success: true,
        source: 'database',
        count: result.rows.length,
        saved: result.rows,
      });
    }
  } catch (err: any) {
    console.warn('[catalog-service] Error leyendo saved_itineraries de DB, usando memoria:', err.message);
  }

  const filtered = numericUserId !== null
    ? inMemorySavedItineraries.filter((item) => item.user_id === numericUserId)
    : inMemorySavedItineraries;

  return res.json({
    success: true,
    source: 'in_memory',
    count: filtered.length,
    saved: filtered,
  });
}

app.get('/saved/:userId', handleGetSaved);
app.get('/saved', handleGetSaved);

// 5. Guardar itinerario asociado al usuario (POST /saved)
app.post('/saved', async (req: Request, res: Response) => {
  try {
    const body = req.body || {};
    const rawUserId = body.userId ?? body.user_id ?? 1;
    const userId = !Number.isNaN(Number(rawUserId)) && Number(rawUserId) > 0 ? Number(rawUserId) : 1;
    const destinationName = String(body.destinationName || body.destination || body.title || 'Destino').slice(0, 150);
    const totalBudgetClp = Number(body.totalBudgetClp || body.totalCost || 0);
    const itineraryData = body.itineraryData || body;

    if (await checkDbConnection()) {
      try {
        const insertRes = await pool.query(
          `INSERT INTO saved_itineraries (user_id, destination_name, total_budget_clp, itinerary_data, created_at)
           VALUES ($1, $2, $3, $4, NOW())
           RETURNING id, user_id, destination_name, total_budget_clp, itinerary_data, created_at`,
          [userId, destinationName, totalBudgetClp, JSON.stringify(itineraryData)]
        );

        return res.status(201).json({
          success: true,
          source: 'database',
          saved: insertRes.rows[0],
        });
      } catch (dbInsertErr: any) {
        console.warn('[catalog-service] Error insertando en DB, guardando en memoria:', dbInsertErr.message);
      }
    }

    const item: InMemSaved = {
      id: nextInMemSavedId++,
      user_id: userId,
      destination_name: destinationName,
      total_budget_clp: totalBudgetClp,
      itinerary_data: itineraryData,
      created_at: new Date().toISOString(),
    };

    inMemorySavedItineraries.unshift(item);
    return res.status(201).json({
      success: true,
      source: 'in_memory',
      saved: item,
    });
  } catch (err: any) {
    console.error('[catalog-service] Error en POST /saved:', err);
    return res.status(500).json({ error: err.message || 'Error guardando itinerario' });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`📦 Catalog Service corriendo en http://0.0.0.0:${PORT}`);
});

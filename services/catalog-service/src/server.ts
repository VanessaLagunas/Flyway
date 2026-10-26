import path from 'node:path';
import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import { Pool } from 'pg';
import { DESTINATIONS_CATALOG } from './data/destinationsData';
import {
  getPhotoWithCacheAside,
  extractCleanDestinationName,
  normalizePhotoQueryKey,
} from './photoService';

dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const app = express();
const PORT = Number(process.env.PORT) || 4002;

app.use(express.json({ limit: '10mb' }));

// PostgreSQL Pool (resiliente ante desconexión)
const dbUrl = process.env.DATABASE_URL || 'postgres://flyway:flyway_pass@postgres-db:5432/flyway_db';
export const pool = new Pool({
  connectionString: dbUrl,
  connectionTimeoutMillis: 3000,
  max: 10,
});

pool.on('error', (err) => {
  console.warn('[catalog-service] Error inesperado en cliente inactivo del Pool PostgreSQL:', err.message);
});

let schemaEnsured = false;

// Verificador de conexión a DB + auto-aseguramiento idempotente de esquema
export async function checkDbConnection(): Promise<boolean> {
  try {
    const client = await pool.connect();
    try {
      await client.query('SELECT 1');
      if (!schemaEnsured) {
        await client.query(`
          DELETE FROM destinations a USING destinations b
          WHERE a.id > b.id AND a.name = b.name;
          CREATE UNIQUE INDEX IF NOT EXISTS idx_destinations_name_unique ON destinations(name);
          CREATE INDEX IF NOT EXISTS idx_destinations_name_lower ON destinations(LOWER(name));
          ALTER TABLE photo_cache ADD COLUMN IF NOT EXISTS destination_name VARCHAR(150);
          ALTER TABLE photo_cache ADD COLUMN IF NOT EXISTS photographer VARCHAR(150);
          ALTER TABLE photo_cache ADD COLUMN IF NOT EXISTS photographer_url TEXT;
          ALTER TABLE photo_cache ADD COLUMN IF NOT EXISTS photos_json JSONB DEFAULT '[]'::jsonb;
          ALTER TABLE photo_cache ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
        `);
        schemaEnsured = true;
      }
      return true;
    } finally {
      client.release();
    }
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

// Fallback de catálogo estático + dinámico en memoria
export interface CatalogDestinationRecord {
  id: number;
  name: string;
  region: string;
  commune: string;
  country: string;
  avg_daily_cost_clp: number;
  tags: string[];
  description: string;
  slug?: string;
  hero_image?: string | null;
  photographer?: string | null;
}

const inMemoryDestinations: CatalogDestinationRecord[] = DESTINATIONS_CATALOG.map((dest, idx) => {
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

/**
 * Función de persistencia dinámica de destinos (Catálogo Vivo):
 * Ejecuta INSERT ... ON CONFLICT (name) DO UPDATE parametrizado con $1..$7
 */
export async function upsertDestination(payload: any): Promise<{
  source: 'database' | 'in_memory_fallback';
  destination: CatalogDestinationRecord;
}> {
  const rawName = String(payload?.destination || payload?.name || '').trim();
  const cleanName = extractCleanDestinationName(rawName);
  if (!cleanName) {
    throw new Error('El campo destination o name es obligatorio para upsert.');
  }

  const region = String(payload?.region || 'Chile').trim().slice(0, 150);
  const commune = String(payload?.commune || cleanName).trim().slice(0, 150);
  const country = String(payload?.country || 'Chile').trim().slice(0, 100);
  const rawCost = Number(payload?.avgDailyCostCLP ?? payload?.avg_daily_cost_clp ?? payload?.totalEstimatedCostCLP ?? 50000);
  const avgDailyCostClp = Number.isFinite(rawCost) && rawCost > 0 ? Math.round(rawCost) : 50000;
  const tags: string[] = Array.isArray(payload?.tags)
    ? payload.tags.map((t: any) => String(t).toLowerCase().trim()).filter(Boolean)
    : ['turismo', 'cultura'];
  const description = String(
    payload?.description || payload?.summary || `Destino turístico destacado en ${region}, ${country}.`
  ).trim();

  if (await checkDbConnection()) {
    try {
      const result = await pool.query(
        `INSERT INTO destinations (name, region, commune, country, avg_daily_cost_clp, tags, description)
         VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7)
         ON CONFLICT (name) DO UPDATE
         SET region = EXCLUDED.region,
             commune = EXCLUDED.commune,
             country = EXCLUDED.country,
             avg_daily_cost_clp = EXCLUDED.avg_daily_cost_clp,
             tags = EXCLUDED.tags,
             description = EXCLUDED.description
         RETURNING id, name, region, commune, country, avg_daily_cost_clp, tags, description`,
        [cleanName, region, commune, country, avgDailyCostClp, JSON.stringify(tags), description]
      );

      return {
        source: 'database',
        destination: result.rows[0],
      };
    } catch (dbErr: any) {
      console.warn('[catalog-service] Error ejecutando upsert en PostgreSQL, aplicando fallback en memoria:', dbErr.message);
    }
  } else {
    console.warn('[catalog-service] PostgreSQL no disponible para POST /destinations/upsert, actualizando catálogo en memoria.');
  }

  const existingIdx = inMemoryDestinations.findIndex(
    (d) => normalizePhotoQueryKey(d.name) === normalizePhotoQueryKey(cleanName)
  );
  if (existingIdx >= 0) {
    inMemoryDestinations[existingIdx] = {
      ...inMemoryDestinations[existingIdx],
      name: cleanName,
      region,
      commune,
      country,
      avg_daily_cost_clp: avgDailyCostClp,
      tags,
      description,
    };
    return {
      source: 'in_memory_fallback',
      destination: inMemoryDestinations[existingIdx],
    };
  }

  const created: CatalogDestinationRecord = {
    id: inMemoryDestinations.length + 1,
    name: cleanName,
    region,
    commune,
    country,
    avg_daily_cost_clp: avgDailyCostClp,
    tags,
    description,
  };
  inMemoryDestinations.push(created);
  return {
    source: 'in_memory_fallback',
    destination: created,
  };
}

// 1. Healthcheck
app.get('/health', async (_req: Request, res: Response) => {
  const dbOk = await checkDbConnection();
  res.json({
    status: 'ok',
    service: 'catalog-service',
    port: PORT,
    hasPexelsKey: Boolean(process.env.PEXELS_API_KEY && process.env.PEXELS_API_KEY.trim()),
    database: {
      connected: dbOk,
      url: dbUrl.replace(/:[^:@]+@/, ':****@'),
    },
    timestamp: new Date().toISOString(),
  });
});

// 2. Destinos (DB con Fallback a estático/en memoria)
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
    console.warn('[catalog-service] Error consultando PostgreSQL para destinos, usando catálogo en memoria:', err.message);
  }

  return res.json(inMemoryDestinations);
});

// 2b. Upsert dinámico de destinos (POST /destinations/upsert)
app.post('/destinations/upsert', async (req: Request, res: Response) => {
  try {
    const rawName = req.body?.destination || req.body?.name;
    if (!rawName || typeof rawName !== 'string' || !rawName.trim()) {
      return res.status(400).json({ error: 'El campo destination o name es obligatorio.' });
    }

    const result = await upsertDestination(req.body);
    return res.status(200).json({
      success: true,
      source: result.source,
      destination: result.destination,
    });
  } catch (err: any) {
    console.warn('[catalog-service] Error en POST /destinations/upsert:', err.message);
    return res.status(500).json({ error: err.message || 'Error en upsert de destino' });
  }
});

// 3. Fotos con Patrón Cache-Aside en PostgreSQL (GET /photos?destination=... o GET /photos?query=...)
app.get('/photos', async (req: Request, res: Response) => {
  const rawQuery =
    (req.query.destination as string) ||
    (req.query.query as string) ||
    (req.query.q as string) ||
    '';
  const count = Number(req.query.count) || 4;

  if (!rawQuery.trim()) {
    return res.status(400).json({ error: 'El parámetro destination o query es requerido.' });
  }

  try {
    const result = await getPhotoWithCacheAside(pool, rawQuery, count, checkDbConnection);
    return res.status(200).json(result);
  } catch (err: any) {
    console.warn('[catalog-service] Error inesperado en GET /photos, usando fallback:', err.message);
    return res.status(200).json({
      success: true,
      cacheHit: false,
      source: 'curated_fallback',
      query: rawQuery,
      queryKey: normalizePhotoQueryKey(rawQuery),
      destinationName: extractCleanDestinationName(rawQuery),
      photoUrl: 'https://images.pexels.com/photos/17808457/pexels-photo-17808457.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
      photo_url: 'https://images.pexels.com/photos/17808457/pexels-photo-17808457.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
      photographer: 'Lais Queiroz (Pexels)',
      photographerUrl: 'https://www.pexels.com/@laisqfotografia',
      photographer_url: 'https://www.pexels.com/@laisqfotografia',
      photos: [
        {
          url: 'https://images.pexels.com/photos/17808457/pexels-photo-17808457.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
          photographer: 'Lais Queiroz (Pexels)',
          photographerUrl: 'https://www.pexels.com/@laisqfotografia',
          alt: rawQuery,
        },
      ],
    });
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
    const totalBudgetClp = Number(body.totalBudgetClp || body.totalEstimatedCostCLP || body.totalCost || 0);
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

export { app };

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`📦 Catalog Service corriendo en http://0.0.0.0:${PORT}`);
  });
}

import { Pool } from 'pg';
import { PexelsPhotoResult, searchPexelsPhotos } from './pexels';
import { DESTINATIONS_CATALOG } from './data/destinationsData';

export interface PhotoCacheAsideResult {
  success: boolean;
  cacheHit: boolean;
  source: 'database_cache' | 'pexels_api' | 'curated_fallback';
  query: string;
  queryKey: string;
  destinationName: string;
  photoUrl: string;
  photo_url: string;
  photographer: string;
  photographerUrl: string;
  photographer_url: string;
  updatedAt?: string;
  photo: PexelsPhotoResult;
  photos: PexelsPhotoResult[];
}

/**
 * Curated high-resolution fallback photos by normalized destination keyword
 */
const CURATED_DESTINATION_FALLBACKS: Record<string, PexelsPhotoResult> = {
  'san pedro de atacama': {
    url: 'https://images.pexels.com/photos/27878411/pexels-photo-27878411.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
    photographer: 'Eleanore Stohner',
    photographerUrl: 'https://www.pexels.com/@eleanore-stohner-499317537',
    alt: 'San Pedro de Atacama, Chile',
  },
  valparaiso: {
    url: 'https://images.pexels.com/photos/17808457/pexels-photo-17808457.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
    photographer: 'Lais Queiroz',
    photographerUrl: 'https://www.pexels.com/@laisqfotografia',
    alt: 'Cerros patrimoniales de Valparaíso, Chile',
  },
  santiago: {
    url: 'https://images.pexels.com/photos/37314783/pexels-photo-37314783.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
    photographer: 'Nikolai Kolosov',
    photographerUrl: 'https://www.pexels.com/@nikolai-kolosov-20411833',
    alt: 'Santiago de Chile y Cordillera de los Andes',
  },
  pucon: {
    url: 'https://images.pexels.com/photos/1578750/pexels-photo-1578750.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
    photographer: 'Visit Greenland',
    photographerUrl: 'https://www.pexels.com',
    alt: 'Pucón y Volcán Villarrica, Chile',
  },
  'torres del paine': {
    url: 'https://images.pexels.com/photos/30359266/pexels-photo-30359266.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
    photographer: 'Marek Piwnicki',
    photographerUrl: 'https://www.pexels.com/@marekpiwnicki',
    alt: 'Parque Nacional Torres del Paine, Patagonia Chile',
  },
  chiloe: {
    url: 'https://images.pexels.com/photos/7213869/pexels-photo-7213869.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
    photographer: "Tom D'Arby",
    photographerUrl: 'https://www.pexels.com/@tomdarby',
    alt: 'Palafitos e iglesias de Chiloé, Chile',
  },
  'puerto varas': {
    url: 'https://images.pexels.com/photos/1619317/pexels-photo-1619317.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
    photographer: 'James Wheeler',
    photographerUrl: 'https://www.pexels.com/@souvenirpixels',
    alt: 'Lago Llanquihue y Volcán Osorno en Puerto Varas',
  },
  noruega: {
    url: 'https://images.pexels.com/photos/33695268/pexels-photo-33695268.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
    photographer: 'Alexander Shch',
    photographerUrl: 'https://www.pexels.com',
    alt: 'Fiordos e Islas Lofoten en Noruega',
  },
  rusia: {
    url: 'https://images.pexels.com/photos/8612083/pexels-photo-8612083.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
    photographer: 'Elena Golovchenko',
    photographerUrl: 'https://www.pexels.com',
    alt: 'Arquitectura histórica y Catedral de San Basilio en Rusia',
  },
  'polo sur': {
    url: 'https://images.pexels.com/photos/1670977/pexels-photo-1670977.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
    photographer: 'Francesco Ungaro',
    photographerUrl: 'https://www.pexels.com',
    alt: 'Montañas y campos de hielo en el Polo Sur / Antártica',
  },
  tokio: {
    url: 'https://images.pexels.com/photos/1440476/pexels-photo-1440476.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
    photographer: 'Aleksandar Pasaric',
    photographerUrl: 'https://www.pexels.com/@apasaric',
    alt: 'Templo Senso-ji y arquitectura histórica en Tokio, Japón',
  },
  roma: {
    url: 'https://images.pexels.com/photos/2064827/pexels-photo-2064827.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
    photographer: 'Davide De Giovanni',
    photographerUrl: 'https://www.pexels.com/@davidedegiovanni',
    alt: 'Coliseo Romano al atardecer en Roma, Italia',
  },
  paris: {
    url: 'https://images.pexels.com/photos/2363/france-landmark-lights-night.jpg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
    photographer: 'Pexels Contributor',
    photographerUrl: 'https://www.pexels.com',
    alt: 'Pirámide del Louvre y arquitectura en París, Francia',
  },
  'buenos aires': {
    url: 'https://images.pexels.com/photos/13694408/pexels-photo-13694408.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
    photographer: 'Matias Lugea',
    photographerUrl: 'https://www.pexels.com',
    alt: 'Avenida 9 de Julio y Obelisco en Buenos Aires, Argentina',
  },
  'nueva york': {
    url: 'https://images.pexels.com/photos/139300/pexels-photo-139300.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
    photographer: 'Vlad Alexandru Popa',
    photographerUrl: 'https://www.pexels.com',
    alt: 'Skyline y rascacielos de Manhattan en Nueva York',
  },
  cancun: {
    url: 'https://images.pexels.com/photos/13732857/pexels-photo-13732857.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
    photographer: 'Asad Photo Maldives',
    photographerUrl: 'https://www.pexels.com',
    alt: 'Playas turquesas y arrecifes en Cancún y el Caribe',
  },
};

const DEFAULT_FALLBACK_PHOTO: PexelsPhotoResult = {
  url: 'https://images.pexels.com/photos/1525041/pexels-photo-1525041.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  photographer: 'Frans van Heerden (Pexels Curated)',
  photographerUrl: 'https://www.pexels.com/@frans-van-heerden-201846',
  alt: 'Paisaje turístico y cumbres naturales',
};

/**
 * Normaliza el parámetro de búsqueda para query_key en PostgreSQL:
 * - minúsculas
 * - trim
 * - remueve diacríticos / tildes
 * - descarta sufijo de país o región separado por coma (ej. "San Pedro de Atacama, Chile" -> "san pedro de atacama")
 */
export function normalizePhotoQueryKey(rawQuery: string): string {
  if (!rawQuery || typeof rawQuery !== 'string') {
    return '';
  }

  // 1. Descartar sufijos después de coma (ej. ", Chile", ", Perú")
  const primaryPart = rawQuery.split(',')[0].trim() || rawQuery.trim();

  // 2. Remover paréntesis opcionales, pasar a minúsculas y quitar diacríticos/tildes
  let normalized = primaryPart
    .replace(/\([^)]*\)/g, ' ')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  // 3. Si el país venía sin coma al final (ej. "San Pedro de Atacama Chile"), descartarlo cuando hay más palabras antes
  normalized = normalized.replace(
    /\s+(?:chile|peru|argentina|brasil|brazil|japon|japan|italia|italy|francia|france|espana|spain|estados unidos|usa)$/i,
    ''
  );

  // 4. Colapsar espacios múltiples y hacer trim
  return normalized.replace(/\s+/g, ' ').trim();
}

/**
 * Extrae el nombre limpio del destino sin el sufijo del país (ej. "San Pedro de Atacama, Chile" -> "San Pedro de Atacama")
 */
export function extractCleanDestinationName(rawQuery: string): string {
  if (!rawQuery || typeof rawQuery !== 'string') {
    return 'Destino';
  }
  const firstSegment = rawQuery.split(',')[0].replace(/\([^)]*\)/g, '').trim();
  return (firstSegment || rawQuery.trim()).slice(0, 150);
}

/**
 * Obtiene una foto de respaldo curada (fallback) cuando Pexels falla, no hay API Key o no hay internet
 */
export function getCuratedFallbackPhoto(rawQuery: string): PexelsPhotoResult {
  const key = normalizePhotoQueryKey(rawQuery);
  const cleanName = extractCleanDestinationName(rawQuery);

  if (CURATED_DESTINATION_FALLBACKS[key]) {
    return CURATED_DESTINATION_FALLBACKS[key];
  }

  for (const [k, photo] of Object.entries(CURATED_DESTINATION_FALLBACKS)) {
    if (key.includes(k) || k.includes(key)) {
      return photo;
    }
  }

  const catalogMatch = DESTINATIONS_CATALOG.find((dest) => {
    const destNorm = normalizePhotoQueryKey(dest.name);
    return key.includes(destNorm) || destNorm.includes(key);
  });

  if (catalogMatch && catalogMatch.heroImage) {
    return {
      url: catalogMatch.heroImage,
      photographer: catalogMatch.photographer || 'Pexels Contributor',
      photographerUrl: 'https://www.pexels.com',
      alt: catalogMatch.name,
    };
  }

  return {
    ...DEFAULT_FALLBACK_PHOTO,
    alt: cleanName,
  };
}

/**
 * Persiste o actualiza una foto en la tabla photo_cache de PostgreSQL usando parámetros $1..$6
 */
async function persistPhotoInCache(
  pool: Pool,
  queryKey: string,
  destinationName: string,
  photo: PexelsPhotoResult,
  photosList: PexelsPhotoResult[] = []
): Promise<void> {
  const jsonPayload = JSON.stringify(photosList.length > 0 ? photosList : [photo]);
  await pool.query(
    `INSERT INTO photo_cache (query_key, destination_name, photo_url, photographer, photographer_url, photos_json, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
     ON CONFLICT (query_key) DO UPDATE
     SET destination_name = EXCLUDED.destination_name,
         photo_url = EXCLUDED.photo_url,
         photographer = EXCLUDED.photographer,
         photographer_url = EXCLUDED.photographer_url,
         photos_json = EXCLUDED.photos_json,
         updated_at = CURRENT_TIMESTAMP`,
    [
      queryKey,
      destinationName.slice(0, 150),
      photo.url,
      (photo.photographer || 'Pexels Contributor').slice(0, 150),
      photo.photographerUrl || 'https://www.pexels.com',
      jsonPayload,
    ]
  );
}

/**
 * Implementación del Patrón Cache-Aside sobre PostgreSQL + Pexels API + Fallback Curado:
 * a) Normaliza el parámetro de búsqueda (query_key).
 * b) Busca primero en photo_cache por query_key (Cache Hit -> retorna de DB en ms sin llamar a Pexels).
 * c) Si no existe (Cache Miss), consulta Pexels API con process.env.PEXELS_API_KEY y persiste con INSERT ... ON CONFLICT (query_key) DO UPDATE.
 * d) Si falla Pexels o no hay internet/credenciales, retorna una URL de respaldo curada sin romper la aplicación.
 */
export async function getPhotoWithCacheAside(
  pool: Pool,
  rawQuery: string,
  count = 4,
  checkDbFn?: () => Promise<boolean>
): Promise<PhotoCacheAsideResult> {
  const queryKey = normalizePhotoQueryKey(rawQuery);
  const destinationName = extractCleanDestinationName(rawQuery);
  const dbAvailable = checkDbFn ? await checkDbFn() : true;

  // -------------------------------------------------------------------------
  // Paso B: Consultar primero en PostgreSQL (photo_cache por query_key)
  // -------------------------------------------------------------------------
  if (dbAvailable && queryKey && queryKey.length >= 3) {
    try {
      const cacheResult = await pool.query(
        `SELECT query_key, destination_name, photo_url, photographer, photographer_url, photos_json, updated_at
         FROM photo_cache
         WHERE query_key = $1`,
        [queryKey]
      );

      if (cacheResult.rows.length > 0) {
        const cached = cacheResult.rows[0];
        const cachedPhoto: PexelsPhotoResult = {
          url: cached.photo_url,
          photographer: cached.photographer || 'Pexels Contributor',
          photographerUrl: cached.photographer_url || 'https://www.pexels.com',
          alt: cached.destination_name || destinationName,
        };

        let cachedPhotos: PexelsPhotoResult[] = [cachedPhoto];
        if (cached.photos_json) {
          try {
            const parsed = typeof cached.photos_json === 'string' ? JSON.parse(cached.photos_json) : cached.photos_json;
            if (Array.isArray(parsed) && parsed.length > 0) {
              cachedPhotos = parsed;
            }
          } catch {}
        }

        // Si la petición pide muchas fotos (ej: 10 para itinerario) y solo hay 1 en caché,
        // permitimos enriquecer la caché desde Pexels si hay API Key.
        if (count <= 4 || cachedPhotos.length >= 3 || !process.env.PEXELS_API_KEY) {
          return {
            success: true,
            cacheHit: true,
            source: 'database_cache',
            query: rawQuery,
            queryKey: cached.query_key,
            destinationName: cached.destination_name || destinationName,
            photoUrl: cachedPhoto.url,
            photo_url: cachedPhoto.url,
            photographer: cachedPhoto.photographer,
            photographerUrl: cachedPhoto.photographerUrl,
            photographer_url: cachedPhoto.photographerUrl,
            updatedAt: cached.updated_at,
            photo: cachedPhoto,
            photos: cachedPhotos,
          };
        }
      }
    } catch (dbReadErr: any) {
      console.warn('[catalog-service][PhotoService] Error leyendo photo_cache en PostgreSQL:', dbReadErr?.message || dbReadErr);
    }
  }

  // -------------------------------------------------------------------------
  // Paso C: Cache Miss -> Consultar API de Pexels con process.env.PEXELS_API_KEY
  // -------------------------------------------------------------------------
  const pexelsApiKey = (process.env.PEXELS_API_KEY || '').trim();
  if (!pexelsApiKey) {
    console.warn(
      `[catalog-service][PhotoService] PEXELS_API_KEY no configurada en .env para "${destinationName}". Usando URL de respaldo curada (fallback).`
    );
  } else {
    try {
      const pexelsPhotos = await searchPexelsPhotos(destinationName, count);
      if (Array.isArray(pexelsPhotos) && pexelsPhotos.length > 0) {
        const primaryPhoto = pexelsPhotos[0];

        if (dbAvailable && queryKey && queryKey.length >= 3) {
          try {
            await persistPhotoInCache(pool, queryKey, destinationName, primaryPhoto, pexelsPhotos);
          } catch (dbWriteErr: any) {
            console.warn('[catalog-service][PhotoService] Error guardando foto de Pexels en photo_cache:', dbWriteErr?.message || dbWriteErr);
          }
        }

        return {
          success: true,
          cacheHit: false,
          source: 'pexels_api',
          query: rawQuery,
          queryKey,
          destinationName,
          photoUrl: primaryPhoto.url,
          photo_url: primaryPhoto.url,
          photographer: primaryPhoto.photographer,
          photographerUrl: primaryPhoto.photographerUrl,
          photographer_url: primaryPhoto.photographerUrl,
          photo: primaryPhoto,
          photos: pexelsPhotos,
        };
      }
      console.warn(`[catalog-service][PhotoService] Pexels no devolvió resultados para "${destinationName}". Usando foto curada de respaldo.`);
    } catch (pexelsErr: any) {
      console.warn(
        `[catalog-service][PhotoService] Falló consulta a Pexels API para "${destinationName}" (${pexelsErr?.message || pexelsErr}). Usando foto curada de respaldo.`
      );
    }
  }

  // -------------------------------------------------------------------------
  // Paso D: Fallback curado resiliente si Pexels falla o no hay internet/API key
  // -------------------------------------------------------------------------
  const fallbackPhoto = getCuratedFallbackPhoto(rawQuery);

  return {
    success: true,
    cacheHit: false,
    source: 'curated_fallback',
    query: rawQuery,
    queryKey,
    destinationName,
    photoUrl: fallbackPhoto.url,
    photo_url: fallbackPhoto.url,
    photographer: fallbackPhoto.photographer,
    photographerUrl: fallbackPhoto.photographerUrl,
    photographer_url: fallbackPhoto.photographerUrl,
    photo: fallbackPhoto,
    photos: [fallbackPhoto],
  };
}

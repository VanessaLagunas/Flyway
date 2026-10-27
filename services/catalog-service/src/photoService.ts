import { Pool } from 'pg';
import {
  PexelsPhotoResult,
  searchPexelsPhotos,
  extractPexelsPhotoId,
  getAllHistoricalFallbackUrls,
} from './pexels';
import { DESTINATIONS_CATALOG } from './data/destinationsData';

export const PHOTO_CACHE_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

export interface PhotoCacheOptions {
  bypassCache?: boolean;
  country?: string;
  checkDbFn?: () => Promise<boolean>;
}

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
 * (used ONLY as in-memory response when Pexels API is unavailable — never persisted to photo_cache).
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

export const DEFAULT_FALLBACK_PHOTO: PexelsPhotoResult = {
  url: 'https://images.pexels.com/photos/1525041/pexels-photo-1525041.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  photographer: 'Frans van Heerden (Pexels Curated)',
  photographerUrl: 'https://www.pexels.com/@frans-van-heerden-201846',
  alt: 'Paisaje turístico y cumbres naturales',
};

const STATIC_CONTINGENCY_BASE_URLS = new Set<string>();
const STATIC_CONTINGENCY_PEXELS_IDS = new Set<string>();

function registerContingencyUrl(rawUrl?: string | null): void {
  if (!rawUrl || typeof rawUrl !== 'string') return;
  const trimmed = rawUrl.trim();
  if (!trimmed) return;
  STATIC_CONTINGENCY_BASE_URLS.add(trimmed.split('?')[0].trim());
  const id = extractPexelsPhotoId(trimmed);
  if (id) STATIC_CONTINGENCY_PEXELS_IDS.add(id);
}

registerContingencyUrl(DEFAULT_FALLBACK_PHOTO.url);
for (const p of Object.values(CURATED_DESTINATION_FALLBACKS)) {
  registerContingencyUrl(p.url);
}
for (const dest of DESTINATIONS_CATALOG) {
  registerContingencyUrl(dest.heroImage);
}
for (const url of getAllHistoricalFallbackUrls()) {
  registerContingencyUrl(url);
}

function normalizeTokenString(input: string): string {
  return (input || '')
    .replace(/\([^)]*\)/g, ' ')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Normalizes query_key for PostgreSQL photo_cache, preserving country context
 * (either inline after comma or passed via `country`) so distinct destinations
 * across countries (e.g., Córdoba Argentina vs Córdoba España) never collide.
 */
export function normalizePhotoQueryKey(rawQuery: string, country?: string): string {
  if (!rawQuery || typeof rawQuery !== 'string') {
    return '';
  }

  const baseNorm = normalizeTokenString(rawQuery);
  if (!baseNorm) return '';

  const countryNorm = country && typeof country === 'string' ? normalizeTokenString(country) : '';
  if (countryNorm) {
    const baseWords = new Set(baseNorm.split(' '));
    const countryWords = countryNorm.split(' ').filter(Boolean);
    const missingCountryWords = countryWords.filter((w) => !baseWords.has(w));
    if (missingCountryWords.length > 0) {
      return `${baseNorm} ${missingCountryWords.join(' ')}`.trim().slice(0, 150);
    }
  }

  return baseNorm.slice(0, 150);
}

/**
 * Extracts clean destination name without country suffix (e.g. "San Pedro de Atacama, Chile" -> "San Pedro de Atacama").
 */
export function extractCleanDestinationName(rawQuery: string): string {
  if (!rawQuery || typeof rawQuery !== 'string') {
    return 'Destino';
  }
  const firstSegment = rawQuery.split(',')[0].replace(/\([^)]*\)/g, '').trim();
  return (firstSegment || rawQuery.trim()).slice(0, 150);
}

function extractEffectiveCountry(rawQuery: string, explicitCountry?: string): string {
  if (explicitCountry && typeof explicitCountry === 'string' && explicitCountry.trim()) {
    return explicitCountry.trim();
  }
  if (rawQuery && typeof rawQuery === 'string' && rawQuery.includes(',')) {
    return rawQuery
      .split(',')
      .slice(1)
      .join(' ')
      .replace(/\([^)]*\)/g, '')
      .trim();
  }
  return '';
}

/**
 * Checks whether a cached row's updated_at timestamp is older than TTL (default 12 hours).
 */
export function isPhotoCacheExpired(updatedAt: unknown, ttlMs = PHOTO_CACHE_TTL_MS): boolean {
  if (!updatedAt) return true;
  const ts =
    updatedAt instanceof Date
      ? updatedAt.getTime()
      : new Date(String(updatedAt)).getTime();
  if (!Number.isFinite(ts)) return true;
  return Date.now() - ts > ttlMs;
}

/**
 * Detects whether a cached URL/photographer corresponds to a static contingency fallback
 * rather than a live Pexels API result.
 */
export function isContingencyFallbackUrl(url: string, photographer = ''): boolean {
  if (!url || typeof url !== 'string' || !url.trim().startsWith('http')) {
    return true;
  }
  const cleanBase = url.trim().split('?')[0].trim();
  if (STATIC_CONTINGENCY_BASE_URLS.has(cleanBase)) {
    return true;
  }
  const photoId = extractPexelsPhotoId(url);
  if (photoId && STATIC_CONTINGENCY_PEXELS_IDS.has(photoId)) {
    return true;
  }
  if (/fallback|contingency|placeholder|unsplash\.com/i.test(url)) {
    return true;
  }
  if (/pexels\s+curated|fallback|contingency/i.test(photographer || '')) {
    return true;
  }
  return false;
}

/**
 * Returns a curated fallback photo when Pexels fails, has no API key, or is offline.
 */
export function getCuratedFallbackPhoto(rawQuery: string, country?: string): PexelsPhotoResult {
  const cleanName = extractCleanDestinationName(rawQuery);
  const destKey = normalizeTokenString(cleanName);
  const fullKey = normalizePhotoQueryKey(rawQuery, country);

  if (CURATED_DESTINATION_FALLBACKS[destKey]) {
    return CURATED_DESTINATION_FALLBACKS[destKey];
  }

  for (const [k, photo] of Object.entries(CURATED_DESTINATION_FALLBACKS)) {
    if (fullKey === k || fullKey.includes(k)) {
      return photo;
    }
  }

  const catalogMatch = DESTINATIONS_CATALOG.find((dest) => {
    const destNorm = normalizeTokenString(dest.name);
    if (!destNorm || destNorm.length < 3) return false;
    const countryNorm = normalizeTokenString(country || '');
    if (countryNorm && dest.country && normalizeTokenString(dest.country) !== countryNorm) {
      return false;
    }
    return destKey === destNorm || fullKey.includes(destNorm);
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
 * Persists or updates genuine Pexels API photos in PostgreSQL photo_cache.
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
 * Cache-Aside photo lookup over PostgreSQL + Pexels API + resilient non-persisted fallback.
 * Supports both call signatures:
 * 1) getPhotoWithCacheAside(rawDestination, requestedCount, pool, options)
 * 2) getPhotoWithCacheAside(pool, rawQuery, count, checkDbFnOrOptions, options)
 */
export async function getPhotoWithCacheAside(
  rawDestination: string,
  requestedCount?: number,
  pool?: Pool | null,
  options?: PhotoCacheOptions
): Promise<PhotoCacheAsideResult>;
export async function getPhotoWithCacheAside(
  pool: Pool,
  rawQuery: string,
  count?: number,
  checkDbFnOrOptions?: (() => Promise<boolean>) | PhotoCacheOptions,
  options?: PhotoCacheOptions
): Promise<PhotoCacheAsideResult>;
export async function getPhotoWithCacheAside(
  arg1: Pool | string,
  arg2?: string | number,
  arg3?: number | Pool | null,
  arg4?: (() => Promise<boolean>) | PhotoCacheOptions,
  arg5?: PhotoCacheOptions
): Promise<PhotoCacheAsideResult> {
  let pool: Pool | null | undefined;
  let rawQuery: string;
  let count: number;
  let checkDbFn: (() => Promise<boolean>) | undefined;
  let opts: PhotoCacheOptions = {};

  if (typeof arg1 === 'string') {
    rawQuery = arg1;
    count = typeof arg2 === 'number' && arg2 > 0 ? arg2 : 4;
    pool = arg3 && typeof (arg3 as any).query === 'function' ? (arg3 as Pool) : null;
    if (typeof arg4 === 'function') {
      checkDbFn = arg4;
      opts = arg5 || {};
    } else if (arg4 && typeof arg4 === 'object') {
      opts = arg4;
      checkDbFn = opts.checkDbFn;
    }
  } else {
    pool = arg1;
    rawQuery = typeof arg2 === 'string' ? arg2 : '';
    count = typeof arg3 === 'number' && arg3 > 0 ? arg3 : 4;
    if (typeof arg4 === 'function') {
      checkDbFn = arg4;
      opts = arg5 || {};
    } else if (arg4 && typeof arg4 === 'object') {
      opts = arg4;
      checkDbFn = opts.checkDbFn;
    }
  }

  const effectiveCountry = extractEffectiveCountry(rawQuery, opts.country);
  const bypassCache = Boolean(opts.bypassCache);
  const queryKey = normalizePhotoQueryKey(rawQuery, effectiveCountry);
  const destinationName = extractCleanDestinationName(rawQuery);
  const pexelsApiKey = (process.env.PEXELS_API_KEY || '').trim();
  const dbAvailable = Boolean(pool) && (checkDbFn ? await checkDbFn() : true);

  // -------------------------------------------------------------------------
  // Step B: Query PostgreSQL photo_cache first (unless bypassCache is true)
  // -------------------------------------------------------------------------
  if (!bypassCache && dbAvailable && pool && queryKey && queryKey.length >= 3) {
    try {
      const cacheResult = await pool.query(
        `SELECT query_key, destination_name, photo_url, photographer, photographer_url, photos_json, updated_at
         FROM photo_cache
         WHERE query_key = $1`,
        [queryKey]
      );

      if (cacheResult.rows.length > 0) {
        const cached = cacheResult.rows[0];
        const isExpired = isPhotoCacheExpired(cached.updated_at, PHOTO_CACHE_TTL_MS);
        const isStaleFallbackRow =
          Boolean(pexelsApiKey) &&
          isContingencyFallbackUrl(cached.photo_url, cached.photographer);

        if (!isExpired && !isStaleFallbackRow) {
          const cachedPhoto: PexelsPhotoResult = {
            url: cached.photo_url,
            photographer: cached.photographer || 'Pexels Contributor',
            photographerUrl: cached.photographer_url || 'https://www.pexels.com',
            alt: cached.destination_name || destinationName,
          };

          let cachedPhotos: PexelsPhotoResult[] = [cachedPhoto];
          if (cached.photos_json) {
            try {
              const parsed =
                typeof cached.photos_json === 'string'
                  ? JSON.parse(cached.photos_json)
                  : cached.photos_json;
              if (Array.isArray(parsed) && parsed.length > 0) {
                cachedPhotos = parsed;
              }
            } catch {
              // Keep [cachedPhoto]
            }
          }

          if (count <= 4 || cachedPhotos.length >= 3 || !pexelsApiKey) {
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
      }
    } catch (dbReadErr: any) {
      console.warn(
        '[catalog-service][PhotoService] Error leyendo photo_cache en PostgreSQL:',
        dbReadErr?.message || dbReadErr
      );
    }
  }

  // -------------------------------------------------------------------------
  // Step C: Cache Miss / Bypass / Stale -> Query live Pexels API
  // -------------------------------------------------------------------------
  if (!pexelsApiKey) {
    console.warn(
      `[catalog-service][PhotoService] PEXELS_API_KEY no configurada en .env para "${destinationName}". Usando URL de respaldo curada (sin persistir en photo_cache).`
    );
  } else {
    try {
      const pexelsPhotos = await searchPexelsPhotos(destinationName, count, {
        country: effectiveCountry,
      });

      if (Array.isArray(pexelsPhotos) && pexelsPhotos.length > 0) {
        // Ensure primary cached photo isn't accidentally matching a static fallback ID if other live photos exist
        const nonContingencyIdx = pexelsPhotos.findIndex(
          (p) => !isContingencyFallbackUrl(p.url, p.photographer)
        );
        if (nonContingencyIdx > 0) {
          const [preferred] = pexelsPhotos.splice(nonContingencyIdx, 1);
          pexelsPhotos.unshift(preferred);
        }

        const primaryPhoto = pexelsPhotos[0];

        // Persist ONLY genuine pexels_api results into photo_cache
        if (dbAvailable && pool && queryKey && queryKey.length >= 3) {
          try {
            await persistPhotoInCache(pool, queryKey, destinationName, primaryPhoto, pexelsPhotos);
          } catch (dbWriteErr: any) {
            console.warn(
              '[catalog-service][PhotoService] Error guardando foto de Pexels en photo_cache:',
              dbWriteErr?.message || dbWriteErr
            );
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

      console.warn(
        `[catalog-service][PhotoService] Pexels no devolvió resultados para "${destinationName}". Retornando respaldo temporal SIN persistir en photo_cache.`
      );
    } catch (pexelsErr: any) {
      console.warn(
        `[catalog-service][PhotoService] Falló consulta a Pexels API para "${destinationName}" (${pexelsErr?.message || pexelsErr}). Retornando respaldo temporal SIN persistir en photo_cache.`
      );
    }
  }

  // -------------------------------------------------------------------------
  // Step D: Resilient curated fallback (NEVER persisted into photo_cache)
  // -------------------------------------------------------------------------
  const fallbackPhoto = getCuratedFallbackPhoto(rawQuery, effectiveCountry);

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

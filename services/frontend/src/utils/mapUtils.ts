import type { Activity } from '../types';

const GENERIC_ACTION_PREFIX_RE =
  /^(?:almuerzo|cena|desayuno|once|brunch|degustaci[oó]n|cata|visita|recorrido|paseo|tour|caminata|sendero|trekking|excursi[oó]n|exploraci[oó]n|tarde|ma[ñn]ana|noche|experiencia)\s+(?:(?:gastron[oó]mic[oa]|t[ií]pic[oa]|marin[oa]|tradicional|local|cultural|patrimonial|hist[oó]ric[oa]|guiad[oa]|panor[aá]mic[oa]|nocturn[oa])\s+)*(?:en|por|a|al|de|del|hacia)\s+/i;

function normalizeForComparison(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Returns the concrete establishment, park, museum, or landmark name for map lookup,
 * stripping generic itinerary action verbs when `activity.placeName` is not explicitly set.
 */
export function extractCleanPlaceName(activity: Partial<Activity>): string {
  if (typeof activity.placeName === 'string' && activity.placeName.trim().length > 0) {
    return activity.placeName.trim();
  }

  const rawTitle = typeof activity.title === 'string' ? activity.title.trim() : '';
  if (!rawTitle) {
    return '';
  }

  const stripped = rawTitle.replace(GENERIC_ACTION_PREFIX_RE, '').trim();
  return stripped.length > 0 ? stripped : rawTitle;
}

/**
 * Validates geographic coordinates ensuring finite numbers within globe bounds and excluding (0, 0).
 */
export function hasValidCoordinates(
  coords?: { lat: number; lng: number } | null
): coords is { lat: number; lng: number } {
  if (!coords || typeof coords !== 'object') {
    return false;
  }
  const { lat, lng } = coords;
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return false;
  }
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return false;
  }
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return false;
  }
  if (lat === 0 && lng === 0) {
    return false;
  }
  return true;
}

/**
 * Builds a crisp, deduplicated Google Maps search query anchored to the trip destination.
 */
export function buildStopMapSearchQuery(
  activity: Partial<Activity>,
  destination: string,
  country?: string
): string {
  const cleanDest = (destination || '').trim();
  const cleanCountry = (country || '').trim();
  const primaryCity = cleanDest.split(',')[0]?.trim() || '';

  if (typeof activity.mapQuery === 'string' && activity.mapQuery.trim().length > 0) {
    const baseQuery = activity.mapQuery.trim();
    const parts = [baseQuery];

    if (cleanDest && primaryCity) {
      const normBase = normalizeForComparison(baseQuery);
      const normCity = normalizeForComparison(primaryCity);
      if (!normBase.includes(normCity)) {
        parts.push(cleanDest);
      }
    }

    if (cleanCountry) {
      const normJoined = normalizeForComparison(parts.join(', '));
      const normCountry = normalizeForComparison(cleanCountry);
      if (!normJoined.includes(normCountry)) {
        parts.push(cleanCountry);
      }
    }

    return parts.join(', ');
  }

  const cleanPlace = extractCleanPlaceName(activity);
  const cleanSector = typeof activity.addressOrSector === 'string' ? activity.addressOrSector.trim() : '';

  const rawCandidates = [cleanPlace, cleanSector, cleanDest, cleanCountry];
  const uniqueParts: string[] = [];

  for (const candidate of rawCandidates) {
    if (!candidate) continue;
    const normCandidate = normalizeForComparison(candidate);
    if (!normCandidate) continue;

    const alreadyIncluded = uniqueParts.some((existing) => {
      const normExisting = normalizeForComparison(existing);
      return normExisting === normCandidate || normExisting.includes(normCandidate);
    });

    if (!alreadyIncluded) {
      uniqueParts.push(candidate);
    }
  }

  if (uniqueParts.length === 0 && hasValidCoordinates(activity.coordinates)) {
    return `${activity.coordinates.lat},${activity.coordinates.lng}`;
  }

  return uniqueParts.join(', ');
}

/**
 * Builds an interactive Google Maps iframe embed URL centered on the exact stop at zoom 16.
 */
export function buildGoogleMapsEmbedUrl(
  activity: Partial<Activity>,
  destination: string,
  country?: string
): string {
  const cleanPlace = extractCleanPlaceName(activity);
  const hasExplicitQuery = typeof activity.mapQuery === 'string' && activity.mapQuery.trim().length > 0;

  let q = buildStopMapSearchQuery(activity, destination, country);

  if (!hasExplicitQuery && cleanPlace.length < 3 && hasValidCoordinates(activity.coordinates)) {
    q = `${activity.coordinates.lat},${activity.coordinates.lng}`;
  } else if (!q && hasValidCoordinates(activity.coordinates)) {
    q = `${activity.coordinates.lat},${activity.coordinates.lng}`;
  }

  return `https://www.google.com/maps?q=${encodeURIComponent(q)}&hl=es&z=16&output=embed`;
}

/**
 * Builds an external Google Maps Search URL (compatible with web and native iOS/Android Maps app).
 */
export function buildGoogleMapsExternalUrl(
  activity: Partial<Activity>,
  destination: string,
  country?: string
): string {
  const cleanPlace = extractCleanPlaceName(activity);
  const hasExplicitQuery = typeof activity.mapQuery === 'string' && activity.mapQuery.trim().length > 0;

  let query = buildStopMapSearchQuery(activity, destination, country);
  if (!hasExplicitQuery && cleanPlace.length < 3 && hasValidCoordinates(activity.coordinates)) {
    query = `${activity.coordinates.lat},${activity.coordinates.lng}`;
  }

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

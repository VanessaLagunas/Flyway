export interface PexelsPhotoResult {
  id?: number | string;
  url: string;
  photographer: string;
  photographerUrl: string;
  alt: string;
}

export interface SearchPexelsOptions {
  country?: string;
  isStopQuery?: boolean;
  timeoutMs?: number;
  targetKeywords?: string[];
  page?: number;
}

function getPexelsKey(): string {
  return (process.env.PEXELS_API_KEY || '').trim();
}

function normalizeAscii(value: string): string {
  return (value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extracts numeric Pexels photo ID from URLs such as:
 * - https://images.pexels.com/photos/17808457/pexels-photo-17808457.jpeg?auto=compress...
 * - https://images.pexels.com/photos/2363/france-landmark-lights-night.jpg
 * - https://www.pexels.com/photo/colorful-houses-in-valparaiso-chile-17808457/
 */
export function extractPexelsPhotoId(url: string): string | null {
  if (!url || typeof url !== 'string') return null;
  const cdnMatch = url.match(/\/photos\/(\d+)(?:\/|$|\?)/i);
  if (cdnMatch?.[1]) return cdnMatch[1];
  const fileMatch = url.match(/pexels-photo-(\d+)\b/i);
  if (fileMatch?.[1]) return fileMatch[1];
  const pageMatch = url.match(/pexels\.com\/photo\/[^/?#]*?-(\d+)\/?(?:\?|$)/i);
  if (pageMatch?.[1]) return pageMatch[1];
  return null;
}

/**
 * Checks if a photo URL or its numeric Pexels ID has already been used in the itinerary.
 */
export function isPhotoUsed(url: string, usedUrls: Set<string>): boolean {
  if (!url || typeof url !== 'string') return true;
  const trimmed = url.trim();
  if (!trimmed) return true;

  const baseUrl = trimmed.split('?')[0].trim();
  if (usedUrls.has(trimmed) || usedUrls.has(baseUrl)) {
    return true;
  }

  const photoId = extractPexelsPhotoId(trimmed);
  if (photoId) {
    if (usedUrls.has(`pexels-id:${photoId}`)) {
      return true;
    }
    for (const entry of usedUrls) {
      if (!entry.startsWith('pexels-id:') && extractPexelsPhotoId(entry) === photoId) {
        usedUrls.add(`pexels-id:${photoId}`);
        return true;
      }
    }
  }

  return false;
}

/**
 * Marks both exact URL, queryless URL, and Pexels numeric ID as used.
 */
export function markPhotoUsed(url: string, usedUrls: Set<string>): void {
  if (!url || typeof url !== 'string') return;
  const trimmed = url.trim();
  if (!trimmed) return;

  const baseUrl = trimmed.split('?')[0].trim();
  usedUrls.add(trimmed);
  usedUrls.add(baseUrl);

  const photoId = extractPexelsPhotoId(trimmed);
  if (photoId) {
    usedUrls.add(`pexels-id:${photoId}`);
  }
}

const COUNTRY_TRANSLATIONS: Record<string, string> = {
  chile: 'Chile',
  argentina: 'Argentina',
  peru: 'Peru',
  brasil: 'Brazil',
  brazil: 'Brazil',
  colombia: 'Colombia',
  mexico: 'Mexico',
  uruguay: 'Uruguay',
  ecuador: 'Ecuador',
  bolivia: 'Bolivia',
  costa_rica: 'Costa Rica',
  'costa rica': 'Costa Rica',
  espana: 'Spain',
  spain: 'Spain',
  francia: 'France',
  france: 'France',
  italia: 'Italy',
  italy: 'Italy',
  alemania: 'Germany',
  germany: 'Germany',
  portugal: 'Portugal',
  'reino unido': 'United Kingdom',
  inglaterra: 'England UK',
  uk: 'United Kingdom',
  escocia: 'Scotland',
  irlanda: 'Ireland',
  suiza: 'Switzerland',
  switzerland: 'Switzerland',
  austria: 'Austria',
  holanda: 'Netherlands',
  'paises bajos': 'Netherlands',
  netherlands: 'Netherlands',
  belgica: 'Belgium',
  grecia: 'Greece',
  greece: 'Greece',
  turquia: 'Turkey',
  turkey: 'Turkey',
  noruega: 'Norway',
  norway: 'Norway',
  suecia: 'Sweden',
  sweden: 'Sweden',
  finlandia: 'Finland',
  finland: 'Finland',
  dinamarca: 'Denmark',
  denmark: 'Denmark',
  islandia: 'Iceland',
  iceland: 'Iceland',
  rusia: 'Russia',
  russia: 'Russia',
  polonia: 'Poland',
  poland: 'Poland',
  'republica checa': 'Czech Republic',
  chequia: 'Czech Republic',
  hungria: 'Hungary',
  croacia: 'Croatia',
  'estados unidos': 'USA',
  eeuu: 'USA',
  usa: 'USA',
  canada: 'Canada',
  japon: 'Japan',
  japan: 'Japan',
  china: 'China',
  corea: 'South Korea',
  'corea del sur': 'South Korea',
  tailandia: 'Thailand',
  thailand: 'Thailand',
  indonesia: 'Indonesia',
  vietnam: 'Vietnam',
  india: 'India',
  egipto: 'Egypt',
  egypt: 'Egypt',
  marruecos: 'Morocco',
  emiratos: 'UAE',
  'emiratos arabes unidos': 'UAE',
  australia: 'Australia',
  'nueva zelanda': 'New Zealand',
  'new zealand': 'New Zealand',
};

const CITY_ENRICHMENTS: Record<string, { englishName: string; defaultCountry?: string }> = {
  tokio: { englishName: 'Tokyo', defaultCountry: 'Japan' },
  tokyo: { englishName: 'Tokyo', defaultCountry: 'Japan' },
  kioto: { englishName: 'Kyoto', defaultCountry: 'Japan' },
  kyoto: { englishName: 'Kyoto', defaultCountry: 'Japan' },
  osaka: { englishName: 'Osaka', defaultCountry: 'Japan' },
  roma: { englishName: 'Rome', defaultCountry: 'Italy' },
  rome: { englishName: 'Rome', defaultCountry: 'Italy' },
  venecia: { englishName: 'Venice', defaultCountry: 'Italy' },
  venice: { englishName: 'Venice', defaultCountry: 'Italy' },
  florencia: { englishName: 'Florence', defaultCountry: 'Italy' },
  florence: { englishName: 'Florence', defaultCountry: 'Italy' },
  milan: { englishName: 'Milan', defaultCountry: 'Italy' },
  napoles: { englishName: 'Naples', defaultCountry: 'Italy' },
  paris: { englishName: 'Paris', defaultCountry: 'France' },
  niza: { englishName: 'Nice', defaultCountry: 'France' },
  lyon: { englishName: 'Lyon', defaultCountry: 'France' },
  madrid: { englishName: 'Madrid', defaultCountry: 'Spain' },
  barcelona: { englishName: 'Barcelona', defaultCountry: 'Spain' },
  sevilla: { englishName: 'Seville', defaultCountry: 'Spain' },
  londres: { englishName: 'London', defaultCountry: 'United Kingdom' },
  london: { englishName: 'London', defaultCountry: 'United Kingdom' },
  edimburgo: { englishName: 'Edinburgh', defaultCountry: 'Scotland' },
  berlin: { englishName: 'Berlin', defaultCountry: 'Germany' },
  munich: { englishName: 'Munich', defaultCountry: 'Germany' },
  amsterdam: { englishName: 'Amsterdam', defaultCountry: 'Netherlands' },
  viena: { englishName: 'Vienna', defaultCountry: 'Austria' },
  praga: { englishName: 'Prague', defaultCountry: 'Czech Republic' },
  budapest: { englishName: 'Budapest', defaultCountry: 'Hungary' },
  atenas: { englishName: 'Athens', defaultCountry: 'Greece' },
  santorini: { englishName: 'Santorini', defaultCountry: 'Greece' },
  lisboa: { englishName: 'Lisbon', defaultCountry: 'Portugal' },
  oporto: { englishName: 'Porto', defaultCountry: 'Portugal' },
  porto: { englishName: 'Porto', defaultCountry: 'Portugal' },
  estocolmo: { englishName: 'Stockholm', defaultCountry: 'Sweden' },
  copenhague: { englishName: 'Copenhagen', defaultCountry: 'Denmark' },
  oslo: { englishName: 'Oslo', defaultCountry: 'Norway' },
  bergen: { englishName: 'Bergen', defaultCountry: 'Norway' },
  reykjavik: { englishName: 'Reykjavik', defaultCountry: 'Iceland' },
  moscu: { englishName: 'Moscow', defaultCountry: 'Russia' },
  'san petersburgo': { englishName: 'Saint Petersburg', defaultCountry: 'Russia' },
  estambul: { englishName: 'Istanbul', defaultCountry: 'Turkey' },
  capadocia: { englishName: 'Cappadocia', defaultCountry: 'Turkey' },
  'el cairo': { englishName: 'Cairo', defaultCountry: 'Egypt' },
  dubai: { englishName: 'Dubai', defaultCountry: 'UAE' },
  seul: { englishName: 'Seoul', defaultCountry: 'South Korea' },
  pekin: { englishName: 'Beijing', defaultCountry: 'China' },
  shanghai: { englishName: 'Shanghai', defaultCountry: 'China' },
  bangkok: { englishName: 'Bangkok', defaultCountry: 'Thailand' },
  bali: { englishName: 'Bali', defaultCountry: 'Indonesia' },
  sidney: { englishName: 'Sydney', defaultCountry: 'Australia' },
  sydney: { englishName: 'Sydney', defaultCountry: 'Australia' },
  'nueva york': { englishName: 'New York City', defaultCountry: 'USA' },
  'new york': { englishName: 'New York City', defaultCountry: 'USA' },
  miami: { englishName: 'Miami Florida', defaultCountry: 'USA' },
  'san francisco': { englishName: 'San Francisco California', defaultCountry: 'USA' },
  cancun: { englishName: 'Cancun', defaultCountry: 'Mexico' },
  tulum: { englishName: 'Tulum', defaultCountry: 'Mexico' },
  'ciudad de mexico': { englishName: 'Mexico City', defaultCountry: 'Mexico' },
  cdmx: { englishName: 'Mexico City', defaultCountry: 'Mexico' },
  cusco: { englishName: 'Cusco', defaultCountry: 'Peru' },
  'machu picchu': { englishName: 'Machu Picchu Cusco', defaultCountry: 'Peru' },
  lima: { englishName: 'Lima', defaultCountry: 'Peru' },
  'buenos aires': { englishName: 'Buenos Aires', defaultCountry: 'Argentina' },
  bariloche: { englishName: 'Bariloche Patagonia', defaultCountry: 'Argentina' },
  mendoza: { englishName: 'Mendoza', defaultCountry: 'Argentina' },
  'rio de janeiro': { englishName: 'Rio de Janeiro', defaultCountry: 'Brazil' },
  'san pedro de atacama': { englishName: 'San Pedro de Atacama', defaultCountry: 'Chile' },
  atacama: { englishName: 'San Pedro de Atacama', defaultCountry: 'Chile' },
  'torres del paine': { englishName: 'Torres del Paine Patagonia', defaultCountry: 'Chile' },
  'puerto natales': { englishName: 'Puerto Natales Patagonia', defaultCountry: 'Chile' },
  valparaiso: { englishName: 'Valparaiso', defaultCountry: 'Chile' },
  'vina del mar': { englishName: 'Vina del Mar', defaultCountry: 'Chile' },
  pucon: { englishName: 'Pucon Villarrica', defaultCountry: 'Chile' },
  'puerto varas': { englishName: 'Puerto Varas Osorno', defaultCountry: 'Chile' },
  frutillar: { englishName: 'Frutillar Llanquihue', defaultCountry: 'Chile' },
  chiloe: { englishName: 'Chiloe Island', defaultCountry: 'Chile' },
  valdivia: { englishName: 'Valdivia', defaultCountry: 'Chile' },
  'la serena': { englishName: 'La Serena', defaultCountry: 'Chile' },
  'valle del elqui': { englishName: 'Elqui Valley', defaultCountry: 'Chile' },
  iquique: { englishName: 'Iquique', defaultCountry: 'Chile' },
  arica: { englishName: 'Arica', defaultCountry: 'Chile' },
  'punta arenas': { englishName: 'Punta Arenas Patagonia', defaultCountry: 'Chile' },
  'rapa nui': { englishName: 'Easter Island Rapa Nui', defaultCountry: 'Chile' },
  'isla de pascua': { englishName: 'Easter Island Rapa Nui', defaultCountry: 'Chile' },
};

function translateCountryName(rawCountry: string): string {
  const norm = normalizeAscii(rawCountry);
  if (!norm) return '';
  if (COUNTRY_TRANSLATIONS[norm]) {
    return COUNTRY_TRANSLATIONS[norm];
  }
  return rawCountry.replace(/\([^)]*\)/g, '').trim();
}

function dedupeWords(phrase: string): string {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const token of phrase.split(/\s+/)) {
    const cleanToken = token.trim();
    if (!cleanToken) continue;
    const key = normalizeAscii(cleanToken);
    if (!key) continue;
    if (!seen.has(key)) {
      seen.add(key);
      out.push(cleanToken);
    }
  }
  return out.join(' ');
}

const NON_TRAVEL_PORTRAIT_REGEX =
  /\b(studio\s+portrait|studio\s+shot|in\s+a?\s*studio|studio\s+background|white\s+background|isolated\s+on|mockup|mock-up|wedding\s+dress|bridal|bride\s+and\s+groom|groom\s+and\s+bride|fashion\s+model|fashion\s+shoot|beauty\s+portrait|headshot|selfie|close-up\s+portrait|closeup\s+portrait|cosmetics|skincare|manicure|lingerie|newborn|maternity\s+shoot|pregnant\s+woman|corporate\s+portrait|business\s+portrait|studio|portrait|wedding|fashion)\b/i;

const TRAVEL_CONTEXT_REGEX =
  /\b(travel|tourism|tourist|city|cityscape|skyline|town|village|street|avenue|alley|architecture|building|facade|landmark|monument|historic|heritage|palace|castle|fortress|cathedral|church|chapel|temple|shrine|mosque|museum|gallery|plaza|square|bridge|tower|harbor|port|marina|coast|coastal|beach|shore|ocean|sea|bay|island|peninsula|mountain|andes|alps|peak|volcano|crater|lake|lagoon|river|canal|waterfall|fjord|glacier|iceberg|desert|dune|valley|canyon|forest|woods|jungle|rainforest|park|garden|viewpoint|lookout|panoram|landscape|scenic|nature|outdoor|sunset|sunrise|aerial|drone|food|dish|meal|cuisine|gastronomy|restaurant|cafe|coffee|market|bazaar|wine|vineyard|ciudad|paisaje|arquitectura|playa|montana|museo|mercado|iglesia|castillo|mirador|comida|gastronomia|calle|templo)\b/i;

/**
 * Filters out irrelevant studio portraits, mockups, wedding shoots, or fashion photos
 * whose alt/slug does not mention any travel, city, nature, food, or architecture context.
 */
export function isIrrelevantNonTravelPhoto(alt: string, pageUrl = ''): boolean {
  const combined = `${alt || ''} ${pageUrl || ''}`.trim();
  if (!combined) return false;
  if (NON_TRAVEL_PORTRAIT_REGEX.test(combined) && !TRAVEL_CONTEXT_REGEX.test(combined)) {
    return true;
  }
  return false;
}

const STOPWORDS = new Set([
  'the', 'and', 'for', 'with', 'from', 'into', 'near', 'view', 'photo', 'photography',
  'del', 'las', 'los', 'una', 'unos', 'unas', 'por', 'con', 'para', 'hacia', 'desde',
  'travel', 'tourism', 'landmark', 'cityscape', 'landscape', 'architecture', 'nature',
  'dia', 'day', 'visita', 'paseo', 'recorrido', 'tour',
]);

function extractTargetKeywords(rawQuery: string, country = '', extraKeywords: string[] = []): string[] {
  const tokens = new Set<string>();
  const combined = [rawQuery, country, translateCountryName(country), ...extraKeywords].join(' ');
  const norm = normalizeAscii(combined);

  // Add city translation tokens if present
  const primarySegment = normalizeAscii(rawQuery.split(',')[0] || '');
  if (CITY_ENRICHMENTS[primarySegment]) {
    for (const part of normalizeAscii(CITY_ENRICHMENTS[primarySegment].englishName).split(' ')) {
      if (part.length >= 3 && !STOPWORDS.has(part)) tokens.add(part);
    }
  }

  for (const word of norm.split(' ')) {
    if (word.length >= 3 && !STOPWORDS.has(word)) {
      tokens.add(word);
    }
  }
  return Array.from(tokens);
}

const MAJOR_CONFLICTING_COUNTRIES = [
  'chile', 'argentina', 'peru', 'brazil', 'colombia', 'mexico', 'cuba',
  'spain', 'france', 'italy', 'germany', 'portugal', 'england', 'scotland',
  'greece', 'turkey', 'norway', 'sweden', 'finland', 'iceland', 'russia',
  'japan', 'china', 'korea', 'thailand', 'indonesia', 'vietnam', 'india',
  'egypt', 'morocco', 'australia', 'canada', 'usa',
];

function scorePexelsCandidate(
  candidate: { alt: string; pageUrl: string; url: string },
  keywords: string[],
  expectedCountry: string
): number {
  const haystack = normalizeAscii(`${candidate.alt || ''} ${candidate.pageUrl || ''} ${candidate.url || ''}`);
  if (!haystack) return 0;

  let score = 0;
  for (const kw of keywords) {
    if (kw.length < 3) continue;
    const wordRegex = new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (wordRegex.test(haystack)) {
      score += 15;
    } else if (haystack.includes(kw)) {
      score += 8;
    }
  }

  if (TRAVEL_CONTEXT_REGEX.test(haystack)) {
    score += 3;
  }

  const normExpectedCountry = normalizeAscii(translateCountryName(expectedCountry));
  const rawExpectedCountry = normalizeAscii(expectedCountry);
  if (normExpectedCountry) {
    const expectedCountryTokens = new Set(
      `${normExpectedCountry} ${rawExpectedCountry}`.split(' ').filter((w) => w.length >= 3)
    );
    const mentionsExpectedCountry = Array.from(expectedCountryTokens).some((tok) => haystack.includes(tok));

    if (mentionsExpectedCountry) {
      score += 12;
    } else {
      for (const otherCountry of MAJOR_CONFLICTING_COUNTRIES) {
        if (!expectedCountryTokens.has(otherCountry)) {
          const conflictRegex = new RegExp(`\\b${otherCountry}\\b`, 'i');
          if (conflictRegex.test(haystack)) {
            score -= 30;
            break;
          }
        }
      }
    }
  }

  return score;
}

/**
 * Generates geographically accurate English/Spanish search variants for Pexels API.
 * Prioritizes "<cleanDestination> <country> travel landmark",
 * "<cleanDestination> <country> cityscape landscape", and "<cleanDestination> tourism",
 * avoiding bare single-word ambiguous queries or unrelated studio portraits.
 */
export function buildPexelsSearchVariants(
  rawQuery: string,
  options?: string | { country?: string; isStopQuery?: boolean }
): string[] {
  const explicitCountry = typeof options === 'string' ? options : options?.country || '';
  const isStopQuery = typeof options === 'object' ? Boolean(options?.isStopQuery) : false;

  const clean = (rawQuery || '').replace(/\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim();
  if (!clean) return [];

  const lower = normalizeAscii(clean);

  // Special disambiguations where literal terms mislead Pexels (e.g., "Polo" sport)
  if (
    lower.includes('polo sur') ||
    lower.includes('antartica') ||
    lower.includes('antartida') ||
    lower.includes('south pole')
  ) {
    return [
      'South Pole Antarctica ice landscape',
      'Antarctica glaciers icebergs travel',
      'Antarctica mountains snow',
    ];
  }
  if (lower.includes('polo norte') || lower.includes('artico') || lower.includes('north pole')) {
    return ['North Pole Arctic ice landscape', 'Arctic tundra ice travel'];
  }

  const commaParts = clean.split(',').map((p) => p.trim()).filter(Boolean);
  const primaryPart = commaParts[0] || clean;
  const inlineCountry = commaParts.slice(1).join(' ').trim();
  const rawCountry = explicitCountry.trim() || inlineCountry;

  const normPrimary = normalizeAscii(primaryPart);
  const cityInfo = CITY_ENRICHMENTS[normPrimary];
  const countryAsDest = COUNTRY_TRANSLATIONS[normPrimary];

  const cleanDestination = cityInfo
    ? cityInfo.englishName
    : countryAsDest
      ? countryAsDest
      : primaryPart.replace(/[^\p{L}\p{N}\s'-]/gu, ' ').replace(/\s+/g, ' ').trim();

  // Resolve country: explicit > inline comma > unambiguous city default (only if not stop query)
  let resolvedCountry = translateCountryName(rawCountry);
  if (!resolvedCountry && cityInfo?.defaultCountry) {
    resolvedCountry = cityInfo.defaultCountry;
  }

  const variants: string[] = [];
  const pushUnique = (v: string) => {
    const normalizedVariant = dedupeWords(v).trim();
    if (normalizedVariant && !variants.includes(normalizedVariant)) {
      variants.push(normalizedVariant);
    }
  };

  if (isStopQuery) {
    const baseStopPhrase = dedupeWords(`${cleanDestination} ${resolvedCountry}`.trim());
    pushUnique(`${baseStopPhrase} landmark`);
    pushUnique(`${baseStopPhrase} travel`);
    if (baseStopPhrase.split(/\s+/).length >= 2) {
      pushUnique(baseStopPhrase);
    }
    return variants;
  }

  // Destination search: prioritize geographic accuracy with country + travel/landmark/cityscape/tourism
  const normDest = normalizeAscii(cleanDestination);
  const normCountry = normalizeAscii(resolvedCountry);
  const hasDistinctCountry = Boolean(normCountry && normCountry !== normDest && !normDest.includes(normCountry));

  if (hasDistinctCountry) {
    pushUnique(`${cleanDestination} ${resolvedCountry} travel landmark`);
    pushUnique(`${cleanDestination} ${resolvedCountry} cityscape landscape`);
    pushUnique(`${cleanDestination} ${resolvedCountry} tourism`);
    pushUnique(`${cleanDestination} tourism`);
  } else {
    pushUnique(`${cleanDestination} travel landmark`);
    pushUnique(`${cleanDestination} cityscape landscape`);
    pushUnique(`${cleanDestination} tourism`);
  }

  return variants;
}

/**
 * Searches Pexels API for real travel photos matching query, filtering out studio/portrait/wedding
 * non-travel photos and ranking matches whose alt/slug match destination/place keywords.
 */
export async function searchPexelsPhotos(
  query: string,
  count = 5,
  options?: SearchPexelsOptions
): Promise<PexelsPhotoResult[]> {
  const apiKey = getPexelsKey();
  if (!apiKey) {
    console.warn('[Pexels] PEXELS_API_KEY no configurada en .env. Continuando con fallback curado.');
    return [];
  }

  const cleanQuery = (query || '').trim();
  if (!cleanQuery) return [];

  const country = (options?.country || '').trim();
  const timeoutMs = options?.timeoutMs && options.timeoutMs > 0 ? options.timeoutMs : 4500;
  const page = options?.page && options.page > 0 ? options.page : 1;
  const perPage = Math.min(Math.max(count * 2, 10), 40);

  const variants = buildPexelsSearchVariants(cleanQuery, {
    country,
    isStopQuery: options?.isStopQuery,
  });

  const targetKeywords = extractTargetKeywords(cleanQuery, country, options?.targetKeywords || []);
  const collected: PexelsPhotoResult[] = [];
  const seenIds = new Set<string>();

  for (const q of variants) {
    try {
      const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(q)}&per_page=${perPage}&page=${page}&orientation=landscape`;
      const res = await fetch(url, {
        headers: {
          Authorization: apiKey,
        },
        signal: AbortSignal.timeout(timeoutMs),
      });

      if (!res.ok) {
        continue;
      }

      const data = (await res.json()) as any;
      if (!Array.isArray(data?.photos) || data.photos.length === 0) {
        continue;
      }

      const scoredBatch: Array<{ photo: PexelsPhotoResult; score: number; index: number }> = [];

      data.photos.forEach((p: any, idx: number) => {
        const srcUrl = p?.src?.large2x || p?.src?.large || p?.src?.medium || p?.src?.original;
        if (!srcUrl || typeof srcUrl !== 'string') return;

        const altText = String(p?.alt || '').trim();
        const pageUrl = String(p?.url || '').trim();

        if (isIrrelevantNonTravelPhoto(altText, pageUrl)) {
          return;
        }

        const score = scorePexelsCandidate({ alt: altText, pageUrl, url: srcUrl }, targetKeywords, country);
        // Drop photos that explicitly name a conflicting country
        if (score <= -20) {
          return;
        }

        scoredBatch.push({
          photo: {
            id: p?.id ?? (extractPexelsPhotoId(srcUrl) || undefined),
            url: srcUrl,
            photographer: p?.photographer || 'Pexels Contributor',
            photographerUrl: p?.photographer_url || 'https://www.pexels.com',
            alt: altText || q,
          },
          score,
          index: idx,
        });
      });

      scoredBatch.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.index - b.index;
      });

      for (const item of scoredBatch) {
        if (!isPhotoUsed(item.photo.url, seenIds)) {
          markPhotoUsed(item.photo.url, seenIds);
          collected.push(item.photo);
        }
      }

      // Return immediately once we have enough photos (avoid unnecessary extra Pexels calls)
      if (collected.length >= Math.min(count, 5) || options?.isStopQuery) {
        if (collected.length > 0) {
          return collected.slice(0, count);
        }
      }
    } catch {
      // Continue to next variant
    }
  }

  return collected.slice(0, count);
}

/**
 * Gets a single hero photo for a destination, with an elegant neutral fallback if not found.
 */
export async function getDestinationHeroPhoto(
  destination: string,
  fallbackUrl?: string,
  country?: string
): Promise<{ url: string; photographer?: string; photographerUrl?: string }> {
  const photos = await searchPexelsPhotos(destination, 3, { country });
  if (photos.length > 0) {
    return {
      url: photos[0].url,
      photographer: photos[0].photographer,
      photographerUrl: photos[0].photographerUrl,
    };
  }

  return {
    url:
      fallbackUrl ||
      'https://images.pexels.com/photos/1525041/pexels-photo-1525041.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
    photographer: 'Frans van Heerden (Pexels Curated)',
    photographerUrl: 'https://www.pexels.com/@frans-van-heerden-201846',
  };
}

/**
 * Curated, verified, permanent high-resolution Pexels photos organized by
 * historical context, architectural style, and place typology.
 * Used ONLY in offline mode when PEXELS_API_KEY is unavailable.
 */
const HISTORICAL_THEME_FALLBACKS: Record<string, PexelsPhotoResult[]> = {
  castle_fortress: [
    {
      url: 'https://images.pexels.com/photos/38313219/pexels-photo-38313219.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
      photographer: 'Pexels Contributor',
      photographerUrl: 'https://www.pexels.com',
      alt: 'Castillo histórico y torreones en cerro patrimonial',
    },
    {
      url: 'https://images.pexels.com/photos/19739066/pexels-photo-19739066.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
      photographer: 'Matheus Natan',
      photographerUrl: 'https://www.pexels.com/@matheusnatan',
      alt: 'Fortaleza histórica con muros de piedra y murallas',
    },
    {
      url: 'https://images.pexels.com/photos/208636/pexels-photo-208636.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
      photographer: 'Pixabay',
      photographerUrl: 'https://www.pexels.com',
      alt: 'Arquitectura histórica monumental de época',
    },
  ],
  palace_neoclassical: [
    {
      url: 'https://images.pexels.com/photos/19739069/pexels-photo-19739069.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
      photographer: 'Matheus Natan',
      photographerUrl: 'https://www.pexels.com/@matheusnatan',
      alt: 'Palacio neoclásico con columnas y patios cívicos',
    },
    {
      url: 'https://images.pexels.com/photos/33432910/pexels-photo-33432910.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
      photographer: 'CamilaIgnacia Anguloğlu',
      photographerUrl: 'https://www.pexels.com/@camila-angulo',
      alt: 'Casonas señoriales y arquitectura patrimonial del siglo XIX',
    },
    {
      url: 'https://images.pexels.com/photos/38340557/pexels-photo-38340557.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
      photographer: 'Magda Ehlers',
      photographerUrl: 'https://www.pexels.com/@magda-ehlers-pexels',
      alt: 'Palacio patrimonial de estilo art nouveau y neoclásico',
    },
  ],
  funicular_cablecar: [
    {
      url: 'https://images.pexels.com/photos/33220378/pexels-photo-33220378.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
      photographer: 'Photography Gu',
      photographerUrl: 'https://www.pexels.com',
      alt: 'Funicular patrimonial subiendo el cerro hacia el mirador',
    },
    {
      url: 'https://images.pexels.com/photos/26970226/pexels-photo-26970226.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
      photographer: 'Pexels Contributor',
      photographerUrl: 'https://www.pexels.com',
      alt: 'Tranvía histórico y vías de ascenso montañoso',
    },
    {
      url: 'https://images.pexels.com/photos/31752311/pexels-photo-31752311.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
      photographer: 'Photography Gu',
      photographerUrl: 'https://www.pexels.com',
      alt: 'Ascensor patrimonial con vista panorámica',
    },
  ],
  museum_art: [
    {
      url: 'https://images.pexels.com/photos/33028087/pexels-photo-33028087.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
      photographer: 'Fernando Paleta',
      photographerUrl: 'https://www.pexels.com/@fernandopaleta',
      alt: 'Museo de Bellas Artes y cúpula de cristal histórica',
    },
    {
      url: 'https://images.pexels.com/photos/10989537/pexels-photo-10989537.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
      photographer: 'David Vives',
      photographerUrl: 'https://www.pexels.com/@davidvives',
      alt: 'Galería de arte y colecciones históricas',
    },
    {
      url: 'https://images.pexels.com/photos/16551933/pexels-photo-16551933.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
      photographer: 'Cristian Salinas Cisternas',
      photographerUrl: 'https://www.pexels.com/@cristian-salinas-cisternas-20419268',
      alt: 'Casa museo de autor con maderas nobles',
    },
  ],
  church_colonial: [
    {
      url: 'https://images.pexels.com/photos/18156722/pexels-photo-18156722.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
      photographer: 'Camilo Ospina',
      photographerUrl: 'https://www.pexels.com/@camilo-ospina',
      alt: 'Iglesia colonial histórica',
    },
    {
      url: 'https://images.pexels.com/photos/7213869/pexels-photo-7213869.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
      photographer: "Tom D'Arby",
      photographerUrl: 'https://www.pexels.com/@tomdarby',
      alt: 'Templo patrimonial de arquitectura histórica',
    },
  ],
  wine_cellar: [
    {
      url: 'https://images.pexels.com/photos/34004193/pexels-photo-34004193.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
      photographer: 'DΛVΞ GΛRCIΛ',
      photographerUrl: 'https://www.pexels.com/@dave-garcia',
      alt: 'Viñedos centenarios al pie de las montañas',
    },
    {
      url: 'https://images.pexels.com/photos/33259390/pexels-photo-33259390.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
      photographer: 'Pexels Contributor',
      photographerUrl: 'https://www.pexels.com',
      alt: 'Cavas subterráneas y barricas de roble de vino tradicional',
    },
    {
      url: 'https://images.pexels.com/photos/20320313/pexels-photo-20320313.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
      photographer: 'Brett Jordan',
      photographerUrl: 'https://www.pexels.com/@brettjordan',
      alt: 'Bodega de vino y degustación',
    },
  ],
  market_culinary: [
    {
      url: 'https://images.pexels.com/photos/19762180/pexels-photo-19762180.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
      photographer: 'Eduard Perez',
      photographerUrl: 'https://www.pexels.com/@eduard-perez',
      alt: 'Mercado histórico y gastronomía local',
    },
    {
      url: 'https://images.pexels.com/photos/32503306/pexels-photo-32503306.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
      photographer: 'Mick Latter',
      photographerUrl: 'https://www.pexels.com/@micklatter',
      alt: 'Puestos de mercado con ingredientes frescos y cocinerías',
    },
    {
      url: 'https://images.pexels.com/photos/36905236/pexels-photo-36905236.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
      photographer: 'Jessica Olivella',
      photographerUrl: 'https://www.pexels.com/@jessica-olivella',
      alt: 'Recetas tradicionales locales',
    },
    {
      url: 'https://images.pexels.com/photos/38993747/pexels-photo-38993747.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
      photographer: "César O'neill",
      photographerUrl: 'https://www.pexels.com/@cesar-oneill',
      alt: 'Gastronomía marina tradicional',
    },
  ],
  bohemian_street_art: [
    {
      url: 'https://images.pexels.com/photos/37270328/pexels-photo-37270328.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
      photographer: 'Nikolai Kolosov',
      photographerUrl: 'https://www.pexels.com/@nikolai-kolosov-20411833',
      alt: 'Callejones de adoquines y casonas patrimoniales',
    },
    {
      url: 'https://images.pexels.com/photos/17808457/pexels-photo-17808457.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
      photographer: 'Lais Queiroz',
      photographerUrl: 'https://www.pexels.com/@laisqfotografia',
      alt: 'Murales y arquitectura colorida',
    },
    {
      url: 'https://images.pexels.com/photos/302899/pexels-photo-302899.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
      photographer: 'Chevanon Photography',
      photographerUrl: 'https://www.pexels.com/@chevanon',
      alt: 'Cafetería histórica y ambiente bohemio',
    },
  ],
  scenic_viewpoint: [
    {
      url: 'https://images.pexels.com/photos/17347192/pexels-photo-17347192.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
      photographer: 'Alexis Leandro Jeria Bocca',
      photographerUrl: 'https://www.pexels.com/@alexis-leandro-jeria-bocca',
      alt: 'Mirador panorámico de alta torre',
    },
    {
      url: 'https://images.pexels.com/photos/37314783/pexels-photo-37314783.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
      photographer: 'Nikolai Kolosov',
      photographerUrl: 'https://www.pexels.com/@nikolai-kolosov-20411833',
      alt: 'Vista panorámica de la ciudad y montañas',
    },
    {
      url: 'https://images.pexels.com/photos/1619317/pexels-photo-1619317.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
      photographer: 'James Wheeler',
      photographerUrl: 'https://www.pexels.com/@souvenirpixels',
      alt: 'Mirador natural entre valles y montañas',
    },
  ],
  nature_thermal_desert: [
    {
      url: 'https://images.pexels.com/photos/27878411/pexels-photo-27878411.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
      photographer: 'Eleanore Stohner',
      photographerUrl: 'https://www.pexels.com/@eleanore-stohner-499317537',
      alt: 'Formaciones naturales en paisaje desértico',
    },
    {
      url: 'https://images.pexels.com/photos/1578750/pexels-photo-1578750.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
      photographer: 'Visit Greenland',
      photographerUrl: 'https://www.pexels.com',
      alt: 'Piscinas de aguas termales naturales en bosque',
    },
    {
      url: 'https://images.pexels.com/photos/30359266/pexels-photo-30359266.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
      photographer: 'Marek Piwnicki',
      photographerUrl: 'https://www.pexels.com/@marekpiwnicki',
      alt: 'Lagos glaciares y montañas vírgenes',
    },
    {
      url: 'https://images.pexels.com/photos/1624496/pexels-photo-1624496.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
      photographer: 'Eberhard Grossgasteiger',
      photographerUrl: 'https://www.pexels.com/@eberhardgross',
      alt: 'Cielo estrellado y paisajes de montaña',
    },
  ],
};

export function getAllHistoricalFallbackUrls(): string[] {
  const urls: string[] = [];
  for (const list of Object.values(HISTORICAL_THEME_FALLBACKS)) {
    for (const item of list) {
      urls.push(item.url);
    }
  }
  return urls;
}

/**
 * Strips noisy verbal prefixes from activity titles to isolate the exact place name.
 */
export function cleanPlaceTitle(rawTitle: string): string {
  if (!rawTitle || typeof rawTitle !== 'string') return '';
  let cleaned = rawTitle.trim();
  // Iteratively remove generic activity prefixes ("Almuerzo en", "Cena en", "Visita guiada a", etc.)
  for (let i = 0; i < 2; i++) {
    cleaned = cleaned.replace(
      /^(?:visita(?:\s+guiada)?|recorrido(?:\s+guiado|\s+hist[oó]rico|\s+peatonal)?|paseo(?:\s+en\s+barco|\s+costero)?|almuerzo(?:\s+t[ií]pico|\s+tradicional|\s+local|\s+marino)?|cena(?:\s+de\s+despedida|\s+rom[aá]ntica|\s+tradicional|\s+gourmet)?|desayuno(?:\s+tradicional)?|degustaci[oó]n(?:\s+de\s+vinos|\s+gastron[oó]mica)?|tour(?:\s+guiado)?|exploraci[oó]n|caminata(?:\s+panor[aá]mica)?|parada(?:\s+fotogr[aá]fica)?|tarde|ma[ñn]ana|noche|ingreso|entrada|subida|ascenso|atardecer|amanecer)\s+(?:al|a\s+la|a\s+los|a\s+las|a|en\s+el|en\s+la|en\s+los|en\s+las|en|por\s+el|por\s+la|por\s+los|por\s+las|por|de\s+la|de\s+los|de\s+las|del|de|hacia\s+el|hacia\s+la|hacia)?\s*/i,
      ''
    );
  }
  if (cleaned.includes(' o ')) {
    cleaned = cleaned.split(' o ')[0].trim();
  }
  if (cleaned.includes(' — ')) {
    cleaned = cleaned.split(' — ')[0].trim();
  }
  return cleaned.trim();
}

function extractHistoryThemeKey(
  history = '',
  architecture = '',
  curiosity = '',
  category = '',
  title = ''
): { key: string; query: string } {
  const text = `${history} ${architecture} ${curiosity} ${category} ${title}`.toLowerCase();

  if (text.includes('vino') || text.includes('viña') || text.includes('cava') || text.includes('barrica')) {
    return { key: 'wine_cellar', query: 'historic wine cellar vineyard barrels' };
  }
  if (text.includes('castillo') || text.includes('fortaleza') || text.includes('fuerte') || text.includes('muralla')) {
    return { key: 'castle_fortress', query: 'historic stone fortress castle architecture' };
  }
  if (text.includes('funicular') || text.includes('ascensor') || text.includes('teleférico') || text.includes('tranvía')) {
    return { key: 'funicular_cablecar', query: 'historic funicular railway cable car' };
  }
  if (text.includes('palacio') || text.includes('neoclásic') || text.includes('casona señorial') || text.includes('gótico') || text.includes('monumento')) {
    return { key: 'palace_neoclassical', query: 'historic neoclassical palace architecture' };
  }
  if (text.includes('museo') || text.includes('bellas artes') || text.includes('galería') || text.includes('colección')) {
    return { key: 'museum_art', query: 'historic art museum gallery' };
  }
  if (text.includes('iglesia') || text.includes('catedral') || text.includes('templo') || text.includes('convento') || text.includes('misión')) {
    return { key: 'church_colonial', query: 'historic colonial cathedral church' };
  }
  if (text.includes('mercado') || text.includes('feria') || text.includes('abasto') || text.includes('cocinería')) {
    return { key: 'market_culinary', query: 'historic food market hall produce' };
  }
  if (text.includes('mural') || text.includes('street art') || text.includes('bohemi')) {
    return { key: 'bohemian_street_art', query: 'historic street art murals bohemian alley' };
  }
  if (text.includes('mirador') || text.includes('cumbre') || text.includes('panorámic') || text.includes('cerro')) {
    return { key: 'scenic_viewpoint', query: 'scenic panoramic mountain city lookout' };
  }
  if (text.includes('termas') || text.includes('aguas termales') || text.includes('desierto') || text.includes('glaciar') || text.includes('astronomía')) {
    return { key: 'nature_thermal_desert', query: 'natural landscape scenery heritage' };
  }
  if (text.includes('gastronom') || text.includes('empanada') || text.includes('comida') || text.includes('marisco') || text.includes('café')) {
    return { key: 'market_culinary', query: 'traditional culinary dish restaurant' };
  }

  return { key: 'palace_neoclassical', query: 'historic architecture landmark heritage' };
}

function pickOfflineThemeFallback(act: any, usedUrls: Set<string>): PexelsPhotoResult {
  const { key: themeKey } = extractHistoryThemeKey(
    act?.history,
    act?.architectureOrHeritage,
    act?.curiosity,
    act?.category,
    act?.placeName || act?.title
  );

  const themePool = HISTORICAL_THEME_FALLBACKS[themeKey] || HISTORICAL_THEME_FALLBACKS.palace_neoclassical;
  const unusedFromTheme = themePool.find((p) => !isPhotoUsed(p.url, usedUrls));
  if (unusedFromTheme) {
    markPhotoUsed(unusedFromTheme.url, usedUrls);
    return unusedFromTheme;
  }

  for (const pool of Object.values(HISTORICAL_THEME_FALLBACKS)) {
    const candidate = pool.find((p) => !isPhotoUsed(p.url, usedUrls));
    if (candidate) {
      markPhotoUsed(candidate.url, usedUrls);
      return candidate;
    }
  }

  const emergency = themePool[0];
  markPhotoUsed(emergency.url, usedUrls);
  return emergency;
}

/**
 * Searches and assigns a guaranteed UNIQUE photo for an individual activity / place,
 * deduplicating both exact URLs and numeric Pexels photo IDs.
 */
export async function getUniquePhotoForActivity(
  act: any,
  destination: string,
  usedUrls: Set<string>,
  country = ''
): Promise<PexelsPhotoResult> {
  const cleanPlace = cleanPlaceTitle(act?.placeName || act?.title || '');
  const cleanDest = (destination || '').split(',')[0].trim();

  if (cleanPlace && getPexelsKey()) {
    const stopQuery = `${cleanPlace} ${cleanDest} ${country}`.replace(/\s+/g, ' ').trim();
    const photos = await searchPexelsPhotos(stopQuery, 6, {
      country,
      isStopQuery: true,
      timeoutMs: 4000,
      targetKeywords: [cleanPlace, cleanDest, country],
    });
    const available = photos.find((p) => !isPhotoUsed(p.url, usedUrls));
    if (available) {
      markPhotoUsed(available.url, usedUrls);
      return available;
    }
  }

  if (cleanDest && getPexelsKey()) {
    const destPhotos = await searchPexelsPhotos(`${cleanDest} ${country}`.trim(), 12, {
      country,
      timeoutMs: 4000,
    });
    const availableDest = destPhotos.find((p) => !isPhotoUsed(p.url, usedUrls));
    if (availableDest) {
      markPhotoUsed(availableDest.url, usedUrls);
      return availableDest;
    }
  }

  return pickOfflineThemeFallback(act, usedUrls);
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  if (items.length === 0) return [];
  const results: R[] = new Array(items.length);
  let nextIndex = 0;
  const maxWorkers = Math.min(Math.max(1, concurrency), items.length);

  async function runWorker(): Promise<void> {
    while (true) {
      const idx = nextIndex++;
      if (idx >= items.length) break;
      results[idx] = await worker(items[idx], idx);
    }
  }

  await Promise.all(Array.from({ length: maxWorkers }, () => runWorker()));
  return results;
}

function resolveCountryForTrip(rawDestination: string, explicitCountry?: string): string {
  const commaParts = (rawDestination || '').split(',').map((s) => s.trim()).filter(Boolean);
  const inlineCountry = commaParts.slice(1).join(' ').trim();
  const primaryNorm = normalizeAscii(commaParts[0] || rawDestination);
  const cityInfo = CITY_ENRICHMENTS[primaryNorm];

  const trimmedExplicit = (explicitCountry || '').trim();
  // Guard against ai-service defaulting country='Chile' when destination explicitly says e.g. "Tokio, Japón"
  if (inlineCountry && normalizeAscii(trimmedExplicit) === 'chile' && normalizeAscii(inlineCountry) !== 'chile') {
    return inlineCountry;
  }
  if (
    cityInfo?.defaultCountry &&
    cityInfo.defaultCountry !== 'Chile' &&
    normalizeAscii(trimmedExplicit) === 'chile'
  ) {
    return cityInfo.defaultCountry;
  }

  return trimmedExplicit || inlineCountry || cityInfo?.defaultCountry || '';
}

interface StopEntry {
  dayIndex: number;
  stopIndexInDay: number;
  activity: any;
  cleanPlace: string;
}

/**
 * Enriches a complete Trip object (supporting both top-level Trip and nested { trip } shapes,
 * as well as day.items and/or day.activities) with geographically accurate, deduplicated Pexels photos.
 */
export async function enrichTripWithPexels(
  trip: any,
  _options?: { bypassCache?: boolean }
): Promise<any> {
  if (!trip || typeof trip !== 'object') {
    return trip;
  }

  try {
    const targetTrip =
      !Array.isArray(trip.days) && trip.trip && typeof trip.trip === 'object'
        ? trip.trip
        : trip;

    const rawDestination = String(targetTrip.destination || trip.destination || 'Santiago').trim();
    const cleanDest = rawDestination.split(',')[0].replace(/\([^)]*\)/g, '').trim() || rawDestination;
    const country = resolveCountryForTrip(
      rawDestination,
      targetTrip.country || targetTrip.destinationCountry || trip.country || trip.destinationCountry
    );

    const hasApiKey = Boolean(getPexelsKey());
    const usedUrls = new Set<string>();

    // 1. Fetch a live pool of destination-authentic Pexels photos first (count = 20)
    const destPoolQuery = `${cleanDest} ${country}`.replace(/\s+/g, ' ').trim();
    const destinationPhotos: PexelsPhotoResult[] = hasApiKey
      ? await searchPexelsPhotos(destPoolQuery, 20, { country, timeoutMs: 4500 })
      : [];

    // 2. Assign Trip Hero photo (#1 best destination photo)
    const heroPhoto = destinationPhotos.find((p) => !isPhotoUsed(p.url, usedUrls));
    if (heroPhoto) {
      targetTrip.imageUrl = heroPhoto.url;
      targetTrip.photoUrl = heroPhoto.url;
      targetTrip.photo_url = heroPhoto.url;
      targetTrip.imagePhotographer = heroPhoto.photographer;
      targetTrip.imagePhotographerUrl = heroPhoto.photographerUrl;
      markPhotoUsed(heroPhoto.url, usedUrls);
    } else if (!targetTrip.imageUrl && !hasApiKey) {
      const fallbackHero = await getDestinationHeroPhoto(cleanDest, undefined, country);
      targetTrip.imageUrl = fallbackHero.url;
      targetTrip.photoUrl = fallbackHero.url;
      targetTrip.photo_url = fallbackHero.url;
      targetTrip.imagePhotographer = fallbackHero.photographer;
      targetTrip.imagePhotographerUrl = fallbackHero.photographerUrl;
      markPhotoUsed(fallbackHero.url, usedUrls);
    } else if (targetTrip.imageUrl) {
      targetTrip.photoUrl = targetTrip.photoUrl || targetTrip.imageUrl;
      targetTrip.photo_url = targetTrip.photo_url || targetTrip.imageUrl;
      markPhotoUsed(targetTrip.imageUrl, usedUrls);
    }

    // Mirror hero fields onto wrapper/inner trip if both exist
    if (trip !== targetTrip) {
      trip.imageUrl = targetTrip.imageUrl;
      trip.photoUrl = targetTrip.photoUrl;
      trip.photo_url = targetTrip.photo_url;
      trip.imagePhotographer = targetTrip.imagePhotographer;
      trip.imagePhotographerUrl = targetTrip.imagePhotographerUrl;
    } else if (trip.trip && typeof trip.trip === 'object') {
      trip.trip.imageUrl = targetTrip.imageUrl;
      trip.trip.photoUrl = targetTrip.photoUrl;
      trip.trip.photo_url = targetTrip.photo_url;
      trip.trip.imagePhotographer = targetTrip.imagePhotographer;
      trip.trip.imagePhotographerUrl = targetTrip.imagePhotographerUrl;
    }

    const days: any[] = Array.isArray(targetTrip.days) ? targetTrip.days : [];
    if (days.length === 0) {
      return trip;
    }

    // 3. Collect all stops across all days (supporting day.items AND/OR day.activities)
    const stops: StopEntry[] = [];
    days.forEach((day, dIdx) => {
      if (!day || typeof day !== 'object') return;
      const itemActivities: any[] = Array.isArray(day.items)
        ? day.items
            .filter((item: any) => item && item.type === 'activity' && item.data && typeof item.data === 'object')
            .map((item: any) => item.data)
        : [];

      if (itemActivities.length > 0) {
        itemActivities.forEach((act, sIdx) => {
          const rawPlace = String(act.placeName || act.title || '').trim();
          stops.push({
            dayIndex: dIdx,
            stopIndexInDay: sIdx,
            activity: act,
            cleanPlace: cleanPlaceTitle(rawPlace),
          });
        });
      } else if (Array.isArray(day.activities) && day.activities.length > 0) {
        day.activities.forEach((act: any, sIdx: number) => {
          if (!act || typeof act !== 'object') return;
          const rawPlace = String(act.placeName || act.title || '').trim();
          stops.push({
            dayIndex: dIdx,
            stopIndexInDay: sIdx,
            activity: act,
            cleanPlace: cleanPlaceTitle(rawPlace),
          });
        });
      }
    });

    // 4. Bounded-concurrency (max 4 concurrent, ~4000ms timeout) stop-specific Pexels lookups
    const stopCandidateLists: PexelsPhotoResult[][] = hasApiKey
      ? await mapWithConcurrency(stops, 4, async (stop) => {
          if (!stop.cleanPlace || stop.cleanPlace.length < 2) {
            return [];
          }
          const specificQuery = `${stop.cleanPlace} ${cleanDest} ${country}`
            .replace(/\s+/g, ' ')
            .trim();
          try {
            return await searchPexelsPhotos(specificQuery, 6, {
              country,
              isStopQuery: true,
              timeoutMs: 4000,
              targetKeywords: [stop.cleanPlace, cleanDest, country],
            });
          } catch {
            return [];
          }
        })
      : stops.map(() => []);

    // Helper to fetch page 2 of destination pool on demand if itinerary has many stops
    let fetchedExtraDestPage = false;
    const getNextUnusedDestinationPhoto = async (): Promise<PexelsPhotoResult | undefined> => {
      let next = destinationPhotos.find((p) => !isPhotoUsed(p.url, usedUrls));
      if (!next && hasApiKey && !fetchedExtraDestPage) {
        fetchedExtraDestPage = true;
        try {
          const extra = await searchPexelsPhotos(destPoolQuery, 20, {
            country,
            page: 2,
            timeoutMs: 4000,
          });
          for (const p of extra) {
            destinationPhotos.push(p);
          }
          next = destinationPhotos.find((p) => !isPhotoUsed(p.url, usedUrls));
        } catch {
          // Ignore page 2 error
        }
      }
      return next;
    };

    // 5. Assign unique, non-overlapping photos to every stop
    for (let idx = 0; idx < stops.length; idx++) {
      const stop = stops[idx];
      const candidates = stopCandidateLists[idx] || [];

      let chosen = candidates.find((p) => !isPhotoUsed(p.url, usedUrls));
      if (!chosen) {
        chosen = await getNextUnusedDestinationPhoto();
      }
      if (!chosen && !hasApiKey) {
        chosen = pickOfflineThemeFallback(stop.activity, usedUrls);
      }
      if (!chosen && destinationPhotos.length > 0) {
        // Last-resort within same destination pool only (never another city's photo)
        chosen = destinationPhotos[idx % destinationPhotos.length];
      }

      if (chosen) {
        stop.activity.imageUrl = chosen.url;
        stop.activity.imagePhotographer = chosen.photographer;
        stop.activity.imagePhotographerUrl = chosen.photographerUrl;
        markPhotoUsed(chosen.url, usedUrls);
      }
    }

    // 6. Assign distinct Day hero photos and sync day.activities <-> day.items
    for (let dIdx = 0; dIdx < days.length; dIdx++) {
      const day = days[dIdx];
      if (!day || typeof day !== 'object') continue;

      let dayPhoto = await getNextUnusedDestinationPhoto();
      if (!dayPhoto && !hasApiKey) {
        dayPhoto = pickOfflineThemeFallback({ title: day.title || `Día ${dIdx + 1}` }, usedUrls);
      }

      if (dayPhoto) {
        day.imageUrl = dayPhoto.url;
        day.imagePhotographer = dayPhoto.photographer;
        day.imagePhotographerUrl = dayPhoto.photographerUrl;
        markPhotoUsed(dayPhoto.url, usedUrls);
      } else if (heroPhoto) {
        day.imageUrl = day.imageUrl || heroPhoto.url;
        day.imagePhotographer = day.imagePhotographer || heroPhoto.photographer;
        day.imagePhotographerUrl = day.imagePhotographerUrl || heroPhoto.photographerUrl;
      }

      // Sync day.activities alongside day.items when both exist
      if (Array.isArray(day.items) && Array.isArray(day.activities)) {
        const enrichedItems = day.items
          .filter((it: any) => it && it.type === 'activity' && it.data)
          .map((it: any) => it.data);

        day.activities.forEach((act: any, actIdx: number) => {
          if (!act || typeof act !== 'object') return;
          const matched =
            (act.id && enrichedItems.find((e: any) => e.id === act.id)) ||
            enrichedItems[actIdx];
          if (matched && matched.imageUrl) {
            act.imageUrl = matched.imageUrl;
            act.imagePhotographer = matched.imagePhotographer;
            act.imagePhotographerUrl = matched.imagePhotographerUrl;
          }
        });
      }
    }

    if (trip !== targetTrip && Array.isArray(targetTrip.days)) {
      trip.days = targetTrip.days;
    } else if (trip.trip && typeof trip.trip === 'object') {
      trip.trip.days = targetTrip.days;
    }

    return trip;
  } catch (error) {
    console.error('[Pexels] Error enriqueciendo viaje:', error);
    return trip;
  }
}

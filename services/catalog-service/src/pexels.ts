export interface PexelsPhotoResult {
  url: string;
  photographer: string;
  photographerUrl: string;
  alt: string;
}

// User-provided Pexels API Key
const DEFAULT_PEXELS_KEY = 'KCXmGYJTl8aJobrlbgoU77V3SNLvbjkxO9P8OPk5sazUKARfJcqBGSu9';

function getPexelsKey(): string {
  return process.env.PEXELS_API_KEY || DEFAULT_PEXELS_KEY;
}

// In-memory cache to prevent redundant API calls
const cache = new Map<string, PexelsPhotoResult[]>();

/**
 * Searches Pexels API for real travel photos matching query.
 */
export async function searchPexelsPhotos(
  query: string,
  count = 5
): Promise<PexelsPhotoResult[]> {
  const apiKey = getPexelsKey();
  if (!apiKey) {
    console.warn('[Pexels] No API key available');
    return [];
  }

  const cleanQuery = query.trim();
  if (!cleanQuery) return [];

  const cacheKey = `${cleanQuery.toLowerCase()}_${count}`;
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey)!;
  }

  const strippedParentheses = cleanQuery.replace(/\([^)]*\)/g, '').trim();
  const lower = cleanQuery
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  // Generate intelligent search variants
  const variants: string[] = [];
  if (lower.includes('atacama') || lower.includes('san pedro')) {
    variants.push('San Pedro de Atacama Chile', 'Atacama Desert Chile');
  } else if (lower.includes('valparaiso') || lower.includes('valpo') || lower.includes('vina')) {
    variants.push('Valparaiso Chile', 'Cerro Alegre Valparaiso');
  } else if (lower.includes('paine') || lower.includes('patagonia') || lower.includes('natales')) {
    variants.push('Torres del Paine Chile', 'Patagonia Chile');
  } else if (lower.includes('pucon') || lower.includes('villarrica') || lower.includes('varas') || lower.includes('valdivia')) {
    variants.push('Villarrica Volcano Pucon Chile', 'Pucon Lake Chile');
  } else if (lower.includes('chiloe') || lower.includes('castro') || lower.includes('ancud')) {
    variants.push('Castro Chiloe Palafitos Chile', 'Chiloe Island Chile');
  } else if (lower.includes('santiago') || lower.includes('providencia') || lower.includes('bellavista')) {
    variants.push('Santiago Chile Andes Skyline', 'Santiago de Chile');
  } else if (lower.includes('cusco') || lower.includes('peru') || lower.includes('machu')) {
    variants.push('Cusco Machu Picchu Peru', 'Cusco Peru');
  } else if (lower.includes('tokio') || lower.includes('tokyo') || lower.includes('japon')) {
    variants.push('Tokyo Japan Skyline', 'Shinjuku Tokyo Japan');
  } else if (lower.includes('roma') || lower.includes('italia')) {
    variants.push('Rome Colosseum Italy', 'Rome Italy');
  } else if (lower.includes('buenos aires') || lower.includes('argentina')) {
    variants.push('Buenos Aires Argentina', 'Caminito Buenos Aires');
  }

  if (strippedParentheses && !variants.includes(strippedParentheses)) {
    variants.push(strippedParentheses);
  }
  if (!variants.includes(cleanQuery)) {
    variants.push(cleanQuery);
  }

  for (const q of variants) {
    try {
      const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(q)}&per_page=${count}&orientation=landscape`;
      const res = await fetch(url, {
        headers: {
          Authorization: apiKey,
        },
        signal: AbortSignal.timeout(3500),
      });

      if (!res.ok) {
        continue;
      }

      const data = (await res.json()) as any;
      if (Array.isArray(data.photos) && data.photos.length > 0) {
        const results: PexelsPhotoResult[] = data.photos.map((p: any) => ({
          url: p.src?.large2x || p.src?.large || p.src?.medium || p.src?.original,
          photographer: p.photographer || 'Pexels Contributor',
          photographerUrl: p.photographer_url || 'https://www.pexels.com',
          alt: p.alt || q,
        }));

        cache.set(cacheKey, results);
        return results;
      }
    } catch (err) {
      // Continue to next variant
    }
  }

  return [];
}

/**
 * Gets a single hero photo for a destination, with an elegant fallback if not found.
 */
export async function getDestinationHeroPhoto(
  destination: string,
  fallbackUrl?: string
): Promise<{ url: string; photographer?: string; photographerUrl?: string }> {
  const photos = await searchPexelsPhotos(destination, 1);
  if (photos.length > 0) {
    return {
      url: photos[0].url,
      photographer: photos[0].photographer,
      photographerUrl: photos[0].photographerUrl,
    };
  }

  return {
    url: fallbackUrl || 'https://images.pexels.com/photos/17808457/pexels-photo-17808457.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
    photographer: 'Lais Queiroz (Pexels)',
    photographerUrl: 'https://www.pexels.com/@laisqfotografia',
  };
}

/**
 * Curated, verified, permanent high-resolution Pexels photos organized by
 * historical context, architectural style, and place typology.
 * Used when direct place search requires fallback, ensuring zero duplicated images.
 */
const HISTORICAL_THEME_FALLBACKS: Record<string, PexelsPhotoResult[]> = {
  castle_fortress: [
    {
      url: 'https://images.pexels.com/photos/38313219/pexels-photo-38313219.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
      photographer: 'Pexels Contributor',
      photographerUrl: 'https://www.pexels.com',
      alt: 'Castillo Hidalgo y torreones históricos en cerro patrimonial',
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
      alt: 'Palacio presidencial neoclásico con columnas y patios cívicos',
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
      alt: 'Museo Nacional de Bellas Artes y cúpula de cristal histórica',
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
      alt: 'Casa museo de autor con maderas nobles y mascarones',
    },
  ],
  church_colonial: [
    {
      url: 'https://images.pexels.com/photos/18156722/pexels-photo-18156722.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
      photographer: 'Camilo Ospina',
      photographerUrl: 'https://www.pexels.com/@camilo-ospina',
      alt: 'Iglesia colonial de adobe y tejas de arcilla cocida',
    },
    {
      url: 'https://images.pexels.com/photos/7213869/pexels-photo-7213869.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
      photographer: "Tom D'Arby",
      photographerUrl: 'https://www.pexels.com/@tomdarby',
      alt: 'Templo patrimonial de madera y arquitectura chilota',
    },
  ],
  wine_cellar: [
    {
      url: 'https://images.pexels.com/photos/34004193/pexels-photo-34004193.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
      photographer: 'DΛVΞ GΛRCIΛ',
      photographerUrl: 'https://www.pexels.com/@dave-garcia',
      alt: 'Viñedos centenarios al pie de la cordillera',
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
      alt: 'Bodega de vino y degustación de cepas chilenas',
    },
  ],
  market_culinary: [
    {
      url: 'https://images.pexels.com/photos/19762180/pexels-photo-19762180.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
      photographer: 'Eduard Perez',
      photographerUrl: 'https://www.pexels.com/@eduard-perez',
      alt: 'Mercado Central y nave histórica de hierro forjado',
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
      alt: 'Empanadas tradicionales y recetas criollas de greda',
    },
    {
      url: 'https://images.pexels.com/photos/38993747/pexels-photo-38993747.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
      photographer: "César O'neill",
      photographerUrl: 'https://www.pexels.com/@cesar-oneill',
      alt: 'Gastronomía marina tradicional en caleta de pescadores',
    },
  ],
  bohemian_street_art: [
    {
      url: 'https://images.pexels.com/photos/37270328/pexels-photo-37270328.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
      photographer: 'Nikolai Kolosov',
      photographerUrl: 'https://www.pexels.com/@nikolai-kolosov-20411833',
      alt: 'Callejones de adoquines y casonas de Barrio Lastarria',
    },
    {
      url: 'https://images.pexels.com/photos/17808457/pexels-photo-17808457.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
      photographer: 'Lais Queiroz',
      photographerUrl: 'https://www.pexels.com/@laisqfotografia',
      alt: 'Murales y arquitectura colorida en cerros patrimoniales',
    },
    {
      url: 'https://images.pexels.com/photos/302899/pexels-photo-302899.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
      photographer: 'Chevanon Photography',
      photographerUrl: 'https://www.pexels.com/@chevanon',
      alt: 'Cafetería de tertulia histórica y ambiente bohemio',
    },
  ],
  scenic_viewpoint: [
    {
      url: 'https://images.pexels.com/photos/17347192/pexels-photo-17347192.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
      photographer: 'Alexis Leandro Jeria Bocca',
      photographerUrl: 'https://www.pexels.com/@alexis-leandro-jeria-bocca',
      alt: 'Mirador panorámico de alta torre sobre la cordillera',
    },
    {
      url: 'https://images.pexels.com/photos/37314783/pexels-photo-37314783.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
      photographer: 'Nikolai Kolosov',
      photographerUrl: 'https://www.pexels.com/@nikolai-kolosov-20411833',
      alt: 'Vista panorámica de la ciudad y montañas desde la cumbre',
    },
    {
      url: 'https://images.pexels.com/photos/1619317/pexels-photo-1619317.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
      photographer: 'James Wheeler',
      photographerUrl: 'https://www.pexels.com/@souvenirpixels',
      alt: 'Mirador natural entre valles y cadenas montañosas',
    },
  ],
  nature_thermal_desert: [
    {
      url: 'https://images.pexels.com/photos/27878411/pexels-photo-27878411.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
      photographer: 'Eleanore Stohner',
      photographerUrl: 'https://www.pexels.com/@eleanore-stohner-499317537',
      alt: 'Formaciones milenarias en el Valle de la Luna',
    },
    {
      url: 'https://images.pexels.com/photos/1578750/pexels-photo-1578750.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
      photographer: 'Visit Greenland',
      photographerUrl: 'https://www.pexels.com',
      alt: 'Piscinas de aguas termales naturales en quebrada boscosa',
    },
    {
      url: 'https://images.pexels.com/photos/30359266/pexels-photo-30359266.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
      photographer: 'Marek Piwnicki',
      photographerUrl: 'https://www.pexels.com/@marekpiwnicki',
      alt: 'Lagos glaciares y cordilleras vírgenes de la Patagonia',
    },
    {
      url: 'https://images.pexels.com/photos/1624496/pexels-photo-1624496.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
      photographer: 'Eberhard Grossgasteiger',
      photographerUrl: 'https://www.pexels.com/@eberhardgross',
      alt: 'Cielo estrellado y observación astronómica en el desierto',
    },
  ],
};

/**
 * Strips noisy verbal prefixes from activity titles to isolate the exact place name.
 */
function cleanPlaceTitle(rawTitle: string): string {
  if (!rawTitle) return '';
  let cleaned = rawTitle.trim();
  // Remove prefixes like "Visita a...", "Almuerzo en...", "Recorrido por...", "Cena en...", etc.
  cleaned = cleaned.replace(/^(?:visita|recorrido|paseo|almuerzo|cena|degustación|tour|exploración|caminata|parada|desayuno|tarde de)\s+(?:al|a la|a los|a las|en el|en la|en los|en las|en|por el|por la|por los|por las|por|de|del)?\s*/i, '');
  // If title has separators like " o " or " - ", keep the primary place
  if (cleaned.includes(' o ')) {
    cleaned = cleaned.split(' o ')[0].trim();
  }
  return cleaned;
}

/**
 * Analyzes the place's historical and architectural background to determine the appropriate theme.
 */
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
  if (text.includes('castillo') || text.includes('fortaleza') || text.includes('fuerte') || text.includes('muralla') || text.includes('hidalgo')) {
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
  if (text.includes('mural') || text.includes('street art') || text.includes('bohemi') || text.includes('lastarria') || text.includes('bellavista')) {
    return { key: 'bohemian_street_art', query: 'historic street art murals bohemian alley' };
  }
  if (text.includes('mirador') || text.includes('cumbre') || text.includes('panorámic') || text.includes('costanera') || text.includes('cerro')) {
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

/**
 * Searches and assigns a guaranteed UNIQUE photo for an individual activity / place,
 * ensuring each place has its own distinct photo corresponding either to the place
 * name or to its historical and architectural heritage context.
 */
export async function getUniquePhotoForActivity(
  act: any,
  destination: string,
  usedUrls: Set<string>
): Promise<PexelsPhotoResult> {
  const cleanPlace = cleanPlaceTitle(act.title || '');
  const { key: themeKey, query: historyQuery } = extractHistoryThemeKey(
    act.history,
    act.architectureOrHeritage,
    act.curiosity,
    act.category,
    act.title
  );

  // Search candidates in prioritized order
  const searchQueries: string[] = [];
  if (cleanPlace) {
    searchQueries.push(`${cleanPlace} ${destination}`);
    searchQueries.push(cleanPlace);
  }
  searchQueries.push(`${historyQuery} ${destination}`);
  searchQueries.push(historyQuery);

  for (const q of searchQueries) {
    try {
      const photos = await searchPexelsPhotos(q, 6);
      const available = photos.find((p) => !usedUrls.has(p.url));
      if (available) {
        usedUrls.add(available.url);
        return available;
      }
    } catch {
      // Continue to next query
    }
  }

  // Fallback to verified theme pool
  const themePool = HISTORICAL_THEME_FALLBACKS[themeKey] || HISTORICAL_THEME_FALLBACKS.palace_neoclassical;
  const unusedFromTheme = themePool.find((p) => !usedUrls.has(p.url));
  if (unusedFromTheme) {
    usedUrls.add(unusedFromTheme.url);
    return unusedFromTheme;
  }

  // Global search across all fallback pools to guarantee absolute uniqueness
  for (const pool of Object.values(HISTORICAL_THEME_FALLBACKS)) {
    const candidate = pool.find((p) => !usedUrls.has(p.url));
    if (candidate) {
      usedUrls.add(candidate.url);
      return candidate;
    }
  }

  // In the theoretical scenario all pool items are exhausted, return first item with alt
  const emergency = themePool[0];
  usedUrls.add(emergency.url);
  return emergency;
}

/**
 * Enriches a complete Trip object with Pexels photos:
 * 1. Trip hero photo (unique)
 * 2. Day-by-day hero photos (each day distinct)
 * 3. Individual activity photos (EACH place guaranteed unique by place or historical context)
 */
export async function enrichTripWithPexels(trip: any): Promise<any> {
  try {
    const destination = trip.destination || 'Valparaíso, Chile';
    const usedUrls = new Set<string>();

    // 1. Fetch destination photos
    const destinationPhotos = await searchPexelsPhotos(destination, 15);

    // Trip Hero photo
    let heroPhoto = destinationPhotos.find((p) => !usedUrls.has(p.url));
    if (heroPhoto) {
      trip.imageUrl = heroPhoto.url;
      trip.imagePhotographer = heroPhoto.photographer;
      trip.imagePhotographerUrl = heroPhoto.photographerUrl;
      usedUrls.add(heroPhoto.url);
    } else {
      const hero = await getDestinationHeroPhoto(destination);
      trip.imageUrl = hero.url;
      trip.imagePhotographer = hero.photographer;
      trip.imagePhotographerUrl = hero.photographerUrl;
      usedUrls.add(hero.url);
    }

    // 2. Day-by-day hero photos
    if (Array.isArray(trip.days)) {
      for (let dIdx = 0; dIdx < trip.days.length; dIdx++) {
        const day = trip.days[dIdx];
        let dayPhoto = destinationPhotos.find((p) => !usedUrls.has(p.url));

        if (!dayPhoto) {
          // Try searching with day title or sector
          const dayQuery = `${day.title || 'Día ' + (dIdx + 1)} ${destination}`;
          const daySpecificPhotos = await searchPexelsPhotos(dayQuery, 4);
          dayPhoto = daySpecificPhotos.find((p) => !usedUrls.has(p.url));
        }

        if (dayPhoto) {
          day.imageUrl = dayPhoto.url;
          day.imagePhotographer = dayPhoto.photographer;
          day.imagePhotographerUrl = dayPhoto.photographerUrl;
          usedUrls.add(dayPhoto.url);
        }

        // 3. Enrich EACH activity place with its own DIFFERENT image
        if (Array.isArray(day.items)) {
          for (let iIdx = 0; iIdx < day.items.length; iIdx++) {
            const item = day.items[iIdx];
            if (item.type === 'activity' && item.data) {
              const photo = await getUniquePhotoForActivity(item.data, destination, usedUrls);
              item.data.imageUrl = photo.url;
              item.data.imagePhotographer = photo.photographer;
              item.data.imagePhotographerUrl = photo.photographerUrl;
            }
          }
        }
      }
    }

    return trip;
  } catch (error) {
    console.error('[Pexels] Error enriqueciendo viaje:', error);
    return trip;
  }
}

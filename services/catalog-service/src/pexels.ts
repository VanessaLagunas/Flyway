export interface PexelsPhotoResult {
  url: string;
  photographer: string;
  photographerUrl: string;
  alt: string;
}

function getPexelsKey(): string {
  return (process.env.PEXELS_API_KEY || '').trim();
}

/**
 * Genera variantes semánticas precisas en inglés para el motor de búsqueda fotográfica de Pexels.
 * Corrige errores comunes de traducción (ej: "Polo Sur" que Pexels interpreta como deporte de polo)
 * y enriquece nombres de ciudades y países con términos turísticos y arquitectónicos.
 */
export function buildPexelsSearchVariants(rawQuery: string): string[] {
  const clean = rawQuery.replace(/\([^)]*\)/g, ' ').trim();
  const lower = clean
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  const variants: string[] = [];

  // 1. Zonas Polares y Extremos
  if (lower.includes('polo sur') || lower.includes('antartica') || lower.includes('antartida') || lower.includes('south pole')) {
    variants.push('South Pole Antarctica ice landscape', 'Antarctica glaciers icebergs travel', 'Antarctica mountains snow');
  } else if (lower.includes('polo norte') || lower.includes('artico') || lower.includes('north pole')) {
    variants.push('North Pole Arctic ice landscape', 'Arctic tundra ice travel');
  }

  // 2. Países Nórdicos y Escandinavia
  else if (lower.includes('noruega') || lower.includes('oslo') || lower.includes('bergen') || lower.includes('tromso') || lower.includes('lofoten') || lower.includes('norway')) {
    variants.push('Norway fjords landscape travel', 'Lofoten Norway landscape travel', 'Oslo Norway travel cityscape', 'Norway nature mountains');
  } else if (lower.includes('islandia') || lower.includes('reykjavik') || lower.includes('iceland')) {
    variants.push('Iceland waterfalls landscape travel', 'Iceland nature volcanoes', 'Reykjavik Iceland travel');
  } else if (lower.includes('suecia') || lower.includes('estocolmo') || lower.includes('sweden')) {
    variants.push('Stockholm Sweden travel cityscape', 'Sweden landscape nature');
  } else if (lower.includes('finlandia') || lower.includes('helsinki') || lower.includes('laponia') || lower.includes('finland')) {
    variants.push('Lapland Finland aurora snow travel', 'Helsinki Finland travel');
  } else if (lower.includes('dinamarca') || lower.includes('copenhague') || lower.includes('denmark')) {
    variants.push('Copenhagen Denmark Nyhavn travel', 'Denmark architecture travel');
  }

  // 3. Europa del Este y Rusia
  else if (lower.includes('rusia') || lower.includes('moscu') || lower.includes('san petersburgo') || lower.includes('russia')) {
    variants.push('Russia Moscow Saint Petersburg travel landscape', 'Moscow Red Square travel', 'Saint Petersburg Russia canals travel');
  } else if (lower.includes('polonia') || lower.includes('varsovia') || lower.includes('cracovia') || lower.includes('poland')) {
    variants.push('Krakow Poland travel old town', 'Warsaw Poland architecture travel');
  } else if (lower.includes('republica checa') || lower.includes('praga') || lower.includes('prague')) {
    variants.push('Prague Czech Republic Charles Bridge travel', 'Prague historic cityscape');
  } else if (lower.includes('hungria') || lower.includes('budapest') || lower.includes('hungary')) {
    variants.push('Budapest Hungary Danube parliament travel');
  }

  // 4. Europa Occidental y Mediterráneo
  else if (lower.includes('paris') || lower.includes('francia') || lower.includes('france') || lower.includes('niza') || lower.includes('lyon')) {
    variants.push('Paris France travel landmark architecture', 'Eiffel Tower Paris France travel', 'France landscape travel');
  } else if (lower.includes('madrid')) {
    variants.push('Madrid Spain travel landmark architecture', 'Madrid Gran Via Retiro travel');
  } else if (lower.includes('barcelona') || lower.includes('cataluna')) {
    variants.push('Barcelona Spain architecture Sagrada Familia travel', 'Barcelona Spain coast travel');
  } else if (lower.includes('sevilla') || lower.includes('granada') || lower.includes('andalucia') || lower.includes('espana') || lower.includes('spain')) {
    variants.push('Seville Spain Plaza de Espana travel', 'Spain travel landmark architecture', 'Andalucia Spain travel');
  } else if (lower.includes('roma') || lower.includes('coliseo') || lower.includes('vaticano')) {
    variants.push('Rome Italy Colosseum travel landmark', 'Rome Italy historic architecture');
  } else if (lower.includes('venecia') || lower.includes('venice')) {
    variants.push('Venice Italy canals gondola travel', 'Venice Italy architecture');
  } else if (lower.includes('florencia') || lower.includes('florence') || lower.includes('toscana')) {
    variants.push('Florence Italy Duomo Tuscany travel', 'Tuscany Italy landscape');
  } else if (lower.includes('milan') || lower.includes('italia') || lower.includes('italy') || lower.includes('amalfitana')) {
    variants.push('Amalfi Coast Italy travel ocean', 'Milan Italy Duomo architecture', 'Italy travel landscape');
  } else if (lower.includes('londres') || lower.includes('inglaterra') || lower.includes('london') || lower.includes('uk') || lower.includes('reino unido')) {
    variants.push('London England travel UK Big Ben', 'London architecture UK travel');
  } else if (lower.includes('escocia') || lower.includes('edimburgo') || lower.includes('scotland')) {
    variants.push('Scotland highlands landscape travel', 'Edinburgh Scotland castle travel');
  } else if (lower.includes('berlin') || lower.includes('alemania') || lower.includes('munich') || lower.includes('germany') || lower.includes('baviera')) {
    variants.push('Berlin Germany travel Brandenburg landmark', 'Bavaria Germany castle landscape travel', 'Germany travel landscape');
  } else if (lower.includes('suiza') || lower.includes('alpes') || lower.includes('zurich') || lower.includes('switzerland')) {
    variants.push('Switzerland Alps landscape mountains travel', 'Swiss Alps village travel');
  } else if (lower.includes('austria') || lower.includes('viena') || lower.includes('salzburgo')) {
    variants.push('Vienna Austria architecture travel', 'Austrian Alps landscape travel');
  } else if (lower.includes('amsterdam') || lower.includes('holanda') || lower.includes('paises bajos') || lower.includes('netherlands')) {
    variants.push('Amsterdam Netherlands canals travel', 'Netherlands travel landscape');
  } else if (lower.includes('portugal') || lower.includes('lisboa') || lower.includes('porto')) {
    variants.push('Lisbon Portugal travel architecture tram', 'Porto Portugal river travel');
  } else if (lower.includes('grecia') || lower.includes('atenas') || lower.includes('santorini') || lower.includes('greece')) {
    variants.push('Santorini Greece travel ocean landscape', 'Athens Greece Acropolis travel landmark');
  }

  // 5. Norteamérica
  else if (lower.includes('nueva york') || lower.includes('new york') || lower.includes('manhattan') || lower.includes('nyc')) {
    variants.push('New York City skyline travel landmark', 'Manhattan Central Park travel');
  } else if (lower.includes('miami') || lower.includes('orlando') || lower.includes('florida')) {
    variants.push('Miami Beach ocean Florida travel', 'Miami skyline palm trees');
  } else if (lower.includes('san francisco') || lower.includes('california') || lower.includes('los angeles')) {
    variants.push('Golden Gate Bridge San Francisco California travel', 'Los Angeles California travel');
  } else if (lower.includes('estados unidos') || lower.includes('usa') || lower.includes('eeuu') || lower.includes('chicago') || lower.includes('hawaii')) {
    variants.push('USA national park travel landscape', 'Hawaii beach ocean landscape travel', 'Chicago skyline travel');
  } else if (lower.includes('canada') || lower.includes('vancouver') || lower.includes('toronto') || lower.includes('banff')) {
    variants.push('Banff National Park Canada mountains lake landscape', 'Canada travel nature mountains');
  } else if (lower.includes('mexico') || lower.includes('cancun') || lower.includes('tulum') || lower.includes('riviera maya')) {
    variants.push('Cancun Mexico turquoise beach ocean landscape', 'Tulum Mexico beach Mayan ruins');
  } else if (lower.includes('oaxaca') || lower.includes('guadalajara') || lower.includes('cdmx')) {
    variants.push('Mexico travel historic colonial architecture', 'Mexico City historic center travel');
  }

  // 6. Sudamérica y Caribe
  else if (lower.includes('bariloche') || lower.includes('nahuel huapi')) {
    variants.push('Bariloche Argentina Nahuel Huapi lake mountains Patagonia', 'Bariloche travel Patagonia');
  } else if (lower.includes('mendoza')) {
    variants.push('Mendoza Argentina vineyards Andes mountains wine', 'Mendoza wine travel');
  } else if (lower.includes('buenos aires') || lower.includes('argentina') || lower.includes('palermo') || lower.includes('recoleta')) {
    variants.push('Buenos Aires Argentina travel cityscape', 'Caminito La Boca Buenos Aires travel');
  } else if (lower.includes('rio de janeiro') || lower.includes('copacabana') || lower.includes('ipanema') || lower.includes('brasil') || lower.includes('brazil')) {
    variants.push('Rio de Janeiro Brazil Christ Redeemer beach landscape', 'Brazil travel beach tropical landscape');
  } else if (lower.includes('cusco') || lower.includes('machu picchu') || lower.includes('valle sagrado')) {
    variants.push('Machu Picchu Cusco Peru Andes mountains travel', 'Cusco Peru historic travel');
  } else if (lower.includes('lima') || lower.includes('peru')) {
    variants.push('Cusco Peru travel landmark', 'Lima Peru coast Miraflores travel');
  } else if (lower.includes('cartagena') || lower.includes('colombia') || lower.includes('medellin') || lower.includes('bogota')) {
    variants.push('Cartagena Colombia colonial architecture travel', 'Colombia coffee region landscape');
  } else if (lower.includes('costa rica')) {
    variants.push('Costa Rica rainforest nature wildlife travel', 'Costa Rica beach landscape');
  }

  // 7. Asia, Oceanía y Medio Oriente
  else if (lower.includes('tokio') || lower.includes('tokyo') || lower.includes('shibuya') || lower.includes('shinjuku')) {
    variants.push('Tokyo Japan travel skyline cityscape', 'Tokyo Japan Sensoji temple Shibuya');
  } else if (lower.includes('kioto') || lower.includes('kyoto') || lower.includes('japon') || lower.includes('japan') || lower.includes('osaka')) {
    variants.push('Kyoto Japan traditional temples bamboo forest travel', 'Mount Fuji Japan landscape travel', 'Japan travel traditional');
  } else if (lower.includes('china') || lower.includes('beijing') || lower.includes('shanghai')) {
    variants.push('Great Wall of China travel landmark', 'Shanghai China skyline travel');
  } else if (lower.includes('corea') || lower.includes('seul') || lower.includes('seoul')) {
    variants.push('Seoul South Korea travel palace cityscape');
  } else if (lower.includes('tailandia') || lower.includes('bangkok') || lower.includes('phuket') || lower.includes('thailand')) {
    variants.push('Thailand travel tropical beach temples', 'Bangkok Thailand grand palace travel');
  } else if (lower.includes('indonesia') || lower.includes('bali')) {
    variants.push('Bali Indonesia temples beach nature travel');
  } else if (lower.includes('vietnam') || lower.includes('hanoi') || lower.includes('ha long')) {
    variants.push('Ha Long Bay Vietnam landscape travel');
  } else if (lower.includes('india') || lower.includes('delhi') || lower.includes('taj mahal')) {
    variants.push('Taj Mahal Agra India travel landmark');
  } else if (lower.includes('egipto') || lower.includes('el cairo') || lower.includes('piramides') || lower.includes('egypt')) {
    variants.push('Egypt pyramids Giza Cairo travel landmark', 'Nile river Egypt travel landscape');
  } else if (lower.includes('dubai') || lower.includes('emiratos') || lower.includes('abu dhabi')) {
    variants.push('Dubai UAE modern skyline Burj Khalifa travel');
  } else if (lower.includes('turquia') || lower.includes('estambul') || lower.includes('capadocia') || lower.includes('turkey')) {
    variants.push('Cappadocia Turkey hot air balloons landscape travel', 'Istanbul Turkey Bosphorus travel landmark');
  } else if (lower.includes('australia') || lower.includes('sidney') || lower.includes('sydney') || lower.includes('melbourne')) {
    variants.push('Sydney Australia Opera House travel landmark', 'Australia coast landscape nature travel');
  } else if (lower.includes('nueva zelanda') || lower.includes('new zealand') || lower.includes('queenstown')) {
    variants.push('New Zealand mountains fjords landscape nature travel');
  }

  // 8. Destinos de Chile
  else if (lower.includes('atacama') || lower.includes('san pedro') || lower.includes('luna') || lower.includes('cejar') || lower.includes('tatio')) {
    variants.push('San Pedro de Atacama Chile desert landscape', 'Atacama Desert Chile starry night sky', 'Valle de la Luna Atacama Chile');
  } else if (lower.includes('paine') || lower.includes('natales') || (lower.includes('patagonia') && !lower.includes('argentina'))) {
    variants.push('Torres del Paine Chile Patagonia mountains lake', 'Patagonia Chile landscape nature trekking');
  } else if (lower.includes('pucon') || lower.includes('villarrica') || lower.includes('caburgua')) {
    variants.push('Villarrica Volcano Pucon Chile lake mountains', 'Pucon Chile lake nature landscape');
  } else if (lower.includes('valdivia') || lower.includes('corral') || lower.includes('niebla')) {
    variants.push('Valdivia Chile river landscape nature', 'Valdivia Chile bridges ocean');
  } else if (lower.includes('puerto varas') || lower.includes('frutillar') || lower.includes('llanquihue') || lower.includes('osorno')) {
    variants.push('Puerto Varas Osorno Volcano Chile lake Llanquihue', 'Frutillar Chile lake theater mountains');
  } else if (lower.includes('chiloe') || lower.includes('castro') || lower.includes('ancud') || lower.includes('dalcahue')) {
    variants.push('Chiloe Island Chile palafitos wooden churches', 'Castro Chiloe Chile ocean palafitos');
  } else if (lower.includes('valparaiso') || lower.includes('valpo') || lower.includes('vina') || lower.includes('alegre') || lower.includes('concepcion')) {
    variants.push('Valparaiso Chile colorful hills harbor ocean', 'Cerro Alegre Valparaiso Chile architecture');
  } else if (lower.includes('santiago') || lower.includes('providencia') || lower.includes('bellavista') || lower.includes('cristobal') || lower.includes('costanera')) {
    variants.push('Santiago Chile Andes mountains cityscape skyline', 'Santiago de Chile Andes sunset');
  } else if (lower.includes('iquique') || lower.includes('arica') || lower.includes('cavancha')) {
    variants.push('Iquique Chile beach ocean coast Cavancha', 'Arica Chile coast Morro landscape');
  } else if (lower.includes('la serena') || lower.includes('coquimbo') || lower.includes('elqui')) {
    variants.push('La Serena Chile beach ocean coast', 'Elqui Valley Chile mountains vineyards');
  } else if (lower.includes('punta arenas') || lower.includes('magallanes')) {
    variants.push('Punta Arenas Chile Magellan Strait Patagonia');
  } else if (lower.includes('coyhaique') || lower.includes('carretera austral') || lower.includes('aysen')) {
    variants.push('Carretera Austral Chile Patagonia nature landscape', 'Aysen Chile marble caves');
  } else if (lower.includes('rapa nui') || lower.includes('pascua') || lower.includes('moai')) {
    variants.push('Easter Island Rapa Nui Moai statues sunset Chile', 'Rapa Nui landscape ocean Chile');
  }

  // 9. Si no cayó en ninguna regla anterior, construir variante inteligente en inglés
  if (variants.length === 0) {
    const sanitized = clean.replace(/[^\w\s]/gi, ' ').trim();
    if (sanitized.length >= 3) {
      variants.push(`${sanitized} travel landscape tourism`, `${sanitized} landmark architecture nature`);
    }
  }

  // Agregar la query limpia al final como respaldo directo
  if (clean && !variants.includes(clean)) {
    variants.push(clean);
  }

  return variants;
}

/**
 * Searches Pexels API for real travel photos matching query.
 */
export async function searchPexelsPhotos(
  query: string,
  count = 5
): Promise<PexelsPhotoResult[]> {
  const apiKey = getPexelsKey();
  if (!apiKey) {
    console.warn('[Pexels] PEXELS_API_KEY no configurada en .env. Continuando con fallback curado.');
    return [];
  }

  const cleanQuery = query.trim();
  if (!cleanQuery) return [];

  const variants = buildPexelsSearchVariants(cleanQuery);

  for (const q of variants) {
    try {
      const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(q)}&per_page=${count}&orientation=landscape`;
      const res = await fetch(url, {
        headers: {
          Authorization: apiKey,
        },
        signal: AbortSignal.timeout(4500),
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

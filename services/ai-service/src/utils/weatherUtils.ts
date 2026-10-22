import { BudgetLevel } from '../types';

export type SeasonName = 'Verano' | 'Otoño' | 'Invierno' | 'Primavera';

export interface WeatherAndClothingInfo {
  season: SeasonName;
  seasonIcon: string;
  currentSeason: SeasonName;
  currentSeasonIcon: string;
  hemisphere: 'Sur' | 'Norte';
  temperatureRange: string;
  weatherCondition: string;
  weatherSummary: string;
  clothingTip: string;
  clothingItems: string[];
  daysCount: number;
  weatherSource?: 'open-meteo' | 'climate-model';
}

export interface BudgetTierDetail {
  id: BudgetLevel;
  label: string;
  symbol: string;
  dailyRangeText: string;
  minDailyClp: number;
  maxDailyClp: number;
  shortTitle: string;
  description: string;
  highlights: string[];
}

export const BUDGET_TIER_DETAILS: Record<BudgetLevel, BudgetTierDetail> = {
  budget: {
    id: 'budget',
    label: 'Económico',
    symbol: '$',
    dailyRangeText: '$20.000 – $40.000 CLP / día',
    minDailyClp: 20000,
    maxDailyClp: 40000,
    shortTitle: 'Económico · Viajero Práctico y Auténtico',
    description:
      'Enfocado en maximizar tu presupuesto: prioriza recorridos patrimoniales a pie, miradores y parques gratuitos, transporte público local (Metro, micros, ascensores) y almuerzos en mercados tradicionales o "picadas" con menú del día.',
    highlights: [
      '🚌 Transporte público y caminatas',
      '🍲 Mercados, caletas y menús del día',
      '🏛️ Atractivos gratuitos y miradores',
    ],
  },
  standard: {
    id: 'standard',
    label: 'Estándar',
    symbol: '$$',
    dailyRangeText: '$45.000 – $85.000 CLP / día',
    minDailyClp: 45000,
    maxDailyClp: 85000,
    shortTitle: 'Estándar · Equilibrio entre Comodidad y Cultura',
    description:
      'Ideal para disfrutar sin preocupaciones: incluye entradas pagadas a museos, parques nacionales y casas patrimoniales, almuerzos en restaurantes locales de carta media, cafeterías de especialidad y traslados ágiles.',
    highlights: [
      '🎟️ Entradas a museos y parques incluidas',
      '🍽️ Restaurantes locales y cafés de autor',
      '🚖 Combinación de transporte ágil',
    ],
  },
  premium: {
    id: 'premium',
    label: 'Premium',
    symbol: '$$$',
    dailyRangeText: '$95.000 – $180.000+ CLP / día',
    minDailyClp: 95000,
    maxDailyClp: 180000,
    shortTitle: 'Premium · Alta Gastronomía y Experiencias Exclusivas',
    description:
      'Pensado para una experiencia de máximo confort: contempla restaurantes de alta cocina y autor, tours privados o guiados (catas de vino reserva, navegaciones, termas exclusivas) y traslados directos puerta a puerta.',
    highlights: [
      '🍷 Gastronomía de autor y catas reserva',
      '✨ Tours guiados y experiencias privadas',
      '🚗 Traslados cómodos y acceso preferente',
    ],
  },
};

export function getBudgetTierInfo(budget: BudgetLevel = 'standard'): BudgetTierDetail {
  return BUDGET_TIER_DETAILS[budget] || BUDGET_TIER_DETAILS.standard;
}

function normalizeText(str = ''): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

export function getSeasonIcon(season?: string): string {
  const norm = normalizeText(season || '');
  if (norm.includes('invierno')) return '❄️';
  if (norm.includes('otono')) return '🍂';
  if (norm.includes('primavera')) return '🌸';
  return '☀️';
}

export function isNorthernHemisphere(destination: string): boolean {
  const norm = normalizeText(destination);
  if (
    norm.includes('polo sur') ||
    norm.includes('south pole') ||
    norm.includes('antartica') ||
    norm.includes('antartida') ||
    norm.includes('antarctica')
  ) {
    return false;
  }
  const northKeywords = [
    // Escandinavia, Rusia, Ártico y Europa del Norte
    'noruega', 'norway', 'oslo', 'tromso', 'bergen', 'stavanger', 'lofoten',
    'rusia', 'russia', 'moscu', 'moscow', 'san petersburgo', 'siberia', 'murmansk', 'yakutsk', 'vladivostok',
    'suecia', 'sweden', 'estocolmo', 'stockholm', 'gotemburgo',
    'finlandia', 'finland', 'helsinki', 'laponia', 'rovaniemi',
    'islandia', 'iceland', 'reykjavik', 'reikiavik',
    'dinamarca', 'denmark', 'copenhague', 'copenhagen',
    'groenlandia', 'greenland', 'nuuk', 'svalbard', 'polo norte', 'north pole', 'artico', 'arctic',
    // Europa Occidental, Central y Mediterránea
    'roma', 'rome', 'italia', 'italy', 'milan', 'florencia', 'venecia', 'napoles',
    'madrid', 'barcelona', 'espana', 'spain', 'sevilla', 'valencia', 'granada', 'bilbao',
    'paris', 'francia', 'france', 'niza', 'lyon', 'marsella',
    'londres', 'london', 'uk', 'reino unido', 'inglaterra', 'escocia', 'edimburgo', 'irlanda', 'dublin',
    'berlin', 'alemania', 'germany', 'munich', 'frankfurt', 'hamburgo',
    'amsterdam', 'holanda', 'paises bajos', 'netherlands', 'bruselas', 'belgica',
    'suiza', 'switzerland', 'zurich', 'ginebra', 'interlaken', 'zermatt', 'alpes',
    'austria', 'viena', 'vienna', 'salzburgo', 'innsbruck',
    'lisboa', 'portugal', 'oporto', 'atenas', 'grecia', 'santorini',
    'praga', 'chequia', 'budapest', 'hungria', 'varsovia', 'cracovia', 'polonia',
    'croacia', 'dubrovnik', 'zagreb', 'turquia', 'estambul', 'capadocia',
    // Norteamérica, Centroamérica y Caribe
    'nueva york', 'new york', 'miami', 'orlando', 'los angeles', 'san francisco', 'las vegas',
    'chicago', 'boston', 'washington', 'seattle', 'alaska', 'anchorage', 'hawai', 'eeuu', 'usa', 'estados unidos',
    'canada', 'toronto', 'vancouver', 'montreal', 'quebec', 'banff', 'calgary', 'ottawa',
    'mexico', 'cdmx', 'cancun', 'tulum', 'playa del carmen', 'guadalajara', 'monterrey',
    'costa rica', 'panama', 'cuba', 'habana', 'punta cana', 'republica dominicana', 'puerto rico', 'jamaica',
    'bogota', 'cartagena', 'medellin', 'colombia', 'caribe', 'venezuela',
    // Asia, Medio Oriente y Norte de África
    'tokio', 'tokyo', 'japon', 'japan', 'kioto', 'kyoto', 'osaka', 'sapporo', 'hokkaido',
    'seul', 'seoul', 'corea', 'korea', 'bangkok', 'tailandia', 'thailand', 'phuket',
    'china', 'beijing', 'pekin', 'shanghai', 'hong kong', 'taiwan', 'taipei',
    'vietnam', 'hanoi', 'singapur', 'malasia', 'filipinas', 'india', 'delhi', 'mumbai', 'nepal', 'katmandu', 'himalaya',
    'dubai', 'emiratos', 'abu dhabi', 'qatar', 'doha', 'israel', 'jerusalen', 'jordania', 'petra',
    'egipto', 'cairo', 'marruecos', 'marrakech', 'casablanca', 'tunez',
  ];
  return northKeywords.some((kw) => norm.includes(kw));
}

function parseDateSafe(dateStr: string): Date {
  if (!dateStr) return new Date();
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) {
    const [d, m, y] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  const parsed = new Date(dateStr);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
}

export function getSeasonForDate(date: Date, isNorth: boolean): { season: SeasonName; icon: string } {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const md = month * 100 + day;

  let southSeason: SeasonName;
  if (md >= 1221 || md <= 320) {
    southSeason = 'Verano';
  } else if (md >= 321 && md <= 620) {
    southSeason = 'Otoño';
  } else if (md >= 621 && md <= 920) {
    southSeason = 'Invierno';
  } else {
    southSeason = 'Primavera';
  }

  const mapNorth: Record<SeasonName, SeasonName> = {
    Verano: 'Invierno',
    Otoño: 'Primavera',
    Invierno: 'Verano',
    Primavera: 'Otoño',
  };

  const season = isNorth ? mapNorth[southSeason] : southSeason;
  const icons: Record<SeasonName, string> = {
    Verano: '☀️',
    Otoño: '🍂',
    Invierno: '❄️',
    Primavera: '🌸',
  };

  return { season, icon: icons[season] };
}

/**
 * Construye recomendaciones de vestimenta precisas en función de las temperaturas mínimas/máximas reales,
 * presencia de nieve o lluvia, y velocidad del viento.
 */
export function buildClothingForTemperature(
  minTemp: number,
  maxTemp: number,
  hasSnow: boolean,
  hasRain: boolean,
  isWindy: boolean
): { clothingTip: string; clothingItems: string[] } {
  const avgTemp = (minTemp + maxTemp) / 2;

  if (maxTemp <= -8 || minTemp <= -15 || avgTemp <= -10) {
    return {
      clothingTip:
        '¡Frío polar extremo bajo cero! Ropa desabrigada está totalmente descartada. Utiliza equipamiento técnico de expedición en 3 a 4 capas: primera capa térmica pesada de lana merino (superior e inferior), segunda capa de polar ártico y plumón de alta densidad, tercera capa parka y pantalón cortavientos impermeable, botas polares térmicas, mitones sobre guantes térmicos, pasamontañas y antiparras con filtro UV.',
      clothingItems: [
        '🧥 Parka de expedición polar (pluma + Gore-Tex)',
        '❄️ 1ª y 2ª capa térmica completa (lana merino / polar)',
        '🥾 Botas térmicas polares impermeables con tracción',
        '🧤 Mitones térmicos, pasamontañas y gafas UV de nieve',
      ],
    };
  }

  if (maxTemp <= 6 || minTemp <= -1 || hasSnow) {
    return {
      clothingTip:
        'Clima frío invernal / subártico: debes ir muy bien abrigado con sistema de 3 capas térmicas. Usa primera capa térmica ajustada (camiseta y calzas), sweater de lana o polar grueso, abrigo de pluma o parka impermeable cortavientos, además de gorro térmico, bufanda, guantes y botas impermeables con suela antideslizante.',
      clothingItems: [
        '🧥 Parka térmica o abrigo de pluma impermeable',
        '🧶 Primera capa térmica + polar grueso',
        '🧣 Gorro de invierno, bufanda y guantes térmicos',
        '🥾 Botas impermeables con suela antideslizante',
      ],
    };
  }

  if (maxTemp <= 14 || minTemp <= 6) {
    return {
      clothingTip:
        `Clima frío a fresco${hasRain ? ' con lluvias probables' : ''}${isWindy ? ' y viento' : ''}: lleva chaqueta abrigada e impermeable o abrigo cortavientos, polar o suéter de lana, pantalones largos térmicos o repelentes al agua y calzado cerrado resistente a la humedad.`,
      clothingItems: [
        '🧥 Chaqueta abrigada e impermeable con capucha',
        '🧶 Sweater de lana o polar térmico',
        '🥾 Calzado cerrado impermeable y cómodo',
        hasRain ? '☂️ Impermeable / paraguas resistente al viento' : '🧣 Cuello polar o bufanda y gorro ligero',
      ],
    };
  }

  if (maxTemp <= 23) {
    return {
      clothingTip:
        `Clima templado${hasRain ? ' con chubascos ocasionales' : ''}: vístete por capas versátiles con polera o camisa para el mediodía y suma una chaqueta cortavientos o sweater abrigado para las mañanas y noches frescas, junto con calzado cómodo para caminar.`,
      clothingItems: [
        '👟 Zapatillas o calzado cómodo para caminar',
        '🧥 Chaqueta cortavientos o abrigo ligero',
        '👕 Prendas en capas (día templado / noche fresca)',
        hasRain ? '☂️ Paraguas compacto o impermeable liviano' : '🕶️ Lentes de sol y protector solar',
      ],
    };
  }

  return {
    clothingTip:
      'Clima cálido: usa ropa ligera, holgada y transpirable de algodón o lino, sombrero de ala ancha, lentes de sol y protector solar FPS 50+. Lleva una prenda liviana adicional para el atardecer o recintos con aire acondicionado.',
    clothingItems: [
      '👕 Ropa ligera y transpirable (algodón / lino)',
      '👒 Sombrero, lentes de sol y protector FPS 50+',
      '👟 Calzado fresco y ventilado para caminar',
      hasRain ? '🧥 Cortavientos ultraligero para lluvia tropical' : '💧 Botella de agua reutilizable',
    ],
  };
}

export function getWeatherAndClothingForTrip(
  destination: string,
  startDate: string,
  endDate: string
): WeatherAndClothingInfo {
  const norm = normalizeText(destination);
  const isNorth = isNorthernHemisphere(destination);
  const startD = parseDateSafe(startDate);
  const endD = parseDateSafe(endDate);
  const diffMs = Math.abs(endD.getTime() - startD.getTime());
  const daysCount = Math.min(Math.max(Math.ceil(diffMs / (1000 * 60 * 60 * 24)) + 1, 1), 14);

  const selectedSeasonObj = getSeasonForDate(startD, isNorth);
  const currentSeasonObj = getSeasonForDate(new Date(), isNorth);
  const season = selectedSeasonObj.season;

  let temperatureRange = '12°C – 21°C';
  let weatherCondition = 'Templado variable con brisa local';
  let weatherSummary = `Durante tus ${daysCount} día${daysCount > 1 ? 's' : ''} en ${season.toLowerCase()}, se prevé un clima templado con mañanas frescas y tardes agradables para recorrer el destino.`;
  let clothingTip =
    'Vístete por capas: lleva prendas cómodas para el día, una chaqueta cortavientos o abrigo ligero para la mañana y la noche, y calzado cómodo para caminar.';
  let clothingItems = [
    '👟 Calzado cómodo para caminar',
    '🧥 Chaqueta cortavientos o abrigo ligero',
    '🕶️ Lentes de sol y protector solar',
    '👕 Ropa en capas (día / noche)',
  ];

  // 0A. POLO SUR / ANTÁRTICA / POLO NORTE / ÁRTICO / GROENLANDIA / SVALBARD (Clima Polar Extremo)
  if (
    norm.includes('polo sur') ||
    norm.includes('south pole') ||
    norm.includes('antartica') ||
    norm.includes('antartida') ||
    norm.includes('antarctica') ||
    norm.includes('polo norte') ||
    norm.includes('north pole') ||
    norm.includes('artico') ||
    norm.includes('arctic') ||
    norm.includes('groenlandia') ||
    norm.includes('greenland') ||
    norm.includes('svalbard')
  ) {
    const isSouthPoleInterior = norm.includes('polo sur') || norm.includes('south pole');
    if (isSouthPoleInterior) {
      temperatureRange = season === 'Verano' ? '-32°C – -18°C' : season === 'Invierno' ? '-62°C – -45°C' : '-48°C – -30°C';
      weatherCondition = 'Frío polar antártico extremo con hielo perpetuo y vientos catabáticos';
    } else {
      temperatureRange = season === 'Verano' ? '-6°C – 2°C' : season === 'Invierno' ? '-28°C – -12°C' : '-16°C – -5°C';
      weatherCondition = 'Gélido polar con nieve, glaciares, viento helado y temperaturas bajo cero';
    }
    weatherSummary = `En ${season} (${daysCount}d), ${destination} presenta condiciones polares extremas (${temperatureRange}) con hielo permanente, sensación térmica muy baja por el viento y alta radiación UV reflejada en la nieve.`;
    const polarClothing = buildClothingForTemperature(-35, -15, true, false, true);
    clothingTip = polarClothing.clothingTip;
    clothingItems = polarClothing.clothingItems;
  }
  // 0B. RUSIA / SIBERIA / MOSCÚ / SAN PETERSBURGO (Clima Continental Frío / Subártico)
  else if (
    norm.includes('rusia') ||
    norm.includes('russia') ||
    norm.includes('moscu') ||
    norm.includes('moscow') ||
    norm.includes('san petersburgo') ||
    norm.includes('siberia') ||
    norm.includes('murmansk') ||
    norm.includes('yakutsk')
  ) {
    const isSiberia = norm.includes('siberia') || norm.includes('yakutsk') || norm.includes('murmansk');
    if (season === 'Invierno') {
      temperatureRange = isSiberia ? '-32°C – -18°C' : '-14°C – -4°C';
      weatherCondition = 'Invierno ruso gélido con nevadas frecuentes, hielo y viento helado';
      weatherSummary = `Durante tus fechas es ${season} en ${destination} (${daysCount}d), con temperaturas bajo cero (${temperatureRange}), calles nevadas y días cortos.`;
      const c = buildClothingForTemperature(isSiberia ? -32 : -14, isSiberia ? -18 : -4, true, false, true);
      clothingTip = c.clothingTip;
      clothingItems = c.clothingItems;
    } else if (season === 'Verano') {
      temperatureRange = isSiberia ? '10°C – 22°C' : '14°C – 24°C';
      weatherCondition = 'Verano continental templado con días muy largos y noches frescas';
      weatherSummary = `Durante tus fechas es ${season} en ${destination} (${daysCount}d), con temperaturas entre ${temperatureRange}, noches blancas o largos días de luz y brisa fresca nocturna.`;
      const c = buildClothingForTemperature(12, 22, false, true, false);
      clothingTip = c.clothingTip;
      clothingItems = c.clothingItems;
    } else {
      temperatureRange = isSiberia ? '-12°C – 0°C' : '-3°C – 7°C';
      weatherCondition = `Frío continental ruso (${season} en Hemisferio Norte) con heladas, viento y posible aguanieve`;
      weatherSummary = `Durante tus fechas es ${season} en ${destination} (${daysCount}d), con ambiente frío (${temperatureRange}), mañanas bajo cero y posibles nevadas tempranas o lluvias frías.`;
      const c = buildClothingForTemperature(-3, 6, true, true, true);
      clothingTip = c.clothingTip;
      clothingItems = c.clothingItems;
    }
  }
  // 0C. NORUEGA / SUECIA / FINLANDIA / ISLANDIA / LAPONIA / DINAMARCA / ALASKA / CANADÁ
  else if (
    norm.includes('noruega') ||
    norm.includes('norway') ||
    norm.includes('oslo') ||
    norm.includes('tromso') ||
    norm.includes('bergen') ||
    norm.includes('lofoten') ||
    norm.includes('suecia') ||
    norm.includes('sweden') ||
    norm.includes('estocolmo') ||
    norm.includes('finlandia') ||
    norm.includes('finland') ||
    norm.includes('helsinki') ||
    norm.includes('laponia') ||
    norm.includes('rovaniemi') ||
    norm.includes('islandia') ||
    norm.includes('iceland') ||
    norm.includes('reykjavik') ||
    norm.includes('reikiavik') ||
    norm.includes('dinamarca') ||
    norm.includes('copenhague') ||
    norm.includes('alaska') ||
    norm.includes('canada') ||
    norm.includes('banff') ||
    norm.includes('montreal') ||
    norm.includes('toronto') ||
    norm.includes('vancouver')
  ) {
    if (season === 'Invierno') {
      temperatureRange = '-10°C – 0°C';
      weatherCondition = 'Frío nórdico / subártico con nieve, heladas y cielos de auroras boreales';
      weatherSummary = `Durante tus fechas es ${season} en ${destination} (${daysCount}d), con clima invernal bajo cero (${temperatureRange}), paisajes nevados y viento frío.`;
      const c = buildClothingForTemperature(-10, 0, true, false, true);
      clothingTip = c.clothingTip;
      clothingItems = c.clothingItems;
    } else if (season === 'Verano') {
      temperatureRange = '10°C – 19°C';
      weatherCondition = 'Fresco nórdico con largos días de luz y brisa fría en costas y fiordos';
      weatherSummary = `Durante tus fechas es ${season} en ${destination} (${daysCount}d), con días frescos y luminosos (${temperatureRange}) donde el viento marino y de montaña exige ropa en capas e impermeable.`;
      const c = buildClothingForTemperature(10, 18, false, true, true);
      clothingTip = c.clothingTip;
      clothingItems = c.clothingItems;
    } else {
      temperatureRange = '-1°C – 7°C';
      weatherCondition = `Frío nórdico (${season} en Hemisferio Norte) con viento, lluvias frías y nieve en altura`;
      weatherSummary = `Durante tus fechas es ${season} en ${destination} (${daysCount}d), con temperaturas frías (${temperatureRange}), heladas nocturnas y clima húmedo o nevadas en fiordos y montañas.`;
      const c = buildClothingForTemperature(-1, 6, true, true, true);
      clothingTip = c.clothingTip;
      clothingItems = c.clothingItems;
    }
  }
  // 1. San Pedro de Atacama / Norte Grande Desértico
  else if (norm.includes('atacama') || norm.includes('san pedro') || norm.includes('calama')) {
    if (season === 'Verano') {
      temperatureRange = '10°C – 28°C';
      weatherCondition = 'Desértico soleado de día y fresco de noche (posible lluvia altiplánica en altura)';
      weatherSummary = `En ${season} (${daysCount}d), Atacama presenta días radiantes con alta radiación UV (28°C) y noches frescas en el desierto (10°C). En excursiones sobre 4.000 msnm (Geysers del Tatio) la temperatura al amanecer baja a 0°C.`;
      clothingTip =
        'Usa ropa ligera de algodón o respirable de día, sombrero de ala ancha y bloqueador FPS 50+. Para tours de madrugada o astronomía lleva primera capa térmica, polar y cortavientos.';
      clothingItems = [
        '👒 Sombrero, lentes UV y FPS 50+',
        '🧥 Polar + cortavientos para la noche/Tatio',
        '🥾 Zapatillas de trekking cerradas',
        '💧 Botella reutilizable y bálsamo labial',
      ];
    } else if (season === 'Invierno') {
      temperatureRange = '-2°C – 20°C';
      weatherCondition = 'Cielos 100% despejados de día y noches gélidas de desierto';
      weatherSummary = `En ${season} (${daysCount}d), los días son templados y luminosos (20°C), pero al ocultarse el sol la temperatura cae bajo 0°C rápidamente.`;
      clothingTip =
        'Imprescindible vestirse en 3 capas: camiseta térmica, polar grueso y parka de pluma o cortavientos para las mañanas y noches, más polera manga corta para el mediodía soleado.';
      clothingItems = [
        '🧥 Parka térmica y primera capa',
        '🧤 Guantes y gorro de abrigo nocturno',
        '🕶️ Lentes de sol y bloqueador solar',
        '🥾 Calzado de trekking con buen agarre',
      ];
    } else {
      temperatureRange = '5°C – 25°C';
      weatherCondition = 'Despejado, seco y gran amplitud térmica día/noche';
      weatherSummary = `En ${season} (${daysCount}d), disfrutarás de cielos limpios y sol seco durante el día (25°C) con brisa fresca al atardecer en los valles y salares (5°C).`;
      clothingTip =
        'Lleva ropa fresca para el calor seco de la tarde, un cortavientos o polar abrigado para ver el atardecer en el Valle de la Luna y calzado cerrado para caminar en arena y roca.';
      clothingItems = [
        '👕 Ropa fresca + capa térmica nocturna',
        '🧥 Chaqueta cortavientos / polar',
        '🕶️ Sombrero y protector solar FPS 50+',
        '🥾 Zapatillas de senderismo',
      ];
    }
  } else if (
    norm.includes('paine') ||
    norm.includes('patagonia') ||
    norm.includes('natales') ||
    norm.includes('arenas') ||
    norm.includes('aysen') ||
    norm.includes('coyhaique') ||
    norm.includes('ushuaia') ||
    norm.includes('tierra del fuego') ||
    norm.includes('williams')
  ) {
    if (season === 'Verano') {
      temperatureRange = '5°C – 16°C';
      weatherCondition = 'Clima austral cambiante con vientos patagónicos y largos días de luz';
      weatherSummary = `En ${season} (${daysCount}d), tendrás hasta 17 horas de luz solar, temperaturas de 5°C a 16°C y ráfagas de viento patagónico ("las 4 estaciones en un solo día").`;
      clothingTip =
        'Aplica regla técnica de 3 capas: 1ª capa sintética/merino (nunca algodón), 2ª capa polar térmico y 3ª capa chaqueta impermeable/cortavientos Gore-Tex, con botas de trekking con soporte de tobillo.';
      clothingItems = [
        '🧥 Chaqueta impermeable y cortavientos',
        '🥾 Botas de trekking impermeables',
        '🧤 Gorro, cuello polar y guantes',
        '👖 Pantalón de trekking secado rápido',
      ];
    } else if (season === 'Invierno') {
      temperatureRange = '-5°C – 4°C';
      weatherCondition = 'Frío austral con paisajes nevados, heladas y poco viento';
      weatherSummary = `En ${season} (${daysCount}d), la zona austral ofrece montañas nevadas, vientos calmos y temperaturas bajas (-5°C a 4°C).`;
      clothingTip =
        'Debes llevar equipamiento invernal completo: primera capa térmica superior e inferior, parka de pluma, tercera capa impermeable, calzado térmico con tracción y guantes impermeables.';
      clothingItems = [
        '❄️ Primera capa térmica completa',
        '🧥 Parka de pluma + capa impermeable',
        '🥾 Calzado invernal impermeable',
        '🧤 Guantes térmicos y gorro de lana',
      ];
    } else {
      temperatureRange = '1°C – 12°C';
      weatherCondition = 'Frío patagónico con brisa austral y cielos dramáticos';
      weatherSummary = `En ${season} (${daysCount}d), las temperaturas oscilan entre 1°C y 12°C con colores intensos en los bosques de lenga y menor afluencia en los senderos.`;
      clothingTip =
        'Vístete con sistema técnico de 3 capas (térmica + polar + chaqueta impermeable cortavientos), pantalones de trekking repelentes al agua y calzado de montaña.';
      clothingItems = [
        '🧥 Cortavientos impermeable con capucha',
        '🧶 Polar térmico y primera capa',
        '🥾 Botín de trekking antideslizante',
        '🎒 Cubremochila para lluvia',
      ];
    }
  } else if (
    norm.includes('valparaiso') ||
    norm.includes('valpo') ||
    norm.includes('vina') ||
    norm.includes('concon') ||
    norm.includes('zapallar')
  ) {
    if (season === 'Verano') {
      temperatureRange = '14°C – 23°C';
      weatherCondition = 'Templado costero soleado con brisa marina refrescante';
      weatherSummary = `En ${season} (${daysCount}d), la costa tiene mañanas con ligera bruma marina que despeja antes del mediodía dando paso a tardes soleadas (23°C) y viento fresco al atardecer.`;
      clothingTip =
        'Ropa cómoda y fresca para subir y bajar los cerros al sol, sumando siempre un cortavientos o sweater ligero para la brisa costera de la tarde y zapatillas con suela adherente para los adoquines y escaleras.';
      clothingItems = [
        '👟 Zapatillas con suela antideslizante',
        '🧥 Cortavientos o chaqueta de mezclilla',
        '🕶️ Lentes de sol y gorro para el sol',
        '🎒 Mochila o bolso cruzado seguro',
      ];
    } else if (season === 'Invierno') {
      temperatureRange = '8°C – 15°C';
      weatherCondition = 'Fresco marítimo con nubosidad y probables lluvias costeras';
      weatherSummary = `En ${season} (${daysCount}d), el puerto presenta días frescos y húmedos (8°C a 15°C) con viento sur y posibles lluvias intermitentes.`;
      clothingTip =
        'Lleva chaqueta impermeable o abrigo cortavientos, sweater abrigado para los miradores expuestos al viento del Pacífico y calzado cerrado resistente a la humedad.';
      clothingItems = [
        '🧥 Chaqueta impermeable cortavientos',
        '🧶 Sweater o polar abrigado',
        '👟 Calzado cerrado antideslizante',
        '☂️ Paraguas compacto o capucha',
      ];
    } else {
      temperatureRange = '11°C – 19°C';
      weatherCondition = 'Templado costero con vaguada matinal y tardes despejadas';
      weatherSummary = `En ${season} (${daysCount}d), las mañanas comienzan frescas (11°C) y se abren hacia el mediodía con sol templado (19°C) ideal para recorrer miradores y paseos peatonales.`;
      clothingTip =
        'Vístete en capas ligeras: polera + camisa o sweater liviano + cortavientos para el atardecer frente a la bahía, y calzado muy cómodo para recorrer los cerros patrimoniales.';
      clothingItems = [
        '👟 Zapatillas cómodas para cerros',
        '🧥 Cortavientos ligero para la tarde',
        '👕 Capas livianas (mañana fresca / tarde tibia)',
        '🕶️ Protector solar y lentes de sol',
      ];
    }
  } else if (
    norm.includes('pucon') ||
    norm.includes('villarrica') ||
    norm.includes('varas') ||
    norm.includes('valdivia') ||
    norm.includes('frutillar') ||
    norm.includes('osorno')
  ) {
    if (season === 'Verano') {
      temperatureRange = '12°C – 26°C';
      weatherCondition = 'Soleado lacustre con brisa de montaña y noches frescas';
      weatherSummary = `En ${season} (${daysCount}d), disfrutarás de días cálidos junto al lago (26°C) ideales para playas, bosques y termas, refrescando por la noche (12°C).`;
      clothingTip =
        'Incluye ropa ligera de verano y traje de baño para el lago y las termas, zapatillas de trekking para parques nacionales y un polar o cortavientos para la noche sureña.';
      clothingItems = [
        '🩱 Traje de baño y toalla (termas / lago)',
        '🥾 Zapatillas de trekking o senderismo',
        '🧥 Polar o cortavientos para la noche',
        '🕶️ Bloqueador solar y repelente',
      ];
    } else if (season === 'Invierno') {
      temperatureRange = '3°C – 11°C';
      weatherCondition = 'Frío lluvioso sureño y nieve en el volcán (ideal para termas)';
      weatherSummary = `En ${season} (${daysCount}d), el sur ofrece lluvias frecuentes, bosques húmedos y nieve en altura (3°C a 11°C), perfecto para combinar con aguas termales calientes.`;
      clothingTip =
        'Imprescindible chaqueta impermeable con costuras selladas, calzado resistente al agua (Gore-Tex), ropa térmica y traje de baño para disfrutar las termas bajo el vapor.';
      clothingItems = [
        '🧥 Chaqueta 100% impermeable',
        '🥾 Botines impermeables para lluvia/barro',
        '🩱 Traje de baño para pozones termales',
        '🧶 Primera capa y polar térmico',
      ];
    } else {
      temperatureRange = '7°C – 18°C';
      weatherCondition = 'Templado sureño variable: claros de sol y chubascos breves';
      weatherSummary = `En ${season} (${daysCount}d), el clima lacustre alterna días despejados frente al volcán (18°C) con lluvias pasajeras y mañanas frescas (7°C).`;
      clothingTip =
        'Lleva chaqueta impermeable liviana, polar, calzado de trekking resistente al agua para los senderos de bosque nativo y traje de baño para las termas naturales.';
      clothingItems = [
        '🧥 Cortavientos impermeable con capucha',
        '🥾 Calzado de trekking resistente al agua',
        '🩱 Traje de baño para termas',
        '🧶 Sweater o polar de media estación',
      ];
    }
  } else if (norm.includes('chiloe') || norm.includes('castro') || norm.includes('ancud') || norm.includes('dalcahue')) {
    temperatureRange = season === 'Verano' ? '11°C – 20°C' : season === 'Invierno' ? '4°C – 11°C' : '7°C – 15°C';
    weatherCondition = 'Oceánico húmedo chilote: sol, viento y lluvias pasajeras con arcoíris';
    weatherSummary = `En ${season} (${daysCount}d), el archipiélago de Chiloé presenta su clásico clima oceánico (${temperatureRange}) donde en pocas horas se alternan lloviznas, viento marino y claros de sol.`;
    clothingTip =
      'En Chiloé el paraguas no sirve por el viento costero: usa chaqueta impermeable con capucha, sweater de lana o polar, y botines impermeables para caminar por muelles, palafitos y senderos.';
    clothingItems = [
      '🧥 Chaqueta impermeable con capucha',
      '🥾 Botines o calzado impermeable',
      '🧶 Sweater de lana chilota o polar',
      '🧦 Calcetines térmicos de recambio',
    ];
  } else if (norm.includes('santiago') || norm.includes('providencia') || norm.includes('bellavista') || norm.includes('maipo')) {
    if (season === 'Verano') {
      temperatureRange = '15°C – 32°C';
      weatherCondition = 'Cálido, seco y soleado despejado';
      weatherSummary = `En ${season} (${daysCount}d), Santiago tiene cielos despejados y calor seco al mediodía (hasta 32°C), refrescando agradablemente al caer la tarde (15°C).`;
      clothingTip =
        'Usa ropa liviana y fresca de lino o algodón, lentes de sol, sombrero y protector solar. Lleva una chaqueta muy liviana para las terrazas nocturnas o si subes a la cordillera.';
      clothingItems = [
        '👕 Ropa ligera y transpirable',
        '🕶️ Lentes de sol, gorro y FPS 50+',
        '👟 Zapatillas urbanas cómodas',
        '💧 Botella de agua reutilizable',
      ];
    } else if (season === 'Invierno') {
      temperatureRange = '3°C – 15°C';
      weatherCondition = 'Frío matinal y templado-fresco de tarde con nieve en los Andes';
      weatherSummary = `En ${season} (${daysCount}d), las mañanas y noches son frías (3°C) con tardes de 15°C y la Cordillera de los Andes nevada de fondo.`;
      clothingTip =
        'Lleva abrigo o parka urbana, bufanda, sweater para las mañanas frías y calzado cerrado cómodo (si visitas el Cajón del Maipo o nieve, suma ropa impermeable).';
      clothingItems = [
        '🧥 Abrigo o parka urbana abrigada',
        '🧣 Bufanda y sweater de invierno',
        '👟 Calzado cerrado cómodo',
        '☂️ Paraguas compacto por posibles lluvias',
      ];
    } else {
      temperatureRange = '9°C – 24°C';
      weatherCondition = 'Templado mediterráneo soleado y muy agradable';
      weatherSummary = `En ${season} (${daysCount}d), el valle central ofrece su mejor clima (${temperatureRange}): mañanas frescas y tardes soleadas ideales para parques, cerros y barrios bohemios.`;
      clothingTip =
        'Vístete con capas versátiles: polera o blusa para el sol del mediodía y una chaqueta liviana o blazer para la mañana y la noche.';
      clothingItems = [
        '👟 Zapatillas cómodas para caminar barrios',
        '🧥 Chaqueta liviana o cortavientos',
        '🕶️ Lentes de sol y protector solar',
        '👕 Prendas frescas de media estación',
      ];
    }
  } else if (norm.includes('cusco') || norm.includes('peru') || norm.includes('machu') || norm.includes('la paz') || norm.includes('uyuni')) {
    const month = startD.getMonth() + 1;
    const isDrySeason = month >= 5 && month <= 9;
    temperatureRange = isDrySeason ? '1°C – 19°C' : '6°C – 18°C';
    weatherCondition = isDrySeason
      ? 'Temporada seca andina: días soleados y noches muy frías en altura'
      : 'Temporada verde andina: mañanas templadas con lluvias pasajeras de tarde';
    weatherSummary = `En ${season} (${daysCount}d) en altura andina, el destino presenta días templados al sol (${temperatureRange}) pero se enfría rápidamente en la sombra y al anochecer.`;
    clothingTip =
      'Vístete por capas para la altura andina: camiseta térmica respirable, polar abrigado, cortavientos o poncho impermeable, gorro para el sol y zapatillas de trekking con buen agarre.';
    clothingItems = [
      '🥾 Zapatillas de trekking antideslizantes',
      '🧥 Polar térmico + poncho/impermeable',
      '👒 Sombrero solar y bloqueador FPS 50+',
      '🍵 Hidratación constante para la altura',
    ];
  } else if (norm.includes('tokio') || norm.includes('tokyo') || norm.includes('japon') || norm.includes('japan') || norm.includes('seul') || norm.includes('corea')) {
    if (season === 'Verano') {
      temperatureRange = '23°C – 32°C';
      weatherCondition = 'Cálido y húmedo (Verano en Hemisferio Norte)';
      weatherSummary = `En tus fechas seleccionadas es ${season} (${daysCount}d), con clima cálido y húmedo (${temperatureRange}).`;
      clothingTip =
        'Lleva ropa ultraligera y transpirable, paraguas plegable para lluvias de verano y calzado muy cómodo y fácil de quitar al entrar a templos tradicionales.';
      clothingItems = [
        '👕 Ropa ultraligera y transpirable',
        '👟 Zapatillas cómodas fáciles de calzar',
        '☂️ Paraguas plegable / abanico',
        '🧦 Calcetines limpios para entrar a templos',
      ];
    } else if (season === 'Invierno') {
      temperatureRange = '1°C – 10°C';
      weatherCondition = 'Frío seco invernal (Invierno en Hemisferio Norte)';
      weatherSummary = `En tus fechas seleccionadas es ${season} (${daysCount}d), con días despejados pero fríos (${temperatureRange}).`;
      clothingTip =
        'Usa abrigo largo o parka térmica sobre capas livianas, bufanda, guantes y calzado cómodo para largas caminatas urbanas.';
      clothingItems = [
        '🧥 Abrigo térmico o parka ligera',
        '🧣 Bufanda, guantes y camiseta térmica',
        '👟 Zapatillas urbanas de alto confort',
        '🧦 Calcetines térmicos cómodos',
      ];
    } else {
      temperatureRange = '10°C – 20°C';
      weatherCondition = `Fresco a templado (${season} en Hemisferio Norte)`;
      weatherSummary = `En tus fechas seleccionadas es ${season} (${daysCount}d), con temperaturas frescas y agradables (${temperatureRange}).`;
      clothingTip =
        'Lleva ropa urbana en capas (camiseta + sweater o chaqueta cortavientos) y zapatillas muy cómodas para largas caminatas.';
      clothingItems = [
        '👟 Zapatillas urbanas amortiguadas',
        '🧥 Chaqueta o abrigo de media estación',
        '🧦 Calcetines sin costuras para templos',
        '🎒 Mochila liviana de día',
      ];
    }
  } else if (
    norm.includes('suiza') ||
    norm.includes('alpes') ||
    norm.includes('zermatt') ||
    norm.includes('interlaken') ||
    norm.includes('austria') ||
    norm.includes('innsbruck')
  ) {
    temperatureRange = season === 'Verano' ? '11°C – 22°C' : season === 'Invierno' ? '-6°C – 3°C' : '2°C – 12°C';
    weatherCondition = season === 'Invierno' ? 'Frío alpino con nieve y heladas' : `Clima alpino de montaña (${season})`;
    weatherSummary = `Durante tus fechas es ${season} alpino (${daysCount}d), con temperaturas de ${temperatureRange} y aire frío de cordillera.`;
    const c = buildClothingForTemperature(season === 'Invierno' ? -6 : 2, season === 'Invierno' ? 3 : 12, season === 'Invierno', true, true);
    clothingTip = c.clothingTip;
    clothingItems = c.clothingItems;
  } else if (
    norm.includes('roma') ||
    norm.includes('italia') ||
    norm.includes('madrid') ||
    norm.includes('barcelona') ||
    norm.includes('espana') ||
    norm.includes('paris') ||
    norm.includes('francia') ||
    norm.includes('londres') ||
    norm.includes('berlin') ||
    norm.includes('amsterdam') ||
    norm.includes('praga') ||
    norm.includes('viena')
  ) {
    const isNorthEurope = norm.includes('londres') || norm.includes('berlin') || norm.includes('amsterdam') || norm.includes('praga') || norm.includes('viena');
    if (season === 'Verano') {
      temperatureRange = isNorthEurope ? '15°C – 25°C' : '21°C – 33°C';
      weatherCondition = isNorthEurope ? 'Templado europeo con brisa y nubes parciales' : 'Caluroso y soleado mediterráneo (Verano en Hemisferio Norte)';
      weatherSummary = `Durante tus fechas es ${season} europeo (${daysCount}d), con días largos (${temperatureRange}).`;
      clothingTip =
        'Ropa fresca de algodón o lino, gafas de sol y calzado cómodo para caminar sobre adoquines. Suma una chaqueta ligera para la noche.';
      clothingItems = [
        '👕 Ropa fresca y transpirable',
        '🧥 Chaqueta ligera para la noche',
        '👟 Calzado cómodo para adoquines',
        '🕶️ Lentes de sol y botella de agua',
      ];
    } else if (season === 'Invierno') {
      temperatureRange = isNorthEurope ? '0°C – 7°C' : '4°C – 13°C';
      weatherCondition = isNorthEurope ? 'Frío europeo invernal con humedad y viento' : 'Fresco invernal europeo (Invierno en Hemisferio Norte)';
      weatherSummary = `Durante tus fechas es ${season} europeo (${daysCount}d), con clima frío (${temperatureRange}).`;
      clothingTip =
        'Lleva abrigo térmico o parka impermeable, bufanda, guantes, sweater abrigado y calzado cerrado resistente al agua.';
      clothingItems = [
        '🧥 Abrigo térmico o parka impermeable',
        '🧣 Bufanda, guantes y sweater abrigado',
        '🥾 Calzado cerrado impermeable',
        '☂️ Paraguas plegable compacto',
      ];
    } else {
      temperatureRange = isNorthEurope ? '6°C – 15°C' : '11°C – 21°C';
      weatherCondition = `Fresco a templado europeo (${season} en Hemisferio Norte)`;
      weatherSummary = `Durante tus fechas es ${season} en Europa (${daysCount}d), con temperaturas de ${temperatureRange} y posibles lluvias estacionales.`;
      clothingTip =
        'Combina prendas en capas con chaqueta cortavientos o abrigo de media estación, paraguas compacto y calzado cómodo resistente al agua.';
      clothingItems = [
        '👟 Calzado cómodo y resistente a lluvia',
        '🧥 Chaqueta impermeable o trench coat',
        '🧣 Bufanda ligera y sweater',
        '☂️ Paraguas compacto',
      ];
    }
  } else if (
    norm.includes('caribe') ||
    norm.includes('cancun') ||
    norm.includes('tulum') ||
    norm.includes('punta cana') ||
    norm.includes('miami') ||
    norm.includes('rio de janeiro') ||
    norm.includes('brasil') ||
    norm.includes('cartagena') ||
    norm.includes('tailandia') ||
    norm.includes('bangkok') ||
    norm.includes('rapa nui') ||
    norm.includes('pascua')
  ) {
    temperatureRange = '23°C – 31°C';
    weatherCondition = 'Cálido tropical húmedo con brisa marina y sol';
    weatherSummary = `En ${season} (${daysCount}d), ${destination} presenta clima cálido tropical (${temperatureRange}) ideal para actividades al aire libre y costa.`;
    clothingTip =
      'Usa ropa muy fresca y ligera de algodón o lino, traje de baño, sombrero, lentes UV, protector solar biodegradable FPS 50+ y un cortavientos ultraligero por si cae un chubasco tropical breve.';
    clothingItems = [
      '👕 Ropa ligera y fresca de verano',
      '🩱 Traje de baño y sandalias/calzado cómodo',
      '👒 Sombrero, lentes de sol y FPS 50+',
      '💧 Hidratación constante y repelente',
    ];
  } else if (norm.includes('buenos aires') || norm.includes('argentina')) {
    temperatureRange = season === 'Verano' ? '20°C – 31°C' : season === 'Invierno' ? '7°C – 15°C' : '13°C – 23°C';
    weatherCondition =
      season === 'Verano'
        ? 'Cálido húmedo porteño con tardes soleadas'
        : season === 'Invierno'
        ? 'Fresco rioplatense con brisa húmeda'
        : `Templado agradable (${season}) ideal para caminatas y cafés`;
    weatherSummary = `En ${season} (${daysCount}d), Buenos Aires presenta temperaturas de ${temperatureRange}, ideal para recorrer sus avenidas, parques y barrios gastronómicos.`;
    clothingTip =
      season === 'Verano'
        ? 'Usa ropa fresca y liviana para el día, calzado cómodo para largas caminatas urbanas y una prenda ligera por el aire acondicionado en teatros y restaurantes.'
        : season === 'Invierno'
        ? 'Lleva abrigo urbano, bufanda para la brisa húmeda del Río de la Plata y calzado cerrado cómodo.'
        : 'Vístete con estilo urbano casual en capas: camisa o polera liviana con chaqueta ligera para la noche en Palermo o San Telmo.';
    clothingItems = [
      '👟 Calzado urbano cómodo',
      '🧥 Chaqueta o abrigo según horario',
      '🕶️ Lentes de sol para parques y costanera',
      '☂️ Paraguas pequeño de bolsillo',
    ];
  } else {
    // Fallback general según estación real del hemisferio
    if (season === 'Invierno') {
      temperatureRange = isNorth ? '0°C – 9°C' : '5°C – 14°C';
      weatherCondition = `Frío invernal (${season} en Hemisferio ${isNorth ? 'Norte' : 'Sur'})`;
      weatherSummary = `Durante tus fechas seleccionadas es ${season} en ${destination} (${daysCount}d), con temperaturas frías (${temperatureRange}).`;
      const c = buildClothingForTemperature(isNorth ? 0 : 5, isNorth ? 9 : 14, false, true, false);
      clothingTip = c.clothingTip;
      clothingItems = c.clothingItems;
    } else if (season === 'Verano') {
      temperatureRange = '18°C – 29°C';
      weatherCondition = `Cálido y soleado (${season} en Hemisferio ${isNorth ? 'Norte' : 'Sur'})`;
      weatherSummary = `Durante tus fechas seleccionadas es ${season} en ${destination} (${daysCount}d), con días cálidos (${temperatureRange}).`;
      const c = buildClothingForTemperature(18, 29, false, false, false);
      clothingTip = c.clothingTip;
      clothingItems = c.clothingItems;
    } else {
      temperatureRange = isNorth ? '7°C – 16°C' : '10°C – 20°C';
      weatherCondition = `Fresco a templado de media estación (${season} en Hemisferio ${isNorth ? 'Norte' : 'Sur'})`;
      weatherSummary = `Durante tus fechas seleccionadas es ${season} en ${destination} (${daysCount}d), con temperaturas entre ${temperatureRange}.`;
      const c = buildClothingForTemperature(isNorth ? 7 : 10, isNorth ? 16 : 20, false, true, false);
      clothingTip = c.clothingTip;
      clothingItems = c.clothingItems;
    }
  }

  return {
    season,
    seasonIcon: selectedSeasonObj.icon,
    currentSeason: currentSeasonObj.season,
    currentSeasonIcon: currentSeasonObj.icon,
    hemisphere: isNorth ? 'Norte' : 'Sur',
    temperatureRange,
    weatherCondition,
    weatherSummary,
    clothingTip,
    clothingItems,
    daysCount,
    weatherSource: 'climate-model',
  };
}

interface GeoCoords {
  latitude: number;
  longitude: number;
  resolvedName: string;
}

const KNOWN_COORDINATES: Array<{ keywords: string[]; coords: GeoCoords }> = [
  { keywords: ['polo sur', 'south pole'], coords: { latitude: -90.0, longitude: 0.0, resolvedName: 'Polo Sur (Antártida)' } },
  { keywords: ['antartica', 'antartida', 'antarctica'], coords: { latitude: -62.2, longitude: -58.96, resolvedName: 'Antártica' } },
  { keywords: ['polo norte', 'north pole', 'artico', 'arctic'], coords: { latitude: 78.2232, longitude: 15.6267, resolvedName: 'Ártico (Svalbard)' } },
  { keywords: ['groenlandia', 'greenland', 'nuuk'], coords: { latitude: 64.1835, longitude: -51.7216, resolvedName: 'Nuuk, Groenlandia' } },
  { keywords: ['siberia', 'yakutsk'], coords: { latitude: 62.0355, longitude: 129.6755, resolvedName: 'Siberia, Rusia' } },
  { keywords: ['rusia', 'russia', 'moscu', 'moscow'], coords: { latitude: 55.7558, longitude: 37.6173, resolvedName: 'Moscú, Rusia' } },
  { keywords: ['san petersburgo'], coords: { latitude: 59.9343, longitude: 30.3351, resolvedName: 'San Petersburgo, Rusia' } },
  { keywords: ['tromso'], coords: { latitude: 69.6492, longitude: 18.9553, resolvedName: 'Tromsø, Noruega' } },
  { keywords: ['noruega', 'norway', 'oslo'], coords: { latitude: 59.9139, longitude: 10.7522, resolvedName: 'Oslo, Noruega' } },
  { keywords: ['bergen'], coords: { latitude: 60.3913, longitude: 5.3221, resolvedName: 'Bergen, Noruega' } },
  { keywords: ['islandia', 'iceland', 'reykjavik', 'reikiavik'], coords: { latitude: 64.1466, longitude: -21.9426, resolvedName: 'Reikiavik, Islandia' } },
  { keywords: ['finlandia', 'finland', 'helsinki'], coords: { latitude: 60.1699, longitude: 24.9384, resolvedName: 'Helsinki, Finlandia' } },
  { keywords: ['laponia', 'rovaniemi'], coords: { latitude: 66.5039, longitude: 25.7294, resolvedName: 'Rovaniemi (Laponia), Finlandia' } },
  { keywords: ['suecia', 'sweden', 'estocolmo', 'stockholm'], coords: { latitude: 59.3293, longitude: 18.0686, resolvedName: 'Estocolmo, Suecia' } },
  { keywords: ['alaska', 'anchorage'], coords: { latitude: 61.2181, longitude: -149.9003, resolvedName: 'Anchorage, Alaska' } },
  { keywords: ['torres del paine', 'puerto natales'], coords: { latitude: -51.2532, longitude: -72.3452, resolvedName: 'Torres del Paine, Chile' } },
  { keywords: ['punta arenas'], coords: { latitude: -53.1638, longitude: -70.9171, resolvedName: 'Punta Arenas, Chile' } },
  { keywords: ['ushuaia', 'tierra del fuego'], coords: { latitude: -54.8019, longitude: -68.303, resolvedName: 'Ushuaia, Tierra del Fuego' } },
  { keywords: ['san pedro de atacama', 'atacama'], coords: { latitude: -22.9087, longitude: -68.1997, resolvedName: 'San Pedro de Atacama, Chile' } },
  { keywords: ['pucon', 'villarrica'], coords: { latitude: -39.2822, longitude: -71.9543, resolvedName: 'Pucón, Chile' } },
  { keywords: ['chiloe', 'castro'], coords: { latitude: -42.4721, longitude: -73.7732, resolvedName: 'Chiloé (Castro), Chile' } },
  { keywords: ['valparaiso', 'vina del mar'], coords: { latitude: -33.0472, longitude: -71.6127, resolvedName: 'Valparaíso, Chile' } },
  { keywords: ['santiago'], coords: { latitude: -33.4489, longitude: -70.6693, resolvedName: 'Santiago, Chile' } },
];

async function fetchJsonWithTimeout(url: string, timeoutMs = 4500): Promise<any> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(id);
  }
}

async function resolveCoordinates(destination: string): Promise<GeoCoords | null> {
  const norm = normalizeText(destination);
  for (const entry of KNOWN_COORDINATES) {
    if (entry.keywords.some((kw) => norm.includes(kw))) {
      return entry.coords;
    }
  }

  const cleanQuery = destination.split(',')[0].replace(/\([^)]*\)/g, '').trim() || destination.trim();
  const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cleanQuery)}&count=1&language=es&format=json`;
  const geoData = await fetchJsonWithTimeout(geoUrl, 4000);
  const first = geoData?.results?.[0];
  if (first && typeof first.latitude === 'number' && typeof first.longitude === 'number') {
    return {
      latitude: first.latitude,
      longitude: first.longitude,
      resolvedName: first.country ? `${first.name}, ${first.country}` : first.name,
    };
  }
  return null;
}

/**
 * Consulta en vivo el clima real del destino (Open-Meteo Geocoding + Forecast/Archive API)
 * y combina los datos meteorológicos con el modelo de vestimenta inteligente.
 */
export async function fetchWeatherAndClothingForTrip(
  destination: string,
  startDate: string,
  endDate: string
): Promise<WeatherAndClothingInfo> {
  const baseInfo = getWeatherAndClothingForTrip(destination, startDate, endDate);

  try {
    const coords = await resolveCoordinates(destination);
    if (!coords) {
      return baseInfo;
    }

    const isNorth = coords.latitude >= 0;
    const startD = parseDateSafe(startDate);
    const endD = parseDateSafe(endDate);
    const diffMs = Math.abs(endD.getTime() - startD.getTime());
    const daysCount = Math.min(Math.max(Math.ceil(diffMs / (1000 * 60 * 60 * 24)) + 1, 1), 14);

    const selectedSeasonObj = getSeasonForDate(startD, isNorth);
    const currentSeasonObj = getSeasonForDate(new Date(), isNorth);

    const now = new Date();
    const daysFromNow = Math.ceil((startD.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    let dailyData: any = null;

    if (daysFromNow >= -1 && daysFromNow <= 14) {
      const fStart = startDate;
      const fEnd = endDate >= startDate ? endDate : startDate;
      const forecastUrl = `https://api.open-meteo.com/v1/forecast?latitude=${coords.latitude}&longitude=${coords.longitude}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,snowfall_sum,wind_speed_10m_max&timezone=auto&start_date=${fStart}&end_date=${fEnd}`;
      const fRes = await fetchJsonWithTimeout(forecastUrl, 4500);
      if (fRes?.daily?.temperature_2m_max?.length > 0) {
        dailyData = fRes.daily;
      }
    }

    if (!dailyData) {
      // Consultar el histórico real de las mismas fechas en el último año disponible para reflejar la estación exacta
      const refYear = now.getFullYear() - 1;
      const startMonthDay = startDate.slice(5) || '10-26';
      const endMonthDay = (endDate >= startDate ? endDate : startDate).slice(5) || startMonthDay;
      const histStart = `${refYear}-${startMonthDay}`;
      const histEnd = `${refYear}-${endMonthDay}`;
      const archiveUrl = `https://archive-api.open-meteo.com/v1/archive?latitude=${coords.latitude}&longitude=${coords.longitude}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,snowfall_sum,wind_speed_10m_max&timezone=auto&start_date=${histStart}&end_date=${histEnd}`;
      const archRes = await fetchJsonWithTimeout(archiveUrl, 4500);
      if (archRes?.daily?.temperature_2m_max?.length > 0) {
        dailyData = archRes.daily;
      }
    }

    if (!dailyData) {
      const fallbackForecastUrl = `https://api.open-meteo.com/v1/forecast?latitude=${coords.latitude}&longitude=${coords.longitude}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,snowfall_sum,wind_speed_10m_max&timezone=auto&forecast_days=5`;
      const fbRes = await fetchJsonWithTimeout(fallbackForecastUrl, 4500);
      if (fbRes?.daily?.temperature_2m_max?.length > 0) {
        dailyData = fbRes.daily;
      }
    }

    if (!dailyData) {
      return {
        ...baseInfo,
        season: selectedSeasonObj.season,
        seasonIcon: selectedSeasonObj.icon,
        currentSeason: currentSeasonObj.season,
        currentSeasonIcon: currentSeasonObj.icon,
        hemisphere: isNorth ? 'Norte' : 'Sur',
      };
    }

    const mins: number[] = (dailyData.temperature_2m_min || []).filter((n: any) => typeof n === 'number');
    const maxs: number[] = (dailyData.temperature_2m_max || []).filter((n: any) => typeof n === 'number');
    const precip: number[] = (dailyData.precipitation_sum || []).filter((n: any) => typeof n === 'number');
    const snow: number[] = (dailyData.snowfall_sum || []).filter((n: any) => typeof n === 'number');
    const winds: number[] = (dailyData.wind_speed_10m_max || []).filter((n: any) => typeof n === 'number');

    if (mins.length === 0 || maxs.length === 0) {
      return baseInfo;
    }

    const minTemp = Math.round(mins.reduce((a, b) => a + b, 0) / mins.length);
    const maxTemp = Math.round(maxs.reduce((a, b) => a + b, 0) / maxs.length);
    const totalSnow = snow.reduce((a, b) => a + b, 0);
    const totalRain = precip.reduce((a, b) => a + b, 0);
    const maxWind = winds.length > 0 ? Math.max(...winds) : 0;

    const hasSnow = totalSnow > 0.2 || maxTemp <= -2;
    const hasRain = totalRain > 2.5;
    const isWindy = maxWind >= 35;

    const temperatureRange = `${minTemp}°C – ${maxTemp}°C`;
    const season = selectedSeasonObj.season;

    let weatherCondition = '';
    if (maxTemp <= -10) {
      weatherCondition = 'Frío polar extremo bajo cero con hielo y nieve';
    } else if (maxTemp <= 4 || hasSnow) {
      weatherCondition = `Frío intenso (${season}) con heladas${hasSnow ? ' y probables nevadas' : ''}`;
    } else if (maxTemp <= 13) {
      weatherCondition = `Clima frío a fresco (${season})${hasRain ? ' con lluvias probables' : ''}${isWindy ? ' y viento' : ''}`;
    } else if (maxTemp <= 23) {
      weatherCondition = `Clima templado (${season})${hasRain ? ' con chubascos ocasionales' : ' y cielos variables'}`;
    } else {
      weatherCondition = `Clima cálido (${season})${hasRain ? ' con lluvias cálidas pasajeras' : ' y días soleados'}`;
    }

    const weatherSummary = `Pronóstico meteorológico consultado para ${coords.resolvedName} en ${season} (Hemisferio ${
      isNorth ? 'Norte' : 'Sur'
    }, ${daysCount} día${daysCount > 1 ? 's' : ''}): temperaturas estimadas entre ${minTemp}°C y ${maxTemp}°C (${weatherCondition.toLowerCase()}).`;

    const clothing = buildClothingForTemperature(minTemp, maxTemp, hasSnow, hasRain, isWindy);

    return {
      season,
      seasonIcon: selectedSeasonObj.icon,
      currentSeason: currentSeasonObj.season,
      currentSeasonIcon: currentSeasonObj.icon,
      hemisphere: isNorth ? 'Norte' : 'Sur',
      temperatureRange,
      weatherCondition,
      weatherSummary,
      clothingTip: clothing.clothingTip,
      clothingItems: clothing.clothingItems,
      daysCount,
      weatherSource: 'open-meteo',
    };
  } catch {
    return baseInfo;
  }
}

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

export function isNorthernHemisphere(destination: string): boolean {
  const norm = normalizeText(destination);
  const northKeywords = [
    'tokio', 'tokyo', 'japon', 'japan', 'kioto', 'kyoto', 'osaka',
    'roma', 'rome', 'italia', 'italy', 'milan', 'florencia', 'venecia',
    'madrid', 'barcelona', 'espana', 'spain', 'sevilla',
    'paris', 'francia', 'france', 'londres', 'london', 'uk', 'inglaterra',
    'berlin', 'alemania', 'amsterdam', 'lisboa', 'portugal', 'atenas', 'grecia',
    'nueva york', 'new york', 'miami', 'orlando', 'los angeles', 'san francisco', 'eeuu', 'usa',
    'mexico', 'cdmx', 'cancun', 'tulum', 'bogota', 'cartagena', 'medellin',
    'seul', 'corea', 'bangkok', 'tailandia', 'china', 'beijing', 'dubai', 'egipto', 'cairo', 'canada',
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

  let temperatureRange = '14°C – 23°C';
  let weatherCondition = 'Templado agradable y cielos parcialmente despejados';
  let weatherSummary = `Durante tus ${daysCount} día${daysCount > 1 ? 's' : ''} en ${season.toLowerCase()}, se espera un clima templado con mañanas frescas y tardes agradables para recorrer a pie.`;
  let clothingTip =
    'Vístete por capas ("estilo cebolla"): lleva prendas ligeras y transpirables para el día, una chaqueta o cortavientos para la tarde/noche y calzado cómodo para caminar.';
  let clothingItems = [
    '👟 Calzado cómodo para caminar',
    '🧥 Chaqueta ligera o cortavientos',
    '🕶️ Lentes de sol y protector solar',
    '👕 Ropa en capas (día / noche)',
  ];

  if (norm.includes('atacama') || norm.includes('san pedro') || norm.includes('calama')) {
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
    norm.includes('coyhaique')
  ) {
    if (season === 'Verano') {
      temperatureRange = '6°C – 17°C';
      weatherCondition = 'Clima austral cambiante con vientos patagónicos y largos días de luz';
      weatherSummary = `En ${season} (${daysCount}d), tendrás hasta 17 horas de luz solar, temperaturas de 6°C a 17°C y ráfagas de viento patagónico ("las 4 estaciones en un solo día").`;
      clothingTip =
        'Aplica regla técnica de 3 capas: 1ª capa sintética/merino (nunca algodón), 2ª capa polar térmico y 3ª capa chaqueta impermeable/cortavientos Gore-Tex, con botas de trekking con soporte de tobillo.';
      clothingItems = [
        '🧥 Chaqueta impermeable y cortavientos',
        '🥾 Botas de trekking impermeables',
        '🧤 Gorro, cuello polar y guantes',
        '👖 Pantalón de trekking secado rápido',
      ];
    } else if (season === 'Invierno') {
      temperatureRange = '-4°C – 5°C';
      weatherCondition = 'Frío austral con paisajes nevados y poco viento';
      weatherSummary = `En ${season} (${daysCount}d), la Patagonia ofrece montañas nevadas, vientos calmos y temperaturas bajas (-4°C a 5°C).`;
      clothingTip =
        'Debes llevar equipamiento invernal completo: primera capa térmica superior e inferior, parka de pluma, tercera capa impermeable, calzado térmico con tracción y guantes impermeables.';
      clothingItems = [
        '❄️ Primera capa térmica completa',
        '🧥 Parka de pluma + capa impermeable',
        '🥾 Calzado invernal impermeable',
        '🧤 Guantes térmicos y gorro de lana',
      ];
    } else {
      temperatureRange = '2°C – 13°C';
      weatherCondition = 'Fresco patagónico con brisa austral y cielos dramáticos';
      weatherSummary = `En ${season} (${daysCount}d), las temperaturas oscilan entre 2°C y 13°C con colores intensos en los bosques de lenga y menor afluencia en los senderos.`;
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
  } else if (norm.includes('cusco') || norm.includes('peru') || norm.includes('machu')) {
    const month = startD.getMonth() + 1;
    const isDrySeason = month >= 5 && month <= 9;
    temperatureRange = isDrySeason ? '2°C – 20°C' : '7°C – 19°C';
    weatherCondition = isDrySeason
      ? 'Temporada seca andina: días muy soleados y noches frías en altura'
      : 'Temporada verde andina: mañanas templadas con lluvias pasajeras de tarde';
    weatherSummary = `En ${season} (${daysCount}d) a 3.399 msnm, Cusco presenta días templados al sol (${temperatureRange}) pero se enfría rápidamente en la sombra y al anochecer.`;
    clothingTip =
      'Vístete por capas para la altura andina: camiseta respirable, polar abrigado, cortavientos o poncho impermeable, gorro para el sol y zapatillas de trekking con buen agarre para las calles empedradas incas.';
    clothingItems = [
      '🥾 Zapatillas de trekking antideslizantes',
      '🧥 Polar térmico + poncho/impermeable',
      '👒 Sombrero solar y bloqueador FPS 50+',
      '🍵 Hidratación constante para la altura',
    ];
  } else if (norm.includes('tokio') || norm.includes('tokyo') || norm.includes('japon') || norm.includes('japan')) {
    if (season === 'Verano') {
      temperatureRange = '23°C – 32°C';
      weatherCondition = 'Cálido y húmedo (Verano en Hemisferio Norte)';
      weatherSummary = `En tus fechas seleccionadas es ${season} en Japón (${daysCount}d), con clima cálido y húmedo (${temperatureRange}).`;
      clothingTip =
        'Lleva ropa ultraligera y transpirable, paraguas plegable para lluvias de verano y calzado muy cómodo y fácil de quitar al entrar a templos tradicionales.';
      clothingItems = [
        '👕 Ropa ultraligera y transpirable',
        '👟 Zapatillas cómodas fáciles de calzar',
        '☂️ Paraguas plegable / abanico',
        '🧦 Calcetines limpios para entrar a templos',
      ];
    } else if (season === 'Invierno') {
      temperatureRange = '2°C – 11°C';
      weatherCondition = 'Frío seco y cielos despejados (Invierno en Hemisferio Norte)';
      weatherSummary = `En tus fechas seleccionadas es ${season} en Japón (${daysCount}d), con días despejados pero fríos (${temperatureRange}).`;
      clothingTip =
        'Usa abrigo largo o parka térmica sobre capas livianas (los trenes y tiendas en Tokio tienen calefacción alta) y calzado cómodo para caminar más de 15.000 pasos diarios.';
      clothingItems = [
        '🧥 Abrigo térmico o parka ligera',
        '🧣 Bufanda, guantes y camiseta térmica',
        '👟 Zapatillas urbanas de alto confort',
        '🧦 Calcetines cómodos para templos',
      ];
    } else {
      temperatureRange = '12°C – 22°C';
      weatherCondition = `Templado ideal y despejado (${season} en Hemisferio Norte)`;
      weatherSummary = `En tus fechas seleccionadas es ${season} en Japón (${daysCount}d), la mejor época climática (${temperatureRange}) con parques floridos o follaje otoñal.`;
      clothingTip =
        'Lleva ropa urbana en capas (camiseta + cárdigan o chaqueta ligera) y tus zapatillas más cómodas para largas caminatas y estaciones de metro.';
      clothingItems = [
        '👟 Zapatillas urbanas amortiguadas',
        '🧥 Chaqueta ligera o trench coat',
        '🧦 Calcetines sin costuras para templos',
        '🎒 Mochila liviana de día',
      ];
    }
  } else if (norm.includes('roma') || norm.includes('italia') || norm.includes('madrid') || norm.includes('paris')) {
    if (season === 'Verano') {
      temperatureRange = '21°C – 33°C';
      weatherCondition = 'Caluroso y soleado mediterráneo (Verano en Hemisferio Norte)';
      weatherSummary = `Durante tus fechas es ${season} europeo (${daysCount}d), con días largos y soleados (${temperatureRange}).`;
      clothingTip =
        'Ropa fresca de lino o algodón, sombrero y gafas de sol. Recuerda llevar una prenda que cubra hombros y rodillas para ingresar al Vaticano y basílicas históricas.';
      clothingItems = [
        '👕 Ropa fresca de lino o algodón',
        '🧣 Pañuelo para cubrir hombros en iglesias',
        '👟 Calzado cómodo para adoquines (sampietrini)',
        '🕶️ Lentes de sol y botella para fuentes de agua',
      ];
    } else if (season === 'Invierno') {
      temperatureRange = '4°C – 13°C';
      weatherCondition = 'Fresco mediterráneo (Invierno en Hemisferio Norte)';
      weatherSummary = `Durante tus fechas es ${season} europeo (${daysCount}d), con clima fresco (${temperatureRange}) y menos filas en los monumentos.`;
      clothingTip =
        'Lleva abrigo impermeable o chaqueta acolchada, bufanda, sweater y zapatos cerrados con buena suela para caminar sobre adoquines antiguos.';
      clothingItems = [
        '🧥 Abrigo o chaqueta impermeable',
        '🧣 Bufanda y sweater abrigado',
        '👟 Calzado cerrado para adoquines',
        '☂️ Paraguas plegable compacto',
      ];
    } else {
      temperatureRange = '12°C – 23°C';
      weatherCondition = `Templado soleado mediterráneo (${season} en Hemisferio Norte)`;
      weatherSummary = `Durante tus fechas es ${season} en Europa (${daysCount}d), con temperaturas muy agradables (${temperatureRange}) para terrazas y paseos históricos.`;
      clothingTip =
        'Combina prendas de media estación con una chaqueta liviana para la noche, calzado plano para los adoquines romanos y ropa que cubra hombros para entrar a basílicas.';
      clothingItems = [
        '👟 Zapatillas cómodas para adoquines',
        '🧥 Chaqueta liviana de media estación',
        '🧣 Pañuelo ligero (acceso a basílicas)',
        '🕶️ Lentes de sol',
      ];
    }
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
  };
}

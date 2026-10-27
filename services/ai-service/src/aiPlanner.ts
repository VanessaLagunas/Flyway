import path from 'node:path';
import dotenv from 'dotenv';
import { Trip, Activity, BudgetLevel, SourceEngine } from './types';
import { generateSmartTrip, inferDestinationMetadata } from './utils/tripGenerator';
import { ensureTripHasPexelsPhotos, isValidHttpUrl } from './utils/photoUtils';
import {
  getWeatherAndClothingForTrip,
  fetchWeatherAndClothingForTrip,
  WeatherAndClothingInfo,
  getBudgetTierInfo,
} from './utils/weatherUtils';
import { DESTINATIONS_CATALOG, DestinationInfo } from './data/destinationsData';

dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export interface PlanRouteInput {
  destination: string;
  startDate: string; // e.g. "2026-10-15"
  endDate: string;   // e.g. "2026-10-17"
  budget: BudgetLevel;
  interests: string[];
}

export const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
export const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
export const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-6-luna';
export const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'openrouter/free';
export const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash';

/**
 * Retorna el tiempo de espera (timeout en ms) para la llamada a OpenAI.
 * Si OPENAI_TIMEOUT_MS está configurado en el entorno (> 0), se utiliza dicho valor.
 * Por defecto, modelos avanzados o con capacidades profundas de razonamiento como "gpt-6-luna",
 * "gpt-5", "o1", "o3" disponen de 180000 ms (3 minutos) para permitir la generación
 * exhaustiva de itinerarios de hasta 7 días en formato JSON.
 * Los modelos clásicos (gpt-3.5, gpt-4, gpt-4o-mini) utilizan 60000 ms (60 segundos).
 */
export function getOpenAiTimeoutMs(model: string = 'gpt-6-luna'): number {
  const envVal = Number(process.env.OPENAI_TIMEOUT_MS);
  if (Number.isFinite(envVal) && envVal > 0) {
    return envVal;
  }
  const isClassic = /^gpt-(3\.5|4)/i.test(model);
  return isClassic ? 60000 : 180000;
}

export function getGeminiTimeoutMs(): number {
  const envVal = Number(process.env.GEMINI_TIMEOUT_MS);
  return Number.isFinite(envVal) && envVal > 0 ? envVal : 60000;
}

export function getOpenRouterTimeoutMs(): number {
  const envVal = Number(process.env.OPENROUTER_TIMEOUT_MS);
  return Number.isFinite(envVal) && envVal > 0 ? envVal : 45000;
}

/**
 * Checks whether the destination is in Chile
 */
export function isChileanLocation(destination: string): boolean {
  const norm = destination.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const chileanKeywords = [
    'chile', 'santiago', 'valparaiso', 'valpo', 'vina del mar', 'atacama',
    'san pedro', 'pucon', 'villarrica', 'torres del paine', 'chiloe', 'castro',
    'ancud', 'la serena', 'coquimbo', 'iquique', 'antofagasta', 'valdivia',
    'puerto varas', 'puerto montt', 'frutillar', 'cochamo', 'aysen', 'patagonia',
    'punta arenas', 'carretera austral', 'pichilemu', 'zapallar', 'maitencillo',
    'rapanui', 'rapa nui', 'isla de pascua', 'calama', 'arica', 'rancagua',
    'talca', 'chillan', 'concepcion', 'temuco', 'osorno', 'huilo huilo',
    'curico', 'elqui', 'valle del elqui', 'coyhaique', 'natales', 'puerto natales'
  ];
  return chileanKeywords.some((kw) => norm.includes(kw));
}

/**
 * Calculates number of days between two ISO date strings (clamped 1..7)
 */
function getDaysCount(startDate: string, endDate: string): number {
  try {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return Math.min(Math.max(diffDays || 2, 1), 7);
  } catch {
    return 2;
  }
}

/**
 * Format a date nicely in Spanish (e.g. "15 de Octubre")
 */
function formatDateSpanish(isoDate: string, dayOffset = 0): string {
  try {
    const d = new Date(isoDate);
    d.setDate(d.getDate() + dayOffset);
    const months = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    return `${d.getDate()} de ${months[d.getMonth()]}`;
  } catch {
    return `Día ${dayOffset + 1}`;
  }
}

/**
 * Derives a clean official place name from rawPlaceName or by stripping generic action prefixes from title.
 */
export function deriveCleanPlaceName(
  rawPlaceName: unknown,
  title: string,
  fallbackDestination?: string
): string {
  if (typeof rawPlaceName === 'string' && rawPlaceName.trim().length > 0) {
    return rawPlaceName.trim();
  }

  let cleaned = String(title || '').trim();
  const exactPrefixRegex =
    /^(almuerzo|cena|desayuno|once|brunch|visita|recorrido|paseo|tour|mañana|tarde|noche|exploración|sendero|trekking)\s+(en|por|a|al|de|del|hacia)\s+/i;
  const extendedPrefixRegex =
    /^(?:almuerzo|cena|desayuno|once|brunch|visita|recorrido|paseo|tour|mañana|manana|tarde|noche|exploración|exploracion|sendero|trekking|caminata|degustación|degustacion|parada)(?:\s+(?:de\s+autor|marino|marina|típico|típica|tipico|tipica|tradicional|criollo|criolla|campestre|guiado|guiada|matutino|matutina|nocturno|nocturna|panorámico|panorámica|cultural|gastronómico|gastronómica|patrimonial|peatonal|local))?\s+(?:en|por|a|al|de|del|hacia)\s+/i;

  cleaned = cleaned.replace(exactPrefixRegex, '').replace(extendedPrefixRegex, '').trim();

  if (cleaned.length > 0) {
    return cleaned;
  }
  return String(title || fallbackDestination || 'Lugar destacado').trim();
}

/**
 * Validates WGS84 coordinates, rejecting non-finite numbers, out-of-bounds values, and (0, 0).
 */
export function normalizeCoordinates(rawCoords: any): { lat: number; lng: number } | undefined {
  if (!rawCoords || typeof rawCoords !== 'object') return undefined;
  const rawLat = rawCoords.lat ?? rawCoords.latitude;
  const rawLng = rawCoords.lng ?? rawCoords.lon ?? rawCoords.longitude;
  if (
    rawLat === undefined ||
    rawLat === null ||
    rawLat === '' ||
    typeof rawLat === 'boolean' ||
    rawLng === undefined ||
    rawLng === null ||
    rawLng === '' ||
    typeof rawLng === 'boolean'
  ) {
    return undefined;
  }
  const lat = Number(rawLat);
  const lng = Number(rawLng);
  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    lat < -90 ||
    lat > 90 ||
    lng < -180 ||
    lng > 180 ||
    (lat === 0 && lng === 0)
  ) {
    return undefined;
  }
  return { lat, lng };
}

/**
 * Builds an exact Google Maps query string when missing.
 */
function buildActivityMapQuery(
  rawMapQuery: unknown,
  placeName: string,
  addressOrSector: string | undefined,
  cleanDestination: string,
  resolvedCountry: string
): string {
  if (typeof rawMapQuery === 'string' && rawMapQuery.trim().length > 0) {
    return rawMapQuery.trim();
  }
  const countrySuffix =
    resolvedCountry && resolvedCountry.trim() && resolvedCountry.trim().toLowerCase() !== 'internacional'
      ? `, ${resolvedCountry.trim()}`
      : '';
  return `${placeName}, ${addressOrSector ? `${addressOrSector}, ` : ''}${cleanDestination}${countrySuffix}`;
}

/**
 * Builds the AI prompt requesting the Unified Output Contract in CLP
 * including destination-accurate weather & clothing guidance and strict venue specificity.
 */
export function buildPrompt(
  input: PlanRouteInput,
  daysCount: number,
  isChile: boolean,
  weatherHint: WeatherAndClothingInfo
): string {
  const budgetLabels: Record<BudgetLevel, string> = {
    budget: 'Económico (mochilero / bajo costo, transporte público, picadas locales con nombre propio)',
    standard: 'Presupuesto Medio (restaurantes locales reconocidos, museos y parques emblemáticos)',
    premium: 'Premium (gastronomía de autor reconocida, hoteles boutique, reservas y experiencias exclusivas)',
  };

  const interestsText = input.interests.length > 0
    ? input.interests.join(', ')
    : 'cultura, gastronomía, naturaleza';

  return `Actúa como un guía local experto en planificación turística georreferenciada y meteorología de viajes para ${input.destination} (${isChile ? 'Chile 🇨🇱' : 'Destino Internacional'}).
Genera un itinerario estructurado en JSON para ${daysCount} días (${input.startDate} a ${input.endDate}) con todos los costos expresados en pesos chilenos (CLP).
- Presupuesto: ${budgetLabels[input.budget]}
- Intereses: ${interestsText}
- Referencia climática real para estas fechas en ${input.destination} (Hemisferio ${weatherHint.hemisphere}, estación ${weatherHint.season}): ${weatherHint.temperatureRange}, ${weatherHint.weatherCondition}.

REGLAS ESENCIALES:
1. Responde ÚNICAMENTE con un objeto JSON válido, sin texto fuera del JSON.
2. Incluye en la raíz del JSON la metadata del destino para persistencia en catálogo PostgreSQL:
   - "destination": nombre limpio del destino (ej. "Pucón" o "Oslo, Noruega")
   - "country": país real del destino (ej. "Chile", "Noruega", "Perú")
   - "region": región o estado correspondiente
   - "commune": comuna, ciudad o sector principal
   - "avgDailyCostCLP": número entero con el costo diario promedio por persona en CLP
   - "tags": array de strings con etiquetas temáticas en minúsculas
   - "description": resumen descriptivo de 2 a 3 líneas sobre el destino
   - "currency": "CLP"
   - "totalEstimatedCostCLP": suma total estimada del viaje en CLP
3. Incluye datos precisos de clima y vestimenta para ${input.destination} en las fechas ${input.startDate} a ${input.endDate}:
   - "season": "${weatherHint.season}"
   - "weatherCondition": condición climática coherente con la latitud y estación real
   - "temperatureRange": "${weatherHint.temperatureRange}"
   - "weatherSummary": explicación clara del clima durante el viaje
   - "clothingTip": recomendación detallada de cómo vestir acorde al frío/calor real del lugar
   - "clothingItems": array de 4 prendas clave con emoji
4. Cada día en "days" DEBE ser una jornada completa con entre 3 y 4 panoramas o paradas distribuidas cronológicamente (mañana cultural/patrimonio, almuerzo gastronómico típico, tarde paisajística/mirador/aventura y noche/cena), intercalando traslados ("type": "transfer"). ¡NUNCA generes una sola parada o actividad por día!
5. El array "days" DEBE contener exactamente ${daysCount} objetos de día (uno por cada jornada, desde "dayNumber": 1 hasta "dayNumber": ${daysCount}). Si el viaje es de ${daysCount} días, incluye ${daysCount} días completos en el array "days".
6. ESPECIFICIDAD GEOGRÁFICA REAL Y PROHIBICIÓN ESTRICTA DE LUGARES GENÉRICOS:
   - El 100% de las paradas/actividades ("items" de "type": "activity") DEBEN corresponder a establecimientos, parques e hitos REALES, VERIFICABLES y EXISTENTES con nombre propio oficial dentro de "${input.destination}" (restaurantes reales con nombre, cafeterías de especialidad, picadas tradicionales reales, mercados municipales específicos, parques nacionales o urbanos, museos, plazas históricas, miradores reales con nombre, playas o senderos específicos).
   - QUEDA ESTRICTAMENTE PROHIBIDO usar títulos o nombres genéricos, vagos o inventados sin establecimiento real (tales como "Restaurante local", "Paseo libre por el centro", "Almuerzo en mercado local", "Mirador panorámico y tarde cultural", "Hito patrimonial del casco antiguo", "Cena típica de cierre" o cualquier relleno ambiguo).
   - Cada "title" DEBE incluir el nombre propio real del restaurante, parque, museo o hito (ej.: "Almuerzo marino en Mercado Fluvial y Cocinería Río Sur", "Sendero Los Lagos en Parque Nacional Huerquehue" o "Cena de autor en Restaurante La Olla").
   - Cada "description" DEBE detallar elementos concretos de ese recinto real (plato estrella recomendado para pedir, sendero/sala/mirador específico, atmósfera real y por qué los locales lo recomiendan).
   - Cada actividad DEBE incluir obligatoriamente en su objeto JSON "data":
     * "placeName": SOLO el nombre propio oficial exacto del lugar (SIN prefijos como "Almuerzo en" ni "Visita a"), ej.: "Restaurante La Olla" o "Parque Urbano El Bosque". Se usa directamente para fijar el pin en Google Maps ("Ver en mapa") y buscar fotos reales.
     * "addressOrSector": calle/avenida + numeración o sector/barrio real dentro de "${input.destination}", ej.: "Pedro de Valdivia 115, Centro, Pucón".
     * "coordinates": { "lat": <number>, "lng": <number> } con latitud y longitud WGS84 reales y precisas de ese establecimiento o hito dentro de "${input.destination}".
     * "mapQuery": "<placeName>, <addressOrSector>, <destination>, <country>".

NOTA OBLIGATORIA SOBRE EL ESQUEMA DE EJEMPLO: Los nombres propios que aparecen abajo (Museo de Sitio Castillo de Niebla, Mercado Fluvial de Valdivia, Parque Urbano El Bosque, Cervecería Kunstmann) son ÚNICAMENTE ILUSTRATIVOS del nivel de especificidad exigido. Debes reemplazarlos al 100% por lugares, restaurantes, parques, direcciones y coordenadas REALES ubicados estrictamente en "${input.destination}".

ESTRUCTURA EXACTA REQUERIDA DEL JSON:
{
  "title": "Ruta por ${input.destination}",
  "destination": "${input.destination}",
  "country": "${isChile ? 'Chile' : 'País correspondiente'}",
  "region": "Región correspondiente",
  "commune": "Sector principal",
  "avgDailyCostCLP": 65000,
  "tags": ["cultura", "gastronomia", "naturaleza"],
  "description": "Resumen descriptivo de 2 a 3 líneas del lugar.",
  "currency": "CLP",
  "totalEstimatedCostCLP": 130000,
  "totalCost": 130000,
  "datesText": "${input.startDate} - ${input.endDate}",
  "startDate": "${input.startDate}",
  "endDate": "${input.endDate}",
  "budgetLevel": "${input.budget}",
  "budgetLabel": "Económico / Presupuesto Medio / Premium",
  "summary": "Resumen conciso del recorrido con hitos reales.",
  "season": "${weatherHint.season}",
  "weatherCondition": "${weatherHint.weatherCondition}",
  "temperatureRange": "${weatherHint.temperatureRange}",
  "weatherSummary": "${weatherHint.weatherSummary}",
  "clothingTip": "${weatherHint.clothingTip}",
  "clothingItems": ${JSON.stringify(weatherHint.clothingItems)},
  "whyThisRoute": "Por qué esta ruta con lugares reales se adapta a tus intereses y al clima de la fecha.",
  "savingTips": ["Consejo práctico real 1", "Consejo práctico real 2"],
  "days": [
    {
      "dayNumber": 1,
      "dateFormatted": "Día 1",
      "dailyCost": 65000,
      "dailyCostCLP": 65000,
      "title": "Día 1: Patrimonio Fluvial y Bosques en ${input.destination}",
      "summary": "Exploración de hitos reales georreferenciados en ${input.destination}.",
      "items": [
        {
          "type": "activity",
          "data": {
            "id": "act-1-1",
            "timeRange": "09:30 - 11:30",
            "startTime": "09:30",
            "endTime": "11:30",
            "title": "Visita a Museo de Sitio Castillo de Niebla",
            "placeName": "Museo de Sitio Castillo de Niebla",
            "addressOrSector": "Calle del Castillo s/n, Niebla, Valdivia",
            "coordinates": { "lat": -39.8692, "lng": -73.3968 },
            "mapQuery": "Museo de Sitio Castillo de Niebla, Calle del Castillo s/n, Niebla, Valdivia, Chile",
            "description": "Recorrido por las baterías defensivas españolas de piedra cancagua, casamatas y pasarelas sobre el estuario del río Valdivia.",
            "costText": "Gratis",
            "costAmount": 0,
            "category": "Cultura",
            "categoryIcon": "🏛️",
            "isFood": false,
            "whyIncluded": "Fortificación colonial auténtica con vista directa a la bahía de Corral.",
            "history": "Construido en 1671 como parte del sistema defensivo austral de la Corona española.",
            "historicalFacts": ["1671: Edificación del baluarte defensivo costero"],
            "curiosity": "Sus muros fueron labrados directamente en roca cancagua volcánica local.",
            "architectureOrHeritage": "Monumento Histórico Nacional de ingeniería militar colonial.",
            "savingTip": "Acceso gratuito de martes a domingo registrándose en portería."
          }
        },
        {
          "type": "transfer",
          "data": {
            "id": "tr-1-1",
            "text": "Micro costera Expreso a la Costa hacia Costanera Prat · 25 min",
            "icon": "🚌"
          }
        },
        {
          "type": "activity",
          "data": {
            "id": "act-1-2",
            "timeRange": "12:30 - 14:15",
            "startTime": "12:30",
            "endTime": "14:15",
            "title": "Almuerzo marino en Feria Fluvial y Mercado Municipal de Valdivia",
            "placeName": "Mercado Municipal de Valdivia",
            "addressOrSector": "Av. Ramón Picarte 210, Costanera Centro, Valdivia",
            "coordinates": { "lat": -39.8142, "lng": -73.2459 },
            "mapQuery": "Mercado Municipal de Valdivia, Av. Ramón Picarte 210, Costanera Centro, Valdivia, Chile",
            "description": "Degustación de paila marina, chupe de jaiba gratinado en greda y sierra ahumada en las cocinerías del segundo piso frente al río Calle-Calle.",
            "costText": "$15.000 CLP",
            "costAmount": 15000,
            "category": "Gastronomía",
            "categoryIcon": "🍽️",
            "isFood": true,
            "whyIncluded": "Epicentro gastronómico ribereño recomendado por pescadores locales.",
            "history": "Mercado histórico reconstruido con arcos y miradores tras el terremoto de 1960.",
            "historicalFacts": ["Monumento Nacional y eje comercial fluvial desde principios del siglo XX"],
            "curiosity": "Lobos marinos aguardan diariamente junto al muelle de los puestos pesqueros.",
            "architectureOrHeritage": "Edificio patrimonial de influencia centroeuropea frente a la ribera fluvial.",
            "savingTip": "Las cocinerías interiores ofrecen colación marina completa con pebre y pan amasado."
          }
        },
        {
          "type": "transfer",
          "data": {
            "id": "tr-1-2",
            "text": "Traslado hacia Isla Teja cruzando el Puente Pedro de Valdivia · 15 min",
            "icon": "🚶"
          }
        },
        {
          "type": "activity",
          "data": {
            "id": "act-1-3",
            "timeRange": "15:00 - 17:30",
            "startTime": "15:00",
            "endTime": "17:30",
            "title": "Sendero Selva Valdiviana en Jardín Botánico UACh",
            "placeName": "Jardín Botánico UACh",
            "addressOrSector": "Campus Isla Teja s/n, Isla Teja, Valdivia",
            "coordinates": { "lat": -39.8045, "lng": -73.2516 },
            "mapQuery": "Jardín Botánico UACh, Campus Isla Teja s/n, Isla Teja, Valdivia, Chile",
            "description": "Caminata entre más de 950 especies de bosque templado lluvioso, arrayanes, alerces y mirador hacia el río Cau-Cau.",
            "costText": "$3.000 CLP",
            "costAmount": 3000,
            "category": "Naturaleza & Paisaje",
            "categoryIcon": "🌿",
            "isFood": false,
            "whyIncluded": "Reserva botánica universitaria inmersa en bosque nativo dentro de la ciudad.",
            "history": "Fundado en 1957 por el rector Eduardo Morales Miranda en la Universidad Austral.",
            "historicalFacts": ["1957: Creación de las colecciones de flora endémica del sur de Chile"],
            "curiosity": "Conserva especies amenazadas del bosque laurifolio valdiviano.",
            "architectureOrHeritage": "Paisajismo científico integrado a humedales ribereños.",
            "savingTip": "Estudiantes y adultos mayores cuentan con tarifa rebajada en boletería."
          }
        },
        {
          "type": "transfer",
          "data": {
            "id": "tr-1-3",
            "text": "Traslado por Ruta T-350 hacia el sector Torobayo · 10 min",
            "icon": "🚌"
          }
        },
        {
          "type": "activity",
          "data": {
            "id": "act-1-4",
            "timeRange": "19:30 - 21:30",
            "startTime": "19:30",
            "endTime": "21:30",
            "title": "Cena cervecera y crudo alemán en La Cervecería Kunstmann",
            "placeName": "La Cervecería Kunstmann",
            "addressOrSector": "Ruta T-350 Km 3.5, Sector Torobayo, Valdivia",
            "coordinates": { "lat": -39.8322, "lng": -73.2681 },
            "mapQuery": "La Cervecería Kunstmann, Ruta T-350 Km 3.5, Sector Torobayo, Valdivia, Chile",
            "description": "Cierre de jornada pidiendo el tradicional crudo valdiviano, pernil crocante con chucrut y vuelo de degustación de cervezas artesanales sin filtrar.",
            "costText": "$22.000 CLP",
            "costAmount": 22000,
            "category": "Gastronomía",
            "categoryIcon": "🍺",
            "isFood": true,
            "whyIncluded": "Icono de la tradición cervecera germano-valdiviana con sala de cocimiento a la vista.",
            "history": "Nacida de la herencia cervecera iniciada por Carlos Anwandter en 1851.",
            "historicalFacts": ["1997: Apertura de la casa cervecera en Torobayo"],
            "curiosity": "Sus especialidades experimentales se elaboran con agua blanda de vertiente valdiviana.",
            "architectureOrHeritage": "Casona de maderas nativas y vigas a la vista estilo alpino-sureño.",
            "savingTip": "Reservar mesa online con anticipación evita esperas en horario de cena."
          }
        }
      ]
    }${daysCount > 1 ? `,\n    /* Continúa con los días 2 a ${daysCount} usando EXCLUSIVAMENTE lugares reales con nombre propio, dirección y coordenadas dentro de "${input.destination}" */` : ''}
  ]
}`;
}

/**
 * Repairs truncated JSON responses by closing open quotes and brackets
 */
function repairTruncatedJson(str: string): any {
  let trimmed = str.trim();
  const firstBrace = trimmed.indexOf('{');
  if (firstBrace === -1) return null;
  trimmed = trimmed.substring(firstBrace);

  try {
    return JSON.parse(trimmed);
  } catch {}

  let attempt = trimmed;
  for (let i = 0; i < 40; i++) {
    const quoteCount = (attempt.match(/(?<!\\)"/g) || []).length;
    let closedAttempt = attempt;
    if (quoteCount % 2 !== 0) {
      closedAttempt += '"';
    }

    const openBrackets: string[] = [];
    let inString = false;
    for (let c = 0; c < closedAttempt.length; c++) {
      const char = closedAttempt[c];
      if (char === '"' && (c === 0 || closedAttempt[c - 1] !== '\\')) {
        inString = !inString;
      } else if (!inString) {
        if (char === '{' || char === '[') openBrackets.push(char);
        else if (char === '}' && openBrackets[openBrackets.length - 1] === '{') openBrackets.pop();
        else if (char === ']' && openBrackets[openBrackets.length - 1] === '[') openBrackets.pop();
      }
    }

    let suffix = '';
    for (let j = openBrackets.length - 1; j >= 0; j--) {
      suffix += openBrackets[j] === '{' ? '}' : ']';
    }

    try {
      return JSON.parse(closedAttempt + suffix);
    } catch {}

    const lastSpecial = Math.max(attempt.lastIndexOf(','), attempt.lastIndexOf('{'), attempt.lastIndexOf('['));
    if (lastSpecial > 0) {
      attempt = attempt.substring(0, lastSpecial);
    } else {
      break;
    }
  }

  return null;
}

/**
 * Robust JSON extractor from LLM text responses
 */
export function extractJson(text: string): any {
  if (!text || typeof text !== 'string') {
    throw new Error('Respuesta de texto vacía o inválida');
  }
  const trimmed = text.trim();

  try {
    return JSON.parse(trimmed);
  } catch {}

  const jsonBlockMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (jsonBlockMatch && jsonBlockMatch[1]) {
    try {
      return JSON.parse(jsonBlockMatch[1].trim());
    } catch {}
  }

  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    const candidate = trimmed.substring(firstBrace, lastBrace + 1);
    try {
      return JSON.parse(candidate);
    } catch {}
  }

  const repaired = repairTruncatedJson(trimmed);
  if (repaired && typeof repaired === 'object') {
    return repaired;
  }

  throw new Error('No se pudo extraer un objeto JSON válido del texto del modelo');
}

/**
 * NIVEL GEMINI: Generación con Google Gemini API
 */
export async function callGemini(
  prompt: string,
  apiKeyOverride?: string,
  modelOverride?: string
): Promise<{ data: any; model: string }> {
  const apiKey = (apiKeyOverride ?? process.env.GEMINI_API_KEY ?? '').trim();
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY no configurada');
  }
  const modelToUse = (modelOverride || process.env.GEMINI_MODEL || GEMINI_MODEL || 'gemini-3.8-flash').trim();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelToUse}:generateContent?key=${apiKey}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), getGeminiTimeoutMs());
  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.7,
        },
      }),
    });
  } finally {
    clearTimeout(timeoutId);
  }
  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    if (
      (response.status === 404 ||
        errorText.toLowerCase().includes('not found') ||
        errorText.toLowerCase().includes('no longer available')) &&
      modelToUse !== 'gemini-flash-latest'
    ) {
      console.warn(
        `[ai-service][Gemini] Modelo "${modelToUse}" no disponible en API. Reintentando con "gemini-flash-latest"...`
      );
      return callGemini(prompt, apiKey, 'gemini-flash-latest');
    }
    throw new Error(`Gemini HTTP ${response.status}: ${errorText.slice(0, 300)}`);
  }
  const jsonResult = (await response.json()) as any;
  const content = jsonResult.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!content || typeof content !== 'string' || !content.trim()) {
    throw new Error(`Gemini (${modelToUse}) devolvió una respuesta vacía`);
  }
  const parsed = extractJson(content);
  return { data: parsed, model: modelToUse };
}

/**
 * NIVEL 1: Intento primario con OpenAI API (https://api.openai.com/v1/chat/completions)
 * Usa max_completion_tokens (compatible con modelos nuevos como gpt-5/gpt-6-luna/o1/o3 y con gpt-4o-mini)
 * e incluye reintento inteligente y fallback automático a gpt-4o-mini dentro del mismo Nivel 1
 * si el modelo primario demora demasiado o devuelve error de modelo/parámetro.
 */
export async function callOpenAI(
  prompt: string,
  apiKeyOverride?: string,
  modelOverride?: string
): Promise<{ data: any; model: string }> {
  const apiKey = (apiKeyOverride ?? process.env.OPENAI_API_KEY ?? '').trim();
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY no configurada');
  }

  const modelToUse = (modelOverride || process.env.OPENAI_MODEL || OPENAI_MODEL || 'gpt-6-luna').trim();
  const isClassicGpt = /^gpt-(3\.5|4)/i.test(modelToUse);
  const timeoutMs = getOpenAiTimeoutMs(modelToUse);

  const buildPayload = (
    model: string,
    opts: {
      useMaxTokens?: boolean;
      includeTemperature?: boolean;
      includeResponseFormat?: boolean;
      includeReasoningEffort?: boolean;
    } = {}
  ) => {
    const classic = /^gpt-(3\.5|4)/i.test(model);
    const payload: Record<string, any> = {
      model,
      messages: [
        {
          role: 'system',
          content:
            'Eres un motor experto de planificación de rutas turísticas reales en CLP. El 100% de las paradas DEBEN ser restaurantes, cafeterías, parques, museos o hitos REALES con nombre propio oficial (placeName), dirección/sector real (addressOrSector), coordenadas WGS84 verificables (coordinates) y consulta de mapa (mapQuery) en el destino solicitado. Queda estrictamente prohibido generar títulos genéricos. Responde ÚNICAMENTE con un objeto JSON válido siguiendo el contrato solicitado.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
    };

    if (opts.includeResponseFormat !== false) {
      payload.response_format = { type: 'json_object' };
    }
    if (opts.includeTemperature ?? classic) {
      payload.temperature = 0.7;
    }
    if (!classic && opts.includeReasoningEffort !== false) {
      payload.reasoning_effort = 'low';
    }
    if (opts.useMaxTokens) {
      payload.max_tokens = 4500;
    } else {
      payload.max_completion_tokens = classic ? 4500 : 8500;
    }
    return payload;
  };

  const executeRequest = async (payload: Record<string, any>, currentTimeoutMs = timeoutMs) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), currentTimeoutMs);
    try {
      return await fetch(OPENAI_API_URL, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
    } finally {
      clearTimeout(timeoutId);
    }
  };

  let response: Response;
  try {
    response = await executeRequest(buildPayload(modelToUse), timeoutMs);
  } catch (networkOrAbortErr: any) {
    if (modelToUse !== 'gpt-4o-mini') {
      console.warn(
        `[ai-service][Nivel 1] El modelo "${modelToUse}" excedió el tiempo de espera (${timeoutMs}ms) o abortó (${networkOrAbortErr?.message || networkOrAbortErr}). Reintentando Nivel 1 con "gpt-4o-mini"...`
      );
      return callOpenAI(prompt, apiKey, 'gpt-4o-mini');
    }
    throw networkOrAbortErr;
  }

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    const lowerErr = errorText.toLowerCase();

    // Si el modelo rechaza reasoning_effort, temperature, response_format o max_completion_tokens, reintentar adaptando parámetros
    if (
      response.status === 400 &&
      (lowerErr.includes('reasoning_effort') ||
        lowerErr.includes('temperature') ||
        lowerErr.includes('max_completion_tokens') ||
        lowerErr.includes('response_format'))
    ) {
      const retryOpts = {
        useMaxTokens: lowerErr.includes('max_completion_tokens'),
        includeTemperature: lowerErr.includes('temperature') ? false : isClassicGpt,
        includeResponseFormat: !lowerErr.includes('response_format'),
        includeReasoningEffort: !lowerErr.includes('reasoning_effort'),
      };
      try {
        response = await executeRequest(buildPayload(modelToUse, retryOpts), timeoutMs);
      } catch (retryNetworkOrAbortErr: any) {
        if (modelToUse !== 'gpt-4o-mini') {
          console.warn(
            `[ai-service][Nivel 1] El reintento adaptativo para "${modelToUse}" excedió el tiempo de espera (${timeoutMs}ms) o abortó (${retryNetworkOrAbortErr?.message || retryNetworkOrAbortErr}). Reintentando Nivel 1 con "gpt-4o-mini"...`
          );
          return callOpenAI(prompt, apiKey, 'gpt-4o-mini');
        }
        throw retryNetworkOrAbortErr;
      }
    }

    // Si aún falla y el modelo configurado (ej. gpt-6-luna) no es gpt-4o-mini y no es un error de API Key inválida (401)
    if (!response.ok && modelToUse !== 'gpt-4o-mini' && response.status !== 401) {
      console.warn(
        `[ai-service][Nivel 1] Modelo "${modelToUse}" devolvió HTTP ${response.status}. Reintentando automáticamente Nivel 1 con "gpt-4o-mini"...`
      );
      return callOpenAI(prompt, apiKey, 'gpt-4o-mini');
    }

    if (!response.ok) {
      throw new Error(`OpenAI HTTP ${response.status}: ${errorText.slice(0, 300)}`);
    }
  }

  const jsonResult = (await response.json()) as any;
  if (jsonResult.error) {
    const errMsg =
      typeof jsonResult.error === 'string'
        ? jsonResult.error
        : jsonResult.error.message || JSON.stringify(jsonResult.error);
    if (modelToUse !== 'gpt-4o-mini') {
      console.warn(
        `[ai-service][Nivel 1] Error en respuesta de "${modelToUse}" (${errMsg}). Reintentando Nivel 1 con "gpt-4o-mini"...`
      );
      return callOpenAI(prompt, apiKey, 'gpt-4o-mini');
    }
    throw new Error(`OpenAI API Error: ${errMsg}`);
  }

  const content = jsonResult.choices?.[0]?.message?.content;
  if (!content || typeof content !== 'string' || !content.trim()) {
    if (modelToUse !== 'gpt-4o-mini') {
      console.warn(
        `[ai-service][Nivel 1] "${modelToUse}" devolvió contenido vacío. Reintentando Nivel 1 con "gpt-4o-mini"...`
      );
      return callOpenAI(prompt, apiKey, 'gpt-4o-mini');
    }
    throw new Error(`OpenAI (${modelToUse}) devolvió una respuesta vacía`);
  }

  const parsed = extractJson(content);
  return { data: parsed, model: jsonResult.model || modelToUse };
}

/**
 * Lista de modelos gratuitos/respaldo en OpenRouter para rotar automáticamente si uno está en rate-limit (HTTP 429)
 */
const OPENROUTER_FALLBACK_MODELS = [
  'openrouter/free',
  'deepseek/deepseek-chat-v3-0324:free',
  'meta-llama/llama-3.3-70b-instruct:free',
  'qwen/qwen-2.5-72b-instruct:free',
  'mistralai/mistral-small-3.1-24b-instruct:free',
  'google/gemini-2.0-flash-exp:free',
  'deepseek/deepseek-chat',
];

/**
 * NIVEL 2: Respaldo secundario con OpenRouter API (https://openrouter.ai/api/v1/chat/completions)
 * utilizando process.env.OPENROUTER_API_KEY y rotando por múltiples modelos gratuitos si alguno tiene rate-limit (429).
 */
export async function callOpenRouter(prompt: string, apiKeyOverride?: string): Promise<{ data: any; model: string }> {
  const apiKey = (apiKeyOverride ?? process.env.OPENROUTER_API_KEY ?? '').trim();
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY no configurada');
  }

  const configuredModel = (process.env.OPENROUTER_MODEL || OPENROUTER_MODEL || 'openrouter/free').trim();

  // Construir cola de candidatos sin duplicados comenzando por el modelo configurado
  // Si es openrouter/free, probamos hasta 2 veces openrouter/free (ya que enruta aleatoriamente a distintos modelos free) y luego modelos free específicos
  const candidateModels: string[] = [configuredModel];
  if (configuredModel === 'openrouter/free') {
    candidateModels.push('openrouter/free');
  }
  for (const fallbackModel of OPENROUTER_FALLBACK_MODELS) {
    if (!candidateModels.includes(fallbackModel)) {
      candidateModels.push(fallbackModel);
    }
  }

  const executeSingleModel = async (targetModel: string, includeResponseFormat: boolean) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), getOpenRouterTimeoutMs());
    const bodyObj: Record<string, any> = {
      model: targetModel,
      messages: [
        {
          role: 'system',
          content:
            'Eres un motor de planificación de rutas turísticas de alta precisión en CLP. Todas las actividades DEBEN usar nombres propios reales de establecimientos, parques o hitos existentes en el destino solicitado, con placeName, addressOrSector, coordinates WGS84 y mapQuery. Responde ÚNICAMENTE con un objeto JSON válido conforme a la estructura solicitada, sin bloques markdown ni texto adicional.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 4500,
    };
    if (includeResponseFormat) {
      bodyObj.response_format = { type: 'json_object' };
    }

    try {
      return await fetch(OPENROUTER_API_URL, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.APP_URL || 'http://localhost:3000',
          'X-Title': 'Flyway ODC Itinerary Planner',
        },
        body: JSON.stringify(bodyObj),
      });
    } finally {
      clearTimeout(timeoutId);
    }
  };

  let lastError = 'Sin respuesta de OpenRouter';

  for (let i = 0; i < candidateModels.length; i++) {
    const currentModel = candidateModels[i];
    const isFreeModel = currentModel.includes('free');

    try {
      if (i > 0) {
        console.log(
          `[ai-service][Nivel 2] Rotando a modelo OpenRouter alternativo (${i + 1}/${candidateModels.length}): "${currentModel}"...`
        );
      }

      let response = await executeSingleModel(currentModel, !isFreeModel);
      if (!response.ok && !isFreeModel && response.status === 400) {
        response = await executeSingleModel(currentModel, false);
      }

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        lastError = `OpenRouter (${currentModel}) HTTP ${response.status}: ${errorText.slice(0, 220)}`;
        // Si la API Key de OpenRouter es inválida (401), no tiene sentido seguir rotando modelos
        if (response.status === 401) {
          throw new Error(lastError);
        }
        console.warn(`[ai-service][Nivel 2] ${lastError}`);
        continue;
      }

      const jsonResult = (await response.json()) as any;
      if (jsonResult.error) {
        const err = jsonResult.error;
        const errMsg = typeof err === 'string' ? err : err.message || JSON.stringify(err);
        lastError = `OpenRouter (${currentModel}) error (${err.code || 'provider_error'}): ${errMsg}`;
        console.warn(`[ai-service][Nivel 2] ${lastError}`);
        continue;
      }

      let content = jsonResult.choices?.[0]?.message?.content;
      if (!content && jsonResult.choices?.[0]?.text) {
        content = jsonResult.choices[0].text;
      }
      if (!content && jsonResult.choices?.[0]?.message?.reasoning) {
        content = jsonResult.choices[0].message.reasoning;
      }

      if (!content || typeof content !== 'string' || !content.trim()) {
        lastError = `OpenRouter (${currentModel}) devolvió respuesta vacía`;
        console.warn(`[ai-service][Nivel 2] ${lastError}`);
        continue;
      }

      const parsed = extractJson(content);
      const resolvedModel = jsonResult.model || currentModel;
      return { data: parsed, model: resolvedModel };
    } catch (err: any) {
      lastError = err?.message || String(err);
      if (lastError.includes('HTTP 401')) {
        throw err;
      }
      console.warn(`[ai-service][Nivel 2] Falló intento con "${currentModel}": ${lastError}`);
    }
  }

  throw new Error(lastError);
}

/**
 * NIVEL 3: Motor Local Offline determinista en CLP (generateLocalOfflineItinerary).
 * Garantiza respuesta inmediata HTTP 200 con contrato de salida unificado.
 */
export function generateLocalOfflineItinerary(
  input: PlanRouteInput,
  weatherOverride?: WeatherAndClothingInfo
): Trip {
  const isChile = isChileanLocation(input.destination);
  const trip = generateSmartTrip({
    destination: input.destination,
    startDate: input.startDate,
    endDate: input.endDate,
    budget: input.budget,
    interests: input.interests,
  });

  const resolvedWeather =
    weatherOverride || getWeatherAndClothingForTrip(input.destination, input.startDate, input.endDate);

  const cleanDest = trip.destination || input.destination.split(',')[0].trim();
  const resolvedCountry = trip.country || (isChile ? 'Chile' : 'Internacional');

  const daysWithGeo = (trip.days || []).map((day) => {
    const items = (day.items || []).map((item) => {
      if (item.type === 'activity' && item.data) {
        const placeName = deriveCleanPlaceName(item.data.placeName, item.data.title, cleanDest);
        const addressOrSector = item.data.addressOrSector || trip.commune || cleanDest;
        const coordinates = normalizeCoordinates(item.data.coordinates);
        const mapQuery = buildActivityMapQuery(
          item.data.mapQuery,
          placeName,
          addressOrSector,
          cleanDest,
          resolvedCountry
        );
        return {
          ...item,
          data: {
            ...item.data,
            placeName,
            addressOrSector,
            ...(coordinates ? { coordinates } : {}),
            mapQuery,
          },
        };
      }
      return item;
    });
    const activities = items
      .filter((it): it is { type: 'activity'; data: Activity } => it.type === 'activity' && Boolean(it.data))
      .map((it) => it.data);
    return {
      ...day,
      activities,
      items,
    };
  });

  return {
    ...trip,
    days: daysWithGeo,
    season: resolvedWeather.season,
    currentSeason: resolvedWeather.currentSeason,
    weatherCondition: resolvedWeather.weatherCondition,
    temperatureRange: resolvedWeather.temperatureRange,
    weatherSummary: resolvedWeather.weatherSummary,
    clothingTip: resolvedWeather.clothingTip,
    clothingItems: resolvedWeather.clothingItems,
    currency: 'CLP',
    sourceEngine: 'offline_local',
    generatedByModel: 'Flyway Local Offline Engine (CLP)',
    aiSource: 'synthesis',
    destinationCountry: isChile ? 'Chile 🇨🇱' : `${trip.country || 'Internacional'} 🌎`,
    isChileanDestination: isChile,
  };
}

// Alias mantenido por retrocompatibilidad
export function synthesizeFallbackTrip(input: PlanRouteInput): Trip {
  return generateLocalOfflineItinerary(input);
}

interface SpecificLandmarkStop {
  title: string;
  placeName: string;
  addressOrSector: string;
  coordinates?: { lat: number; lng: number };
  description: string;
  category: string;
  categoryIcon: string;
  isFood: boolean;
  whyIncluded: string;
  history: string;
  historicalFacts: string[];
  curiosity: string;
  architectureOrHeritage: string;
  savingTip: string;
}

const KNOWN_CITY_EMERGENCY_LANDMARKS: Record<
  string,
  { food: SpecificLandmarkStop; cultural: SpecificLandmarkStop }
> = {
  valdivia: {
    food: {
      title: 'Almuerzo marino en Mercado Municipal de Valdivia',
      placeName: 'Mercado Municipal de Valdivia',
      addressOrSector: 'Av. Ramón Picarte 210, Costanera, Valdivia',
      coordinates: { lat: -39.8142, lng: -73.2459 },
      description: 'Degustación de paila marina, congrio frito y sierra ahumada en las cocinerías tradicionales frente al río Calle-Calle.',
      category: 'Gastronomía',
      categoryIcon: '🍽️',
      isFood: true,
      whyIncluded: 'Hito culinario fluvial emblemático de Valdivia.',
      history: 'Monumento Histórico frente a la Feria Fluvial reconstruido tras 1960.',
      historicalFacts: ['Monumento Nacional y mercado ribereño insignia del sur de Chile.'],
      curiosity: 'Sus cocinerías familiares abastecen platos preparados con pesca artesanal del día en Niebla y Corral.',
      architectureOrHeritage: 'Edificio patrimonial de arcos y miradores fluviales.',
      savingTip: 'Los menús del segundo piso incluyen sopa o ensalada y pan amasado.',
    },
    cultural: {
      title: 'Mirador Costanera Arturo Prat y Centro Cultural El Austral',
      placeName: 'Centro Cultural El Austral',
      addressOrSector: 'Yungay 733, Zona Típica Calle General Lagos, Valdivia',
      coordinates: { lat: -39.8178, lng: -73.2485 },
      description: 'Recorrido por las casonas alemanas de madera nativa en General Lagos, salas de exposición y mirador ribereño al río Valdivia.',
      category: 'Cultura & Paisaje',
      categoryIcon: '🏛️',
      isFood: false,
      whyIncluded: 'Patrimonio arquitectónico valdiviano y vistas panorámicas al río.',
      history: 'Casona patrimonial del siglo XIX rehabilitada para exposiciones de arte e historia sureña.',
      historicalFacts: ['Zona Típica protegida por el Consejo de Monumentos Nacionales.'],
      curiosity: 'Conserva revestimientos originales en tejuela de alerce y carpintería de colonos.',
      architectureOrHeritage: 'Casona histórica en madera de roble y alerce de la Zona Típica General Lagos.',
      savingTip: 'Entrada gratuita a las salas de exposición durante todo el año.',
    },
  },
  'la serena': {
    food: {
      title: 'Almuerzo regional en Mercado La Recova',
      placeName: 'Mercado La Recova',
      addressOrSector: 'Cienfuegos 699, Centro Histórico, La Serena',
      coordinates: { lat: -29.9016, lng: -71.2484 },
      description: 'Cocinerías tradicionales en el segundo nivel con cabrito al jugo, machas a la parmesana y postres de papaya serenense.',
      category: 'Gastronomía',
      categoryIcon: '🍽️',
      isFood: true,
      whyIncluded: 'Principal polo gastronómico y artesanal de La Serena.',
      history: 'Centro tradicional de abastos y artesanía en piedra combarbalita y cerámica diaguita.',
      historicalFacts: ['Edificio neocolonial característico del Plan Serena.'],
      curiosity: 'Aquí se consiguen papayas confitadas elaboradas con recetas centenarias del valle.',
      architectureOrHeritage: 'Arquitectura neocolonial serenense con arquerías y patios interiores.',
      savingTip: 'Pide el menú de mediodía en las cocinerías del patio superior.',
    },
    cultural: {
      title: 'Mirador Parque Japonés Kokoro No Niwa y Ruta Cultural',
      placeName: 'Parque Japonés Kokoro No Niwa',
      addressOrSector: 'Eduardo de la Barra 25, Centro, La Serena',
      coordinates: { lat: -29.9052, lng: -71.2546 },
      description: 'Sendero de contemplación con laguna de carpas koi, puente tradicional de piedra, bonsáis y jardines diseñados junto a paisajistas de Tenri.',
      category: 'Cultura & Paisaje',
      categoryIcon: '🌿',
      isFood: false,
      whyIncluded: 'El jardín japonés más grande de Sudamérica a pasos de la Plaza de Armas.',
      history: 'Inaugurado en 1994 por el hermanamiento cultural entre La Serena y Tenri (Japón).',
      historicalFacts: ['1994: Apertura oficial conmemorando los 450 años de La Serena.'],
      curiosity: 'Su nombre significa "Jardín del Corazón" en idioma japonés.',
      architectureOrHeritage: 'Paisajismo tradicional japonés con pagodas, linternas de piedra e islas conectadas.',
      savingTip: 'Tarifa municipal económica en boletería de calle Eduardo de la Barra.',
    },
  },
};

/**
 * Builds up to 3 emergency stops ONLY when a malformed cloud response returned < 3 activities on a day,
 * prioritizing real venues from DESTINATIONS_CATALOG or known city landmarks (never generic 4th dinner filler).
 */
function buildEmergencyStopsForShortDay(
  existingActivities: Activity[],
  matchedCatalog: DestinationInfo | undefined,
  dayNumber: number,
  budget: BudgetLevel,
  cleanDestination: string,
  resolvedCountry: string,
  isChile: boolean
): Array<{ type: 'activity'; data: Activity } | { type: 'transfer'; data: { id: string; text: string; icon: string } }> {
  const extraItems: Array<
    { type: 'activity'; data: Activity } | { type: 'transfer'; data: { id: string; text: string; icon: string } }
  > = [];

  let totalActivitiesCount = existingActivities.length;
  if (totalActivitiesCount >= 3) {
    return extraItems;
  }

  const usedTitles = new Set(existingActivities.map((a) => a.title.toLowerCase().trim()));
  let hasFood = existingActivities.some(
    (a) => a.isFood || String(a.category || '').toLowerCase().includes('gastro')
  );
  let actCounter = existingActivities.length + 1;

  const budgetKey = budget === 'budget' ? 'costBudget' : budget === 'premium' ? 'costPremium' : 'costStandard';

  if (matchedCatalog && Array.isArray(matchedCatalog.dailyPlans) && matchedCatalog.dailyPlans.length > 0) {
    const planTemplate = matchedCatalog.dailyPlans[(dayNumber - 1) % matchedCatalog.dailyPlans.length];
    const allCatalogActs = [
      ...(planTemplate?.activities || []),
      ...matchedCatalog.dailyPlans.flatMap((dp) => dp.activities || []),
    ];

    const pickCatalogCandidate = (preferFood: boolean) =>
      allCatalogActs.find((cand) => {
        const normTitle = cand.title.toLowerCase().trim();
        if (usedTitles.has(normTitle)) return false;
        const candIsFood = Boolean(cand.isFood || cand.category.toLowerCase().includes('gastro'));
        return preferFood ? candIsFood : !candIsFood;
      }) || allCatalogActs.find((cand) => !usedTitles.has(cand.title.toLowerCase().trim()));

    while (totalActivitiesCount < 3) {
      const candidate = pickCatalogCandidate(!hasFood);
      if (!candidate) break;

      usedTitles.add(candidate.title.toLowerCase().trim());
      const costAmount = Number(candidate[budgetKey] ?? candidate.costStandard ?? 0);
      const placeName = deriveCleanPlaceName(undefined, candidate.title, cleanDestination);
      const addressOrSector = planTemplate?.sector || matchedCatalog.comunasOrSectors?.[0]?.name || cleanDestination;
      const mapQuery = buildActivityMapQuery(undefined, placeName, addressOrSector, cleanDestination, resolvedCountry);
      const candIsFood = Boolean(candidate.isFood || candidate.category.toLowerCase().includes('gastro'));
      if (candIsFood) hasFood = true;

      extraItems.push({
        type: 'transfer',
        data: {
          id: `tr-${dayNumber}-${actCounter}`,
          text: `Traslado hacia ${placeName} · 15 min`,
          icon: candIsFood ? '🚶' : '🚌',
        },
      });
      extraItems.push({
        type: 'activity',
        data: {
          id: `act-${dayNumber}-${actCounter++}`,
          timeRange: candidate.timeRange || (candIsFood ? '13:00 - 14:30' : '15:30 - 17:30'),
          startTime: candidate.startTime || (candIsFood ? '13:00' : '15:30'),
          endTime: candidate.endTime || (candIsFood ? '14:30' : '17:30'),
          title: candidate.title,
          placeName,
          addressOrSector,
          mapQuery,
          description: candidate.description,
          costAmount,
          costText: costAmount === 0 ? 'Gratis' : `$${costAmount.toLocaleString('es-CL')} CLP`,
          category: candidate.category,
          categoryIcon: candidate.categoryIcon,
          isFood: candIsFood,
          whyIncluded: candidate.whyIncluded,
          history: candidate.history,
          historicalFacts: candidate.historicalFacts || ['Hito patrimonial y turístico destacado de la ciudad.'],
          curiosity: candidate.curiosity || 'Punto recomendado por residentes y guías locales.',
          architectureOrHeritage: candidate.architectureOrHeritage || 'Patrimonio urbano y cultural reconocido.',
          savingTip: candidate.savingTip,
        },
      });
      totalActivitiesCount++;
    }
  }

  const normDestKey = cleanDestination
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
  const knownCity =
    KNOWN_CITY_EMERGENCY_LANDMARKS[normDestKey] ||
    Object.entries(KNOWN_CITY_EMERGENCY_LANDMARKS).find(
      ([k]) => normDestKey.includes(k) || k.includes(normDestKey)
    )?.[1];

  if (totalActivitiesCount < 3 && !hasFood) {
    const lunchCost = budget === 'budget' ? 7500 : budget === 'premium' ? 32000 : 16000;
    const foodStop: SpecificLandmarkStop = knownCity?.food || {
      title: `Almuerzo en Mercado Municipal de ${cleanDestination}`,
      placeName: `Mercado Municipal de ${cleanDestination}`,
      addressOrSector: `Centro Histórico, ${cleanDestination}`,
      description: `Degustación de platos emblemáticos preparados al momento en las cocinerías tradicionales del Mercado Municipal de ${cleanDestination}.`,
      category: 'Gastronomía',
      categoryIcon: '🍽️',
      isFood: true,
      whyIncluded: `Punto gastronómico auténtico en el corazón de ${cleanDestination}.`,
      history: `Centro histórico de abastos y cocina tradicional de ${cleanDestination}.`,
      historicalFacts: [`Tradición culinaria representativa de ${cleanDestination}.`],
      curiosity: 'Las cocinerías locales trabajan con ingredientes frescos de productores de la zona.',
      architectureOrHeritage: 'Recinto histórico de abastos y gastronomía local.',
      savingTip: 'El menú de mediodía incluye entrada, plato principal y acompañamiento.',
    };

    const mapQuery = buildActivityMapQuery(
      undefined,
      foodStop.placeName,
      foodStop.addressOrSector,
      cleanDestination,
      resolvedCountry
    );

    extraItems.push({
      type: 'transfer',
      data: {
        id: `tr-${dayNumber}-${actCounter}`,
        text: `Caminata hacia ${foodStop.placeName} · 15 min`,
        icon: '🚶',
      },
    });
    extraItems.push({
      type: 'activity',
      data: {
        id: `act-${dayNumber}-${actCounter++}`,
        timeRange: '12:30 - 14:00',
        startTime: '12:30',
        endTime: '14:00',
        title: foodStop.title,
        placeName: foodStop.placeName,
        addressOrSector: foodStop.addressOrSector,
        ...(foodStop.coordinates ? { coordinates: foodStop.coordinates } : {}),
        mapQuery,
        description: foodStop.description,
        costAmount: lunchCost,
        costText: `$${lunchCost.toLocaleString('es-CL')} CLP`,
        category: foodStop.category,
        categoryIcon: foodStop.categoryIcon,
        isFood: true,
        whyIncluded: foodStop.whyIncluded,
        history: foodStop.history,
        historicalFacts: foodStop.historicalFacts,
        curiosity: foodStop.curiosity,
        architectureOrHeritage: foodStop.architectureOrHeritage,
        savingTip: foodStop.savingTip,
      },
    });
    hasFood = true;
    totalActivitiesCount++;
  }

  while (totalActivitiesCount < 3) {
    const afternoonCost = budget === 'budget' ? 0 : budget === 'premium' ? 18000 : 8000;
    const useKnownCultural = knownCity?.cultural && !usedTitles.has(knownCity.cultural.title.toLowerCase());
    const culturalStop: SpecificLandmarkStop = useKnownCultural
      ? knownCity!.cultural
      : totalActivitiesCount === 1
      ? {
          title: isChile
            ? `Plaza de Armas y Museo Histórico de ${cleanDestination}`
            : `Plaza Mayor y Museo Histórico de ${cleanDestination}`,
          placeName: isChile
            ? `Plaza de Armas de ${cleanDestination}`
            : `Plaza Mayor de ${cleanDestination}`,
          addressOrSector: `Casco Histórico, ${cleanDestination}`,
          description: `Recorrido por el núcleo fundacional, arquitectura cívica y colecciones patrimoniales de ${cleanDestination}.`,
          category: 'Cultura',
          categoryIcon: '🏛️',
          isFood: false,
          whyIncluded: `Hito cívico e histórico central de ${cleanDestination}.`,
          history: `Espacio fundacional donde se trazaron los primeros edificios públicos de ${cleanDestination}.`,
          historicalFacts: [`Centro histórico protegido de ${cleanDestination}.`],
          curiosity: 'Concentra las edificaciones patrimoniales más fotografiadas de la ciudad.',
          architectureOrHeritage: 'Trazado fundacional y monumentos históricos.',
          savingTip: 'Recorrido exterior libre durante toda la jornada.',
        }
      : {
          title: `Mirador Principal y Centro Cultural de ${cleanDestination}`,
          placeName: `Centro Cultural de ${cleanDestination}`,
          addressOrSector: `Sector Patrimonial, ${cleanDestination}`,
          description: `Visita vespertina a las salas culturales y mirador urbano con vistas despejadas hacia ${cleanDestination}.`,
          category: 'Cultura & Paisaje',
          categoryIcon: '🌄',
          isFood: false,
          whyIncluded: `Vistas panorámicas y agenda cultural representativa de ${cleanDestination}.`,
          history: `Espacio público recuperado para las artes y la observación paisajística en ${cleanDestination}.`,
          historicalFacts: [`Punto cultural y paisajístico emblemático de ${cleanDestination}.`],
          curiosity: 'Horario ideal al caer la tarde por su iluminación natural.',
          architectureOrHeritage: 'Conjunto cultural y mirador público habilitado.',
          savingTip: 'Consulta la cartelera de exposiciones abiertas de acceso gratuito.',
        };

    usedTitles.add(culturalStop.title.toLowerCase());
    const mapQuery = buildActivityMapQuery(
      undefined,
      culturalStop.placeName,
      culturalStop.addressOrSector,
      cleanDestination,
      resolvedCountry
    );

    extraItems.push({
      type: 'transfer',
      data: {
        id: `tr-${dayNumber}-${actCounter}`,
        text: `Traslado hacia ${culturalStop.placeName} · 15 min`,
        icon: '🚌',
      },
    });
    extraItems.push({
      type: 'activity',
      data: {
        id: `act-${dayNumber}-${actCounter++}`,
        timeRange: '15:30 - 17:30',
        startTime: '15:30',
        endTime: '17:30',
        title: culturalStop.title,
        placeName: culturalStop.placeName,
        addressOrSector: culturalStop.addressOrSector,
        ...(culturalStop.coordinates ? { coordinates: culturalStop.coordinates } : {}),
        mapQuery,
        description: culturalStop.description,
        costAmount: afternoonCost,
        costText: afternoonCost === 0 ? 'Gratis' : `$${afternoonCost.toLocaleString('es-CL')} CLP`,
        category: culturalStop.category,
        categoryIcon: culturalStop.categoryIcon,
        isFood: false,
        whyIncluded: culturalStop.whyIncluded,
        history: culturalStop.history,
        historicalFacts: culturalStop.historicalFacts,
        curiosity: culturalStop.curiosity,
        architectureOrHeritage: culturalStop.architectureOrHeritage,
        savingTip: culturalStop.savingTip,
      },
    });
    totalActivitiesCount++;
  }

  return extraItems;
}

/**
 * Normaliza la salida de cualquier proveedor IA (OpenAI, OpenRouter o Gemini) al Contrato de Salida Unificado
 */
export function normalizeCloudTripResponse(
  rawTrip: any,
  input: PlanRouteInput,
  daysCount: number,
  isChile: boolean,
  sourceEngine: SourceEngine,
  modelName: string,
  liveWeather?: WeatherAndClothingInfo
): Trip {
  const cleanDest = input.destination.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const matchedCatalog = DESTINATIONS_CATALOG.find((cat) => {
    const catClean = cat.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const fullClean = cat.fullName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return (
      cleanDest.includes(catClean) ||
      catClean.includes(cleanDest) ||
      fullClean.includes(cleanDest) ||
      cat.aliases.some((a) => cleanDest.includes(a.toLowerCase()))
    );
  });

  const prelimMeta = inferDestinationMetadata(
    input.destination,
    matchedCatalog,
    isChile,
    60000 * daysCount,
    daysCount,
    input.interests
  );

  const destinationName =
    typeof rawTrip.destination === 'string' && rawTrip.destination.trim()
      ? rawTrip.destination.split(',')[0].trim()
      : prelimMeta.destination;

  const commaCountryHint = input.destination.includes(',')
    ? input.destination.split(',').slice(1).join(',').trim()
    : '';

  const country =
    typeof rawTrip.country === 'string' &&
    rawTrip.country.trim() &&
    rawTrip.country.trim().toLowerCase() !== 'internacional' &&
    rawTrip.country.trim().toLowerCase() !== 'país correspondiente'
      ? rawTrip.country.trim()
      : prelimMeta.country !== 'Internacional'
      ? prelimMeta.country
      : commaCountryHint || prelimMeta.country;

  const region =
    typeof rawTrip.region === 'string' && rawTrip.region.trim() && rawTrip.region.trim() !== 'Región correspondiente'
      ? rawTrip.region.trim()
      : prelimMeta.region;
  const commune =
    typeof rawTrip.commune === 'string' && rawTrip.commune.trim() && rawTrip.commune.trim() !== 'Sector principal'
      ? rawTrip.commune.trim()
      : prelimMeta.commune;

  const budgetInfoMap: Record<BudgetLevel, string> = {
    budget: 'Económico',
    standard: 'Presupuesto Medio',
    premium: 'Premium',
  };
  const weatherInfo =
    liveWeather || getWeatherAndClothingForTrip(input.destination, input.startDate, input.endDate);
  const budgetTier = getBudgetTierInfo(input.budget);

  const rawDaysCandidates =
    Array.isArray(rawTrip.days) && rawTrip.days.length > 0
      ? rawTrip.days
      : Array.isArray(rawTrip.dias) && rawTrip.dias.length > 0
      ? rawTrip.dias
      : Array.isArray(rawTrip.itinerary) && rawTrip.itinerary.length > 0
      ? rawTrip.itinerary
      : Array.isArray(rawTrip.trip?.days) && rawTrip.trip.days.length > 0
      ? rawTrip.trip.days
      : [];

  const normalizedDays = rawDaysCandidates.map((d: any, idx: number) => {
    const rawCandidates =
      Array.isArray(d.items) && d.items.length > 0
        ? d.items
        : Array.isArray(d.activities) && d.activities.length > 0
        ? d.activities
        : Array.isArray(d.panoramas) && d.panoramas.length > 0
        ? d.panoramas
        : Array.isArray(d.paradas) && d.paradas.length > 0
        ? d.paradas
        : Array.isArray(d.stops) && d.stops.length > 0
        ? d.stops
        : [];

    const rawItems = rawCandidates.map((rawAct: any, actIdx: number) => {
      if (rawAct && typeof rawAct === 'object') {
        if (rawAct.type === 'activity' && rawAct.data) {
          return rawAct;
        }
        if (rawAct.type === 'transfer' && rawAct.data) {
          return rawAct;
        }
        const actData = rawAct.data || rawAct;
        const actCost = Number(actData.costAmount ?? actData.costCLP ?? actData.cost ?? 10000);
        return {
          type: 'activity' as const,
          data: {
            id: actData.id || `act-${idx + 1}-${actIdx + 1}`,
            timeRange: actData.timeRange || actData.time || '09:30 - 11:30',
            startTime: actData.startTime || '09:30',
            endTime: actData.endTime || '11:30',
            title: actData.title || actData.name || `Actividad ${actIdx + 1}`,
            placeName: actData.placeName,
            addressOrSector: actData.addressOrSector ?? actData.address ?? actData.sector,
            coordinates: actData.coordinates,
            mapQuery: actData.mapQuery,
            description: actData.description || `Recorrido en ${destinationName}.`,
            costAmount: actCost,
            costText:
              actData.costText ||
              (actCost === 0 ? 'Gratis' : `$${actCost.toLocaleString('es-CL')} CLP`),
            category: actData.category || 'Cultura',
            categoryIcon: actData.categoryIcon || '🏛️',
            imageUrl: isValidHttpUrl(actData.imageUrl) ? actData.imageUrl.trim() : undefined,
            imagePhotographer: actData.imagePhotographer,
            imagePhotographerUrl: isValidHttpUrl(actData.imagePhotographerUrl)
              ? actData.imagePhotographerUrl.trim()
              : undefined,
            isFood: Boolean(actData.isFood),
            whyIncluded: actData.whyIncluded || 'Recomendado por relevancia local.',
            history: actData.history,
            historicalFacts: actData.historicalFacts,
            curiosity: actData.curiosity,
            architectureOrHeritage: actData.architectureOrHeritage,
            savingTip: actData.savingTip,
          },
        };
      }
      return null;
    }).filter(Boolean);

    const enrichedItems = rawItems.map((item: any) => {
      if (item.type === 'activity' && item.data) {
        const act = item.data;
        const costAmount = Number(act.costAmount ?? act.costCLP ?? act.cost ?? 0);
        const title = String(act.title || act.name || '').trim() || `Visita en ${destinationName}`;
        const placeName = deriveCleanPlaceName(act.placeName, title, destinationName);
        const rawAddress = act.addressOrSector ?? act.address ?? act.sector;
        const addressOrSector =
          typeof rawAddress === 'string' && rawAddress.trim().length > 0 ? rawAddress.trim() : undefined;
        const coordinates = normalizeCoordinates(act.coordinates);
        const mapQuery = buildActivityMapQuery(
          act.mapQuery,
          placeName,
          addressOrSector,
          destinationName,
          country
        );

        const normalizedData: Activity = {
          ...act,
          title,
          placeName,
          ...(addressOrSector ? { addressOrSector } : {}),
          ...(coordinates ? { coordinates } : {}),
          mapQuery,
          imageUrl: isValidHttpUrl(act.imageUrl) ? act.imageUrl.trim() : undefined,
          costAmount,
          costText: act.costText || (costAmount === 0 ? 'Gratis' : `$${costAmount.toLocaleString('es-CL')} CLP`),
          history:
            act.history ||
            (isChile
              ? `Emplazado en una de las zonas de mayor valor patrimonial de ${destinationName}, ${placeName} conserva hitos clave del desarrollo cultural local.`
              : `Hito representativo de ${destinationName} reconocido por su trayectoria histórica y arquitectónica.`),
          curiosity:
            act.curiosity ||
            `${placeName} es frecuentado por residentes locales por su identidad propia y ubicación estratégica.`,
          architectureOrHeritage:
            act.architectureOrHeritage ||
            (isChile
              ? 'Valor patrimonial con arquitectura tradicional y materiales propios de la zona.'
              : 'Patrimonio arquitectónico e histórico destacado.'),
          historicalFacts:
            Array.isArray(act.historicalFacts) && act.historicalFacts.length > 0
              ? act.historicalFacts
              : [
                  `Consolidación histórica de ${placeName} dentro de ${destinationName}.`,
                  'Punto de referencia local y visita recomendada.',
                ],
          savingTip:
            act.savingTip || 'Visitar con reserva previa o en primera franja horaria optimiza tiempos de espera.',
        };

        if (!coordinates) {
          delete normalizedData.coordinates;
        }
        if (!addressOrSector) {
          delete normalizedData.addressOrSector;
        }

        return {
          ...item,
          data: normalizedData,
        };
      }
      return item;
    });

    const finalItems = [...enrichedItems];
    const currentActivities: Activity[] = finalItems
      .filter((it: any) => it.type === 'activity' && it.data)
      .map((it: any) => it.data);
    const dayNumber = d.dayNumber || idx + 1;

    // Solo si el modelo devolvió menos de 3 paradas (caso borde malformado), completar hasta 3 paradas específicas.
    // Si el modelo ya devolvió >= 3 paradas válidas, NO inyectar rellenos sintéticos ni una 4ª cena genérica.
    if (currentActivities.length < 3) {
      const emergencyItems = buildEmergencyStopsForShortDay(
        currentActivities,
        matchedCatalog,
        dayNumber,
        input.budget,
        destinationName,
        country,
        isChile
      );
      finalItems.push(...emergencyItems);
    }

    const activitiesList = finalItems
      .filter((it: any) => it.type === 'activity' && it.data)
      .map((it: any) => it.data);

    const computedDayCost =
      Number(d.dailyCost ?? d.dailyCostCLP) ||
      activitiesList.reduce((acc: number, a: any) => acc + (Number(a.costAmount) || 0), 0) ||
      Math.round((Number(rawTrip.totalEstimatedCostCLP ?? rawTrip.totalCost) || 50000 * daysCount) / daysCount);

    return {
      dayNumber,
      dateFormatted: d.dateFormatted || formatDateSpanish(input.startDate, idx),
      dailyCost: computedDayCost,
      dailyCostCLP: computedDayCost,
      title: d.title || `Día ${dayNumber}: Explorando ${destinationName}`,
      summary: d.summary || 'Actividades y atracciones reales destacadas para este día.',
      imageUrl: isValidHttpUrl(d.imageUrl) ? d.imageUrl.trim() : undefined,
      activities: activitiesList,
      items: finalItems,
    };
  });

  // Garantizar que la cantidad de días devuelta coincida exactamente con daysCount solicitado
  if (normalizedDays.length < daysCount) {
    const referenceSmartTrip = generateSmartTrip({
      destination: input.destination,
      startDate: input.startDate,
      endDate: input.endDate,
      budget: input.budget,
      interests: input.interests,
    });
    for (let dayNum = normalizedDays.length + 1; dayNum <= daysCount; dayNum++) {
      const refDay = referenceSmartTrip.days[dayNum - 1];
      if (refDay) {
        const cleanedRefItems = (refDay.items || []).map((it) => {
          if (it.type === 'activity' && it.data) {
            const placeName = deriveCleanPlaceName(it.data.placeName, it.data.title, destinationName);
            const addressOrSector = it.data.addressOrSector || commune || destinationName;
            const coordinates = normalizeCoordinates(it.data.coordinates);
            const mapQuery = buildActivityMapQuery(
              it.data.mapQuery,
              placeName,
              addressOrSector,
              destinationName,
              country
            );
            return {
              ...it,
              data: {
                ...it.data,
                placeName,
                addressOrSector,
                ...(coordinates ? { coordinates } : {}),
                mapQuery,
                imageUrl: undefined,
                imagePhotographer: undefined,
                imagePhotographerUrl: undefined,
              },
            };
          }
          return it;
        });
        const cleanedRefActivities = cleanedRefItems
          .filter((it): it is { type: 'activity'; data: Activity } => it.type === 'activity' && Boolean(it.data))
          .map((it) => it.data);

        normalizedDays.push({
          ...refDay,
          imageUrl: undefined,
          imagePhotographer: undefined,
          imagePhotographerUrl: undefined,
          activities: cleanedRefActivities,
          items: cleanedRefItems,
        });
      }
    }
  } else if (normalizedDays.length > daysCount) {
    normalizedDays.length = daysCount;
  }

  const computedTotalCost =
    Number(rawTrip.totalEstimatedCostCLP ?? rawTrip.totalCost) ||
    normalizedDays.reduce((acc: number, d: any) => acc + (Number(d.dailyCost) || 0), 0) ||
    (input.budget === 'budget' ? 30000 * daysCount : 60000 * daysCount);

  const fallbackMeta = inferDestinationMetadata(
    input.destination,
    matchedCatalog,
    isChile,
    computedTotalCost,
    daysCount,
    input.interests
  );

  const avgDailyCostCLP =
    Number(rawTrip.avgDailyCostCLP) > 0
      ? Math.round(Number(rawTrip.avgDailyCostCLP))
      : Math.round(computedTotalCost / Math.max(normalizedDays.length, 1));
  const tags =
    Array.isArray(rawTrip.tags) && rawTrip.tags.length > 0
      ? rawTrip.tags.map((t: any) => String(t).toLowerCase().trim()).filter(Boolean)
      : fallbackMeta.tags;
  const description =
    typeof rawTrip.description === 'string' && rawTrip.description.trim()
      ? rawTrip.description.trim()
      : fallbackMeta.description;

  // Priorizar siempre la consulta meteorológica real (Open-Meteo / modelo climático verificado)
  const useLiveWeatherPriority = weatherInfo.weatherSource === 'open-meteo';

  const preservedHeroImageUrl = isValidHttpUrl(rawTrip.imageUrl) ? rawTrip.imageUrl.trim() : undefined;
  const preservedPhotoUrl = isValidHttpUrl(rawTrip.photoUrl) ? rawTrip.photoUrl.trim() : preservedHeroImageUrl;

  const finalTrip: Trip = {
    id: `trip-ai-${Date.now()}`,
    title: rawTrip.title || `Itinerario por ${destinationName}`,
    destination: destinationName,
    country,
    region,
    commune,
    avgDailyCostCLP,
    tags,
    description,
    currency: 'CLP',
    totalEstimatedCostCLP: computedTotalCost,
    sourceEngine,
    datesText: rawTrip.datesText || `${formatDateSpanish(input.startDate)} - ${formatDateSpanish(input.endDate)}`,
    startDate: input.startDate,
    endDate: input.endDate,
    budgetLevel: input.budget,
    budgetLabel: rawTrip.budgetLabel || budgetInfoMap[input.budget],
    budgetRangeText: budgetTier.dailyRangeText,
    budgetDescription: budgetTier.description,
    totalCost: computedTotalCost,
    summary: rawTrip.summary || description,
    season: weatherInfo.season,
    currentSeason: weatherInfo.currentSeason,
    weatherCondition: useLiveWeatherPriority
      ? weatherInfo.weatherCondition
      : rawTrip.weatherCondition || weatherInfo.weatherCondition,
    temperatureRange: useLiveWeatherPriority
      ? weatherInfo.temperatureRange
      : rawTrip.temperatureRange || weatherInfo.temperatureRange,
    weatherSummary: useLiveWeatherPriority
      ? weatherInfo.weatherSummary
      : rawTrip.weatherSummary || weatherInfo.weatherSummary,
    clothingTip: useLiveWeatherPriority
      ? weatherInfo.clothingTip
      : rawTrip.clothingTip || weatherInfo.clothingTip,
    clothingItems:
      useLiveWeatherPriority || !Array.isArray(rawTrip.clothingItems) || rawTrip.clothingItems.length === 0
        ? weatherInfo.clothingItems
        : rawTrip.clothingItems,
    imageUrl: preservedHeroImageUrl,
    photoUrl: preservedPhotoUrl,
    imagePhotographer:
      preservedHeroImageUrl && typeof rawTrip.imagePhotographer === 'string' && rawTrip.imagePhotographer.trim()
        ? rawTrip.imagePhotographer.trim()
        : undefined,
    imagePhotographerUrl:
      preservedHeroImageUrl && isValidHttpUrl(rawTrip.imagePhotographerUrl)
        ? rawTrip.imagePhotographerUrl.trim()
        : undefined,
    isFavorite: false,
    whyThisRoute: rawTrip.whyThisRoute || 'Ruta diseñada para maximizar experiencias reales y optimizar tiempos.',
    savingTips:
      Array.isArray(rawTrip.savingTips) && rawTrip.savingTips.length > 0
        ? rawTrip.savingTips
        : ['Prefiere transporte público o caminatas', 'Prueba el menú del día en mercados reales'],
    days: normalizedDays,
    generatedByModel: modelName,
    aiSource: sourceEngine,
    destinationCountry: isChile ? 'Chile 🇨🇱' : `${country} 🌎`,
    isChileanDestination: isChile,
  };

  return ensureTripHasPexelsPhotos(finalTrip);
}

/**
 * Lee los modelos de IA activos desde la variable de entorno ACTIVE_AI_MODELS o ENABLED_AI_MODELS.
 * Por defecto prioriza OpenAI (gpt-6-luna) en primer lugar seguido de OpenRouter ('openai,openrouter').
 * También acepta el alias común 'openia' normalizándolo a 'openai'.
 */
export function getActiveAiModels(): string[] {
  const envVal = (process.env.ACTIVE_AI_MODELS || process.env.ENABLED_AI_MODELS || 'openai,openrouter').trim();
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of envVal.split(',')) {
    const clean = raw.trim().toLowerCase();
    if (!clean) continue;
    const normalized = clean === 'openia' || clean === 'open_ai' || clean === 'open-ai' ? 'openai' : clean;
    if (!seen.has(normalized)) {
      seen.add(normalized);
      result.push(normalized);
    }
  }
  return result;
}

/**
 * Determina si el modo offline está explícitamente activado.
 * Por defecto es false (en la nube de GCP no se utiliza modo offline según requerimiento).
 * Permite un override booleano explícito cuando se requiera evaluar por petición.
 */
export function isOfflineModeEnabled(explicitOverride?: boolean): boolean {
  if (typeof explicitOverride === 'boolean') {
    return explicitOverride;
  }
  const envVal = (process.env.ENABLE_OFFLINE_MODE || process.env.ENABLE_OFFLINE_FALLBACK || 'false').trim().toLowerCase();
  return envVal === 'true' || envVal === '1' || envVal === 'yes';
}

/**
 * Orquestador Principal de Rutas con Selección Dinámica de Modelos (ACTIVE_AI_MODELS):
 * - Consulta Clima en Vivo (Open-Meteo API + modelo climático por latitud/hemisferio)
 * - Itera en orden de prioridad por los modelos activos en process.env.ACTIVE_AI_MODELS (por defecto: 'openai,openrouter'):
 *     1. 'openai': OpenAI API (primario: gpt-6-luna)
 *     2. 'openrouter': OpenRouter API (respaldo)
 *     3. 'gemini': Google Gemini API (solo si se activa explícitamente)
 * - En la nube de GCP el modo offline está desactivado por defecto (salvo ENABLE_OFFLINE_MODE=true o allowOffline=true).
 */
export async function planRouteWithAI(input: PlanRouteInput, allowOffline: boolean = isOfflineModeEnabled()): Promise<Trip> {
  const daysCount = getDaysCount(input.startDate, input.endDate);
  const isChile = isChileanLocation(input.destination);

  console.log(
    `[ai-service][Clima] Consultando pronóstico meteorológico y vestimenta para "${input.destination}" (${input.startDate} a ${input.endDate})...`
  );
  const weatherPromise = fetchWeatherAndClothingForTrip(input.destination, input.startDate, input.endDate);
  const initialWeatherHint = getWeatherAndClothingForTrip(input.destination, input.startDate, input.endDate);
  const prompt = buildPrompt(input, daysCount, isChile, initialWeatherHint);

  const activeModels = getActiveAiModels();
  console.log(`[ai-service] Modelos de IA activos según ACTIVE_AI_MODELS: [${activeModels.join(', ')}]`);

  for (const modelProvider of activeModels) {
    if (modelProvider === 'gemini') {
      const geminiKey = (process.env.GEMINI_API_KEY || '').trim();
      if (!geminiKey) {
        console.warn('[ai-service][Gemini] GEMINI_API_KEY no configurada. Saltando...');
        continue;
      }
      try {
        const configuredGeminiModel = (process.env.GEMINI_MODEL || GEMINI_MODEL || 'gemini-3.8-flash').trim();
        console.log(`[ai-service][Gemini] Intentando generación con Gemini (${configuredGeminiModel})...`);
        const [geminiResult, liveWeather] = await Promise.all([
          callGemini(prompt, geminiKey, configuredGeminiModel),
          weatherPromise,
        ]);
        if (geminiResult.data && Array.isArray(geminiResult.data.days) && geminiResult.data.days.length > 0) {
          console.log(
            `[ai-service][Gemini] Éxito con Gemini (${geminiResult.model}) + Clima (${liveWeather.temperatureRange})`
          );
          return normalizeCloudTripResponse(
            geminiResult.data,
            input,
            daysCount,
            isChile,
            'gemini',
            `Gemini (${geminiResult.model})`,
            liveWeather
          );
        }
        console.warn('[ai-service][Gemini] Gemini devolvió un JSON sin días válidos.');
      } catch (geminiErr: any) {
        console.warn(`[ai-service][Gemini] Falló Gemini API (${geminiErr?.message || geminiErr}).`);
      }
    } else if (modelProvider === 'openai') {
      const openAiKey = (process.env.OPENAI_API_KEY || '').trim();
      if (!openAiKey) {
        console.warn('[ai-service][OpenAI] OPENAI_API_KEY no configurada. Saltando...');
        continue;
      }
      try {
        console.log(
          `[ai-service][OpenAI] Intentando generación con OpenAI (${process.env.OPENAI_MODEL || OPENAI_MODEL})...`
        );
        const [openAiResult, liveWeather] = await Promise.all([
          callOpenAI(prompt, openAiKey),
          weatherPromise,
        ]);
        if (openAiResult.data && Array.isArray(openAiResult.data.days) && openAiResult.data.days.length > 0) {
          console.log(
            `[ai-service][OpenAI] Éxito con OpenAI (${openAiResult.model}) + Clima (${liveWeather.temperatureRange})`
          );
          return normalizeCloudTripResponse(
            openAiResult.data,
            input,
            daysCount,
            isChile,
            'openai',
            `OpenAI (${openAiResult.model})`,
            liveWeather
          );
        }
        console.warn('[ai-service][OpenAI] OpenAI devolvió un JSON sin días válidos.');
      } catch (openAiErr: any) {
        console.warn(`[ai-service][OpenAI] Falló OpenAI API (${openAiErr?.message || openAiErr}).`);
      }
    } else if (modelProvider === 'openrouter') {
      const openRouterKey = (process.env.OPENROUTER_API_KEY || '').trim();
      if (!openRouterKey) {
        console.warn('[ai-service][OpenRouter] OPENROUTER_API_KEY no configurada. Saltando...');
        continue;
      }
      try {
        const configuredModel = (process.env.OPENROUTER_MODEL || OPENROUTER_MODEL || 'openrouter/free').trim();
        console.log(`[ai-service][OpenRouter] Intentando generación con OpenRouter (${configuredModel})...`);
        const [openRouterResult, liveWeather] = await Promise.all([
          callOpenRouter(prompt, openRouterKey),
          weatherPromise,
        ]);
        if (
          openRouterResult.data &&
          Array.isArray(openRouterResult.data.days) &&
          openRouterResult.data.days.length > 0
        ) {
          console.log(
            `[ai-service][OpenRouter] Éxito con OpenRouter (${openRouterResult.model}) + Clima (${liveWeather.temperatureRange})`
          );
          return normalizeCloudTripResponse(
            openRouterResult.data,
            input,
            daysCount,
            isChile,
            'openrouter',
            `OpenRouter (${openRouterResult.model})`,
            liveWeather
          );
        }
        console.warn('[ai-service][OpenRouter] OpenRouter devolvió un JSON sin días válidos.');
      } catch (openRouterErr: any) {
        console.warn(`[ai-service][OpenRouter] Falló OpenRouter API (${openRouterErr?.message || openRouterErr}).`);
      }
    } else {
      console.warn(`[ai-service] Modelo desconocido en ACTIVE_AI_MODELS: "${modelProvider}".`);
    }
  }

  // Si ningún modelo de IA activo generó la ruta
  const liveWeather = await weatherPromise;
  if (allowOffline) {
    console.warn(
      `[ai-service] Modo offline explícitamente habilitado: ejecutando Motor Local Offline (generateLocalOfflineItinerary).`
    );
    return generateLocalOfflineItinerary(input, liveWeather);
  }

  throw new Error(
    `No se pudo generar el itinerario en la nube con los modelos de IA activos: [${activeModels.join(
      ', '
    )}]. El modo offline se encuentra desactivado para el despliegue en la nube de GCP. Revisa las claves de API en el archivo .env.`
  );
}

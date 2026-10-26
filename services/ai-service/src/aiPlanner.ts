import path from 'node:path';
import dotenv from 'dotenv';
import { Trip, BudgetLevel, SourceEngine } from './types';
import { generateSmartTrip, inferDestinationMetadata } from './utils/tripGenerator';
import { ensureTripHasPexelsPhotos } from './utils/photoUtils';
import {
  getWeatherAndClothingForTrip,
  fetchWeatherAndClothingForTrip,
  WeatherAndClothingInfo,
  getBudgetTierInfo,
} from './utils/weatherUtils';
import { DESTINATIONS_CATALOG } from './data/destinationsData';

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
 * Builds the AI prompt requesting the Unified Output Contract in CLP
 * including destination-accurate weather & clothing guidance.
 */
export function buildPrompt(
  input: PlanRouteInput,
  daysCount: number,
  isChile: boolean,
  weatherHint: WeatherAndClothingInfo
): string {
  const budgetLabels: Record<BudgetLevel, string> = {
    budget: 'Económico (mochilero / bajo costo, transporte público, picadas locales)',
    standard: 'Presupuesto Medio (restaurantes locales de calidad, museos y experiencias)',
    premium: 'Premium (gastronomía de autor, hoteles boutique, experiencias exclusivas)',
  };

  const interestsText = input.interests.length > 0
    ? input.interests.join(', ')
    : 'cultura, gastronomía, naturaleza';

  return `Actúa como un experto en planificación turística y meteorología de viajes para ${input.destination} (${isChile ? 'Chile 🇨🇱' : 'Destino Internacional'}).
Genera un itinerario estructurado en JSON para ${daysCount} días (${input.startDate} a ${input.endDate}) con todos los costos expresados en pesos chilenos (CLP).
- Presupuesto: ${budgetLabels[input.budget]}
- Intereses: ${interestsText}
- Referencia climática real para estas fechas en ${input.destination} (Hemisferio ${weatherHint.hemisphere}, estación ${weatherHint.season}): ${weatherHint.temperatureRange}, ${weatherHint.weatherCondition}.

REGLAS ESENCIALES:
1. Responde ÚNICAMENTE con un objeto JSON válido, sin texto fuera del JSON.
2. Incluye en la raíz del JSON la metadata del destino para persistencia en catálogo PostgreSQL:
   - "destination": nombre limpio del destino (ej. "Pucón" o "Oslo, Noruega")
   - "country": país real del destino (ej. "Chile", "Noruega", "Rusia")
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

ESTRUCTURA EXACTA REQUERIDA DEL JSON:
{
  "title": "Ruta ${input.destination}",
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
  "summary": "Resumen conciso del recorrido.",
  "season": "${weatherHint.season}",
  "weatherCondition": "${weatherHint.weatherCondition}",
  "temperatureRange": "${weatherHint.temperatureRange}",
  "weatherSummary": "${weatherHint.weatherSummary}",
  "clothingTip": "${weatherHint.clothingTip}",
  "clothingItems": ${JSON.stringify(weatherHint.clothingItems)},
  "whyThisRoute": "Por qué esta ruta se adapta a tus intereses y al clima de la fecha.",
  "savingTips": ["Consejo 1", "Consejo 2"],
  "days": [
    {
      "dayNumber": 1,
      "dateFormatted": "Día 1",
      "dailyCost": 65000,
      "dailyCostCLP": 65000,
      "title": "Día 1: Sector Principal",
      "summary": "Exploración de la zona.",
      "items": [
        {
          "type": "activity",
          "data": {
            "id": "act-1-1",
            "timeRange": "09:30 - 11:30",
            "startTime": "09:30",
            "endTime": "11:30",
            "title": "Hito Patrimonial y Casco Histórico",
            "description": "Visita matutina guiada por monumentos y plazas emblemáticas.",
            "costText": "$5.000 CLP",
            "costAmount": 5000,
            "category": "Cultura",
            "categoryIcon": "🏛️",
            "isFood": false,
            "whyIncluded": "Inicio en el corazón patrimonial",
            "history": "Reseña histórica del lugar.",
            "historicalFacts": ["Siglo XIX: Construcción del hito"],
            "curiosity": "Dato curioso del lugar.",
            "architectureOrHeritage": "Estilo patrimonial.",
            "savingTip": "Entrada liberada antes de las 11:00."
          }
        },
        {
          "type": "transfer",
          "data": {
            "id": "tr-1-1",
            "text": "Caminata escénica hacia el sector gastronómico · 15 min",
            "icon": "🚶"
          }
        },
        {
          "type": "activity",
          "data": {
            "id": "act-1-2",
            "timeRange": "12:30 - 14:00",
            "startTime": "12:30",
            "endTime": "14:00",
            "title": "Almuerzo Típico en Mercado Local",
            "description": "Degustación de cocina tradicional y platos típicos con ingredientes de la zona.",
            "costText": "$15.000 CLP",
            "costAmount": 15000,
            "category": "Gastronomía",
            "categoryIcon": "🍽️",
            "isFood": true,
            "whyIncluded": "Parada gastronómica obligada del mediodía",
            "history": "Tradición culinaria de larga data.",
            "historicalFacts": ["Receta tradicional transmitida entre generaciones"],
            "curiosity": "Plato típico más pedido por locales.",
            "architectureOrHeritage": "Cocinería en mercado histórico.",
            "savingTip": "El menú del día incluye sopa o ensalada y bebida."
          }
        },
        {
          "type": "transfer",
          "data": {
            "id": "tr-1-2",
            "text": "Traslado en transporte público o micro local · 20 min",
            "icon": "🚌"
          }
        },
        {
          "type": "activity",
          "data": {
            "id": "act-1-3",
            "timeRange": "15:00 - 17:30",
            "startTime": "15:00",
            "endTime": "17:30",
            "title": "Mirador Panorámico y Tarde Cultural",
            "description": "Paseo por senderos, talleres artesanales y vista panorámica privilegiada.",
            "costText": "$8.000 CLP",
            "costAmount": 8000,
            "category": "Naturaleza & Paisaje",
            "categoryIcon": "🌄",
            "isFood": false,
            "whyIncluded": "Vistas excepcionales y fotografía en horario de buena luz",
            "history": "Antiguo punto de vigía.",
            "historicalFacts": ["Punto estratégico de observación"],
            "curiosity": "Mejor punto para apreciar el entorno.",
            "architectureOrHeritage": "Mirador habilitado.",
            "savingTip": "Acceso peatonal gratuito."
          }
        },
        {
          "type": "transfer",
          "data": {
            "id": "tr-1-3",
            "text": "Caminata de retorno al barrio cívico · 15 min",
            "icon": "🚶"
          }
        },
        {
          "type": "activity",
          "data": {
            "id": "act-1-4",
            "timeRange": "19:30 - 21:00",
            "startTime": "19:30",
            "endTime": "21:00",
            "title": "Cena Tradicional y Paseo Nocturno",
            "description": "Cierre de jornada con cocina local, música o café en terraza.",
            "costText": "$18.000 CLP",
            "costAmount": 18000,
            "category": "Gastronomía",
            "categoryIcon": "🍷",
            "isFood": true,
            "whyIncluded": "Cierre relajado de la jornada",
            "history": "Barrio bohemio emblemático.",
            "historicalFacts": ["Punto de encuentro cultural"],
            "curiosity": "Ambiente iluminado de noche.",
            "architectureOrHeritage": "Casona antigua restaurada.",
            "savingTip": "Promociones en happy hour."
          }
        }
      ]
    }${daysCount > 1 ? `,\n    /* Continúa con los días 2 a ${daysCount} siguiendo esta misma estructura de 3 a 4 actividades por día */` : ''}
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
            'Eres un motor de planificación de rutas turísticas en CLP. Responde ÚNICAMENTE con un objeto JSON válido siguiendo el contrato solicitado.',
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
      payload.max_tokens = 3500;
    } else {
      payload.max_completion_tokens = classic ? 4000 : 8000;
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
            'Eres un motor de planificación de rutas turísticas de alta precisión en CLP. Responde ÚNICAMENTE con un objeto JSON válido conforme a la estructura solicitada, sin bloques markdown ni texto adicional.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 3500,
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

  return {
    ...trip,
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

/**
 * Normaliza la salida de cualquier proveedor IA (OpenAI u OpenRouter) al Contrato de Salida Unificado
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
    return cleanDest.includes(catClean) || catClean.includes(cleanDest);
  });

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
            description: actData.description || `Recorrido en ${input.destination}.`,
            costAmount: actCost,
            costText:
              actData.costText ||
              (actCost === 0 ? 'Gratis' : `$${actCost.toLocaleString('es-CL')} CLP`),
            category: actData.category || 'Cultura',
            categoryIcon: actData.categoryIcon || '🏛️',
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
        return {
          ...item,
          data: {
            ...act,
            costAmount,
            costText: act.costText || (costAmount === 0 ? 'Gratis' : `$${costAmount.toLocaleString('es-CL')} CLP`),
            history:
              act.history ||
              (isChile
                ? `Emplazado en una de las zonas de mayor valor patrimonial de ${input.destination}, este sitio conserva vestigios del florecimiento cívico y cultural local.`
                : `Hito representativo de ${input.destination} que atesora siglos de evolución histórica y arquitectónica.`),
            curiosity:
              act.curiosity ||
              'En este lugar se realizaban antiguamente encuentros ciudadanos y ferias tradicionales.',
            architectureOrHeritage:
              act.architectureOrHeritage ||
              (isChile
                ? 'Zona de valor patrimonial con arquitectura tradicional y materiales nobles.'
                : 'Patrimonio arquitectónico e histórico protegido.'),
            historicalFacts:
              Array.isArray(act.historicalFacts) && act.historicalFacts.length > 0
                ? act.historicalFacts
                : [
                    'Orígenes: Primeros asentamientos y trazado fundacional de la zona.',
                    'Actualidad: Punto protegido de identidad cultural y visita obligada.',
                  ],
            savingTip:
              act.savingTip || 'Visitar en las primeras horas de la mañana ofrece mejor luz y menor afluencia.',
          },
        };
      }
      return item;
    });

    let finalItems = [...enrichedItems];
    const currentActivities = finalItems.filter((it: any) => it.type === 'activity' && it.data);
    const dayNumber = d.dayNumber || idx + 1;
    const destClean = input.destination.split(',')[0].trim();

    if (currentActivities.length < 3) {
      const hasFood = currentActivities.some((it: any) => it.data?.isFood || it.data?.category?.toLowerCase().includes('gastro'));
      let actCounter = currentActivities.length + 1;

      if (!hasFood) {
        const lunchCost = input.budget === 'budget' ? 7000 : input.budget === 'premium' ? 32000 : 16000;
        finalItems.push({
          type: 'transfer',
          data: {
            id: `tr-${dayNumber}-${actCounter}`,
            text: isChile ? 'Caminata hacia mercado o picada gastronómica tradicional · 15 min' : 'Traslado a zona gastronómica local · 15 min',
            icon: '🚶',
          },
        });
        finalItems.push({
          type: 'activity',
          data: {
            id: `act-${dayNumber}-${actCounter++}`,
            timeRange: '12:30 - 14:00',
            startTime: '12:30',
            endTime: '14:00',
            title: `Almuerzo Típico y Degustación en ${destClean}`,
            description: `Parada gastronómica para degustar preparaciones tradicionales con ingredientes frescos locales.`,
            costAmount: lunchCost,
            costText: `$${lunchCost.toLocaleString('es-CL')} CLP`,
            category: 'Gastronomía',
            categoryIcon: '🍽️',
            isFood: true,
            whyIncluded: 'Parada gastronómica identitaria del mediodía.',
            history: 'Cocinerías familiares con recetas tradicionales conservadas durante décadas.',
            historicalFacts: ['Tradición gastronómica del mercado comunal.'],
            curiosity: 'Platos preparados al momento con sazón de la zona.',
            architectureOrHeritage: 'Cocinería en barrio histórico.',
            savingTip: 'El menú ejecutivo incluye plato de fondo y ensalada o postre.',
          },
        });
      }

      if (finalItems.filter((it: any) => it.type === 'activity').length < 3) {
        const afternoonCost = input.budget === 'budget' ? 0 : input.budget === 'premium' ? 18000 : 8000;
        finalItems.push({
          type: 'transfer',
          data: {
            id: `tr-${dayNumber}-${actCounter}`,
            text: 'Traslado o paseo escénico hacia mirador o sector cultural · 15 min',
            icon: '🚌',
          },
        });
        finalItems.push({
          type: 'activity',
          data: {
            id: `act-${dayNumber}-${actCounter++}`,
            timeRange: '15:30 - 17:30',
            startTime: '15:30',
            endTime: '17:30',
            title: `Mirador Panorámico y Paseo Cultural de ${destClean}`,
            description: `Recorrido por talleres de artesanía, galerías independientes y mirador con vistas a la geografía del lugar.`,
            costAmount: afternoonCost,
            costText: afternoonCost === 0 ? 'Gratis' : `$${afternoonCost.toLocaleString('es-CL')} CLP`,
            category: 'Cultura & Paisaje',
            categoryIcon: '🌄',
            isFood: false,
            whyIncluded: 'Vistas panorámicas y exploración cultural de tarde.',
            history: 'Punto de encuentro de artistas y cronistas locales.',
            historicalFacts: ['Espacio público protegido para el esparcimiento ciudadano.'],
            curiosity: 'Excelente punto para capturar fotografías con la mejor luz del atardecer.',
            architectureOrHeritage: 'Paseo patrimonial con miradores y pasajes históricos.',
            savingTip: 'Acceso peatonal libre y mirador público gratuito.',
          },
        });
      }

      if (finalItems.filter((it: any) => it.type === 'activity').length < 4) {
        const dinnerCost = input.budget === 'budget' ? 8500 : input.budget === 'premium' ? 36000 : 18000;
        finalItems.push({
          type: 'transfer',
          data: {
            id: `tr-${dayNumber}-${actCounter}`,
            text: 'Caminata hacia el paseo nocturno y café/restaurante · 12 min',
            icon: '🚶',
          },
        });
        finalItems.push({
          type: 'activity',
          data: {
            id: `act-${dayNumber}-${actCounter++}`,
            timeRange: '19:30 - 21:00',
            startTime: '19:30',
            endTime: '21:00',
            title: `Cena Típica y Atardecer en ${destClean}`,
            description: `Cierre del día con gastronomía criolla, bebidas tradicionales o música ambiental en barrio bohemio.`,
            costAmount: dinnerCost,
            costText: `$${dinnerCost.toLocaleString('es-CL')} CLP`,
            category: 'Gastronomía & Ocio',
            categoryIcon: '🍷',
            isFood: true,
            whyIncluded: 'Cierre distendido de la jornada con ambiente local.',
            history: 'Barrio nocturno tradicional con casonas patrimoniales restauradas.',
            historicalFacts: ['Antiguo sector de tertulias y encuentros ciudadanos.'],
            curiosity: 'Iluminación nocturna cálida ideal para pasear con tranquilidad.',
            architectureOrHeritage: 'Casona de principios del siglo XX con terrazas.',
            savingTip: 'Aprovechar promociones de tabla para compartir o menú de noche.',
          },
        });
      }
    }

    const activitiesList = finalItems
      .filter((it: any) => it.type === 'activity' && it.data)
      .map((it: any) => it.data);

    const computedDayCost =
      Number(d.dailyCost ?? d.dailyCostCLP) ||
      activitiesList.reduce((acc: number, a: any) => acc + (Number(a.costAmount) || 0), 0) ||
      Math.round((Number(rawTrip.totalEstimatedCostCLP ?? rawTrip.totalCost) || 50000 * daysCount) / daysCount);

    return {
      dayNumber: d.dayNumber || idx + 1,
      dateFormatted: d.dateFormatted || formatDateSpanish(input.startDate, idx),
      dailyCost: computedDayCost,
      dailyCostCLP: computedDayCost,
      title: d.title || `Día ${d.dayNumber || idx + 1}: Explorando ${input.destination}`,
      summary: d.summary || 'Actividades y atracciones destacadas para este día.',
      imageUrl: d.imageUrl,
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
        normalizedDays.push(refDay);
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

  const destinationName =
    typeof rawTrip.destination === 'string' && rawTrip.destination.trim()
      ? rawTrip.destination.split(',')[0].trim()
      : fallbackMeta.destination;
  const country =
    typeof rawTrip.country === 'string' &&
    rawTrip.country.trim() &&
    rawTrip.country.trim().toLowerCase() !== 'internacional' &&
    rawTrip.country.trim().toLowerCase() !== 'país correspondiente'
      ? rawTrip.country.trim()
      : fallbackMeta.country;
  const region =
    typeof rawTrip.region === 'string' && rawTrip.region.trim()
      ? rawTrip.region.trim()
      : fallbackMeta.region;
  const commune =
    typeof rawTrip.commune === 'string' && rawTrip.commune.trim()
      ? rawTrip.commune.trim()
      : fallbackMeta.commune;
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
    imageUrl:
      rawTrip.imageUrl ||
      'https://images.pexels.com/photos/17808457/pexels-photo-17808457.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
    isFavorite: false,
    whyThisRoute: rawTrip.whyThisRoute || 'Ruta diseñada para maximizar experiencias y optimizar tiempos.',
    savingTips:
      Array.isArray(rawTrip.savingTips) && rawTrip.savingTips.length > 0
        ? rawTrip.savingTips
        : ['Prefiere transporte público o caminatas', 'Prueba el menú del día local'],
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
 * Permite activar o desactivar modelos específicos (gemini, openai, openrouter).
 */
export function getActiveAiModels(): string[] {
  const envVal = (process.env.ACTIVE_AI_MODELS || process.env.ENABLED_AI_MODELS || 'gemini,openai,openrouter').trim();
  return envVal
    .split(',')
    .map((m) => m.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Determina si el modo offline está explícitamente activado.
 * Por defecto es false (en la nube de GCP no se utiliza modo offline según requerimiento).
 */
export function isOfflineModeEnabled(): boolean {
  const envVal = (process.env.ENABLE_OFFLINE_MODE || process.env.ENABLE_OFFLINE_FALLBACK || 'false').trim().toLowerCase();
  return envVal === 'true' || envVal === '1' || envVal === 'yes';
}

/**
 * Orquestador Principal de Rutas con Selección Dinámica de Modelos (ACTIVE_AI_MODELS):
 * - Consulta Clima en Vivo (Open-Meteo API + modelo climático por latitud/hemisferio)
 * - Itera en orden por los modelos activos especificados en process.env.ACTIVE_AI_MODELS:
 *     * 'gemini': Google Gemini API
 *     * 'openai': OpenAI API
 *     * 'openrouter': OpenRouter API
 * - En la nube de GCP el modo offline está desactivado por defecto (salvo ENABLE_OFFLINE_MODE=true).
 */
export async function planRouteWithAI(input: PlanRouteInput): Promise<Trip> {
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
  if (isOfflineModeEnabled()) {
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

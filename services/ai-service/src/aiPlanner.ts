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
export const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

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
function buildPrompt(
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
4. Cada día en "days" debe ser cronológico, tener un sector/comuna distintivo y actividades reales con costos en CLP.

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
            "title": "Nombre de la Actividad",
            "description": "Descripción clara del lugar.",
            "costText": "$10.000 CLP",
            "costAmount": 10000,
            "category": "Cultura",
            "categoryIcon": "🏛️",
            "isFood": false,
            "whyIncluded": "Por qué se incluye",
            "history": "Reseña histórica del lugar.",
            "historicalFacts": ["Año: Hito histórico"],
            "curiosity": "Dato curioso del lugar.",
            "architectureOrHeritage": "Estilo patrimonial.",
            "savingTip": "Tip de ahorro"
          }
        },
        {
          "type": "transfer",
          "data": {
            "id": "tr-1-1",
            "text": "Caminata o transporte local · 15 min",
            "icon": "🚶"
          }
        }
      ]
    }
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
  const modelToUse = (modelOverride || process.env.GEMINI_MODEL || GEMINI_MODEL || 'gemini-2.0-flash').trim();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelToUse}:generateContent?key=${apiKey}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 40000);
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

  const modelToUse = (modelOverride || process.env.OPENAI_MODEL || OPENAI_MODEL || 'gpt-4o-mini').trim();
  const isClassicGpt = /^gpt-(3\.5|4)/i.test(modelToUse);

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

  const executeRequest = async (payload: Record<string, any>, timeoutMs = 45000) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
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
    response = await executeRequest(buildPayload(modelToUse), isClassicGpt ? 35000 : 45000);
  } catch (networkOrAbortErr: any) {
    if (modelToUse !== 'gpt-4o-mini') {
      console.warn(
        `[ai-service][Nivel 1] El modelo "${modelToUse}" excedió el tiempo de espera o abortó (${networkOrAbortErr?.message || networkOrAbortErr}). Reintentando Nivel 1 con "gpt-4o-mini"...`
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
      console.warn(
        `[ai-service][Nivel 1] Ajustando parámetros de compatibilidad para modelo OpenAI "${modelToUse}"...`
      );
      response = await executeRequest(buildPayload(modelToUse, retryOpts), 45000);
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
    const timeoutId = setTimeout(() => controller.abort(), 25000);
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
function normalizeCloudTripResponse(
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

  const normalizedDays = rawTrip.days.map((d: any, idx: number) => {
    const rawItems = Array.isArray(d.items)
      ? d.items
      : Array.isArray(d.activities)
      ? d.activities.map((act: any, actIdx: number) => ({
          type: 'activity' as const,
          data: {
            id: act.id || `act-${idx + 1}-${actIdx + 1}`,
            timeRange: act.timeRange || act.time || '09:30 - 11:30',
            startTime: act.startTime || '09:30',
            endTime: act.endTime || '11:30',
            title: act.title || act.name || `Actividad ${actIdx + 1}`,
            description: act.description || `Recorrido en ${input.destination}.`,
            costAmount: Number(act.costAmount ?? act.costCLP ?? act.cost ?? 10000),
            costText:
              act.costText ||
              `$${Number(act.costAmount ?? act.costCLP ?? act.cost ?? 10000).toLocaleString('es-CL')} CLP`,
            category: act.category || 'Cultura',
            categoryIcon: act.categoryIcon || '🏛️',
            isFood: Boolean(act.isFood),
            whyIncluded: act.whyIncluded || 'Recomendado por relevancia local.',
            history: act.history,
            historicalFacts: act.historicalFacts,
            curiosity: act.curiosity,
            architectureOrHeritage: act.architectureOrHeritage,
            savingTip: act.savingTip,
          },
        }))
      : [];

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

    const activitiesList = enrichedItems
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
      items: enrichedItems,
    };
  });

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
 * Orquestador Principal con Cascada de Resiliencia Estricta en 3 Niveles + Consulta Meteorológica Paralela:
 * - Consulta Clgeminiima en Vivo (Open-Meteo API + modelo climático por latitud/hemisferio)
 * - NIVEL 1: OpenAI API (max_completion_tokens, fallback automático a gpt-4o-mini si el modelo no existe)
 * - NIVEL 2: OpenRouter API (OPENROUTER_MODEL, por defecto openrouter/free)
 * - NIVEL 3: Motor Local Offline (generateLocalOfflineItinerary en CLP)
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

/** nivel 0 */
const geminiKey = (process.env.GEMINI_API_KEY || '').trim();
if (geminiKey) {
  try {
    const configuredGeminiModel = (process.env.GEMINI_MODEL || GEMINI_MODEL || 'gemini-2.0-flash').trim();
    console.log(`[ai-service][Gemini] Intentando generación con Gemini (${configuredGeminiModel})...`);
    const [geminiResult, liveWeather] = await Promise.all([
      callGemini(prompt, geminiKey),
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
    console.warn('[ai-service][Gemini] Gemini devolvió un JSON sin días válidos. Saltando al siguiente nivel...');
  } catch (geminiErr: any) {
    console.warn(
      `[ai-service][Gemini] Falló Gemini API (${geminiErr?.message || geminiErr}). Saltando al siguiente nivel...`
    );
  }
} else {
  console.warn('[ai-service][Gemini] GEMINI_API_KEY no configurada en .env. Saltando al siguiente nivel...');
}
  // =========================================================================
  // NIVEL 1: Intento primario con OpenAI API
  // =========================================================================
  const openAiKey = (process.env.OPENAI_API_KEY || '').trim();
  if (!openAiKey) {
    console.warn('[ai-service][Nivel 1] OPENAI_API_KEY no configurada en .env. Saltando a Nivel 2 (OpenRouter)...');
  } else {
    try {
      console.log(
        `[ai-service][Nivel 1] Intentando generación primaria con OpenAI (${process.env.OPENAI_MODEL || OPENAI_MODEL})...`
      );
      const [openAiResult, liveWeather] = await Promise.all([
        callOpenAI(prompt, openAiKey),
        weatherPromise,
      ]);
      if (openAiResult.data && Array.isArray(openAiResult.data.days) && openAiResult.data.days.length > 0) {
        console.log(
          `[ai-service][Nivel 1] Éxito con OpenAI (${openAiResult.model}) + Clima (${liveWeather.temperatureRange})`
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
      console.warn('[ai-service][Nivel 1] OpenAI devolvió un JSON sin días válidos. Saltando a Nivel 2 (OpenRouter)...');
    } catch (openAiErr: any) {
      console.warn(
        `[ai-service][Nivel 1] Falló OpenAI API (${openAiErr?.message || openAiErr}). Saltando automáticamente a Nivel 2 (OpenRouter)...`
      );
    }
  }

  // =========================================================================
  // NIVEL 2: Respaldo secundario con OpenRouter API
  // =========================================================================
  const openRouterKey = (process.env.OPENROUTER_API_KEY || '').trim();
  if (!openRouterKey) {
    console.warn('[ai-service][Nivel 2] OPENROUTER_API_KEY no configurada en .env. Saltando a Nivel 3 (Motor Local Offline)...');
  } else {
    try {
      const configuredModel = (process.env.OPENROUTER_MODEL || OPENROUTER_MODEL || 'openrouter/free').trim();
      console.log(`[ai-service][Nivel 2] Intentando generación con OpenRouter (${configuredModel})...`);
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
          `[ai-service][Nivel 2] Éxito con OpenRouter (${openRouterResult.model}) + Clima (${liveWeather.temperatureRange})`
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
      console.warn('[ai-service][Nivel 2] OpenRouter devolvió un JSON sin días válidos. Saltando a Nivel 3 (Motor Local Offline)...');
    } catch (openRouterErr: any) {
      console.warn(
        `[ai-service][Nivel 2] Falló OpenRouter API (${openRouterErr?.message || openRouterErr}). Saltando automáticamente a Nivel 3 (Motor Local Offline)...`
      );
    }
  }

  // =========================================================================
  // NIVEL 3: Motor Local Offline determinista en CLP + Clima Consultado
  // =========================================================================
  const liveWeather = await weatherPromise;
  console.warn(
    `[ai-service][Nivel 3] Ejecutando Motor Local Offline (generateLocalOfflineItinerary) con clima (${liveWeather.temperatureRange}) y respuesta inmediata en CLP.`
  );
  return generateLocalOfflineItinerary(input, liveWeather);
}

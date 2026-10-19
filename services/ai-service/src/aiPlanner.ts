import { GoogleGenAI } from '@google/genai';
import { Trip, BudgetLevel } from './types';
import { generateSmartTrip } from './utils/tripGenerator';
import { ensureTripHasPexelsPhotos } from './utils/photoUtils';
import { getWeatherAndClothingForTrip, getBudgetTierInfo } from './utils/weatherUtils';

/**
 * NOTE (microservices split): photo enrichment with Pexels used to happen here
 * (enrichTripWithPexels). It now lives in catalog-service (POST /photos/enrich)
 * and is orchestrated by the BFF, so this service has no dependency on Pexels
 * or on the database and can always answer with the offline engine.
 */

export interface PlanRouteInput {
  destination: string;
  startDate: string; // e.g. "2026-10-15"
  endDate: string; // e.g. "2026-10-17"
  budget: BudgetLevel;
  interests: string[];
}

// Free tier auto-routing model on OpenRouter: automatically routes to an available free model
export const OPENROUTER_MODEL = 'openrouter/free';

/**
 * Checks whether the destination is in Chile
 */
export function isChileanLocation(destination: string): boolean {
  const norm = destination.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
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
  return chileanKeywords.some(kw => norm.includes(kw));
}

/**
 * Calculates number of days between two ISO date strings
 */
function getDaysCount(startDate: string, endDate: string): number {
  try {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return Math.min(Math.max(diffDays || 2, 1), 7); // Clamp between 1 and 7 days
  } catch {
    return 2;
  }
}

/**
 * Format a date nicely (e.g. "15 de Octubre")
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
 * Builds the AI prompt for generating the trip
 */
function buildPrompt(input: PlanRouteInput, daysCount: number, isChile: boolean): string {
  const budgetLabels: Record<BudgetLevel, string> = {
    budget: 'Económico (mochilero / bajo costo, transporte público, picadas locales)',
    standard: 'Presupuesto Medio (restaurantes locales de calidad, museos y experiencias)',
    premium: 'Premium (gastronomía de autor, hoteles boutique, experiencias exclusivas)',
  };

  const interestsText = input.interests.length > 0 
    ? input.interests.join(', ') 
    : 'cultura, gastronomía, naturaleza';

  return `Actúa como un experto en planificación turística personalizada para ${input.destination} (${isChile ? 'Chile 🇨🇱' : 'Destino Internacional'}).
Genera un itinerario estructurado en JSON para ${daysCount} días.
- Presupuesto: ${budgetLabels[input.budget]}
- Intereses: ${interestsText}

REGLAS ESENCIALES:
1. Responde ÚNICAMENTE con un objeto JSON válido, sin texto fuera del JSON.
2. Cada día debe tener un título distintivo, un sector o comuna diferente, y su propio costo estimado realista en pesos chilenos (CLP).
3. Cada día debe contener de 2 a 4 actividades y traslados cronológicos.
4. Para cada actividad, incluye:
   - "history": Reseña histórica atractiva (1-2 oraciones).
   - "curiosity": Dato curioso o anécdota local.
   - "architectureOrHeritage": Valor arquitectónico o patrimonial.
   - "savingTip": Consejo para ahorrar dinero o tiempo.
   - "historicalFacts": Array con 2 hitos históricos con año (ej: ["1872: Inicio de paseo público"]).

ESTRUCTURA EXACTA REQUERIDA DEL JSON:
{
  "title": "Ruta ${input.destination}",
  "destination": "${input.destination}",
  "datesText": "${input.startDate} - ${input.endDate}",
  "startDate": "${input.startDate}",
  "endDate": "${input.endDate}",
  "budgetLevel": "${input.budget}",
  "budgetLabel": "Económico / Presupuesto Medio / Premium",
  "totalCost": 80000,
  "currency": "CLP",
  "summary": "Resumen conciso del recorrido.",
  "season": "Primavera / Verano / Otoño / Invierno",
  "imageUrl": "https://images.unsplash.com/photo-1518457607834-6e8d80c183c5?w=800&q=80",
  "whyThisRoute": "Por qué esta ruta se adapta a tus intereses.",
  "savingTips": ["Consejo 1", "Consejo 2"],
  "days": [
    {
      "dayNumber": 1,
      "dateFormatted": "Día 1",
      "dailyCost": 40000,
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
            "costText": "Gratis o $10.000 CLP",
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
            "text": "Caminata o metro · 10 min",
            "icon": "🚶‍♂️"
          }
        }
      ]
    }
  ]
}`;
}

/**
 * Executes a promise with a timeout rejection
 */
function withTimeout<T>(promise: Promise<T>, ms: number, timeoutMsg: string): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timer = setTimeout(() => reject(new Error(timeoutMsg)), ms);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timer));
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
function extractJson(text: string): any {
  if (!text || typeof text !== 'string') {
    throw new Error('Respuesta de texto vacía o inválida');
  }
  const trimmed = text.trim();

  // 1. Direct parse attempt
  try {
    return JSON.parse(trimmed);
  } catch {}

  // 2. Markdown code block extraction
  const jsonBlockMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (jsonBlockMatch && jsonBlockMatch[1]) {
    try {
      return JSON.parse(jsonBlockMatch[1].trim());
    } catch {}
  }

  // 3. Substring between first { and last }
  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    const candidate = trimmed.substring(firstBrace, lastBrace + 1);
    try {
      return JSON.parse(candidate);
    } catch {}
  }

  // 4. Try repairing truncated JSON
  const repaired = repairTruncatedJson(trimmed);
  if (repaired && typeof repaired === 'object') {
    return repaired;
  }

  throw new Error('No se pudo extraer un objeto JSON válido del texto del modelo');
}

/**
 * Call OpenRouter API with fallback among free models
 */
async function callOpenRouter(prompt: string): Promise<{ data: any; model: string }> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY is not configured');
  }

  const modelToUse = OPENROUTER_MODEL; // 'openrouter/free'
  console.log(`[OpenRouter] Solicitando generación con modelo exacto: "${modelToUse}" (auto-enrutamiento a modelo gratuito disponible)...`);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  let response: Response;
  try {
    response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.APP_URL || 'https://flyway.app',
        'X-Title': 'Flyway ODC Itinerary Planner',
      },
      body: JSON.stringify({
        model: modelToUse,
        messages: [
          {
            role: 'system',
            content: 'Eres un motor de planificación de rutas turísticas de alta precisión. Responde ÚNICAMENTE con JSON válido conforme a la estructura solicitada, sin bloques markdown ```json ni texto adicional.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 4096,
      }),
    });
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    const errorText = await response.text();
    console.warn(`[OpenRouter] Error en modelo ${modelToUse} (HTTP ${response.status}):`, errorText);
    throw new Error(`OpenRouter HTTP ${response.status}: ${errorText}`);
  }

  const jsonResult = (await response.json()) as any;

  if (jsonResult.error) {
    const err = jsonResult.error;
    const errMsg = typeof err === 'string' ? err : err.message || JSON.stringify(err);
    throw new Error(`OpenRouter error (${err.code || 'provider_error'}): ${errMsg}`);
  }

  // Support choices[0].message.content, choices[0].text, or reasoning if content is empty
  let content = jsonResult.choices?.[0]?.message?.content;
  if (!content && jsonResult.choices?.[0]?.text) {
    content = jsonResult.choices[0].text;
  }
  if (!content && jsonResult.choices?.[0]?.message?.reasoning) {
    content = jsonResult.choices[0].message.reasoning;
  }
  if (!content && Array.isArray(jsonResult.choices?.[0]?.message?.reasoning_details)) {
    content = jsonResult.choices[0].message.reasoning_details
      .map((d: any) => d.text || '')
      .filter(Boolean)
      .join('\n');
  }

  if (!content || typeof content !== 'string' || content.trim().length === 0) {
    const detail = JSON.stringify(jsonResult.choices?.[0] || jsonResult).slice(0, 200);
    throw new Error(`OpenRouter (${modelToUse}) devolvió respuesta sin contenido. Detalle: ${detail}`);
  }

  const parsed = extractJson(content);
  // OpenRouter reporta el modelo real seleccionado en jsonResult.model
  const resolvedModel = jsonResult.model ? `openrouter/free (${jsonResult.model})` : 'openrouter/free';
  return { data: parsed, model: resolvedModel };
}

/**
 * Call Gemini API using @google/genai
 * Models supported: gemini-3.6-flash, gemini-3.8-flash, gemini-3.1-flash-lite
 */
async function callGemini(prompt: string): Promise<{ data: any; model: string }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  const ai = new GoogleGenAI({ apiKey });
  // Models in preference order: try responsive flash models and flash-lite
  const candidateModels = ['gemini-3.6-flash', 'gemini-3.1-flash-lite', 'gemini-3.8-flash'];
  let lastError: any = null;

  for (const model of candidateModels) {
    try {
      console.log(`[Gemini] Intentando generar itinerario con modelo: ${model}...`);
      const generatePromise = ai.models.generateContent({
        model: model,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.6,
        },
      });

      const response = await withTimeout(
        generatePromise,
        6000,
        `Timeout esperando respuesta de Gemini (${model})`
      );

      const text = response.text?.trim() || '{}';
      const parsed = extractJson(text);
      return { data: parsed, model: `Gemini (${model})` };
    } catch (err: any) {
      console.warn(`[Gemini] Error con modelo ${model}:`, err?.message || err);
      lastError = err;
      // Continue to next candidate model if available
    }
  }

  throw lastError || new Error('No fue posible generar el itinerario con los modelos disponibles de Gemini');
}

/**
 * Fallback synthesizer for any destination (specialized in Chile & World)
 * Guarantees every single day has DIFFERENT destinations, DIFFERENT comunas/sectors, and DIFFERENT money.
 */
export function synthesizeFallbackTrip(input: PlanRouteInput): Trip {
  const isChile = isChileanLocation(input.destination);
  const trip = generateSmartTrip({
    destination: input.destination,
    startDate: input.startDate,
    endDate: input.endDate,
    budget: input.budget,
    interests: input.interests,
  });

  return {
    ...trip,
    currency: 'CLP',
    generatedByModel: 'Flyway Intelligent Engine (Chile & World Knowledge Base)',
    aiSource: 'synthesis',
    destinationCountry: isChile ? 'Chile 🇨🇱' : 'Internacional 🌎',
    isChileanDestination: isChile,
  };
}

/**
 * Main Orchestrator:
 * 1. Tries OpenRouter with Free Models if OPENROUTER_API_KEY is available.
 * 2. If OpenRouter is not set or fails, tries Gemini API with GEMINI_API_KEY.
 * 3. If both fail or are offline, falls back to the specialized synthesis engine.
 */
export async function planRouteWithAI(input: PlanRouteInput): Promise<Trip> {
  const daysCount = getDaysCount(input.startDate, input.endDate);
  const isChile = isChileanLocation(input.destination);
  const prompt = buildPrompt(input, daysCount, isChile);

  let rawTrip: any = null;
  let modelName = '';
  let aiSource: 'openrouter' | 'gemini' | 'synthesis' = 'synthesis';

  // 1. Intentar OpenRouter con modelos FREE
  if (process.env.OPENROUTER_API_KEY) {
    try {
      console.log('[AI Planner] Intentando consulta con OpenRouter (Modelos Free)...');
      const result = await callOpenRouter(prompt);
      rawTrip = result.data;
      modelName = result.model;
      aiSource = 'openrouter';
      console.log(`[AI Planner] Éxito con ${modelName}`);
    } catch (openRouterErr) {
      console.warn('[AI Planner] Falló OpenRouter, intentando Gemini como respaldo:', openRouterErr);
    }
  }

  // 2. Si OpenRouter no está configurado o falló, intentar Gemini
  if (!rawTrip && process.env.GEMINI_API_KEY) {
    try {
      console.log('[AI Planner] Intentando consulta con Gemini API...');
      const result = await callGemini(prompt);
      rawTrip = result.data;
      modelName = result.model;
      aiSource = 'gemini';
      console.log(`[AI Planner] Éxito con ${modelName}`);
    } catch (geminiErr) {
      console.warn('[AI Planner] Falló Gemini, utilizando motor de síntesis especializada:', geminiErr);
    }
  }

  // 3. Fallback inteligente (Motor Local / Offline)
  if (!rawTrip || !Array.isArray(rawTrip.days) || rawTrip.days.length === 0) {
    console.log('[AI Planner] Usando motor de síntesis turístico (Chile & Mundo)');
    return synthesizeFallbackTrip(input);
  }

  // Normalizar y enriquecer el Trip devuelto por la IA
  const budgetInfoMap = {
    budget: 'Económico',
    standard: 'Presupuesto Medio',
    premium: 'Premium',
  };
  const weatherInfo = getWeatherAndClothingForTrip(input.destination, input.startDate, input.endDate);
  const budgetTier = getBudgetTierInfo(input.budget);

  const finalTrip: Trip = {
    id: `trip-ai-${Date.now()}`,
    title: rawTrip.title || `Itinerario por ${input.destination}`,
    destination: input.destination,
    datesText: rawTrip.datesText || `${formatDateSpanish(input.startDate)} - ${formatDateSpanish(input.endDate)}`,
    startDate: input.startDate,
    endDate: input.endDate,
    budgetLevel: input.budget,
    budgetLabel: rawTrip.budgetLabel || budgetInfoMap[input.budget],
    budgetRangeText: budgetTier.dailyRangeText,
    budgetDescription: budgetTier.description,
    totalCost: Number(rawTrip.totalCost) || (input.budget === 'budget' ? 30000 * daysCount : 60000 * daysCount),
    currency: rawTrip.currency || 'CLP',
    summary: rawTrip.summary || `Recorrido personalizado por ${input.destination}.`,
    season: weatherInfo.season,
    currentSeason: weatherInfo.currentSeason,
    weatherCondition: rawTrip.weatherCondition || weatherInfo.weatherCondition,
    temperatureRange: rawTrip.temperatureRange || weatherInfo.temperatureRange,
    weatherSummary: rawTrip.weatherSummary || weatherInfo.weatherSummary,
    clothingTip: rawTrip.clothingTip || weatherInfo.clothingTip,
    clothingItems: weatherInfo.clothingItems,
    imageUrl: rawTrip.imageUrl || 'https://images.pexels.com/photos/17808457/pexels-photo-17808457.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
    isFavorite: false,
    whyThisRoute: rawTrip.whyThisRoute || 'Ruta diseñada para maximizar experiencias y optimizar tiempos.',
    savingTips: Array.isArray(rawTrip.savingTips) && rawTrip.savingTips.length > 0 
      ? rawTrip.savingTips 
      : ['Prefiere transporte público o caminatas', 'Prueba el menú del día local'],
    days: rawTrip.days.map((d: any, idx: number) => ({
      dayNumber: d.dayNumber || idx + 1,
      dateFormatted: d.dateFormatted || formatDateSpanish(input.startDate, idx),
      dailyCost: Number(d.dailyCost) || Math.round((Number(rawTrip.totalCost) || 50000) / daysCount),
      title: d.title || `Día ${d.dayNumber || idx + 1}: Explorando ${input.destination}`,
      summary: d.summary || `Actividades y atracciones destacadas para este día.`,
      imageUrl: d.imageUrl,
      items: Array.isArray(d.items) ? d.items.map((item: any) => {
        if (item.type === 'activity' && item.data) {
          const act = item.data;
          return {
            ...item,
            data: {
              ...act,
              history: act.history || (isChile
                ? `Emplazado en una de las zonas de mayor valor patrimonial de ${input.destination}, este sitio conserva vestigios del florecimiento cívico e industrial local, integrando elementos de diseño colonial y republicano reconocidos por historiadores.`
                : `Hito representativo de ${input.destination} que atesora siglos de evolución histórica y arquitectónica, testigo del desarrollo cívico y artístico de la ciudad.`),
              curiosity: act.curiosity || `En este lugar se realizaban antiguamente reuniones ciudadanas y ferias de trueque entre comerciantes de distintas comarcas.`,
              architectureOrHeritage: act.architectureOrHeritage || (isChile
                ? 'Monumento y Zona Típica de valor patrimonial con arquitectura de fachada continua y materiales nobles tradicionales.'
                : 'Patrimonio arquitectónico e histórico protegido.'),
              historicalFacts: Array.isArray(act.historicalFacts) && act.historicalFacts.length > 0
                ? act.historicalFacts
                : [
                    'Orígenes: Primeros asentamientos y trazado fundacional de la zona.',
                    'Siglo XIX-XX: Transformación urbana y consolidación como paseo de encuentro.',
                    'Actualidad: Punto protegido de identidad cultural y visita obligada para turistas.'
                  ],
              savingTip: act.savingTip || 'Visitar en las primeras horas de la mañana ofrece mejor luz para fotos y menor afluencia.',
            }
          };
        }
        return item;
      }) : [],
    })),
    generatedByModel: modelName,
    aiSource: aiSource,
    destinationCountry: isChile ? 'Chile 🇨🇱' : 'Internacional 🌎',
    isChileanDestination: isChile,
  };

  // Enriquecer con fotos para el viaje, cada día y cada actividad
  const enrichedTrip = ensureTripHasPexelsPhotos(finalTrip);
  return enrichedTrip;
}

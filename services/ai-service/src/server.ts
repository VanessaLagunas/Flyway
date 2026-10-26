import express, { Request, Response } from 'express';
import path from 'node:path';
import dotenv from 'dotenv';
import {
  planRouteWithAI,
  generateLocalOfflineItinerary,
  PlanRouteInput,
  OPENAI_MODEL,
  OPENROUTER_MODEL,
  getActiveAiModels,
  isOfflineModeEnabled,
  getOpenAiTimeoutMs,
} from './aiPlanner';
import { fetchWeatherAndClothingForTrip } from './utils/weatherUtils';
import { BudgetLevel } from './types';

dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });

const app = express();
const PORT = Number(process.env.PORT) || 4001;

app.use(express.json({ limit: '10mb' }));

// Healthcheck
app.get('/health', (_req: Request, res: Response) => {
  const currentModel = process.env.OPENAI_MODEL || OPENAI_MODEL;
  res.json({
    status: 'ok',
    service: 'ai-service',
    port: PORT,
    activeAiModels: getActiveAiModels(),
    offlineModeEnabled: isOfflineModeEnabled(),
    hasGemini: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim()),
    hasOpenAI: Boolean(process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim()),
    openAiModel: currentModel,
    openAiTimeoutMs: getOpenAiTimeoutMs(currentModel),
    hasOpenRouter: Boolean(process.env.OPENROUTER_API_KEY && process.env.OPENROUTER_API_KEY.trim()),
    openRouterModel: process.env.OPENROUTER_MODEL || OPENROUTER_MODEL,
    timestamp: new Date().toISOString(),
  });
});

// Endpoint dedicado para consultar el clima y vestimenta de un destino y rango de fechas
app.get('/weather', async (req: Request, res: Response) => {
  try {
    const destination = String(req.query.destination || req.query.q || 'Santiago').trim();
    const today = new Date().toISOString().split('T')[0];
    const startDate = String(req.query.startDate || today);
    const endDate = String(req.query.endDate || startDate);

    const weather = await fetchWeatherAndClothingForTrip(destination, startDate, endDate);
    return res.status(200).json({
      success: true,
      destination,
      startDate,
      endDate,
      ...weather,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Error consultando el clima' });
  }
});

// Endpoint para generar itinerario con Cascada de Resiliencia (OpenAI -> OpenRouter -> Offline Local CLP)
async function handleGenerate(req: Request, res: Response) {
  try {
    const { destination, startDate, endDate, budget, interests } = req.body || {};

    if (!destination || typeof destination !== 'string' || !destination.trim()) {
      return res.status(400).json({ error: 'El campo destination es obligatorio.' });
    }

    const validBudgets: BudgetLevel[] = ['budget', 'standard', 'premium'];
    const normalizedBudget: BudgetLevel = validBudgets.includes(budget as BudgetLevel)
      ? (budget as BudgetLevel)
      : 'standard';

    const input: PlanRouteInput = {
      destination: destination.trim(),
      startDate: startDate || new Date().toISOString().split('T')[0],
      endDate: endDate || new Date().toISOString().split('T')[0],
      budget: normalizedBudget,
      interests: Array.isArray(interests) ? interests.map(String) : [],
    };

    console.log(`[ai-service] Generando itinerario para "${input.destination}" (${input.startDate} a ${input.endDate})`);

    let trip;
    try {
      trip = await planRouteWithAI(input);
    } catch (aiErr: any) {
      if (isOfflineModeEnabled()) {
        console.warn('[ai-service] Falló planRouteWithAI, activando generateLocalOfflineItinerary (offline habilitado):', aiErr?.message || aiErr);
        const liveWeather = await fetchWeatherAndClothingForTrip(input.destination, input.startDate, input.endDate);
        trip = generateLocalOfflineItinerary(input, liveWeather);
      } else {
        console.error('[ai-service] Falló planRouteWithAI y el modo offline está desactivado:', aiErr?.message || aiErr);
        return res.status(502).json({
          success: false,
          error: aiErr?.message || 'Error al generar la ruta con los modelos de IA activos en la nube.',
        });
      }
    }

    // Garantizar el Contrato de Salida Unificado en la raíz del JSON
    if (!Array.isArray(trip.days) || trip.days.length === 0) {
      if (isOfflineModeEnabled()) {
        trip = generateLocalOfflineItinerary(input);
      } else {
        return res.status(502).json({
          success: false,
          error: 'El modelo de IA no devolvió días válidos en el itinerario.',
        });
      }
    }

    const responsePayload = {
      success: true,
      ...trip,
      destination: trip.destination,
      country: trip.country || 'Chile',
      region: trip.region || 'Región de Chile',
      commune: trip.commune || trip.destination,
      avgDailyCostCLP: Number(trip.avgDailyCostCLP) || Math.round((Number(trip.totalCost) || 50000) / Math.max(trip.days.length, 1)),
      tags: Array.isArray(trip.tags) && trip.tags.length > 0 ? trip.tags : ['cultura', 'gastronomia', 'naturaleza'],
      description: trip.description || trip.summary || `Destino turístico ${trip.destination}.`,
      currency: 'CLP' as const,
      totalEstimatedCostCLP: Number(trip.totalEstimatedCostCLP ?? trip.totalCost) || 50000,
      days: trip.days,
      sourceEngine: trip.sourceEngine || 'cloud_ai',
      trip,
    };

    return res.status(200).json(responsePayload);
  } catch (error: any) {
    console.error('[ai-service] Error crítico en handleGenerate:', error?.message || error);
    if (isOfflineModeEnabled()) {
      const { destination, startDate, endDate, budget, interests } = req.body || {};
      const fallbackInput: PlanRouteInput = {
        destination: (typeof destination === 'string' && destination.trim()) ? destination.trim() : 'Santiago',
        startDate: startDate || new Date().toISOString().split('T')[0],
        endDate: endDate || new Date().toISOString().split('T')[0],
        budget: (budget as BudgetLevel) || 'standard',
        interests: Array.isArray(interests) ? interests : [],
      };
      const safeTrip = generateLocalOfflineItinerary(fallbackInput);
      return res.status(200).json({
        success: true,
        ...safeTrip,
        currency: 'CLP',
        sourceEngine: 'offline_local',
        trip: safeTrip,
      });
    }

    return res.status(500).json({
      success: false,
      error: error?.message || 'Error interno en el servicio de IA.',
    });
  }
}

app.post('/generate', handleGenerate);
app.post('/plan-route', handleGenerate);

export { app };

if (process.env.NODE_ENV !== 'test' && !process.argv.some(arg => arg.includes('test'))) {
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`🧠 AI Service corriendo en http://0.0.0.0:${PORT}`);
  });
  const openAiTimeout = getOpenAiTimeoutMs();
  server.setTimeout(openAiTimeout + 30000);
  if ('requestTimeout' in server) {
    (server as any).requestTimeout = openAiTimeout + 30000;
  }
}

import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import { planRouteWithAI, synthesizeFallbackTrip, PlanRouteInput } from './aiPlanner';
import { BudgetLevel } from './types';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 4001;

app.use(express.json({ limit: '10mb' }));

// Healthcheck
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'ai-service',
    port: PORT,
    hasGemini: !!process.env.GEMINI_API_KEY,
    hasOpenRouter: !!process.env.OPENROUTER_API_KEY,
    timestamp: new Date().toISOString(),
  });
});

// Endpoint para generar itinerario
async function handleGenerate(req: Request, res: Response) {
  try {
    const { destination, startDate, endDate, budget, interests } = req.body;

    if (!destination || typeof destination !== 'string' || !destination.trim()) {
      return res.status(400).json({ error: 'El campo destination es obligatorio.' });
    }

    const input: PlanRouteInput = {
      destination: destination.trim(),
      startDate: startDate || new Date().toISOString().split('T')[0],
      endDate: endDate || new Date().toISOString().split('T')[0],
      budget: (budget as BudgetLevel) || 'standard',
      interests: Array.isArray(interests) ? interests : [],
    };

    console.log(`[ai-service] Generando itinerario para "${input.destination}" (${input.startDate} a ${input.endDate})`);

    let trip;
    try {
      trip = await planRouteWithAI(input);
    } catch (aiErr) {
      console.warn('[ai-service] Falló planRouteWithAI, recurriendo a motor local/offline:', aiErr);
      trip = synthesizeFallbackTrip(input);
    }

    // Garantizar currency CLP y días cronológicos
    if (!trip.currency) {
      trip.currency = 'CLP';
    }
    if (!Array.isArray(trip.days) || trip.days.length === 0) {
      const fallback = synthesizeFallbackTrip(input);
      trip.days = fallback.days;
      trip.currency = 'CLP';
    }

    // Retornamos el objeto trip extendido para soportar tanto acceso root (res.body.currency, res.body.days)
    // como anidado (res.body.trip, res.body.success)
    return res.json({
      success: true,
      ...trip,
      trip,
    });
  } catch (error: any) {
    console.error('[ai-service] Error crítico al procesar solicitud:', error);
    try {
      const { destination, startDate, endDate, budget, interests } = req.body || {};
      const fallbackInput: PlanRouteInput = {
        destination: destination || 'Chile',
        startDate: startDate || new Date().toISOString().split('T')[0],
        endDate: endDate || new Date().toISOString().split('T')[0],
        budget: (budget as BudgetLevel) || 'standard',
        interests: Array.isArray(interests) ? interests : [],
      };
      const safeTrip = synthesizeFallbackTrip(fallbackInput);
      return res.json({
        success: true,
        ...safeTrip,
        trip: safeTrip,
      });
    } catch (criticalErr: any) {
      return res.status(500).json({
        error: error?.message || 'Error interno en ai-service',
      });
    }
  }
}

app.post('/generate', handleGenerate);
app.post('/plan-route', handleGenerate);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🧠 AI Service corriendo en http://0.0.0.0:${PORT}`);
});

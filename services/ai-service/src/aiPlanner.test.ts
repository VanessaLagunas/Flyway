import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  getActiveAiModels,
  isOfflineModeEnabled,
  buildPrompt,
  normalizeCloudTripResponse,
  planRouteWithAI,
  PlanRouteInput,
  GEMINI_MODEL,
  OPENAI_MODEL,
  getOpenAiTimeoutMs,
  getGeminiTimeoutMs,
  getOpenRouterTimeoutMs,
} from './aiPlanner';

describe('AI Planner Requirements Verification', () => {
  describe('Requirement 3: ACTIVE_AI_MODELS environment variable configuration', () => {
    const originalModels = process.env.ACTIVE_AI_MODELS;
    const originalFallback = process.env.ENABLED_AI_MODELS;

    it('returns default models [gemini, openai, openrouter] when env var is not set', () => {
      delete process.env.ACTIVE_AI_MODELS;
      delete process.env.ENABLED_AI_MODELS;
      const models = getActiveAiModels();
      assert.deepEqual(models, ['gemini', 'openai', 'openrouter']);
    });

    it('parses single active model correctly', () => {
      process.env.ACTIVE_AI_MODELS = 'gemini';
      assert.deepEqual(getActiveAiModels(), ['gemini']);
    });

    it('parses multiple models with spaces and uppercase letters', () => {
      process.env.ACTIVE_AI_MODELS = ' Gemini , OpenAI ';
      assert.deepEqual(getActiveAiModels(), ['gemini', 'openai']);
    });

    it('allows activating only openrouter', () => {
      process.env.ACTIVE_AI_MODELS = 'openrouter';
      assert.deepEqual(getActiveAiModels(), ['openrouter']);
    });

    // Cleanup
    process.env.ACTIVE_AI_MODELS = originalModels;
    if (originalFallback !== undefined) process.env.ENABLED_AI_MODELS = originalFallback;
  });

  describe('Requirement 2: Offline mode disabled for cloud GCP deployment', () => {
    const originalOffline = process.env.ENABLE_OFFLINE_MODE;

    it('defaults to false when unset', () => {
      delete process.env.ENABLE_OFFLINE_MODE;
      assert.equal(isOfflineModeEnabled(), false);
    });

    it('returns false when set to "false"', () => {
      process.env.ENABLE_OFFLINE_MODE = 'false';
      assert.equal(isOfflineModeEnabled(), false);
    });

    it('returns true when explicitly set to "true"', () => {
      process.env.ENABLE_OFFLINE_MODE = 'true';
      assert.equal(isOfflineModeEnabled(), true);
    });

    it('throws error in planRouteWithAI when offline mode is disabled and no models succeed', async () => {
      process.env.ENABLE_OFFLINE_MODE = 'false';
      process.env.ACTIVE_AI_MODELS = 'unknown_model'; // Force no model match
      const input: PlanRouteInput = {
        destination: 'Santiago',
        startDate: '2026-11-01',
        endDate: '2026-11-02',
        budget: 'standard',
        interests: ['cultura'],
      };

      await assert.rejects(
        async () => {
          await planRouteWithAI(input);
        },
        (err: any) => {
          assert.match(err.message, /No se pudo generar el itinerario en la nube/);
          assert.match(err.message, /El modo offline se encuentra desactivado/);
          return true;
        }
      );
    });

    it('falls back to offline engine only when ENABLE_OFFLINE_MODE=true', async () => {
      process.env.ENABLE_OFFLINE_MODE = 'true';
      process.env.ACTIVE_AI_MODELS = 'unknown_model';
      const input: PlanRouteInput = {
        destination: 'Pucón',
        startDate: '2026-11-01',
        endDate: '2026-11-02',
        budget: 'standard',
        interests: ['naturaleza'],
      };

      const trip = await planRouteWithAI(input);
      assert.ok(trip);
      assert.equal(trip.sourceEngine, 'offline_local');
      assert.ok(trip.days.length >= 2);
    });

    // Cleanup
    process.env.ENABLE_OFFLINE_MODE = originalOffline;
  });

  describe('Requirement 1: 3 to 4 panoramas/stops per day (Never single stop)', () => {
    it('prompt explicitly instructs AI to return 3 to 4 panoramas per day and never a single stop', () => {
      const input: PlanRouteInput = {
        destination: 'Valparaíso',
        startDate: '2026-11-01',
        endDate: '2026-11-02',
        budget: 'standard',
        interests: ['cultura', 'gastronomia'],
      };
      const weatherHint = {
        season: 'Primavera' as const,
        currentSeason: 'Primavera' as const,
        temperatureRange: '14°C - 22°C',
        weatherCondition: 'Soleado y templado',
        weatherSummary: 'Clima agradable',
        clothingTip: 'Ropa en capas',
        clothingItems: ['👕 Polera', '🧥 Cortavientos', '👖 Pantalón ligero', '🕶️ Lentes de sol'],
        seasonIcon: '🌸',
        currentSeasonIcon: '🌸',
        daysCount: 2,
        hemisphere: 'Sur' as const,
        source: 'climate-model' as const,
      };

      const prompt = buildPrompt(input, 2, true, weatherHint);
      assert.match(prompt, /entre 3 y 4 panoramas o paradas distribuidas cronológicamente/);
      assert.match(prompt, /¡NUNCA generes una sola parada o actividad por día!/);
      assert.match(prompt, /"id": "act-1-1"/);
      assert.match(prompt, /"id": "act-1-2"/);
      assert.match(prompt, /"id": "act-1-3"/);
      assert.match(prompt, /"id": "act-1-4"/);
    });

    it('normalizeCloudTripResponse automatically enriches raw response if day has only 1 stop', () => {
      const input: PlanRouteInput = {
        destination: 'Valdivia',
        startDate: '2026-11-01',
        endDate: '2026-11-01',
        budget: 'standard',
        interests: ['gastronomia', 'rio'],
      };

      // Raw trip with only ONE single activity in day 1 (the reported bug)
      const rawTripSingleStop = {
        title: 'Ruta Valdivia',
        destination: 'Valdivia',
        country: 'Chile',
        region: 'Los Ríos',
        commune: 'Valdivia',
        avgDailyCostCLP: 45000,
        tags: ['rio', 'gastronomia'],
        description: 'Viaje por Valdivia',
        days: [
          {
            dayNumber: 1,
            title: 'Día 1: Valdivia',
            items: [
              {
                type: 'activity',
                data: {
                  id: 'act-1-1',
                  timeRange: '10:00 - 12:00',
                  title: 'Mercado Fluvial',
                  description: 'Visita matutina al mercado de lobos marinos.',
                  costAmount: 0,
                  costText: 'Gratis',
                  category: 'Cultura',
                },
              },
            ],
          },
        ],
      };

      const normalized = normalizeCloudTripResponse(
        rawTripSingleStop,
        input,
        1,
        true,
        'gemini',
        'Gemini Flash'
      );

      const day1 = normalized.days[0];
      const activities = day1.activities;
      assert.ok(
        activities.length >= 3,
        `Expected at least 3 activities per day, but got ${activities.length}`
      );

      // Verify that Lunch/Gastronomy stop was added
      const hasFoodStop = activities.some((a) => a.isFood || a.category === 'Gastronomía');
      assert.ok(hasFoodStop, 'Expected day to include a gastronomic/lunch stop');

      // Verify that Afternoon/Evening stop was added
      const hasAfternoonStop = activities.some((a) => a.title.includes('Mirador') || a.title.includes('Cultural'));
      assert.ok(hasAfternoonStop, 'Expected day to include an afternoon cultural or panoramic stop');

      // Verify items have transfers intercalated between activities
      const transfers = day1.items.filter((it: any) => it.type === 'transfer');
      assert.ok(transfers.length >= 2, `Expected at least 2 transfers, got ${transfers.length}`);
    });

    it('normalizeCloudTripResponse preserves full 4-activity schedules without altering already complete days', () => {
      const input: PlanRouteInput = {
        destination: 'Pucón',
        startDate: '2026-11-01',
        endDate: '2026-11-01',
        budget: 'standard',
        interests: ['volcan', 'termas'],
      };

      const rawTripFourStops = {
        title: 'Ruta Pucón',
        destination: 'Pucón',
        days: [
          {
            dayNumber: 1,
            title: 'Día 1: Completo',
            items: [
              { type: 'activity', data: { id: 'act-1', title: 'Playa Grande' } },
              { type: 'transfer', data: { id: 'tr-1', text: 'Caminata 10 min' } },
              { type: 'activity', data: { id: 'act-2', title: 'Almuerzo en Centro' } },
              { type: 'transfer', data: { id: 'tr-2', text: 'Transfer 20 min' } },
              { type: 'activity', data: { id: 'act-3', title: 'Ojos del Caburgua' } },
              { type: 'transfer', data: { id: 'tr-3', text: 'Transfer 30 min' } },
              { type: 'activity', data: { id: 'act-4', title: 'Termas Geométricas' } },
            ],
          },
        ],
      };

      const normalized = normalizeCloudTripResponse(
        rawTripFourStops,
        input,
        1,
        true,
        'openai',
        'OpenAI GPT-4'
      );

      assert.equal(normalized.days[0].activities.length, 4);
      assert.equal(normalized.days[0].activities[0].title, 'Playa Grande');
      assert.equal(normalized.days[0].activities[3].title, 'Termas Geométricas');
    });

    it('normalizeCloudTripResponse parses raw "panoramas" or "paradas" field and enriches to 4 activities', () => {
      const input: PlanRouteInput = {
        destination: 'Santiago',
        startDate: '2026-11-01',
        endDate: '2026-11-01',
        budget: 'standard',
        interests: ['cultura'],
      };

      const rawTripPanoramas = {
        title: 'Ruta Santiago',
        destination: 'Santiago',
        days: [
          {
            dayNumber: 1,
            title: 'Día 1: Centro',
            panoramas: [
              {
                id: 'pan-1',
                title: 'Cerro Santa Lucía',
                description: 'Mirador patrimonial urbano',
                costAmount: 0,
              },
            ],
          },
        ],
      };

      const normalized = normalizeCloudTripResponse(
        rawTripPanoramas,
        input,
        1,
        true,
        'gemini',
        'Gemini 2.0 Flash'
      );

      const day1 = normalized.days[0];
      assert.ok(day1.activities.length >= 3, `Expected at least 3 activities, got ${day1.activities.length}`);
      assert.equal(day1.activities[0].title, 'Cerro Santa Lucía');
      assert.ok(day1.activities.some((a) => a.isFood || a.category === 'Gastronomía'), 'Must include food stop');
    });

    it('normalizeCloudTripResponse properly wraps direct unwrapped activity items', () => {
      const input: PlanRouteInput = {
        destination: 'La Serena',
        startDate: '2026-11-01',
        endDate: '2026-11-01',
        budget: 'standard',
        interests: ['playa'],
      };

      const rawTripUnwrapped = {
        title: 'Ruta La Serena',
        destination: 'La Serena',
        days: [
          {
            dayNumber: 1,
            title: 'Día 1: Faro y Playa',
            items: [
              {
                title: 'Faro Monumental',
                description: 'Icono de la avenida del mar',
                costAmount: 0,
                costText: 'Gratis',
              },
            ],
          },
        ],
      };

      const normalized = normalizeCloudTripResponse(
        rawTripUnwrapped,
        input,
        1,
        true,
        'openai',
        'GPT-4o-mini'
      );

      const day1 = normalized.days[0];
      assert.ok(day1.items.every((it: any) => it.type === 'activity' || it.type === 'transfer'));
      assert.equal(day1.activities[0].title, 'Faro Monumental');
      assert.ok(day1.activities.length >= 3);
    });

    it('normalizeCloudTripResponse synthesizes missing days and guarantees 3 to 4 activities on every day when raw response returns fewer days than requested', () => {
      const input: PlanRouteInput = {
        destination: 'Valparaíso',
        startDate: '2026-11-01',
        endDate: '2026-11-03', // 3 days requested
        budget: 'standard',
        interests: ['cultura', 'gastronomia'],
      };

      // Raw AI response only output 1 day
      const rawTripSingleDay = {
        title: 'Ruta Valparaíso',
        destination: 'Valparaíso',
        country: 'Chile',
        region: 'Valparaíso',
        commune: 'Valparaíso',
        avgDailyCostCLP: 50000,
        days: [
          {
            dayNumber: 1,
            title: 'Día 1: Cerros Alegre y Concepción',
            items: [
              {
                type: 'activity',
                data: {
                  id: 'act-1-1',
                  title: 'Ascensor Reina Victoria',
                  description: 'Paseo en ascensor patrimonial',
                  costAmount: 1000,
                  costText: '$1.000 CLP',
                  category: 'Patrimonio',
                  categoryIcon: '🚠',
                  timeRange: '10:00 - 11:30',
                  startTime: '10:00',
                  endTime: '11:30',
                },
              },
            ],
          },
        ],
      };

      const normalized = normalizeCloudTripResponse(
        rawTripSingleDay,
        input,
        3,
        true,
        'openai',
        'OpenAI (gpt-4o-mini)'
      );

      // Must have exactly 3 days
      assert.equal(normalized.days.length, 3);

      // Every day must have between 3 and 4 activities (never 1)
      for (const day of normalized.days) {
        const activities = (day.items || []).filter((i: any) => i.type === 'activity');
        assert.ok(
          activities.length >= 3 && activities.length <= 4,
          `Day ${day.dayNumber} has ${activities.length} activities; expected 3 or 4`
        );
      }
    });
  });

  describe('Model Configuration Defaults', () => {
    it('uses production-grade, available model defaults', () => {
      assert.equal(GEMINI_MODEL, 'gemini-3.8-flash');
      assert.equal(OPENAI_MODEL, 'gpt-6-luna');
    });
  });

  describe('Timeout Configurations for gpt-6-luna and AI Engines', () => {
    const originalOpenAiTimeout = process.env.OPENAI_TIMEOUT_MS;
    const originalGeminiTimeout = process.env.GEMINI_TIMEOUT_MS;
    const originalOpenRouterTimeout = process.env.OPENROUTER_TIMEOUT_MS;

    it('assigns extended timeout (180000ms / 3 min) to gpt-6-luna by default to prevent aborts', () => {
      delete process.env.OPENAI_TIMEOUT_MS;
      const timeout = getOpenAiTimeoutMs('gpt-6-luna');
      assert.ok(timeout >= 150000, `Expected at least 150000ms, got ${timeout}`);
      assert.equal(timeout, 180000);
    });

    it('assigns standard timeout (60000ms) to classic models like gpt-4o-mini', () => {
      delete process.env.OPENAI_TIMEOUT_MS;
      const timeout = getOpenAiTimeoutMs('gpt-4o-mini');
      assert.equal(timeout, 60000);
    });

    it('allows OPENAI_TIMEOUT_MS env var override for custom timeout values', () => {
      process.env.OPENAI_TIMEOUT_MS = '240000';
      const timeout = getOpenAiTimeoutMs('gpt-6-luna');
      assert.equal(timeout, 240000);
    });

    it('safely falls back to default timeout when OPENAI_TIMEOUT_MS is invalid or negative', () => {
      process.env.OPENAI_TIMEOUT_MS = 'invalid_number';
      assert.equal(getOpenAiTimeoutMs('gpt-6-luna'), 180000);

      process.env.OPENAI_TIMEOUT_MS = '-5000';
      assert.equal(getOpenAiTimeoutMs('gpt-6-luna'), 180000);

      process.env.OPENAI_TIMEOUT_MS = '0';
      assert.equal(getOpenAiTimeoutMs('gpt-6-luna'), 180000);
    });

    it('provides sensible timeouts for Gemini and OpenRouter', () => {
      delete process.env.GEMINI_TIMEOUT_MS;
      delete process.env.OPENROUTER_TIMEOUT_MS;
      assert.equal(getGeminiTimeoutMs(), 60000);
      assert.equal(getOpenRouterTimeoutMs(), 45000);

      process.env.GEMINI_TIMEOUT_MS = '75000';
      process.env.OPENROUTER_TIMEOUT_MS = '50000';
      assert.equal(getGeminiTimeoutMs(), 75000);
      assert.equal(getOpenRouterTimeoutMs(), 50000);
    });

    // Cleanup env vars
    process.env.OPENAI_TIMEOUT_MS = originalOpenAiTimeout;
    process.env.GEMINI_TIMEOUT_MS = originalGeminiTimeout;
    process.env.OPENROUTER_TIMEOUT_MS = originalOpenRouterTimeout;
  });
});

import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ActiveScreen, BudgetLevel, Trip } from './types';
import { INITIAL_SAVED_TRIPS, INITIAL_VALPARAISO_TRIP } from './data/mockTrips';
import { ODCHeader } from './odc-components/ODCHeader';
import { ODCBottomNav } from './odc-components/ODCBottomNav';
import { ODCLoadingOverlay } from './odc-components/ODCLoadingOverlay';
import { ExploreScreen } from './screens/ExploreScreen';
import { ItineraryScreen } from './screens/ItineraryScreen';
import { SavedTripsScreen } from './screens/SavedTripsScreen';
import { LoginScreen, AuthUser } from './screens/LoginScreen';
import { generateSmartTrip } from './utils/tripGenerator';
import { ensureTripHasPexelsPhotos } from './utils/photoUtils';
import { getBffUrl, parseJsonSafe } from './utils/apiUrl';
import {
  getWeatherAndClothingForTrip,
  fetchWeatherAndClothingForTrip,
  getBudgetTierInfo,
} from './utils/weatherUtils';

export default function App() {
  const [activeScreen, setActiveScreen] = useState<ActiveScreen>('explore');
  const [previousScreen, setPreviousScreen] = useState<ActiveScreen>('explore');
  const [currentTrip, setCurrentTrip] = useState<Trip>(INITIAL_VALPARAISO_TRIP);
  const [savedTrips, setSavedTrips] = useState<Trip[]>(() => {
    try {
      const cached = localStorage.getItem('flyway_saved_trips');
      if (cached) {
        const parsed = JSON.parse(cached) as Trip[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {}
    return INITIAL_SAVED_TRIPS;
  });
  const [isLoading, setIsLoading] = useState(false);
  const [loadingTitle, setLoadingTitle] = useState('Creando tu ruta con IA');
  const [loadingSubtitle, setLoadingSubtitle] = useState('Consultando modelos de IA y ajustando presupuesto…');
  const [apiError, setApiError] = useState<string | null>(null);

  const [authToken, setAuthToken] = useState<string | null>(() => {
    try {
      return localStorage.getItem('flyway_token');
    } catch {
      return null;
    }
  });

  const [userEmail, setUserEmail] = useState<string | null>(() => {
    try {
      const rawUser = localStorage.getItem('flyway_user');
      if (rawUser) {
        const parsed = JSON.parse(rawUser) as AuthUser;
        return parsed.email || null;
      }
    } catch {}
    return null;
  });

  const bffUrl = getBffUrl();

  // Verificar validez del token JWT en el servidor al cargar la aplicación
  useEffect(() => {
    if (!authToken) {
      setUserEmail(null);
      return;
    }

    fetch(`${bffUrl}/auth/me`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${authToken}` },
    })
      .then((res) => {
        if (!res.ok) {
          try {
            localStorage.removeItem('flyway_token');
            localStorage.removeItem('flyway_user');
          } catch {}
          setAuthToken(null);
          setUserEmail(null);
          return null;
        }
        return parseJsonSafe(res);
      })
      .then((data) => {
        if (data?.user?.email) {
          setUserEmail(data.user.email);
          try {
            localStorage.setItem('flyway_user', JSON.stringify(data.user));
          } catch {}
        }
      })
      .catch(() => {});
  }, [authToken, bffUrl]);

  // Persistir savedTrips en localStorage ante cualquier cambio para no perder rutas al recargar
  useEffect(() => {
    try {
      localStorage.setItem('flyway_saved_trips', JSON.stringify(savedTrips));
    } catch {}
  }, [savedTrips]);

  // Sincronizar itinerarios guardados desde el backend (con o sin token JWT)
  useEffect(() => {
    const headers: Record<string, string> = {};
    if (authToken) {
      headers.Authorization = `Bearer ${authToken}`;
    }

    fetch(`${bffUrl}/saved`, {
      method: 'GET',
      headers,
    })
      .then((res) => (res.ok ? parseJsonSafe(res) : null))
      .then((data) => {
        if (data && Array.isArray(data.saved) && data.saved.length > 0) {
          const remoteTrips: Trip[] = data.saved
            .map((row: any) => row.itinerary_data)
            .filter((t: any) => t && t.id && Array.isArray(t.days));

          if (remoteTrips.length > 0) {
            setSavedTrips((prev) => {
              const existingIds = new Set(remoteTrips.map((rt) => rt.id));
              return [...remoteTrips, ...prev.filter((pt) => !existingIds.has(pt.id))];
            });
          }
        }
      })
      .catch(() => {
        // Fallback silencioso a datos locales si el servidor no está disponible
      });
  }, [authToken, bffUrl]);

  const handleLogout = () => {
    try {
      localStorage.removeItem('flyway_token');
      localStorage.removeItem('flyway_user');
    } catch {}
    setAuthToken(null);
    setUserEmail(null);
    setActiveScreen('login');
  };

  // Plan route workflow with real AI API call + live weather consultation
  const handlePlanRoute = async (formData: {
    destination: string;
    startDate: string;
    endDate: string;
    budget: BudgetLevel;
    interests: string[];
  }) => {
    setIsLoading(true);
    setApiError(null);
    setLoadingTitle(`Buscando lo mejor de ${formData.destination}`);
    setLoadingSubtitle('Consultando modelos de IA en la nube y pronóstico meteorológico del destino...');

    const subTimer1 = setTimeout(() => {
      setLoadingSubtitle('Analizando clima, qué vestimenta llevar, gastronomía y paradas...');
    }, 1200);

    const subTimer2 = setTimeout(() => {
      setLoadingSubtitle('Ajustando presupuesto en CLP y estructurando tu itinerario detallado...');
    }, 2800);

    const subTimer3 = setTimeout(() => {
      setLoadingSubtitle('Generando itinerario exhaustivo con modelo de IA avanzado (puede tomar un minuto)...');
    }, 7000);

    const subTimer4 = setTimeout(() => {
      setLoadingSubtitle('El modelo gpt-6-luna está optimizando rutas, clima y actividades día a día...');
    }, 25000);

    const subTimer5 = setTimeout(() => {
      setLoadingSubtitle('Calculando costos en CLP, gastronomía típica y recomendaciones de vestimenta...');
    }, 55000);

    const subTimer6 = setTimeout(() => {
      setLoadingSubtitle('Estructurando detalles finales del itinerario con IA...');
    }, 95000);

    const liveWeatherPromise = fetchWeatherAndClothingForTrip(
      formData.destination,
      formData.startDate,
      formData.endDate
    );

    try {
      const [response, liveWeather] = await Promise.all([
        fetch(`${bffUrl}/itinerary/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        }),
        liveWeatherPromise,
      ]);

      clearTimeout(subTimer1);
      clearTimeout(subTimer2);
      clearTimeout(subTimer3);
      clearTimeout(subTimer4);
      clearTimeout(subTimer5);
      clearTimeout(subTimer6);

      const result = await parseJsonSafe(response);

      if (!response.ok) {
        throw new Error(result.error || result.detail || `Error en el servicio de IA (HTTP ${response.status})`);
      }

      const rawTripObj = result.trip || (result.currency ? result : null);
      if (rawTripObj) {
        const weatherInfo =
          liveWeather ||
          getWeatherAndClothingForTrip(
            rawTripObj.destination || formData.destination,
            rawTripObj.startDate || formData.startDate,
            rawTripObj.endDate || formData.endDate
          );
        const budgetInfo = getBudgetTierInfo(rawTripObj.budgetLevel || formData.budget);
        const useLivePriority = weatherInfo.weatherSource === 'open-meteo';

        const enrichedTrip = ensureTripHasPexelsPhotos({
          ...rawTripObj,
          season: useLivePriority ? weatherInfo.season : rawTripObj.season || weatherInfo.season,
          currentSeason: useLivePriority
            ? weatherInfo.currentSeason
            : rawTripObj.currentSeason || weatherInfo.currentSeason,
          weatherCondition: useLivePriority
            ? weatherInfo.weatherCondition
            : rawTripObj.weatherCondition || weatherInfo.weatherCondition,
          temperatureRange: useLivePriority
            ? weatherInfo.temperatureRange
            : rawTripObj.temperatureRange || weatherInfo.temperatureRange,
          weatherSummary: useLivePriority
            ? weatherInfo.weatherSummary
            : rawTripObj.weatherSummary || weatherInfo.weatherSummary,
          clothingTip: useLivePriority
            ? weatherInfo.clothingTip
            : rawTripObj.clothingTip || weatherInfo.clothingTip,
          clothingItems:
            useLivePriority || !rawTripObj.clothingItems || rawTripObj.clothingItems.length === 0
              ? weatherInfo.clothingItems
              : rawTripObj.clothingItems,
          budgetRangeText: rawTripObj.budgetRangeText || budgetInfo.dailyRangeText,
          budgetDescription: rawTripObj.budgetDescription || budgetInfo.description,
        });
        setCurrentTrip(enrichedTrip);
        setActiveScreen('itinerary');
      } else {
        throw new Error(result.error || 'Respuesta inválida del servidor de IA');
      }
    } catch (err: any) {
      console.error('[Flyway] Fallo al consultar API con IA en la nube:', err);
      clearTimeout(subTimer1);
      clearTimeout(subTimer2);
      clearTimeout(subTimer3);
      clearTimeout(subTimer4);
      clearTimeout(subTimer5);
      clearTimeout(subTimer6);

      const isOfflineAllowed = (import.meta.env.VITE_ENABLE_OFFLINE_MODE as string) === 'true';
      if (isOfflineAllowed) {
        const liveWeather = await liveWeatherPromise;
        const isChile =
          formData.destination.toLowerCase().includes('chile') ||
          formData.destination.toLowerCase().includes('valpara') ||
          formData.destination.toLowerCase().includes('atacama') ||
          formData.destination.toLowerCase().includes('santiago') ||
          formData.destination.toLowerCase().includes('pucon');

        const fallbackTrip = generateSmartTrip({
          destination: formData.destination,
          startDate: formData.startDate,
          endDate: formData.endDate,
          budget: formData.budget,
          interests: formData.interests,
        });

        fallbackTrip.season = liveWeather.season;
        fallbackTrip.currentSeason = liveWeather.currentSeason;
        fallbackTrip.weatherCondition = liveWeather.weatherCondition;
        fallbackTrip.temperatureRange = liveWeather.temperatureRange;
        fallbackTrip.weatherSummary = liveWeather.weatherSummary;
        fallbackTrip.clothingTip = liveWeather.clothingTip;
        fallbackTrip.clothingItems = liveWeather.clothingItems;
        fallbackTrip.isChileanDestination = isChile;
        fallbackTrip.aiSource = 'synthesis';
        fallbackTrip.generatedByModel = 'Flyway Smart Engine (Modo Local)';

        setCurrentTrip(fallbackTrip);
        setActiveScreen('itinerary');
      } else {
        setApiError(
          err?.message ||
            'Error al generar la ruta con los modelos de IA activos en la nube de GCP. Revisa las claves de API configuradas en .env.'
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveTrip = (tripToSave: Trip) => {
    const exists = savedTrips.some((t) => t.id === tripToSave.id);
    if (!exists) {
      const savedCopy = { ...tripToSave, isFavorite: true };
      setSavedTrips((prev) => [savedCopy, ...prev]);

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (authToken) {
        headers.Authorization = `Bearer ${authToken}`;
      }

      fetch(`${bffUrl}/saved`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          id: savedCopy.id,
          destinationName: savedCopy.destination || savedCopy.title,
          totalBudgetClp: savedCopy.totalCost,
          itineraryData: savedCopy,
        }),
      }).catch((e) => console.warn('[Frontend] No se pudo persistir en backend:', e));
    } else {
      setSavedTrips((prev) => prev.filter((t) => t.id !== tripToSave.id));
    }
  };

  const handleRemoveTrip = (tripId: string) => {
    setSavedTrips((prev) => prev.filter((t) => t.id !== tripId));
  };

  const handleUpdateTrip = (updatedTrip: Trip) => {
    setCurrentTrip(updatedTrip);
    setSavedTrips((prev) =>
      prev.map((t) => (t.id === updatedTrip.id ? updatedTrip : t))
    );
  };

  const handleViewSavedTrip = (trip: Trip) => {
    setCurrentTrip(trip);
    setActiveScreen('itinerary');
  };

  return (
    <div className="min-h-screen bg-[var(--fw-bg)] text-[var(--fw-text)] flex flex-col font-sans">
      {/* Header común para la aplicación */}
      <div className="max-w-[760px] lg:max-w-[860px] w-full mx-auto px-4 pt-3 sm:pt-4">
        <ODCHeader
          onLogoClick={() => setActiveScreen('explore')}
          onOpenLogin={() => {
            setPreviousScreen(activeScreen);
            setActiveScreen('login');
          }}
          userEmail={userEmail}
          onLogout={handleLogout}
        />
      </div>

      {/* Alerta de error en la nube si falla la generación */}
      {apiError && (
        <div className="max-w-[760px] lg:max-w-[860px] w-full mx-auto px-4 mt-2">
          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs sm:text-sm font-medium flex items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2">
              <span className="text-base">⚠️</span>
              <span>{apiError}</span>
            </div>
            <button
              type="button"
              onClick={() => setApiError(null)}
              className="text-amber-700 hover:text-amber-900 font-bold px-2 py-0.5 rounded text-sm cursor-pointer"
              aria-label="Cerrar alerta"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Pantalla activa con transición de desvanecimiento sutil */}
      <main className="flex-1 w-full relative">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={activeScreen}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1.0] }}
            className="w-full flex-1"
          >
            {activeScreen === 'explore' && (
              <ExploreScreen onPlanRoute={handlePlanRoute} />
            )}

            {activeScreen === 'itinerary' && (
              <ItineraryScreen
                trip={currentTrip}
                onBack={() => setActiveScreen('explore')}
                onSaveTrip={handleSaveTrip}
                isSaved={savedTrips.some((t) => t.id === currentTrip.id)}
                onUpdateTrip={handleUpdateTrip}
              />
            )}

            {activeScreen === 'saved' && (
              <SavedTripsScreen
                savedTrips={savedTrips}
                onViewTrip={handleViewSavedTrip}
                onRemoveTrip={handleRemoveTrip}
                onGoToExplore={() => setActiveScreen('explore')}
                userEmail={userEmail}
                onOpenLogin={() => {
                  setPreviousScreen('saved');
                  setActiveScreen('login');
                }}
              />
            )}

            {activeScreen === 'login' && (
              <LoginScreen
                onLoginSuccess={(email, _user, token) => {
                  setUserEmail(email);
                  if (token) setAuthToken(token);
                  setActiveScreen(previousScreen === 'login' ? 'explore' : previousScreen);
                }}
                onContinueWithoutAccount={() => {
                  setActiveScreen(previousScreen === 'login' ? 'explore' : previousScreen);
                }}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Navegación inferior fija */}
      <ODCBottomNav
        activeTab={activeScreen}
        onTabChange={(tab) => setActiveScreen(tab)}
        savedCount={savedTrips.length}
      />

      {/* Overlay de carga al planificar */}
      <ODCLoadingOverlay
        isLoading={isLoading}
        title={loadingTitle}
        subtitle={loadingSubtitle}
      />
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { Trip, Activity, BudgetLevel, TripDay } from '../types';
import { ODCActivityCard } from '../odc-components/ODCActivityCard';
import { ODCBottomSheet } from '../odc-components/ODCBottomSheet';
import { ODCButton } from '../odc-components/ODCButton';
import { ODCInput } from '../odc-components/ODCInput';
import { ODCSegmentedControl } from '../odc-components/ODCSegmentedControl';
import { ODCChipGroup } from '../odc-components/ODCChipGroup';
import { ODCDateRangePicker, formatFriendlyDate } from '../odc-components/ODCDateRangePicker';
import { DEFAULT_INTERESTS } from '../data/mockTrips';
import {
  getPexelsPhotoForDay,
  getPexelsPhotoForActivity,
  getPexelsPhotoForDestination,
} from '../utils/photoUtils';
import {
  extractCleanPlaceName,
  buildGoogleMapsEmbedUrl,
  buildGoogleMapsExternalUrl,
} from '../utils/mapUtils';
import {
  getWeatherAndClothingForTrip,
  fetchWeatherAndClothingForTrip,
  getSeasonIcon,
  getBudgetTierInfo,
  BUDGET_TIER_DETAILS,
} from '../utils/weatherUtils';
import { generateSmartTrip } from '../utils/tripGenerator';
import {
  BookOpen,
  Landmark,
  Sparkles,
  Clock,
  Shirt,
  CloudSun,
  Wallet,
  MapPin,
  ExternalLink,
  Navigation,
  X,
} from 'lucide-react';

export interface ItineraryScreenProps {
  trip: Trip;
  onBack: () => void;
  onSaveTrip: (trip: Trip) => void;
  isSaved: boolean;
  onUpdateTrip: (updatedTrip: Trip) => void;
}

type TabType = 'itinerary' | 'costs';

export const ItineraryScreen: React.FC<ItineraryScreenProps> = ({
  trip,
  onBack,
  onSaveTrip,
  isSaved,
  onUpdateTrip,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('itinerary');
  const [activeDay, setActiveDay] = useState<number>(1);
  const [heroImgError, setHeroImgError] = useState<boolean>(false);

  // Modal bottom sheet states
  const [selectedDay, setSelectedDay] = useState<TripDay | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [mapStopActivity, setMapStopActivity] = useState<Activity | null>(null);
  const [menuActivity, setMenuActivity] = useState<Activity | null>(null);
  const [timeAdjustActivity, setTimeAdjustActivity] = useState<Activity | null>(null);
  const [replaceActivity, setReplaceActivity] = useState<Activity | null>(null);
  const [deleteConfirmActivity, setDeleteConfirmActivity] = useState<Activity | null>(null);
  const [isAdjustRouteOpen, setIsAdjustRouteOpen] = useState(false);

  // Time adjust inputs
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [timeError, setTimeError] = useState<string | null>(null);

  // Replace prompt
  const [replacePrompt, setReplacePrompt] = useState('');

  // Adjust route state
  const [adjDest, setAdjDest] = useState(trip.destination);
  const [adjStart, setAdjStart] = useState(trip.startDate);
  const [adjEnd, setAdjEnd] = useState(trip.endDate);
  const [adjBudget, setAdjBudget] = useState<BudgetLevel>(trip.budgetLevel);
  const [adjInterests, setAdjInterests] = useState<string[]>(['culture', 'gastronomy']);
  const [adjNotes, setAdjNotes] = useState('Más actividades bajo techo el día 2');

  // Reset UI & image error state whenever trip changes so stale DOM/modals never bleed across searches
  useEffect(() => {
    setActiveDay(1);
    setActiveTab('itinerary');
    setHeroImgError(false);
    setSelectedDay(null);
    setSelectedActivity(null);
    setMapStopActivity(null);
    setMenuActivity(null);
    setTimeAdjustActivity(null);
    setReplaceActivity(null);
    setDeleteConfirmActivity(null);
    setIsAdjustRouteOpen(false);
    setAdjDest(trip.destination);
    setAdjStart(trip.startDate);
    setAdjEnd(trip.endDate);
    setAdjBudget(trip.budgetLevel);
  }, [trip.id, trip.destination, trip.imageUrl]);

  // Datos enriquecidos de clima, estación, vestimenta y presupuesto para el viaje actual
  const computedWeather = getWeatherAndClothingForTrip(
    trip.destination,
    trip.startDate,
    trip.endDate
  );
  const computedBudget = getBudgetTierInfo(trip.budgetLevel);

  const tripSeason = trip.season || computedWeather.season;
  const currentSeason = trip.currentSeason || computedWeather.currentSeason;
  const tripSeasonIcon = getSeasonIcon(tripSeason);
  const currentSeasonIcon = getSeasonIcon(currentSeason);
  const weatherCondition = trip.weatherCondition || computedWeather.weatherCondition;
  const temperatureRange = trip.temperatureRange || computedWeather.temperatureRange;
  const weatherSummary = trip.weatherSummary || computedWeather.weatherSummary;
  const clothingTip = trip.clothingTip || computedWeather.clothingTip;
  const clothingItems =
    trip.clothingItems && trip.clothingItems.length > 0
      ? trip.clothingItems
      : computedWeather.clothingItems;
  const budgetRangeText = trip.budgetRangeText || computedBudget.dailyRangeText;
  const budgetDescription = trip.budgetDescription || computedBudget.description;

  const openActivityMenu = (act: Activity) => {
    setMenuActivity(act);
  };

  const handleStartAdjustTime = (act: Activity) => {
    setMenuActivity(null);
    setTimeAdjustActivity(act);
    setStartTime(act.startTime || '11:00');
    setEndTime(act.endTime || '10:30'); // intentionally preset default or invalid if testing
    setTimeError(null);
  };

  const handleSaveAdjustTime = () => {
    if (!startTime || !endTime) {
      setTimeError('Debes ingresar ambas horas.');
      return;
    }
    // Check if end is before or equal to start
    if (endTime <= startTime) {
      setTimeError('La hora de término debe ser posterior a la de inicio.');
      return;
    }

    if (timeAdjustActivity) {
      const newRange = `${startTime} - ${endTime}`;
      const updatedDays = trip.days.map((day) => ({
        ...day,
        items: day.items.map((item) => {
          if (item.type === 'activity' && item.data.id === timeAdjustActivity.id) {
            return {
              ...item,
              data: {
                ...item.data,
                startTime,
                endTime,
                timeRange: newRange,
              },
            };
          }
          return item;
        }),
      }));

      onUpdateTrip({
        ...trip,
        days: updatedDays,
      });
    }

    setTimeAdjustActivity(null);
  };

  const handleStartReplace = (act: Activity) => {
    setMenuActivity(null);
    setReplaceActivity(act);
    setReplacePrompt('');
  };

  const handleConfirmReplace = () => {
    if (!replaceActivity) return;

    const altPhoto1 = getPexelsPhotoForDestination(trip.destination, 2);
    const altPhoto2 = getPexelsPhotoForDestination(trip.destination, 3);
    const altPhoto3 = getPexelsPhotoForDestination(trip.destination, 4);

    // Replace with an alternative activity matched to destination
    const replacementPool: Record<string, Activity> = {
      'act-1': {
        id: 'act-alt-1',
        timeRange: replaceActivity.timeRange,
        startTime: replaceActivity.startTime,
        endTime: replaceActivity.endTime,
        title: `Galería de Arte y Mirador Patrimonial (${trip.destination.split(',')[0]})`,
        description: 'Muestra cultural local y paseo panorámico sin costo.',
        costText: 'Gratis',
        costAmount: 0,
        category: 'Cultura',
        categoryIcon: '🏛️',
        imageUrl: altPhoto1.url,
        imagePhotographer: altPhoto1.photographer,
        whyIncluded: 'Opción bajo techo adaptada a tu preferencia.',
        history: 'Espacio cultural patrimonial con resguardo climático y exposiciones permanentes.',
        savingTip: 'Entrada sin costo durante todo el año.',
      },
      'act-2': {
        id: 'act-alt-2',
        timeRange: replaceActivity.timeRange,
        startTime: replaceActivity.startTime,
        endTime: replaceActivity.endTime,
        title: `Café Patrimonial y Cocina Local (${trip.destination.split(',')[0]})`,
        description: 'Almuerzo ligero y café de especialidad en salón histórico.',
        costText: '$8.500 CLP',
        costAmount: 8500,
        category: 'Comida',
        categoryIcon: '🍽️',
        isFood: true,
        imageUrl: altPhoto2.url,
        imagePhotographer: altPhoto2.photographer,
        whyIncluded: 'Ambiente acogedor bajo techo con gastronomía local.',
        history: 'Espacio cultural de encuentro de artistas y productores de la zona.',
        savingTip: 'Pide el menú del día con infusión casera.',
      },
      'act-3': {
        id: 'act-alt-3',
        timeRange: replaceActivity.timeRange,
        startTime: replaceActivity.startTime,
        endTime: replaceActivity.endTime,
        title: `Museo Histórico y Cultural de ${trip.destination.split(',')[0]}`,
        description: 'Exposiciones de biodiversidad e historia regional bajo techo.',
        costText: 'Gratis',
        costAmount: 0,
        category: 'Cultura',
        categoryIcon: '🏛️',
        imageUrl: altPhoto3.url,
        imagePhotographer: altPhoto3.photographer,
        whyIncluded: 'Actividad cultural bajo techo completamente gratuita.',
        history: 'Uno de los centros patrimoniales más importantes de la localidad.',
        savingTip: 'Cuenta con guardarropía gratuita para dejar bolsos y mochilas.',
      },
    };

    const newAct = replacementPool[replaceActivity.id] || {
      ...replaceActivity,
      title: `${replaceActivity.title} (Alternativa)`,
      description: replacePrompt ? `Ajustado según tu solicitud: "${replacePrompt}"` : replaceActivity.description,
      imageUrl: altPhoto1.url,
      imagePhotographer: altPhoto1.photographer,
    };

    const diff = newAct.costAmount - replaceActivity.costAmount;

    const updatedDays = trip.days.map((day) => {
      let updatedItems = day.items.map((item) => {
        if (item.type === 'activity' && item.data.id === replaceActivity.id) {
          return {
            type: 'activity' as const,
            data: newAct,
          };
        }
        return item;
      });
      const dayHasItem = day.items.some((item) => item.type === 'activity' && item.data.id === replaceActivity.id);
      return {
        ...day,
        dailyCost: dayHasItem ? Math.max(0, day.dailyCost + diff) : day.dailyCost,
        items: updatedItems,
      };
    });

    onUpdateTrip({
      ...trip,
      totalCost: Math.max(0, trip.totalCost + diff),
      days: updatedDays,
    });

    setReplaceActivity(null);
  };

  const handleStartDelete = (act: Activity) => {
    setMenuActivity(null);
    setDeleteConfirmActivity(act);
  };

  const handleConfirmDelete = () => {
    if (!deleteConfirmActivity) return;

    const costToSubtract = deleteConfirmActivity.costAmount;

    const updatedDays = trip.days.map((day) => {
      const filteredItems = day.items.filter((item) => {
        if (item.type === 'activity' && item.data.id === deleteConfirmActivity.id) {
          return false;
        }
        return true;
      });

      const dayHasItem = day.items.some(
        (item) => item.type === 'activity' && item.data.id === deleteConfirmActivity.id
      );

      return {
        ...day,
        dailyCost: dayHasItem ? Math.max(0, day.dailyCost - costToSubtract) : day.dailyCost,
        items: filteredItems,
      };
    });

    onUpdateTrip({
      ...trip,
      totalCost: Math.max(0, trip.totalCost - costToSubtract),
      days: updatedDays,
    });

    setDeleteConfirmActivity(null);
  };

  const handleApplyAdjustRoute = async () => {
    const regenerated = generateSmartTrip({
      destination: adjDest,
      startDate: adjStart,
      endDate: adjEnd,
      budget: adjBudget,
      interests: adjInterests,
    });

    const liveWeather = await fetchWeatherAndClothingForTrip(adjDest, adjStart, adjEnd);

    onUpdateTrip({
      ...regenerated,
      id: trip.id,
      isFavorite: trip.isFavorite,
      season: liveWeather.season,
      currentSeason: liveWeather.currentSeason,
      weatherCondition: liveWeather.weatherCondition,
      temperatureRange: liveWeather.temperatureRange,
      weatherSummary: liveWeather.weatherSummary,
      clothingTip: liveWeather.clothingTip,
      clothingItems: liveWeather.clothingItems,
      whyThisRoute: adjNotes
        ? `Ruta personalizada con ajuste solicitado: "${adjNotes}". ${regenerated.whyThisRoute}`
        : regenerated.whyThisRoute,
    });
    setIsAdjustRouteOpen(false);
  };

  return (
    <div className="fw-page" id="itinerary-page">
      {/* Botón volver */}
      <button
        type="button"
        className="fw-back"
        onClick={onBack}
        aria-label="Volver al planificador"
        id="btn-back-to-explore"
      >
        ←
      </button>

      {/* Hero Image del Destino (Pexels) sin texto superpuesto */}
      {(() => {
        const destHeroPhoto = getPexelsPhotoForDestination(trip.destination, 0);
        const heroImage = !heroImgError && trip.imageUrl ? trip.imageUrl : destHeroPhoto.url;
        const heroPhotographer = trip.imagePhotographer || destHeroPhoto.photographer;

        return (
          <div className="w-full rounded-2xl overflow-hidden mb-4 border border-[var(--fw-border)] shadow-xs bg-white">
            <div className="w-full h-48 sm:h-56 overflow-hidden bg-stone-100">
              <img
                key={heroImage}
                src={heroImage}
                alt={trip.destination}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  if (!heroImgError && trip.imageUrl && trip.imageUrl !== destHeroPhoto.url) {
                    setHeroImgError(true);
                  } else {
                    const fallback = getPexelsPhotoForDestination(trip.destination, 1);
                    if (e.currentTarget.src !== fallback.url) {
                      e.currentTarget.src = fallback.url;
                    }
                  }
                }}
              />
            </div>
            <div className="px-3.5 py-2 bg-[#FAF8F5] border-t border-[var(--fw-border)] flex items-center justify-between gap-2 text-xs text-stone-600">
              <span className="font-medium truncate">
                📸 Fotografía de <strong className="text-[#1E1F19]">{trip.destination.split(',')[0]}</strong> por {heroPhotographer}
              </span>
              <span className="font-semibold text-[11px] text-[#264D33] bg-[#E1F2E2] px-2.5 py-0.5 rounded-full border border-[#C6E4C8] shrink-0">
                Pexels API
              </span>
            </div>
          </div>
        );
      })()}

      {/* Encabezado del viaje */}
      <div className="fw-trip-head">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-1">
          <h1 className="m-0 text-3xl font-bold text-[#1E1F19]">{trip.destination}</h1>
          {trip.destinationCountry && (
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#E1F2E2] text-[#264D33] border border-[#C6E4C8]">
              {trip.destinationCountry}
            </span>
          )}
        </div>
        
        {trip.summary && (
          <p className="text-sm text-[#555] mb-2.5 leading-relaxed">
            {trip.summary}
          </p>
        )}

        <div className="fw-meta flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 bg-white px-2.5 py-1 rounded-full border border-[var(--fw-border)] text-xs font-semibold text-[#1E1F19]">
            📅 {trip.datesText}
          </span>
          <span className="fw-badge">
            {computedBudget.symbol} {computedBudget.label} · {budgetRangeText}
          </span>
          <span className="inline-flex items-center gap-1 bg-[#E1F2E2] text-[#264D33] px-2.5 py-1 rounded-full border border-[#C6E4C8] text-xs font-bold">
            {tripSeasonIcon} Estación viaje: {tripSeason}
          </span>
          {trip.generatedByModel && (
            <span className="text-[11px] font-medium text-[#366447] bg-[#FAF8F5] px-2.5 py-0.5 rounded-full border border-[var(--fw-border)] flex items-center gap-1 shadow-2xs">
              🤖 {trip.generatedByModel}
            </span>
          )}
        </div>
      </div>

      {/* Panel Resumen de Clima, Estación, Qué Ropa Usar y Presupuesto en el Itinerario Final */}
      <div
        className="mb-4 rounded-2xl border border-[#C6E4C8] bg-[#FAF8F5] p-3.5 sm:p-4 shadow-2xs"
        id="itinerary-weather-budget-summary"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          {/* Bloque Clima y Estación */}
          <div className="p-3 rounded-xl bg-white border border-[var(--fw-border)]">
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#264D33] flex items-center gap-1">
                <CloudSun className="w-3.5 h-3.5 text-[#4A7C59]" />
                Clima y Estación
              </span>
              <span className="text-[11px] font-semibold text-stone-600 bg-stone-100 px-2 py-0.5 rounded-full">
                Hoy: {currentSeasonIcon} {currentSeason}
              </span>
            </div>
            <div className="text-sm font-extrabold text-[#1E1F19] mb-0.5">
              {tripSeasonIcon} {tripSeason} · 🌡️ {temperatureRange}
            </div>
            <div className="text-xs font-semibold text-[#366447] mb-1">
              {weatherCondition}
            </div>
            <p className="text-[11px] text-stone-600 m-0 leading-relaxed">
              {weatherSummary}
            </p>
          </div>

          {/* Bloque Presupuesto y Rango CLP */}
          <div className="p-3 rounded-xl bg-white border border-[var(--fw-border)]">
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#264D33] flex items-center gap-1">
                <Wallet className="w-3.5 h-3.5 text-[#4A7C59]" />
                Nivel {computedBudget.label} ({computedBudget.symbol})
              </span>
              <span className="text-xs font-extrabold text-[#264D33] bg-[#E1F2E2] px-2 py-0.5 rounded-full border border-[#C6E4C8]">
                Total: ${trip.totalCost.toLocaleString('es-CL')} {trip.currency}
              </span>
            </div>
            <div className="text-sm font-extrabold text-[#1E1F19] mb-1">
              Rango: {budgetRangeText}
            </div>
            <p className="text-[11px] text-stone-600 m-0 leading-relaxed">
              {budgetDescription}
            </p>
          </div>
        </div>

        {/* Bloque Qué Ropa Usar / Recomendación de Vestimenta */}
        <div
          className="p-3 rounded-xl bg-[#E1F2E2]/55 border border-[#C6E4C8]"
          id="itinerary-clothing-tip-box"
        >
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#264D33] mb-1">
            <Shirt className="w-3.5 h-3.5 text-[#366447] shrink-0" />
            <span>¿Cómo ir vestido y qué ropa llevar a {trip.destination.split(',')[0]} en {tripSeason}?</span>
          </div>
          <p className="text-xs text-[#1E1F19] m-0 mb-2 leading-relaxed">
            {clothingTip}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {clothingItems.map((item, idx) => (
              <span
                key={idx}
                className="text-[11px] font-medium px-2.5 py-0.5 rounded-lg bg-white text-[#264D33] border border-[#C6E4C8]"
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>

      <button
        type="button"
        className="btn fw-btn-outline"
        onClick={() => setIsAdjustRouteOpen(true)}
        id="btn-open-adjust-route"
      >
        Rehacer itinerario
      </button>

      {/* Pestañas de navegación */}
      <div className="flex gap-6 my-4 border-b border-[var(--fw-border)]" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'itinerary'}
          className={`osui-tabs__header-item bg-transparent border-0 font-bold ${
            activeTab === 'itinerary' ? 'osui-tabs--is-active' : ''
          }`}
          onClick={() => setActiveTab('itinerary')}
          id="tab-itinerary"
        >
          Itinerario
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'costs'}
          className={`osui-tabs__header-item bg-transparent border-0 font-bold ${
            activeTab === 'costs' ? 'osui-tabs--is-active' : ''
          }`}
          onClick={() => setActiveTab('costs')}
          id="tab-costs"
        >
          Costos y tips
        </button>
      </div>

      {/* Pestaña 1: Timeline de Itinerario */}
      {activeTab === 'itinerary' && (
        <div id="itinerary-timeline-tab">
          {trip.days.map((day, dIdx) => {
            const dayPhoto = getPexelsPhotoForDay(day, trip.destination, dIdx);
            const dayImage = day.imageUrl || dayPhoto.url;
            const dayPhotographer = day.imagePhotographer || dayPhoto.photographer;
            const activityCount = (day.items || []).filter((i) => i.type === 'activity').length;

            return (
              <div
                key={`${trip.id}-day-${day.dayNumber}`}
                className="mb-8"
                id={`day-section-${day.dayNumber}`}
              >
                {/* Tarjeta de cabecera del Día con foto limpia arriba y texto debajo (sin superposición) */}
                <div
                  className="mb-4 rounded-2xl overflow-hidden border border-[var(--fw-border)] shadow-xs bg-white cursor-pointer group hover:border-[#4A7C59] hover:shadow-md transition-all"
                  onClick={() => {
                    setActiveDay(day.dayNumber);
                    setSelectedDay(day);
                  }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setActiveDay(day.dayNumber);
                      setSelectedDay(day);
                    }
                  }}
                  aria-label={`Ver detalles del Día ${day.dayNumber}`}
                  id={`btn-day-card-${day.dayNumber}`}
                >
                  <div className="h-36 sm:h-44 w-full overflow-hidden bg-stone-100">
                    <img
                      key={dayImage}
                      src={dayImage}
                      alt={day.title || `Día ${day.dayNumber}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        const fallback = getPexelsPhotoForDestination(trip.destination, dIdx + 2);
                        if (e.currentTarget.src !== fallback.url) {
                          e.currentTarget.src = fallback.url;
                        }
                      }}
                    />
                  </div>

                  <div className="p-3.5 sm:p-4 bg-white border-t border-[var(--fw-border)]">
                    <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-7 h-7 rounded-full bg-[#E1F2E2] text-[#264D33] border border-[#C6E4C8] font-black text-xs flex items-center justify-center">
                          {day.dayNumber}
                        </span>
                        <span className="bg-[#FAF8F5] text-[#1E1F19] text-xs font-bold px-2.5 py-1 rounded-full border border-[var(--fw-border)]">
                          📅 {day.dateFormatted}
                        </span>
                        <span className="text-xs font-bold text-[#366447] bg-[#E1F2E2]/60 px-2.5 py-1 rounded-full">
                          {tripSeasonIcon} {temperatureRange}
                        </span>
                      </div>

                      <span className="bg-[#4A7C59] text-white text-xs font-bold px-3 py-1 rounded-full shadow-2xs flex items-center gap-1 group-hover:bg-[#366447] transition-colors">
                        👁️ Ver detalles del día
                      </span>
                    </div>

                    <h3 className="m-0 text-base sm:text-lg font-bold text-[#1E1F19] leading-snug mb-1">
                      {day.title || `Día ${day.dayNumber}: Exploración de ${trip.destination}`}
                    </h3>

                    <div className="flex items-center justify-between flex-wrap gap-2 text-xs text-stone-600 font-medium">
                      <span>
                        💰 <strong className="text-[#264D33]">${day.dailyCost.toLocaleString('es-CL')} {trip.currency}</strong> · {activityCount} actividades
                      </span>
                      <span className="text-[11px] text-stone-500">
                        📸 Foto: {dayPhotographer} (Pexels)
                      </span>
                    </div>
                  </div>
                </div>

                <div className="fw-timeline pl-2 sm:pl-4">
                  {day.items.map((item, idx) => {
                    if (item.type === 'activity') {
                      return (
                        <ODCActivityCard
                          key={`${trip.id}-d${day.dayNumber || activeDay}-${item.data.id}-${idx}`}
                          activity={item.data}
                          destination={trip.destination}
                          onOpenDetails={(act) => setSelectedActivity(act)}
                          onOpenMenu={(act) => openActivityMenu(act)}
                          onViewOnMap={(act) => setMapStopActivity(act)}
                        />
                      );
                    }
                    if (item.type === 'transfer') {
                      return (
                        <div
                          key={`${trip.id}-d${day.dayNumber || activeDay}-tr-${item.data.id || idx}`}
                          className="fw-transfer"
                        >
                          <span>{item.data.icon}</span>
                          <span>{item.data.text}</span>
                        </div>
                      );
                    }
                    return null;
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pestaña 2: Costos y tips */}
      {activeTab === 'costs' && (
        <div id="itinerary-costs-tab" className="space-y-4">
          <div className="fw-card">
            <div className="flex items-center justify-between flex-wrap gap-2 mb-1">
              <div className="fw-muted text-sm font-semibold">Costo total estimado de actividades y comidas</div>
              <span className="fw-badge">
                {computedBudget.symbol} {computedBudget.label} ({budgetRangeText})
              </span>
            </div>
            <div className="fw-price text-3xl my-1">
              ${trip.totalCost.toLocaleString('es-CL')} {trip.currency}
            </div>
            <p className="text-xs text-stone-600 m-0 mb-3 leading-relaxed">
              {budgetDescription}
            </p>
            <table className="fw-cost-table" aria-label="Desglose de costos por día">
              <tbody>
                {trip.days.map((day) => (
                  <tr key={day.dayNumber}>
                    <td>Día {day.dayNumber} ({day.dateFormatted})</td>
                    <td>${day.dailyCost.toLocaleString('es-CL')} {trip.currency}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="fw-card">
            <h3 className="text-base font-bold m-0 mb-2 flex items-center gap-1.5">
              <span>{tripSeasonIcon}</span>
              <span>Clima en {tripSeason} y Qué Ropa Llevar</span>
            </h3>
            <p className="text-xs font-semibold text-[#264D33] m-0 mb-1">
              🌡️ {temperatureRange} · {weatherCondition} (Estación actual hoy: {currentSeason})
            </p>
            <p className="text-xs text-stone-600 m-0 mb-2.5 leading-relaxed">
              {weatherSummary}
            </p>
            <div className="p-3 rounded-xl bg-[#FAF8F5] border border-[var(--fw-border)]">
              <div className="text-xs font-bold text-[#1E1F19] mb-1">
                👕 Recomendación de vestimenta:
              </div>
              <p className="text-xs text-stone-700 m-0 mb-2 leading-relaxed">
                {clothingTip}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {clothingItems.map((item, idx) => (
                  <span
                    key={idx}
                    className="text-[11px] font-medium px-2.5 py-0.5 rounded-lg bg-[#E1F2E2] text-[#264D33] border border-[#C6E4C8]"
                  >
                    ✓ {item}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="fw-card">
            <h3 className="text-base font-bold m-0 mb-2">Tips para ahorrar</h3>
            <div className="divide-y divide-[var(--fw-border)]">
              {trip.savingTips.map((tip, idx) => (
                <div key={idx} className="fw-tip">
                  <span>💡</span>
                  <span>{tip}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="fw-card">
            <h3 className="text-base font-bold m-0 mb-2">Por qué esta ruta</h3>
            <p className="fw-muted text-sm m-0 leading-relaxed">{trip.whyThisRoute}</p>
          </div>
        </div>
      )}

      {/* CTA Inferior Sticky */}
      <div className="fw-sticky-cta">
        <ODCButton
          variant="primary"
          fullWidth
          id="btn-save-trip-cta"
          onClick={() => onSaveTrip(trip)}
        >
          {isSaved ? '♥ Ruta Guardada en Mis Rutas' : 'Guardar Ruta'}
        </ODCButton>
      </div>

      {/* ================= MODALES / SHEETS ================= */}

      {/* Hoja: Detalle del Día (Pexels) */}
      <ODCBottomSheet
        isOpen={Boolean(selectedDay)}
        onClose={() => setSelectedDay(null)}
        id="sheet-day-detail"
      >
        {selectedDay && (() => {
          const dayPhoto = getPexelsPhotoForDay(
            selectedDay,
            trip.destination,
            (selectedDay.dayNumber || 1) - 1
          );
          const dayImg = selectedDay.imageUrl || dayPhoto.url;
          const dayPhotographer = selectedDay.imagePhotographer || dayPhoto.photographer;
          const activities = (selectedDay.items || []).filter(
            (i) => i.type === 'activity'
          ) as Array<{ type: 'activity'; data: Activity }>;

          return (
            <div>
              <div className="rounded-xl overflow-hidden mb-3 border border-[var(--fw-border)] bg-white">
                <div className="fw-sheet__hero fw-img-fallback overflow-hidden mb-0">
                  <img
                    key={dayImg}
                    src={dayImg}
                    alt={selectedDay.title || `Día ${selectedDay.dayNumber}`}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      const fallback = getPexelsPhotoForDestination(trip.destination, (selectedDay.dayNumber || 1));
                      if (e.currentTarget.src !== fallback.url) {
                        e.currentTarget.src = fallback.url;
                      }
                    }}
                  />
                </div>
                <div className="px-3 py-1.5 bg-[#FAF8F5] border-t border-[var(--fw-border)] flex items-center justify-between text-[11px] text-stone-600">
                  <span className="font-bold text-[#264D33]">Día {selectedDay.dayNumber} · {trip.destination.split(',')[0]}</span>
                  <span>📸 Foto por {dayPhotographer} en Pexels</span>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 my-2">
                <span className="fw-time font-bold">
                  📅 {selectedDay.dateFormatted}
                </span>
                <span className="text-sm font-bold text-[#2E4F38] bg-[#E1F2E2] px-3 py-1 rounded-full border border-[#C6E4C8]">
                  ${selectedDay.dailyCost.toLocaleString('es-CL')} {trip.currency}
                </span>
              </div>

              <h2 className="text-2xl font-bold my-1 text-[#1E1F19]">
                {selectedDay.title || `Día ${selectedDay.dayNumber}: Recorrido por ${trip.destination}`}
              </h2>

              <p className="text-sm text-[var(--fw-text)] mb-3 leading-relaxed">
                {selectedDay.summary || `Itinerario completo con atracciones destacadas, patrimonio local y paradas gastronómicas.`}
              </p>

              <div className="fw-info-block mb-4">
                <h3 className="font-bold text-sm text-[#1E1F19] mb-2 flex items-center gap-1.5">
                  <span>📍</span> Actividades en este día ({activities.length})
                </h3>
                <div className="space-y-2">
                  {activities.map(({ data: act }) => {
                    const actPhoto = getPexelsPhotoForActivity(act, trip.destination);
                    const actImg = act.imageUrl || actPhoto.url;

                    return (
                      <div
                        key={`${trip.id}-${act.id}`}
                        className="flex items-center gap-3 p-2 rounded-xl bg-white border border-[var(--fw-border)] hover:border-[#4A7C59] transition-colors cursor-pointer group"
                        onClick={() => {
                          setSelectedDay(null);
                          setSelectedActivity(act);
                        }}
                        role="button"
                        tabIndex={0}
                      >
                        <div className="w-14 h-14 rounded-lg overflow-hidden shrink-0 relative bg-stone-100">
                          <img
                            key={actImg}
                            src={actImg}
                            alt={act.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              const fallback = getPexelsPhotoForDestination(trip.destination, 0);
                              if (e.currentTarget.src !== fallback.url) {
                                e.currentTarget.src = fallback.url;
                              }
                            }}
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-[11px] font-semibold text-[#4A7C59]">{act.timeRange}</span>
                            <span className="text-[11px] font-bold text-stone-700">{act.costText}</span>
                          </div>
                          <div className="text-xs font-bold text-[#1E1F19] truncate">{act.title}</div>
                          <div className="text-[11px] text-stone-500 truncate">{act.category}</div>
                        </div>
                        <span className="text-sm text-stone-400 font-bold pr-1 group-hover:text-[#4A7C59] transition-colors">›</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end mt-4">
                <button
                  type="button"
                  className="btn btn-primary w-full"
                  onClick={() => setSelectedDay(null)}
                >
                  Cerrar y ver en timeline
                </button>
              </div>
            </div>
          );
        })()}
      </ODCBottomSheet>

      {/* Hoja 1: Detalle de Actividad */}
      <ODCBottomSheet
        isOpen={Boolean(selectedActivity)}
        onClose={() => setSelectedActivity(null)}
        id="sheet-activity-detail"
      >
        {selectedActivity && (() => {
          const actPhoto = getPexelsPhotoForActivity(selectedActivity, trip.destination);
          const actImg = selectedActivity.imageUrl || actPhoto.url;
          const actPhotographer = selectedActivity.imagePhotographer || actPhoto.photographer;
          const detailLocation =
            selectedActivity.addressOrSector?.trim() ||
            (selectedActivity.placeName?.trim() &&
            selectedActivity.placeName.trim().toLowerCase() !== selectedActivity.title.trim().toLowerCase()
              ? selectedActivity.placeName.trim()
              : '');

          return (
            <div>
              <div className="rounded-xl overflow-hidden mb-3 border border-[var(--fw-border)] bg-white">
                <div className="fw-sheet__hero fw-img-fallback overflow-hidden mb-0">
                  <img
                    key={actImg}
                    src={actImg}
                    alt={selectedActivity.placeName || selectedActivity.title}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      const fallback = getPexelsPhotoForDestination(trip.destination, 0);
                      if (e.currentTarget.src !== fallback.url) {
                        e.currentTarget.src = fallback.url;
                      }
                    }}
                  />
                </div>
                <div className="px-3 py-1.5 bg-[#FAF8F5] border-t border-[var(--fw-border)] flex items-center justify-between text-[11px] text-stone-600">
                  <span className="font-semibold text-[#264D33]">{selectedActivity.categoryIcon || '📍'} {selectedActivity.category}</span>
                  <span>📸 Foto por {actPhotographer} en Pexels</span>
                </div>
              </div>

              <div className="flex items-center justify-between flex-wrap gap-2 my-2">
                <span className={`fw-time ${selectedActivity.isFood ? 'fw-time--food' : ''}`}>
                  {selectedActivity.timeRange}
                </span>
                <button
                  type="button"
                  className="fw-map-btn"
                  id="btn-detail-view-on-map"
                  aria-label={`Ver ${selectedActivity.placeName || selectedActivity.title} en mapa`}
                  onClick={() => {
                    const targetAct = selectedActivity;
                    setSelectedActivity(null);
                    setMapStopActivity(targetAct);
                  }}
                >
                  <MapPin size={13} className="shrink-0 text-[#4A7C59]" />
                  <span>Ver en mapa</span>
                </button>
              </div>

              <h2 className="text-2xl font-bold my-1">{selectedActivity.title}</h2>
              {detailLocation && (
                <div className="flex items-center gap-1.5 text-xs font-semibold text-[#366447] mb-2">
                  <MapPin size={13} className="shrink-0 text-[#4A7C59]" />
                  <span>{detailLocation}</span>
                </div>
              )}
              <p className="text-base text-[var(--fw-text)] mb-3">{selectedActivity.description}</p>

              {selectedActivity.whyIncluded && (
                <div className="fw-info-block">
                  <h3>Por qué la incluimos</h3>
                  <div className="fw-muted text-sm">{selectedActivity.whyIncluded}</div>
                </div>
              )}

              {selectedActivity.history && (
                <div className="fw-info-block border-l-4 border-amber-500/80 bg-amber-50/40 dark:bg-amber-950/20">
                  <div className="flex items-center gap-2 mb-1.5 text-amber-900 dark:text-amber-300">
                    <BookOpen className="w-4 h-4 text-amber-600 shrink-0" />
                    <h3 className="font-bold text-[15px] m-0">Un poco de historia</h3>
                  </div>
                  <div className="text-[13.5px] leading-relaxed text-[var(--fw-text)] opacity-90">
                    {selectedActivity.history}
                  </div>

                  {/* Hitos cronológicos / Datos turísticos */}
                  {selectedActivity.historicalFacts && selectedActivity.historicalFacts.length > 0 && (
                    <div className="mt-3.5 pt-3 border-t border-amber-200/60 dark:border-amber-900/40">
                      <div className="flex items-center gap-1.5 mb-2 text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-400">
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                        <span>Hitos y datos clave para el visitante</span>
                      </div>
                      <ul className="space-y-1.5 pl-0 m-0 list-none">
                        {selectedActivity.historicalFacts.map((fact, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-xs leading-normal text-[var(--fw-text)]">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                            <span>{fact}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Curiosidad o secreto local */}
                  {selectedActivity.curiosity && (
                    <div className="mt-3 p-2.5 rounded-xl bg-amber-100/60 dark:bg-amber-900/30 border border-amber-300/50 flex items-start gap-2">
                      <Sparkles className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                      <div className="text-xs leading-relaxed text-amber-950 dark:text-amber-200">
                        <span className="font-bold">¿Sabías qué? </span>
                        {selectedActivity.curiosity}
                      </div>
                    </div>
                  )}

                  {/* Arquitectura o Patrimonio */}
                  {selectedActivity.architectureOrHeritage && (
                    <div className="mt-2.5 p-2.5 rounded-xl bg-stone-100/80 dark:bg-stone-800/40 border border-stone-200/70 flex items-start gap-2">
                      <Landmark className="w-4 h-4 text-stone-600 dark:text-stone-400 mt-0.5 shrink-0" />
                      <div className="text-xs leading-relaxed text-stone-800 dark:text-stone-200">
                        <span className="font-bold">Patrimonio & Arquitectura: </span>
                        {selectedActivity.architectureOrHeritage}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {selectedActivity.savingTip && (
                <div className="fw-info-block">
                  <h3>Tip de ahorro</h3>
                  <div className="fw-muted text-sm">{selectedActivity.savingTip}</div>
                </div>
              )}

              <div className="flex flex-wrap justify-between items-center gap-2 mt-5">
                <span className="fw-price">{selectedActivity.costText}</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="fw-map-btn"
                    style={{ padding: '8px 14px', fontSize: '13px' }}
                    onClick={() => {
                      const targetAct = selectedActivity;
                      setSelectedActivity(null);
                      setMapStopActivity(targetAct);
                    }}
                  >
                    <MapPin size={14} className="shrink-0 text-[#4A7C59]" />
                    <span>Ver en mapa</span>
                  </button>
                  <button
                    type="button"
                    className="btn fw-btn-outline"
                    style={{ padding: '10px 24px' }}
                    onClick={() => setSelectedActivity(null)}
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            </div>
          );
        })()}
      </ODCBottomSheet>

      {/* Hoja 1.5: Mapa Interactivo de la Parada */}
      <ODCBottomSheet
        isOpen={Boolean(mapStopActivity)}
        onClose={() => setMapStopActivity(null)}
        id="sheet-stop-map"
      >
        {mapStopActivity && (() => {
          const cleanStopName = extractCleanPlaceName(mapStopActivity) || mapStopActivity.title;
          const stopAddressLine = mapStopActivity.addressOrSector?.trim()
            ? `${mapStopActivity.addressOrSector.trim()} · ${trip.destination}`
            : trip.destination;
          const embedUrl = buildGoogleMapsEmbedUrl(
            mapStopActivity,
            trip.destination,
            trip.destinationCountry
          );
          const externalMapsUrl = buildGoogleMapsExternalUrl(
            mapStopActivity,
            trip.destination,
            trip.destinationCountry
          );

          return (
            <div>
              {/* Cabecera del Mapa de la Parada */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="min-w-0">
                  <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#264D33] bg-[#E1F2E2] px-2.5 py-0.5 rounded-full border border-[#C6E4C8] mb-1.5">
                    <MapPin size={12} className="shrink-0 text-[#366447]" />
                    <span>Ubicación de la parada</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold m-0 text-[#1E1F19] leading-snug">
                    {cleanStopName}
                  </h2>
                  <p className="text-xs sm:text-sm text-[#556358] m-0 mt-0.5 flex items-center gap-1">
                    <MapPin size={13} className="shrink-0 text-[#4A7C59]" />
                    <span className="truncate">{stopAddressLine}</span>
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setMapStopActivity(null)}
                  aria-label="Cerrar mapa"
                  id="btn-close-stop-map"
                  className="w-9 h-9 rounded-full bg-white border border-[var(--fw-border)] text-[#1E1F19] hover:bg-[#FAF8F5] flex items-center justify-center shrink-0 cursor-pointer transition-colors shadow-2xs"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Mapa interactivo embebido (centrado en la parada con zoom 16) */}
              <div className="rounded-xl overflow-hidden border border-[var(--fw-border)] bg-stone-100 shadow-xs">
                <iframe
                  key={`${mapStopActivity.id}-${trip.id}`}
                  title={`Mapa de ${mapStopActivity.title}`}
                  src={embedUrl}
                  className="w-full h-[340px] sm:h-[400px] border-0 rounded-xl"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  allowFullScreen
                />
              </div>

              {/* Barra inferior con resumen horario/costo y apertura directa en Google Maps */}
              <div className="mt-3.5 pt-3 border-t border-[var(--fw-border)] flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`fw-time ${mapStopActivity.isFood ? 'fw-time--food' : ''}`}>
                    {mapStopActivity.timeRange}
                  </span>
                  <span className="text-sm font-bold text-[#264D33]">
                    {mapStopActivity.costText}
                  </span>
                </div>

                <a
                  href={externalMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  id="btn-open-external-google-maps"
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-[#4A7C59] hover:bg-[#366447] text-white text-xs sm:text-sm font-bold no-underline transition-colors shadow-xs"
                >
                  <Navigation size={14} className="shrink-0" />
                  <span>Abrir en Google Maps</span>
                  <ExternalLink size={13} className="shrink-0 opacity-85" />
                </a>
              </div>
            </div>
          );
        })()}
      </ODCBottomSheet>

      {/* Hoja 2: Menú ⋮ de opciones de actividad */}
      <ODCBottomSheet
        isOpen={Boolean(menuActivity)}
        onClose={() => setMenuActivity(null)}
        id="sheet-activity-menu"
      >
        {menuActivity && (
          <div>
            <h3 className="text-lg font-bold mb-4">{menuActivity.title}</h3>
            <div
              className="fw-sheet__option"
              onClick={() => handleStartAdjustTime(menuActivity)}
              role="button"
              tabIndex={0}
              id="opt-adjust-time"
            >
              <span>🕒</span>
              <span>Ajustar horario</span>
            </div>
            <div
              className="fw-sheet__option"
              onClick={() => handleStartReplace(menuActivity)}
              role="button"
              tabIndex={0}
              id="opt-change-activity"
            >
              <span>🔄</span>
              <span>Cambiar esta actividad</span>
            </div>
            <div
              className="fw-sheet__option fw-sheet__option--danger"
              onClick={() => handleStartDelete(menuActivity)}
              role="button"
              tabIndex={0}
              id="opt-delete-activity"
            >
              <span>🗑️</span>
              <span>Eliminar</span>
            </div>
          </div>
        )}
      </ODCBottomSheet>

      {/* Hoja 3: Ajustar horario con validación en tiempo real */}
      <ODCBottomSheet
        isOpen={Boolean(timeAdjustActivity)}
        onClose={() => setTimeAdjustActivity(null)}
        id="sheet-adjust-time"
      >
        <div>
          <h2 className="text-2xl font-bold mb-2">Ajustar horario</h2>
          <div className="fw-row-2">
            <div>
              <label className="fw-label">Inicio</label>
              <input
                type="text"
                className="form-control w-full"
                value={startTime}
                onChange={(e) => {
                  setStartTime(e.target.value);
                  setTimeError(null);
                }}
                placeholder="11:00"
                id="input-time-start"
              />
            </div>
            <div>
              <label className="fw-label">Término</label>
              <input
                type="text"
                className={`form-control w-full ${timeError ? 'not-valid' : ''}`}
                value={endTime}
                onChange={(e) => {
                  setEndTime(e.target.value);
                  setTimeError(null);
                }}
                placeholder="10:30"
                id="input-time-end"
              />
            </div>
          </div>

          {timeError && (
            <div className="fw-field-error" role="alert">
              {timeError}
            </div>
          )}

          <ODCButton
            variant="primary"
            fullWidth
            className="mt-4"
            onClick={handleSaveAdjustTime}
            id="btn-save-time"
          >
            Guardar horario
          </ODCButton>
          <button
            type="button"
            className="btn fw-btn-ghost w-full mt-2"
            onClick={() => setTimeAdjustActivity(null)}
          >
            Cancelar
          </button>
        </div>
      </ODCBottomSheet>

      {/* Hoja 4: Cambiar actividad */}
      <ODCBottomSheet
        isOpen={Boolean(replaceActivity)}
        onClose={() => setReplaceActivity(null)}
        id="sheet-replace-activity"
      >
        <div>
          <h2 className="text-2xl font-bold mb-1">Cambiar esta actividad</h2>
          <p className="fw-muted text-sm mb-4">Te propondremos otra opción para el mismo horario.</p>
          <input
            className="form-control w-full"
            placeholder="¿Qué prefieres? Ej: algo gratis, bajo techo…"
            value={replacePrompt}
            onChange={(e) => setReplacePrompt(e.target.value)}
            id="input-replace-query"
          />
          <ODCButton
            variant="primary"
            fullWidth
            className="mt-4"
            onClick={handleConfirmReplace}
            id="btn-confirm-replace"
          >
            Buscar otra opción
          </ODCButton>
          <button
            type="button"
            className="btn fw-btn-ghost w-full mt-2"
            onClick={() => setReplaceActivity(null)}
          >
            Cancelar
          </button>
        </div>
      </ODCBottomSheet>

      {/* Hoja 5: Confirmación de eliminación */}
      <ODCBottomSheet
        isOpen={Boolean(deleteConfirmActivity)}
        onClose={() => setDeleteConfirmActivity(null)}
        id="sheet-delete-confirm"
      >
        {deleteConfirmActivity && (
          <div>
            <h2 className="text-2xl font-bold mb-1">¿Eliminar actividad?</h2>
            <p className="fw-muted text-sm mb-4">
              Se quitará {deleteConfirmActivity.title} y se recalcularán los costos.
            </p>
            <button
              type="button"
              className="fw-btn-danger"
              onClick={handleConfirmDelete}
              id="btn-confirm-delete"
            >
              Eliminar
            </button>
            <button
              type="button"
              className="btn fw-btn-ghost w-full mt-2"
              onClick={() => setDeleteConfirmActivity(null)}
            >
              Cancelar
            </button>
          </div>
        )}
      </ODCBottomSheet>

      {/* Hoja 6: Ajustar ruta / Rehacer itinerario */}
      <ODCBottomSheet
        isOpen={isAdjustRouteOpen}
        onClose={() => setIsAdjustRouteOpen(false)}
        id="sheet-adjust-route"
      >
        <div>
          <h2 className="text-2xl font-bold mb-3">Ajustar ruta</h2>
          <label className="fw-label">Destino</label>
          <input
            className="form-control w-full"
            value={adjDest}
            onChange={(e) => setAdjDest(e.target.value)}
          />

          <div className="mt-3 mb-2">
            <ODCDateRangePicker
              id="adjust-date-picker"
              startDate={adjStart}
              endDate={adjEnd}
              onChange={({ startDate: s, endDate: e }) => {
                setAdjStart(s);
                setAdjEnd(e);
              }}
            />
          </div>

          <label className="fw-label">Presupuesto</label>
          <ODCSegmentedControl
            options={[
              { id: 'budget', label: '$ Económico' },
              { id: 'standard', label: '$$ Estándar' },
              { id: 'premium', label: '$$$ Premium' },
            ]}
            value={adjBudget}
            onChange={setAdjBudget}
            idPrefix="adjust-budget"
          />
          <div className="mt-1.5 mb-2 p-2.5 rounded-xl bg-[#FAF8F5] border border-[var(--fw-border)] text-xs">
            <div className="font-bold text-[#264D33]">
              {BUDGET_TIER_DETAILS[adjBudget].symbol} {BUDGET_TIER_DETAILS[adjBudget].label}: {BUDGET_TIER_DETAILS[adjBudget].dailyRangeText}
            </div>
            <div className="text-stone-600 mt-0.5 leading-snug">
              {BUDGET_TIER_DETAILS[adjBudget].description}
            </div>
          </div>

          <label className="fw-label">Intereses</label>
          <ODCChipGroup
            options={DEFAULT_INTERESTS}
            selectedIds={adjInterests}
            onToggle={(id) => {
              setAdjInterests((prev) =>
                prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
              );
            }}
          />

          <label className="fw-label">¿Qué te gustaría cambiar?</label>
          <textarea
            className="form-control w-full min-h-[80px] pt-3 resize-none"
            value={adjNotes}
            onChange={(e) => setAdjNotes(e.target.value)}
          />

          <ODCButton
            variant="primary"
            fullWidth
            className="mt-4"
            onClick={handleApplyAdjustRoute}
            id="btn-apply-adjust-route"
          >
            Rehacer itinerario
          </ODCButton>
          <button
            type="button"
            className="btn fw-btn-ghost w-full mt-2"
            onClick={() => setIsAdjustRouteOpen(false)}
          >
            Cancelar
          </button>
        </div>
      </ODCBottomSheet>
    </div>
  );
};

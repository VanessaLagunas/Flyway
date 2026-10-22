import React, { useState, useEffect, useMemo } from 'react';
import { BudgetLevel } from '../types';
import { DEFAULT_INTERESTS, INSPIRATION_CARDS } from '../data/mockTrips';
import { searchDestinationMatches, ComunaSector } from '../data/destinationsData';
import { ODCInput } from '../odc-components/ODCInput';
import { ODCSegmentedControl } from '../odc-components/ODCSegmentedControl';
import { ODCChipGroup } from '../odc-components/ODCChipGroup';
import { ODCButton } from '../odc-components/ODCButton';
import { ODCDateRangePicker, getTodayISO, addDaysISO } from '../odc-components/ODCDateRangePicker';
import { getPexelsPhotoForDestination } from '../utils/photoUtils';
import { getWeatherAndClothingForTrip, getBudgetTierInfo } from '../utils/weatherUtils';
import { MapPin, Globe, Camera, Building2, Compass, Wallet } from 'lucide-react';

export interface ExploreScreenProps {
  onPlanRoute: (formData: {
    destination: string;
    startDate: string;
    endDate: string;
    budget: BudgetLevel;
    interests: string[];
  }) => void;
}

const CHILEAN_POPULAR_DESTINATIONS = [
  'San Pedro de Atacama',
  'Valparaíso',
  'Pucón',
  'Torres del Paine',
  'Chiloé (Castro)',
  'Santiago',
];

const WORLD_POPULAR_DESTINATIONS = [
  'Cusco, Perú',
  'Tokio, Japón',
  'Roma, Italia',
  'Buenos Aires',
];

/**
 * Pantalla Explorar (Guía 7.4)
 * Permite buscar un destino, elegir fechas, nivel de presupuesto e intereses
 */
export const ExploreScreen: React.FC<ExploreScreenProps> = ({ onPlanRoute }) => {
  const [destination, setDestination] = useState('Valparaíso, Chile');
  const [startDate, setStartDate] = useState(getTodayISO());
  const [endDate, setEndDate] = useState(addDaysISO(getTodayISO(), 1));
  const [budget, setBudget] = useState<BudgetLevel>('standard');
  const [selectedInterests, setSelectedInterests] = useState<string[]>([
    'gastronomy',
    'culture',
  ]);

  // Validation states
  const [destError, setDestError] = useState<string | null>(null);
  const [datesError, setDatesError] = useState<string | null>(null);
  const [interestsError, setInterestsError] = useState<string | null>(null);

  // Comuna and destination preview state
  const [selectedComuna, setSelectedComuna] = useState<ComunaSector | null>(null);

  // Live matching of destinations and comunas based on input
  const destinationMatches = useMemo(() => {
    return searchDestinationMatches(destination);
  }, [destination]);

  const matchedResult = destinationMatches.length > 0 ? destinationMatches[0] : null;
  const currentDest = matchedResult?.destination || null;
  const currentComunas = matchedResult?.allComunas || [];

  // Live weather, season & clothing calculation based on destination and selected dates
  const weatherInfo = useMemo(() => {
    return getWeatherAndClothingForTrip(destination || 'Valparaíso, Chile', startDate, endDate);
  }, [destination, startDate, endDate]);

  // Live budget tier info
  const budgetTier = useMemo(() => {
    return getBudgetTierInfo(budget);
  }, [budget]);

  // Auto-select initial comuna when destination match changes
  useEffect(() => {
    if (currentDest && currentComunas.length > 0) {
      const foundComuna = currentComunas.find(c =>
        destination.toLowerCase().includes(c.name.toLowerCase())
      );
      setSelectedComuna(foundComuna || currentComunas[0]);
    } else {
      setSelectedComuna(null);
    }
  }, [currentDest?.id, destination]);

  // Live Pexels destination photo preview (always matched to destination immediately)
  const [previewPhoto, setPreviewPhoto] = useState<{
    url: string;
    photographer: string;
    photographerUrl: string;
  } | null>(() => {
    const initial = getPexelsPhotoForDestination('Valparaíso, Chile', 0);
    return {
      url: initial.url,
      photographer: initial.photographer,
      photographerUrl: initial.photographerUrl,
    };
  });

  useEffect(() => {
    if (!destination.trim()) {
      setPreviewPhoto(null);
      return;
    }

    // Immediate local destination-accurate photo so it never lags or mismatches
    const localPhoto = selectedComuna?.imageUrl
      ? {
          url: selectedComuna.imageUrl,
          photographer: selectedComuna.photographer || 'Pexels',
          photographerUrl: 'https://www.pexels.com',
        }
      : currentDest?.heroImage
      ? {
          url: currentDest.heroImage,
          photographer: currentDest.photographer || 'Pexels',
          photographerUrl: 'https://www.pexels.com',
        }
      : (() => {
          const fallback = getPexelsPhotoForDestination(destination, 0);
          return {
            url: fallback.url,
            photographer: fallback.photographer,
            photographerUrl: fallback.photographerUrl,
          };
        })();

    setPreviewPhoto(localPhoto);

    // If not in static catalog, also query backend Pexels API
    if (!currentDest && destination.trim().length >= 3) {
      const timer = setTimeout(async () => {
        try {
          const bffUrl = (import.meta.env.VITE_BFF_URL as string) || 'http://localhost:4000/api/v1';
          const res = await fetch(`${bffUrl}/photos?query=${encodeURIComponent(destination.trim())}&count=1`);
          if (res.ok) {
            const data = await res.json();
            if (data.photos && data.photos.length > 0) {
              setPreviewPhoto(data.photos[0]);
            }
          }
        } catch {
          // Keep verified local fallback
        }
      }, 400);

      return () => clearTimeout(timer);
    }
  }, [destination, currentDest?.id, selectedComuna?.name]);

  const budgetOptions: { id: BudgetLevel; label: string }[] = [
    { id: 'budget', label: 'Económico ($)' },
    { id: 'standard', label: 'Estándar ($$)' },
    { id: 'premium', label: 'Premium ($$$)' },
  ];

  const toggleInterest = (id: string) => {
    setSelectedInterests((prev) => {
      const next = prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id];
      if (next.length > 0) {
        setInterestsError(null);
      }
      return next;
    });
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    let hasError = false;
    if (!destination.trim()) {
      setDestError('Cuéntanos a dónde quieres ir.');
      hasError = true;
    } else {
      setDestError(null);
    }

    if (selectedInterests.length === 0) {
      setInterestsError('Elige al menos un interés para personalizar tu ruta.');
      hasError = true;
    } else {
      setInterestsError(null);
    }

    if (endDate < startDate) {
      setDatesError('La fecha de vuelta no puede ser anterior a la de ida.');
      hasError = true;
    } else {
      setDatesError(null);
    }

    if (hasError) return;

    onPlanRoute({
      destination,
      startDate,
      endDate,
      budget,
      interests: selectedInterests,
    });
  };

  const handleSelectInspo = (inspo: typeof INSPIRATION_CARDS[0]) => {
    setDestination(inspo.destination);
    setBudget(inspo.budget);
    setDestError(null);
  };

  const handlePickDestination = (city: string) => {
    setDestination(city);
    setDestError(null);
  };

  return (
    <div className="fw-page" id="explore-page">
      <h1>Comienza tu aventura</h1>
      <p className="fw-muted text-base mb-4">
        Cuéntanos qué buscas y armamos tu ruta personalizada con IA en minutos.
      </p>

      <form onSubmit={handleSubmit} className="fw-card" noValidate>
        <ODCInput
          id="input-destination"
          label="Destino"
          placeholder="¿A dónde quieres ir? (ej: San Pedro de Atacama, Pucón, Tokio...)"
          value={destination}
          onChange={(e) => {
            setDestination(e.target.value);
            if (e.target.value.trim()) setDestError(null);
          }}
          error={destError || undefined}
        />

        {/* Sugerencias Rápidas de Destinos (Chile y Mundo) */}
        <div className="mt-2.5 mb-2 text-xs">
          <div className="text-[#6B6A63] font-medium flex items-center gap-1 mb-1.5">
            <MapPin className="w-3.5 h-3.5 text-[#4A7C59]" />
            <span>Destinos destacados en Chile:</span>
          </div>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {CHILEAN_POPULAR_DESTINATIONS.map((city) => (
              <button
                key={city}
                type="button"
                onClick={() => handlePickDestination(city)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors border ${
                  destination.toLowerCase().includes(city.toLowerCase().split(' ')[0])
                    ? 'bg-[#4A7C59] text-white border-[#4A7C59] shadow-xs'
                    : 'bg-[#FAF8F5] text-[#2F4F39] border-[var(--fw-border)] hover:bg-[#E1F2E2]'
                }`}
              >
                🇨🇱 {city}
              </button>
            ))}
          </div>

          <div className="text-[#6B6A63] font-medium flex items-center gap-1 mb-1.5">
            <Globe className="w-3.5 h-3.5 text-[#2A4D34]" />
            <span>Destinos internacionales:</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {WORLD_POPULAR_DESTINATIONS.map((city) => (
              <button
                key={city}
                type="button"
                onClick={() => handlePickDestination(city)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors border ${
                  destination.toLowerCase().includes(city.toLowerCase().split(',')[0])
                    ? 'bg-[#4A7C59] text-white border-[#4A7C59]'
                    : 'bg-[#FAF8F5] text-[#42443C] border-[var(--fw-border)] hover:bg-[#EAE6DF]'
                }`}
              >
                ✈️ {city}
              </button>
            ))}
          </div>
        </div>

        {/* Panel de Recomendaciones y Previsualización en Vivo de Comunas y Sectores */}
        {currentDest ? (
          <div className="my-3 p-3.5 rounded-xl border-2 border-[#4A7C59]/30 bg-[#F4F9F4] text-[#1E1F19] transition-all animate-fadeIn shadow-xs">
            {/* Cabecera del Destino con Región y Rango de Precios */}
            <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-[#4A7C59]/20">
              <div>
                <div className="flex items-center gap-1.5 font-bold text-sm text-[#1E1F19]">
                  <span className="text-base">{currentDest.flag}</span>
                  <span>{currentDest.name}</span>
                  <span className="text-xs font-medium text-[#4A7C59] bg-[#E1F2E2] px-2 py-0.5 rounded-full">
                    {currentDest.region}
                  </span>
                </div>
                <p className="text-[11px] text-[#556358] mt-0.5">
                  {currentDest.description}
                </p>
              </div>
              <div className="text-right shrink-0">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[#6B6A63] block">
                  Rango diario
                </span>
                <span className="text-xs font-bold text-[#2F4F39]">
                  {currentDest.priceRangeText}
                </span>
              </div>
            </div>

            {/* Selector interactivo de Comunas y Sectores */}
            {currentComunas.length > 0 && (
              <div className="mt-2.5">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="text-xs font-bold text-[#1E1F19] flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-[#4A7C59]" />
                    <span>Comunas y sectores recomendados:</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setDestination(currentDest.name);
                      setSelectedComuna(null);
                    }}
                    className="text-[11px] text-[#4A7C59] hover:underline font-semibold"
                  >
                    Ver todas
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5 mb-2.5">
                  {currentComunas.map((comuna, cIdx) => {
                    const isSelected = selectedComuna?.name === comuna.name || destination.toLowerCase().includes(comuna.name.toLowerCase());
                    return (
                      <button
                        key={`${comuna.name}-${cIdx}`}
                        type="button"
                        onClick={() => {
                          setSelectedComuna(comuna);
                          setDestination(`${currentDest.name} (${comuna.name})`);
                          if (destError) setDestError(null);
                        }}
                        className={`px-2.5 py-1 rounded-lg text-left transition-all border text-[11px] flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-[#4A7C59] text-white border-[#4A7C59] shadow-xs'
                            : 'bg-white text-[#2F4F39] border-[#DCE8DC] hover:border-[#4A7C59]/60 hover:bg-[#EAF3EA]'
                        }`}
                      >
                        <span className="font-semibold">{comuna.name}</span>
                        {comuna.badge && (
                          <span
                            className={`text-[9px] px-1.5 py-0.2 rounded-sm font-medium ${
                              isSelected
                                ? 'bg-white/20 text-white'
                                : 'bg-[#EAF3EA] text-[#4A7C59]'
                            }`}
                          >
                            {comuna.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Detalle compacto de la Comuna Seleccionada */}
                {selectedComuna && (
                  <div className="p-2.5 rounded-lg bg-white border border-[#DCE8DC] text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <div className="font-bold text-[#1E1F19] flex items-center gap-1">
                        <Compass className="w-3.5 h-3.5 text-[#4A7C59]" />
                        <span>Sector {selectedComuna.name}:</span>
                      </div>
                      <span className="text-[10px] text-[#6B6A63] bg-[#FAF8F5] px-1.5 py-0.5 rounded border border-[#EBE6DD]">
                        {selectedComuna.badge || 'Imperdible'}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#556358] m-0">
                      {selectedComuna.description}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : null}

        {/* Vista previa en vivo de fotografía del destino (sin texto sobrepuesto en la imagen) */}
        {previewPhoto && destination.trim().length >= 3 && (
          <div className="mb-3.5 rounded-xl overflow-hidden border border-[var(--fw-border)] bg-[#FAF8F5] transition-all animate-fadeIn shadow-2xs">
            <div className="relative h-36 sm:h-44 w-full overflow-hidden bg-[#F1ECE2]">
              <img
                src={previewPhoto.url}
                alt={destination}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  const fallback = getPexelsPhotoForDestination(destination, 0);
                  if (e.currentTarget.src !== fallback.url) {
                    e.currentTarget.src = fallback.url;
                  }
                }}
              />
            </div>
            <div className="px-3 py-2 bg-[#FAF8F5] border-t border-[var(--fw-border)] flex items-center justify-between gap-2 text-[11px] text-[var(--fw-text)]">
              <div className="flex items-center gap-1.5 font-semibold truncate">
                <Camera className="w-3.5 h-3.5 text-[#4A7C59] shrink-0" />
                <span className="truncate">
                  Postal de {destination} · Foto por {previewPhoto.photographer}
                </span>
              </div>
              <span className="shrink-0 font-bold text-[10px] text-[#2F4F39] bg-[#E1F2E2] px-2 py-0.5 rounded-full border border-[#4A7C59]/20">
                Pexels Verificado
              </span>
            </div>
          </div>
        )}

        {/* Selector de Fechas con Rango Seguro (Calendario Único) */}
        <div className="mt-3 mb-2">
          <ODCDateRangePicker
            id="explore-date-picker"
            startDate={startDate}
            endDate={endDate}
            minDate={getTodayISO()}
            error={datesError || undefined}
            onChange={({ startDate: newStart, endDate: newEnd }) => {
              setStartDate(newStart);
              setEndDate(newEnd);
              if (newEnd >= newStart) {
                setDatesError(null);
              }
            }}
          />
        </div>

        {/* Selector de Presupuesto con Rango de $ CLP */}
        <div className="mt-4 mb-2 flex justify-between items-center">
          <label className="fw-label m-0 flex items-center gap-1.5">
            <Wallet className="w-3.5 h-3.5 text-[#4A7C59]" />
            <span>Nivel de Presupuesto</span>
          </label>
          <span className="fw-badge">{budgetTier.dailyRangeText}</span>
        </div>

        <ODCSegmentedControl
          options={budgetOptions}
          value={budget}
          onChange={setBudget}
          idPrefix="explore-budget"
        />

        {/* Resumen compacto del presupuesto seleccionado */}
        <div
          id="explore-budget-detail-card"
          className="mt-2.5 p-2.5 rounded-xl border border-[#4A7C59]/25 bg-[#F4F9F4] text-xs flex flex-wrap items-center justify-between gap-2"
        >
          <span className="font-semibold text-[#1E1F19] text-[11px]">
            {budgetTier.shortTitle}
          </span>
          <span className="text-[11px] font-bold text-[#2F4F39]">
            Total est. ({weatherInfo.daysCount}d): $
            {(budgetTier.minDailyClp * weatherInfo.daysCount).toLocaleString('es-CL')} – $
            {(budgetTier.maxDailyClp * weatherInfo.daysCount).toLocaleString('es-CL')} CLP
          </span>
        </div>

        <div className="mt-4">
          <ODCChipGroup
            label="Intereses"
            options={DEFAULT_INTERESTS}
            selectedIds={selectedInterests}
            onToggle={toggleInterest}
            error={interestsError || undefined}
          />
        </div>

        <ODCButton
          type="submit"
          id="btn-plan-route"
          variant="primary"
          fullWidth
          className="mt-4"
        >
          Planificar mi Ruta
        </ODCButton>
      </form>

      <div className="fw-section-title">
        <h2>Inspírate con Pexels</h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {INSPIRATION_CARDS.map((inspo) => {
          const inspoBudget = getBudgetTierInfo(inspo.budget);
          return (
            <div
              key={inspo.id}
              className="group rounded-2xl overflow-hidden bg-white border border-[var(--fw-border)] shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col"
              onClick={() => handleSelectInspo(inspo)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleSelectInspo(inspo);
                }
              }}
              aria-label={`Inspirarse en ${inspo.title}`}
            >
              <div className="relative h-36 w-full overflow-hidden bg-[#F1ECE2]">
                <img
                  src={inspo.image}
                  alt={inspo.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    e.currentTarget.src = 'https://images.pexels.com/photos/17808457/pexels-photo-17808457.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940';
                  }}
                />
                <div className="absolute top-2.5 right-2.5 bg-[#FAF8F5]/95 text-[#1E1F19] text-[10px] font-semibold px-2.5 py-0.5 rounded-full border border-[var(--fw-border)] shadow-2xs">
                  📸 {inspo.photographer || 'Pexels'}
                </div>
              </div>
              <div className="p-3.5 flex items-center justify-between gap-2 bg-white">
                <div className="min-w-0">
                  <h3 className="m-0 text-base font-bold text-[#1E1F19] truncate group-hover:text-[#4A7C59] transition-colors">
                    {inspo.title}
                  </h3>
                  <div className="text-xs text-[var(--fw-text-muted)] truncate">
                    📍 {inspo.destination}
                  </div>
                </div>
                <span className="shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-full bg-[#F2E9D8] text-[#8B6F3E]">
                  {inspoBudget.label} ({inspoBudget.symbol})
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

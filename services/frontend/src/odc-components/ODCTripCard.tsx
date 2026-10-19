import React, { useState } from 'react';
import { Trip } from '../types';
import { ODCButton } from './ODCButton';
import { getPexelsPhotoForDestination } from '../utils/photoUtils';
import { getWeatherAndClothingForTrip, getBudgetTierInfo } from '../utils/weatherUtils';

export interface ODCTripCardProps {
  trip: Trip;
  onView: (trip: Trip) => void;
  onToggleFavorite?: (trip: Trip) => void;
  isPrimaryButton?: boolean;
}

/**
 * Reusable OutSystems ODC TripCard Block
 * Used in Saved Routes (Guía 7.6) and search results
 */
export const ODCTripCard: React.FC<ODCTripCardProps> = ({
  trip,
  onView,
  onToggleFavorite,
  isPrimaryButton = true,
}) => {
  const [imgError, setImgError] = useState(false);
  const fallbackPhoto = getPexelsPhotoForDestination(trip.destination, 0);
  const displayImg = !imgError && trip.imageUrl ? trip.imageUrl : fallbackPhoto.url;
  const weatherInfo = getWeatherAndClothingForTrip(trip.destination, trip.startDate, trip.endDate);
  const budgetTier = getBudgetTierInfo(trip.budgetLevel);
  const displaySeason = trip.season && trip.season !== 'Temporada Actual' ? trip.season : weatherInfo.season;
  const displayTemp = trip.temperatureRange || weatherInfo.temperatureRange;

  return (
    <div className="fw-trip-card" id={`trip-card-${trip.id}`}>
      <div className="fw-trip-card__media fw-img-fallback overflow-hidden relative" style={{ height: 180 }}>
        <img
          src={displayImg}
          alt={trip.title}
          className="w-full h-full object-cover"
          onError={() => setImgError(true)}
          referrerPolicy="no-referrer"
        />
        {onToggleFavorite && (
          <button
            type="button"
            className="fw-fav shadow-sm"
            aria-label="Quitar o añadir a favoritos"
            style={{ color: trip.isFavorite ? 'var(--color-error)' : 'var(--fw-text-muted)' }}
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(trip);
            }}
          >
            {trip.isFavorite ? '♥' : '♡'}
          </button>
        )}
      </div>

      <div className="fw-trip-card__body">
        <div className="flex flex-wrap items-center gap-1.5 mb-2">
          <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#E1F2E2] text-[#2F4F39] border border-[#4A7C59]/25">
            {weatherInfo.seasonIcon} {displaySeason}
          </span>
          <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-[#F7F4ED] text-[#1E1F19] border border-[var(--fw-border)]">
            🌡️ {displayTemp}
          </span>
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#F2E9D8] text-[#8B6F3E]">
            {budgetTier.label} ({budgetTier.symbol})
          </span>
        </div>

        <h3 className="m-0 text-lg font-bold text-[#1E1F19]">{trip.title}</h3>
        <div className="text-xs text-[var(--fw-text-muted)] font-medium mt-0.5">
          📍 {trip.destination} · 📅 {trip.datesText}
        </div>
        <div className="fw-trip-card__summary">{trip.summary}</div>

        <div className="mt-2.5 p-2 rounded-lg bg-[#FAF8F5] border border-[var(--fw-border)] text-[11px] text-[#1E1F19]">
          <span className="font-bold text-[#8B6F3E]">👕 Qué usar: </span>
          <span className="text-[var(--fw-text-muted)]">
            {trip.clothingTip || weatherInfo.clothingTip}
          </span>
        </div>

        <div className="fw-trip-card__foot">
          <div>
            <span className="text-[10px] uppercase tracking-wider text-[var(--fw-text-muted)] block font-semibold">
              Presupuesto Total
            </span>
            <span className="fw-price">
              ${trip.totalCost.toLocaleString('es-CL')} {trip.currency}
            </span>
          </div>
          <ODCButton
            variant={isPrimaryButton ? 'primary' : 'outline'}
            onClick={() => onView(trip)}
            id={`btn-view-${trip.id}`}
          >
            Ver Itinerario
          </ODCButton>
        </div>
      </div>
    </div>
  );
};

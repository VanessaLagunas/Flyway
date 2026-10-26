import React, { useState } from 'react';
import { Trip } from '../types';
import { ODCTripCard } from '../odc-components/ODCTripCard';
import { ODCBottomSheet } from '../odc-components/ODCBottomSheet';
import { ODCButton } from '../odc-components/ODCButton';

export interface SavedTripsScreenProps {
  savedTrips: Trip[];
  onViewTrip: (trip: Trip) => void;
  onRemoveTrip: (tripId: string) => void;
  onGoToExplore: () => void;
  userEmail?: string | null;
  onOpenLogin?: () => void;
}

export const SavedTripsScreen: React.FC<SavedTripsScreenProps> = ({
  savedTrips,
  onViewTrip,
  onRemoveTrip,
  onGoToExplore,
  userEmail,
  onOpenLogin,
}) => {
  const [tripToRemove, setTripToRemove] = useState<Trip | null>(null);

  const handleConfirmRemove = () => {
    if (tripToRemove) {
      onRemoveTrip(tripToRemove.id);
      setTripToRemove(null);
    }
  };

  return (
    <div className="fw-page" id="saved-trips-page">
      <h1 className="m-0 mb-1 text-3xl font-bold">Mis Rutas Guardadas</h1>
      {savedTrips.length > 0 && (
        <p className="fw-muted text-base mb-4">
          Tus próximas aventuras, listas cuando las necesites.
        </p>
      )}

      {!userEmail && (
        <div className="mb-5 p-3 rounded-xl bg-[#E1F2E2]/60 border border-[#C6E4C8] flex items-center justify-between gap-3 text-xs">
          <span className="text-[#264D33] font-medium">
            💡 Inicia sesión para sincronizar tus rutas guardadas en la base de datos de la nube.
          </span>
          {onOpenLogin && (
            <button
              type="button"
              onClick={onOpenLogin}
              className="text-[#264D33] font-bold hover:underline shrink-0 cursor-pointer"
            >
              Iniciar sesión →
            </button>
          )}
        </div>
      )}

      {savedTrips.length === 0 ? (
        <div className="fw-empty">
          <div className="fw-empty__icon" aria-hidden="true">
            ♡
          </div>
          <h2 className="text-2xl font-bold mb-2">Aún no guardas rutas</h2>
          <p className="fw-muted text-base mb-6">
            Cuando guardes un itinerario, lo verás aquí.
          </p>
          <ODCButton
            variant="primary"
            onClick={onGoToExplore}
            id="btn-plan-first-route"
          >
            Planificar mi primera ruta
          </ODCButton>
        </div>
      ) : (
        <div className="fw-saved-grid">
          {savedTrips.map((trip, idx) => (
            <ODCTripCard
              key={trip.id}
              trip={trip}
              onView={onViewTrip}
              onToggleFavorite={(t) => setTripToRemove(t)}
              isPrimaryButton={idx === 0}
            />
          ))}
        </div>
      )}

      {/* Hoja de confirmación para quitar de guardados */}
      <ODCBottomSheet
        isOpen={Boolean(tripToRemove)}
        onClose={() => setTripToRemove(null)}
        id="sheet-remove-confirm"
      >
        {tripToRemove && (
          <div>
            <h2 className="text-2xl font-bold mb-1">¿Quitar de guardados?</h2>
            <p className="fw-muted text-base mb-6">
              La ruta {tripToRemove.title} dejará de aparecer en tu lista.
            </p>
            <button
              type="button"
              className="fw-btn-danger"
              onClick={handleConfirmRemove}
              id="btn-confirm-remove"
            >
              Quitar
            </button>
            <button
              type="button"
              className="btn fw-btn-ghost w-full mt-2"
              onClick={() => setTripToRemove(null)}
            >
              Cancelar
            </button>
          </div>
        )}
      </ODCBottomSheet>
    </div>
  );
};

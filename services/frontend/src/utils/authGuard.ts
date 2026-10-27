import { Trip } from '../types';

export const SAVE_AUTH_REQUIRED_MESSAGE =
  'Debes iniciar sesión previamente para guardar esta ruta. El guardado de itinerarios solo está disponible para usuarios con sesión iniciada.';

export const SAVE_SESSION_EXPIRED_MESSAGE =
  'Tu sesión expiró. Debes iniciar sesión nuevamente para poder guardar esta ruta.';

export function isUserAuthenticated(
  authToken: string | null | undefined,
  userEmail: string | null | undefined
): boolean {
  return Boolean(
    typeof authToken === 'string' &&
      authToken.trim().length > 0 &&
      typeof userEmail === 'string' &&
      userEmail.trim().length > 0
  );
}

export function getSavedTripsStorageKey(userEmail: string | null | undefined): string | null {
  if (typeof userEmail !== 'string' || !userEmail.trim()) {
    return null;
  }
  return `flyway_saved_trips:${userEmail.trim().toLowerCase()}`;
}

export type SaveTripDecision =
  | {
      allowed: false;
      action: 'require_auth';
      nextSavedTrips: Trip[];
      savedTrip: null;
      message: string;
    }
  | {
      allowed: true;
      action: 'saved';
      nextSavedTrips: Trip[];
      savedTrip: Trip;
      message: null;
    }
  | {
      allowed: true;
      action: 'removed';
      nextSavedTrips: Trip[];
      savedTrip: null;
      message: null;
    };

export function evaluateSaveTripAttempt(params: {
  authToken: string | null | undefined;
  userEmail: string | null | undefined;
  savedTrips: Trip[];
  tripToSave: Trip;
}): SaveTripDecision {
  const { authToken, userEmail, savedTrips, tripToSave } = params;

  if (!isUserAuthenticated(authToken, userEmail)) {
    return {
      allowed: false,
      action: 'require_auth',
      nextSavedTrips: savedTrips,
      savedTrip: null,
      message: SAVE_AUTH_REQUIRED_MESSAGE,
    };
  }

  const exists = savedTrips.some((t) => t.id === tripToSave.id);
  if (exists) {
    return {
      allowed: true,
      action: 'removed',
      nextSavedTrips: savedTrips.filter((t) => t.id !== tripToSave.id),
      savedTrip: null,
      message: null,
    };
  }

  const savedCopy: Trip = { ...tripToSave, isFavorite: true };
  return {
    allowed: true,
    action: 'saved',
    nextSavedTrips: [savedCopy, ...savedTrips],
    savedTrip: savedCopy,
    message: null,
  };
}

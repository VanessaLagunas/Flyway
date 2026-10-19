import React from 'react';
import { ActiveScreen } from '../types';

export interface ODCBottomNavProps {
  activeTab: ActiveScreen;
  onTabChange: (tab: ActiveScreen) => void;
  savedCount?: number;
}

/**
 * Reusable OutSystems ODC BottomNav Block
 * Fixed navigation bar with mobile ergonomics and safe area padding
 */
export const ODCBottomNav: React.FC<ODCBottomNavProps> = ({
  activeTab,
  onTabChange,
  savedCount,
}) => {
  const isExploreActive = activeTab === 'explore' || activeTab === 'itinerary';
  const isSavedActive = activeTab === 'saved';

  return (
    <nav className="fw-bottom-nav" role="navigation" aria-label="Navegación principal">
      <button
        type="button"
        id="nav-explore"
        className={`fw-bottom-nav__item ${isExploreActive ? 'is-active' : ''}`}
        onClick={() => onTabChange('explore')}
        aria-current={isExploreActive ? 'page' : undefined}
      >
        <span className="text-xl" role="img" aria-label="Explorar">
          ✈️
        </span>
        <span>Explorar</span>
      </button>

      <button
        type="button"
        id="nav-saved"
        className={`fw-bottom-nav__item ${isSavedActive ? 'is-active' : ''}`}
        onClick={() => onTabChange('saved')}
        aria-current={isSavedActive ? 'page' : undefined}
      >
        <div className="relative inline-flex items-center justify-center">
          <span className="text-xl" role="img" aria-label="Guardados">
            ♥
          </span>
          {savedCount !== undefined && savedCount > 0 && (
            <span className="absolute -top-1 -right-3 px-1.5 py-0.2 bg-[var(--color-primary)] text-white text-[10px] font-bold rounded-full">
              {savedCount}
            </span>
          )}
        </div>
        <span>Guardados</span>
      </button>
    </nav>
  );
};

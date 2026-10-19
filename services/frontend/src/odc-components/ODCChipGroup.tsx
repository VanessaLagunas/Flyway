import React from 'react';
import { InterestOption } from '../types';

export interface ODCChipGroupProps {
  options: InterestOption[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  label?: string;
  error?: string;
  className?: string;
}

/**
 * Reusable OutSystems ODC Tag/Chip Selector Block
 * Maps to OutSystems UI Tag list with toggleable active state
 */
export const ODCChipGroup: React.FC<ODCChipGroupProps> = ({
  options,
  selectedIds,
  onToggle,
  label,
  error,
  className = '',
}) => {
  return (
    <div className={`w-full ${className}`}>
      {label && <label className="fw-label">{label}</label>}
      <div className="flex flex-wrap items-center">
        {options.map((option) => {
          const isActive = selectedIds.includes(option.id);
          return (
            <button
              type="button"
              key={option.id}
              id={`chip-${option.id}`}
              className={`fw-chip ${isActive ? 'is-active' : ''}`}
              onClick={() => onToggle(option.id)}
              aria-pressed={isActive}
            >
              <span>{option.icon}</span>
              <span>{option.label}</span>
            </button>
          );
        })}
      </div>
      {error && (
        <div className="fw-field-error" role="alert">
          {error}
        </div>
      )}
    </div>
  );
};

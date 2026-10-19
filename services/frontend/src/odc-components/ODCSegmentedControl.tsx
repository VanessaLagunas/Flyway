import React from 'react';

export interface SegmentOption<T extends string = string> {
  id: T;
  label: string;
}

export interface ODCSegmentedControlProps<T extends string = string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  idPrefix?: string;
}

/**
 * Reusable OutSystems ODC Segmented Control Block
 * Maps to OutSystems UI ButtonGroup with custom .fw-segmented styling
 */
export function ODCSegmentedControl<T extends string = string>({
  options,
  value,
  onChange,
  className = '',
  idPrefix = 'segmented',
}: ODCSegmentedControlProps<T>) {
  return (
    <div className={`fw-segmented ${className}`} role="radiogroup">
      {options.map((option) => {
        const isActive = option.id === value;
        return (
          <div
            key={option.id}
            id={`${idPrefix}-${option.id}`}
            role="radio"
            aria-checked={isActive}
            tabIndex={0}
            className={`fw-segmented__item ${isActive ? 'is-active' : ''}`}
            onClick={() => onChange(option.id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onChange(option.id);
              }
            }}
          >
            {option.label}
          </div>
        );
      })}
    </div>
  );
}

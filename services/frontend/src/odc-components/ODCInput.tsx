import React from 'react';

export interface ODCInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  badge?: React.ReactNode;
  containerClassName?: string;
}

/**
 * Reusable OutSystems ODC Input Block
 * Generates OutSystems UI standard Input structure:
 * - Label (.fw-label)
 * - Input element (.form-control / .fw-input)
 * - Validation error message (.fw-field-error)
 */
export const ODCInput: React.FC<ODCInputProps> = ({
  label,
  error,
  badge,
  className = '',
  containerClassName = '',
  ...props
}) => {
  const isInvalid = Boolean(error);

  return (
    <div className={`w-full ${containerClassName}`}>
      {(label || badge) && (
        <div className="flex justify-between items-center">
          {label && <label className="fw-label">{label}</label>}
          {badge && <div>{badge}</div>}
        </div>
      )}
      <input
        className={`form-control w-full ${isInvalid ? 'not-valid' : ''} ${className}`}
        {...props}
      />
      {isInvalid && (
        <div className="fw-field-error" role="alert">
          {error}
        </div>
      )}
    </div>
  );
};

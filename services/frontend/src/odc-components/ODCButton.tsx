import React from 'react';

export interface ODCButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outline' | 'ghost' | 'danger';
  fullWidth?: boolean;
  children: React.ReactNode;
  icon?: React.ReactNode;
}

/**
 * Reusable OutSystems ODC Button Block
 * Corresponds to OutSystems UI Button with style classes:
 * - btn-primary / fw-btn-primary
 * - fw-btn-outline
 * - fw-btn-ghost
 * - fw-btn-danger
 */
export const ODCButton: React.FC<ODCButtonProps> = ({
  variant = 'primary',
  fullWidth = false,
  children,
  icon,
  className = '',
  disabled,
  ...props
}) => {
  let variantClass = 'btn-primary fw-btn-primary';

  if (variant === 'outline') {
    variantClass = 'fw-btn-outline';
  } else if (variant === 'ghost') {
    variantClass = 'fw-btn-ghost';
  } else if (variant === 'danger') {
    variantClass = 'fw-btn-danger';
  }

  const widthClass = fullWidth ? 'w-full' : '';

  return (
    <button
      className={`btn ${variantClass} ${widthClass} ${className}`}
      disabled={disabled}
      {...props}
    >
      {icon && <span className="mr-2 inline-flex items-center">{icon}</span>}
      {children}
    </button>
  );
};

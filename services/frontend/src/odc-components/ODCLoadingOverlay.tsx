import React from 'react';
import { AnimatePresence, motion } from 'motion/react';

export interface ODCLoadingOverlayProps {
  isLoading: boolean;
  title?: string;
  subtitle?: string;
}

/**
 * Reusable OutSystems ODC LoadingOverlay Block
 * Shows full screen animated spinner and customizable status message
 */
export const ODCLoadingOverlay: React.FC<ODCLoadingOverlayProps> = ({
  isLoading,
  title = 'Creando tu ruta',
  subtitle = 'Ajustando a tu presupuesto…',
}) => {
  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          key="loading-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fw-loading"
          role="status"
          aria-live="polite"
        >
          <div className="fw-spinner" />
          <h2 className="m-0 text-2xl font-bold">{title}</h2>
          <div className="fw-muted text-base">{subtitle}</div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

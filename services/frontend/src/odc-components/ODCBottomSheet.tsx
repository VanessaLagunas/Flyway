import React, { useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';

export interface ODCBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  id?: string;
}

/**
 * Reusable OutSystems ODC Bottom Sheet / Popup Block
 * Follows the OutSystems UI Popup with Style Classes = "fw-sheet"
 */
export const ODCBottomSheet: React.FC<ODCBottomSheetProps> = ({
  isOpen,
  onClose,
  children,
  id = 'popup-sheet',
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fw-backdrop"
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.div
            key="sheet"
            id={id}
            role="dialog"
            aria-modal="true"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            className="popup-dialog fw-sheet"
          >
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

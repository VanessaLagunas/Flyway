import React, { useState, useRef, useEffect } from 'react';

export interface ODCHeaderProps {
  onLogoClick?: () => void;
  onOpenLogin?: () => void;
  userEmail?: string | null;
  onLogout?: () => void;
}

/**
 * Reusable OutSystems ODC Header Block
 * Displays brand logo, user avatar, and user profile popover
 */
export const ODCHeader: React.FC<ODCHeaderProps> = ({
  onLogoClick,
  onOpenLogin,
  userEmail,
  onLogout,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuOpen]);

  return (
    <header className="fw-header" ref={menuRef}>
      <button
        type="button"
        className="fw-logo bg-transparent border-0 cursor-pointer p-0 text-left"
        onClick={onLogoClick}
        aria-label="Ir al inicio de Flyway"
      >
        Flyway
      </button>

      <div className="flex items-center gap-2">
        {userEmail ? (
          <div className="relative">
            <button
              type="button"
              className="fw-avatar flex items-center justify-center font-bold text-xs bg-[#E1F2E2] text-[#264D33] border border-[#C6E4C8]"
              onClick={() => setMenuOpen((prev) => !prev)}
              aria-label="Menú de usuario"
              aria-expanded={menuOpen}
              id="btn-user-avatar"
            >
              {userEmail.slice(0, 2).toUpperCase()}
            </button>

            {menuOpen && (
              <div className="fw-user-menu" role="menu">
                <div className="px-3 py-2 text-xs font-semibold text-[var(--fw-text-muted)] border-b border-[var(--fw-border)] mb-1 truncate">
                  👤 {userEmail}
                </div>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    if (onLogout) onLogout();
                  }}
                >
                  <span>🚪</span> Cerrar sesión
                </button>
              </div>
            )}
          </div>
        ) : (
          <button
            type="button"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-[#FAF8F5] text-[#1E1F19] border border-[var(--fw-border)] hover:border-[#4A7C59] hover:bg-white transition-all shadow-2xs cursor-pointer"
            onClick={onOpenLogin}
            id="btn-header-login"
            aria-label="Iniciar sesión"
          >
            <span>🔑</span> Iniciar sesión
          </button>
        )}
      </div>
    </header>
  );
};

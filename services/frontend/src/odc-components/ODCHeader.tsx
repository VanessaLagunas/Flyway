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

      <div className="relative">
        <button
          type="button"
          className="fw-avatar"
          onClick={() => setMenuOpen((prev) => !prev)}
          aria-label="Menú de usuario"
          aria-expanded={menuOpen}
          id="btn-user-avatar"
        >
          👤
        </button>

        {menuOpen && (
          <div className="fw-user-menu" role="menu">
            {userEmail ? (
              <>
                <div className="px-3 py-2 text-xs font-semibold text-[var(--fw-text-muted)] border-b border-[var(--fw-border)] mb-1 truncate">
                  {userEmail}
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
              </>
            ) : (
              <>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    if (onOpenLogin) onOpenLogin();
                  }}
                >
                  <span>🔑</span> Iniciar sesión
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    if (onOpenLogin) onOpenLogin();
                  }}
                >
                  <span>✨</span> Crear cuenta
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </header>
  );
};

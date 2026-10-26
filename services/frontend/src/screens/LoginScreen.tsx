import React, { useState, useEffect, useRef } from 'react';
import { ODCInput } from '../odc-components/ODCInput';
import { ODCButton } from '../odc-components/ODCButton';
import { getBffUrl } from '../utils/apiUrl';

export interface AuthUser {
  id: number;
  email: string;
  name: string;
  auth_provider?: string;
  avatar_url?: string | null;
}

export interface LoginScreenProps {
  onLoginSuccess: (email: string, user?: AuthUser, token?: string) => void;
  onContinueWithoutAccount: () => void;
}

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential?: string }) => void;
            auto_select?: boolean;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: {
              theme?: 'outline' | 'filled_blue' | 'filled_black';
              size?: 'large' | 'medium' | 'small';
              text?: 'signin_with' | 'signup_with' | 'continue_with';
              shape?: 'rectangular' | 'pill' | 'circle' | 'square';
              width?: number;
              logo_alignment?: 'left' | 'center';
            }
          ) => void;
          prompt: () => void;
        };
      };
    };
  }
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onLoginSuccess,
  onContinueWithoutAccount,
}) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('Viajero Demo');
  const [email, setEmail] = useState('demo@flyway.cl');
  const [password, setPassword] = useState('flyway123');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [googleCustomEmail, setGoogleCustomEmail] = useState('');
  const [googleCustomName, setGoogleCustomName] = useState('');

  const googleBtnContainerRef = useRef<HTMLDivElement>(null);

  const bffUrl = getBffUrl();
  const googleClientId = ((import.meta.env.VITE_GOOGLE_CLIENT_ID as string) || '').trim();

  const completeGoogleLogin = async (payload: {
    credential?: string;
    email?: string;
    name?: string;
    avatar_url?: string;
  }) => {
    setError(null);
    setIsGoogleLoading(true);
    try {
      const res = await fetch(`${bffUrl}/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.token) {
        setError(data.error || 'No se pudo iniciar sesión con Google.');
        return;
      }

      const authUser: AuthUser = data.user || {
        id: 1,
        email: payload.email || 'usuario@gmail.com',
        name: payload.name || 'Usuario Google',
        auth_provider: 'google',
      };

      localStorage.setItem('flyway_token', data.token);
      localStorage.setItem('flyway_user', JSON.stringify(authUser));
      setShowGoogleModal(false);
      onLoginSuccess(authUser.email, authUser, data.token);
    } catch {
      const isOfflineAllowed = (import.meta.env.VITE_ENABLE_OFFLINE_MODE as string) === 'true';
      if (isOfflineAllowed) {
        const fallbackEmail = payload.email || 'viajero.google@gmail.com';
        const fallbackName = payload.name || 'Viajero Google';
        const offlineUser: AuthUser = {
          id: 2,
          email: fallbackEmail,
          name: fallbackName,
          auth_provider: 'google',
        };
        const offlineToken = 'google-offline-jwt-token';
        localStorage.setItem('flyway_token', offlineToken);
        localStorage.setItem('flyway_user', JSON.stringify(offlineUser));
        setShowGoogleModal(false);
        onLoginSuccess(offlineUser.email, offlineUser, offlineToken);
      } else {
        setError('Error al comunicarse con el servicio de autenticación en la nube.');
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  useEffect(() => {
    if (!googleClientId) return;

    const initGoogleGsi = () => {
      if (window.google?.accounts?.id && googleBtnContainerRef.current) {
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: (response) => {
            if (response.credential) {
              completeGoogleLogin({ credential: response.credential });
            }
          },
        });
        window.google.accounts.id.renderButton(googleBtnContainerRef.current, {
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          shape: 'pill',
          width: 340,
        });
      }
    };

    initGoogleGsi();
    const timer = setTimeout(initGoogleGsi, 800);
    return () => clearTimeout(timer);
  }, [googleClientId]);

  const handleQuickDemoFill = () => {
    setMode('login');
    setEmail('demo@flyway.cl');
    setPassword('flyway123');
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Por favor completa todos los campos.');
      return;
    }
    if (mode === 'register' && !name.trim()) {
      setError('Por favor ingresa tu nombre.');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const endpoint = mode === 'login' ? `${bffUrl}/auth/login` : `${bffUrl}/auth/register`;
      const payload =
        mode === 'login'
          ? { email: email.trim(), password }
          : { email: email.trim(), password, name: name.trim() };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.token) {
        setError(data.error || 'Credenciales inválidas. Intenta con Acceso Rápido Demo.');
        return;
      }

      const authUser: AuthUser = data.user || {
        id: 1,
        email: email.trim(),
        name: name.trim() || 'Viajero Flyway',
      };

      localStorage.setItem('flyway_token', data.token);
      localStorage.setItem('flyway_user', JSON.stringify(authUser));

      onLoginSuccess(authUser.email, authUser, data.token);
    } catch {
      const isOfflineAllowed = (import.meta.env.VITE_ENABLE_OFFLINE_MODE as string) === 'true';
      if (isOfflineAllowed && email.trim().toLowerCase() === 'demo@flyway.cl' && password === 'flyway123') {
        const offlineUser: AuthUser = { id: 1, email: 'demo@flyway.cl', name: 'Viajero Demo' };
        const offlineToken = 'demo-offline-jwt-token';
        localStorage.setItem('flyway_token', offlineToken);
        localStorage.setItem('flyway_user', JSON.stringify(offlineUser));
        onLoginSuccess(offlineUser.email, offlineUser, offlineToken);
      } else {
        setError('No se pudo conectar con el servidor de autenticación en la nube.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fw-login" id="login-page">
      <div className="fw-logo text-center">Flyway</div>
      <h1 className="text-center m-0 mt-2 mb-1 text-3xl font-bold">
        {mode === 'login' ? 'Bienvenido de vuelta' : 'Crea tu cuenta en Flyway'}
      </h1>
      <p className="fw-muted text-center text-sm mb-4">
        {mode === 'login'
          ? 'Inicia sesión con tu cuenta local para guardar y sincronizar tus rutas.'
          : 'Regístrate para guardar tus itinerarios en la nube con cálculo en CLP.'}
      </p>

      {/* Selector Login / Registro */}
      <div className="flex justify-center gap-2 mb-4">
        <button
          type="button"
          onClick={() => {
            setMode('login');
            setError(null);
          }}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
            mode === 'login'
              ? 'bg-[var(--fw-primary)] text-white'
              : 'bg-[var(--fw-surface)] text-[var(--fw-text-muted)] border border-[var(--fw-border)]'
          }`}
          id="tab-mode-login"
        >
          Iniciar sesión
        </button>
        <button
          type="button"
          onClick={() => {
            setMode('register');
            setError(null);
          }}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
            mode === 'register'
              ? 'bg-[var(--fw-primary)] text-white'
              : 'bg-[var(--fw-surface)] text-[var(--fw-text-muted)] border border-[var(--fw-border)]'
          }`}
          id="tab-mode-register"
        >
          Registrarse
        </button>
      </div>

      <form onSubmit={handleSubmit} className="fw-card" noValidate>
        {/* Botón Inicio de Sesión con Google OAuth */}
        <div className="mb-4">
          {googleClientId ? (
            <div className="flex justify-center w-full" ref={googleBtnContainerRef} />
          ) : (
            <button
              type="button"
              id="btn-google-login"
              disabled={isGoogleLoading}
              onClick={() => {
                setError(null);
                setShowGoogleModal(true);
              }}
              className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-xl bg-white text-slate-800 font-semibold text-sm border border-slate-300 shadow-xs hover:bg-slate-50 transition-all cursor-pointer"
            >
              <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
                <path
                  fill="#EA4335"
                  d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                />
                <path
                  fill="#4285F4"
                  d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                />
                <path
                  fill="#FBBC05"
                  d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                />
                <path
                  fill="#34A853"
                  d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                />
              </svg>
              <span>{isGoogleLoading ? 'Conectando con Google...' : 'Continuar con Google'}</span>
            </button>
          )}

          <div className="flex items-center gap-3 my-4">
            <div className="h-px bg-[var(--fw-border)] flex-1" />
            <span className="text-xs text-[var(--fw-text-muted)] uppercase tracking-wider font-medium">
              o con tu correo
            </span>
            <div className="h-px bg-[var(--fw-border)] flex-1" />
          </div>
        </div>

        {mode === 'register' && (
          <div className="mb-2">
            <ODCInput
              id="input-register-name"
              label="Nombre"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError(null);
              }}
              placeholder="Ej: Camila Rojas"
            />
          </div>
        )}

        <ODCInput
          id="input-login-email"
          label="Correo"
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setError(null);
          }}
          placeholder="demo@flyway.cl"
        />

        <div className="mt-2">
          <ODCInput
            id="input-login-password"
            label="Contraseña"
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError(null);
            }}
            error={error || undefined}
          />
        </div>

        <ODCButton
          type="submit"
          variant="primary"
          fullWidth
          className="mt-5"
          id="btn-login-submit"
          disabled={isSubmitting}
        >
          {isSubmitting
            ? 'Autenticando...'
            : mode === 'login'
            ? 'Iniciar sesión'
            : 'Crear cuenta'}
        </ODCButton>

        <button
          type="button"
          onClick={handleQuickDemoFill}
          className="btn fw-btn-ghost w-full mt-2 text-xs font-semibold border border-dashed border-[var(--fw-border)] rounded-xl py-2"
          id="btn-demo-access"
        >
          ⚡ Acceso Rápido Demo (demo@flyway.cl / flyway123)
        </button>
      </form>

      <div className="text-center mt-3">
        <button
          type="button"
          className="btn fw-btn-ghost text-sm"
          onClick={onContinueWithoutAccount}
          id="btn-skip-login"
        >
          Seguir sin cuenta
        </button>
      </div>

      {/* Modal Selector de Cuenta Google (cuando VITE_GOOGLE_CLIENT_ID no está configurado aún) */}
      {showGoogleModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
          onClick={() => setShowGoogleModal(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-[var(--fw-surface)] border border-[var(--fw-border)] p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <svg width="24" height="24" viewBox="0 0 48 48" aria-hidden="true">
                <path
                  fill="#EA4335"
                  d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                />
                <path
                  fill="#4285F4"
                  d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                />
                <path
                  fill="#FBBC05"
                  d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                />
                <path
                  fill="#34A853"
                  d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                />
              </svg>
              <div>
                <h3 className="text-lg font-bold m-0">Iniciar sesión con Google</h3>
                <p className="text-xs text-[var(--fw-text-muted)] m-0">
                  Selecciona una cuenta para continuar a Flyway
                </p>
              </div>
            </div>

            <div className="space-y-2 mb-4">
              <button
                type="button"
                disabled={isGoogleLoading}
                onClick={() =>
                  completeGoogleLogin({
                    email: 'camila.rojas.chile@gmail.com',
                    name: 'Camila Rojas',
                  })
                }
                className="w-full flex items-center gap-3 p-3 rounded-xl border border-[var(--fw-border)] hover:border-[var(--fw-primary)] transition-all text-left cursor-pointer bg-transparent"
              >
                <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
                  CR
                </div>
                <div className="overflow-hidden">
                  <div className="font-semibold text-sm truncate">Camila Rojas</div>
                  <div className="text-xs text-[var(--fw-text-muted)] truncate">
                    camila.rojas.chile@gmail.com
                  </div>
                </div>
              </button>

              <button
                type="button"
                disabled={isGoogleLoading}
                onClick={() =>
                  completeGoogleLogin({
                    email: 'matias.viajero@gmail.com',
                    name: 'Matías Valdivia',
                  })
                }
                className="w-full flex items-center gap-3 p-3 rounded-xl border border-[var(--fw-border)] hover:border-[var(--fw-primary)] transition-all text-left cursor-pointer bg-transparent"
              >
                <div className="w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
                  MV
                </div>
                <div className="overflow-hidden">
                  <div className="font-semibold text-sm truncate">Matías Valdivia</div>
                  <div className="text-xs text-[var(--fw-text-muted)] truncate">
                    matias.viajero@gmail.com
                  </div>
                </div>
              </button>
            </div>

            <div className="border-t border-[var(--fw-border)] pt-3">
              <p className="text-xs text-[var(--fw-text-muted)] mb-2">
                O ingresa tu cuenta de Gmail directamente:
              </p>
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Tu nombre (ej: Juan Pérez)"
                  value={googleCustomName}
                  onChange={(e) => setGoogleCustomName(e.target.value)}
                  className="fw-input w-full text-sm"
                />
                <input
                  type="email"
                  placeholder="tucorreo@gmail.com"
                  value={googleCustomEmail}
                  onChange={(e) => setGoogleCustomEmail(e.target.value)}
                  className="fw-input w-full text-sm"
                />
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowGoogleModal(false)}
                    className="btn fw-btn-ghost flex-1 text-xs py-2"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    disabled={!googleCustomEmail.includes('@') || isGoogleLoading}
                    onClick={() =>
                      completeGoogleLogin({
                        email: googleCustomEmail.trim(),
                        name: googleCustomName.trim() || googleCustomEmail.split('@')[0],
                      })
                    }
                    className="btn fw-btn-primary flex-1 text-xs py-2"
                  >
                    {isGoogleLoading ? 'Conectando...' : 'Continuar'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

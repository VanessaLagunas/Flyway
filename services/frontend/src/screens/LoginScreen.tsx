import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ODCInput } from '../odc-components/ODCInput';
import { ODCButton } from '../odc-components/ODCButton';
import { getBffUrl, parseJsonSafe } from '../utils/apiUrl';

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
        oauth2?: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            prompt?: string;
            callback: (tokenResponse: {
              access_token?: string;
              error?: string;
              error_description?: string;
            }) => void;
            error_callback?: (err: { type?: string; message?: string }) => void;
          }) => {
            requestAccessToken: (overrideConfig?: { prompt?: string }) => void;
          };
        };
      };
    };
  }
}

const GSI_SCRIPT_SRC = 'https://accounts.google.com/gsi/client';

function ensureGoogleScriptLoaded(): Promise<boolean> {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return Promise.resolve(false);
  }
  if (window.google?.accounts) {
    return Promise.resolve(true);
  }

  return new Promise<boolean>((resolve) => {
    let settled = false;
    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      clearInterval(pollTimer);
      clearTimeout(timeoutTimer);
      resolve(ok);
    };

    let script = document.querySelector<HTMLScriptElement>(
      'script[src*="accounts.google.com/gsi/client"]'
    );
    if (!script) {
      script = document.createElement('script');
      script.src = GSI_SCRIPT_SRC;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }

    const onLoad = () => {
      if (window.google?.accounts) {
        finish(true);
      }
    };
    const onError = () => finish(false);

    script.addEventListener('load', onLoad, { once: true });
    script.addEventListener('error', onError, { once: true });

    const pollTimer = window.setInterval(() => {
      if (window.google?.accounts) {
        finish(true);
      }
    }, 100);

    const timeoutTimer = window.setTimeout(() => {
      finish(Boolean(window.google?.accounts));
    }, 5000);
  });
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onLoginSuccess,
  onContinueWithoutAccount,
}) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [googleClientId, setGoogleClientId] = useState<string>(() =>
    ((import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined) || '').trim()
  );
  const [configLoaded, setConfigLoaded] = useState(false);
  const [gsiReady, setGsiReady] = useState<boolean>(() =>
    typeof window !== 'undefined' && Boolean(window.google?.accounts)
  );
  const [showGoogleSetupHelp, setShowGoogleSetupHelp] = useState(false);
  const [originCopied, setOriginCopied] = useState(false);

  const googleBtnContainerRef = useRef<HTMLDivElement>(null);
  const bffUrl = getBffUrl();
  const currentOrigin =
    typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';

  const completeGoogleLogin = useCallback(
    async (payload: { credential?: string; accessToken?: string }) => {
      setError(null);
      setIsGoogleLoading(true);
      try {
        const res = await fetch(`${bffUrl}/auth/google`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const data = await parseJsonSafe(res);
        if (!res.ok || !data.token || !data.user?.email) {
          setError(data.error || 'No se pudo autenticar tu cuenta con Google.');
          return;
        }

        const authUser: AuthUser = {
          id: Number(data.user.id) || 1,
          email: data.user.email,
          name: data.user.name || data.user.email.split('@')[0],
          auth_provider: data.user.auth_provider || 'google',
          avatar_url: data.user.avatar_url || null,
        };

        localStorage.setItem('flyway_token', data.token);
        localStorage.setItem('flyway_user', JSON.stringify(authUser));
        setShowGoogleSetupHelp(false);
        onLoginSuccess(authUser.email, authUser, data.token);
      } catch {
        setError('Error al comunicarse con el servicio de autenticación de Google en Flyway.');
      } finally {
        setIsGoogleLoading(false);
      }
    },
    [bffUrl, onLoginSuccess]
  );

  // Precargar Google Identity Services al montar para evitar bloqueadores de popups al hacer clic
  useEffect(() => {
    let active = true;
    ensureGoogleScriptLoaded().then((ready) => {
      if (active && ready) {
        setGsiReady(true);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  // Descubrimiento dinámico de GOOGLE_CLIENT_ID en runtime desde el BFF / auth-service
  useEffect(() => {
    let cancelled = false;
    fetch(`${bffUrl}/auth/config`, { cache: 'no-store' })
      .then((res) => (res.ok ? parseJsonSafe(res) : null))
      .then((data) => {
        if (cancelled) return;
        if (data && typeof data.googleClientId === 'string' && data.googleClientId.trim()) {
          setGoogleClientId(data.googleClientId.trim());
          setShowGoogleSetupHelp(false);
        }
      })
      .catch(() => {
        // Mantiene VITE_GOOGLE_CLIENT_ID de build-time si existe
      })
      .finally(() => {
        if (!cancelled) {
          setConfigLoaded(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [bffUrl]);

  // Renderizar botón oficial Google Identity Services cuando googleClientId y GSI están disponibles
  useEffect(() => {
    if (!googleClientId || !gsiReady || !googleBtnContainerRef.current) return;
    if (!window.google?.accounts?.id) return;

    try {
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: (response) => {
          if (response.credential) {
            void completeGoogleLogin({ credential: response.credential });
          }
        },
      });
      googleBtnContainerRef.current.innerHTML = '';
      window.google.accounts.id.renderButton(googleBtnContainerRef.current, {
        theme: 'outline',
        size: 'large',
        text: mode === 'register' ? 'signup_with' : 'continue_with',
        shape: 'pill',
        width: 340,
      });
    } catch {
      // Si el iframe de GIS no puede renderizar, el botón principal OAuth2 sigue operativo
    }
  }, [googleClientId, gsiReady, mode, completeGoogleLogin]);

  const openGoogleOAuthPopup = (clientIdToUse: string): boolean => {
    const oauth2 = window.google?.accounts?.oauth2;
    if (!oauth2) return false;

    setIsGoogleLoading(true);
    const tokenClient = oauth2.initTokenClient({
      client_id: clientIdToUse,
      scope: 'openid email profile',
      callback: (resp) => {
        if (resp.error || !resp.access_token) {
          setIsGoogleLoading(false);
          if (resp.error === 'access_denied') {
            setError('Cancelaste el permiso de acceso con tu cuenta de Google.');
          } else {
            setError(
              resp.error_description ||
                `Google rechazó la solicitud (${resp.error || 'error'}). Verifica que ${currentOrigin} esté en Orígenes de JavaScript autorizados en Google Cloud.`
            );
          }
          return;
        }
        void completeGoogleLogin({ accessToken: resp.access_token });
      },
      error_callback: (err) => {
        setIsGoogleLoading(false);
        if (err?.type === 'popup_closed') {
          setError(
            'Se cerró la ventana de Google antes de completar el ingreso. Pulsa el botón nuevamente cuando quieras continuar.'
          );
          return;
        }
        if (err?.type === 'popup_failed_to_open') {
          setError(
            'Tu navegador bloqueó la ventana emergente de Google. Permite popups para este sitio e intenta nuevamente.'
          );
          return;
        }
        setError(err?.message || 'No se pudo iniciar el flujo OAuth 2.0 con Google.');
      },
    });

    tokenClient.requestAccessToken({ prompt: 'select_account' });
    return true;
  };

  const handleGoogleClick = async () => {
    setError(null);

    // Camino rápido síncrono para preservar el gesto de usuario (evita bloqueo de popups)
    if (googleClientId && window.google?.accounts?.oauth2) {
      setShowGoogleSetupHelp(false);
      openGoogleOAuthPopup(googleClientId);
      return;
    }

    let resolvedClientId = googleClientId;

    // Si el usuario pulsó antes de terminar GET /auth/config, consultar una vez
    if (!resolvedClientId && !configLoaded) {
      setIsGoogleLoading(true);
      try {
        const cfgRes = await fetch(`${bffUrl}/auth/config`, { cache: 'no-store' });
        if (cfgRes.ok) {
          const cfgData = await parseJsonSafe(cfgRes);
          if (cfgData && typeof cfgData.googleClientId === 'string' && cfgData.googleClientId.trim()) {
            resolvedClientId = cfgData.googleClientId.trim();
            setGoogleClientId(resolvedClientId);
          }
        }
      } catch {
        // Ignorar
      } finally {
        setConfigLoaded(true);
        setIsGoogleLoading(false);
      }
    }

    if (!resolvedClientId) {
      setShowGoogleSetupHelp(true);
      return;
    }

    setShowGoogleSetupHelp(false);
    setIsGoogleLoading(true);
    const loaded = await ensureGoogleScriptLoaded();
    if (!loaded || !window.google?.accounts?.oauth2) {
      setIsGoogleLoading(false);
      setError(
        'No se pudo cargar Google Identity Services (accounts.google.com). Revisa tu conexión o bloqueador de scripts.'
      );
      return;
    }
    setGsiReady(true);
    openGoogleOAuthPopup(resolvedClientId);
  };

  const handleCopyOrigin = async () => {
    try {
      await navigator.clipboard.writeText(currentOrigin);
      setOriginCopied(true);
      window.setTimeout(() => setOriginCopied(false), 2200);
    } catch {
      setOriginCopied(false);
    }
  };

  const submitLocalAuth = async (
    targetMode: 'login' | 'register',
    targetEmail: string,
    targetPassword: string,
    targetName: string
  ) => {
    setError(null);
    setIsSubmitting(true);

    try {
      const endpoint =
        targetMode === 'login' ? `${bffUrl}/auth/login` : `${bffUrl}/auth/register`;
      const payload =
        targetMode === 'login'
          ? { email: targetEmail.trim(), password: targetPassword }
          : { email: targetEmail.trim(), password: targetPassword, name: targetName.trim() };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await parseJsonSafe(res);

      if (!res.ok || !data.token) {
        setError(data.error || 'Credenciales inválidas.');
        return;
      }

      const authUser: AuthUser = data.user || {
        id: 1,
        email: targetEmail.trim(),
        name: targetName.trim() || targetEmail.trim().split('@')[0],
      };

      localStorage.setItem('flyway_token', data.token);
      localStorage.setItem('flyway_user', JSON.stringify(authUser));

      onLoginSuccess(authUser.email, authUser, data.token);
    } catch {
      const isOfflineAllowed = (import.meta.env.VITE_ENABLE_OFFLINE_MODE as string) === 'true';
      if (
        isOfflineAllowed &&
        targetEmail.trim().toLowerCase() === 'demo@flyway.cl' &&
        targetPassword === 'flyway123'
      ) {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Por favor completa tu correo y contraseña.');
      return;
    }
    if (mode === 'register' && !name.trim()) {
      setError('Por favor ingresa tu nombre.');
      return;
    }
    await submitLocalAuth(mode, email, password, name);
  };

  const handleQuickDemoLogin = async () => {
    setMode('login');
    setEmail('demo@flyway.cl');
    setPassword('flyway123');
    setShowGoogleSetupHelp(false);
    await submitLocalAuth('login', 'demo@flyway.cl', 'flyway123', 'Viajero Demo');
  };

  return (
    <div className="fw-login" id="login-page">
      <div className="fw-logo text-center">Flyway</div>
      <h1 className="text-center m-0 mt-2 mb-1 text-3xl font-bold">
        {mode === 'login' ? 'Bienvenido de vuelta' : 'Crea tu cuenta en Flyway'}
      </h1>
      <p className="fw-muted text-center text-sm mb-4">
        {mode === 'login'
          ? 'Inicia sesión con tu cuenta de Google o correo para guardar y sincronizar tus rutas.'
          : 'Regístrate con Google en un clic o con tu correo para guardar itinerarios en CLP.'}
      </p>

      {/* Selector Login / Crear cuenta */}
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
          Crear cuenta
        </button>
      </div>

      <form onSubmit={handleSubmit} className="fw-card" noValidate>
        {/* Acceso real con Google OAuth 2.0 (válido para registro e inicio de sesión) */}
        <div className="mb-4">
          <button
            type="button"
            id="btn-google-login"
            disabled={isGoogleLoading || isSubmitting}
            onClick={handleGoogleClick}
            className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-xl bg-white text-slate-800 font-semibold text-sm border border-slate-300 shadow-xs hover:bg-slate-50 disabled:opacity-60 transition-all cursor-pointer"
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
            <span>
              {isGoogleLoading
                ? 'Conectando con Google...'
                : mode === 'register'
                ? 'Registrarse con Google'
                : 'Continuar con Google'}
            </span>
          </button>

          {/* Contenedor oficial Google Identity Services (One Tap / Personalized Button) */}
          {googleClientId && (
            <div
              className="mt-2.5 flex justify-center w-full empty:hidden"
              ref={googleBtnContainerRef}
            />
          )}

          {/* Guía clara de configuración OAuth 2.0 si GOOGLE_CLIENT_ID aún no está definido */}
          {showGoogleSetupHelp && !googleClientId && (
            <div
              className="mt-3 p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 text-xs space-y-2"
              role="region"
              aria-label="Configuración requerida de Google OAuth 2.0"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="font-bold m-0 text-amber-900">
                  Configura GOOGLE_CLIENT_ID para habilitar Google OAuth 2.0 real
                </p>
                <button
                  type="button"
                  onClick={() => setShowGoogleSetupHelp(false)}
                  className="text-amber-700 hover:text-amber-950 font-bold px-1 cursor-pointer"
                  aria-label="Cerrar aviso"
                >
                  ✕
                </button>
              </div>
              <p className="m-0 leading-relaxed">
                1. En <strong>Google Cloud Console &gt; APIs &amp; Services &gt; Credentials</strong>,
                crea un <strong>OAuth 2.0 Client ID (Web application)</strong> y autoriza este origen
                JavaScript:
              </p>
              <div className="flex items-center gap-2 bg-white border border-amber-200 rounded-lg px-2.5 py-1.5">
                <code className="text-[11px] font-mono text-slate-800 truncate flex-1">
                  {currentOrigin}
                </code>
                <button
                  type="button"
                  onClick={handleCopyOrigin}
                  className="px-2.5 py-1 rounded-md bg-amber-100 hover:bg-amber-200 text-amber-950 font-semibold text-[11px] shrink-0 cursor-pointer transition-colors"
                >
                  {originCopied ? '✓ Copiado' : 'Copiar origen'}
                </button>
              </div>
              <p className="m-0 leading-relaxed">
                2. Define el ID (<code>xxxx.apps.googleusercontent.com</code>) como{' '}
                <code>GOOGLE_CLIENT_ID</code> en <code>.env</code> (local) o en{' '}
                <code>ConfigMap flyway-config</code> / variable <code>GOOGLE_CLIENT_ID</code> de
                GitHub Actions (GKE).
              </p>
            </div>
          )}

          <div className="flex items-center gap-3 my-4">
            <div className="h-px bg-[var(--fw-border)] flex-1" />
            <span className="text-xs text-[var(--fw-text-muted)] uppercase tracking-wider font-medium">
              o con tu correo
            </span>
            <div className="h-px bg-[var(--fw-border)] flex-1" />
          </div>
        </div>

        {error && (
          <div
            className="mb-3 p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-medium leading-relaxed"
            role="alert"
          >
            {error}
          </div>
        )}

        {mode === 'register' && (
          <div className="mb-2">
            <ODCInput
              id="input-register-name"
              label="Nombre"
              type="text"
              autoComplete="name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError(null);
              }}
              placeholder="Ej: Valentina Rojas"
            />
          </div>
        )}

        <ODCInput
          id="input-login-email"
          label="Correo electrónico"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setError(null);
          }}
          placeholder="tucorreo@ejemplo.com"
        />

        <div className="mt-2">
          <ODCInput
            id="input-login-password"
            label="Contraseña"
            type="password"
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError(null);
            }}
            placeholder={mode === 'register' ? 'Mínimo 6 caracteres' : 'Ingresa tu contraseña'}
          />
        </div>

        <ODCButton
          type="submit"
          variant="primary"
          fullWidth
          className="mt-5"
          id="btn-login-submit"
          disabled={isSubmitting || isGoogleLoading}
        >
          {isSubmitting
            ? 'Autenticando...'
            : mode === 'login'
            ? 'Iniciar sesión'
            : 'Crear cuenta'}
        </ODCButton>

        <div className="mt-3 pt-2 border-t border-[var(--fw-border)] text-center">
          <button
            type="button"
            onClick={handleQuickDemoLogin}
            disabled={isSubmitting || isGoogleLoading}
            className="btn fw-btn-ghost w-full text-xs font-medium text-[var(--fw-text-muted)] hover:text-[var(--fw-text)] py-1.5"
            id="btn-demo-access"
          >
            Ingresar con cuenta Demo (demo@flyway.cl)
          </button>
        </div>
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
    </div>
  );
};

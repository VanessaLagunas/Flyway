import React, { useState } from 'react';
import { ODCInput } from '../odc-components/ODCInput';
import { ODCButton } from '../odc-components/ODCButton';

export interface AuthUser {
  id: number;
  email: string;
  name: string;
}

export interface LoginScreenProps {
  onLoginSuccess: (email: string, user?: AuthUser, token?: string) => void;
  onContinueWithoutAccount: () => void;
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

  const bffUrl = (import.meta.env.VITE_BFF_URL as string) || 'http://localhost:4000/api/v1';

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
      // Modo offline/respaldo si el BFF aún no está levantado en entorno puramente estático
      if (email.trim().toLowerCase() === 'demo@flyway.cl' && password === 'flyway123') {
        const offlineUser: AuthUser = { id: 1, email: 'demo@flyway.cl', name: 'Viajero Demo' };
        const offlineToken = 'demo-offline-jwt-token';
        localStorage.setItem('flyway_token', offlineToken);
        localStorage.setItem('flyway_user', JSON.stringify(offlineUser));
        onLoginSuccess(offlineUser.email, offlineUser, offlineToken);
      } else {
        setError('No se pudo conectar con el servidor de autenticación.');
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
    </div>
  );
};

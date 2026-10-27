import path from 'node:path';
import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Pool } from 'pg';
import { OAuth2Client } from 'google-auth-library';

dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const app = express();
const PORT = Number(process.env.PORT) || 4003;
const JWT_SECRET = process.env.JWT_SECRET || 'flyway-super-secret-jwt-key-2026';
const JWT_EXPIRES_IN = '24h';
const GOOGLE_OAUTH_TIMEOUT_MS = 8000;

export function getGoogleClientId(): string {
  return (
    process.env.GOOGLE_CLIENT_ID ||
    process.env.GOOGLE_CLIENT_ID_SECRET ||
    process.env.VITE_GOOGLE_CLIENT_ID ||
    ''
  ).trim();
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit = {},
  timeoutMs: number = GOOGLE_OAUTH_TIMEOUT_MS
): Promise<globalThis.Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

app.use(express.json({ limit: '2mb' }));

// PostgreSQL Pool (resiliente ante desconexión)
const dbUrl = process.env.DATABASE_URL || 'postgres://flyway:flyway_pass@postgres-db:5432/flyway_db';
const pool = new Pool({
  connectionString: dbUrl,
  connectionTimeoutMillis: 2500,
});

interface UserRecord {
  id: number;
  email: string;
  password_hash: string | null;
  name: string;
  auth_provider?: string;
  avatar_url?: string | null;
  created_at: string;
}

// Hash bcrypt (salt 10) de 'flyway123'
const DEMO_PASSWORD_HASH = '$2a$10$2kSgvJqGLXzH8LMF3KAZH.QS3M6pErF3.ZYMqLQHUtvhfmMNWcKEm';

// Almacenamiento en memoria de respaldo (incluye usuario demo pre-cargado)
const inMemoryUsers: UserRecord[] = [
  {
    id: 1,
    email: 'demo@flyway.cl',
    password_hash: DEMO_PASSWORD_HASH,
    name: 'Viajero Demo',
    auth_provider: 'local',
    avatar_url: null,
    created_at: new Date().toISOString(),
  },
];
let nextInMemoryId = 2;
let schemaMigrated = false;

async function checkDbConnection(): Promise<boolean> {
  if (process.env.AUTH_SERVICE_DISABLE_DB === 'true') {
    return false;
  }
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    if (!schemaMigrated) {
      await client.query(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          email VARCHAR(255) UNIQUE NOT NULL,
          password_hash VARCHAR(255),
          name VARCHAR(100) NOT NULL,
          auth_provider VARCHAR(50) DEFAULT 'local',
          avatar_url TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(50) DEFAULT 'local';
        ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;

        INSERT INTO users (email, password_hash, name, auth_provider)
        VALUES ('demo@flyway.cl', '${DEMO_PASSWORD_HASH}', 'Viajero Demo', 'local')
        ON CONFLICT (email) DO UPDATE
        SET password_hash = EXCLUDED.password_hash,
            name = EXCLUDED.name;
      `);
      schemaMigrated = true;
    }
    client.release();
    return true;
  } catch {
    return false;
  }
}

function signToken(user: {
  id: number;
  email: string;
  name: string;
  avatar_url?: string | null;
  auth_provider?: string;
}): string {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar_url: user.avatar_url || null,
      auth_provider: user.auth_provider || 'local',
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

function extractToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  if (req.body && typeof req.body.token === 'string') {
    return req.body.token.trim();
  }
  return null;
}

function isGmailAddress(email: string): boolean {
  return email.endsWith('@gmail.com') || email.endsWith('@googlemail.com');
}

const GOOGLE_ONLY_LOGIN_ERROR =
  'Esta cuenta fue creada con Google. Pulsa el botón "Continuar con Google" para ingresar.';
const UNREGISTERED_GMAIL_LOGIN_ERROR =
  'Este correo Gmail aún no está registrado con contraseña en Flyway. Usa "Continuar con Google" para ingresar directo con tu cuenta Google, o pestaña "Crear cuenta".';

// -------------------------------------------------------------
// 1. Healthcheck (GET /health) & Runtime Auth Config (GET /config)
// -------------------------------------------------------------
app.get('/health', async (_req: Request, res: Response) => {
  const dbOk = await checkDbConnection();
  const clientId = getGoogleClientId();
  return res.json({
    status: 'ok',
    service: 'auth-service',
    port: PORT,
    googleEnabled: Boolean(clientId),
    database: {
      connected: dbOk,
    },
    timestamp: new Date().toISOString(),
  });
});

app.get('/config', (_req: Request, res: Response) => {
  const clientId = getGoogleClientId();
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  return res.status(200).json({
    googleEnabled: Boolean(clientId),
    googleClientId: clientId,
  });
});

// -------------------------------------------------------------
// 2. Registro de Usuario Local (POST /register)
// -------------------------------------------------------------
app.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body || {};

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ error: 'Debes ingresar un correo electrónico válido.' });
    }
    if (!password || typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanName =
      name && typeof name === 'string' && name.trim() ? name.trim() : cleanEmail.split('@')[0];
    const passwordHash = await bcrypt.hash(password, 10);

    // Intentar guardar en PostgreSQL
    if (await checkDbConnection()) {
      try {
        const existing = await pool.query(
          'SELECT id, password_hash, auth_provider FROM users WHERE LOWER(email) = $1 LIMIT 1',
          [cleanEmail]
        );
        if (existing.rows.length > 0) {
          const row = existing.rows[0];
          if (!row.password_hash && row.auth_provider === 'google') {
            return res.status(409).json({
              error:
                'Este correo ya está vinculado con Google. Pulsa "Continuar con Google" para ingresar.',
            });
          }
          return res.status(409).json({ error: 'El correo electrónico ya está registrado.' });
        }

        const insertRes = await pool.query(
          `INSERT INTO users (email, password_hash, name, auth_provider, created_at)
           VALUES ($1, $2, $3, 'local', NOW())
           RETURNING id, email, name, auth_provider, avatar_url, created_at`,
          [cleanEmail, passwordHash, cleanName]
        );

        const row = insertRes.rows[0];
        const user = {
          id: Number(row.id),
          email: row.email,
          name: row.name,
          auth_provider: row.auth_provider || 'local',
          avatar_url: row.avatar_url || null,
        };
        const token = signToken(user);

        return res.status(201).json({
          token,
          user,
          source: 'database',
        });
      } catch (dbErr: any) {
        console.warn('[auth-service] Fallo registro en PostgreSQL, usando memoria:', dbErr.message);
      }
    }

    // Fallback en memoria
    const existsMem = inMemoryUsers.find((u) => u.email.toLowerCase() === cleanEmail);
    if (existsMem) {
      if (!existsMem.password_hash && existsMem.auth_provider === 'google') {
        return res.status(409).json({
          error:
            'Este correo ya está vinculado con Google. Pulsa "Continuar con Google" para ingresar.',
        });
      }
      return res.status(409).json({ error: 'El correo electrónico ya está registrado.' });
    }

    const newUser: UserRecord = {
      id: nextInMemoryId++,
      email: cleanEmail,
      password_hash: passwordHash,
      name: cleanName,
      auth_provider: 'local',
      avatar_url: null,
      created_at: new Date().toISOString(),
    };
    inMemoryUsers.push(newUser);

    const userPayload = {
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
      auth_provider: 'local',
      avatar_url: null,
    };
    const token = signToken(userPayload);

    return res.status(201).json({
      token,
      user: userPayload,
      source: 'in_memory',
    });
  } catch (err: any) {
    console.error('[auth-service] Error en /register:', err);
    return res.status(500).json({ error: 'Error interno al registrar usuario.' });
  }
});

// -------------------------------------------------------------
// 3. Login Local (POST /login)
// -------------------------------------------------------------
app.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ error: 'Correo y contraseña requeridos.' });
    }

    const cleanEmail = String(email).trim().toLowerCase();

    // 1. Buscar en PostgreSQL si está disponible
    if (await checkDbConnection()) {
      try {
        const result = await pool.query(
          'SELECT id, email, password_hash, name, auth_provider, avatar_url FROM users WHERE LOWER(email) = $1 LIMIT 1',
          [cleanEmail]
        );
        if (result.rows.length > 0) {
          const row = result.rows[0];
          if (!row.password_hash) {
            return res.status(401).json({ error: GOOGLE_ONLY_LOGIN_ERROR });
          }
          const isValid = await bcrypt.compare(String(password), row.password_hash);
          if (!isValid) {
            return res.status(401).json({ error: 'Credenciales inválidas.' });
          }
          const user = {
            id: Number(row.id),
            email: row.email,
            name: row.name,
            auth_provider: row.auth_provider || 'local',
            avatar_url: row.avatar_url || null,
          };
          const token = signToken(user);
          return res.json({
            token,
            user,
            source: 'database',
          });
        }
      } catch (dbErr: any) {
        console.warn(
          '[auth-service] Error consultando usuario en PostgreSQL, probando fallback en memoria:',
          dbErr.message
        );
      }
    }

    // 2. Fallback en memoria (incluye demo@flyway.cl / flyway123)
    const memUser = inMemoryUsers.find((u) => u.email.toLowerCase() === cleanEmail);
    if (!memUser) {
      if (isGmailAddress(cleanEmail)) {
        return res.status(401).json({ error: UNREGISTERED_GMAIL_LOGIN_ERROR });
      }
      return res.status(401).json({ error: 'Credenciales inválidas.' });
    }
    if (!memUser.password_hash) {
      return res.status(401).json({ error: GOOGLE_ONLY_LOGIN_ERROR });
    }

    const validPassword = await bcrypt.compare(String(password), memUser.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Credenciales inválidas.' });
    }

    const user = {
      id: memUser.id,
      email: memUser.email,
      name: memUser.name,
      auth_provider: memUser.auth_provider || 'local',
      avatar_url: memUser.avatar_url || null,
    };
    const token = signToken(user);

    return res.json({
      token,
      user,
      source: 'in_memory',
    });
  } catch (err: any) {
    console.error('[auth-service] Error en /login:', err);
    return res.status(500).json({ error: 'Error interno en autenticación.' });
  }
});

// -------------------------------------------------------------
// 4. Inicio de Sesión / Registro con Google OAuth 2.0 (POST /google)
// -------------------------------------------------------------
app.post('/google', async (req: Request, res: Response) => {
  try {
    const {
      credential,
      accessToken: bodyAccessToken,
      access_token: snakeAccessToken,
      email: fallbackEmail,
      name: fallbackName,
      avatar_url: fallbackAvatar,
      devMock,
    } = req.body || {};

    const clientId = getGoogleClientId();
    const rawAccessToken =
      typeof bodyAccessToken === 'string' && bodyAccessToken.trim()
        ? bodyAccessToken.trim()
        : typeof snakeAccessToken === 'string' && snakeAccessToken.trim()
        ? snakeAccessToken.trim()
        : '';

    let rawEmail = '';
    let rawName = '';
    let avatar_url: string | null = null;

    if (credential && typeof credential === 'string' && credential.trim()) {
      // 1. Google ID Token JWT (One Tap / Official GIS Button)
      try {
        const oauthClient = new OAuth2Client(clientId || undefined);
        const ticket = await oauthClient.verifyIdToken({
          idToken: credential.trim(),
          audience: clientId || undefined,
        });
        const payload = ticket.getPayload();
        if (!payload || !payload.email) {
          return res.status(401).json({ error: 'El token de Google no contiene un correo válido.' });
        }
        if (payload.email_verified === false) {
          return res.status(401).json({ error: 'Tu correo de Google no está verificado.' });
        }
        rawEmail = payload.email;
        rawName = payload.name || '';
        avatar_url = payload.picture || null;
      } catch (verifyErr: any) {
        console.error('[auth-service] Error verificando Google ID Token:', verifyErr.message);
        return res
          .status(401)
          .json({ error: 'Token de Google inválido o expirado.', detail: verifyErr.message });
      }
    } else if (rawAccessToken) {
      // 2. Google OAuth 2.0 Access Token (Popup initTokenClient)
      try {
        const tokenInfoRes = await fetchWithTimeout(
          `https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(rawAccessToken)}`
        );
        if (!tokenInfoRes.ok) {
          return res.status(401).json({ error: 'Token de acceso de Google inválido o expirado.' });
        }
        const tokenInfo = (await tokenInfoRes.json()) as {
          aud?: string;
          azp?: string;
          sub?: string;
          email?: string;
          email_verified?: string | boolean;
        };

        if (clientId && tokenInfo.aud !== clientId && tokenInfo.azp !== clientId) {
          return res.status(401).json({
            error: 'El token de Google no corresponde a esta aplicación (audience mismatch).',
          });
        }

        const userInfoRes = await fetchWithTimeout(
          'https://www.googleapis.com/oauth2/v3/userinfo',
          {
            headers: {
              Authorization: `Bearer ${rawAccessToken}`,
            },
          }
        );
        if (!userInfoRes.ok) {
          return res
            .status(401)
            .json({ error: 'No se pudo obtener el perfil de usuario desde Google.' });
        }
        const userInfo = (await userInfoRes.json()) as {
          sub?: string;
          email?: string;
          email_verified?: boolean | string;
          name?: string;
          picture?: string;
        };

        if (!userInfo || typeof userInfo.email !== 'string' || !userInfo.email.trim()) {
          return res.status(401).json({ error: 'El token de Google no contiene un correo válido.' });
        }
        if (userInfo.email_verified === false || userInfo.email_verified === 'false') {
          return res.status(401).json({ error: 'Tu correo de Google no está verificado.' });
        }

        rawEmail = userInfo.email;
        rawName = typeof userInfo.name === 'string' ? userInfo.name : '';
        avatar_url = typeof userInfo.picture === 'string' && userInfo.picture ? userInfo.picture : null;
      } catch (verifyErr: any) {
        console.error('[auth-service] Error verificando Google Access Token:', verifyErr.message);
        if (verifyErr?.name === 'AbortError') {
          return res
            .status(504)
            .json({ error: 'Tiempo de espera agotado al verificar la sesión con Google.' });
        }
        return res
          .status(401)
          .json({ error: 'No se pudo validar el token de Google OAuth 2.0.', detail: verifyErr.message });
      }
    } else {
      // 4. Security guard contra payloads sin token verificado
      if (process.env.NODE_ENV === 'production' || Boolean(clientId)) {
        return res.status(400).json({
          error: 'Se requiere un token válido de Google OAuth 2.0 (credential o accessToken).',
        });
      }
      if (devMock === true && typeof fallbackEmail === 'string' && fallbackEmail.includes('@')) {
        rawEmail = fallbackEmail;
        rawName = typeof fallbackName === 'string' ? fallbackName : '';
        avatar_url = typeof fallbackAvatar === 'string' ? fallbackAvatar : null;
      } else {
        return res.status(400).json({
          error: 'Se requiere un token válido de Google OAuth 2.0 (credential o accessToken).',
        });
      }
    }

    const email = rawEmail.trim().toLowerCase();
    const cleanProvidedName = rawName.trim();
    const displayName = (cleanProvidedName || email.split('@')[0]).trim();

    // 3. Upsert & Sign-In en PostgreSQL si está disponible
    if (await checkDbConnection()) {
      try {
        const existing = await pool.query(
          'SELECT id, email, password_hash, name, auth_provider, avatar_url FROM users WHERE LOWER(email) = $1 LIMIT 1',
          [email]
        );

        let row: any;
        let isNewUser = false;

        if (existing.rows.length > 0) {
          isNewUser = false;
          const current = existing.rows[0];
          const updateRes = await pool.query(
            `UPDATE users
             SET name = COALESCE(NULLIF($1, ''), name),
                 avatar_url = COALESCE($2, avatar_url),
                 auth_provider = CASE WHEN password_hash IS NULL THEN 'google' ELSE auth_provider END
             WHERE id = $3
             RETURNING id, email, name, auth_provider, avatar_url, created_at`,
            [cleanProvidedName, avatar_url, current.id]
          );
          row = updateRes.rows[0];
        } else {
          isNewUser = true;
          const insertRes = await pool.query(
            `INSERT INTO users (email, password_hash, name, auth_provider, avatar_url)
             VALUES ($1, NULL, $2, 'google', $3)
             RETURNING id, email, name, auth_provider, avatar_url, created_at`,
            [email, displayName, avatar_url]
          );
          row = insertRes.rows[0];
        }

        const user = {
          id: Number(row.id),
          email: row.email,
          name: row.name,
          auth_provider: row.auth_provider || 'google',
          avatar_url: row.avatar_url || null,
        };
        const token = signToken(user);

        return res.status(200).json({
          message: isNewUser
            ? 'Cuenta registrada exitosamente con Google'
            : 'Inicio de sesión con Google exitoso',
          token,
          isNewUser,
          user,
          source: 'database',
        });
      } catch (dbErr: any) {
        console.warn('[auth-service] Fallo upsert Google en PostgreSQL, usando memoria:', dbErr.message);
      }
    }

    // Fallback resiliente en memoria
    let memUser = inMemoryUsers.find((u) => u.email.toLowerCase() === email);
    let isNewUser = false;

    if (!memUser) {
      isNewUser = true;
      memUser = {
        id: nextInMemoryId++,
        email,
        password_hash: null,
        name: displayName,
        auth_provider: 'google',
        avatar_url,
        created_at: new Date().toISOString(),
      };
      inMemoryUsers.push(memUser);
    } else {
      isNewUser = false;
      if (cleanProvidedName) {
        memUser.name = cleanProvidedName;
      }
      if (avatar_url) {
        memUser.avatar_url = avatar_url;
      }
      if (!memUser.password_hash) {
        memUser.auth_provider = 'google';
      }
    }

    const userPayload = {
      id: memUser.id,
      email: memUser.email,
      name: memUser.name,
      auth_provider: memUser.auth_provider || 'google',
      avatar_url: memUser.avatar_url || null,
    };
    const token = signToken(userPayload);

    return res.status(200).json({
      message: isNewUser
        ? 'Cuenta registrada exitosamente con Google'
        : 'Inicio de sesión con Google exitoso',
      token,
      isNewUser,
      user: userPayload,
      source: 'in_memory',
    });
  } catch (err: any) {
    console.error('[auth-service] Error en /google:', err);
    return res.status(500).json({ error: 'Error interno al autenticar con Google.' });
  }
});

// -------------------------------------------------------------
// 5. Verificación de Sesión JWT (GET /me & POST /verify)
// -------------------------------------------------------------
function handleVerify(req: Request, res: Response) {
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({ error: 'Token de autenticación no proporcionado.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      id: number;
      email: string;
      name: string;
      avatar_url?: string | null;
      auth_provider?: string;
    };
    const user = {
      id: decoded.id,
      email: decoded.email,
      name: decoded.name,
      avatar_url: decoded.avatar_url || null,
      auth_provider: decoded.auth_provider || 'local',
    };
    return res.json({
      valid: true,
      user,
      ...user,
    });
  } catch {
    return res.status(401).json({ error: 'Token inválido o expirado.' });
  }
}

app.get('/me', handleVerify);
app.post('/verify', handleVerify);

export { app, pool };

if (process.env.AUTH_SERVICE_SKIP_LISTEN !== 'true') {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🔐 Auth Service corriendo en http://0.0.0.0:${PORT}`);
  });
}

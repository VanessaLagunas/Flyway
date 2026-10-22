import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Pool } from 'pg';
import { OAuth2Client } from 'google-auth-library';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 4003;
const JWT_SECRET = process.env.JWT_SECRET || 'flyway-super-secret-jwt-key-2026';
const JWT_EXPIRES_IN = '24h';
const GOOGLE_CLIENT_ID = (process.env.GOOGLE_CLIENT_ID || '').trim();
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID || undefined);

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
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    if (!schemaMigrated) {
      await client.query(`
        ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(50) DEFAULT 'local';
        ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
      `);
      schemaMigrated = true;
    }
    client.release();
    return true;
  } catch {
    return false;
  }
}

function signToken(user: { id: number; email: string; name: string; avatar_url?: string | null; auth_provider?: string }): string {
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

// -------------------------------------------------------------
// 1. Healthcheck (GET /health)
// -------------------------------------------------------------
app.get('/health', async (_req: Request, res: Response) => {
  const dbOk = await checkDbConnection();
  return res.json({
    status: 'ok',
    service: 'auth-service',
    port: PORT,
    database: {
      connected: dbOk,
    },
    timestamp: new Date().toISOString(),
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
    const cleanName = (name && typeof name === 'string' && name.trim()) ? name.trim() : cleanEmail.split('@')[0];
    const passwordHash = await bcrypt.hash(password, 10);

    // Intentar guardar en PostgreSQL
    if (await checkDbConnection()) {
      try {
        const existing = await pool.query('SELECT id FROM users WHERE LOWER(email) = $1', [cleanEmail]);
        if (existing.rows.length > 0) {
          return res.status(409).json({ error: 'El correo electrónico ya está registrado.' });
        }

        const insertRes = await pool.query(
          `INSERT INTO users (email, password_hash, name, created_at)
           VALUES ($1, $2, $3, NOW())
           RETURNING id, email, name, created_at`,
          [cleanEmail, passwordHash, cleanName]
        );

        const row = insertRes.rows[0];
        const user = { id: Number(row.id), email: row.email, name: row.name };
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
      return res.status(409).json({ error: 'El correo electrónico ya está registrado.' });
    }

    const newUser: UserRecord = {
      id: nextInMemoryId++,
      email: cleanEmail,
      password_hash: passwordHash,
      name: cleanName,
      created_at: new Date().toISOString(),
    };
    inMemoryUsers.push(newUser);

    const userPayload = { id: newUser.id, email: newUser.email, name: newUser.name };
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
            return res.status(401).json({
              error: 'Esta cuenta se registró con Google. Por favor inicia sesión usando el botón "Continuar con Google".',
            });
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
        console.warn('[auth-service] Error consultando usuario en PostgreSQL, probando fallback en memoria:', dbErr.message);
      }
    }

    // 2. Fallback en memoria (incluye demo@flyway.cl / flyway123)
    const memUser = inMemoryUsers.find((u) => u.email.toLowerCase() === cleanEmail);
    if (!memUser) {
      return res.status(401).json({ error: 'Credenciales inválidas.' });
    }
    if (!memUser.password_hash) {
      return res.status(401).json({
        error: 'Esta cuenta se registró con Google. Por favor inicia sesión usando el botón "Continuar con Google".',
      });
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
    const { credential, email: fallbackEmail, name: fallbackName, avatar_url: fallbackAvatar } = req.body || {};

    let email = '';
    let name = '';
    let avatar_url: string | null = null;

    if (credential && typeof credential === 'string') {
      try {
        const verifyOptions: { idToken: string; audience?: string } = { idToken: credential };
        if (GOOGLE_CLIENT_ID) {
          verifyOptions.audience = GOOGLE_CLIENT_ID;
        }
        const ticket = await googleClient.verifyIdToken(verifyOptions);
        const payload = ticket.getPayload();
        if (!payload || !payload.email) {
          return res.status(401).json({ error: 'El token de Google no contiene un correo válido.' });
        }
        if (payload.email_verified === false) {
          return res.status(401).json({ error: 'Tu correo de Google no está verificado.' });
        }
        email = payload.email.trim().toLowerCase();
        name = (payload.name || email.split('@')[0]).trim();
        avatar_url = payload.picture || null;
      } catch (verifyErr: any) {
        console.error('[auth-service] Error verificando Google ID Token:', verifyErr.message);
        return res.status(401).json({ error: 'Token de Google inválido o expirado.', detail: verifyErr.message });
      }
    } else if (fallbackEmail && typeof fallbackEmail === 'string' && fallbackEmail.includes('@')) {
      // Modo desarrollo / demo interactivo cuando GOOGLE_CLIENT_ID aún no está configurado en el entorno local
      email = fallbackEmail.trim().toLowerCase();
      name = (fallbackName && typeof fallbackName === 'string' && fallbackName.trim())
        ? fallbackName.trim()
        : email.split('@')[0];
      avatar_url = typeof fallbackAvatar === 'string' ? fallbackAvatar : null;
    } else {
      return res.status(400).json({ error: 'Se requiere la credencial de Google (credential).' });
    }

    // 1. Upsert en PostgreSQL si está disponible
    if (await checkDbConnection()) {
      try {
        const existing = await pool.query(
          'SELECT id, email, name, auth_provider, avatar_url FROM users WHERE LOWER(email) = $1 LIMIT 1',
          [email]
        );

        let row: any;
        if (existing.rows.length > 0) {
          const current = existing.rows[0];
          const updatedAvatar = avatar_url || current.avatar_url || null;
          const updateRes = await pool.query(
            `UPDATE users
             SET avatar_url = $1,
                 name = COALESCE(NULLIF($2, ''), name)
             WHERE id = $3
             RETURNING id, email, name, auth_provider, avatar_url`,
            [updatedAvatar, name, current.id]
          );
          row = updateRes.rows[0];
        } else {
          const insertRes = await pool.query(
            `INSERT INTO users (email, password_hash, name, auth_provider, avatar_url, created_at)
             VALUES ($1, NULL, $2, 'google', $3, NOW())
             RETURNING id, email, name, auth_provider, avatar_url`,
            [email, name, avatar_url]
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

        return res.json({
          token,
          user,
          source: 'database',
        });
      } catch (dbErr: any) {
        console.warn('[auth-service] Fallo upsert Google en PostgreSQL, usando memoria:', dbErr.message);
      }
    }

    // 2. Fallback en memoria
    let memUser = inMemoryUsers.find((u) => u.email.toLowerCase() === email);
    if (!memUser) {
      memUser = {
        id: nextInMemoryId++,
        email,
        password_hash: null,
        name,
        auth_provider: 'google',
        avatar_url,
        created_at: new Date().toISOString(),
      };
      inMemoryUsers.push(memUser);
    } else if (avatar_url) {
      memUser.avatar_url = avatar_url;
    }

    const userPayload = {
      id: memUser.id,
      email: memUser.email,
      name: memUser.name,
      auth_provider: memUser.auth_provider || 'google',
      avatar_url: memUser.avatar_url || null,
    };
    const token = signToken(userPayload);

    return res.json({
      token,
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
  } catch (err: any) {
    return res.status(401).json({ error: 'Token inválido o expirado.' });
  }
}

app.get('/me', handleVerify);
app.post('/verify', handleVerify);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🔐 Auth Service corriendo en http://0.0.0.0:${PORT}`);
});

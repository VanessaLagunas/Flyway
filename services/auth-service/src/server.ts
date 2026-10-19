import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Pool } from 'pg';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 4003;
const JWT_SECRET = process.env.JWT_SECRET || 'flyway-super-secret-jwt-key-2026';
const JWT_EXPIRES_IN = '24h';

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
  password_hash: string;
  name: string;
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
    created_at: new Date().toISOString(),
  },
];
let nextInMemoryId = 2;

async function checkDbConnection(): Promise<boolean> {
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    return true;
  } catch {
    return false;
  }
}

function signToken(user: { id: number; email: string; name: string }): string {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name,
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
          'SELECT id, email, password_hash, name FROM users WHERE LOWER(email) = $1 LIMIT 1',
          [cleanEmail]
        );
        if (result.rows.length > 0) {
          const row = result.rows[0];
          const isValid = await bcrypt.compare(String(password), row.password_hash);
          if (!isValid) {
            return res.status(401).json({ error: 'Credenciales inválidas.' });
          }
          const user = { id: Number(row.id), email: row.email, name: row.name };
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

    const validPassword = await bcrypt.compare(String(password), memUser.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Credenciales inválidas.' });
    }

    const user = { id: memUser.id, email: memUser.email, name: memUser.name };
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
// 4. Verificación de Sesión JWT (GET /me & POST /verify)
// -------------------------------------------------------------
function handleVerify(req: Request, res: Response) {
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({ error: 'Token de autenticación no proporcionado.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: number; email: string; name: string };
    const user = {
      id: decoded.id,
      email: decoded.email,
      name: decoded.name,
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

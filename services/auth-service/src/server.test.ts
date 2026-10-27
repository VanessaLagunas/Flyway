import { describe, it, before, after, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';

process.env.AUTH_SERVICE_SKIP_LISTEN = 'true';
process.env.AUTH_SERVICE_DISABLE_DB = 'true';

const realFetch = globalThis.fetch;

describe('Auth Service HTTP & Google OAuth 2.0 Integration', () => {
  let server: Server;
  let baseUrl = '';
  let poolRef: { end: () => Promise<void> } | null = null;

  const originalEnv = {
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    VITE_GOOGLE_CLIENT_ID: process.env.VITE_GOOGLE_CLIENT_ID,
    NODE_ENV: process.env.NODE_ENV,
  };

  before(async () => {
    const mod = await import('./server.js');
    poolRef = mod.pool;

    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.VITE_GOOGLE_CLIENT_ID;
    process.env.NODE_ENV = 'test';

    await new Promise<void>((resolve) => {
      server = mod.app.listen(0, '127.0.0.1', () => {
        const addr = server.address() as AddressInfo;
        baseUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });
  });

  afterEach(() => {
    globalThis.fetch = realFetch;
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.VITE_GOOGLE_CLIENT_ID;
    process.env.NODE_ENV = 'test';
  });

  after(async () => {
    globalThis.fetch = realFetch;
    if (originalEnv.GOOGLE_CLIENT_ID === undefined) {
      delete process.env.GOOGLE_CLIENT_ID;
    } else {
      process.env.GOOGLE_CLIENT_ID = originalEnv.GOOGLE_CLIENT_ID;
    }
    if (originalEnv.VITE_GOOGLE_CLIENT_ID === undefined) {
      delete process.env.VITE_GOOGLE_CLIENT_ID;
    } else {
      process.env.VITE_GOOGLE_CLIENT_ID = originalEnv.VITE_GOOGLE_CLIENT_ID;
    }
    if (originalEnv.NODE_ENV === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = originalEnv.NODE_ENV;
    }
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
    if (poolRef) {
      await poolRef.end().catch(() => {});
    }
  });

  it('1. GET /config returns { googleEnabled, googleClientId } dynamically with no-store cache headers', async () => {
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.VITE_GOOGLE_CLIENT_ID;

    const emptyRes = await realFetch(`${baseUrl}/config`);
    assert.equal(emptyRes.status, 200);
    assert.match(emptyRes.headers.get('cache-control') || '', /no-store/);
    const emptyBody = (await emptyRes.json()) as any;
    assert.deepEqual(emptyBody, {
      googleEnabled: false,
      googleClientId: '',
    });

    process.env.GOOGLE_CLIENT_ID = '  123456789-testclient.apps.googleusercontent.com  ';
    const configuredRes = await realFetch(`${baseUrl}/config`);
    assert.equal(configuredRes.status, 200);
    const configuredBody = (await configuredRes.json()) as any;
    assert.deepEqual(configuredBody, {
      googleEnabled: true,
      googleClientId: '123456789-testclient.apps.googleusercontent.com',
    });

    delete process.env.GOOGLE_CLIENT_ID;
    process.env.VITE_GOOGLE_CLIENT_ID = '987654321-vitefallback.apps.googleusercontent.com';
    const viteFallbackRes = await realFetch(`${baseUrl}/config`);
    const viteFallbackBody = (await viteFallbackRes.json()) as any;
    assert.deepEqual(viteFallbackBody, {
      googleEnabled: true,
      googleClientId: '987654321-vitefallback.apps.googleusercontent.com',
    });
  });

  it('2. POST /google with accessToken verifies tokeninfo + userinfo, auto-registers a new Google user, signs in existing user, and issues JWT accepted by GET /me', async () => {
    const testClientId = 'flyway-web-client.apps.googleusercontent.com';
    process.env.GOOGLE_CLIENT_ID = testClientId;

    let avatarVersion = 'https://lh3.googleusercontent.com/a/avatar-v1';

    globalThis.fetch = async (input: string | URL | Request, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;

      if (url.startsWith('https://oauth2.googleapis.com/tokeninfo')) {
        assert.match(url, /access_token=ya29\.valid_google_access_token/);
        return new Response(
          JSON.stringify({
            aud: testClientId,
            azp: testClientId,
            sub: 'google-sub-999',
            email: 'valentina.viajera@gmail.com',
            email_verified: 'true',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      if (url === 'https://www.googleapis.com/oauth2/v3/userinfo') {
        const headers = new Headers(init?.headers);
        assert.equal(headers.get('authorization'), 'Bearer ya29.valid_google_access_token');
        return new Response(
          JSON.stringify({
            sub: 'google-sub-999',
            email: 'Valentina.Viajera@gmail.com',
            email_verified: true,
            name: 'Valentina Viajera',
            picture: avatarVersion,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      return realFetch(input as any, init);
    };

    // Primera vez: auto-registro de nueva cuenta Google
    const regRes = await realFetch(`${baseUrl}/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accessToken: 'ya29.valid_google_access_token' }),
    });
    assert.equal(regRes.status, 200);
    const regData = (await regRes.json()) as any;
    assert.equal(regData.isNewUser, true);
    assert.equal(regData.message, 'Cuenta registrada exitosamente con Google');
    assert.ok(regData.token);
    assert.equal(regData.user.email, 'valentina.viajera@gmail.com');
    assert.equal(regData.user.name, 'Valentina Viajera');
    assert.equal(regData.user.auth_provider, 'google');
    assert.equal(regData.user.avatar_url, 'https://lh3.googleusercontent.com/a/avatar-v1');

    // Segunda vez: inicio de sesión sobre cuenta Google existente + actualización de avatar
    avatarVersion = 'https://lh3.googleusercontent.com/a/avatar-v2';
    const loginRes = await realFetch(`${baseUrl}/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ access_token: 'ya29.valid_google_access_token' }),
    });
    assert.equal(loginRes.status, 200);
    const loginData = (await loginRes.json()) as any;
    assert.equal(loginData.isNewUser, false);
    assert.equal(loginData.message, 'Inicio de sesión con Google exitoso');
    assert.equal(loginData.user.id, regData.user.id);
    assert.equal(loginData.user.avatar_url, 'https://lh3.googleusercontent.com/a/avatar-v2');

    // Validar el JWT resultante contra GET /me
    const meRes = await realFetch(`${baseUrl}/me`, {
      headers: { Authorization: `Bearer ${loginData.token}` },
    });
    assert.equal(meRes.status, 200);
    const meData = (await meRes.json()) as any;
    assert.equal(meData.valid, true);
    assert.equal(meData.user.email, 'valentina.viajera@gmail.com');
    assert.equal(meData.user.auth_provider, 'google');
  });

  it('3. POST /google rejects mismatched aud/azp when GOOGLE_CLIENT_ID is configured and rejects token-less payloads in production', async () => {
    process.env.GOOGLE_CLIENT_ID = 'expected-flyway-client.apps.googleusercontent.com';

    globalThis.fetch = async (input: string | URL | Request, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      if (url.startsWith('https://oauth2.googleapis.com/tokeninfo')) {
        return new Response(
          JSON.stringify({
            aud: 'other-attacker-app.apps.googleusercontent.com',
            azp: 'other-attacker-app.apps.googleusercontent.com',
            email: 'attacker@gmail.com',
            email_verified: 'true',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return realFetch(input as any, init);
    };

    const mismatchRes = await realFetch(`${baseUrl}/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accessToken: 'ya29.foreign_app_token' }),
    });
    assert.equal(mismatchRes.status, 401);
    const mismatchData = (await mismatchRes.json()) as any;
    assert.match(mismatchData.error, /audience mismatch/i);

    // Rechaza payload sin token cuando GOOGLE_CLIENT_ID está configurado
    const noTokenWithClientRes = await realFetch(`${baseUrl}/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'spoof@gmail.com', name: 'Spoof', devMock: true }),
    });
    assert.equal(noTokenWithClientRes.status, 400);

    // Rechaza payload sin token en NODE_ENV === 'production' incluso sin GOOGLE_CLIENT_ID
    delete process.env.GOOGLE_CLIENT_ID;
    process.env.NODE_ENV = 'production';
    const prodNoTokenRes = await realFetch(`${baseUrl}/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'spoof@gmail.com', name: 'Spoof', devMock: true }),
    });
    assert.equal(prodNoTokenRes.status, 400);
    const prodNoTokenData = (await prodNoTokenRes.json()) as any;
    assert.match(prodNoTokenData.error, /credential o accessToken/);
  });

  it('4. POST /login succeeds for demo@flyway.cl / flyway123, guides Google-only accounts to "Continuar con Google", and guides unregistered Gmail users', async () => {
    // 4a. Demo user login (Bruno 02-auth-login compatibility)
    const demoRes = await realFetch(`${baseUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'demo@flyway.cl', password: 'flyway123' }),
    });
    assert.equal(demoRes.status, 200);
    const demoData = (await demoRes.json()) as any;
    assert.ok(demoData.token);
    assert.equal(demoData.user.email, 'demo@flyway.cl');

    // 4b. Cuenta registrada con Google (valentina.viajera@gmail.com del test 2) intentando login con contraseña
    const googleAccountRes = await realFetch(`${baseUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'valentina.viajera@gmail.com', password: 'miPasswordGmail123' }),
    });
    assert.equal(googleAccountRes.status, 401);
    const googleAccountData = (await googleAccountRes.json()) as any;
    assert.match(googleAccountData.error, /Continuar con Google/);

    // 4c. Correo Gmail aún no registrado intentando login local directo
    const unknownGmailRes = await realFetch(`${baseUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'nuevo.usuario.real@gmail.com', password: 'cualquierPassword' }),
    });
    assert.equal(unknownGmailRes.status, 401);
    const unknownGmailData = (await unknownGmailRes.json()) as any;
    assert.match(unknownGmailData.error, /Continuar con Google/);
    assert.match(unknownGmailData.error, /Crear cuenta/);
  });
});

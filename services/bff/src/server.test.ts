import { describe, it, before, after } from 'node:test';
import http from 'node:http';
import assert from 'node:assert/strict';
import { app, AI_SERVICE_TIMEOUT_MS } from './server';

describe('BFF Server & AI Service Timeout Headroom Verification', () => {
  it('allocates sufficient upstream timeout (>= 210000ms / 3.5 min) to accommodate gpt-6-luna generations', () => {
    assert.ok(
      AI_SERVICE_TIMEOUT_MS >= 210000,
      `Expected AI_SERVICE_TIMEOUT_MS >= 210000ms, got ${AI_SERVICE_TIMEOUT_MS}`
    );
  });

  it('guarantees at least a 30-second buffer over standard OpenAI timeout (180000ms)', () => {
    const openAiTimeout = 180000;
    assert.ok(
      AI_SERVICE_TIMEOUT_MS >= openAiTimeout + 30000,
      `Expected BFF timeout to have at least 30s buffer over OpenAI timeout. BFF=${AI_SERVICE_TIMEOUT_MS}, OpenAI=${openAiTimeout}`
    );
  });
});

describe('BFF Itinerary Generation, Photo Enrichment, Photos Proxy & Auth Config', () => {
  let bffServer: http.Server;
  let bffUrl: string;

  before(async () => {
    await new Promise<void>((resolve) => {
      bffServer = app.listen(0, '127.0.0.1', () => {
        const addr = bffServer.address() as any;
        bffUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });
  });

  after(async () => {
    await new Promise<void>((resolve) => {
      bffServer.close(() => resolve());
    });
  });

  it('validates destination parameter and rejects empty destination with 400', async () => {
    const res = await fetch(`${bffUrl}/api/v1/itinerary/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        destination: '',
      }),
    });

    assert.equal(res.status, 400);
    assert.match(res.headers.get('cache-control') || '', /no-store/i);
    const body = await res.json() as any;
    assert.match(body.error, /destination es obligatorio/i);
  });

  it('forwards offline parameters and injects x-offline-mode: true when ENABLE_OFFLINE_MODE is active', async () => {
    let capturedHeaders: http.IncomingHttpHeaders = {};
    let capturedBody: any = null;

    const mockAiServer = http.createServer((req, res) => {
      capturedHeaders = req.headers;
      let bodyData = '';
      req.on('data', (chunk) => { bodyData += chunk; });
      req.on('end', () => {
        capturedBody = JSON.parse(bodyData);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          destination: capturedBody.destination,
          currency: 'CLP',
          days: [{ dayNumber: 1, date: '2026-11-01', activities: [] }],
        }));
      });
    });

    await new Promise<void>((resolve) => mockAiServer.listen(0, '127.0.0.1', () => resolve()));
    const mockAddr = mockAiServer.address() as any;
    const origAiUrl = process.env.AI_SERVICE_URL;
    const origCatalogUrl = process.env.CATALOG_SERVICE_URL;
    const origOffline = process.env.ENABLE_OFFLINE_MODE;

    process.env.AI_SERVICE_URL = `http://127.0.0.1:${mockAddr.port}`;
    process.env.CATALOG_SERVICE_URL = 'http://127.0.0.1:1';
    process.env.ENABLE_OFFLINE_MODE = 'true';

    try {
      const res = await fetch(`${bffUrl}/api/v1/itinerary/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          destination: 'Valparaíso',
          startDate: '2026-11-01',
          endDate: '2026-11-03',
          offline: true,
        }),
      });

      assert.equal(res.status, 200);
      assert.match(res.headers.get('cache-control') || '', /no-store/i);
      assert.equal(capturedHeaders['x-offline-mode'], 'true');
      assert.equal(capturedBody.offline, true);
      assert.equal(capturedBody.destination, 'Valparaíso');
    } finally {
      if (origAiUrl === undefined) delete process.env.AI_SERVICE_URL;
      else process.env.AI_SERVICE_URL = origAiUrl;
      if (origCatalogUrl === undefined) delete process.env.CATALOG_SERVICE_URL;
      else process.env.CATALOG_SERVICE_URL = origCatalogUrl;
      if (origOffline === undefined) delete process.env.ENABLE_OFFLINE_MODE;
      else process.env.ENABLE_OFFLINE_MODE = origOffline;
      await new Promise<void>((resolve) => mockAiServer.close(() => resolve()));
    }
  });

  it('preserves explicit client x-offline-mode: false header even if BFF ENABLE_OFFLINE_MODE is true', async () => {
    let capturedHeaders: http.IncomingHttpHeaders = {};

    const mockAiServer = http.createServer((req, res) => {
      capturedHeaders = req.headers;
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: false,
        error: 'El modo offline se encuentra desactivado',
      }));
    });

    await new Promise<void>((resolve) => mockAiServer.listen(0, '127.0.0.1', () => resolve()));
    const mockAddr = mockAiServer.address() as any;
    const origAiUrl = process.env.AI_SERVICE_URL;
    const origOffline = process.env.ENABLE_OFFLINE_MODE;

    process.env.AI_SERVICE_URL = `http://127.0.0.1:${mockAddr.port}`;
    process.env.ENABLE_OFFLINE_MODE = 'true';

    try {
      const res = await fetch(`${bffUrl}/api/v1/itinerary/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-offline-mode': 'false',
        },
        body: JSON.stringify({
          destination: 'Valparaíso',
        }),
      });

      assert.equal(res.status, 502);
      assert.equal(capturedHeaders['x-offline-mode'], 'false');
    } finally {
      if (origAiUrl === undefined) delete process.env.AI_SERVICE_URL;
      else process.env.AI_SERVICE_URL = origAiUrl;
      if (origOffline === undefined) delete process.env.ENABLE_OFFLINE_MODE;
      else process.env.ENABLE_OFFLINE_MODE = origOffline;
      await new Promise<void>((resolve) => mockAiServer.close(() => resolve()));
    }
  });

  it('exposes GET /api/v1/auth/config forwarding auth-service /config and gracefully falling back on outage', async () => {
    const origAuthUrl = process.env.AUTH_SERVICE_URL;
    const origGoogleId = process.env.GOOGLE_CLIENT_ID;

    const mockAuthServer = http.createServer((req, res) => {
      if (req.url === '/config' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ googleEnabled: true, googleClientId: 'upstream-client-id.apps.googleusercontent.com' }));
        return;
      }
      res.writeHead(404);
      res.end();
    });

    await new Promise<void>((resolve) => mockAuthServer.listen(0, '127.0.0.1', () => resolve()));
    const authAddr = mockAuthServer.address() as any;

    try {
      process.env.AUTH_SERVICE_URL = `http://127.0.0.1:${authAddr.port}`;
      const okRes = await fetch(`${bffUrl}/api/v1/auth/config`);
      assert.equal(okRes.status, 200);
      assert.match(okRes.headers.get('cache-control') || '', /no-store/i);
      const okData = (await okRes.json()) as any;
      assert.equal(okData.googleEnabled, true);
      assert.equal(okData.googleClientId, 'upstream-client-id.apps.googleusercontent.com');

      // Now simulate unreachable auth-service -> must still return HTTP 200 fallback
      process.env.AUTH_SERVICE_URL = 'http://127.0.0.1:1';
      process.env.GOOGLE_CLIENT_ID = 'fallback-local-id.apps.googleusercontent.com';

      const fallbackRes = await fetch(`${bffUrl}/api/v1/auth/config`);
      assert.equal(fallbackRes.status, 200);
      assert.match(fallbackRes.headers.get('cache-control') || '', /no-store/i);
      const fallbackData = (await fallbackRes.json()) as any;
      assert.equal(fallbackData.googleEnabled, true);
      assert.equal(fallbackData.googleClientId, 'fallback-local-id.apps.googleusercontent.com');
    } finally {
      if (origAuthUrl === undefined) delete process.env.AUTH_SERVICE_URL;
      else process.env.AUTH_SERVICE_URL = origAuthUrl;
      if (origGoogleId === undefined) delete process.env.GOOGLE_CLIENT_ID;
      else process.env.GOOGLE_CLIENT_ID = origGoogleId;
      await new Promise<void>((resolve) => mockAuthServer.close(() => resolve()));
    }
  });

  it('forwards country, count, and refresh parameters on GET /api/v1/photos with Cache-Control: no-store', async () => {
    const origCatalogUrl = process.env.CATALOG_SERVICE_URL;
    let capturedQueryUrl = '';

    const mockCatalog = http.createServer((req, res) => {
      capturedQueryUrl = req.url || '';
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          success: true,
          source: 'pexels_api',
          photoUrl: 'https://images.pexels.com/photos/701001/pexels-photo-701001.jpeg',
        })
      );
    });

    await new Promise<void>((resolve) => mockCatalog.listen(0, '127.0.0.1', () => resolve()));
    const catAddr = mockCatalog.address() as any;

    try {
      process.env.CATALOG_SERVICE_URL = `http://127.0.0.1:${catAddr.port}`;
      const res = await fetch(`${bffUrl}/api/v1/photos?destination=Cusco&country=Per%C3%BA&count=8&refresh=true`);
      assert.equal(res.status, 200);
      assert.match(res.headers.get('cache-control') || '', /no-store/i);

      const parsed = new URL(`http://localhost${capturedQueryUrl}`);
      assert.equal(parsed.pathname, '/photos');
      assert.equal(parsed.searchParams.get('destination'), 'Cusco');
      assert.equal(parsed.searchParams.get('country'), 'Perú');
      assert.equal(parsed.searchParams.get('count'), '8');
      assert.equal(parsed.searchParams.get('refresh'), 'true');
    } finally {
      if (origCatalogUrl === undefined) delete process.env.CATALOG_SERVICE_URL;
      else process.env.CATALOG_SERVICE_URL = origCatalogUrl;
      await new Promise<void>((resolve) => mockCatalog.close(() => resolve()));
    }
  });

  it('enriches itinerary via POST /photos/enrich-trip first, and falls back to GET /photos when enrich-trip is unavailable', async () => {
    const origAiUrl = process.env.AI_SERVICE_URL;
    const origCatalogUrl = process.env.CATALOG_SERVICE_URL;

    const mockAiServer = http.createServer((_req, res) => {
      const tripObj = {
        destination: 'Roma',
        country: 'Italia',
        days: [
          {
            dayNumber: 1,
            items: [
              { type: 'activity', data: { id: 'stop-1', placeName: 'Coliseo Romano', title: 'Visita al Coliseo' } },
              { type: 'activity', data: { id: 'stop-2', placeName: 'Fontana di Trevi', title: 'Fontana di Trevi' } },
            ],
          },
        ],
      };
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, ...tripObj, trip: { ...tripObj } }));
    });

    let enrichCalled = 0;
    let getPhotosCalled = 0;
    let simulateEnrich404 = false;

    const mockCatalogServer = http.createServer((req, res) => {
      if (req.url === '/photos/enrich-trip' && req.method === 'POST') {
        enrichCalled++;
        if (simulateEnrich404) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Not implemented in legacy mock' }));
          return;
        }
        let body = '';
        req.on('data', (c) => { body += c; });
        req.on('end', () => {
          const parsed = JSON.parse(body);
          assert.equal(parsed.refresh, true);
          const t = parsed.trip;
          t.imageUrl = 'https://images.pexels.com/photos/401000/pexels-photo-401000.jpeg';
          t.photoUrl = t.imageUrl;
          t.photo_url = t.imageUrl;
          t.imagePhotographer = 'Roma Hero';
          t.imagePhotographerUrl = 'https://www.pexels.com/@romahero';
          t.days[0].imageUrl = 'https://images.pexels.com/photos/401001/pexels-photo-401001.jpeg';
          t.days[0].items[0].data.imageUrl = 'https://images.pexels.com/photos/401010/pexels-photo-401010.jpeg';
          t.days[0].items[1].data.imageUrl = 'https://images.pexels.com/photos/401020/pexels-photo-401020.jpeg';
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ trip: t, source: 'pexels_api' }));
        });
        return;
      }

      if (req.url?.startsWith('/photos?') && req.method === 'GET') {
        getPhotosCalled++;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            success: true,
            source: 'pexels_api',
            photoUrl: 'https://images.pexels.com/photos/499000/pexels-photo-499000.jpeg',
            photographer: 'Fallback GET Photog',
            photographerUrl: 'https://www.pexels.com',
            photos: [
              { url: 'https://images.pexels.com/photos/499000/pexels-photo-499000.jpeg', photographer: 'Fallback GET Photog', photographerUrl: 'https://www.pexels.com' },
              { url: 'https://images.pexels.com/photos/499001/pexels-photo-499001.jpeg', photographer: 'Fallback GET Photog', photographerUrl: 'https://www.pexels.com' },
              { url: 'https://images.pexels.com/photos/499002/pexels-photo-499002.jpeg', photographer: 'Fallback GET Photog', photographerUrl: 'https://www.pexels.com' },
            ],
          })
        );
        return;
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
    });

    await new Promise<void>((resolve) => mockAiServer.listen(0, '127.0.0.1', () => resolve()));
    await new Promise<void>((resolve) => mockCatalogServer.listen(0, '127.0.0.1', () => resolve()));
    const aiAddr = mockAiServer.address() as any;
    const catAddr = mockCatalogServer.address() as any;

    try {
      process.env.AI_SERVICE_URL = `http://127.0.0.1:${aiAddr.port}`;
      process.env.CATALOG_SERVICE_URL = `http://127.0.0.1:${catAddr.port}`;

      // 1) Primary enrich-trip path succeeds -> GET /photos should NOT be called
      const res1 = await fetch(`${bffUrl}/api/v1/itinerary/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ destination: 'Roma' }),
      });
      assert.equal(res1.status, 200);
      assert.match(res1.headers.get('cache-control') || '', /no-store/i);
      const data1 = (await res1.json()) as any;
      assert.equal(enrichCalled, 1);
      assert.equal(getPhotosCalled, 0);
      assert.equal(data1.imageUrl, 'https://images.pexels.com/photos/401000/pexels-photo-401000.jpeg');
      assert.equal(data1.trip.imageUrl, 'https://images.pexels.com/photos/401000/pexels-photo-401000.jpeg');
      assert.equal(data1.days[0].items[0].data.imageUrl, 'https://images.pexels.com/photos/401010/pexels-photo-401010.jpeg');
      assert.equal(data1.days[0].items[1].data.imageUrl, 'https://images.pexels.com/photos/401020/pexels-photo-401020.jpeg');

      // 2) Legacy mock / 404 on enrich-trip -> gracefully falls back to GET /photos?...&refresh=true
      simulateEnrich404 = true;
      const res2 = await fetch(`${bffUrl}/api/v1/itinerary/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ destination: 'Roma' }),
      });
      assert.equal(res2.status, 200);
      const data2 = (await res2.json()) as any;
      assert.equal(enrichCalled, 2);
      assert.equal(getPhotosCalled, 1);
      assert.equal(data2.imageUrl, 'https://images.pexels.com/photos/499000/pexels-photo-499000.jpeg');
      assert.ok(data2.days[0].items[0].data.imageUrl);
    } finally {
      if (origAiUrl === undefined) delete process.env.AI_SERVICE_URL;
      else process.env.AI_SERVICE_URL = origAiUrl;
      if (origCatalogUrl === undefined) delete process.env.CATALOG_SERVICE_URL;
      else process.env.CATALOG_SERVICE_URL = origCatalogUrl;
      await new Promise<void>((resolve) => mockAiServer.close(() => resolve()));
      await new Promise<void>((resolve) => mockCatalogServer.close(() => resolve()));
    }
  });

  it('enforces authentication on GET and POST /api/v1/saved and returns clear Spanish sign-in message', async () => {
    const origAuthUrl = process.env.AUTH_SERVICE_URL;
    const origCatalogUrl = process.env.CATALOG_SERVICE_URL;

    let authMeCalls = 0;
    let catalogSaveCalls = 0;
    let lastSavedPayload: any = null;
    let lastGetSavedPath = '';

    const mockAuthServer = http.createServer((req, res) => {
      if (req.url === '/me' && req.method === 'GET') {
        authMeCalls++;
        const auth = req.headers.authorization || '';
        if (auth === 'Bearer valid-jwt-user-42') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              valid: true,
              user: { id: 42, email: 'viajero@flyway.cl', name: 'Viajero' },
            })
          );
          return;
        }
        if (auth === 'Bearer malformed-user-payload') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ valid: true, user: { id: 0, email: '' } }));
          return;
        }
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Token inválido o expirado.' }));
        return;
      }
      res.writeHead(404);
      res.end();
    });

    const mockCatalogServer = http.createServer((req, res) => {
      if (req.url === '/saved' && req.method === 'POST') {
        catalogSaveCalls++;
        let body = '';
        req.on('data', (c) => { body += c; });
        req.on('end', () => {
          lastSavedPayload = JSON.parse(body);
          res.writeHead(201, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, saved: lastSavedPayload }));
        });
        return;
      }
      if (req.url?.startsWith('/saved/') && req.method === 'GET') {
        lastGetSavedPath = req.url;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, count: 0, saved: [] }));
        return;
      }
      res.writeHead(404);
      res.end();
    });

    await new Promise<void>((resolve) => mockAuthServer.listen(0, '127.0.0.1', () => resolve()));
    await new Promise<void>((resolve) => mockCatalogServer.listen(0, '127.0.0.1', () => resolve()));
    const authAddr = mockAuthServer.address() as any;
    const catAddr = mockCatalogServer.address() as any;

    try {
      process.env.AUTH_SERVICE_URL = `http://127.0.0.1:${authAddr.port}`;
      process.env.CATALOG_SERVICE_URL = `http://127.0.0.1:${catAddr.port}`;

      // 1) Missing Authorization header -> 401 with Spanish sign-in message, zero upstream calls
      const noAuthPost = await fetch(`${bffUrl}/api/v1/saved`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ destinationName: 'Valparaíso', totalBudgetClp: 45000 }),
      });
      assert.equal(noAuthPost.status, 401);
      const noAuthBody = (await noAuthPost.json()) as any;
      assert.match(noAuthBody.error, /iniciar sesión/i);
      assert.equal(authMeCalls, 0);
      assert.equal(catalogSaveCalls, 0);

      // 2) Whitespace-only Bearer token -> 401, zero upstream calls
      const blankBearerPost = await fetch(`${bffUrl}/api/v1/saved`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer    ',
        },
        body: JSON.stringify({ destinationName: 'Valparaíso' }),
      });
      assert.equal(blankBearerPost.status, 401);
      assert.equal(authMeCalls, 0);
      assert.equal(catalogSaveCalls, 0);

      // 3) Invalid / expired token -> 401, catalog-service never called
      const badTokenPost = await fetch(`${bffUrl}/api/v1/saved`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer expired-token',
        },
        body: JSON.stringify({ destinationName: 'Valparaíso' }),
      });
      assert.equal(badTokenPost.status, 401);
      const badTokenBody = (await badTokenPost.json()) as any;
      assert.match(badTokenBody.error, /iniciar sesión/i);
      assert.equal(authMeCalls, 1);
      assert.equal(catalogSaveCalls, 0);

      // 4) Malformed user payload -> 401 (never falls back to userId 1)
      const malformedUserPost = await fetch(`${bffUrl}/api/v1/saved`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer malformed-user-payload',
        },
        body: JSON.stringify({ destinationName: 'Valparaíso' }),
      });
      assert.equal(malformedUserPost.status, 401);
      assert.equal(catalogSaveCalls, 0);

      // 5) GET /api/v1/saved without Authorization -> 401
      const noAuthGet = await fetch(`${bffUrl}/api/v1/saved`);
      assert.equal(noAuthGet.status, 401);

      // 6) Valid JWT -> saves and queries under authenticated userId 42
      const okPost = await fetch(`${bffUrl}/api/v1/saved`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid-jwt-user-42',
        },
        body: JSON.stringify({
          destinationName: 'Pucón',
          totalBudgetClp: 120000,
          itineraryData: { id: 'pucon-1' },
        }),
      });
      assert.equal(okPost.status, 201);
      assert.equal(catalogSaveCalls, 1);
      assert.equal(lastSavedPayload.userId, 42);
      assert.equal(lastSavedPayload.destinationName, 'Pucón');

      const okGet = await fetch(`${bffUrl}/api/v1/saved`, {
        headers: { Authorization: 'Bearer valid-jwt-user-42' },
      });
      assert.equal(okGet.status, 200);
      assert.equal(lastGetSavedPath, '/saved/42');
    } finally {
      if (origAuthUrl === undefined) delete process.env.AUTH_SERVICE_URL;
      else process.env.AUTH_SERVICE_URL = origAuthUrl;
      if (origCatalogUrl === undefined) delete process.env.CATALOG_SERVICE_URL;
      else process.env.CATALOG_SERVICE_URL = origCatalogUrl;
      await new Promise<void>((resolve) => mockAuthServer.close(() => resolve()));
      await new Promise<void>((resolve) => mockCatalogServer.close(() => resolve()));
    }
  });
});

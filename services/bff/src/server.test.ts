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

describe('BFF Itinerary Generation & Parameter Forwarding', () => {
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
    const origOffline = process.env.ENABLE_OFFLINE_MODE;

    process.env.AI_SERVICE_URL = `http://127.0.0.1:${mockAddr.port}`;
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
      assert.equal(capturedHeaders['x-offline-mode'], 'true');
      assert.equal(capturedBody.offline, true);
      assert.equal(capturedBody.destination, 'Valparaíso');
    } finally {
      process.env.AI_SERVICE_URL = origAiUrl;
      process.env.ENABLE_OFFLINE_MODE = origOffline;
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
      process.env.AI_SERVICE_URL = origAiUrl;
      process.env.ENABLE_OFFLINE_MODE = origOffline;
      await new Promise<void>((resolve) => mockAiServer.close(() => resolve()));
    }
  });
});

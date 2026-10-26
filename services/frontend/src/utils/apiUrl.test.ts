import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { getBffUrl, parseJsonSafe } from './apiUrl.js';

describe('getBffUrl & parseJsonSafe Resolution', () => {
  test('returns /api/v1 when running in GCP or remote non-localhost hostnames', () => {
    (global as any).window = {
      location: {
        hostname: '34.176.12.34',
      },
    };
    assert.equal(getBffUrl(), '/api/v1');

    (global as any).window.location.hostname = 'flyway.mi-empresa.cl';
    assert.equal(getBffUrl(), '/api/v1');
  });

  test('returns http://localhost:4000/api/v1 when running on localhost', () => {
    (global as any).window = {
      location: {
        hostname: 'localhost',
      },
    };
    assert.equal(getBffUrl(), 'http://localhost:4000/api/v1');

    (global as any).window.location.hostname = '127.0.0.1';
    assert.equal(getBffUrl(), 'http://localhost:4000/api/v1');
  });

  test('parseJsonSafe parses valid JSON and throws actionable error on HTML responses', async () => {
    const validRes = new Response(JSON.stringify({ ok: true, currency: 'CLP' }), { status: 200 });
    const parsed = await parseJsonSafe(validRes);
    assert.equal(parsed.currency, 'CLP');

    const htmlRes = new Response('<html>\n<head><title>405 Not Allowed</title></head></html>', { status: 405 });
    await assert.rejects(
      () => parseJsonSafe(htmlRes),
      /respondió con HTML en lugar de JSON \(HTTP 405\)/
    );
  });
});

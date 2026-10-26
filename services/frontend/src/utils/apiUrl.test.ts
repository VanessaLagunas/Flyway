import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { getBffUrl } from './apiUrl.js';

describe('getBffUrl Resolution', () => {
  test('returns /api/v1 when running in GCP or remote non-localhost hostnames', () => {
    // Simular entorno de navegador en GCP
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
});

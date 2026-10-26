import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { AI_SERVICE_TIMEOUT_MS } from './server';

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

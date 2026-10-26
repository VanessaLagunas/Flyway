import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

describe('Auth Service Verification', () => {
  const DEMO_PASSWORD_HASH = '$2a$10$2kSgvJqGLXzH8LMF3KAZH.QS3M6pErF3.ZYMqLQHUtvhfmMNWcKEm';
  const JWT_SECRET = 'flyway-super-secret-jwt-key-2026';

  describe('Demo credentials integrity', () => {
    it('verifies that demo password "flyway123" matches stored DEMO_PASSWORD_HASH', async () => {
      const isValid = await bcrypt.compare('flyway123', DEMO_PASSWORD_HASH);
      assert.equal(isValid, true, 'Demo password must validate against bcrypt hash');
    });

    it('rejects incorrect passwords for demo user', async () => {
      const isValid = await bcrypt.compare('wrongpassword', DEMO_PASSWORD_HASH);
      assert.equal(isValid, false);
    });
  });

  describe('JWT token handling', () => {
    it('generates and verifies valid user JWT token', () => {
      const user = {
        id: 1,
        email: 'demo@flyway.cl',
        name: 'Viajero Demo',
        auth_provider: 'local',
      };

      const token = jwt.sign(user, JWT_SECRET, { expiresIn: '24h' });
      assert.ok(token, 'Token must be generated');

      const decoded = jwt.verify(token, JWT_SECRET) as any;
      assert.equal(decoded.email, 'demo@flyway.cl');
      assert.equal(decoded.name, 'Viajero Demo');
      assert.equal(decoded.id, 1);
    });

    it('rejects tampered or invalid JWT token', () => {
      assert.throws(() => {
        jwt.verify('invalid.token.string', JWT_SECRET);
      });
    });

    it('rejects JWT signed with wrong secret', () => {
      const wrongSecretToken = jwt.sign({ id: 1, email: 'demo@flyway.cl' }, 'wrong-secret');
      assert.throws(() => {
        jwt.verify(wrongSecretToken, JWT_SECRET);
      });
    });
  });
});

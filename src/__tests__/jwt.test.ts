import { describe, it, expect } from 'vitest';
import { generateJWT, verifyJWT } from '../jwt';

const TEST_SECRET = 'test-secret-key-12345';

describe('JWT', () => {
  it('should generate and verify a valid JWT', async () => {
    const payload = { email: 'test@example.com', UserId: 1 };
    const token = await generateJWT(payload, TEST_SECRET);
    expect(token).toBeTruthy();
    expect(token.split('.')).toHaveLength(3);

    const decoded = await verifyJWT(token, TEST_SECRET);
    expect(decoded.email).toBe('test@example.com');
    expect(decoded.UserId).toBe(1);
  });

  it('should reject a token with wrong secret', async () => {
    const payload = { email: 'test@example.com', UserId: 1 };
    const token = await generateJWT(payload, TEST_SECRET);
    await expect(verifyJWT(token, 'wrong-secret')).rejects.toThrow();
  });

  it('should reject an expired token', async () => {
    const payload = { email: 'test@example.com', UserId: 1, exp: Math.floor(Date.now() / 1000) - 60 };
    const token = await generateJWT(payload, TEST_SECRET);
    await expect(verifyJWT(token, TEST_SECRET)).rejects.toThrow();
  });

  it('should reject a malformed token', async () => {
    await expect(verifyJWT('not-a-jwt', TEST_SECRET)).rejects.toThrow();
  });

  it('should handle custom expiration', async () => {
    const future = Math.floor(Date.now() / 1000) + 3600;
    const payload = { email: 'test@example.com', UserId: 1, exp: future };
    const token = await generateJWT(payload, TEST_SECRET);
    const decoded = await verifyJWT(token, TEST_SECRET);
    expect(decoded.exp).toBe(future);
  });
});

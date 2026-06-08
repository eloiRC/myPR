import { describe, it, expect } from 'vitest';
import { encrypt, decrypt } from '../crypto';

const TEST_SECRET = 'test-encryption-key-32chars!';

describe('Crypto', () => {
  it('should encrypt and decrypt a string', async () => {
    const plaintext = 'my-super-secret-password';
    const encrypted = await encrypt(plaintext, TEST_SECRET);
    expect(encrypted).toBeTruthy();
    expect(encrypted).not.toBe(plaintext);

    const decrypted = await decrypt(encrypted, TEST_SECRET);
    expect(decrypted).toBe(plaintext);
  });

  it('should produce different ciphertexts for the same plaintext', async () => {
    const plaintext = 'same-password';
    const [a, b] = await Promise.all([
      encrypt(plaintext, TEST_SECRET),
      encrypt(plaintext, TEST_SECRET),
    ]);
    expect(a).not.toBe(b);
  });

  it('should fail to decrypt with wrong secret', async () => {
    const plaintext = 'my-secret';
    const encrypted = await encrypt(plaintext, TEST_SECRET);
    await expect(decrypt(encrypted, 'wrong-key')).rejects.toThrow();
  });

  it('should handle empty string', async () => {
    const encrypted = await encrypt('', TEST_SECRET);
    const decrypted = await decrypt(encrypted, TEST_SECRET);
    expect(decrypted).toBe('');
  });
});

function base64urlEncode(str: string): string {
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function base64urlDecode(str: string): string {
  const padding = '='.repeat((4 - str.length % 4) % 4);
  return atob(str.replace(/-/g, '+').replace(/_/g, '/') + padding);
}

async function deriveAESKey(secret: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw', encoder.encode(secret),
    { name: 'PBKDF2' }, false, ['deriveKey']
  );
  const salt = encoder.encode('garmin-encryption-v1');
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false, ['encrypt', 'decrypt']
  );
}

export async function encrypt(plaintext: string, secret: string): Promise<string> {
  const key = await deriveAESKey(secret);
  const nonce = crypto.getRandomValues(new Uint8Array(12));
  const encoder = new TextEncoder();
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonce },
    key,
    encoder.encode(plaintext)
  );
  const combined = new Uint8Array(nonce.length + encrypted.byteLength);
  combined.set(nonce);
  combined.set(new Uint8Array(encrypted), nonce.length);
  return base64urlEncode(String.fromCharCode(...combined));
}

export async function decrypt(ciphertextB64: string, secret: string): Promise<string> {
  const key = await deriveAESKey(secret);
  const raw = base64urlDecode(ciphertextB64);
  const data = Uint8Array.from(raw, c => c.charCodeAt(0));
  const nonce = data.slice(0, 12);
  const encrypted = data.slice(12);
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: nonce },
    key,
    encrypted
  );
  return new TextDecoder().decode(decrypted);
}

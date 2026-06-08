import { SignJWT, jwtVerify } from 'jose';

const enc = new TextEncoder();
const secretKey = (secret: string) => enc.encode(secret);

export async function generateJWT(payload: { email: string; UserId: number; exp?: number }, secret: string): Promise<string> {
  return await new SignJWT({ email: payload.email, UserId: payload.UserId })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setExpirationTime(payload.exp ?? Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60)
    .setIssuedAt()
    .sign(secretKey(secret));
}

export async function verifyJWT(token: string, secret: string): Promise<{ email: string; UserId: number; exp: number }> {
  const { payload } = await jwtVerify(token, secretKey(secret));
  return payload as unknown as { email: string; UserId: number; exp: number };
}

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey('raw', data, { name: 'PBKDF2' }, false, ['deriveBits']);
  const hash = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: salt.buffer, iterations: 100000, hash: 'SHA-256' }, key, 256);
  const hashArray = new Uint8Array(hash);
  const result = new Uint8Array(salt.length + hashArray.length);
  result.set(salt);
  result.set(hashArray, salt.length);
  return btoa(String.fromCharCode(...result));
}

async function verifyPassword(storedHash: string, password: string): Promise<boolean> {
  try {
    const hashData = Uint8Array.from(atob(storedHash), c => c.charCodeAt(0));
    const salt = hashData.slice(0, 16);
    const originalHash = hashData.slice(16);
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const key = await crypto.subtle.importKey('raw', data, { name: 'PBKDF2' }, false, ['deriveBits']);
    const verifyHash = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: salt.buffer, iterations: 100000, hash: 'SHA-256' }, key, 256);
    const verifyHashArray = new Uint8Array(verifyHash);
    if (originalHash.length !== verifyHashArray.length) return false;
    let result = 0;
    for (let i = 0; i < originalHash.length; i++) result |= originalHash[i] ^ verifyHashArray[i];
    return result === 0;
  } catch (error) {
    console.error('Error al verificar la contraseña:', error);
    return false;
  }
}

export { hashPassword, verifyPassword }

import 'server-only';
import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import { getEnv } from './env';

/** Purpose-bound keys derived from ORIM_SECRET, so one leak cannot be replayed elsewhere */
function key(purpose: 'session' | 'phone' | 'encrypt' | 'nonce' | 'otp' | 'ip'): Buffer {
  return createHmac('sha256', getEnv().secret).update(`orim:${purpose}:v1`).digest();
}

export function hmac(purpose: Parameters<typeof key>[0], value: string): string {
  return createHmac('sha256', key(purpose)).update(value).digest('base64url');
}

export function safeEqual(a: string, b: string): boolean {
  const ab = createHash('sha256').update(a).digest();
  const bb = createHash('sha256').update(b).digest();
  return timingSafeEqual(ab, bb) && a.length === b.length;
}

/** 128-bit URL-safe token; unguessable, so links cannot be enumerated */
export function randomToken(bytes = 16): string {
  return randomBytes(bytes).toString('base64url');
}

export function randomSeed(): number {
  return randomBytes(4).readUInt32BE(0);
}

export function randomOtp(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, '0');
}

/** AES-256-GCM for the few values we must read back (a verified prize phone number) */
export function encrypt(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key('encrypt'), iv);
  const body = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return ['v1', iv.toString('base64url'), cipher.getAuthTag().toString('base64url'), body.toString('base64url')].join('.');
}

export function decrypt(sealed: string): string {
  const [v, iv, tag, body] = sealed.split('.');
  if (v !== 'v1' || !iv || !tag || !body) throw new Error('Unreadable sealed value');
  const decipher = createDecipheriv('aes-256-gcm', key('encrypt'), Buffer.from(iv, 'base64url'));
  decipher.setAuthTag(Buffer.from(tag, 'base64url'));
  return Buffer.concat([decipher.update(Buffer.from(body, 'base64url')), decipher.final()]).toString('utf8');
}

export function hashIp(ip: string): string {
  return hmac('ip', ip).slice(0, 22);
}

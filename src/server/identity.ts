import 'server-only';
import { randomUUID } from 'node:crypto';
import { cookies } from 'next/headers';
import { getDb } from './db';
import { getEnv } from './env';
import { hmac, safeEqual } from './security';

/**
 * Anonymous, durable player identity: a signed, httpOnly cookie holding a random id.
 * No phone number or account is needed to play, challenge or enter competitions.
 * Prize claims add phone ownership verification on top (see rewards.ts).
 */

const COOKIE = 'orim_pid';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export function signPlayerId(id: string): string {
  return `${id}.${hmac('session', id)}`;
}

export function verifyPlayerCookie(value: string | undefined): string | null {
  if (!value) return null;
  const dot = value.indexOf('.');
  if (dot < 0) return null;
  const id = value.slice(0, dot);
  if (!UUID.test(id)) return null;
  return safeEqual(value.slice(dot + 1), hmac('session', id)) ? id : null;
}

/** A friendly, non-identifying name: Explorer-4F2A */
export function displayNameFor(id: string): string {
  return `Explorer-${hmac('session', `name:${id}`).replace(/[^A-Za-z0-9]/g, '').slice(0, 4).toUpperCase()}`;
}

export async function ensurePlayer(id: string): Promise<void> {
  const db = await getDb();
  await db.query('insert into players (id, display_name) values ($1, $2) on conflict (id) do nothing', [id, displayNameFor(id)]);
}

/** The current player, or null when the browser has never been online with ORIM */
export async function currentPlayer(): Promise<string | null> {
  const jar = await cookies();
  return verifyPlayerCookie(jar.get(COOKIE)?.value);
}

/** The current player, creating an anonymous identity on first use */
export async function requirePlayer(): Promise<string> {
  const jar = await cookies();
  let id = verifyPlayerCookie(jar.get(COOKIE)?.value);
  if (!id) {
    id = randomUUID();
    jar.set(COOKIE, signPlayerId(id), {
      httpOnly: true,
      sameSite: 'lax',
      secure: getEnv().APP_BASE_URL.startsWith('https://'),
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
    });
  }
  await ensurePlayer(id);
  return id;
}

import 'server-only';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getEnv } from './env';
import { safeEqual } from './security';

/** An error whose message is safe to show the player */
export class AppError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}

export const fail = (status: number, code: string, message: string) => new AppError(status, code, message);

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
}

/** Wraps a route: known errors pass through, anything else becomes a generic 500 */
export function handle<A extends unknown[]>(fn: (...args: A) => Promise<Response>) {
  return async (...args: A): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (err) {
      if (err instanceof AppError) return json({ error: err.code, message: err.message }, err.status);
      // Log the kind of failure only: no request bodies, numbers or tokens
      console.error('[orim] request failed:', err instanceof Error ? err.name + ': ' + err.message.slice(0, 200) : 'unknown');
      return json({ error: 'internal', message: 'Something went wrong. Please try again.' }, 500);
    }
  };
}

export async function parseBody<T extends z.ZodType>(req: Request, schema: T): Promise<z.infer<T>> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw fail(400, 'bad_json', 'Request body must be JSON.');
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    throw fail(400, 'invalid_request', parsed.error.issues.map(i => `${i.path.join('.') || 'body'}: ${i.message}`).join('; '));
  }
  return parsed.data;
}

export function clientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for');
  return (fwd?.split(',')[0] ?? req.headers.get('x-real-ip') ?? 'unknown').trim();
}

/** Internal endpoints take `Authorization: Bearer <ADMIN_TOKEN>`; with no token configured they stay shut */
export function requireAdmin(req: Request): string {
  const token = getEnv().ADMIN_TOKEN;
  if (!token) throw fail(503, 'admin_disabled', 'Administration is not configured.');
  const header = req.headers.get('authorization') ?? '';
  const given = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!given || !safeEqual(given, token)) throw fail(401, 'unauthorized', 'Not authorised.');
  return 'admin';
}

import 'server-only';
import type { Queryable } from './db';

/**
 * Sliding-window counters kept in Postgres, so limits hold across serverless instances.
 * Call inside a transaction: each bucket takes a transaction-scoped advisory lock,
 * so two parallel requests cannot both squeeze under the same limit.
 */

export interface Limit { bucket: string; limit: number; windowSec: number }

/** All-or-nothing: returns the first limit that blocks, without spending any of them */
export async function consumeAll(q: Queryable, limits: Limit[]): Promise<Limit | null> {
  for (const l of limits) {
    await q.query('select pg_advisory_xact_lock(hashtext($1))', [l.bucket]);
    const [{ n }] = await q.query<{ n: number }>(
      `select count(*)::int as n from rate_events
        where bucket = $1 and created_at > now() - make_interval(secs => $2)`,
      [l.bucket, l.windowSec],
    );
    if (n >= l.limit) return l;
  }
  for (const l of limits) await q.query('insert into rate_events (bucket) values ($1)', [l.bucket]);
  if (Math.random() < 0.01) {
    await q.query(`delete from rate_events where created_at < now() - interval '2 days'`);
  }
  return null;
}

export const HOUR = 3600;
export const DAY = 86400;

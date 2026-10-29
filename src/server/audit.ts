import 'server-only';
import type { Queryable } from './db';

/** Append-only trail for money and messaging decisions. Never put raw phone numbers or secrets in detail. */
export async function audit(q: Queryable, actor: string, action: string, subject: string | null, detail: Record<string, unknown> = {}) {
  await q.query(
    'insert into audit_events (actor, action, subject, detail) values ($1, $2, $3, $4)',
    [actor, action, subject, JSON.stringify(detail)],
  );
}

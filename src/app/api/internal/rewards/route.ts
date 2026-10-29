import { handle, json, requireAdmin } from '@/server/http';
import { listClaims } from '@/server/rewards';

export const dynamic = 'force-dynamic';

const STATUSES = new Set(['pending', 'approved', 'processing', 'succeeded', 'failed', 'review_required']);

/** Admin only: the review queue. Phone numbers appear masked. */
export const GET = handle(async (req: Request) => {
  requireAdmin(req);
  const status = new URL(req.url).searchParams.get('status') ?? undefined;
  return json({ claims: await listClaims(status && STATUSES.has(status) ? status : undefined) });
});

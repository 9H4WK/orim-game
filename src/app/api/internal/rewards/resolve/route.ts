import { z } from 'zod';
import { handle, json, parseBody, requireAdmin } from '@/server/http';
import { resolvePayout } from '@/server/rewards';

export const dynamic = 'force-dynamic';

const body = z.object({
  claimId: z.string().regex(/^\d{1,18}$/),
  outcome: z.enum(['succeeded', 'failed']),
  note: z.string().trim().min(10).max(500),
});

/** Admin only: close a review_required payout after checking the provider dashboard by hand */
export const POST = handle(async (req: Request) => {
  const actor = requireAdmin(req);
  const { claimId, outcome, note } = await parseBody(req, body);
  return json(await resolvePayout(actor, claimId, outcome, note));
});

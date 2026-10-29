import { z } from 'zod';
import { handle, json, parseBody, requireAdmin } from '@/server/http';
import { reconcilePayout } from '@/server/rewards';

export const dynamic = 'force-dynamic';

/** Admin only: ask Africa’s Talking for the final status of a payout */
export const POST = handle(async (req: Request) => {
  const actor = requireAdmin(req);
  const { claimId } = await parseBody(req, z.object({ claimId: z.string().regex(/^\d{1,18}$/) }));
  return json(await reconcilePayout(actor, claimId));
});

import { z } from 'zod';
import { handle, json, parseBody, requireAdmin } from '@/server/http';
import { issuePayout } from '@/server/rewards';

export const dynamic = 'force-dynamic';

/** Admin only: send airtime for one approved claim. Safe to call twice; the second call sends nothing. */
export const POST = handle(async (req: Request) => {
  const actor = requireAdmin(req);
  const { claimId } = await parseBody(req, z.object({ claimId: z.string().regex(/^\d{1,18}$/) }));
  return json(await issuePayout(actor, claimId));
});

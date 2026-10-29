import { z } from 'zod';
import { handle, json, parseBody, requireAdmin } from '@/server/http';
import { approveClaim } from '@/server/rewards';

export const dynamic = 'force-dynamic';

const body = z.object({ claimId: z.string().regex(/^\d{1,18}$/), acknowledgeRisk: z.boolean().optional() });

/** Admin only: approve one budgeted claim. The amount comes from the claim record, never from here. */
export const POST = handle(async (req: Request) => {
  const actor = requireAdmin(req);
  const { claimId, acknowledgeRisk } = await parseBody(req, body);
  return json(await approveClaim(actor, claimId, { acknowledgeRisk }));
});

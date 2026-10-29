import { finalizeCompetition } from '@/server/competitions';
import { handle, json, requireAdmin } from '@/server/http';

export const dynamic = 'force-dynamic';

/** Admin only: rank verified runs after closing time and fix the results */
export const POST = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const actor = requireAdmin(req);
  const { id } = await ctx.params;
  return json(await finalizeCompetition(actor, id));
});

import { leaderboard } from '@/server/competitions';
import { handle, json } from '@/server/http';
import { currentPlayer } from '@/server/identity';

export const dynamic = 'force-dynamic';

export const GET = handle(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  return json(await leaderboard(id, await currentPlayer()));
});

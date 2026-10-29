import { challengeResults } from '@/server/challenges';
import { handle, json } from '@/server/http';
import { currentPlayer } from '@/server/identity';

export const dynamic = 'force-dynamic';

export const GET = handle(async (_req: Request, ctx: { params: Promise<{ token: string }> }) => {
  const { token } = await ctx.params;
  return json(await challengeResults(token, await currentPlayer()));
});

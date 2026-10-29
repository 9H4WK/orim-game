import { z } from 'zod';
import { fail, handle, json, parseBody } from '@/server/http';
import { currentPlayer } from '@/server/identity';
import { createClaim } from '@/server/rewards';

export const dynamic = 'force-dynamic';

export const POST = handle(async (req: Request) => {
  const { competitionId } = await parseBody(req, z.object({ competitionId: z.string().regex(/^[a-z0-9-]{3,48}$/) }));
  const playerId = await currentPlayer();
  if (!playerId) throw fail(403, 'not_eligible', 'This result did not win a prize.');
  return json(await createClaim(playerId, competitionId), 201);
});

import { z } from 'zod';
import { createChallenge } from '@/server/challenges';
import { handle, json, parseBody } from '@/server/http';
import { requirePlayer } from '@/server/identity';

export const dynamic = 'force-dynamic';

/** Create a seeded challenge sized like the stage the player just cleared */
export const POST = handle(async (req: Request) => {
  const { stage } = await parseBody(req, z.object({ stage: z.number().int().min(1).max(10_000) }));
  const playerId = await requirePlayer();
  return json(await createChallenge(playerId, stage), 201);
});

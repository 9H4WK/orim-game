import { z } from 'zod';
import { handle, json, parseBody } from '@/server/http';
import { requirePlayer } from '@/server/identity';
import { startRun } from '@/server/runs';

export const dynamic = 'force-dynamic';

const body = z.union([
  z.object({ challengeToken: z.string().min(16).max(64) }).strict(),
  z.object({ competitionId: z.string().regex(/^[a-z0-9-]{3,48}$/) }).strict(),
]);

export const POST = handle(async (req: Request) => {
  const target = await parseBody(req, body);
  const playerId = await requirePlayer();
  return json(await startRun(playerId, target), 201);
});

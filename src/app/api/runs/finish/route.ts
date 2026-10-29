import { z } from 'zod';
import { fail, handle, json, parseBody } from '@/server/http';
import { currentPlayer } from '@/server/identity';
import { finishRun } from '@/server/runs';

export const dynamic = 'force-dynamic';

const point = z.object({ x: z.number().int().min(0).max(49), y: z.number().int().min(0).max(49) });
const body = z.object({
  runId: z.string().uuid(),
  nonce: z.string().min(16).max(64),
  path: z.array(point).min(2).max(10_001),
  clientElapsedMs: z.number().int().min(0).max(86_400_000).optional(),
  clientMistakes: z.number().int().min(0).max(100_000).optional(),
});

export const POST = handle(async (req: Request) => {
  const input = await parseBody(req, body);
  const playerId = await currentPlayer();
  if (!playerId) throw fail(401, 'no_session', 'Start the run from this browser first.');
  return json(await finishRun(playerId, input));
});

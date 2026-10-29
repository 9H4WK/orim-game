import { z } from 'zod';
import { clientIp, handle, json, parseBody } from '@/server/http';
import { requirePlayer } from '@/server/identity';
import { sendChallengeInvite } from '@/server/sms';

export const dynamic = 'force-dynamic';

const body = z.object({
  token: z.string().min(16).max(64),
  phoneNumber: z.string().min(8).max(24),
  consent: z.literal(true),
});

export const POST = handle(async (req: Request) => {
  const input = await parseBody(req, body);
  const playerId = await requirePlayer();
  const result = await sendChallengeInvite(playerId, input, clientIp(req));
  return json(result, result.status === 'failed' ? 502 : 202);
});

import { z } from 'zod';
import { clientIp, fail, handle, json, parseBody } from '@/server/http';
import { currentPlayer } from '@/server/identity';
import { confirmPhoneCode, sendPhoneCode } from '@/server/rewards';

export const dynamic = 'force-dynamic';

const claimId = z.string().regex(/^\d{1,18}$/);
const body = z.discriminatedUnion('action', [
  z.object({ action: z.literal('send'), claimId, phoneNumber: z.string().min(8).max(24) }),
  z.object({ action: z.literal('confirm'), claimId, code: z.string().regex(/^\d{6}$/) }),
]);

export const POST = handle(async (req: Request) => {
  const input = await parseBody(req, body);
  const playerId = await currentPlayer();
  if (!playerId) throw fail(404, 'not_found', 'Claim not found.');
  if (input.action === 'send') return json(await sendPhoneCode(playerId, input.claimId, input.phoneNumber, clientIp(req)));
  return json(await confirmPhoneCode(playerId, input.claimId, input.code));
});

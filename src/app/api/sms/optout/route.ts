import { z } from 'zod';
import { clientIp, handle, json, parseBody } from '@/server/http';
import { optOut } from '@/server/sms';

export const dynamic = 'force-dynamic';

export const POST = handle(async (req: Request) => {
  const { phoneNumber } = await parseBody(req, z.object({ phoneNumber: z.string().min(8).max(24) }));
  await optOut(phoneNumber, 'web', clientIp(req));
  return json({ ok: true });
});

import { getEnv } from '@/server/env';
import { fail, handle, json } from '@/server/http';
import { applyAirtimeCallback, validateAirtimeRequest } from '@/server/rewards';
import { safeEqual } from '@/server/security';
import { applyInboundSms, applySmsDeliveryReport } from '@/server/sms';

export const dynamic = 'force-dynamic';

/**
 * Africa’s Talking callbacks. Africa’s Talking does not sign callbacks, so each callback URL
 * configured in the dashboard carries a long secret:
 *   {APP_BASE_URL}/api/webhooks/africastalking?type=sms-delivery&token=AT_WEBHOOK_SECRET
 *   …?type=sms-inbound   …?type=airtime-status   …?type=airtime-validation
 * Every handler is idempotent: duplicate or late notifications never undo a final state.
 */

async function readFields(req: Request): Promise<Record<string, string>> {
  const type = req.headers.get('content-type') ?? '';
  if (type.includes('application/json')) {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    return Object.fromEntries(Object.entries(body).map(([k, v]) => [k, String(v ?? '')]));
  }
  const text = await req.text();
  return Object.fromEntries(new URLSearchParams(text));
}

export const POST = handle(async (req: Request) => {
  const secret = getEnv().AT_WEBHOOK_SECRET;
  if (!secret) throw fail(503, 'webhooks_disabled', 'Callbacks are not configured.');
  const url = new URL(req.url);
  if (!safeEqual(url.searchParams.get('token') ?? '', secret)) throw fail(401, 'unauthorized', 'Not authorised.');

  const f = await readFields(req);
  switch (url.searchParams.get('type')) {
    case 'sms-delivery':
      return json(await applySmsDeliveryReport({ id: f.id, status: f.status, failureReason: f.failureReason }));
    case 'sms-inbound':
      return json(await applyInboundSms({ from: f.from, text: f.text }));
    case 'airtime-status':
      return json(await applyAirtimeCallback({ requestId: f.requestId, status: f.status }));
    case 'airtime-validation': {
      const ok = await validateAirtimeRequest({ phoneNumber: f.phoneNumber, amount: f.amount, currencyCode: f.currencyCode });
      return json({ status: ok ? 'Validated' : 'Failed' });
    }
    default:
      throw fail(400, 'unknown_type', 'Unknown callback type.');
  }
});

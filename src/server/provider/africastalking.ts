import 'server-only';
import type { ServerEnv } from '../env';
import {
  airtimeStateFrom,
  withTimeout,
  type AirtimeRequest,
  type AirtimeResult,
  type AirtimeStatus,
  type MessagingProvider,
  type SmsResult,
} from './types';

/**
 * Adapter over the official Africa’s Talking Node.js SDK (africastalking@0.8.x).
 * Shapes checked against the installed SDK source:
 *   SMS.send({ to, message, from? })  -> { SMSMessageData: { Message, Recipients: [{ statusCode, number, status, cost, messageId }] } }
 *   AIRTIME.send({ recipients: [{ phoneNumber, currencyCode, amount }], idempotencyKey })
 *                                      -> { errorMessage, numSent, responses: [{ phoneNumber, status, requestId, errorMessage }] }
 *   AIRTIME.findTransactionStatus(id)  -> { status, ... }
 * The SDK targets the sandbox host whenever the username is "sandbox".
 */

interface AtSmsRecipient { statusCode?: number; status?: string; messageId?: string }
interface AtSmsResponse { SMSMessageData?: { Message?: string; Recipients?: AtSmsRecipient[] } }
interface AtAirtimeEntry { status?: string; requestId?: string; errorMessage?: string }
interface AtAirtimeResponse { errorMessage?: string; numSent?: number; responses?: AtAirtimeEntry[] }

interface AtClient {
  SMS: { send(opts: { to: string[]; message: string; from?: string }): Promise<AtSmsResponse> };
  AIRTIME: {
    send(opts: { recipients: { phoneNumber: string; currencyCode: string; amount: number }[]; idempotencyKey?: string }): Promise<AtAirtimeResponse>;
    findTransactionStatus(id: string): Promise<Record<string, unknown>>;
  };
}

// 100 Processed, 101 Sent, 102 Queued: accepted for delivery, not yet delivered
const SMS_ACCEPTED = new Set([100, 101, 102]);

/** HTTP status from an axios-style error, when the provider answered at all */
function httpStatus(err: unknown): number | undefined {
  const e = err as { response?: { status?: number } };
  return typeof e?.response?.status === 'number' ? e.response.status : undefined;
}

/** A clear rejection (bad credentials, bad request) is a failure; silence or a 5xx is unknown */
function classify(err: unknown): 'failed' | 'unknown' {
  const s = httpStatus(err);
  return s !== undefined && s >= 400 && s < 500 ? 'failed' : 'unknown';
}

function describe(err: unknown): string {
  const s = httpStatus(err);
  if (s) return `HTTP ${s}`;
  return err instanceof Error ? err.name : 'error';
}

export async function createAfricasTalking(env: ServerEnv): Promise<MessagingProvider> {
  const mod = await import('africastalking');
  const factory = (mod.default ?? mod) as (o: { apiKey: string; username: string }) => AtClient;
  const at = factory({ apiKey: env.AT_API_KEY!, username: env.AT_USERNAME });
  const from = env.AT_SENDER_ID || undefined;

  return {
    name: 'africastalking',

    async sendSms(to, message): Promise<SmsResult> {
      try {
        const res = await withTimeout(at.SMS.send({ to: [to], message, ...(from ? { from } : {}) }));
        const r = res.SMSMessageData?.Recipients?.[0];
        if (!r) return { outcome: 'failed', providerStatus: res.SMSMessageData?.Message?.slice(0, 120) };
        if (r.statusCode !== undefined && SMS_ACCEPTED.has(r.statusCode)) {
          return { outcome: 'accepted', messageId: r.messageId, providerStatus: r.status };
        }
        return { outcome: 'failed', providerStatus: r.status, error: `status ${r.statusCode}` };
      } catch (err) {
        return { outcome: classify(err), error: describe(err) };
      }
    },

    async sendAirtime(req: AirtimeRequest): Promise<AirtimeResult> {
      try {
        const res = await withTimeout(at.AIRTIME.send({
          recipients: [{ phoneNumber: req.phoneNumber, currencyCode: req.currencyCode, amount: req.amount }],
          idempotencyKey: req.idempotencyKey,
        }));
        const r = res.responses?.[0];
        if (r?.status === 'Sent') return { outcome: 'accepted', requestId: r.requestId, providerStatus: r.status };
        if (r?.status === 'Failed') return { outcome: 'failed', requestId: r.requestId, providerStatus: r.status, error: r.errorMessage };
        // No per-recipient answer: only a definite top-level error counts as failed
        if (!r && res.numSent === 0 && res.errorMessage && res.errorMessage !== 'None') {
          return { outcome: 'failed', error: res.errorMessage.slice(0, 120) };
        }
        return { outcome: 'unknown', requestId: r?.requestId, providerStatus: r?.status };
      } catch (err) {
        return { outcome: classify(err), error: describe(err) };
      }
    },

    async findAirtimeStatus(requestId): Promise<AirtimeStatus> {
      try {
        const res = await withTimeout(at.AIRTIME.findTransactionStatus(requestId));
        const data = (res.data ?? res) as Record<string, unknown>;
        const status = String(data.status ?? res.status ?? '');
        return { state: airtimeStateFrom(status), providerStatus: status || undefined };
      } catch {
        return { state: 'unknown' };
      }
    },
  };
}

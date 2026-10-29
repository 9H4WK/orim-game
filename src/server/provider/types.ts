/**
 * What ORIM needs from a messaging provider, in ORIM's own words.
 * "accepted" means the provider took the request; it is never reported as "delivered"
 * or "received" until a delivery report or status check confirms it.
 */

export type SendOutcome = 'accepted' | 'failed' | 'unknown';

export interface SmsResult {
  outcome: SendOutcome;
  messageId?: string;
  providerStatus?: string;
  error?: string;
}

export interface AirtimeRequest {
  phoneNumber: string;
  currencyCode: string;
  amount: number;
  idempotencyKey: string;
}

export interface AirtimeResult {
  outcome: SendOutcome;
  requestId?: string;
  providerStatus?: string;
  error?: string;
}

export type AirtimeFinalState = 'succeeded' | 'failed' | 'pending' | 'unknown';

export interface AirtimeStatus {
  state: AirtimeFinalState;
  providerStatus?: string;
}

export interface MessagingProvider {
  readonly name: 'africastalking' | 'mock';
  sendSms(to: string, message: string): Promise<SmsResult>;
  sendAirtime(req: AirtimeRequest): Promise<AirtimeResult>;
  findAirtimeStatus(requestId: string): Promise<AirtimeStatus>;
}

/** Provider calls never block longer than this; a timeout is an unknown outcome, not a failure */
export const PROVIDER_TIMEOUT_MS = 15_000;

export class ProviderTimeout extends Error {
  constructor() { super('Provider request timed out'); this.name = 'ProviderTimeout'; }
}

export function withTimeout<T>(p: Promise<T>, ms = PROVIDER_TIMEOUT_MS): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  return Promise.race([
    p.finally(() => clearTimeout(timer)),
    new Promise<T>((_, reject) => { timer = setTimeout(() => reject(new ProviderTimeout()), ms); }),
  ]);
}

/** Map a provider final status word (callback or status query) onto ORIM's states */
export function airtimeStateFrom(status: string | undefined): AirtimeFinalState {
  const s = (status ?? '').toLowerCase();
  if (s === 'success') return 'succeeded';
  if (s === 'failed') return 'failed';
  if (s === 'sent' || s === 'queued' || s === 'pending' || s === 'submitted') return 'pending';
  return 'unknown';
}

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getEnv, payoutsEnabled, resetEnvForTests } from '@/server/env';

const sms = vi.fn();
const airtime = vi.fn();
const findStatus = vi.fn();
const factory = vi.fn(() => ({ SMS: { send: sms }, AIRTIME: { send: airtime, findTransactionStatus: findStatus } }));
vi.mock('africastalking', () => ({ default: factory }));

const { createAfricasTalking } = await import('@/server/provider/africastalking');

function atEnv(extra: Record<string, string> = {}) {
  resetEnvForTests();
  Object.assign(process.env, { AT_PROVIDER: 'africastalking', AT_API_KEY: 'atsk_test', AT_USERNAME: 'sandbox', AT_ENVIRONMENT: 'sandbox', ...extra });
  return getEnv();
}

beforeEach(() => {
  vi.clearAllMocks();
  for (const k of ['AT_SENDER_ID', 'ENABLE_AIRTIME_PAYOUTS', 'AIRTIME_LIVE_APPROVED']) delete process.env[k];
});

describe('Africa’s Talking adapter', () => {
  it('sends SMS in the SDK’s documented shape and treats 101 as accepted, not delivered', async () => {
    const at = await createAfricasTalking(atEnv({ AT_SENDER_ID: 'ORIM' }));
    sms.mockResolvedValue({ SMSMessageData: { Message: 'Sent to 1/1', Recipients: [{ statusCode: 101, status: 'Success', messageId: 'ATXid_1', number: '+254711222333' }] } });
    expect(await at.sendSms('+254711222333', 'hi')).toEqual({ outcome: 'accepted', messageId: 'ATXid_1', providerStatus: 'Success' });
    expect(factory).toHaveBeenCalledWith({ apiKey: 'atsk_test', username: 'sandbox' });
    expect(sms).toHaveBeenCalledWith({ to: ['+254711222333'], message: 'hi', from: 'ORIM' });
  });

  it('classifies SMS failures', async () => {
    const at = await createAfricasTalking(atEnv());
    sms.mockResolvedValueOnce({ SMSMessageData: { Recipients: [{ statusCode: 403, status: 'InvalidPhoneNumber' }] } });
    expect((await at.sendSms('+254711222333', 'x')).outcome).toBe('failed');
    sms.mockRejectedValueOnce(Object.assign(new Error('401'), { response: { status: 401 } }));
    expect((await at.sendSms('+254711222333', 'x')).outcome).toBe('failed');
    sms.mockRejectedValueOnce(new Error('socket hang up'));
    expect((await at.sendSms('+254711222333', 'x')).outcome).toBe('unknown');
  });

  it('sends airtime with recipient fields and an idempotency key', async () => {
    const at = await createAfricasTalking(atEnv());
    airtime.mockResolvedValue({ errorMessage: 'None', numSent: 1, responses: [{ phoneNumber: '+254711222333', status: 'Sent', requestId: 'ATQid_9', errorMessage: 'None' }] });
    const res = await at.sendAirtime({ phoneNumber: '+254711222333', currencyCode: 'KES', amount: 50, idempotencyKey: 'orim-claim-7' });
    expect(res).toEqual({ outcome: 'accepted', requestId: 'ATQid_9', providerStatus: 'Sent' });
    expect(airtime).toHaveBeenCalledWith({ recipients: [{ phoneNumber: '+254711222333', currencyCode: 'KES', amount: 50 }], idempotencyKey: 'orim-claim-7' });
  });

  it('never calls an ambiguous airtime answer a failure', async () => {
    const at = await createAfricasTalking(atEnv());
    airtime.mockResolvedValueOnce({ responses: [{ status: 'Failed', errorMessage: 'Insufficient balance', requestId: 'r' }] });
    expect((await at.sendAirtime({ phoneNumber: '+254711222333', currencyCode: 'KES', amount: 50, idempotencyKey: 'k' })).outcome).toBe('failed');
    airtime.mockRejectedValueOnce(Object.assign(new Error('502'), { response: { status: 502 } }));
    expect((await at.sendAirtime({ phoneNumber: '+254711222333', currencyCode: 'KES', amount: 50, idempotencyKey: 'k' })).outcome).toBe('unknown');
    airtime.mockResolvedValueOnce({ responses: [] });
    expect((await at.sendAirtime({ phoneNumber: '+254711222333', currencyCode: 'KES', amount: 50, idempotencyKey: 'k' })).outcome).toBe('unknown');
  });

  it('maps transaction status lookups', async () => {
    const at = await createAfricasTalking(atEnv());
    findStatus.mockResolvedValueOnce({ status: 'Success' });
    expect((await at.findAirtimeStatus('r')).state).toBe('succeeded');
    findStatus.mockResolvedValueOnce({ data: { status: 'Failed' } });
    expect((await at.findAirtimeStatus('r')).state).toBe('failed');
    findStatus.mockRejectedValueOnce(new Error('timeout'));
    expect((await at.findAirtimeStatus('r')).state).toBe('unknown');
  });
});

describe('configuration', () => {
  it('sandbox mode requires the sandbox username, and live mode a real one', () => {
    expect(() => atEnv({ AT_USERNAME: 'orim' })).toThrow(/AT_USERNAME/);
    expect(() => atEnv({ AT_ENVIRONMENT: 'production', AT_USERNAME: 'sandbox' })).toThrow(/AT_USERNAME/);
    atEnv();
  });

  it('error messages name settings but never echo secret values', () => {
    try {
      atEnv({ AT_USERNAME: 'orim', AT_API_KEY: 'atsk_super_secret_value' });
    } catch (e) {
      expect(String(e)).not.toContain('atsk_super_secret_value');
    }
    atEnv();
  });

  it('blank settings in .env count as unset', () => {
    const env = atEnv({ ADMIN_TOKEN: '', AT_WEBHOOK_SECRET: '', AT_SENDER_ID: '', DATABASE_URL: '' });
    expect(env.ADMIN_TOKEN).toBeUndefined();
    expect(env.AT_WEBHOOK_SECRET).toBeUndefined();
    for (const k of ['ADMIN_TOKEN', 'AT_WEBHOOK_SECRET', 'DATABASE_URL']) delete process.env[k];
  });

  it('payouts default to off', () => {
    expect(payoutsEnabled(atEnv()).ok).toBe(false);
    expect(payoutsEnabled(atEnv({ ENABLE_AIRTIME_PAYOUTS: 'true' })).ok).toBe(true);
    expect(payoutsEnabled(atEnv({ ENABLE_AIRTIME_PAYOUTS: 'true', AT_ENVIRONMENT: 'production', AT_USERNAME: 'orim' })).ok).toBe(false);
    resetEnvForTests();
    Object.assign(process.env, { AT_ENVIRONMENT: 'sandbox', AT_USERNAME: 'sandbox', AT_PROVIDER: 'mock' });
  });
});

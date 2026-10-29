import { randomUUID } from 'node:crypto';
import type { AirtimeRequest, AirtimeStatus, MessagingProvider, SmsResult, AirtimeResult } from './types';

/**
 * Stand-in provider for local development and tests. Sends nothing and costs nothing.
 * Scripted numbers exercise every branch:
 *   SMS:     ending 0000 -> failed    ending 9999 -> unknown (simulated timeout)
 *   Airtime: ending 0001 -> failed    ending 0002 -> unknown (simulated timeout)
 */

export interface MockRecord { kind: 'sms' | 'airtime'; to: string; body: string; id: string }

export const mockOutbox: MockRecord[] = [];
const airtimeStates = new Map<string, AirtimeStatus>();

/** Tests can decide what a later status check reports */
export function setMockAirtimeStatus(requestId: string, status: AirtimeStatus) {
  airtimeStates.set(requestId, status);
}

export function resetMock() {
  mockOutbox.length = 0;
  airtimeStates.clear();
}

export function createMockProvider(): MessagingProvider {
  return {
    name: 'mock',

    async sendSms(to, message): Promise<SmsResult> {
      if (to.endsWith('0000')) return { outcome: 'failed', providerStatus: 'InvalidPhoneNumber' };
      if (to.endsWith('9999')) return { outcome: 'unknown', error: 'ProviderTimeout' };
      const id = `mock-sms-${randomUUID()}`;
      mockOutbox.push({ kind: 'sms', to, body: message, id });
      // Only on a developer's machine: lets you read a verification code without a phone
      if (process.env.NODE_ENV === 'development') {
        console.info(`[orim mock sms] to …${to.slice(-3)}: ${message}`);
      }
      return { outcome: 'accepted', messageId: id, providerStatus: 'Success' };
    },

    async sendAirtime(req: AirtimeRequest): Promise<AirtimeResult> {
      if (req.phoneNumber.endsWith('0001')) return { outcome: 'failed', providerStatus: 'Failed', error: 'Invalid phone number' };
      if (req.phoneNumber.endsWith('0002')) return { outcome: 'unknown', error: 'ProviderTimeout' };
      const id = `mock-at-${randomUUID()}`;
      mockOutbox.push({ kind: 'airtime', to: req.phoneNumber, body: `${req.currencyCode} ${req.amount}`, id });
      return { outcome: 'accepted', requestId: id, providerStatus: 'Sent' };
    },

    async findAirtimeStatus(requestId): Promise<AirtimeStatus> {
      return airtimeStates.get(requestId) ?? { state: 'succeeded', providerStatus: 'Success' };
    },
  };
}

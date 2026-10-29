import 'server-only';
import { getEnv } from '../env';
import { createMockProvider } from './mock';
import type { MessagingProvider } from './types';

let provider: Promise<MessagingProvider> | null = null;

/** Africa’s Talking when credentials are configured, otherwise the clearly marked mock */
export function getProvider(): Promise<MessagingProvider> {
  if (!provider) {
    const env = getEnv();
    provider = env.provider === 'africastalking'
      ? import('./africastalking').then(m => m.createAfricasTalking(env))
      : Promise.resolve(createMockProvider());
    provider.catch(() => { provider = null; });
  }
  return provider;
}

export function resetProviderForTests() {
  provider = null;
}

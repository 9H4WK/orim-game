import 'server-only';
import { z } from 'zod';

/**
 * Server configuration, validated once per process.
 * Nothing here is exposed to the browser: none of these names use NEXT_PUBLIC_.
 */

const bool = z
  .enum(['true', 'false', '1', '0', ''])
  .optional()
  .transform(v => v === 'true' || v === '1');

const int = (fallback: number) =>
  z.coerce.number().int().positive().optional().transform(v => v ?? fallback);

const schema = z
  .object({
    NODE_ENV: z.string().optional(),
    APP_BASE_URL: z.string().url().default('http://localhost:3000'),

    // One long random string; separate keys for cookies, phone hashing and encryption are derived from it
    ORIM_SECRET: z.string().min(32).optional(),

    // Postgres connection string. Without one, an embedded Postgres (PGlite) is used:
    // in-memory for tests, or persisted under ORIM_DATA_DIR (e.g. a Docker volume)
    DATABASE_URL: z.string().optional(),
    ORIM_DATA_DIR: z.string().optional(),
    ORIM_DB: z.enum(['memory', 'postgres', 'embedded']).optional(),

    AT_PROVIDER: z.enum(['africastalking', 'mock']).optional(),
    AT_USERNAME: z.string().default('sandbox'),
    AT_API_KEY: z.string().optional(),
    AT_SENDER_ID: z.string().optional(),
    AT_ENVIRONMENT: z.enum(['sandbox', 'production']).default('sandbox'),

    ENABLE_SMS_CHALLENGES: bool,
    ENABLE_AIRTIME_PAYOUTS: bool,
    // Second key for real money: payouts against the production API also need this
    AIRTIME_LIVE_APPROVED: bool,

    SMS_ALLOWED_COUNTRIES: z.string().default('KE'),
    SMS_DAILY_LIMIT: int(200),
    AIRTIME_DAILY_LIMIT: int(2000),

    ADMIN_TOKEN: z.string().min(24).optional(),
    AT_WEBHOOK_SECRET: z.string().min(16).optional(),
  })
  .superRefine((env, ctx) => {
    const sandboxUser = env.AT_USERNAME.toLowerCase() === 'sandbox';
    // The SDK picks the sandbox host from the username, so the two settings must agree
    if (env.AT_ENVIRONMENT === 'sandbox' && !sandboxUser) {
      ctx.addIssue({ code: 'custom', path: ['AT_USERNAME'], message: 'AT_ENVIRONMENT=sandbox requires AT_USERNAME=sandbox' });
    }
    if (env.AT_ENVIRONMENT === 'production' && sandboxUser) {
      ctx.addIssue({ code: 'custom', path: ['AT_USERNAME'], message: 'AT_ENVIRONMENT=production needs your live app username' });
    }
    if (env.AT_PROVIDER === 'africastalking' && !env.AT_API_KEY) {
      ctx.addIssue({ code: 'custom', path: ['AT_API_KEY'], message: 'AT_API_KEY is required for the Africa’s Talking provider' });
    }
    if (env.NODE_ENV === 'production' && !env.ORIM_SECRET && process.env.NEXT_PHASE !== 'phase-production-build') {
      ctx.addIssue({ code: 'custom', path: ['ORIM_SECRET'], message: 'ORIM_SECRET is required in production' });
    }
  });

export type ServerEnv = z.infer<typeof schema> & {
  provider: 'africastalking' | 'mock';
  secret: string;
  smsCountries: string[];
};

let cached: ServerEnv | null = null;

const DEV_SECRET = 'orim-dev-only-secret-do-not-use-in-production';

export function getEnv(): ServerEnv {
  if (cached) return cached;
  // A blank line like `ADMIN_TOKEN=` in .env means "not set", not "set to an empty string"
  const present = Object.fromEntries(Object.entries(process.env).filter(([, v]) => v !== undefined && v.trim() !== ''));
  const parsed = schema.safeParse(present);
  if (!parsed.success) {
    // Only names and reasons; never values
    const issues = parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`Invalid server configuration: ${issues}`);
  }
  const env = parsed.data;
  cached = {
    ...env,
    provider: env.AT_PROVIDER ?? (env.AT_API_KEY ? 'africastalking' : 'mock'),
    secret: env.ORIM_SECRET ?? DEV_SECRET,
    smsCountries: env.SMS_ALLOWED_COUNTRIES.split(',').map(s => s.trim().toUpperCase()).filter(Boolean),
  };
  return cached;
}

/** Tests change process.env between cases */
export function resetEnvForTests() {
  cached = null;
}

/** Airtime may leave the building only when every switch agrees */
export function payoutsEnabled(env = getEnv()): { ok: true } | { ok: false; reason: string } {
  if (!env.ENABLE_AIRTIME_PAYOUTS) return { ok: false, reason: 'Airtime payouts are switched off (ENABLE_AIRTIME_PAYOUTS).' };
  if (env.provider === 'africastalking' && env.AT_ENVIRONMENT === 'production' && !env.AIRTIME_LIVE_APPROVED) {
    return { ok: false, reason: 'Live airtime needs explicit approval (AIRTIME_LIVE_APPROVED).' };
  }
  return { ok: true };
}

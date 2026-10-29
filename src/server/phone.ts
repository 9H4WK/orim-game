import 'server-only';
import { hmac } from './security';

/** Countries Africa’s Talking serves for SMS and airtime, with their dialling codes and airtime currency */
export const COUNTRIES: Record<string, { dial: string; currency: string; name: string }> = {
  KE: { dial: '254', currency: 'KES', name: 'Kenya' },
  UG: { dial: '256', currency: 'UGX', name: 'Uganda' },
  TZ: { dial: '255', currency: 'TZS', name: 'Tanzania' },
  RW: { dial: '250', currency: 'RWF', name: 'Rwanda' },
  NG: { dial: '234', currency: 'NGN', name: 'Nigeria' },
  MW: { dial: '265', currency: 'MWK', name: 'Malawi' },
  ZM: { dial: '260', currency: 'ZMW', name: 'Zambia' },
  ZA: { dial: '27', currency: 'ZAR', name: 'South Africa' },
};

const E164 = /^\+[1-9]\d{7,14}$/;

/** Accepts "+254 712 345 678" style input; returns strict E.164 or null */
export function normalizeE164(raw: string): string | null {
  if (typeof raw !== 'string') return null;
  const compact = raw.replace(/[\s\-().]/g, '');
  return E164.test(compact) ? compact : null;
}

/** Also accepts a local number ("0712 345 678") when there is one obvious home country */
export function normalizePhone(raw: string, homeCountry?: string): string | null {
  const strict = normalizeE164(raw);
  if (strict || !homeCountry || typeof raw !== 'string') return strict;
  const compact = raw.replace(/[\s\-().]/g, '');
  const c = COUNTRIES[homeCountry];
  return c && /^0\d{8,10}$/.test(compact) ? normalizeE164(`+${c.dial}${compact.slice(1)}`) : null;
}

export function countryOf(e164: string): string | null {
  const digits = e164.slice(1);
  // Longest dialling code first so +27 never shadows a longer code
  const entries = Object.entries(COUNTRIES).sort((a, b) => b[1].dial.length - a[1].dial.length);
  for (const [code, c] of entries) if (digits.startsWith(c.dial)) return code;
  return null;
}

export function hashPhone(e164: string): string {
  return hmac('phone', e164);
}

/** "+254•••••678": enough for a person to recognise their own number, no more */
export function maskPhone(e164: string): string {
  return `${e164.slice(0, 4)}${'•'.repeat(Math.max(0, e164.length - 7))}${e164.slice(-3)}`;
}

import 'server-only';
import { audit } from './audit';
import { findChallenge } from './challenges';
import { getDb } from './db';
import { getEnv } from './env';
import { fail } from './http';
import { countryOf, hashPhone, maskPhone, normalizePhone } from './phone';
import { formatMs } from '@/lib/online/ranking';
import { getProvider } from './provider';
import { consumeAll, DAY, HOUR } from './ratelimit';
import { hashIp } from './security';

/**
 * SMS challenge invitations.
 * Only the challenge's creator can text it, only after playing it themselves, only to a
 * number they confirm has agreed to receive it, and never to a number that opted out.
 * Everything else falls back to copying or sharing the link.
 */

export const CONSENT_BASIS = 'sender_confirmed_recipient_agreed';

/**
 * The text a friend receives: who set what time, the link, and how to stop.
 * Plain ASCII keeps it in the GSM-7 alphabet: one 160-character SMS, not 70-character parts.
 */
export function inviteMessage(token: string, bestMs: number): string {
  const base = getEnv().APP_BASE_URL.replace(/\/$/, '');
  return `ORIM: A friend escaped a maze in ${formatMs(bestMs)}. Can you beat it? Play: ${base}/c/${token} Stop texts: ${base}/stop`;
}

/** With a single allowed country, local numbers like 0712345678 are read as that country's */
const homeCountry = (countries: string[]) => (countries.length === 1 ? countries[0] : undefined);

export async function sendChallengeInvite(
  playerId: string,
  input: { token: string; phoneNumber: string; consent: boolean },
  ip: string,
) {
  const env = getEnv();
  if (!env.ENABLE_SMS_CHALLENGES) throw fail(503, 'sms_disabled', 'Texting challenges is switched off. Copy or share the link instead.');
  if (input.consent !== true) throw fail(400, 'consent_required', 'Confirm your friend has agreed to get a text from ORIM.');

  const phone = normalizePhone(input.phoneNumber, homeCountry(env.smsCountries));
  if (!phone) throw fail(400, 'invalid_phone', 'Enter your friend’s number, like 0712345678 or +254712345678.');
  const country = countryOf(phone);
  if (!country || !env.smsCountries.includes(country)) {
    throw fail(400, 'unsupported_country', 'ORIM can only text numbers in supported countries. Share the link instead.');
  }

  const recipientHash = hashPhone(phone);
  const masked = maskPhone(phone);
  const db = await getDb();

  const invitation = await db.tx(async q => {
    const challenge = await findChallenge(q, input.token);
    if (challenge.creator_id !== playerId) throw fail(403, 'not_creator', 'Only the player who made this challenge can text it.');

    // The text quotes the sender's best verified time, so there must be one
    const [best] = await q.query<{ ms: number | null }>(
      `select min(duration_ms) as ms from runs where challenge_id = $1 and player_id = $2 and status = 'verified'`,
      [challenge.id, playerId],
    );
    if (best?.ms == null) throw fail(409, 'play_first', 'Play the maze first, so your friend has a time to beat.');

    const [optedOut] = await q.query('select 1 from sms_optouts where phone_hash = $1', [recipientHash]);
    if (optedOut) throw fail(409, 'opted_out', 'That number has asked not to get texts from ORIM. Share the link another way.');

    const [dupe] = await q.query('select 1 from sms_invitations where challenge_id = $1 and recipient_hash = $2', [challenge.id, recipientHash]);
    if (dupe) throw fail(409, 'already_invited', 'That number already has this challenge.');

    const blocked = await consumeAll(q, [
      { bucket: `sms:player:h:${playerId}`, limit: 5, windowSec: HOUR },
      { bucket: `sms:player:d:${playerId}`, limit: 15, windowSec: DAY },
      { bucket: `sms:recipient:${recipientHash}`, limit: 2, windowSec: DAY },
      { bucket: `sms:ip:${hashIp(ip)}`, limit: 10, windowSec: HOUR },
      { bucket: 'sms:global', limit: env.SMS_DAILY_LIMIT, windowSec: DAY },
    ]);
    if (blocked) {
      throw fail(429, 'rate_limited', blocked.bucket === 'sms:global'
        ? 'ORIM has sent all the texts it can today. Share the link instead.'
        : 'You have sent a lot of texts. Share the link instead, or try later.');
    }

    const [row] = await q.query<{ id: string }>(
      `insert into sms_invitations (challenge_id, sender_id, recipient_hash, recipient_masked, consent_basis, consent_at, status)
       values ($1, $2, $3, $4, $5, now(), 'requested') returning id`,
      [challenge.id, playerId, recipientHash, masked, CONSENT_BASIS],
    );
    return { id: row.id, challengeId: challenge.id, bestMs: Number(best.ms) };
  });

  // The provider call happens outside the transaction so a slow network holds no locks
  const provider = await getProvider();
  const result = await provider.sendSms(phone, inviteMessage(input.token, invitation.bestMs));
  await db.tx(async q => {
    await q.query(
      `update sms_invitations set status = $2, provider_message_id = $3, provider_status = $4, failure_reason = $5, updated_at = now()
        where id = $1`,
      [invitation.id, result.outcome, result.messageId ?? null, result.providerStatus ?? null, result.error ?? null],
    );
    await audit(q, `player:${playerId}`, 'sms.invite', `challenge:${invitation.challengeId}`, { outcome: result.outcome, provider: provider.name });
  });

  return { status: result.outcome, recipient: masked };
}

export async function listInvitations(token: string, playerId: string) {
  const db = await getDb();
  const challenge = await findChallenge(db, token, { allowExpired: true });
  if (challenge.creator_id !== playerId) return [];
  const rows = await db.query<{ recipient_masked: string; status: string; created_at: Date }>(
    'select recipient_masked, status, created_at from sms_invitations where challenge_id = $1 order by created_at desc limit 20',
    [challenge.id],
  );
  return rows.map(r => ({ recipient: r.recipient_masked, status: r.status, sentAt: new Date(r.created_at).toISOString() }));
}

export async function optOut(rawPhone: string, source: 'web' | 'sms_reply', ip?: string) {
  const phone = normalizePhone(rawPhone, homeCountry(getEnv().smsCountries));
  if (!phone) throw fail(400, 'invalid_phone', 'Enter the number, like 0712345678 or +254712345678.');
  const db = await getDb();
  await db.tx(async q => {
    if (ip) {
      const blocked = await consumeAll(q, [{ bucket: `optout:ip:${hashIp(ip)}`, limit: 10, windowSec: HOUR }]);
      if (blocked) throw fail(429, 'rate_limited', 'Too many requests. Try again later.');
    }
    await q.query('insert into sms_optouts (phone_hash, source) values ($1, $2) on conflict (phone_hash) do nothing', [hashPhone(phone), source]);
  });
}

/**
 * Africa’s Talking delivery report. Statuses: Sent, Submitted, Buffered (still travelling),
 * Success (delivered), Failed, Rejected. Duplicates and late reports never undo a final state.
 */
export async function applySmsDeliveryReport(report: { id?: string; status?: string; failureReason?: string }) {
  if (!report.id || !report.status) return { applied: false };
  const s = report.status.toLowerCase();
  const next = s === 'success' ? 'delivered' : s === 'failed' || s === 'rejected' ? 'failed' : null;
  if (!next) return { applied: false };
  const db = await getDb();
  const rows = await db.query(
    `update sms_invitations set status = $2, provider_status = $3, failure_reason = $4, updated_at = now()
      where provider_message_id = $1 and status not in ('delivered', 'failed') returning id`,
    [report.id, next, report.status, report.failureReason?.slice(0, 120) ?? null],
  );
  return { applied: rows.length > 0 };
}

/** Replies of STOP to a two-way short code opt the sender out */
export async function applyInboundSms(msg: { from?: string; text?: string }) {
  if (!msg.from || !/^\s*(stop|unsubscribe|cancel|end|quit)\b/i.test(msg.text ?? '')) return { optedOut: false };
  await optOut(msg.from, 'sms_reply');
  return { optedOut: true };
}

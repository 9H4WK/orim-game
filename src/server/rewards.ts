import 'server-only';
import { audit } from './audit';
import { getDb, type Queryable } from './db';
import { getEnv, payoutsEnabled } from './env';
import { fail } from './http';
import { countryOf, hashPhone, maskPhone, normalizeE164 } from './phone';
import { getProvider } from './provider';
import { airtimeStateFrom, type AirtimeFinalState, type AirtimeResult } from './provider/types';
import { consumeAll, DAY, HOUR } from './ratelimit';
import { decrypt, encrypt, hashIp, hmac, randomOtp, safeEqual } from './security';

/**
 * Airtime rewards.
 *
 *   pending          eligible claim exists; nothing authorised
 *   approved         an administrator approved this exact, budgeted amount
 *   processing       one durable provider request is in flight (or awaiting confirmation)
 *   succeeded        the provider confirmed completion, not merely acceptance
 *   failed           definitive failure, with evidence
 *   review_required  timeout, ambiguity or mismatch; a person must reconcile it
 *
 * Amounts, phone numbers and eligibility come only from server records, never from a request body.
 * Each claim can have at most one payout (unique claim_id) with its own idempotency key,
 * and an uncertain payout is never retried automatically.
 */

const OTP_TTL_MINUTES = 10;
const OTP_MAX_ATTEMPTS = 5;
/** A request that never reached the provider (crash mid-flight) is escalated after this long */
const STUCK_AFTER_MINUTES = 10;

interface ClaimRow {
  id: string;
  competition_id: string;
  player_id: string;
  rank: number;
  amount: string;
  currency_code: string;
  country_code: string;
  status: string;
  phone_hash: string | null;
  phone_encrypted: string | null;
  phone_masked: string | null;
  phone_verified_at: Date | null;
  otp_hash: string | null;
  otp_phone_hash: string | null;
  otp_phone_encrypted: string | null;
  otp_expires_at: Date | null;
  otp_attempts: number;
  risk_flags: string[];
}

interface PayoutRow {
  id: string;
  claim_id: string;
  status: string;
  provider_request_id: string | null;
  provider_status: string | null;
  created_at: Date;
}

const isUniqueViolation = (err: unknown) => (err as { code?: string })?.code === '23505';

async function lockClaim(q: Queryable, claimId: string): Promise<ClaimRow> {
  const [claim] = await q.query<ClaimRow>('select * from reward_claims where id = $1 for update', [claimId]);
  if (!claim) throw fail(404, 'not_found', 'Claim not found.');
  return claim;
}

async function playerClaim(q: Queryable, playerId: string, claimId: string): Promise<ClaimRow> {
  if (!/^\d{1,18}$/.test(claimId)) throw fail(404, 'not_found', 'Claim not found.');
  const claim = await lockClaim(q, claimId);
  if (claim.player_id !== playerId) throw fail(404, 'not_found', 'Claim not found.');
  return claim;
}

export function claimView(c: Pick<ClaimRow, 'id' | 'status' | 'amount' | 'currency_code' | 'phone_masked' | 'phone_verified_at'>) {
  // bigserial arrives as a number from PGlite and a string from pg; the API always speaks strings
  return { id: String(c.id), status: c.status, amount: Number(c.amount), currency: c.currency_code, phone: c.phone_masked, phoneVerified: !!c.phone_verified_at };
}

// ── Player side ─────────────────────────────────────────────

export async function createClaim(playerId: string, competitionId: string) {
  const db = await getDb();
  return db.tx(async q => {
    const [c] = await q.query<{ status: string; claim_deadline: Date; currency_code: string; country_code: string }>(
      'select status, claim_deadline, currency_code, country_code from competitions where id = $1', [competitionId]);
    if (!c) throw fail(404, 'not_found', 'That competition does not exist.');
    if (c.status !== 'finalized') throw fail(409, 'not_final', 'Prizes can be claimed once results are final.');
    if (new Date(c.claim_deadline).getTime() < Date.now()) throw fail(410, 'deadline_passed', 'The claim deadline has passed.');

    const [result] = await q.query<{ rank: number; prize_amount: string; risk_flags: string[] }>(
      'select rank, prize_amount, risk_flags from competition_results where competition_id = $1 and player_id = $2',
      [competitionId, playerId]);
    if (!result || Number(result.prize_amount) <= 0) throw fail(403, 'not_eligible', 'This result did not win a prize.');

    const [created] = await q.query<ClaimRow>(
      `insert into reward_claims (competition_id, player_id, rank, amount, currency_code, country_code, status, risk_flags)
       values ($1, $2, $3, $4, $5, $6, 'pending', $7)
       on conflict (competition_id, player_id) do nothing returning *`,
      [competitionId, playerId, result.rank, result.prize_amount, c.currency_code, c.country_code, result.risk_flags],
    );
    if (created) {
      await audit(q, `player:${playerId}`, 'claim.create', `claim:${created.id}`, { competitionId, rank: result.rank });
      return claimView(created);
    }
    const [existing] = await q.query<ClaimRow>('select * from reward_claims where competition_id = $1 and player_id = $2', [competitionId, playerId]);
    return claimView(existing);
  });
}

/** Step 1 of phone ownership: text a one-time code to the number the winner gives */
export async function sendPhoneCode(playerId: string, claimId: string, rawPhone: string, ip: string) {
  const phone = normalizeE164(rawPhone);
  if (!phone) throw fail(400, 'invalid_phone', 'Enter the number in international format, like +254712345678.');
  const code = randomOtp();
  const db = await getDb();

  await db.tx(async q => {
    const claim = await playerClaim(q, playerId, claimId);
    if (claim.status !== 'pending' || claim.phone_verified_at) throw fail(409, 'already_verified', 'This claim already has a verified number.');
    if (countryOf(phone) !== claim.country_code) throw fail(400, 'wrong_country', 'This prize can only be sent to a number in the competition’s country.');

    const blocked = await consumeAll(q, [
      { bucket: `otp:claim:${claimId}`, limit: 3, windowSec: HOUR },
      { bucket: `otp:phone:${hashPhone(phone)}`, limit: 5, windowSec: DAY },
      { bucket: `otp:ip:${hashIp(ip)}`, limit: 10, windowSec: HOUR },
    ]);
    if (blocked) throw fail(429, 'rate_limited', 'Too many codes requested. Try again in an hour.');

    await q.query(
      `update reward_claims set otp_hash = $2, otp_phone_hash = $3, otp_phone_encrypted = $4,
              otp_expires_at = now() + make_interval(mins => $5), otp_attempts = 0, updated_at = now()
        where id = $1`,
      [claimId, hmac('otp', `${claimId}:${code}`), hashPhone(phone), encrypt(phone), OTP_TTL_MINUTES],
    );
  });

  const provider = await getProvider();
  const sent = await provider.sendSms(phone, `ORIM: your prize verification code is ${code}. It expires in ${OTP_TTL_MINUTES} minutes. Never share it.`);
  if (sent.outcome === 'failed') throw fail(502, 'sms_failed', 'We could not text that number. Check it and try again.');
  return { sentTo: maskPhone(phone) };
}

/** Step 2: the code proves the winner holds that phone; only then can a payout be approved */
export async function confirmPhoneCode(playerId: string, claimId: string, code: string) {
  const db = await getDb();
  const outcome = await db.tx(async q => {
    const claim = await playerClaim(q, playerId, claimId);
    if (claim.phone_verified_at) return { ok: true as const, claim };
    if (!claim.otp_hash || !claim.otp_expires_at || new Date(claim.otp_expires_at).getTime() < Date.now()) {
      throw fail(410, 'code_expired', 'That code has expired. Ask for a new one.');
    }
    if (claim.otp_attempts >= OTP_MAX_ATTEMPTS) throw fail(429, 'too_many_attempts', 'Too many wrong codes. Ask for a new one.');
    if (!/^\d{6}$/.test(code) || !safeEqual(claim.otp_hash, hmac('otp', `${claimId}:${code}`))) {
      await q.query('update reward_claims set otp_attempts = otp_attempts + 1 where id = $1', [claimId]);
      return { ok: false as const };
    }
    const phone = decrypt(claim.otp_phone_encrypted!);
    const [updated] = await q.query<ClaimRow>(
      `update reward_claims set phone_hash = otp_phone_hash, phone_encrypted = otp_phone_encrypted, phone_masked = $2,
              phone_verified_at = now(), otp_hash = null, otp_phone_hash = null, otp_phone_encrypted = null,
              otp_expires_at = null, updated_at = now()
        where id = $1 returning *`,
      [claimId, maskPhone(phone)],
    );
    await audit(q, `player:${playerId}`, 'claim.phone_verified', `claim:${claimId}`, {});
    return { ok: true as const, claim: updated };
  }).catch(err => {
    if (isUniqueViolation(err)) throw fail(409, 'phone_in_use', 'That number has already claimed a prize in this competition.');
    throw err;
  });
  // Count the wrong attempt (committed above) before reporting it
  if (!outcome.ok) throw fail(400, 'wrong_code', 'That code is not right.');
  return claimView(outcome.claim);
}

// ── Administrator side ──────────────────────────────────────

export async function listClaims(status?: string) {
  const db = await getDb();
  const rows = await db.query<ClaimRow & { payout_status: string | null; provider_request_id: string | null }>(
    `select c.*, p.status as payout_status, p.provider_request_id
       from reward_claims c left join payouts p on p.claim_id = c.id
      ${status ? 'where c.status = $1' : ''}
      order by c.created_at desc limit 200`,
    status ? [status] : [],
  );
  return rows.map(r => ({
    ...claimView(r),
    competitionId: r.competition_id,
    rank: r.rank,
    riskFlags: r.risk_flags,
    payout: r.payout_status ? { status: r.payout_status, providerRequestId: r.provider_request_id } : null,
  }));
}

export async function approveClaim(actor: string, claimId: string, opts: { acknowledgeRisk?: boolean } = {}) {
  const env = getEnv();
  const db = await getDb();
  return db.tx(async q => {
    const [ref] = await q.query<{ competition_id: string }>('select competition_id from reward_claims where id = $1', [claimId]);
    if (!ref) throw fail(404, 'not_found', 'Claim not found.');
    const competition_id = ref.competition_id;
    // Lock order: competition, then daily ledger, then claim. Serialises every budget decision.
    const [comp] = await q.query<{ budget: string; status: string }>('select budget, status from competitions where id = $1 for update', [competition_id]);
    await q.query(`select pg_advisory_xact_lock(hashtext('airtime-daily'))`);
    const claim = await lockClaim(q, claimId);

    if (claim.status !== 'pending') throw fail(409, 'bad_state', `Claim is ${claim.status}.`);
    if (comp.status !== 'finalized') throw fail(409, 'not_final', 'Competition is not finalized.');
    if (!claim.phone_verified_at || !claim.phone_encrypted) throw fail(409, 'phone_unverified', 'The winner has not verified their phone number.');
    if (claim.risk_flags.length > 0 && !opts.acknowledgeRisk) {
      throw fail(409, 'risk_review', `Run was flagged (${claim.risk_flags.join(', ')}). Review it, then approve with acknowledgeRisk.`);
    }

    const amount = Number(claim.amount);
    const [{ committed }] = await q.query<{ committed: string }>(
      `select coalesce(sum(amount), 0) as committed from reward_claims
        where competition_id = $1 and status in ('approved', 'processing', 'succeeded', 'review_required')`,
      [competition_id]);
    if (Number(committed) + amount > Number(comp.budget)) throw fail(409, 'over_budget', 'Approving this would exceed the competition budget.');

    const [{ today }] = await q.query<{ today: string }>(
      `select coalesce(sum(amount), 0) as today from reward_claims
        where currency_code = $1 and approved_at >= date_trunc('day', now())
          and status in ('approved', 'processing', 'succeeded', 'review_required')`,
      [claim.currency_code]);
    if (Number(today) + amount > env.AIRTIME_DAILY_LIMIT) throw fail(409, 'over_daily_limit', 'Approving this would exceed today’s airtime limit.');

    const [updated] = await q.query<ClaimRow>(
      `update reward_claims set status = 'approved', approved_by = $2, approved_at = now(), updated_at = now()
        where id = $1 returning *`, [claimId, actor]);
    await audit(q, actor, 'claim.approve', `claim:${claimId}`, { amount, currency: claim.currency_code, acknowledgedRisk: !!opts.acknowledgeRisk });
    return claimView(updated);
  });
}

async function settle(q: Queryable, claimId: string, payoutStatus: 'processing' | 'succeeded' | 'failed' | 'review_required', fields: { requestId?: string | null; providerStatus?: string | null; error?: string | null }) {
  await q.query(
    `update payouts set status = $2, provider_request_id = coalesce($3, provider_request_id),
            provider_status = coalesce($4, provider_status), provider_error = coalesce($5, provider_error), updated_at = now()
      where claim_id = $1`,
    [claimId, payoutStatus, fields.requestId ?? null, fields.providerStatus ?? null, fields.error ?? null]);
  await q.query('update reward_claims set status = $2, updated_at = now() where id = $1', [claimId, payoutStatus]);
}

/** Sends the airtime for one approved claim, exactly once */
export async function issuePayout(actor: string, claimId: string) {
  const gate = payoutsEnabled();
  if (!gate.ok) throw fail(503, 'payouts_disabled', gate.reason);

  const db = await getDb();
  const provider = await getProvider();
  const idempotencyKey = `orim-claim-${claimId}`;

  // 1. Claim the right to send: approved -> processing, plus the one payout row. Commit before calling out.
  const claim = await db.tx(async q => {
    const [moved] = await q.query<ClaimRow>(
      `update reward_claims set status = 'processing', updated_at = now()
        where id = $1 and status = 'approved' returning *`, [claimId]);
    if (!moved) {
      const [existing] = await q.query<{ status: string }>('select status from reward_claims where id = $1', [claimId]);
      if (!existing) throw fail(404, 'not_found', 'Claim not found.');
      throw fail(409, 'bad_state', `Claim is ${existing.status}; nothing was sent.`);
    }
    await q.query(
      `insert into payouts (claim_id, idempotency_key, amount, currency_code, status, provider)
       values ($1, $2, $3, $4, 'processing', $5)`,
      [claimId, idempotencyKey, moved.amount, moved.currency_code, provider.name]);
    await audit(q, actor, 'payout.request', `claim:${claimId}`, { amount: Number(moved.amount), currency: moved.currency_code, provider: provider.name });
    return moved;
  });

  // 2. One provider request, outside any transaction. Anything unexpected here is "unknown", never "failed":
  //    we cannot prove the airtime did not leave, so a person reconciles it.
  let result: AirtimeResult;
  try {
    result = await provider.sendAirtime({
      phoneNumber: decrypt(claim.phone_encrypted!),
      currencyCode: claim.currency_code,
      amount: Number(claim.amount),
      idempotencyKey,
    });
  } catch (err) {
    result = { outcome: 'unknown', error: err instanceof Error ? err.name : 'error' };
  }

  // 3. Record what we actually know. Acceptance is not success: that waits for the callback or a status check.
  const next = result.outcome === 'accepted' ? 'processing' : result.outcome === 'failed' ? 'failed' : 'review_required';
  await db.tx(async q => {
    await settle(q, claimId, next, { requestId: result.requestId, providerStatus: result.providerStatus, error: result.error });
    await audit(q, actor, 'payout.response', `claim:${claimId}`, { outcome: result.outcome, providerStatus: result.providerStatus ?? null });
  });
  return { claimId, status: next, providerRequestId: result.requestId ?? null };
}

async function applyFinalState(q: Queryable, payout: PayoutRow, state: AirtimeFinalState, providerStatus: string | undefined, actor: string) {
  if (payout.status === 'succeeded' || payout.status === 'failed') return { changed: false, status: payout.status };
  if (state !== 'succeeded' && state !== 'failed') return { changed: false, status: payout.status };
  await settle(q, payout.claim_id, state, { providerStatus: providerStatus ?? null });
  await audit(q, actor, 'payout.final', `claim:${payout.claim_id}`, { state, providerStatus: providerStatus ?? null });
  return { changed: true, status: state };
}

/** Ask the provider what happened to an in-flight or ambiguous payout */
export async function reconcilePayout(actor: string, claimId: string) {
  const db = await getDb();
  const [payout] = await db.query<PayoutRow & { stuck: boolean }>(
    `select *, created_at < now() - make_interval(mins => $2) as stuck from payouts where claim_id = $1`, [claimId, STUCK_AFTER_MINUTES]);
  if (!payout) throw fail(404, 'not_found', 'No payout for that claim.');
  if (payout.status === 'succeeded' || payout.status === 'failed') return { status: payout.status, changed: false };

  if (!payout.provider_request_id) {
    // Never reached (or never heard back from) the provider: a person checks the provider dashboard
    if (payout.stuck && payout.status === 'processing') {
      await db.tx(async q => {
        await settle(q, claimId, 'review_required', { error: 'no provider request id' });
        await audit(q, actor, 'payout.escalate', `claim:${claimId}`, {});
      });
      return { status: 'review_required', changed: true };
    }
    return { status: payout.status, changed: false };
  }

  const provider = await getProvider();
  const found = await provider.findAirtimeStatus(payout.provider_request_id);
  return db.tx(async q => {
    const [locked] = await q.query<PayoutRow>('select * from payouts where claim_id = $1 for update', [claimId]);
    return applyFinalState(q, locked, found.state, found.providerStatus, actor);
  });
}

/** Manual close-out of a review_required payout, after checking the provider dashboard */
export async function resolvePayout(actor: string, claimId: string, outcome: 'succeeded' | 'failed', note: string) {
  const db = await getDb();
  return db.tx(async q => {
    const [payout] = await q.query<PayoutRow>('select * from payouts where claim_id = $1 for update', [claimId]);
    if (!payout) throw fail(404, 'not_found', 'No payout for that claim.');
    if (payout.status !== 'review_required') throw fail(409, 'bad_state', `Payout is ${payout.status}.`);
    await settle(q, claimId, outcome, { providerStatus: `manual:${outcome}` });
    await audit(q, actor, 'payout.resolve', `claim:${claimId}`, { outcome, note: note.slice(0, 500) });
    return { status: outcome };
  });
}

/** Africa’s Talking airtime status callback: { requestId, status: Success | Failed, ... } */
export async function applyAirtimeCallback(cb: { requestId?: string; status?: string }) {
  if (!cb.requestId || !cb.status) return { applied: false };
  const db = await getDb();
  return db.tx(async q => {
    const [payout] = await q.query<PayoutRow>('select * from payouts where provider_request_id = $1 for update', [cb.requestId]);
    if (!payout) return { applied: false };
    const r = await applyFinalState(q, payout, airtimeStateFrom(cb.status), cb.status, 'provider:callback');
    return { applied: r.changed };
  });
}

/**
 * Africa’s Talking airtime validation callback: before sending, the provider asks whether
 * this transaction is ours. Only a payout we are actually processing, to that exact number
 * and amount, is validated.
 */
export async function validateAirtimeRequest(v: { phoneNumber?: string; amount?: string | number; currencyCode?: string }) {
  const phone = v.phoneNumber ? normalizeE164(v.phoneNumber) : null;
  if (!phone) return false;
  const db = await getDb();
  const rows = await db.query(
    `select 1 from payouts p join reward_claims c on c.id = p.claim_id
      where p.status = 'processing' and c.phone_hash = $1 and p.amount = $2 and p.currency_code = $3`,
    [hashPhone(phone), Number(v.amount), String(v.currencyCode ?? '').toUpperCase()]);
  return rows.length > 0;
}

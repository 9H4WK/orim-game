import { beforeEach, describe, expect, it } from 'vitest';
import { createCompetition, finalizeCompetition, leaderboard } from '@/server/competitions';
import { getDb } from '@/server/db';
import { mockOutbox, setMockAirtimeStatus } from '@/server/provider/mock';
import {
  applyAirtimeCallback, approveClaim, confirmPhoneCode, createClaim, issuePayout,
  reconcilePayout, resolvePayout, sendPhoneCode, validateAirtimeRequest,
} from '@/server/rewards';
import { finishRun, startRun } from '@/server/runs';
import { backdateRun, freshWorld, newPlayer, solve } from './helpers';

const IP = '198.51.100.4';
const ADMIN = 'admin';
const PAYOUTS_ON = { ENABLE_AIRTIME_PAYOUTS: 'true' };

async function competition(overrides: Partial<Parameters<typeof createCompetition>[1]> = {}) {
  const now = Date.now();
  await createCompetition(ADMIN, {
    id: 'oct-sprint',
    title: 'October sprint',
    startsAt: new Date(now - 3600_000),
    endsAt: new Date(now + 3600_000),
    claimDeadline: new Date(now + 7 * 86400_000),
    countryCode: 'KE',
    size: 9,
    prizes: [100, 50],
    budget: 150,
    terms: 'Kenyan numbers only. One prize per person. Results reviewed before payout.',
    ...overrides,
  });
}

async function play(playerId: string, msPerStep: number) {
  const run = await startRun(playerId, { competitionId: 'oct-sprint' });
  const path = solve(run.maze);
  await backdateRun(run.runId, (path.length - 1) * msPerStep);
  return finishRun(playerId, { runId: run.runId, nonce: run.nonce, path });
}

async function close() {
  const db = await getDb();
  await db.query(`update competitions set starts_at = now() - interval '2 hours', ends_at = now() - interval '1 minute'`);
  return finalizeCompetition(ADMIN, 'oct-sprint');
}

/** Winner proves their phone with the texted code */
async function verifyPhone(playerId: string, claimId: string, phone: string) {
  await sendPhoneCode(playerId, claimId, phone, IP);
  const code = mockOutbox.at(-1)!.body.match(/\b(\d{6})\b/)![1];
  return confirmPhoneCode(playerId, claimId, code);
}

async function approvedWinner(phone = '+254711222333') {
  await competition();
  const winner = await newPlayer();
  await play(winner, 250);
  await close();
  const claim = await createClaim(winner, 'oct-sprint');
  await verifyPhone(winner, claim.id, phone);
  await approveClaim(ADMIN, claim.id);
  return { winner, claimId: claim.id };
}

beforeEach(async () => { await freshWorld(); });

describe('competition integrity', () => {
  it('ranks verified runs only and fixes results at finalization', async () => {
    await competition();
    const fast = await newPlayer();
    const slow = await newPlayer();
    const cheat = await newPlayer();
    await play(slow, 400);
    await play(fast, 250);
    const run = await startRun(cheat, { competitionId: 'oct-sprint' });
    await finishRun(cheat, { runId: run.runId, nonce: run.nonce, path: solve(run.maze) }); // too fast: rejected

    const live = await leaderboard('oct-sprint', fast);
    expect(live.entries.map(e => e.isYou)).toEqual([true, false]);
    await expect(finalizeCompetition(ADMIN, 'oct-sprint')).rejects.toMatchObject({ code: 'still_running' });

    expect(await close()).toEqual({ ranked: 2, winners: 2 });
    const final = await leaderboard('oct-sprint', null);
    expect(final.final).toBe(true);
    expect(final.entries.map(e => e.prize)).toEqual([100, 50]);
    await expect(finalizeCompetition(ADMIN, 'oct-sprint')).rejects.toMatchObject({ status: 409 });
  });

  it('refuses runs outside the competition window', async () => {
    await competition({ startsAt: new Date(Date.now() + 3600_000), endsAt: new Date(Date.now() + 7200_000) });
    await expect(startRun(await newPlayer(), { competitionId: 'oct-sprint' })).rejects.toMatchObject({ code: 'not_open' });
  });

  it('only winners can claim, once', async () => {
    await competition({ prizes: [100], budget: 100 });
    const first = await newPlayer();
    const second = await newPlayer();
    await play(first, 250);
    await play(second, 400);
    await close();
    await expect(createClaim(second, 'oct-sprint')).rejects.toMatchObject({ code: 'not_eligible' });
    const a = await createClaim(first, 'oct-sprint');
    const b = await createClaim(first, 'oct-sprint');
    expect(a.id).toBe(b.id);
    expect(typeof a.id).toBe('string');
    expect(a).toMatchObject({ status: 'pending', amount: 100, currency: 'KES', phoneVerified: false });
  });
});

describe('phone ownership', () => {
  it('needs the texted code, in the competition country, with limited attempts', async () => {
    await competition();
    const winner = await newPlayer();
    await play(winner, 250);
    await close();
    const claim = await createClaim(winner, 'oct-sprint');

    await expect(sendPhoneCode(winner, claim.id, '+256712345678', IP)).rejects.toMatchObject({ code: 'wrong_country' });
    await sendPhoneCode(winner, claim.id, '+254711222333', IP);
    for (let i = 0; i < 5; i++) {
      await expect(confirmPhoneCode(winner, claim.id, '000000')).rejects.toMatchObject({ code: 'wrong_code' });
    }
    const code = mockOutbox.at(-1)!.body.match(/\b(\d{6})\b/)![1];
    await expect(confirmPhoneCode(winner, claim.id, code)).rejects.toMatchObject({ code: 'too_many_attempts' });
  });

  it('another player cannot touch my claim', async () => {
    await competition();
    const winner = await newPlayer();
    await play(winner, 250);
    await close();
    const claim = await createClaim(winner, 'oct-sprint');
    await expect(sendPhoneCode(await newPlayer(), claim.id, '+254711222333', IP)).rejects.toMatchObject({ status: 404 });
  });

  it('one phone number cannot collect two prizes in a competition', async () => {
    await competition();
    const a = await newPlayer();
    const b = await newPlayer();
    await play(a, 250);
    await play(b, 300);
    await close();
    await verifyPhone(a, (await createClaim(a, 'oct-sprint')).id, '+254711222333');
    await expect(verifyPhone(b, (await createClaim(b, 'oct-sprint')).id, '+254711222333')).rejects.toMatchObject({ code: 'phone_in_use' });
  });

  it('stores the number encrypted, never in plain text', async () => {
    await approvedWinner('+254711222333');
    const db = await getDb();
    expect(JSON.stringify(await db.query('select * from reward_claims'))).not.toContain('711222333');
  });
});

describe('approval', () => {
  it('requires a verified phone, and respects the competition budget', async () => {
    await competition({ prizes: [100, 50], budget: 120 });
    const a = await newPlayer();
    const b = await newPlayer();
    await play(a, 250);
    await play(b, 300);
    await close();
    const ca = await createClaim(a, 'oct-sprint');
    const cb = await createClaim(b, 'oct-sprint');
    await expect(approveClaim(ADMIN, ca.id)).rejects.toMatchObject({ code: 'phone_unverified' });
    await verifyPhone(a, ca.id, '+254711000111');
    await verifyPhone(b, cb.id, '+254711000222');
    await approveClaim(ADMIN, ca.id);
    await expect(approveClaim(ADMIN, cb.id)).rejects.toMatchObject({ code: 'over_budget' });
    await expect(approveClaim(ADMIN, ca.id)).rejects.toMatchObject({ code: 'bad_state' });
  });

  it('respects the daily airtime cap', async () => {
    await freshWorld({ AIRTIME_DAILY_LIMIT: '120' });
    await competition();
    const a = await newPlayer();
    const b = await newPlayer();
    await play(a, 250);
    await play(b, 300);
    await close();
    const ca = await createClaim(a, 'oct-sprint');
    const cb = await createClaim(b, 'oct-sprint');
    await verifyPhone(a, ca.id, '+254711000111');
    await verifyPhone(b, cb.id, '+254711000222');
    await approveClaim(ADMIN, ca.id);
    await expect(approveClaim(ADMIN, cb.id)).rejects.toMatchObject({ code: 'over_daily_limit' });
  });

  it('flagged runs need an explicit risk acknowledgement', async () => {
    await competition();
    const winner = await newPlayer();
    await play(winner, 170); // borderline fast: verified but flagged
    await close();
    const claim = await createClaim(winner, 'oct-sprint');
    await verifyPhone(winner, claim.id, '+254711222333');
    await expect(approveClaim(ADMIN, claim.id)).rejects.toMatchObject({ code: 'risk_review' });
    expect((await approveClaim(ADMIN, claim.id, { acknowledgeRisk: true })).status).toBe('approved');
  });

  it('parallel approvals cannot overspend a limit', async () => {
    await freshWorld({ AIRTIME_DAILY_LIMIT: '120' });
    await competition();
    const a = await newPlayer();
    const b = await newPlayer();
    await play(a, 250);
    await play(b, 300);
    await close();
    const ca = await createClaim(a, 'oct-sprint');
    const cb = await createClaim(b, 'oct-sprint');
    await verifyPhone(a, ca.id, '+254711000111');
    await verifyPhone(b, cb.id, '+254711000222');
    const results = await Promise.allSettled([approveClaim(ADMIN, ca.id), approveClaim(ADMIN, cb.id)]);
    expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1);
  });

  it('prize tables over budget are refused when the competition is created', async () => {
    const { competitionInput } = await import('@/server/competitions');
    const now = Date.now();
    const parsed = competitionInput.safeParse({
      id: 'too-rich', title: 'Too rich', startsAt: new Date(now), endsAt: new Date(now + 1000), claimDeadline: new Date(now + 2000),
      countryCode: 'KE', size: 9, prizes: [100, 100], budget: 150, terms: 'Twenty characters of terms.',
    });
    expect(parsed.success).toBe(false);
  });
});

describe('payouts', () => {
  it('stay switched off by default', async () => {
    const { claimId } = await approvedWinner();
    await expect(issuePayout(ADMIN, claimId)).rejects.toMatchObject({ status: 503, code: 'payouts_disabled' });
  });

  it('live airtime needs a second, explicit approval', async () => {
    await freshWorld({ ...PAYOUTS_ON, AT_PROVIDER: 'mock', AT_ENVIRONMENT: 'production', AT_USERNAME: 'orim-live' });
    const { payoutsEnabled, getEnv } = await import('@/server/env');
    expect(payoutsEnabled({ ...getEnv(), provider: 'africastalking' })).toMatchObject({ ok: false });
    expect(payoutsEnabled({ ...getEnv(), provider: 'africastalking', AIRTIME_LIVE_APPROVED: true })).toEqual({ ok: true });
    process.env.AT_ENVIRONMENT = 'sandbox';
    process.env.AT_USERNAME = 'sandbox';
  });

  it('accepted is not success: it waits for the provider to confirm', async () => {
    const { claimId } = await approvedWinner();
    Object.assign(process.env, PAYOUTS_ON);
    (await import('@/server/env')).resetEnvForTests();
    const res = await issuePayout(ADMIN, claimId);
    expect(res.status).toBe('processing');
    expect(mockOutbox.filter(m => m.kind === 'airtime')).toHaveLength(1);
    expect(mockOutbox.at(-1)!.body).toBe('KES 100');

    expect(await applyAirtimeCallback({ requestId: res.providerRequestId!, status: 'Success' })).toEqual({ applied: true });
    // Duplicate and contradicting callbacks change nothing
    expect(await applyAirtimeCallback({ requestId: res.providerRequestId!, status: 'Success' })).toEqual({ applied: false });
    expect(await applyAirtimeCallback({ requestId: res.providerRequestId!, status: 'Failed' })).toEqual({ applied: false });
    const db = await getDb();
    const [claim] = await db.query<{ status: string }>('select status from reward_claims where id = $1', [claimId]);
    expect(claim.status).toBe('succeeded');
  });

  it('can never pay the same claim twice, even in parallel', async () => {
    const { claimId } = await approvedWinner();
    Object.assign(process.env, PAYOUTS_ON);
    (await import('@/server/env')).resetEnvForTests();
    const results = await Promise.allSettled([1, 2, 3, 4].map(() => issuePayout(ADMIN, claimId)));
    expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1);
    expect(mockOutbox.filter(m => m.kind === 'airtime')).toHaveLength(1);
    await expect(issuePayout(ADMIN, claimId)).rejects.toMatchObject({ code: 'bad_state' });
    const db = await getDb();
    expect(await db.query('select * from payouts')).toHaveLength(1);
  });

  it('a timeout becomes review_required and is never retried automatically', async () => {
    const { claimId } = await approvedWinner('+254711220002');
    Object.assign(process.env, PAYOUTS_ON);
    (await import('@/server/env')).resetEnvForTests();
    expect((await issuePayout(ADMIN, claimId)).status).toBe('review_required');
    await expect(issuePayout(ADMIN, claimId)).rejects.toMatchObject({ code: 'bad_state' });
    expect(await reconcilePayout(ADMIN, claimId)).toEqual({ status: 'review_required', changed: false });
    expect(await resolvePayout(ADMIN, claimId, 'failed', 'Checked AT dashboard: no transaction')).toEqual({ status: 'failed' });
  });

  it('a definite provider failure is recorded as failed', async () => {
    const { claimId } = await approvedWinner('+254711220001');
    Object.assign(process.env, PAYOUTS_ON);
    (await import('@/server/env')).resetEnvForTests();
    expect((await issuePayout(ADMIN, claimId)).status).toBe('failed');
  });

  it('reconciles in-flight payouts from the provider status check', async () => {
    const { claimId } = await approvedWinner();
    Object.assign(process.env, PAYOUTS_ON);
    (await import('@/server/env')).resetEnvForTests();
    const res = await issuePayout(ADMIN, claimId);
    setMockAirtimeStatus(res.providerRequestId!, { state: 'pending', providerStatus: 'Sent' });
    expect(await reconcilePayout(ADMIN, claimId)).toEqual({ status: 'processing', changed: false });
    setMockAirtimeStatus(res.providerRequestId!, { state: 'succeeded', providerStatus: 'Success' });
    expect(await reconcilePayout(ADMIN, claimId)).toEqual({ status: 'succeeded', changed: true });
  });

  it('validates only transactions we are actually sending', async () => {
    const { claimId } = await approvedWinner('+254711222333');
    Object.assign(process.env, PAYOUTS_ON);
    (await import('@/server/env')).resetEnvForTests();
    const db = await getDb();
    // Freeze the payout mid-flight to ask the validation question
    await db.query(`insert into payouts (claim_id, idempotency_key, amount, currency_code, status, provider) values ($1, 'k', 100, 'KES', 'processing', 'mock')`, [claimId]);
    expect(await validateAirtimeRequest({ phoneNumber: '+254711222333', amount: '100', currencyCode: 'KES' })).toBe(true);
    expect(await validateAirtimeRequest({ phoneNumber: '+254711222333', amount: '1000', currencyCode: 'KES' })).toBe(false);
    expect(await validateAirtimeRequest({ phoneNumber: '+254700000001', amount: '100', currencyCode: 'KES' })).toBe(false);
  });

  it('every money decision leaves an audit trail without phone numbers', async () => {
    const { claimId } = await approvedWinner('+254711222333');
    Object.assign(process.env, PAYOUTS_ON);
    (await import('@/server/env')).resetEnvForTests();
    await issuePayout(ADMIN, claimId);
    const db = await getDb();
    const events = await db.query<{ action: string }>('select action, detail from audit_events order by id');
    expect(events.map(e => e.action)).toEqual(expect.arrayContaining(['competition.create', 'claim.approve', 'payout.request', 'payout.response']));
    expect(JSON.stringify(events)).not.toContain('711222333');
  });
});

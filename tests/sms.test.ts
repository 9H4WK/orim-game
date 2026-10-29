import { beforeEach, describe, expect, it } from 'vitest';
import { createChallenge } from '@/server/challenges';
import { getDb } from '@/server/db';
import { mockOutbox } from '@/server/provider/mock';
import { finishRun, startRun } from '@/server/runs';
import { applyInboundSms, applySmsDeliveryReport, inviteMessage, optOut, sendChallengeInvite } from '@/server/sms';
import { backdateRun, freshWorld, newPlayer, solve } from './helpers';

const IP = '203.0.113.7';

async function readyChallenge() {
  const alice = await newPlayer();
  const { token } = await createChallenge(alice, 1);
  const run = await startRun(alice, { challengeToken: token });
  const path = solve(run.maze);
  await backdateRun(run.runId, path.length * 300);
  await finishRun(alice, { runId: run.runId, nonce: run.nonce, path });
  return { alice, token };
}

const invite = (player: string, token: string, phoneNumber = '+254712345678', consent = true) =>
  sendChallengeInvite(player, { token, phoneNumber, consent }, IP);

describe('SMS challenge safeguards', () => {
  beforeEach(async () => { await freshWorld({ ENABLE_SMS_CHALLENGES: 'true' }); });

  it('is off unless explicitly enabled', async () => {
    await freshWorld();
    const { alice, token } = await readyChallenge();
    await expect(invite(alice, token)).rejects.toMatchObject({ status: 503, code: 'sms_disabled' });
  });

  it('requires consent, a valid E.164 number and a supported country', async () => {
    const { alice, token } = await readyChallenge();
    await expect(invite(alice, token, '+254712345678', false)).rejects.toMatchObject({ code: 'consent_required' });
    await expect(invite(alice, token, '12345')).rejects.toMatchObject({ code: 'invalid_phone' });
    await expect(invite(alice, token, '+14155550100')).rejects.toMatchObject({ code: 'unsupported_country' });
  });

  it('only the creator can text, and only after setting a verified time', async () => {
    const alice = await newPlayer();
    const bob = await newPlayer();
    const { token } = await createChallenge(alice, 1);
    await expect(invite(bob, token)).rejects.toMatchObject({ code: 'not_creator' });
    await expect(invite(alice, token)).rejects.toMatchObject({ code: 'play_first' });
  });

  it('sends the link, never the phone number, and reports accepted rather than delivered', async () => {
    const { alice, token } = await readyChallenge();
    const res = await invite(alice, token);
    expect(res).toEqual({ status: 'accepted', recipient: '+254••••••678' });
    const sms = mockOutbox.at(-1)!;
    const db = await getDb();
    const [best] = await db.query<{ ms: number }>(`select min(duration_ms) as ms from runs where status = 'verified'`);
    expect(sms.body).toBe(inviteMessage(token, Number(best.ms)));
    expect(sms.body).toMatch(/^ORIM: A friend escaped a maze in \d\d:\d\d\.\d\d\. Can you beat it\?/);
    expect(sms.body).toContain(`https://orim.test/c/${token}`);
    expect(sms.body).not.toContain('712345678');
    expect(sms.body.length).toBeLessThanOrEqual(160);
    // GSM-7 only: no curly quotes that would split the message
    expect(/^[\x20-\x7e]*$/.test(sms.body)).toBe(true);
  });

  it('accepts a local Kenyan number and texts it in international form', async () => {
    const { alice, token } = await readyChallenge();
    expect(await invite(alice, token, '0712 345 678')).toEqual({ status: 'accepted', recipient: '+254••••••678' });
    expect(mockOutbox.at(-1)!.to).toBe('+254712345678');
    // The same friend typed the other way is still a duplicate
    await expect(invite(alice, token, '+254712345678')).rejects.toMatchObject({ code: 'already_invited' });
  });

  it('stores only a hash and a masked number', async () => {
    const { alice, token } = await readyChallenge();
    await invite(alice, token);
    const db = await getDb();
    const rows = await db.query('select * from sms_invitations');
    expect(JSON.stringify(rows)).not.toContain('712345678');
  });

  it('refuses duplicates and opted-out numbers', async () => {
    const { alice, token } = await readyChallenge();
    await invite(alice, token);
    await expect(invite(alice, token)).rejects.toMatchObject({ code: 'already_invited' });
    await optOut('+254 700 111 222', 'web');
    await expect(invite(alice, token, '+254700111222')).rejects.toMatchObject({ code: 'opted_out' });
  });

  it('STOP replies opt the number out', async () => {
    const { alice, token } = await readyChallenge();
    expect(await applyInboundSms({ from: '+254733000111', text: 'stop' })).toEqual({ optedOut: true });
    expect(await applyInboundSms({ from: '+254733000111', text: 'hello' })).toEqual({ optedOut: false });
    await expect(invite(alice, token, '+254733000111')).rejects.toMatchObject({ code: 'opted_out' });
  });

  it('limits each sender per hour', async () => {
    const { alice, token } = await readyChallenge();
    for (let i = 0; i < 5; i++) await invite(alice, token, `+25471100000${i}`);
    await expect(invite(alice, token, '+254711000009')).rejects.toMatchObject({ status: 429 });
  });

  it('limits texts to one recipient across different senders', async () => {
    for (let i = 0; i < 2; i++) {
      const { alice, token } = await readyChallenge();
      await invite(alice, token, '+254722000555');
    }
    const { alice, token } = await readyChallenge();
    await expect(invite(alice, token, '+254722000555')).rejects.toMatchObject({ status: 429 });
  });

  it('enforces the global daily spending cap', async () => {
    await freshWorld({ ENABLE_SMS_CHALLENGES: 'true', SMS_DAILY_LIMIT: '1' });
    const { alice, token } = await readyChallenge();
    await invite(alice, token, '+254711000001');
    await expect(invite(alice, token, '+254711000002')).rejects.toMatchObject({ status: 429 });
  });

  it('records provider failures and unknown outcomes honestly', async () => {
    const { alice, token } = await readyChallenge();
    expect((await invite(alice, token, '+254711110000')).status).toBe('failed');
    expect((await invite(alice, token, '+254711119999')).status).toBe('unknown');
    const db = await getDb();
    const statuses = (await db.query<{ status: string }>('select status from sms_invitations order by id')).map(r => r.status);
    expect(statuses).toEqual(['failed', 'unknown']);
  });

  it('delivery reports move accepted to delivered, once, and never back', async () => {
    const { alice, token } = await readyChallenge();
    await invite(alice, token);
    const id = mockOutbox.at(-1)!.id;
    expect(await applySmsDeliveryReport({ id, status: 'Buffered' })).toEqual({ applied: false });
    expect(await applySmsDeliveryReport({ id, status: 'Success' })).toEqual({ applied: true });
    expect(await applySmsDeliveryReport({ id, status: 'Success' })).toEqual({ applied: false });
    expect(await applySmsDeliveryReport({ id, status: 'Failed' })).toEqual({ applied: false });
    const db = await getDb();
    const [row] = await db.query<{ status: string }>('select status from sms_invitations');
    expect(row.status).toBe('delivered');
  });
});

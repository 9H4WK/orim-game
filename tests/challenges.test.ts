import { beforeEach, describe, expect, it } from 'vitest';
import { generateSeededMaze } from '@/lib/maze/seeded';
import { challengeResults, createChallenge, publicChallenge } from '@/server/challenges';
import { getDb } from '@/server/db';
import { finishRun, startRun } from '@/server/runs';
import { backdateRun, freshWorld, newPlayer, solve } from './helpers';

beforeEach(async () => { await freshWorld(); });

async function playHonestly(playerId: string, token: string, msPerStep = 250, extra: Partial<Parameters<typeof finishRun>[1]> = {}) {
  const run = await startRun(playerId, { challengeToken: token });
  const path = solve(run.maze);
  await backdateRun(run.runId, (path.length - 1) * msPerStep);
  return finishRun(playerId, { runId: run.runId, nonce: run.nonce, path, ...extra });
}

describe('challenge links', () => {
  it('both players get the same frozen maze definition', async () => {
    const alice = await newPlayer();
    const bob = await newPlayer();
    const { token } = await createChallenge(alice, 12);
    const a = await startRun(alice, { challengeToken: token });
    const b = await startRun(bob, { challengeToken: token });
    expect(a.maze).toEqual(b.maze);
    expect(a.maze.version).toBe(1);
  });

  it('public metadata leaks no seed or creator id', async () => {
    const alice = await newPlayer();
    const { token } = await createChallenge(alice, 3);
    const pub = await publicChallenge(token, null);
    const text = JSON.stringify(pub);
    expect(text).not.toContain(alice);
    expect(pub).not.toHaveProperty('seed');
    expect(pub.isCreator).toBe(false);
    expect((await publicChallenge(token, alice)).isCreator).toBe(true);
  });

  it('rejects malformed and unknown tokens, and expired challenges', async () => {
    const alice = await newPlayer();
    await expect(publicChallenge('nope', null)).rejects.toMatchObject({ status: 404 });
    await expect(publicChallenge('A'.repeat(22), null)).rejects.toMatchObject({ status: 404 });
    const { token } = await createChallenge(alice, 3);
    const db = await getDb();
    await db.query(`update challenges set expires_at = now() - interval '1 minute' where token = $1`, [token]);
    expect((await publicChallenge(token, null)).expired).toBe(true);
    await expect(startRun(alice, { challengeToken: token })).rejects.toMatchObject({ status: 410 });
  });

  it('compares verified results: faster wins, equal is a tie', async () => {
    const alice = await newPlayer();
    const bob = await newPlayer();
    const { token } = await createChallenge(alice, 2);
    await playHonestly(alice, token, 300);
    expect((await challengeResults(token, bob)).comparison.outcome).toBe('pending');
    await playHonestly(bob, token, 250);
    const forBob = await challengeResults(token, bob);
    expect(forBob.comparison.outcome).toBe('win');
    expect(forBob.participants[0].isYou).toBe(true);
    expect((await challengeResults(token, alice)).comparison.outcome).toBe('lose');
  });
});

describe('verified runs', () => {
  it('verifies an honest run with server-side time and wrong turns', async () => {
    const alice = await newPlayer();
    const { token } = await createChallenge(alice, 1);
    const res = await playHonestly(alice, token, 250, { clientMistakes: 0 });
    expect(res).toMatchObject({ status: 'verified', mistakes: 0, underReview: false });
    if (res.status === 'verified') expect(res.durationMs).toBeGreaterThanOrEqual(res.steps * 240);
  });

  it('rejects tampered movement through walls', async () => {
    const alice = await newPlayer();
    const { token } = await createChallenge(alice, 1);
    const run = await startRun(alice, { challengeToken: token });
    const maze = generateSeededMaze(run.maze);
    const solution = solve(run.maze);
    // Follow the real route, then cut through the first wall that leads closer to the exit
    let tampered: { x: number; y: number }[] | null = null;
    for (let i = 0; i < solution.length && !tampered; i++) {
      const p = solution[i];
      const cell = maze.grid[p.y][p.x];
      if (cell.walls.right && p.x + 1 < maze.width) tampered = [...solution.slice(0, i + 1), { x: p.x + 1, y: p.y }];
      else if (cell.walls.bottom && p.y + 1 < maze.height) tampered = [...solution.slice(0, i + 1), { x: p.x, y: p.y + 1 }];
    }
    await backdateRun(run.runId, 60_000);
    const res = await finishRun(alice, { runId: run.runId, nonce: run.nonce, path: tampered! });
    expect(res).toEqual({ status: 'rejected', reason: 'through_wall' });
  });

  it('rejects impossible completion times', async () => {
    const alice = await newPlayer();
    const { token } = await createChallenge(alice, 1);
    const run = await startRun(alice, { challengeToken: token });
    const res = await finishRun(alice, { runId: run.runId, nonce: run.nonce, path: solve(run.maze) });
    expect(res).toEqual({ status: 'rejected', reason: 'implausibly_fast' });
  });

  it('flags borderline-fast and inconsistent runs for review without rejecting', async () => {
    const alice = await newPlayer();
    const { token } = await createChallenge(alice, 1);
    const res = await playHonestly(alice, token, 170, { clientMistakes: 5 });
    expect(res).toMatchObject({ status: 'verified', underReview: true });
  });

  it('a nonce works once: replays and forged nonces are refused', async () => {
    const alice = await newPlayer();
    const { token } = await createChallenge(alice, 1);
    const run = await startRun(alice, { challengeToken: token });
    const path = solve(run.maze);
    await backdateRun(run.runId, path.length * 300);
    await expect(finishRun(alice, { runId: run.runId, nonce: 'x'.repeat(22), path })).rejects.toMatchObject({ status: 403 });
    await finishRun(alice, { runId: run.runId, nonce: run.nonce, path });
    await expect(finishRun(alice, { runId: run.runId, nonce: run.nonce, path })).rejects.toMatchObject({ status: 409 });
  });

  it('parallel duplicate submissions verify exactly once', async () => {
    const alice = await newPlayer();
    const { token } = await createChallenge(alice, 1);
    const run = await startRun(alice, { challengeToken: token });
    const path = solve(run.maze);
    await backdateRun(run.runId, path.length * 300);
    const results = await Promise.allSettled([1, 2, 3].map(() => finishRun(alice, { runId: run.runId, nonce: run.nonce, path })));
    expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1);
  });

  it('nobody can submit another player’s run', async () => {
    const alice = await newPlayer();
    const mallory = await newPlayer();
    const { token } = await createChallenge(alice, 1);
    const run = await startRun(alice, { challengeToken: token });
    await expect(finishRun(mallory, { runId: run.runId, nonce: run.nonce, path: solve(run.maze) })).rejects.toMatchObject({ status: 404 });
  });

  it('expired runs are rejected', async () => {
    const alice = await newPlayer();
    const { token } = await createChallenge(alice, 1);
    const run = await startRun(alice, { challengeToken: token });
    const db = await getDb();
    await db.query(`update runs set expires_at = now() - interval '1 second' where id = $1`, [run.runId]);
    expect(await finishRun(alice, { runId: run.runId, nonce: run.nonce, path: solve(run.maze) })).toEqual({ status: 'rejected', reason: 'expired' });
  });
});

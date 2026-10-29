import { randomUUID } from 'node:crypto';
import { generateSeededMaze } from '@/lib/maze/seeded';
import type { PathPoint } from '@/lib/maze/verify';
import { getDb, resetDbForTests } from '@/server/db';
import { resetEnvForTests } from '@/server/env';
import { resetMock } from '@/server/provider/mock';
import { resetProviderForTests } from '@/server/provider';
import { displayNameFor } from '@/server/identity';

let booted = false;

/** Same in-memory database per test file, emptied between tests (booting Postgres takes seconds) */
export async function freshWorld(env: Record<string, string> = {}) {
  if (!booted) { await resetDbForTests(); booted = true; }
  const db = await getDb();
  await db.exec(`truncate players, challenges, competitions, runs, sms_optouts, sms_invitations, rate_events,
    competition_results, reward_claims, payouts, audit_events restart identity cascade`);
  resetEnvForTests();
  resetProviderForTests();
  resetMock();
  for (const k of ['ENABLE_SMS_CHALLENGES', 'ENABLE_AIRTIME_PAYOUTS', 'AIRTIME_LIVE_APPROVED', 'ADMIN_TOKEN', 'AT_WEBHOOK_SECRET', 'SMS_DAILY_LIMIT', 'AIRTIME_DAILY_LIMIT']) {
    delete process.env[k];
  }
  Object.assign(process.env, env);
  return db;
}

export async function newPlayer(): Promise<string> {
  const id = randomUUID();
  const db = await getDb();
  await db.query('insert into players (id, display_name) values ($1, $2)', [id, displayNameFor(id)]);
  return id;
}

/** The shortest legal path through a seeded maze, as the game would record it */
export function solve(maze: { seed: number; width: number; height: number; version: number }): PathPoint[] {
  return generateSeededMaze(maze).solution.map(p => ({ x: p.x, y: p.y }));
}

/** Pretend the run started `ms` ago, so honest timings pass the plausibility check */
export async function backdateRun(runId: string, ms: number) {
  const db = await getDb();
  await db.query(`update runs set started_at = now() - make_interval(secs => $2) where id = $1`, [runId, ms / 1000]);
}

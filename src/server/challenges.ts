import 'server-only';
import { challengeSizeForStage, GENERATOR_VERSION } from '@/lib/maze/seeded';
import { headToHead } from '@/lib/online/ranking';
import { getDb, type Queryable } from './db';
import { getEnv } from './env';
import { fail } from './http';
import { consumeAll, HOUR } from './ratelimit';
import { randomSeed, randomToken } from './security';

export const CHALLENGE_TTL_DAYS = 7;
const TOKEN = /^[A-Za-z0-9_-]{16,64}$/;

export interface ChallengeRow {
  id: string;
  token: string;
  creator_id: string;
  seed: string | number;
  width: number;
  height: number;
  generator_version: number;
  source_stage: number | null;
  expires_at: Date | string;
  created_at: Date | string;
}

export async function createChallenge(playerId: string, stage: number) {
  const db = await getDb();
  const { width, height } = challengeSizeForStage(stage);
  return db.tx(async q => {
    const blocked = await consumeAll(q, [{ bucket: `challenge:create:${playerId}`, limit: 20, windowSec: HOUR }]);
    if (blocked) throw fail(429, 'rate_limited', 'You have made a lot of challenges. Try again in a little while.');
    const token = randomToken();
    const [row] = await q.query<ChallengeRow>(
      `insert into challenges (token, creator_id, seed, width, height, generator_version, source_stage, expires_at)
       values ($1, $2, $3, $4, $5, $6, $7, now() + make_interval(days => $8))
       returning *`,
      [token, playerId, randomSeed(), width, height, GENERATOR_VERSION, stage, CHALLENGE_TTL_DAYS],
    );
    return { token: row.token, expiresAt: new Date(row.expires_at).toISOString() };
  });
}

/** Looks a challenge up by token; expired ones are reported as such, unknown ones as not found */
export async function findChallenge(q: Queryable, token: string, opts: { allowExpired?: boolean } = {}): Promise<ChallengeRow> {
  if (!TOKEN.test(token)) throw fail(404, 'not_found', 'This challenge link is not valid.');
  const [row] = await q.query<ChallengeRow>('select * from challenges where token = $1', [token]);
  if (!row) throw fail(404, 'not_found', 'This challenge link is not valid.');
  if (!opts.allowExpired && new Date(row.expires_at).getTime() < Date.now()) {
    throw fail(410, 'expired', 'This challenge has expired. Ask your friend for a new one.');
  }
  return row;
}

/** Safe for anyone holding the link: no seed, no creator id, no phone numbers */
export async function publicChallenge(token: string, viewerId: string | null) {
  const db = await getDb();
  const row = await findChallenge(db, token, { allowExpired: true });
  const [creator] = await db.query<{ display_name: string }>('select display_name from players where id = $1', [row.creator_id]);
  return {
    token: row.token,
    width: row.width,
    height: row.height,
    generatorVersion: row.generator_version,
    expiresAt: new Date(row.expires_at).toISOString(),
    expired: new Date(row.expires_at).getTime() < Date.now(),
    creatorName: creator?.display_name ?? 'A friend',
    isCreator: viewerId === row.creator_id,
    smsEnabled: getEnv().ENABLE_SMS_CHALLENGES,
  };
}

interface BestRow {
  player_id: string;
  display_name: string;
  duration_ms: number;
  mistakes: number;
  finished_at: Date | string;
}

/** Best verified run per player, best first, using the announced ranking rule */
export async function bestVerifiedRuns(q: Queryable, column: 'challenge_id' | 'competition_id', id: string, limit = 50) {
  return q.query<BestRow>(
    `select * from (
       select distinct on (r.player_id) r.player_id, p.display_name, r.duration_ms, r.mistakes, r.finished_at
         from runs r join players p on p.id = r.player_id
        where r.${column} = $1 and r.status = 'verified'
        order by r.player_id, r.duration_ms, r.mistakes, r.finished_at
     ) best
     order by duration_ms, mistakes, finished_at
     limit $2`,
    [id, limit],
  );
}

export async function challengeResults(token: string, viewerId: string | null) {
  const db = await getDb();
  const row = await findChallenge(db, token, { allowExpired: true });
  const best = await bestVerifiedRuns(db, 'challenge_id', row.id);

  const toResult = (b: BestRow) => ({ durationMs: b.duration_ms, mistakes: b.mistakes, finishedAt: new Date(b.finished_at).toISOString() });
  const participants = best.map((b, i) => ({
    rank: i + 1,
    name: b.display_name,
    isYou: b.player_id === viewerId,
    isCreator: b.player_id === row.creator_id,
    ...toResult(b),
  }));

  const mine = best.find(b => b.player_id === viewerId) ?? null;
  // Compare against the sender; the sender compares against the best friend so far
  const them = viewerId === row.creator_id
    ? best.find(b => b.player_id !== row.creator_id) ?? null
    : best.find(b => b.player_id === row.creator_id) ?? null;

  return {
    participants,
    comparison: {
      you: mine ? toResult(mine) : null,
      them: them ? { name: them.display_name, ...toResult(them) } : null,
      outcome: headToHead(mine && toResult(mine), them && toResult(them)),
    },
  };
}

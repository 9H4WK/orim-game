import 'server-only';
import { randomUUID } from 'node:crypto';
import { generateSeededMaze, isValidSpec, type SeededMazeSpec } from '@/lib/maze/seeded';
import { verifyPath, type PathPoint } from '@/lib/maze/verify';
import { findChallenge } from './challenges';
import { getDb } from './db';
import { fail } from './http';
import { consumeAll, HOUR } from './ratelimit';
import { hmac, randomToken, safeEqual } from './security';

/**
 * Verified runs.
 * The server issues a run id, a one-time nonce and the start time; the browser plays
 * and sends back every cell it visited. The server replays that path against the exact
 * stored maze and times the run with its own clock. Browser timers are never trusted.
 *
 * This raises the bar; it does not make cheating impossible. A bot can still play
 * through a real browser, so prize claims also pass risk flags and manual review.
 */

export const RUN_TTL_MINUTES = 30;
/** The game animates each step for at least ~200 ms; anything well under that is not a person playing */
export const MIN_MS_PER_STEP = 150;
export const SUSPICIOUS_MS_PER_STEP = 190;

export type RunTarget = { challengeToken: string } | { competitionId: string };

interface CompetitionRow {
  id: string;
  status: string;
  starts_at: Date | string;
  ends_at: Date | string;
  seed: string | number;
  width: number;
  height: number;
  generator_version: number;
}

export async function startRun(playerId: string, target: RunTarget) {
  const db = await getDb();
  return db.tx(async q => {
    const blocked = await consumeAll(q, [{ bucket: `run:start:${playerId}`, limit: 60, windowSec: HOUR }]);
    if (blocked) throw fail(429, 'rate_limited', 'Too many runs started. Take a short break and try again.');

    let spec: SeededMazeSpec;
    let link: { challenge_id: string | null; competition_id: string | null };

    if ('challengeToken' in target) {
      const c = await findChallenge(q, target.challengeToken);
      spec = { seed: Number(c.seed), width: c.width, height: c.height, version: c.generator_version };
      link = { challenge_id: c.id, competition_id: null };
    } else {
      const [c] = await q.query<CompetitionRow>('select * from competitions where id = $1', [target.competitionId]);
      if (!c || c.status === 'cancelled') throw fail(404, 'not_found', 'That competition does not exist.');
      const now = Date.now();
      if (c.status !== 'published' || now < new Date(c.starts_at).getTime()) throw fail(409, 'not_open', 'This competition has not opened yet.');
      if (now >= new Date(c.ends_at).getTime()) throw fail(409, 'closed', 'This competition has closed.');
      spec = { seed: Number(c.seed), width: c.width, height: c.height, version: c.generator_version };
      link = { challenge_id: null, competition_id: c.id };
    }

    const id = randomUUID();
    const nonce = randomToken();
    await q.query(
      `insert into runs (id, player_id, challenge_id, competition_id, nonce_hash, seed, width, height, generator_version, status, expires_at)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'started', now() + make_interval(mins => $10))`,
      [id, playerId, link.challenge_id, link.competition_id, hmac('nonce', `${id}:${nonce}`), spec.seed, spec.width, spec.height, spec.version, RUN_TTL_MINUTES],
    );
    return { runId: id, nonce, maze: spec };
  });
}

export interface FinishInput {
  runId: string;
  nonce: string;
  path: PathPoint[];
  clientElapsedMs?: number;
  clientMistakes?: number;
}

interface RunRow {
  id: string;
  player_id: string;
  nonce_hash: string;
  status: string;
  seed: string | number;
  width: number;
  height: number;
  generator_version: number;
  expired: boolean;
  elapsed_ms: number;
}

export type FinishResult =
  // Flags stay server-side; the player only learns that a result is under review
  | { status: 'verified'; durationMs: number; mistakes: number; steps: number; underReview: boolean }
  | { status: 'rejected'; reason: string };

export async function finishRun(playerId: string, input: FinishInput): Promise<FinishResult> {
  const db = await getDb();
  return db.tx(async q => {
    // The row lock makes the nonce single-use even if the same finish is sent twice at once
    const [run] = await q.query<RunRow>(
      `select *, expires_at < now() as expired,
              floor(extract(epoch from (now() - started_at)) * 1000)::int as elapsed_ms
         from runs where id = $1 for update`,
      [input.runId],
    );
    if (!run || run.player_id !== playerId) throw fail(404, 'not_found', 'Run not found.');
    if (!safeEqual(run.nonce_hash, hmac('nonce', `${run.id}:${input.nonce}`))) throw fail(403, 'bad_nonce', 'This run could not be confirmed.');
    if (run.status !== 'started') throw fail(409, 'already_submitted', 'This run was already submitted.');

    const reject = async (reason: string): Promise<FinishResult> => {
      await q.query(
        `update runs set status = 'rejected', finished_at = now(), reject_reason = $2, client_elapsed_ms = $3,
                path = $4 where id = $1`,
        [run.id, reason, input.clientElapsedMs ?? null, JSON.stringify(input.path.slice(0, 5000))],
      );
      return { status: 'rejected', reason };
    };

    if (run.expired) return reject('expired');

    const spec = { seed: Number(run.seed), width: run.width, height: run.height, version: run.generator_version };
    if (!isValidSpec(spec)) return reject('unsupported_maze');
    const verdict = verifyPath(generateSeededMaze(spec), input.path);
    if (!verdict.ok) return reject(verdict.reason);

    const duration = run.elapsed_ms;
    if (duration < verdict.steps * MIN_MS_PER_STEP) return reject('implausibly_fast');

    const flags: string[] = [];
    if (duration < verdict.steps * SUSPICIOUS_MS_PER_STEP) flags.push('fast');
    // The browser's clock runs inside the server's window, so it cannot honestly be longer
    if (input.clientElapsedMs !== undefined && input.clientElapsedMs > duration + 1500) flags.push('clock_mismatch');
    if (input.clientMistakes !== undefined && input.clientMistakes !== verdict.mistakes) flags.push('mistake_mismatch');

    await q.query(
      `update runs set status = 'verified', finished_at = now(), duration_ms = $2, mistakes = $3, steps = $4,
              client_elapsed_ms = $5, risk_flags = $6, path = $7
        where id = $1`,
      [run.id, duration, verdict.mistakes, verdict.steps, input.clientElapsedMs ?? null, flags, JSON.stringify(input.path)],
    );
    return { status: 'verified', durationMs: duration, mistakes: verdict.mistakes, steps: verdict.steps, underReview: flags.length > 0 };
  });
}

import 'server-only';
import { z } from 'zod';
import { GENERATOR_VERSION, MAX_MAZE_SIZE, MIN_MAZE_SIZE } from '@/lib/maze/seeded';
import { RANKING_RULE } from '@/lib/online/ranking';
import { audit } from './audit';
import { bestVerifiedRuns } from './challenges';
import { getDb, type Queryable } from './db';
import { fail } from './http';
import { COUNTRIES } from './phone';
import { randomSeed } from './security';

export const competitionInput = z
  .object({
    id: z.string().regex(/^[a-z0-9-]{3,48}$/, 'lowercase letters, digits and dashes'),
    title: z.string().trim().min(3).max(80),
    startsAt: z.coerce.date(),
    endsAt: z.coerce.date(),
    claimDeadline: z.coerce.date(),
    countryCode: z.enum(Object.keys(COUNTRIES) as [string, ...string[]]),
    size: z.number().int().min(MIN_MAZE_SIZE).max(MAX_MAZE_SIZE),
    // Airtime amount for rank 1, 2, 3…, in the country's currency
    prizes: z.array(z.number().positive().max(10000)).min(1).max(20),
    budget: z.number().positive(),
    terms: z.string().trim().min(20).max(4000),
  })
  .refine(c => c.endsAt > c.startsAt, { message: 'endsAt must be after startsAt', path: ['endsAt'] })
  .refine(c => c.claimDeadline > c.endsAt, { message: 'claimDeadline must be after endsAt', path: ['claimDeadline'] })
  .refine(c => c.prizes.reduce((a, b) => a + b, 0) <= c.budget, { message: 'prizes add up to more than the budget', path: ['prizes'] });

export type CompetitionInput = z.infer<typeof competitionInput>;

interface CompetitionRow {
  id: string;
  title: string;
  status: 'published' | 'finalized' | 'cancelled';
  starts_at: Date | string;
  ends_at: Date | string;
  claim_deadline: Date | string;
  country_code: string;
  currency_code: string;
  width: number;
  height: number;
  prizes: number[];
  budget: string | number;
  terms: string;
  finalized_at: Date | string | null;
}

export async function createCompetition(actor: string, input: CompetitionInput) {
  const db = await getDb();
  const currency = COUNTRIES[input.countryCode].currency;
  return db.tx(async q => {
    const [exists] = await q.query('select 1 from competitions where id = $1', [input.id]);
    if (exists) throw fail(409, 'exists', 'A competition with that id already exists.');
    await q.query(
      `insert into competitions (id, title, status, starts_at, ends_at, claim_deadline, country_code, currency_code,
                                 seed, width, height, generator_version, prizes, budget, terms)
       values ($1, $2, 'published', $3, $4, $5, $6, $7, $8, $9, $9, $10, $11, $12, $13)`,
      [input.id, input.title, input.startsAt, input.endsAt, input.claimDeadline, input.countryCode, currency,
        randomSeed(), input.size, GENERATOR_VERSION, JSON.stringify(input.prizes), input.budget, input.terms],
    );
    await audit(q, actor, 'competition.create', `competition:${input.id}`, { budget: input.budget, prizes: input.prizes, currency });
    return { id: input.id };
  });
}

function phase(c: CompetitionRow): 'upcoming' | 'open' | 'closed' | 'finalized' | 'cancelled' {
  if (c.status === 'cancelled') return 'cancelled';
  if (c.status === 'finalized') return 'finalized';
  const now = Date.now();
  if (now < new Date(c.starts_at).getTime()) return 'upcoming';
  if (now < new Date(c.ends_at).getTime()) return 'open';
  return 'closed';
}

/** Published rules; the maze seed is never part of them */
function publicRules(c: CompetitionRow) {
  return {
    id: c.id,
    title: c.title,
    phase: phase(c),
    startsAt: new Date(c.starts_at).toISOString(),
    endsAt: new Date(c.ends_at).toISOString(),
    claimDeadline: new Date(c.claim_deadline).toISOString(),
    country: COUNTRIES[c.country_code]?.name ?? c.country_code,
    countryCode: c.country_code,
    currency: c.currency_code,
    mazeSize: `${c.width}×${c.height}`,
    prizes: c.prizes.map(Number),
    rankingRule: RANKING_RULE,
    terms: c.terms,
  };
}

export async function listCompetitions() {
  const db = await getDb();
  const rows = await db.query<CompetitionRow>(
    `select * from competitions where status <> 'cancelled' and claim_deadline > now() - interval '30 days'
      order by starts_at desc limit 20`,
  );
  return rows.map(publicRules);
}

async function loadCompetition(q: Queryable, id: string, lock = false): Promise<CompetitionRow> {
  const [c] = await q.query<CompetitionRow>(`select * from competitions where id = $1${lock ? ' for update' : ''}`, [id]);
  if (!c) throw fail(404, 'not_found', 'That competition does not exist.');
  return c;
}

export async function getCompetition(id: string, viewerId: string | null) {
  const db = await getDb();
  const c = await loadCompetition(db, id);
  let me = null;
  if (viewerId) {
    const [result] = await db.query<{ rank: number; prize_amount: string }>(
      'select rank, prize_amount from competition_results where competition_id = $1 and player_id = $2', [id, viewerId]);
    const [claim] = await db.query<{ id: string; status: string; phone_masked: string | null; phone_verified_at: Date | null }>(
      'select id, status, phone_masked, phone_verified_at from reward_claims where competition_id = $1 and player_id = $2', [id, viewerId]);
    me = {
      rank: result?.rank ?? null,
      prize: result ? Number(result.prize_amount) : 0,
      claim: claim ? { id: String(claim.id), status: claim.status, phone: claim.phone_masked, phoneVerified: !!claim.phone_verified_at } : null,
    };
  }
  return { ...publicRules(c), me };
}

/** Verified runs only; names are pseudonyms; nothing here identifies a person */
export async function leaderboard(id: string, viewerId: string | null) {
  const db = await getDb();
  const c = await loadCompetition(db, id);
  if (c.status === 'finalized') {
    const rows = await db.query<{ rank: number; player_id: string; display_name: string; duration_ms: number; mistakes: number; prize_amount: string }>(
      `select r.rank, r.player_id, p.display_name, r.duration_ms, r.mistakes, r.prize_amount
         from competition_results r join players p on p.id = r.player_id
        where r.competition_id = $1 order by r.rank limit 50`, [id]);
    return {
      final: true,
      entries: rows.map(r => ({ rank: r.rank, name: r.display_name, durationMs: r.duration_ms, mistakes: r.mistakes, prize: Number(r.prize_amount), isYou: r.player_id === viewerId })),
    };
  }
  const best = await bestVerifiedRuns(db, 'competition_id', id);
  return {
    final: false,
    entries: best.map((b, i) => ({ rank: i + 1, name: b.display_name, durationMs: b.duration_ms, mistakes: b.mistakes, prize: null, isYou: b.player_id === viewerId })),
  };
}

/**
 * Closes a competition for good: ranks every player's best verified run and records the
 * prize each rank earned. Results are immutable afterwards; any dispute is handled by
 * reviewing the claim, not by re-ranking.
 */
export async function finalizeCompetition(actor: string, id: string) {
  const db = await getDb();
  return db.tx(async q => {
    const c = await loadCompetition(q, id, true);
    if (c.status !== 'published') throw fail(409, 'not_open', `Competition is ${c.status}.`);
    if (Date.now() < new Date(c.ends_at).getTime()) throw fail(409, 'still_running', 'The competition has not ended yet.');

    const best = await q.query<{ player_id: string; id: string; duration_ms: number; mistakes: number; risk_flags: string[] }>(
      `select * from (
         select distinct on (player_id) player_id, id, duration_ms, mistakes, finished_at, risk_flags
           from runs where competition_id = $1 and status = 'verified'
          order by player_id, duration_ms, mistakes, finished_at
       ) b order by duration_ms, mistakes, finished_at limit 500`, [id]);

    const prizes = c.prizes.map(Number);
    for (let i = 0; i < best.length; i++) {
      const b = best[i];
      await q.query(
        `insert into competition_results (competition_id, rank, player_id, run_id, duration_ms, mistakes, prize_amount, risk_flags)
         values ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [id, i + 1, b.player_id, b.id, b.duration_ms, b.mistakes, prizes[i] ?? 0, b.risk_flags],
      );
    }
    await q.query(`update competitions set status = 'finalized', finalized_at = now() where id = $1`, [id]);
    await audit(q, actor, 'competition.finalize', `competition:${id}`, { ranked: best.length, winners: Math.min(best.length, prizes.length) });
    return { ranked: best.length, winners: Math.min(best.length, prizes.length) };
  });
}

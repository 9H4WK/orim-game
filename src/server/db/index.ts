import 'server-only';
import { getEnv } from '../env';
import { MIGRATIONS } from './migrations';

/**
 * A small database seam over Postgres.
 * Production uses `pg` against DATABASE_URL (e.g. Neon or Vercel Postgres).
 * Local runs, Docker images without a database, and tests use PGlite, the same
 * Postgres engine compiled to WebAssembly, so every query and constraint is identical.
 */

export interface Queryable {
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;
  /** Run a parameterless script that may hold several statements */
  exec(sql: string): Promise<void>;
}

export interface Db extends Queryable {
  tx<T>(fn: (q: Queryable) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}

async function createPg(url: string): Promise<Db> {
  const { Pool } = await import('pg');
  // TLS follows the connection string (hosted Postgres URLs carry sslmode=require)
  const pool = new Pool({
    connectionString: url,
    max: 5,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 10000,
  });
  return {
    async query(sql, params) {
      const res = await pool.query(sql, params as unknown[]);
      return res.rows;
    },
    async exec(sql) {
      await pool.query(sql);
    },
    async tx(fn) {
      const client = await pool.connect();
      try {
        await client.query('begin');
        const out = await fn({
          query: async (sql, params) => (await client.query(sql, params as unknown[])).rows,
          exec: async sql => { await client.query(sql); },
        });
        await client.query('commit');
        return out;
      } catch (err) {
        await client.query('rollback').catch(() => {});
        throw err;
      } finally {
        client.release();
      }
    },
    close: () => pool.end(),
  };
}

async function createEmbedded(dataDir?: string): Promise<Db> {
  const { PGlite } = await import('@electric-sql/pglite');
  const pg = dataDir ? new PGlite(dataDir) : new PGlite();
  await pg.waitReady;
  const run = async <T,>(q: { query: typeof pg.query }, sql: string, params?: unknown[]) =>
    (await q.query<T>(sql, params as unknown[])).rows;
  return {
    query: (sql, params) => run(pg, sql, params),
    exec: async sql => { await pg.exec(sql); },
    tx: fn => pg.transaction(t => fn({
      query: (sql, params) => run(t, sql, params),
      exec: async sql => { await t.exec(sql); },
    })),
    close: () => pg.close(),
  };
}

async function migrate(db: Db) {
  await db.tx(async q => {
    await q.query(`create table if not exists schema_migrations (
      id int primary key, name text not null, applied_at timestamptz not null default now())`);
    // Serialise concurrent cold starts
    await q.query('select pg_advisory_xact_lock(424242)');
    const done = new Set((await q.query<{ id: number }>('select id from schema_migrations')).map(r => r.id));
    for (const m of MIGRATIONS) {
      if (done.has(m.id)) continue;
      await q.exec(m.sql);
      await q.query('insert into schema_migrations (id, name) values ($1, $2)', [m.id, m.name]);
    }
  });
}

let ready: Promise<Db> | null = null;

export function getDb(): Promise<Db> {
  if (!ready) {
    ready = (async () => {
      const env = getEnv();
      const mode = env.ORIM_DB ?? (env.DATABASE_URL ? 'postgres' : 'embedded');
      const db =
        mode === 'postgres' && env.DATABASE_URL ? await createPg(env.DATABASE_URL)
        : mode === 'memory' ? await createEmbedded()
        : await createEmbedded(env.ORIM_DATA_DIR ?? '.orim-data');
      await migrate(db);
      return db;
    })();
    // A failed connection must not poison every later request
    ready.catch(() => { ready = null; });
  }
  return ready;
}

export async function resetDbForTests() {
  if (ready) {
    const db = await ready.catch(() => null);
    ready = null;
    await db?.close();
  }
}

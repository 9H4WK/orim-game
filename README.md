# ORIM

A pixel maze game. Your hero runs the corridors on their own; you choose the turn at every fork. Fewer wrong turns, more stars.

- **100 stages** across five worlds, then an endless infinite run
- **Items**: hats, armour and relics, unlocked with coins earned in play or found hidden in the mazes
- **Draw your own maze** and run it yourself to prove it can be escaped
- **Challenge a friend** to the exact same maze, by link or by SMS through Africa’s Talking, and compare server-verified times
- **Competitions**: published, time-boxed races on one shared maze, with verified leaderboards and optional airtime prizes through Africa’s Talking

Casual play needs no account, no wallet and no phone number. Progress is saved in the browser.

## Africa’s Talking integration

| Product | How ORIM uses it |
| --- | --- |
| **SMS** | Challenge invitations to friends who agreed to receive one; one-time codes that prove a prize winner owns their number; delivery reports; STOP replies |
| **Airtime** | Prizes for verified competition winners, sent only after admin approval, with an idempotency key, status callbacks, transaction-status reconciliation and a validation callback |

All provider calls run server-side through `src/server/provider/`, using the official `africastalking` Node.js SDK. Credentials never reach the browser. Without credentials, a clearly marked mock provider sends nothing.

Setup, callbacks, the admin runbook and the sandbox-to-live checklist are in **[docs/africas-talking.md](docs/africas-talking.md)**. Marketplace packaging is in **[docs/marketplace.md](docs/marketplace.md)**.

## How fair results work

Challenge and competition mazes are defined on the server by `{seed, width, height, generatorVersion}`, so every player regenerates the identical layout, today or after a redeploy. A run starts with a server-issued id and one-time nonce. When the hero reaches the exit, the browser sends the path it walked; the server replays it against the stored maze (walls, adjacency, start, exit), recounts wrong turns, and times the run with its own clock. Implausibly fast runs are rejected; borderline ones are flagged for review before any prize.

This makes cheating much harder, not impossible: a bot driving a real browser can still play. That is why prizes also need phone verification, risk review and an administrator’s approval.

## Running locally

```bash
npm install
cp .env.example .env.local   # optional: works without any settings, using the mock provider
npm run dev
```

With no `DATABASE_URL`, ORIM uses embedded Postgres (PGlite) stored in `./.orim-data`. To try SMS challenges locally, set `ENABLE_SMS_CHALLENGES=true`; the mock provider prints messages to the server console in development.

```bash
npm test          # Vitest: gameplay rules, challenges, SMS safeguards, competitions, payouts, saved-progress migration
npm run lint
npm run typecheck
npm run build
```

Tests run against in-memory Postgres and the mock provider. They never send SMS or airtime.

## Deploying

- **Vercel**: set `DATABASE_URL` (e.g. Neon, with `sslmode=require`), `ORIM_SECRET` and the Africa’s Talking variables. Migrations run automatically on first request.
- **Docker / Africa’s Talking Marketplace**: `docker build -t orim .` then `docker run -p 3000:3000 -v orim-data:/data -e ORIM_SECRET=… orim`.

`ENABLE_SMS_CHALLENGES` and `ENABLE_AIRTIME_PAYOUTS` are off by default everywhere. Live airtime additionally needs `AIRTIME_LIVE_APPROVED=true`.

## Project layout

```
src/app/                 pages and API routes (Next.js App Router)
src/app/api/             challenges, runs, competitions, rewards, internal (admin), webhooks
src/server/              server-only: env validation, database, identity, rate limits, services
src/server/provider/     Africa’s Talking adapter and mock
src/lib/maze/            maze generation, seeded shared mazes, path verification
src/lib/store/           saved progress (zustand, versioned)
tests/                   Vitest suites
```

## Saved progress

Progress lives in the browser under `orim-player`. Version 1 of that save removed the old wallet field and kept everything else (stages, stars, coins, items, equipment, hero, drawn mazes). Items that once cost SOL or USDC are now unlocked with coins; anything already owned stays owned.

Coins are a game currency only. They are never exchanged for airtime or money.

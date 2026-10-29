/**
 * Schema migrations, applied in order and recorded in schema_migrations.
 * Never edit a shipped migration; append a new one.
 */
export const MIGRATIONS: { id: number; name: string; sql: string }[] = [
  {
    id: 1,
    name: 'online_play_and_rewards',
    sql: `
create table players (
  id uuid primary key,
  display_name text not null,
  created_at timestamptz not null default now()
);

create table challenges (
  id bigserial primary key,
  token text not null unique,
  creator_id uuid not null references players(id),
  seed bigint not null check (seed >= 0 and seed <= 4294967295),
  width int not null check (width between 5 and 50),
  height int not null check (height between 5 and 50),
  generator_version int not null,
  source_stage int,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table competitions (
  id text primary key check (id ~ '^[a-z0-9-]{3,48}$'),
  title text not null,
  status text not null check (status in ('published', 'finalized', 'cancelled')),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  claim_deadline timestamptz not null,
  country_code text not null,
  currency_code text not null,
  seed bigint not null check (seed >= 0 and seed <= 4294967295),
  width int not null check (width between 5 and 50),
  height int not null check (height between 5 and 50),
  generator_version int not null,
  prizes jsonb not null,
  budget numeric(12, 2) not null check (budget >= 0),
  terms text not null,
  created_at timestamptz not null default now(),
  finalized_at timestamptz,
  check (ends_at > starts_at and claim_deadline > ends_at)
);

create table runs (
  id uuid primary key,
  player_id uuid not null references players(id),
  challenge_id bigint references challenges(id),
  competition_id text references competitions(id),
  nonce_hash text not null,
  seed bigint not null,
  width int not null,
  height int not null,
  generator_version int not null,
  status text not null check (status in ('started', 'verified', 'rejected')),
  started_at timestamptz not null default now(),
  expires_at timestamptz not null,
  finished_at timestamptz,
  duration_ms int,
  mistakes int,
  steps int,
  client_elapsed_ms int,
  reject_reason text,
  risk_flags text[] not null default '{}',
  path jsonb,
  check ((challenge_id is null) <> (competition_id is null))
);
create index runs_challenge_idx on runs (challenge_id, status);
create index runs_competition_idx on runs (competition_id, status);
create index runs_player_idx on runs (player_id, started_at);

create table sms_optouts (
  phone_hash text primary key,
  source text not null,
  created_at timestamptz not null default now()
);

create table sms_invitations (
  id bigserial primary key,
  challenge_id bigint not null references challenges(id),
  sender_id uuid not null references players(id),
  recipient_hash text not null,
  recipient_masked text not null,
  consent_basis text not null,
  consent_at timestamptz not null,
  status text not null check (status in ('requested', 'accepted', 'delivered', 'failed', 'unknown')),
  provider_message_id text unique,
  provider_status text,
  failure_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (challenge_id, recipient_hash)
);

create table rate_events (
  id bigserial primary key,
  bucket text not null,
  created_at timestamptz not null default now()
);
create index rate_events_bucket_idx on rate_events (bucket, created_at);

create table competition_results (
  competition_id text not null references competitions(id),
  rank int not null check (rank > 0),
  player_id uuid not null references players(id),
  run_id uuid not null references runs(id),
  duration_ms int not null,
  mistakes int not null,
  prize_amount numeric(12, 2) not null default 0,
  risk_flags text[] not null default '{}',
  primary key (competition_id, rank),
  unique (competition_id, player_id)
);

create table reward_claims (
  id bigserial primary key,
  competition_id text not null references competitions(id),
  player_id uuid not null references players(id),
  rank int not null,
  amount numeric(12, 2) not null check (amount > 0),
  currency_code text not null,
  country_code text not null,
  status text not null check (status in ('pending', 'approved', 'processing', 'succeeded', 'failed', 'review_required')),
  phone_hash text,
  phone_encrypted text,
  phone_masked text,
  phone_verified_at timestamptz,
  otp_hash text,
  otp_phone_hash text,
  otp_phone_encrypted text,
  otp_expires_at timestamptz,
  otp_attempts int not null default 0,
  risk_flags text[] not null default '{}',
  approved_by text,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (competition_id, player_id)
);
-- One verified phone number can collect at most one prize per competition
create unique index reward_claims_phone_idx on reward_claims (competition_id, phone_hash) where phone_hash is not null;

create table payouts (
  id bigserial primary key,
  claim_id bigint not null unique references reward_claims(id),
  idempotency_key text not null unique,
  amount numeric(12, 2) not null,
  currency_code text not null,
  status text not null check (status in ('processing', 'succeeded', 'failed', 'review_required')),
  provider text not null,
  provider_request_id text unique,
  provider_status text,
  provider_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table audit_events (
  id bigserial primary key,
  actor text not null,
  action text not null,
  subject text,
  detail jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index audit_events_subject_idx on audit_events (subject, created_at);
`,
  },
];

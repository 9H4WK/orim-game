/**
 * Browser-side calls to ORIM's own API. No provider credentials or phone logic live here;
 * the browser only ever talks to /api routes, which call Africa's Talking server-side.
 */

import type { SeededMazeSpec } from '@/lib/maze/seeded';
import type { PathPoint } from '@/lib/maze/verify';

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}

const TIMEOUT_MS = 12_000;

async function call<T>(path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(path, {
      method: init?.method ?? (init?.body ? 'POST' : 'GET'),
      headers: init?.body ? { 'Content-Type': 'application/json' } : undefined,
      body: init?.body ? JSON.stringify(init.body) : undefined,
      credentials: 'same-origin',
      signal: ctrl.signal,
    });
  } catch {
    throw new ApiError(0, 'offline', 'ORIM could not reach the server. Check your connection and try again.');
  } finally {
    clearTimeout(timer);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data.error ?? 'error', data.message ?? 'Something went wrong.');
  return data as T;
}

export interface ChallengeInfo {
  token: string;
  width: number;
  height: number;
  expiresAt: string;
  expired: boolean;
  creatorName: string;
  isCreator: boolean;
  smsEnabled: boolean;
  invitations: { recipient: string; status: 'requested' | 'accepted' | 'delivered' | 'failed' | 'unknown'; sentAt: string }[];
}

export interface VerifiedResult { durationMs: number; mistakes: number; finishedAt: string }

export interface ChallengeResults {
  participants: (VerifiedResult & { rank: number; name: string; isYou: boolean; isCreator: boolean })[];
  comparison: { you: VerifiedResult | null; them: (VerifiedResult & { name: string }) | null; outcome: 'win' | 'lose' | 'tie' | 'pending' };
}

export type RunStart = { runId: string; nonce: string; maze: SeededMazeSpec };
export type RunFinish =
  | { status: 'verified'; durationMs: number; mistakes: number; steps: number; underReview: boolean }
  | { status: 'rejected'; reason: string };

export interface Competition {
  id: string;
  title: string;
  phase: 'upcoming' | 'open' | 'closed' | 'finalized' | 'cancelled';
  startsAt: string;
  endsAt: string;
  claimDeadline: string;
  country: string;
  countryCode: string;
  currency: string;
  mazeSize: string;
  prizes: number[];
  rankingRule: string;
  terms: string;
  me?: {
    rank: number | null;
    prize: number;
    claim: { id: string; status: ClaimStatus; phone: string | null; phoneVerified: boolean } | null;
  } | null;
}

export type ClaimStatus = 'pending' | 'approved' | 'processing' | 'succeeded' | 'failed' | 'review_required';

export interface Leaderboard {
  final: boolean;
  entries: { rank: number; name: string; durationMs: number; mistakes: number; prize: number | null; isYou: boolean }[];
}

export const api = {
  createChallenge: (stage: number) => call<{ token: string; expiresAt: string }>('/api/challenges', { body: { stage } }),
  challenge: (token: string) => call<ChallengeInfo>(`/api/challenges/${encodeURIComponent(token)}`),
  challengeResults: (token: string) => call<ChallengeResults>(`/api/challenges/${encodeURIComponent(token)}/results`),
  sendInvite: (token: string, phoneNumber: string) =>
    call<{ status: 'accepted' | 'failed' | 'unknown'; recipient: string }>('/api/challenges/send', { body: { token, phoneNumber, consent: true } }),

  startRun: (target: { challengeToken: string } | { competitionId: string }) => call<RunStart>('/api/runs/start', { body: target }),
  finishRun: (body: { runId: string; nonce: string; path: PathPoint[]; clientElapsedMs: number; clientMistakes: number }) =>
    call<RunFinish>('/api/runs/finish', { body }),

  competitions: () => call<{ competitions: Competition[] }>('/api/competitions'),
  competition: (id: string) => call<Competition>(`/api/competitions/${encodeURIComponent(id)}`),
  leaderboard: (id: string) => call<Leaderboard>(`/api/competitions/${encodeURIComponent(id)}/leaderboard`),
  claim: (competitionId: string) => call<{ id: string; status: ClaimStatus }>('/api/rewards/claim', { body: { competitionId } }),
  sendCode: (claimId: string, phoneNumber: string) =>
    call<{ sentTo: string }>('/api/rewards/verify-phone', { body: { action: 'send', claimId, phoneNumber } }),
  confirmCode: (claimId: string, code: string) =>
    call<{ status: ClaimStatus; phone: string }>('/api/rewards/verify-phone', { body: { action: 'confirm', claimId, code } }),
  optOut: (phoneNumber: string) => call<{ ok: true }>('/api/sms/optout', { body: { phoneNumber } }),
};

/** Wording that never overstates what happened */
export const INVITE_STATUS: Record<ChallengeInfo['invitations'][number]['status'], string> = {
  requested: 'Sending…',
  accepted: 'Text sent, waiting for delivery',
  delivered: 'Delivered',
  failed: 'Could not be delivered',
  unknown: 'Status unknown',
};

export const PHASE_LABEL: Record<Competition['phase'], string> = {
  upcoming: 'Opens soon',
  open: 'Open now',
  closed: 'Closed · results pending',
  finalized: 'Results final',
  cancelled: 'Cancelled',
};

export const CLAIM_STATUS: Record<ClaimStatus, string> = {
  pending: 'Claim received. Waiting for review.',
  approved: 'Approved. Airtime will be sent soon.',
  processing: 'Airtime sent to the network. Waiting for confirmation.',
  succeeded: 'Airtime confirmed by the network.',
  failed: 'The airtime transfer failed. We will be in touch.',
  review_required: 'We are checking this transfer by hand.',
};

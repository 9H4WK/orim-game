/**
 * The one ranking rule for challenges and competitions, announced before play:
 * faster verified time wins; then fewer wrong turns; then whoever finished first.
 */

export interface RankedResult {
  durationMs: number;
  mistakes: number;
  finishedAt: string | number | Date;
}

export function compareResults(a: RankedResult, b: RankedResult): number {
  if (a.durationMs !== b.durationMs) return a.durationMs - b.durationMs;
  if (a.mistakes !== b.mistakes) return a.mistakes - b.mistakes;
  return new Date(a.finishedAt).getTime() - new Date(b.finishedAt).getTime();
}

/** A tie means the same time and the same wrong turns; finishing order only breaks ranks, not ties */
export function headToHead(you: RankedResult | null, them: RankedResult | null): 'win' | 'lose' | 'tie' | 'pending' {
  if (!you || !them) return 'pending';
  if (you.durationMs === them.durationMs && you.mistakes === them.mistakes) return 'tie';
  return compareResults(you, them) < 0 ? 'win' : 'lose';
}

export const RANKING_RULE = 'Fastest verified time wins. Ties go to fewer wrong turns, then to whoever finished first.';

export function formatMs(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60).toString().padStart(2, '0');
  const sec = (totalSec % 60).toString().padStart(2, '0');
  const cs = Math.floor((ms % 1000) / 10).toString().padStart(2, '0');
  return `${min}:${sec}.${cs}`;
}

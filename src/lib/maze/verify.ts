/**
 * ORIM — Run verification.
 *
 * Replays a submitted path against the exact maze and recomputes the result,
 * so the server never trusts the browser's own count of wrong turns.
 * The rules mirror the game loop in app/game/[stage]/page.tsx:
 *   - the hero moves one cell at a time and cannot pass through walls
 *   - arriving at a dead end (one open side inside the maze) is a wrong turn
 *   - the run ends the moment the hero reaches the exit cell
 */

import type { Cell, MazeData } from './generator';

export interface PathPoint { x: number; y: number }

export type PathVerdict =
  | { ok: true; steps: number; mistakes: number }
  | { ok: false; reason: PathRejection };

export type PathRejection =
  | 'path_too_short'
  | 'path_too_long'
  | 'bad_start'
  | 'out_of_bounds'
  | 'not_adjacent'
  | 'through_wall'
  | 'did_not_finish'
  | 'continued_after_exit';

/** Generous cap: a legal run rarely visits each cell more than a few times */
export function maxPathLength(maze: MazeData): number {
  return maze.width * maze.height * 4 + 1;
}

function openInside(maze: MazeData, cell: Cell): number {
  let n = 0;
  if (!cell.walls.top && cell.y > 0) n++;
  if (!cell.walls.bottom && cell.y < maze.height - 1) n++;
  if (!cell.walls.left && cell.x > 0) n++;
  if (!cell.walls.right && cell.x < maze.width - 1) n++;
  return n;
}

function blocked(from: Cell, dx: number, dy: number): boolean {
  if (dx === 1) return from.walls.right;
  if (dx === -1) return from.walls.left;
  if (dy === 1) return from.walls.bottom;
  return from.walls.top;
}

export function verifyPath(maze: MazeData, path: PathPoint[]): PathVerdict {
  if (path.length < 2) return { ok: false, reason: 'path_too_short' };
  if (path.length > maxPathLength(maze)) return { ok: false, reason: 'path_too_long' };

  const exitX = maze.width - 1;
  const exitY = maze.height - 1;
  const inBounds = (p: PathPoint) =>
    Number.isInteger(p.x) && Number.isInteger(p.y) &&
    p.x >= 0 && p.y >= 0 && p.x < maze.width && p.y < maze.height;

  if (!inBounds(path[0])) return { ok: false, reason: 'out_of_bounds' };
  if (path[0].x !== 0 || path[0].y !== 0) return { ok: false, reason: 'bad_start' };

  let mistakes = 0;
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1];
    const b = path[i];
    if (!inBounds(b)) return { ok: false, reason: 'out_of_bounds' };
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    if (Math.abs(dx) + Math.abs(dy) !== 1) return { ok: false, reason: 'not_adjacent' };
    if (blocked(maze.grid[a.y][a.x], dx, dy)) return { ok: false, reason: 'through_wall' };

    const atExit = b.x === exitX && b.y === exitY;
    if (atExit && i !== path.length - 1) return { ok: false, reason: 'continued_after_exit' };
    if (!atExit && openInside(maze, maze.grid[b.y][b.x]) === 1) mistakes++;
  }

  const last = path[path.length - 1];
  if (last.x !== exitX || last.y !== exitY) return { ok: false, reason: 'did_not_finish' };

  return { ok: true, steps: path.length - 1, mistakes };
}

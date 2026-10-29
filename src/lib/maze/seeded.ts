/**
 * ORIM — Seeded mazes for challenges and competitions.
 *
 * A shared maze is defined only by { seed, width, height, version }, stored on the server.
 * Both players regenerate the identical layout from that record, so a link opened
 * tomorrow, or after a new deployment, still shows the same walls.
 *
 * Version 1 is frozen: if wilsonsAlgorithm or the start/exit rules ever change,
 * add a version 2 branch here instead of editing version 1 behaviour.
 */

import {
  createRng,
  findJunctions,
  findSolutionPath,
  getStageDimensions,
  wilsonsAlgorithm,
  type MazeData,
} from './generator';

export const GENERATOR_VERSION = 1;
export const SUPPORTED_GENERATOR_VERSIONS = [1] as const;

export interface SeededMazeSpec {
  seed: number;
  width: number;
  height: number;
  version: number;
}

export const MIN_MAZE_SIZE = 5;
export const MAX_MAZE_SIZE = 50;

export function isValidSpec(spec: SeededMazeSpec): boolean {
  return (
    Number.isInteger(spec.seed) && spec.seed >= 0 && spec.seed <= 0xffffffff &&
    Number.isInteger(spec.width) && spec.width >= MIN_MAZE_SIZE && spec.width <= MAX_MAZE_SIZE &&
    Number.isInteger(spec.height) && spec.height >= MIN_MAZE_SIZE && spec.height <= MAX_MAZE_SIZE &&
    (SUPPORTED_GENERATOR_VERSIONS as readonly number[]).includes(spec.version)
  );
}

/** Shared mazes carry no hidden items, so a replayable link cannot be farmed for loot */
export function generateSeededMaze(spec: SeededMazeSpec): MazeData {
  if (!isValidSpec(spec)) throw new Error('Unsupported maze definition');

  const { seed, width, height } = spec;
  const rng = createRng(seed);
  const grid = wilsonsAlgorithm(width, height, rng);

  grid[0][0].isStart = true;
  grid[height - 1][width - 1].isEnd = true;
  grid[0][0].walls.left = false;
  grid[height - 1][width - 1].walls.right = false;

  const solution = findSolutionPath(grid, 0, 0, width - 1, height - 1);
  const junctions = findJunctions(grid);
  return { grid, width, height, junctions, solution };
}

/** Size a challenge like the stage it was sent from; infinite runs use the stage-100 size */
export function challengeSizeForStage(stage: number): { width: number; height: number } {
  const s = Number.isInteger(stage) ? Math.min(Math.max(stage, 1), 100) : 1;
  return getStageDimensions(s);
}

/** Stable fingerprint of a layout, used to prove two players saw the same walls */
export function mazeFingerprint(maze: MazeData): string {
  let h = 0x811c9dc5;
  for (const row of maze.grid) {
    for (const c of row) {
      const bits =
        (c.walls.top ? 1 : 0) | (c.walls.right ? 2 : 0) |
        (c.walls.bottom ? 4 : 0) | (c.walls.left ? 8 : 0) |
        (c.isStart ? 16 : 0) | (c.isEnd ? 32 : 0) | (c.hasEasterEgg ? 64 : 0);
      h ^= bits;
      h = Math.imul(h, 0x01000193) >>> 0;
    }
  }
  return `${maze.width}x${maze.height}:${h.toString(16).padStart(8, '0')}`;
}

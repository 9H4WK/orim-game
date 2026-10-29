import { describe, expect, it } from 'vitest';
import { generateMaze, getStageDimensions } from '@/lib/maze/generator';
import { challengeSizeForStage, generateSeededMaze, GENERATOR_VERSION, isValidSpec, mazeFingerprint } from '@/lib/maze/seeded';
import { verifyPath } from '@/lib/maze/verify';

const spec = { seed: 123456789, width: 11, height: 11, version: GENERATOR_VERSION };

describe('seeded challenge mazes', () => {
  it('two players regenerate the identical layout from the stored definition', () => {
    const a = generateSeededMaze(spec);
    const b = generateSeededMaze({ ...spec });
    expect(JSON.stringify(a.grid)).toEqual(JSON.stringify(b.grid));
    expect(a.solution).toEqual(b.solution);
    expect(a.grid[0][0].isStart).toBe(true);
    expect(a.grid[10][10].isEnd).toBe(true);
  });

  it('version 1 is frozen: this fingerprint must never change', () => {
    // If this fails, the generator changed. Old challenge links would show different walls.
    // Restore version 1 behaviour and put the change behind GENERATOR_VERSION 2 instead.
    expect(mazeFingerprint(generateSeededMaze(spec))).toBe(GOLDEN_V1);
  });

  it('different seeds give different mazes', () => {
    expect(mazeFingerprint(generateSeededMaze(spec))).not.toBe(mazeFingerprint(generateSeededMaze({ ...spec, seed: 42 })));
  });

  it('places no hidden items, so links cannot be farmed for loot', () => {
    expect(generateSeededMaze(spec).grid.flat().some(c => c.hasEasterEgg)).toBe(false);
  });

  it('rejects unknown versions and out-of-range sizes', () => {
    expect(isValidSpec({ ...spec, version: 99 })).toBe(false);
    expect(isValidSpec({ ...spec, width: 4 })).toBe(false);
    expect(isValidSpec({ ...spec, seed: -1 })).toBe(false);
    expect(() => generateSeededMaze({ ...spec, version: 2 })).toThrow();
  });

  it('sizes challenges like the stage they came from', () => {
    expect(challengeSizeForStage(1)).toEqual(getStageDimensions(1));
    expect(challengeSizeForStage(37)).toEqual(getStageDimensions(37));
    expect(challengeSizeForStage(250)).toEqual(getStageDimensions(100));
  });
});

describe('campaign generation is unchanged', () => {
  it('still produces a fresh solvable maze with loot per run', () => {
    const m = generateMaze(5, undefined, ['egg_ghost', 'egg_rainbow']);
    expect(m.width).toBe(getStageDimensions(5).width);
    expect(m.solution[0]).toEqual({ x: 0, y: 0 });
    expect(m.solution.at(-1)).toEqual({ x: m.width - 1, y: m.height - 1 });
  });

  it('is deterministic when given a seed', () => {
    expect(mazeFingerprint(generateMaze(9, 777))).toBe(mazeFingerprint(generateMaze(9, 777)));
  });
});

describe('path verification', () => {
  const maze = generateSeededMaze(spec);
  const solution = maze.solution.map(p => ({ x: p.x, y: p.y }));

  it('accepts the real solution with zero wrong turns', () => {
    expect(verifyPath(maze, solution)).toEqual({ ok: true, steps: solution.length - 1, mistakes: 0 });
  });

  it('counts each dead end visited as a wrong turn, like the game does', () => {
    // Find a dead end next to the solution and detour into it and back
    for (let i = 0; i < solution.length - 1; i++) {
      const p = solution[i];
      const cell = maze.grid[p.y][p.x];
      const dirs = [
        { dx: 0, dy: -1, open: !cell.walls.top }, { dx: 1, dy: 0, open: !cell.walls.right },
        { dx: 0, dy: 1, open: !cell.walls.bottom }, { dx: -1, dy: 0, open: !cell.walls.left },
      ];
      for (const d of dirs) {
        const n = { x: p.x + d.dx, y: p.y + d.dy };
        if (!d.open || n.x < 0 || n.y < 0 || n.x >= maze.width || n.y >= maze.height) continue;
        if (solution.some(s => s.x === n.x && s.y === n.y)) continue;
        const nc = maze.grid[n.y][n.x];
        const open = [!nc.walls.top && n.y > 0, !nc.walls.bottom && n.y < maze.height - 1, !nc.walls.left && n.x > 0, !nc.walls.right && n.x < maze.width - 1].filter(Boolean).length;
        if (open !== 1) continue;
        const detour = [...solution.slice(0, i + 1), n, p, ...solution.slice(i + 1)];
        expect(verifyPath(maze, detour)).toEqual({ ok: true, steps: detour.length - 1, mistakes: 1 });
        return;
      }
    }
    throw new Error('test maze has no dead end beside the solution');
  });

  it('rejects walking through a wall', () => {
    const cell = maze.grid[0][0];
    const blocked = cell.walls.right ? { x: 1, y: 0 } : { x: 0, y: 1 };
    expect(verifyPath(maze, [{ x: 0, y: 0 }, blocked, ...solution.slice(1)])).toMatchObject({ ok: false });
    const res = verifyPath(maze, [{ x: 0, y: 0 }, blocked]);
    expect(res).toEqual({ ok: false, reason: 'through_wall' });
  });

  it('rejects teleporting, wrong starts, unfinished and padded runs', () => {
    expect(verifyPath(maze, [{ x: 0, y: 0 }, { x: 10, y: 10 }])).toEqual({ ok: false, reason: 'not_adjacent' });
    expect(verifyPath(maze, solution.slice(1))).toEqual({ ok: false, reason: 'bad_start' });
    expect(verifyPath(maze, solution.slice(0, -1))).toEqual({ ok: false, reason: 'did_not_finish' });
    const prev = solution[solution.length - 2];
    expect(verifyPath(maze, [...solution, prev, solution.at(-1)!])).toEqual({ ok: false, reason: 'continued_after_exit' });
    expect(verifyPath(maze, [{ x: 0, y: 0 }, { x: -1, y: 0 }])).toEqual({ ok: false, reason: 'out_of_bounds' });
    expect(verifyPath(maze, [{ x: 0, y: 0 }])).toEqual({ ok: false, reason: 'path_too_short' });
  });

  it('caps path length', () => {
    const long = Array.from({ length: 11 * 11 * 4 + 2 }, () => ({ x: 0, y: 0 }));
    expect(verifyPath(maze, long)).toEqual({ ok: false, reason: 'path_too_long' });
  });
});

const GOLDEN_V1 = '11x11:73113103';

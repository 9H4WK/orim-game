/**
 * ORIM — Maze Generator
 * Uses Wilson's Algorithm (Loop-erased Random Walk) for perfect maze generation.
 * The seed parameter allows deterministic generation from VRF randomness.
 */

export interface Cell {
  x: number;
  y: number;
  walls: { top: boolean; right: boolean; bottom: boolean; left: boolean };
  visited: boolean;
  isStart: boolean;
  isEnd: boolean;
  hasEasterEgg: boolean;
  easterEggId?: string;
}

export interface MazeData {
  grid: Cell[][];
  width: number;
  height: number;
  junctions: { x: number; y: number }[]; // decision points
  solution: { x: number; y: number }[];   // optimal path
}

/** Seeded pseudo-random number generator (mulberry32) */
export function createRng(seed: number) {
  let s = seed;
  return () => {
    s |= 0;
    s = s + 0x6d2b79f5 | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = t + Math.imul(t ^ (t >>> 7), 61 | t) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Derive a numeric seed from a 32-byte VRF result */
export function vrfSeedToNumber(vrfBytes: number[]): number {
  return (
    (vrfBytes[0] << 24) |
    (vrfBytes[1] << 16) |
    (vrfBytes[2] << 8)  |
     vrfBytes[3]
  );
}

/** Get stage dimensions based on stage number */
export function getStageDimensions(stage: number): { width: number; height: number } {
  // Stage 1: 7×7 → Stage 100: 50×50
  const base = 7;
  const growth = Math.floor((stage - 1) / 4);
  const size = Math.min(base + growth * 3, 50);
  return { width: size, height: size };
}

function createCell(x: number, y: number): Cell {
  return {
    x, y,
    walls: { top: true, right: true, bottom: true, left: true },
    visited: false,
    isStart: false,
    isEnd: false,
    hasEasterEgg: false,
  };
}

function removeWall(a: Cell, b: Cell) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  if (dx === 1)  { a.walls.right  = false; b.walls.left   = false; }
  if (dx === -1) { a.walls.left   = false; b.walls.right  = false; }
  if (dy === 1)  { a.walls.bottom = false; b.walls.top    = false; }
  if (dy === -1) { a.walls.top    = false; b.walls.bottom = false; }
}

function getNeighbors(grid: Cell[][], x: number, y: number): Cell[] {
  const neighbors: Cell[] = [];
  const { width, height } = { width: grid[0].length, height: grid.length };
  if (y > 0)          neighbors.push(grid[y - 1][x]);
  if (x < width - 1)  neighbors.push(grid[y][x + 1]);
  if (y < height - 1) neighbors.push(grid[y + 1][x]);
  if (x > 0)          neighbors.push(grid[y][x - 1]);
  return neighbors;
}

/**
 * Wilson's Algorithm — generates a uniform spanning tree (perfect maze)
 */
function wilsonsAlgorithm(width: number, height: number, rng: () => number): Cell[][] {
  const grid: Cell[][] = Array.from({ length: height }, (_, y) =>
    Array.from({ length: width }, (_, x) => createCell(x, y))
  );

  // Mark random starting cell as visited
  const startX = Math.floor(rng() * width);
  const startY = Math.floor(rng() * height);
  grid[startY][startX].visited = true;
  let unvisited = width * height - 1;

  while (unvisited > 0) {
    // Pick a random unvisited cell
    let ux: number, uy: number;
    do {
      ux = Math.floor(rng() * width);
      uy = Math.floor(rng() * height);
    } while (grid[uy][ux].visited);

    // Walk from this cell until hitting a visited one (loop-erased)
    const path: { x: number; y: number }[] = [{ x: ux, y: uy }];
    const pathSet = new Map<string, number>();
    pathSet.set(`${ux},${uy}`, 0);

    let cx = ux, cy = uy;
    let iterations = 0;
    while (!grid[cy][cx].visited && iterations < 10000) {
      iterations++;
      const neighbors = getNeighbors(grid, cx, cy);
      const next = neighbors[Math.floor(rng() * neighbors.length)];
      const key = `${next.x},${next.y}`;

      if (pathSet.has(key)) {
        // Loop detected — erase the loop
        const loopIdx = pathSet.get(key)!;
        while (path.length > loopIdx + 1) {
          const removed = path.pop()!;
          pathSet.delete(`${removed.x},${removed.y}`);
        }
      } else {
        path.push({ x: next.x, y: next.y });
        pathSet.set(key, path.length - 1);
      }
      cx = path[path.length - 1].x;
      cy = path[path.length - 1].y;
    }

    // Carve path
    for (let i = 0; i < path.length - 1; i++) {
      const from = grid[path[i].y][path[i].x];
      const to   = grid[path[i + 1].y][path[i + 1].x];
      removeWall(from, to);
      if (!from.visited) { from.visited = true; unvisited--; }
    }
  }

  return grid;
}

/** BFS to find shortest path from start to end */
function findSolutionPath(
  grid: Cell[][],
  startX: number, startY: number,
  endX: number, endY: number
): { x: number; y: number }[] {
  const height = grid.length;
  const width  = grid[0].length;
  const visited = Array.from({ length: height }, () => Array(width).fill(false));
  const prev = Array.from({ length: height }, () => Array<{ x: number; y: number } | null>(width).fill(null));
  const queue: { x: number; y: number }[] = [{ x: startX, y: startY }];
  visited[startY][startX] = true;

  while (queue.length > 0) {
    const { x, y } = queue.shift()!;
    if (x === endX && y === endY) break;

    const cell = grid[y][x];
    const dirs = [
      { dx: 0, dy: -1, wall: 'top' as const },
      { dx: 1, dy: 0,  wall: 'right' as const },
      { dx: 0, dy: 1,  wall: 'bottom' as const },
      { dx: -1, dy: 0, wall: 'left' as const },
    ];

    for (const { dx, dy, wall } of dirs) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
      if (cell.walls[wall]) continue;
      if (visited[ny][nx]) continue;
      visited[ny][nx] = true;
      prev[ny][nx] = { x, y };
      queue.push({ x: nx, y: ny });
    }
  }

  // Reconstruct path
  const path: { x: number; y: number }[] = [];
  let cur: { x: number; y: number } | null = { x: endX, y: endY };
  while (cur) {
    path.unshift(cur);
    cur = prev[cur.y][cur.x];
  }
  return path;
}

/** Find junction cells (cells with 3+ open passages) */
function findJunctions(grid: Cell[][]): { x: number; y: number }[] {
  const junctions: { x: number; y: number }[] = [];
  for (const row of grid) {
    for (const cell of row) {
      const openSides = Object.values(cell.walls).filter(w => !w).length;
      if (openSides >= 3) {
        junctions.push({ x: cell.x, y: cell.y });
      }
    }
  }
  return junctions;
}

/** Simple string hash to number for seeding */
export function stringToSeed(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * Sovereign Maze Generator — generates a unique, permanent maze layout 
 * based on the Labyrinth's Core Identity address.
 */
export function generateSovereignMaze(
  assetAddress: string,
  mood: string = 'Neutral'
): MazeData {
  // Use address as base seed
  const baseSeed = stringToSeed(assetAddress);
  
  // Dimensions scale with mood or can be fixed for "Sovereign" class
  // Let's use a standard 25x25 for Sovereign labyrinths
  const width = 25;
  const height = 25;
  
  const rng = createRng(baseSeed);
  const grid = wilsonsAlgorithm(width, height, rng);
  
  grid[0][0].isStart = true;
  grid[height - 1][width - 1].isEnd = true;
  grid[0][0].walls.left = false;
  grid[height - 1][width - 1].walls.right = false;

  const solution = findSolutionPath(grid, 0, 0, width - 1, height - 1);
  const junctions = findJunctions(grid);

  return { grid, width, height, junctions, solution };
}

/**
 * Main generator — combines Wilson's algorithm with VRF seed for onchain fairness.
 * Falls back to client seed if VRF bytes not available.
 */
export function generateMaze(
  stage: number,
  vrfBytes?: number[],
  easterEggIds?: string[]
): MazeData {
  const { width, height } = getStageDimensions(stage);

  // Create seed from VRF or timestamp fallback
  let seed: number;
  if (vrfBytes && vrfBytes.length >= 4) {
    seed = vrfSeedToNumber(vrfBytes);
  } else {
    seed = (Date.now() ^ (stage * 0x9e3779b9)) >>> 0;
  }

  const rng = createRng(seed);
  const grid = wilsonsAlgorithm(width, height, rng);

  // Mark start / end
  grid[0][0].isStart = true;
  grid[height - 1][width - 1].isEnd = true;
  grid[0][0].walls.left = false; // entrance opening
  grid[height - 1][width - 1].walls.right = false; // exit opening

  // Place Easter Eggs using separate RNG bytes
  if (easterEggIds && easterEggIds.length > 0) {
    const eggCount = Math.min(easterEggIds.length, Math.floor(rng() * 3) + 1);
    const placed = new Set<string>();
    for (let i = 0; i < eggCount; i++) {
      let ex: number, ey: number, key: string;
      let attempts = 0;
      do {
        ex = Math.floor(rng() * width);
        ey = Math.floor(rng() * height);
        key = `${ex},${ey}`;
        attempts++;
      } while (
        (placed.has(key) || (ex === 0 && ey === 0) || (ex === width-1 && ey === height-1))
        && attempts < 50
      );
      if (!grid[ey][ex].isStart && !grid[ey][ex].isEnd) {
        grid[ey][ex].hasEasterEgg = true;
        grid[ey][ex].easterEggId = easterEggIds[i];
        placed.add(key);
      }
    }
  }

  const solution = findSolutionPath(grid, 0, 0, width - 1, height - 1);
  const junctions = findJunctions(grid);

  return { grid, width, height, junctions, solution };
}

/** Calculate available directions from a cell */
export function getAvailableDirections(
  cell: Cell
): ('up' | 'right' | 'down' | 'left')[] {
  const dirs: ('up' | 'right' | 'down' | 'left')[] = [];
  if (!cell.walls.top)    dirs.push('up');
  if (!cell.walls.right)  dirs.push('right');
  if (!cell.walls.bottom) dirs.push('down');
  if (!cell.walls.left)   dirs.push('left');
  return dirs;
}

/** Check if a cell is a junction (decision point) given where the player came from */
export function isDecisionPoint(
  cell: Cell,
  fromDir: 'up' | 'right' | 'down' | 'left' | null
): boolean {
  const available = getAvailableDirections(cell);
  // Remove the direction we came from
  const opposites: Record<string, string> = {
    up: 'down', down: 'up', left: 'right', right: 'left'
  };
  const fwd = fromDir ? available.filter(d => d !== opposites[fromDir]) : available;
  return fwd.length > 1;
}

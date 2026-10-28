'use client';

import { useRef, useEffect, useState } from 'react';
import { MazeData, Cell } from '@/lib/maze/generator';
import { loadHero, drawKnight, KnightFrames } from '@/lib/maze/knight';
import { usePlayerStore } from '@/lib/store/playerStore';

interface MazeCanvasProps {
  maze: MazeData;
  playerX: number;
  playerY: number;
  playerDirection: 'up' | 'right' | 'down' | 'left';
  onEasterEggFound?: (id: string) => void;
  /** Open directions at a junction: drawn as chevrons on the board, and tappable */
  choices?: Dir[];
  onChoose?: (dir: Dir) => void;
}

type Dir = 'up' | 'right' | 'down' | 'left';
const DELTA: Record<Dir, [number, number]> = { up: [0, -1], right: [1, 0], down: [0, 1], left: [-1, 0] };

const CELL = 42;
/** Internal resolution multiplier so the knight and walls stay crisp when scaled up */
const RES = 2;
/** Back wall above the top row: heads and hats on the first row overlap it, inside the board */
const HEADROOM = CELL * 0.85;
/** How long one step between cells takes on screen; matches the game's step timer */
const STEP_MS = 200;

/** Small deterministic hash for per-tile texture */
function hash(x: number, y: number) {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

function drawFloor(
  ctx: CanvasRenderingContext2D,
  cell: Cell,
  x: number,
  y: number,
  visited: boolean
) {
  const px = x * CELL;
  const py = y * CELL;

  // Dusk stone tiles; the walked path takes on the lime light
  const alt = (x + y) % 2 === 0;
  let base = alt ? '#1c1434' : '#211839';
  if (cell.isStart) base = '#33235f';
  else if (cell.isEnd) base = '#1f2a06';
  else if (visited) base = alt ? '#34411a' : '#3a4a1c';
  ctx.fillStyle = base;
  ctx.fillRect(px, py, CELL, CELL);

  // Bevel: light top-left, dark bottom-right
  ctx.fillStyle = visited ? 'rgba(212,255,58,0.10)' : 'rgba(246,238,219,0.05)';
  ctx.fillRect(px, py, CELL, 2);
  ctx.fillRect(px, py, 2, CELL);
  ctx.fillStyle = 'rgba(8,4,18,0.35)';
  ctx.fillRect(px, py + CELL - 2, CELL, 2);
  ctx.fillRect(px + CELL - 2, py, 2, CELL);

  // A few worn specks so tiles don't look flat
  ctx.fillStyle = visited ? 'rgba(212,255,58,0.12)' : 'rgba(246,238,219,0.06)';
  for (let i = 0; i < 3; i++) {
    const h = hash(x * 3 + i, y * 7 - i);
    if (h > 0.55) ctx.fillRect(px + 6 + hash(x + i, y) * (CELL - 14), py + 6 + hash(y + i, x) * (CELL - 14), 3, 3);
  }
}

const WALL_T = 8;          // wall thickness
const WALL_H = 12;         // how far the stone rises above the floor
const ROOF = '#f6eedb';
const ROOF_HI = '#fffaf0';
const FACE = '#bfae86';
const FACE_LO = '#8c7b58';
const EDGE = '#120c24';

type Block = [number, number, number, number];

/**
 * Stone blocks drawn in three passes (outline, face, roof) so connected walls
 * merge into one solid mass. Roofs are lifted by WALL_H; the face fills below.
 */
function stones(ctx: CanvasRenderingContext2D, blocks: Block[]) {
  ctx.fillStyle = EDGE;
  for (const [bx, by, bw, bh] of blocks) ctx.fillRect(bx - 1.5, by - WALL_H - 1.5, bw + 3, bh + WALL_H + 3);
  for (const [bx, by, bw, bh] of blocks) {
    const g = ctx.createLinearGradient(0, by + bh - WALL_H, 0, by + bh);
    g.addColorStop(0, FACE);
    g.addColorStop(1, FACE_LO);
    ctx.fillStyle = g;
    ctx.fillRect(bx, by + bh - WALL_H, bw, WALL_H);
  }
  ctx.fillStyle = ROOF;
  for (const [bx, by, bw, bh] of blocks) ctx.fillRect(bx, by - WALL_H, bw, bh);
  ctx.fillStyle = ROOF_HI;
  for (const [bx, by, bw, bh] of blocks) if (bw > bh) ctx.fillRect(bx, by - WALL_H, bw, 1.5);
}

/** Wall segments live on the grid lines: horizontal at boundary row b, vertical at boundary column c */
function hWall(maze: MazeData, b: number, x: number) {
  if (b < maze.height) return maze.grid[b][x].walls.top;
  return maze.grid[maze.height - 1][x].walls.bottom;
}
function vWall(maze: MazeData, c: number, y: number) {
  if (c < maze.width) return maze.grid[y][c].walls.left;
  return maze.grid[y][maze.width - 1].walls.right;
}
function hasPost(maze: MazeData, c: number, b: number) {
  return (c > 0 && hWall(maze, b, c - 1)) || (c < maze.width && hWall(maze, b, c))
    || (b > 0 && vWall(maze, c, b - 1)) || (b < maze.height && vWall(maze, c, b));
}

/** Floor shadows cast by the walls (drawn before any stone) */
function drawWallShadows(ctx: CanvasRenderingContext2D, maze: MazeData, x0: number, x1: number, y0: number, y1: number) {
  ctx.fillStyle = 'rgba(8,4,18,0.38)';
  for (let b = y0; b <= y1 + 1; b++) {
    for (let x = x0; x <= x1; x++) {
      if (hWall(maze, b, x)) ctx.fillRect(x * CELL, b * CELL + WALL_T / 2, CELL, 7);
    }
  }
  for (let y = y0; y <= y1; y++) {
    for (let c = x0; c <= x1 + 1; c++) {
      if (vWall(maze, c, y)) ctx.fillRect(c * CELL + WALL_T / 2, y * CELL, 5, CELL);
    }
  }
}

/**
 * Stone for one depth layer: the vertical walls in row y plus the wall line
 * along its bottom edge. Layer -1 is the maze's top edge.
 */
function drawWallLayer(ctx: CanvasRenderingContext2D, maze: MazeData, y: number, x0: number, x1: number) {
  const t = WALL_T;
  const blocks: Block[] = [];
  if (y >= 0) {
    for (let c = x0; c <= x1 + 1; c++) {
      if (vWall(maze, c, y)) blocks.push([c * CELL - t / 2, y * CELL, t, CELL]);
    }
  }
  const b = y + 1;
  for (let x = x0; x <= x1; x++) {
    if (hWall(maze, b, x)) blocks.push([x * CELL, b * CELL - t / 2, CELL, t]);
  }
  for (let c = x0; c <= x1 + 1; c++) {
    if (hasPost(maze, c, b)) blocks.push([c * CELL - t / 2, b * CELL - t / 2, t, t]);
  }
  stones(ctx, blocks);
}

/** A lime chevron in the next cell, pointing the way */
function drawChoice(ctx: CanvasRenderingContext2D, cx: number, cy: number, dir: Dir, now: number, still: boolean) {
  const p = still ? 0.5 : (Math.sin(now / 160) + 1) / 2;
  const [dx, dy] = DELTA[dir];
  ctx.save();
  ctx.translate(cx + dx * (2 + p * 3), cy + dy * (2 + p * 3));
  ctx.rotate(Math.atan2(dy, dx));
  ctx.fillStyle = 'rgba(212,255,58,0.16)';
  ctx.beginPath();
  ctx.arc(0, 0, CELL * 0.36, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 0.7 + p * 0.3;
  ctx.shadowColor = '#d4ff3a';
  ctx.shadowBlur = 10;
  ctx.fillStyle = '#d4ff3a';
  ctx.strokeStyle = '#120c24';
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(9, 0);
  ctx.lineTo(-5, -10);
  ctx.lineTo(-1, 0);
  ctx.lineTo(-5, 10);
  ctx.closePath();
  ctx.stroke();
  ctx.fill();
  ctx.restore();
}

/** The maze's north wall, drawn in the headroom strip above row 0 */
function drawBackWall(ctx: CanvasRenderingContext2D, width: number) {
  const w = width * CELL;
  const g = ctx.createLinearGradient(0, -HEADROOM, 0, 0);
  g.addColorStop(0, '#120c24');
  g.addColorStop(1, '#2b1c4f');
  ctx.fillStyle = g;
  ctx.fillRect(0, -HEADROOM, w, HEADROOM);
  // Stone courses
  const rows = 3;
  const rh = HEADROOM / rows;
  ctx.fillStyle = 'rgba(10, 6, 22, 0.45)';
  for (let r = 0; r < rows; r++) {
    const y = -HEADROOM + r * rh;
    ctx.fillRect(0, y + rh - 1.5, w, 1.5);
    const bw = CELL * 0.75;
    for (let x = (r % 2) * (bw / 2); x < w; x += bw) ctx.fillRect(x, y, 1.5, rh);
  }
}

/** The exit: a lime portal that breathes, with motes rising out of it */
function drawExit(ctx: CanvasRenderingContext2D, ex: number, ey: number, now: number, still: boolean) {
  const cx = ex * CELL + CELL / 2;
  const cy = ey * CELL + CELL / 2;
  const p = still ? 0.5 : (Math.sin(now / 420) + 1) / 2;
  const grd = ctx.createRadialGradient(cx, cy, 2, cx, cy, CELL * (0.55 + p * 0.1));
  grd.addColorStop(0, 'rgba(212,255,58,0.9)');
  grd.addColorStop(0.45, 'rgba(212,255,58,0.35)');
  grd.addColorStop(1, 'rgba(212,255,58,0)');
  ctx.fillStyle = grd;
  ctx.fillRect(cx - CELL, cy - CELL, CELL * 2, CELL * 2);
  ctx.strokeStyle = `rgba(246,238,219,${0.5 + p * 0.4})`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(cx, cy + 4, CELL * (0.26 + p * 0.04), CELL * (0.12 + p * 0.02), 0, 0, Math.PI * 2);
  ctx.stroke();
  if (!still) {
    for (let i = 0; i < 5; i++) {
      const life = ((now / 1400 + i / 5) % 1);
      const mx = cx + Math.sin(i * 2.4 + now / 600) * CELL * 0.22;
      const my = cy + 4 - life * CELL * 0.7;
      ctx.fillStyle = `rgba(212,255,58,${(1 - life) * 0.9})`;
      ctx.fillRect(mx - 1.5, my - 1.5, 3, 3);
    }
  }
  // Exit gem
  const s = CELL * 0.13;
  ctx.save();
  ctx.translate(cx, cy - 4 - p * 3);
  ctx.rotate(Math.PI / 4);
  ctx.fillStyle = '#f6eedb';
  ctx.fillRect(-s, -s, s * 2, s * 2);
  ctx.fillStyle = '#d4ff3a';
  ctx.fillRect(-s * 0.45, -s * 0.45, s * 0.9, s * 0.9);
  ctx.restore();
}

export default function MazeCanvas({
  maze,
  playerX,
  playerY,
  playerDirection,
  onEasterEggFound,
  choices,
  onChoose,
}: MazeCanvasProps) {
  const choicesRef = useRef<Dir[]>([]);
  choicesRef.current = choices ?? [];
  const camRef = useRef({ x: 0, y: 0 });
  const puffs = useRef<{ x: number; y: number; t: number }[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const visitedRef = useRef<Set<string>>(new Set(['0,0']));
  const knightRef = useRef<KnightFrames | null>(null);
  const equippedItems = usePlayerStore((s) => s.equippedItems);
  const hero = usePlayerStore((s) => s.hero);
  const equippedRef = useRef(equippedItems);
  equippedRef.current = equippedItems;

  // Movement is tweened between the last drawn spot and the new cell
  const motion = useRef({ fromX: playerX, fromY: playerY, toX: playerX, toY: playerY, t0: 0, dir: playerDirection });

  useEffect(() => {
    let cancelled = false;
    loadHero(hero).then(f => { if (!cancelled) knightRef.current = f; });
    return () => { cancelled = true; };
  }, [hero]);

  useEffect(() => {
    const m = motion.current;
    const now = performance.now();
    const k = Math.min(1, (now - m.t0) / STEP_MS);
    const curX = m.fromX + (m.toX - m.fromX) * k;
    const curY = m.fromY + (m.toY - m.fromY) * k;
    const jump = Math.abs(playerX - curX) + Math.abs(playerY - curY) > 1.5;
    if (!jump && (playerX !== curX || playerY !== curY)) {
      puffs.current = [...puffs.current.filter(p => now - p.t < 500), { x: curX, y: curY, t: now }];
    }
    motion.current = {
      fromX: jump ? playerX : curX,
      fromY: jump ? playerY : curY,
      toX: playerX,
      toY: playerY,
      t0: now,
      dir: playerDirection,
    };
  }, [playerX, playerY, playerDirection]);

  useEffect(() => {
    visitedRef.current.add(`${playerX},${playerY}`);
    const cell = maze.grid[playerY]?.[playerX];
    if (cell?.hasEasterEgg && cell.easterEggId && onEasterEggFound) {
      onEasterEggFound(cell.easterEggId);
    }
  }, [playerX, playerY, maze, onEasterEggFound]);

  useEffect(() => {
    visitedRef.current = new Set([`${playerX},${playerY}`]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maze]);

  // Big mazes get a camera that follows the hero; small ones show whole
  const [maxView, setMaxView] = useState(13);
  useEffect(() => {
    const fit = () => setMaxView(window.innerWidth < 760 ? 9 : 13);
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);
  const viewW = Math.min(maze.width, maxView);
  const viewH = Math.min(maze.height, maxView);
  const follows = viewW < maze.width || viewH < maze.height;

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let raf = 0;
    let exit = { x: maze.width - 1, y: maze.height - 1 };
    maze.grid.forEach(row => row.forEach(c => { if (c.isEnd) exit = { x: c.x, y: c.y }; }));
    const cam = { x: 0, y: 0, ready: false };
    const W = viewW * CELL;
    const H = viewH * CELL;

    const draw = (now: number) => {
      const m = motion.current;
      const k = reduce ? 1 : Math.min(1, (now - m.t0) / STEP_MS);
      const gx = m.fromX + (m.toX - m.fromX) * k;
      const gy = m.fromY + (m.toY - m.fromY) * k;
      const walking = now - m.t0 < STEP_MS + 120;

      // Camera target keeps the hero centred, clamped to the maze
      const tx = Math.min(Math.max(gx - (viewW - 1) / 2, 0), maze.width - viewW);
      const ty = Math.min(Math.max(gy - (viewH - 1) / 2, 0), maze.height - viewH);
      if (!cam.ready || reduce) { cam.x = tx; cam.y = ty; cam.ready = true; }
      else { cam.x += (tx - cam.x) * 0.14; cam.y += (ty - cam.y) * 0.14; }
      camRef.current = { x: cam.x, y: cam.y };

      ctx.setTransform(RES, 0, 0, RES, 0, HEADROOM * RES);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.clearRect(0, -HEADROOM, W, H + HEADROOM);

      const x0 = Math.max(0, Math.floor(cam.x) - 1);
      const x1 = Math.min(maze.width - 1, Math.ceil(cam.x + viewW));
      const y0 = Math.max(0, Math.floor(cam.y) - 1);
      const y1 = Math.min(maze.height - 1, Math.ceil(cam.y + viewH));
      const ox = -cam.x * CELL;
      const oy = -cam.y * CELL;

      const clipped = (fn: () => void) => {
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, -HEADROOM, W, H + HEADROOM);
        ctx.clip();
        ctx.translate(ox, oy);
        fn();
        ctx.restore();
      };

      clipped(() => {
        if (y0 === 0) drawBackWall(ctx, maze.width);
        for (let y = y0; y <= y1; y++) {
          for (let x = x0; x <= x1; x++) {
            drawFloor(ctx, maze.grid[y][x], x, y, visitedRef.current.has(`${x},${y}`));
          }
        }
        drawExit(ctx, exit.x, exit.y, now, reduce);
        drawWallShadows(ctx, maze, x0, x1, y0, y1);
      });

      const px = gx * CELL + CELL / 2 + ox;
      const py = gy * CELL + CELL / 2 + oy;

      // Lime light pooled under the hero
      const grd = ctx.createRadialGradient(px, py + CELL * 0.2, 2, px, py + CELL * 0.2, CELL * 0.9);
      grd.addColorStop(0, 'rgba(212,255,58,0.32)');
      grd.addColorStop(1, 'rgba(212,255,58,0)');
      ctx.fillStyle = grd;
      ctx.fillRect(px - CELL, py - CELL, CELL * 2, CELL * 2);

      // Dust kicked up where the hero just stepped
      if (!reduce) {
        for (const p of puffs.current) {
          const age = (now - p.t) / 500;
          if (age >= 1) continue;
          const fx = p.x * CELL + CELL / 2 + ox;
          const fy = p.y * CELL + CELL * 0.82 + oy;
          ctx.fillStyle = `rgba(246,238,219,${0.28 * (1 - age)})`;
          for (const s of [-1, 1]) {
            ctx.beginPath();
            ctx.arc(fx + s * (4 + age * 8), fy - age * 4, 2 + age * 4, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      // Walls in rows above the hero sit behind it; the rest are drawn after, in front
      const heroRow = Math.round(gy);
      clipped(() => {
        if (y0 === 0) drawWallLayer(ctx, maze, -1, x0, x1);
        for (let y = y0; y <= Math.min(heroRow - 1, y1); y++) drawWallLayer(ctx, maze, y, x0, x1);
      });

      const frames = knightRef.current;
      if (frames) {
        const frame = walking && !reduce ? Math.floor(now / 110) % 4 : 0;
        const bob = walking && !reduce ? Math.abs(Math.sin(now / 70)) * 1.5 : 0;
        ctx.fillStyle = 'rgba(10,6,22,0.45)';
        ctx.beginPath();
        ctx.ellipse(px, py + CELL * 0.36, CELL * 0.3, CELL * 0.1, 0, 0, Math.PI * 2);
        ctx.fill();
        drawKnight(ctx, frames, m.dir, frame, px, py + CELL * 0.36 - bob, CELL * 1.18, equippedRef.current, now);
      }

      clipped(() => {
        for (let y = Math.max(heroRow, y0); y <= y1; y++) drawWallLayer(ctx, maze, y, x0, x1);
      });

      // Junction: chevrons in each open direction
      for (const d of choicesRef.current) {
        const [dx, dy] = DELTA[d];
        drawChoice(ctx, px + dx * CELL, py + dy * CELL, d, now, reduce);
      }

      // When the exit is off screen, a lime marker on the edge points the way
      const ex = exit.x * CELL + CELL / 2 + ox;
      const ey = exit.y * CELL + CELL / 2 + oy;
      if (follows && (ex < 0 || ey < 0 || ex > W || ey > H)) {
        const cx = W / 2, cy = H / 2;
        const ang = Math.atan2(ey - cy, ex - cx);
        const r = Math.min((W / 2 - 18) / Math.abs(Math.cos(ang) || 1e-6), (H / 2 - 18) / Math.abs(Math.sin(ang) || 1e-6));
        const mx = cx + Math.cos(ang) * r;
        const my = cy + Math.sin(ang) * r;
        const pulse = reduce ? 1 : 0.75 + Math.sin(now / 260) * 0.25;
        ctx.save();
        ctx.translate(mx, my);
        ctx.rotate(ang);
        ctx.globalAlpha = pulse;
        ctx.fillStyle = '#d4ff3a';
        ctx.shadowColor = '#d4ff3a';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.moveTo(10, 0);
        ctx.lineTo(-7, -9);
        ctx.lineTo(-3, 0);
        ctx.lineTo(-7, 9);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [maze, viewW, viewH, follows]);

  // Tap a chevron (or anywhere toward it) to choose that way
  const handlePointer = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const open = choicesRef.current;
    if (!open.length || !onChoose) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const k = rect.width / (viewW * CELL);
    const wx = (e.clientX - rect.left) / k + camRef.current.x * CELL;
    const wy = (e.clientY - rect.top) / k - HEADROOM + camRef.current.y * CELL;
    const m = motion.current;
    const dx = wx - (m.toX * CELL + CELL / 2);
    const dy = wy - (m.toY * CELL + CELL / 2);
    if (Math.hypot(dx, dy) < CELL * 0.3) return;
    const dir: Dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
    if (open.includes(dir)) onChoose(dir);
  };

  // The board is the maze plus its back wall; it fits the width and the height left over by the HUD
  const aspect = (viewW * CELL) / (viewH * CELL + HEADROOM);
  return (
    <canvas
      ref={canvasRef}
      onPointerUp={handlePointer}
      width={viewW * CELL * RES}
      height={(viewH * CELL + HEADROOM) * RES}
      style={{
        display: 'block',
        width: `min(var(--maze-max-w, 92vw), calc((100svh - var(--maze-reserve, 150px)) * ${aspect.toFixed(4)}))`,
        height: 'auto',
      }}
    />
  );
}

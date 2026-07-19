'use client';

import { useRef, useEffect, useCallback } from 'react';
import { MazeData, Cell } from '@/lib/maze/generator';
import { usePlayerStore } from '@/lib/store/playerStore';
import { 
  HERO_PALETTE, 
  HERO_DOWN_IDLE, HERO_DOWN_HOP, 
  HERO_UP_IDLE, HERO_SIDE_IDLE,
  ITEM_OVERLAYS
} from '@/lib/maze/characterPixels';

interface MazeCanvasProps {
  maze: MazeData;
  playerX: number;
  playerY: number;
  playerDirection: 'up' | 'right' | 'down' | 'left';
  onEasterEggFound?: (id: string) => void;
}

const CELL = 42;
const WALL_THICKNESS = 4;
const PIXEL_SCALE = 2; // Each 'code pixel' is 2x2 on canvas

let frameTick = 0;
let walkFrame = 0;

function renderMatrix(
  ctx: CanvasRenderingContext2D,
  matrix: string[],
  ox: number,
  oy: number,
  mirror: boolean = false
) {
  const rows = matrix.length;
  const cols = matrix[0].length;
  
  // Center alignment
  const startX = ox - (cols * PIXEL_SCALE) / 2;
  const startY = oy - (rows * PIXEL_SCALE) / 2;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const char = matrix[r][c];
      if (char === '.' || char === ' ') continue;
      
      const color = HERO_PALETTE[char] || '#000';
      ctx.fillStyle = color;
      
      const drawC = mirror ? (cols - 1 - c) : c;
      ctx.fillRect(
        startX + drawC * PIXEL_SCALE,
        startY + r * PIXEL_SCALE,
        PIXEL_SCALE,
        PIXEL_SCALE
      );
    }
  }
}

function drawPlayer(
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
  dir: string,
  equipped: Record<string, string | null>,
  walking: boolean
) {
  const cx = px + CELL / 2;
  const cy = py + CELL / 2;
  const hop = walking && (walkFrame % 2 === 1);

  // 1. Determine body matrix
  let bodyM = HERO_DOWN_IDLE;
  if (dir === 'up') bodyM = HERO_UP_IDLE;
  else if (dir === 'left' || dir === 'right') bodyM = HERO_SIDE_IDLE;
  else if (hop) bodyM = HERO_DOWN_HOP;

  const mirror = (dir === 'right');
  const oy = cy - 4;

  const getSlot = (id: string | null) => {
    if (!id || !ITEM_OVERLAYS[id]) return null;
    const overlay = ITEM_OVERLAYS[id];
    const matrix = (dir === 'up' && overlay.up) ? overlay.up : 
                 ((dir === 'left' || dir === 'right') && overlay.side) ? overlay.side : 
                 overlay.down;
    return { matrix, offset: overlay.offset };
  };

  const drawSlot = (id: string | null) => {
    const slot = getSlot(id);
    if (slot) renderMatrix(ctx, slot.matrix, cx, oy + slot.offset * PIXEL_SCALE, mirror);
  };

  // --- Z-ORDER LAYERING (In-Game) ---
  const hatId = equipped.hat;
  const shirtId = equipped.shirt;
  const pantsId = (equipped as any).pants;
  const shoesId = (equipped as any).shoes;
  const accId = (equipped as any).accessory;

  // 1. Back Acc / Cape
  if (accId === 'acc_wings') drawSlot(accId);
  if (shirtId?.includes('cape') || shirtId?.includes('rainbow')) drawSlot(shirtId);

  // 2. Shoes
  drawSlot(shoesId);

  // 3. Pants
  drawSlot(pantsId);

  // 4. Base Hero
  renderMatrix(ctx, bodyM, cx, oy, mirror);

  // 5. Shirt (Torso Overlay)
  if (shirtId && !shirtId.includes('cape') && !shirtId.includes('rainbow')) drawSlot(shirtId);

  // 6. Hat
  drawSlot(hatId);

  // 7. Front Acc (Sword)
  if (accId && accId !== 'acc_wings') drawSlot(accId);
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

  // Escher Tessellation Floor (Checkered high contrast)
  const isDarkFloor = (x + y) % 2 === 0;
  if (cell.isStart) {
    ctx.fillStyle = '#ffffff'; // Stark white start
  } else if (cell.isEnd) {
    ctx.fillStyle = '#111111'; // Void black end
  } else if (visited) {
    ctx.fillStyle = isDarkFloor ? '#e0e0e0' : '#ffffff'; // Visited glowing path
  } else {
    ctx.fillStyle = isDarkFloor ? '#1a1a1a' : '#2a2a2a'; // Unvisited void floor
  }
  ctx.fillRect(px, py, CELL, CELL);

  // Success/End portal effect
  if (cell.isEnd) {
    const grd = ctx.createRadialGradient(px + CELL/2, py + CELL/2, 2, px + CELL/2, py + CELL/2, CELL/2);
    grd.addColorStop(0, 'rgba(255,255,255,0.9)');
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grd;
    ctx.fillRect(px, py, CELL, CELL);
    ctx.font = `${CELL * 0.5}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('👁', px + CELL / 2, py + CELL / 2);
  }
}

function drawWall(
  ctx: CanvasRenderingContext2D,
  cell: Cell,
  x: number,
  y: number
) {
  const px = x * CELL;
  const py = y * CELL;

  const TOP_COLOR = '#dddddd'; // Roof of the wall
  const FRONT_FACE = '#777777'; // Front facing depth
  const RIGHT_FACE = '#444444'; // Side facing depth
  const W = WALL_THICKNESS + 2; 
  const H = 14; // Height of the 3D wall protruding upwards

  // Helper to draw a 3D block
  const drawBlock = (bx: number, by: number, bw: number, bh: number) => {
    // Front face (depth)
    ctx.fillStyle = FRONT_FACE;
    ctx.fillRect(bx, by - H + bh, bw, H);
    // Roof
    ctx.fillStyle = TOP_COLOR;
    ctx.fillRect(bx, by - H, bw, bh);
    // Right face shadow for depth illusion
    ctx.fillStyle = RIGHT_FACE;
    ctx.fillRect(bx + bw - 2, by - H, 2, bh + H);
  };

  // Only draw right and bottom walls to avoid double-drawing shared edges
  // (Since left wall of cell X is right wall of cell X-1, etc.)
  // However, for edges of the maze, we must draw top and left.

  if (cell.walls.top && y === 0) {
    drawBlock(px, py, CELL, W);
  }
  if (cell.walls.left && x === 0) {
    drawBlock(px, py, W, CELL);
  }
  if (cell.walls.right) {
    drawBlock(px + CELL - W, py, W, CELL);
  }
  if (cell.walls.bottom) {
    drawBlock(px, py + CELL - W, CELL, W);
  }
}

export default function MazeCanvas({
  maze,
  playerX,
  playerY,
  playerDirection,
  onEasterEggFound,
}: MazeCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef   = useRef<number | null>(null);
  const visitedRef = useRef<Set<string>>(new Set(['0,0']));
  const equippedItems = usePlayerStore((s) => s.equippedItems);

  useEffect(() => {
    visitedRef.current.add(`${playerX},${playerY}`);
    const cell = maze.grid[playerY]?.[playerX];
    if (cell?.hasEasterEgg && cell.easterEggId && onEasterEggFound) {
      onEasterEggFound(cell.easterEggId);
    }
  }, [playerX, playerY, maze, onEasterEggFound]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    frameTick++;
    if (frameTick % 10 === 0) walkFrame++;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let y = 0; y < maze.height; y++) {
      for (let x = 0; x < maze.width; x++) {
        const visited = visitedRef.current.has(`${x},${y}`);
        drawFloor(ctx, maze.grid[y][x], x, y, visited);
      }
    }

    for (let y = 0; y < maze.height; y++) {
      for (let x = 0; x < maze.width; x++) {
        drawWall(ctx, maze.grid[y][x], x, y);
      }
    }

    const px = playerX * CELL;
    const py = playerY * CELL;
    
    drawPlayer(
      ctx, px, py, playerDirection, 
      equippedItems as Record<string, string | null>,
      true
    );

    // Light aura around player
    const grd = ctx.createRadialGradient(px + CELL/2, py + CELL/2, 4, px + CELL/2, py + CELL/2, CELL);
    grd.addColorStop(0, 'rgba(168,85,247,0.15)');
    grd.addColorStop(1, 'rgba(168,85,247,0)');
    ctx.fillStyle = grd;
    ctx.fillRect(px - CELL/2, py - CELL/2, CELL*2, CELL*2);

    animRef.current = requestAnimationFrame(draw);
  }, [maze, playerX, playerY, playerDirection, equippedItems]);

  useEffect(() => {
    animRef.current = requestAnimationFrame(draw);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      width={maze.width * CELL}
      height={maze.height * CELL}
      style={{
        imageRendering: 'pixelated',
        maxWidth: '100%',
        border: '6px solid #1a1b3b',
        borderRadius: '12px',
        boxShadow: '0 0 60px rgba(0,0,0,0.9)',
      }}
    />
  );
}

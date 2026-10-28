/**
 * ORIM — Heroes
 * Walk cycles cut from 4×4 sprite sheets (row 0 front, row 1 back, row 2 facing right),
 * with any white sheet background keyed out. Hats and accessories are drawn from
 * hero-matched art in ./knightGear; tops, capes, pants and shoes repaint the hero
 * itself via ./knightDye.
 */

import { HERO_GEAR, gearView, GearSprite } from './knightGear';
import { dyeFrame, hasBodyGear, KNIGHT_BANDS, Band, View } from './knightDye';

export type Facing = 'up' | 'right' | 'down' | 'left';
export type HeroId = 'knight' | 'panda' | 'bear';
export type Equipped = Partial<Record<'hat' | 'shirt' | 'pants' | 'shoes' | 'accessory', string | null>>;
type Box = [number, number, number, number];

export interface KnightFrames {
  hero: HeroId;
  down: HTMLCanvasElement[];
  up: HTMLCanvasElement[];
  right: HTMLCanvasElement[];
  left: HTMLCanvasElement[];
  /** Pixels a hero repainted over the knight (its face): body dyes leave them alone */
  own?: Record<View, Uint8Array[]>;
}

interface HeroDef {
  name: string;
  tagline: string;
  sheet: string;
  bands: Record<View, Band>;
  /** Shield boxes cleared when a cape or wings are worn */
  shield?: Partial<Record<View, Box[]>>;
}

export const HEROES: Record<HeroId, HeroDef> = {
  knight: {
    name: 'Knight',
    tagline: 'Sword, shield, steady nerve.',
    sheet: '/hero.png',
    bands: KNIGHT_BANDS,
    shield: { down: [[170, 122, 214, 236]], up: [[48, 124, 74, 228]], right: [[163, 127, 214, 212]] },
  },
  panda: {
    name: 'Panda',
    tagline: 'Full plate, calm eyes.',
    sheet: '/heroes/panda.png',
    bands: KNIGHT_BANDS,
    shield: { down: [[170, 122, 214, 236]], up: [[48, 124, 74, 228]], right: [[163, 127, 214, 212]] },
  },
  bear: {
    name: 'Bear',
    tagline: 'Full plate, big paws, no fear.',
    sheet: '/heroes/bear.png',
    bands: KNIGHT_BANDS,
    shield: { down: [[170, 122, 214, 236]], up: [[48, 124, 74, 228]], right: [[163, 127, 214, 212]] },
  },
};

export const HERO_IDS = Object.keys(HEROES) as HeroId[];

const CELL = 256;
const PAD = 6;
export const FRAME = CELL - PAD * 2;

/** Box the figure occupies inside a frame, as fractions of FRAME */
const FIGURE = { top: 0.02, bottom: 0.97 };

const CAPES = new Set(['egg_rainbow', 'egg_dark_cape']);

function keyOut(img: HTMLImageElement, sx: number, sy: number, mirror = false) {
  const c = document.createElement('canvas');
  c.width = c.height = FRAME;
  const x = c.getContext('2d', { willReadFrequently: true })!;
  if (mirror) {
    x.translate(FRAME, 0);
    x.scale(-1, 1);
  }
  x.drawImage(img, sx + PAD, sy + PAD, FRAME, FRAME, 0, 0, FRAME, FRAME);
  x.setTransform(1, 0, 0, 1, 0, 0);
  const data = x.getImageData(0, 0, FRAME, FRAME);
  const px = data.data;
  const isWhite = (i: number) => px[i + 3] > 0 && px[i] > 225 && px[i + 1] > 225 && px[i + 2] > 225;
  // Flood fill from the edges so white highlights inside the art survive
  const seen = new Uint8Array(FRAME * FRAME);
  const stack: number[] = [];
  for (let i = 0; i < FRAME; i++) stack.push(i, (FRAME - 1) * FRAME + i, i * FRAME, i * FRAME + FRAME - 1);
  while (stack.length) {
    const p = stack.pop()!;
    if (seen[p]) continue;
    seen[p] = 1;
    if (!isWhite(p * 4)) continue;
    px[p * 4 + 3] = 0;
    const col = p % FRAME;
    const row = (p / FRAME) | 0;
    if (col > 0) stack.push(p - 1);
    if (col < FRAME - 1) stack.push(p + 1);
    if (row > 0) stack.push(p - FRAME);
    if (row < FRAME - 1) stack.push(p + FRAME);
  }
  x.putImageData(data, 0, 0);
  return c;
}

const heroCache = new Map<HeroId, Promise<KnightFrames>>();

/** Mark the pixels where a hero frame differs from the same knight frame */
function ownPixels(frames: HTMLCanvasElement[], knight: HTMLCanvasElement[]) {
  return frames.map((f, i) => {
    const a = f.getContext('2d', { willReadFrequently: true })!.getImageData(0, 0, FRAME, FRAME).data;
    const b = knight[i].getContext('2d', { willReadFrequently: true })!.getImageData(0, 0, FRAME, FRAME).data;
    const m = new Uint8Array(FRAME * FRAME);
    for (let p = 0; p < m.length; p++) {
      const j = p * 4;
      if (Math.abs(a[j] - b[j]) + Math.abs(a[j + 1] - b[j + 1]) + Math.abs(a[j + 2] - b[j + 2]) > 30) m[p] = 1;
    }
    return m;
  });
}

export function loadHero(hero: HeroId = 'knight'): Promise<KnightFrames> {
  preloadGear();
  const hit = heroCache.get(hero);
  if (hit) return hit;
  const p = new Promise<KnightFrames>((resolve, reject) => {
    const img = new Image();
    img.src = HEROES[hero].sheet;
    img.onload = () => {
      const row = (r: number, mirror = false) => [0, 1, 2, 3].map(i => keyOut(img, i * CELL, r * CELL, mirror));
      const frames: KnightFrames = { hero, down: row(0), up: row(1), right: row(2), left: row(2, true) };
      if (hero === 'knight') { resolve(frames); return; }
      loadHero('knight').then(k => {
        frames.own = { down: ownPixels(frames.down, k.down), up: ownPixels(frames.up, k.up), right: ownPixels(frames.right, k.right) };
        resolve(frames);
      }, () => resolve(frames));
    };
    img.onerror = reject;
  });
  heroCache.set(hero, p);
  return p;
}

/** Kept for existing callers: the knight */
export const loadKnight = () => loadHero('knight');

// ── Dressing ────────────────────────────────────────────────

const dressedCache = new Map<string, KnightFrames>();

function mirrored(src: HTMLCanvasElement) {
  const c = document.createElement('canvas');
  c.width = src.width;
  c.height = src.height;
  const x = c.getContext('2d')!;
  x.translate(c.width, 0);
  x.scale(-1, 1);
  x.drawImage(src, 0, 0);
  return c;
}

/** Clear shield pixels and close the new silhouette edge with the outline colour */
function stripShield(data: ImageData, boxes: Box[]) {
  const { width: W, height: H, data: px } = data;
  for (const [x0, y0, x1, y1] of boxes) {
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) px[(y * W + x) * 4 + 3] = 0;
  }
  const solid = (x: number, y: number) => x >= 0 && y >= 0 && x < W && y < H && px[(y * W + x) * 4 + 3] > 0;
  for (const [x0, y0, x1, y1] of boxes) {
    for (let y = Math.max(0, y0 - 4); y < Math.min(H, y1 + 4); y++) {
      for (let x = Math.max(0, x0 - 6); x < Math.min(W, x1 + 6); x++) {
        if (!solid(x, y)) continue;
        if (!solid(x - 1, y) || !solid(x + 1, y) || !solid(x, y - 1) || !solid(x, y + 1)) {
          const i = (y * W + x) * 4;
          px[i] = 36; px[i + 1] = 24; px[i + 2] = 47;
        }
      }
    }
  }
}

function dressed(base: KnightFrames, equipped: Equipped): KnightFrames {
  const def = HEROES[base.hero];
  const body = [equipped.shirt, equipped.pants, equipped.shoes];
  const dropShield = !!def.shield && (CAPES.has(equipped.shirt ?? '') || equipped.accessory === 'acc_wings');
  if (!hasBodyGear(body) && !dropShield) return base;
  const key = [base.hero, ...body.map(id => id ?? ''), dropShield ? 'ns' : ''].join('|');
  const hit = dressedCache.get(key);
  if (hit) return hit;

  const isCape = (id?: string | null) => !!id && CAPES.has(id);
  const paint = (src: HTMLCanvasElement, view: View, i: number) => {
    const c = document.createElement('canvas');
    c.width = src.width;
    c.height = src.height;
    const x = c.getContext('2d', { willReadFrequently: true })!;
    x.drawImage(src, 0, 0);
    const data = x.getImageData(0, 0, c.width, c.height);
    if (dropShield) stripShield(data, def.shield?.[view] ?? []);
    // Capes go last so they sit over a dyed top
    dyeFrame(data, view, [isCape(equipped.shirt) ? null : equipped.shirt, equipped.pants, equipped.shoes, isCape(equipped.shirt) ? equipped.shirt : null], def.bands, base.own?.[view][i]);
    x.putImageData(data, 0, 0);
    return c;
  };
  const right = base.right.map((f, i) => paint(f, 'right', i));
  const out: KnightFrames = {
    hero: base.hero,
    down: base.down.map((f, i) => paint(f, 'down', i)),
    up: base.up.map((f, i) => paint(f, 'up', i)),
    right,
    left: right.map(mirrored),
  };
  dressedCache.set(key, out);
  return out;
}

// ── Gear ────────────────────────────────────────────────────

const gearImages = new Map<string, HTMLImageElement>();

function gearImage(src: string) {
  let img = gearImages.get(src);
  if (!img) {
    img = new Image();
    img.src = src;
    gearImages.set(src, img);
  }
  return img;
}

let gearReady: Promise<void> | null = null;

/** Load every gear sprite once, so try-ons and runs never pop in */
export function preloadGear(): Promise<void> {
  if (gearReady) return gearReady;
  const srcs = new Set<string>();
  Object.values(HERO_GEAR).forEach(g => Object.values(g.art).forEach(a => a && srcs.add(a.src)));
  gearReady = Promise.all([...srcs].map(src => new Promise<void>(done => {
    const img = gearImage(src);
    if (img.complete) done();
    else { img.onload = () => done(); img.onerror = () => done(); }
  }))).then(() => undefined);
  return gearReady;
}

/**
 * Draw a hero with its feet at (cx, feetY), `height` pixels tall,
 * dressed in its equipped gear. `time` drives floating pieces.
 */
export function drawKnight(
  ctx: CanvasRenderingContext2D,
  frames: KnightFrames,
  facing: Facing,
  frame: number,
  cx: number,
  feetY: number,
  height: number,
  equipped: Equipped = {},
  time = 0,
) {
  const scale = height / ((FIGURE.bottom - FIGURE.top) * FRAME);
  const size = FRAME * scale;
  const left = cx - size / 2;
  const top = feetY - FIGURE.bottom * size;
  const view = gearView(facing);
  const mirror = facing === 'left';

  const pieces = [equipped.accessory, equipped.hat]
    .filter((id): id is string => !!id && !!HERO_GEAR[id]?.art[view] && !!HERO_GEAR[id]?.at[view])
    .map(id => HERO_GEAR[id]);

  const drawPiece = (g: GearSprite) => {
    const art = g.art[view]!;
    const [ax, ay, k] = g.at[view]!;
    const gx = ax;
    const gy = ay + (g.float ? Math.sin(time / 380) * 4 : 0);
    const img = gearImage(art.src);
    if (!img.complete || !img.naturalWidth) return;
    const w = art.w * k * scale;
    const h = art.h * k * scale;
    const flipArt = mirror !== !!g.flip?.includes(view);
    const place = (fx: number, flip: boolean) => {
      const x = left + fx * scale - w / 2;
      const y = top + gy * scale - h;
      ctx.save();
      if (g.glow) {
        ctx.shadowColor = g.glow;
        ctx.shadowBlur = 40 * scale;
      }
      if (flip) {
        ctx.translate(x + w, y);
        ctx.scale(-1, 1);
        ctx.drawImage(img, 0, 0, w, h);
      } else {
        ctx.drawImage(img, x, y, w, h);
      }
      ctx.restore();
    };
    const fx = mirror ? FRAME - gx : gx;
    place(fx, flipArt);
    if (g.pair) place(FRAME - fx, !flipArt);
  };

  pieces.filter(g => g.back?.includes(view)).forEach(drawPiece);
  const set = dressed(frames, equipped)[facing];
  ctx.drawImage(set[frame % set.length], left, top, size, size);
  pieces.filter(g => !g.back?.includes(view)).forEach(drawPiece);
}

export { gearView };

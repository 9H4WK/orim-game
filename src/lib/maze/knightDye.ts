/**
 * ORIM — Knight body gear
 * Tops, capes, pants and shoes repaint the hero's own pixels (a palette swap),
 * so the armour keeps its shading and outline while the material changes colour.
 * Coordinates are knight-frame pixels (244 × 244).
 */

export type View = 'down' | 'up' | 'right';
type Region = 'torso' | 'legs' | 'feet' | 'cape';
type Material = 'steel' | 'cloth' | 'cape' | 'leather';
type Box = [number, number, number, number];

export interface Band {
  torso: [number, number];
  legs: [number, number];
  feet: [number, number];
  /** Boxes left untouched (shield, sword) */
  skip: Box[];
  /** Where cape cloth shows in this view */
  cape: Box[];
}

/** Knight body regions; other heroes pass their own */
export const KNIGHT_BANDS: Record<View, Band> = {
  down:  { torso: [128, 192], legs: [188, 216], feet: [214, 244], skip: [[166, 120, 244, 244]], cape: [[0, 134, 86, 244], [156, 134, 168, 244]] },
  up:    { torso: [124, 214], legs: [210, 230], feet: [226, 244], skip: [], cape: [[0, 120, 244, 244]] },
  right: { torso: [122, 198], legs: [196, 222], feet: [218, 244], skip: [[148, 112, 244, 204], [98, 182, 244, 220]], cape: [[0, 120, 98, 244]] },
};

interface Dye {
  region: Region;
  /** `blend`: a second ramp faded in from the top of the region to the bottom */
  layers: { mats: Material[]; ramp: string[]; blend?: string[] }[];
  rainbow?: boolean;
  camo?: boolean;
  sparkle?: boolean;
}

const ALL: Material[] = ['steel', 'leather', 'cloth'];

export const KNIGHT_DYES: Record<string, Dye> = {
  shirt_knight:  { region: 'torso', layers: [{ mats: ['steel', 'cloth'], ramp: ['#3a4f78', '#7f9cc9', '#c9dbf5', '#ffffff'] }] },
  shirt_neon:    { region: 'torso', layers: [{ mats: ['steel', 'cloth'], ramp: ['#0d4d2c', '#16a35c', '#49f08f', '#c8ffdf'] }] },
  shirt_pirate:  { region: 'torso', layers: [
    { mats: ['steel'], ramp: ['#141a3d', '#26306b', '#3f4fa3', '#7c8fd6'] },
    { mats: ['cloth'], ramp: ['#5a0f17', '#a1202d', '#e04050', '#ff98a0'] },
  ] },
  shirt_hoodie:  { region: 'torso', layers: [{ mats: ['steel', 'cloth'], ramp: ['#1b1c24', '#363845', '#5b5e70', '#9396a8'] }] },
  shirt_solana:  { region: 'torso', layers: [
    { mats: ['steel', 'cloth'], ramp: ['#3b1673', '#7a3ad6', '#a77bff', '#e2d4ff'], blend: ['#0b5c47', '#14b98a', '#3ff2b8', '#c9fff0'] },
  ] },
  egg_rainbow:   { region: 'cape', layers: [{ mats: ['cape'], ramp: [] }], rainbow: true },
  egg_dark_cape: { region: 'cape', layers: [{ mats: ['cape'], ramp: ['#0c0614', '#24123d', '#4a2580', '#8f5ae0'] }] },
  pants_camo:    { region: 'legs', layers: [{ mats: ALL, ramp: ['#232b14', '#46552a', '#6e7f42', '#a5b56d'] }], camo: true },
  pants_gold:    { region: 'legs', layers: [{ mats: ALL, ramp: ['#6b3d05', '#c4820f', '#f7c948', '#fff4b0'] }] },
  pants_cyber:   { region: 'legs', layers: [{ mats: ALL, ramp: ['#22104d', '#4b23a0', '#8a5cf0', '#d6c2ff'] }] },
  shoes_speed:   { region: 'feet', layers: [{ mats: ALL, ramp: ['#5c0d0d', '#c22a1f', '#ff7a2e', '#ffe066'] }] },
  shoes_pixel:   { region: 'feet', layers: [{ mats: ALL, ramp: ['#54586b', '#a5aabd', '#e9ecf5', '#ffffff'] }] },
  shoes_crystal: { region: 'feet', layers: [{ mats: ALL, ramp: ['#0d4a63', '#2aa4d1', '#8fe6ff', '#f0fdff'] }], sparkle: true },
};

function hex(h: string): [number, number, number] {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function sampleRamp(stops: [number, number, number][], t: number): [number, number, number] {
  const x = Math.min(1, Math.max(0, t)) * (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(x));
  const f = x - i;
  const a = stops[i];
  const b = stops[i + 1];
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
}

function hsv(h: number, s: number, v: number): [number, number, number] {
  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);
  const [r, g, b] = [[v, t, p], [q, v, p], [p, v, t], [p, q, v], [t, p, v], [v, p, q]][i % 6];
  return [r * 255, g * 255, b * 255];
}

function isMaterial(m: Material, r: number, g: number, b: number): boolean {
  const mx = Math.max(r, g, b);
  const sat = mx - Math.min(r, g, b);
  const lum = 0.299 * r + 0.587 * g + 0.114 * b;
  if (lum < 42) return false;
  const skin = r > 190 && g > 140 && b > 110 && r > g && g > b && sat > 30;
  const gold = r > 140 && g > 100 && b < 120 && r - b > 70 && g - b > 40;
  const blue = b > r + 25 && b > g + 5;
  const red = r > g * 1.6 && r > b * 1.5 && !gold;
  switch (m) {
    case 'steel': return sat < 45 && !skin;
    case 'cloth': return blue;
    case 'cape': return blue || red;
    case 'leather': return r > g && g >= b && sat >= 25 && !gold && !skin && !red;
  }
}

function inRegion(band: Band, region: Region, x: number, y: number): boolean {
  if (region === 'cape') return band.cape.some(([x0, y0, x1, y1]) => x >= x0 && x < x1 && y >= y0 && y < y1);
  const [y0, y1] = band[region];
  if (y < y0 || y >= y1) return false;
  if (region === 'feet') return true;
  return !band.skip.some(([sx0, sy0, sx1, sy1]) => x >= sx0 && x < sx1 && y >= sy0 && y < sy1);
}

/** Repaint body gear onto a knight frame (in place). `view` is the unmirrored view. */
export function dyeFrame(
  data: ImageData,
  view: View,
  items: (string | null | undefined)[],
  bands: Record<View, Band> = KNIGHT_BANDS,
  /** Pixels to leave untouched (a hero's own face) */
  keep?: Uint8Array,
) {
  const band = bands[view];
  const { width: W, height: H, data: px } = data;
  for (const id of items) {
    const dye = id ? KNIGHT_DYES[id] : undefined;
    if (!dye) continue;
    for (const layer of dye.layers) {
      // Collect the pixels this layer repaints, and their luminance range
      const idx: number[] = [];
      const lums: number[] = [];
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          const i = (y * W + x) * 4;
          if (px[i + 3] === 0 || keep?.[y * W + x] || !inRegion(band, dye.region, x, y)) continue;
          const r = px[i], g = px[i + 1], b = px[i + 2];
          if (!layer.mats.some(m => isMaterial(m, r, g, b))) continue;
          idx.push(i);
          lums.push(0.299 * r + 0.587 * g + 0.114 * b);
        }
      }
      if (!idx.length) continue;
      const sorted = [...lums].sort((a, b) => a - b);
      const lo = sorted[Math.floor(sorted.length * 0.05)];
      const hi = sorted[Math.floor(sorted.length * 0.95)];
      const span = Math.max(hi - lo, 1);
      const stops = layer.ramp.map(hex);
      const blend = layer.blend?.map(hex);
      let yTop = H;
      let yBottom = 0;
      if (blend) idx.forEach(i => { const y = ((i / 4) / W) | 0; yTop = Math.min(yTop, y); yBottom = Math.max(yBottom, y); });

      idx.forEach((i, k) => {
        const t = (lums[k] - lo) / span;
        const p = i / 4;
        const x = p % W;
        const y = (p / W) | 0;
        let c: [number, number, number];
        if (dye.rainbow) {
          c = hsv((((y - 118) / 120) * 6 % 6 + 6) % 6 / 6, 0.75, 0.45 + 0.55 * Math.min(1, Math.max(0, t)));
        } else {
          c = sampleRamp(stops, t);
          if (blend) {
            const f = Math.min(1, Math.max(0, (y - yTop) / Math.max(1, yBottom - yTop)));
            const b = sampleRamp(blend, t);
            c = [c[0] + (b[0] - c[0]) * f, c[1] + (b[1] - c[1]) * f, c[2] + (b[2] - c[2]) * f];
          }
          if (dye.camo && ((((x >> 3) * 7 + (y >> 3) * 13) % 5) < 2)) c = [c[0] * 0.7, c[1] * 0.7, c[2] * 0.7];
          if (dye.sparkle && (x * 31 + y * 17) % 23 === 0) c = [255, 255, 255];
        }
        px[i] = c[0];
        px[i + 1] = c[1];
        px[i + 2] = c[2];
      });
    }
  }
}

export function hasBodyGear(items: (string | null | undefined)[]) {
  return items.some(id => !!id && !!KNIGHT_DYES[id]);
}

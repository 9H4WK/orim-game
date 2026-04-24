/**
 * ORIM — Direct Pixel Assets
 * Hand-coded character matrices following the Crusaders Quest 2.5-head tall Chibi proportions.
 */

export type PixelMatrix = string[];

export const HERO_PALETTE: Record<string, string> = {
  '.': 'transparent',
  'X': '#1a1033', // Outline
  'S': '#ffdcc4', // Skin Base
  's': '#fca5a5', // Skin Shadow
  'A': '#cbd5e1', // Armor Silver
  'a': '#94a3b8', // Armor Shadow
  'G': '#fde047', // Gold Trim
  'g': '#eab308', // Gold Shadow
  'P': '#a855f7', // Purple Detail
  'p': '#7e22ce', // Purple Shadow
  'B': '#3b82f6', // Blue
  'b': '#1d4ed8', // Blue shadow
  'R': '#ef4444', // Red
  'r': '#991b1b', // Red shadow
  'Y': '#fbbf24', // Yellow
  'y': '#d97706', // Yellow shadow
  'C': '#06b6d4', // Cyan
  'c': '#0891b2', // Cyan shadow
  'V': '#10b981', // Green
  'v': '#059669', // Green shadow
  'W': '#ffffff', // Highlight
  'K': '#1e293b', // Black / Cloth
  'E': '#0f172a', // Eye
};

// ── HERO DOWN ──────────────────────────────────────────────
export const HERO_DOWN_IDLE: PixelMatrix = [
  '....XXXXXX....',
  '...XXssssXX...',
  '..XXsSSSSsXX..',
  '.XXsSSSSSSsXX.',
  '.XSSSSSSSSSSX.',
  '.XSSSSSSSSSSX.',
  '.XSEWSSSSWESX.',
  '.XSEWSSSSWESX.',
  '.XSSSSSSSSSSX.',
  '..XXSSSSSsXX..',
  '..XXXXAXXXXX..',
  '..XAAPPPPAAX..',
  '..XAAGGGGAAX..',
  '..XAAPPPPAAX..',
  '..XAAGGGGAAX..',
  '..XXXXXXXXXX..',
  '...XXGXXGXX...',
  '...XXGXXGXX...',
  '....XX..XX....',
];

export const HERO_DOWN_HOP: PixelMatrix = [
  '..............',
  '....XXXXXX....',
  '...XXssssXX...',
  '..XXsSSSSsXX..',
  '.XXsSSSSSSsXX.',
  '.XSSSSSSSSSSX.',
  '.XSSSSSSSSSSX.',
  '.XSEWSSSSWESX.',
  '.XSEWSSSSWESX.',
  '..XXSSSSSSXX..',
  '..XXXXAXXXXX..',
  '..XAAPPPPAAX..',
  '..XAAGGGGAAX..',
  '..XAAPPPPAAX..',
  '..XAAGGGGAAX..',
  '..XXXXXXXXXX..',
  '...XXGXXGXX...',
  '...XXGXXGXX...',
];

// ── HERO UP ────────────────────────────────────────────────
export const HERO_UP_IDLE: PixelMatrix = [
  '....XXXXXX....',
  '...XXssssXX...',
  '..XXsSSSSsXX..',
  '.XXsSSSSSSsXX.',
  '.XSSSSSSSSSSX.',
  '.XSSSSSSSSSSX.',
  '.XSSSSSSSSSSX.',
  '.XSSSSSSSSSSX.',
  '.XSSSSSSSSSSX.',
  '..XXSSSSSSXX..',
  '..XXXXAXXXXX..',
  '..XAAPPPPAAX..',
  '..XAAGGGGAAX..',
  '..XAAPPPPAAX..',
  '..XAAGGGGAAX..',
  '..XXXXXXXXXX..',
  '...XXGXXGXX...',
  '...XXGXXGXX...',
  '....XX..XX....',
];

// ── HERO SIDE ──────────────────────────────────────────────
export const HERO_SIDE_IDLE: PixelMatrix = [
  '....XXXXXX....',
  '...XXssssXX...',
  '..XXsSSSSsXX..',
  '.XXsSSSSSSsXX.',
  '.XXSSSSSSSSSX.',
  '.XXSSSSSSSSSX.',
  '.XXSSSWSWSESX.',
  '.XXSSSWSWSESX.',
  '.XXSSSSSSSSSX.',
  '..XXSSSSSSXX..',
  '..XXXXAXXXXX..',
  '..XAAPPPPAAX..',
  '..XAAGGGGAAX..',
  '..XAAPPPPAAX..',
  '..XAAGGGGAAX..',
  '..XXXXXXXXXX..',
  '...XXGXXGXX...',
  '...XXGXXGXX...',
  '....XX..XX....',
];

// ── EQUIPMENT: ROYAL CROWN ─────────────────────────────────
export const CROWN_DOWN: PixelMatrix = [
  '....XGGGGX....',
  '....XGPGGX....',
  '..XXGPGGPGGXX.',
  '..XGGPppPGGX.',
  '..XXXXXXXXXX.',
];
export const CROWN_UP: PixelMatrix   = CROWN_DOWN;
export const CROWN_SIDE: PixelMatrix = [
  '......XGGGX...',
  '......XGPGX...',
  '....XXGPGGXX..',
  '....XGGPppGX..',
  '....XXXXXXXX..',
];

// ── EQUIPMENT: WIZARD HAT ──────────────────────────────────
export const WIZ_HAT_DOWN: PixelMatrix = [
  '.....XXXX.....',
  '.....XPpX.....',
  '....XPppPX....',
  '..XXXPppPXXX..',
  '.XPPPPPPPPPPX.',
  '.XppppppppppX.',
  '.XXXXXXXXXXXX.',
];

// ── EQUIPMENT: KNIGHT PLATE ────────────────────────────────
export const PLATE_DOWN: PixelMatrix = [
  '..XXXXAXXXXX..',
  '..XAAPPPPAAX..',
  '..XAAGGGGAAX..',
  '..XAAPPPPAAX..',
  '..XAAGGGGAAX..',
  '..XXXXXXXXXX..',
];

// ── EQUIPMENT: GILDED GREAVES (PANTS) ──────────────────────
export const PANTS_GOLD: PixelMatrix = [
  '..XXGXXGXX..',
  '..XXGXXGXX..',
  '..XXXXXXXX..',
];

// ── EQUIPMENT: CAMO CARGO (PANTS) ──────────────────────────
export const PANTS_CAMO: PixelMatrix = [
  '..XXVXXvXX..',
  '..XXvXXVXX..',
  '..XXXXXXXX..',
];

// ── EQUIPMENT: SPEED BOOTS (SHOES) ─────────────────────────
export const SHOES_SPEED: PixelMatrix = [
  '.XXX...XXX.',
  '.XRRX.XRRX.',
  '.XXXX.XXXX.',
];

// ── EQUIPMENT: CRYSTAL BOOTS (SHOES) ───────────────────────
export const SHOES_CRYSTAL: PixelMatrix = [
  '.XXX...XXX.',
  '.XCCX.XCCX.',
  '.XXXX.XXXX.',
];

// ── EQUIPMENT: PIXEL KICKS (SHOES) ─────────────────────────
export const SHOES_PIXEL: PixelMatrix = [
  '.XXX...XXX.',
  '.XKKX.XKKX.',
  '.XXXX.XXXX.',
];

// ── EQUIPMENT: PIXEL BLADE (ACC) ───────────────────────────
export const SWORD_SIDE: PixelMatrix = [
  '.......XX.....',
  '......XSSX....',
  '.....XSSX.....',
  '....XSSX......',
  '..XXSSX.......',
  '.XGGX.........',
  '.XX...........',
];

// ── EQUIPMENT: STAR WAND (ACC) ─────────────────────────────
export const WAND_SIDE: PixelMatrix = [
  '.......YW.....',
  '......YYY.....',
  '.....XPPX.....',
  '....XPPX......',
  '...XPPX.......',
  '..XPPX........',
  '.XX...........',
];

// ── EQUIPMENT: ROYAL CAPE ──────────────────────────────────
export const CAPE_DOWN: PixelMatrix = [
  '..XXXXXXXXXX..',
  '.XPPPPPPPPPPX.',
  '.XPPPPPPPPPPX.',
  '.XPPPPPPPPPPX.',
  '.XPPPPPPPPPPX.',
  '.XPPPPPPPPPPX.',
  '.XPPPPPPPPPPX.',
  '.XPPPPPPPPPPX.',
  '..XXXXXXXXXX..',
];
export const CAPE_UP: PixelMatrix   = CAPE_DOWN;
export const CAPE_SIDE: PixelMatrix = [
  '....XXXXXX....',
  '...XPPPPPX....',
  '...XPPPPPX....',
  '...XPPPPPX....',
  '...XPPPPPX....',
  '...XPPPPPX....',
  '...XPPPPPX....',
  '...XPPPPPX....',
  '....XXXXXX....',
];

// ── EQUIPMENT: JESTER CAP ──────────────────────────────────
export const JESTER_DOWN: PixelMatrix = [
  '..XR..XX..YX..',
  '..XR..XX..YX..',
  '.XRRXXWWXXYYX.',
  '.XRRWWWWWWYYX.',
  '.XXXXXXXXXXXX.',
];

// ── EQUIPMENT: CYBER HELMET ────────────────────────────────
export const CYBER_DOWN: PixelMatrix = [
  '....XXXXXX....',
  '...XCCCCCCX...',
  '..XCCCCCCccX..',
  '.XCCcCCCCCCcX.',
  '.XXXXXXXXXXXX.',
];

// ── EQUIPMENT: NEON HALO ───────────────────────────────────
export const HALO_DOWN: PixelMatrix = [
  '....WWWWWW....',
  '...WYYYYYYW...',
  '..WYWWWWWWYW..',
  '...WYYYYYYW...',
  '....WWWWWW....',
];

// ── EQUIPMENT: CYBER SHADES ────────────────────────────────
export const SHADES_DOWN: PixelMatrix = [
  '.XCCCCCCCCCCX.',
  '.XcccccccXccX.',
];

/**
 * Maps item IDs to their specific character-overlay matrices.
 * Categories: hat (offset: -4), shirt (10), pants (16), shoes (17), accessory (front/back)
 */
export const ITEM_OVERLAYS: Record<string, { down: PixelMatrix; up?: PixelMatrix; side?: PixelMatrix; offset: number }> = {
  // HATS
  'hat_crown':     { down: CROWN_DOWN, up: CROWN_UP, side: CROWN_SIDE, offset: -2 },
  'hat_wizard':    { down: WIZ_HAT_DOWN, offset: -5 },
  'hat_cyber':     { down: CYBER_DOWN, offset: -2 },
  'hat_pixel':     { down: CYBER_DOWN, offset: -2 },
  'hat_jester':    { down: JESTER_DOWN, offset: -3 },
  'egg_ghost':     { down: WIZ_HAT_DOWN, offset: -4 },
  'egg_neon_hat':  { down: HALO_DOWN, offset: -6 },
  
  // SHIRTS/CAPES
  'shirt_knight':  { down: PLATE_DOWN, offset: 10 },
  'shirt_neon':    { down: PLATE_DOWN, offset: 10 },
  'shirt_pirate':  { down: PLATE_DOWN, offset: 10 },
  'shirt_hoodie':  { down: PLATE_DOWN, offset: 10 },
  'shirt_solana':  { down: PLATE_DOWN, offset: 10 },
  'egg_rainbow':   { down: CAPE_DOWN, up: CAPE_UP, side: CAPE_SIDE, offset: 10 },
  'egg_dark_cape': { down: CAPE_DOWN, up: CAPE_UP, side: CAPE_SIDE, offset: 10 },

  // PANTS
  'pants_gold':    { down: PANTS_GOLD, offset: 16 },
  'pants_camo':    { down: PANTS_CAMO, offset: 16 },
  'pants_cyber':   { down: PANTS_CAMO, offset: 16 },

  // SHOES
  'shoes_speed':   { down: SHOES_SPEED, offset: 17 },
  'shoes_pixel':   { down: SHOES_PIXEL, offset: 17 },
  'shoes_crystal': { down: SHOES_CRYSTAL, offset: 17 },

  // ACCESSORIES
  'acc_sword':     { down: SWORD_SIDE, offset: 5 },
  'acc_wand':      { down: WAND_SIDE, offset: 5 },
  'acc_wings':     { down: CAPE_DOWN, offset: 10 },
  'acc_compass':   { down: PANTS_GOLD, offset: 10 },
  'acc_shades':    { down: SHADES_DOWN, offset: 2 }, 
};

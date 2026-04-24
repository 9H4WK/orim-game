/**
 * ORIM — Direct Item Pixel Assets
 * Hand-coded matrices for shop item icons.
 */

export type PixelMatrix = string[];

export const ITEM_PALETTE: Record<string, string> = {
  '.': 'transparent',
  'X': '#1a1033', // Outline
  'G': '#fde047', // Gold 
  'g': '#ca8a04', // Gold shadow
  'P': '#a855f7', // Purple
  'p': '#7e22ce', // Purple shadow
  'B': '#3b82f6', // Blue
  'b': '#1d4ed8', // Blue shadow
  'R': '#ef4444', // Red
  'r': '#991b1b', // Red shadow
  'S': '#cbd5e1', // Silver
  's': '#64748b', // Silver shadow
  'Y': '#fbbf24', // Yellow
  'W': '#ffffff', // White / Highlight
  'K': '#1e293b', // Black / Dark grey
  'C': '#06b6d4', // Cyan
  'V': '#10b981', // Green
  'v': '#065f46', // Dark green
  'O': '#f97316', // Orange
};

// ── HATS ───────────────────────────────────────────────────

export const ICON_HAT_WIZARD: PixelMatrix = [
  '....XXXX....',
  '....XPpX....',
  '...XPppPX...',
  '..XXPppPXX..',
  '.XPPPPPPPPX.',
  '.XppppppppX.',
  '.XXXXXXXXXX.',
];

export const ICON_HAT_CROWN: PixelMatrix = [
  '..XG..GG..GX..',
  '..XG..GG..GX..',
  '.XGGGGGGGGGGX.',
  '.XGggggggggGX.',
  '.XXXXXXXXXXXX.',
];

export const ICON_HAT_CYBER: PixelMatrix = [
  '....XXXXXX....',
  '...XCCCCCCX...',
  '..XCCCCCCccX..',
  '.XCCcCCCCCCcX.',
  '.XXXXXXXXXXXX.',
];

export const ICON_HAT_PIXEL: PixelMatrix = [
  '....XXXXXX....',
  '...XBBBBBBX...',
  '..XBBBBBBBBX..',
  '.XBBBBBBBBBBX.',
  '.XXXXXXBBXXX..',
];

export const ICON_HAT_JESTER: PixelMatrix = [
  '..XR..XX..YX..',
  '..XR..XX..YX..',
  '.XRRXXWWXXYYX.',
  '.XRRWWWWWWYYX.',
  '.XXXXXXXXXXXX.',
];

// ── SHIRTS ─────────────────────────────────────────────────

export const ICON_SHIRT_KNIGHT: PixelMatrix = [
  '..XXXXXXXXXX..',
  '.XSSSSS SSSSX.',
  '.XSSSSSS SSSX.',
  '.XSSSSSS SSSX.',
  '.XSSSSSS SSSX.',
  '.XXXXXXXXXXXX.',
];

export const ICON_SHIRT_NEON: PixelMatrix = [
  '..XXXXXXXXXX..',
  '.XVVVVVVVVVVX.',
  '.XVVVVVVVVVVX.',
  '.XVVVVVVVVVVX.',
  '.XVVVVVVVVVVX.',
  '.XXXXXXXXXXXX.',
];

export const ICON_SHIRT_PIRATE: PixelMatrix = [
  '..XXXXXXXXXX..',
  '.XBBBBKKBBBBX.',
  '.XBBBK KBBBX.',
  '.XBBBKKKKBBBX.',
  '.XBBBBKKBBBBX.',
  '.XXXXXXXXXXXX.',
];

export const ICON_SHIRT_HOODIE: PixelMatrix = [
  '..XXXXXXXXXX..',
  '.XKKKKKKKKKKX.',
  '.XKKKKKKKKKKX.',
  '.XKKKKKKKKKKX.',
  '.XKKKKKKKKKKX.',
  '.XXXXXXXXXXXX.',
];

export const ICON_SHIRT_SOLANA: PixelMatrix = [
  '..XXXXXXXXXX..',
  '.XPPPPPPPPPPX.',
  '.XPPVVVVVVPPX.',
  '.XPPVVVVVVPPX.',
  '.XPPPPPPPPPPX.',
  '.XXXXXXXXXXXX.',
];

// ── PANTS ──────────────────────────────────────────────────

export const ICON_PANTS_GENERIC: PixelMatrix = [
  '....XXXXXX....',
  '..XXXXXXXXXX..',
  '.XKKKKXXKKKKX.',
  '.XKKKKXXKKKKX.',
  '.XKKKKXXKKKKX.',
  '.XKKKKXXKKKKX.',
  '..XXXX..XXXX..',
];

export const ICON_PANTS_GOLD: PixelMatrix = [
  '....XXXXXX....',
  '..XXXXXXXXXX..',
  '.XGGGGXXGGGGX.',
  '.XGGGGXXGGGGX.',
  '.XGGGGXXGGGGX.',
  '.XGGGGXXGGGGX.',
  '..XXXX..XXXX..',
];
// ── SHOES ──────────────────────────────────────────────────

export const ICON_SHOES_SPEED: PixelMatrix = [
  '....XXXXXX....',
  '...XRRRRRRX...',
  '..XRYYRRRRRX..',
  '.XRYYRRRRRRX..',
  '.XXXXXXXXXXXX.',
];

export const ICON_SHOES_PIXEL: PixelMatrix = [
  '....XXXXXX....',
  '...XSSSSSSX...',
  '..XSSSSSSSSX..',
  '.XSSSSSSSSSSX.',
  '.XXXXXXXXXXXX.',
];

export const ICON_SHOES_CRYSTAL: PixelMatrix = [
  '....XXXXXX....',
  '...XCCCCCCX...',
  '..XCCCCCCCCX..',
  '.XCCCCCCCCCCX.',
  '.XXXXXXXXXXXX.',
];

// ── ACCESSORIES ────────────────────────────────────────────

export const ICON_ACC_WINGS: PixelMatrix = [
  '...XX....XX...',
  '..XWWX..XWWX..',
  '.XWWWWXXWWWWX.',
  '.XWWWWWWWWWWX.',
  '..XXXXXXXXXX..',
];

export const ICON_ACC_SWORD: PixelMatrix = [
  '.......XX.....',
  '......XSSX....',
  '.....XSSX.....',
  '....XSSX......',
  '..XXSSX.......',
  '.XGGX.........',
  '.XX...........',
];

export const ICON_ACC_WAND: PixelMatrix = [
  '.......YW.....',
  '......YYY.....',
  '.....XPPX.....',
  '....XPPX......',
  '...XPPX.......',
  '..XPPX........',
  '.XX...........',
];

export const ICON_ACC_COMPASS: PixelMatrix = [
  '....XXXXXX....',
  '...XGGGGGGX...',
  '..XGGGRGGGX...',
  '..XGGGGGGGX...',
  '....XXXXXX....',
];

export const ICON_ACC_SHADES: PixelMatrix = [
  '..............',
  '..XXXXXXXXXX..',
  '.XCCCCCCCCCCX.',
  '.XcccccccXccX.',
  '..XXXXXXX.XX..',
];

// ── EASTER EGGS ────────────────────────────────────────────

export const ICON_EGG_GHOST: PixelMatrix = [
  '....WWWW....',
  '...WWSWW....',
  '..WWWWWWWW..',
  '..WK WKKWWW..',
  '..WWWWWWWW..',
  '..W.W.W.W...',
];

export const ICON_EGG_RAINBOW: PixelMatrix = [
  '.XRRRRRRRRRRX.',
  '.XOOOOOOOOOOX.',
  '.XYYYYYYYYYYX.',
  '.XVVVVVVVVVVX.',
  '.XBBBBBBBBBBX.',
  '.XPPPPPPPPPPX.',
];

export const ICON_EGG_DRAGON: PixelMatrix = [
  '....VVVV....',
  '...VVVVVV...',
  '..VVVOOVV...',
  '..VVVVVVV...',
  '...VVVVV....',
  '..V.V.V.....',
];

export const ICON_EGG_HALO: PixelMatrix = [
  '....WWWWWW....',
  '...WYYYYYYW...',
  '..WYWWWWWWYW..',
  '...WYYYYYYW...',
  '....WWWWWW....',
];

export const ICON_EGG_VORTEX: PixelMatrix = [
  '....XXXXXX....',
  '...XPPPPPPX...',
  '..XPPKKKPPX..',
  '..XPKKKKPX..',
  '...XPPPPPPX....',
  '....XXXXXX....',
];

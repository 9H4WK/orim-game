import * as Icons from '@/lib/maze/itemPixels';

export type ItemCategory = 'hat' | 'shirt' | 'pants' | 'shoes' | 'accessory';
/** In-game coins only. Coins are earned by playing and are never exchangeable for airtime or money. */
export type Currency = 'COINS';

export interface ShopItem {
  id: string;
  name: string;
  description: string;
  category: ItemCategory;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  price: number;
  currency: Currency;
  colorTop: string;    // pixel sprite top color
  colorBottom: string; // pixel sprite bottom color
  isEasterEgg?: boolean;
  emoji: string;
  pixelMatrix?: string[];
}

export const SHOP_ITEMS: ShopItem[] = [
  // ── Hats ──────────────────────────────────────────────────
  { id: 'hat_wizard',    name: 'Wizard Hat',     description: 'A tall purple hat with a gold star.', category: 'hat',       rarity: 'rare',      price: 200,   currency: 'COINS', colorTop: '#7c3aed', colorBottom: '#5b21b6', emoji: '🧙', pixelMatrix: Icons.ICON_HAT_WIZARD },
  { id: 'hat_crown',     name: 'Royal Crown',    description: 'Gold, set with gems. Sits right on the helmet.',           category: 'hat',       rarity: 'legendary', price: 900,   currency: 'COINS',   colorTop: '#fbbf24', colorBottom: '#d97706', emoji: '👑', pixelMatrix: Icons.ICON_HAT_CROWN },
  { id: 'hat_cyber',     name: 'Cyber Visor',   description: 'A glowing blue visor across the eyes.',       category: 'hat',       rarity: 'epic',      price: 600,   currency: 'COINS', colorTop: '#06b6d4', colorBottom: '#0284c7', emoji: '🪖', pixelMatrix: Icons.ICON_HAT_CYBER },
  { id: 'hat_pixel',     name: 'Pixel Cap',      description: 'A blue cap. Simple, and always in style.',         category: 'hat',       rarity: 'common',    price: 50,    currency: 'COINS', colorTop: '#1e40af', colorBottom: '#1e3a8a', emoji: '🧢', pixelMatrix: Icons.ICON_HAT_PIXEL },
  { id: 'hat_jester',    name: 'Jester Cap',     description: 'Red and purple, with a bell on each point.',      category: 'hat',       rarity: 'rare',      price: 150,   currency: 'COINS', colorTop: '#ef4444', colorBottom: '#fbbf24', emoji: '🃏', pixelMatrix: Icons.ICON_HAT_JESTER },

  // ── Shirts ────────────────────────────────────────────────
  { id: 'shirt_knight',  name: 'Mithril Plate',   description: 'Pale steel plate that catches the light.',      category: 'shirt',     rarity: 'epic',      price: 550,   currency: 'COINS',  colorTop: '#94a3b8', colorBottom: '#64748b', emoji: '⚔️', pixelMatrix: Icons.ICON_SHIRT_KNIGHT },
  { id: 'shirt_neon',    name: 'Neon Plate',    description: 'Armour lacquered in bright green.',  category: 'shirt',     rarity: 'rare',      price: 300,   currency: 'COINS', colorTop: '#10b981', colorBottom: '#059669', emoji: '🟢', pixelMatrix: Icons.ICON_SHIRT_NEON },
  { id: 'shirt_pirate',  name: 'Corsair Plate',    description: 'Navy plate with a crimson sash.',          category: 'shirt',     rarity: 'rare',      price: 250,   currency: 'COINS', colorTop: '#1e3a8a', colorBottom: '#991b1b', emoji: '🏴‍☠️', pixelMatrix: Icons.ICON_SHIRT_PIRATE },
  { id: 'shirt_hoodie',  name: 'Shadow Plate',   description: 'Blackened steel, for quiet runs.',      category: 'shirt',     rarity: 'common',    price: 80,    currency: 'COINS', colorTop: '#374151', colorBottom: '#1f2937', emoji: '🎤', pixelMatrix: Icons.ICON_SHIRT_HOODIE },
  { id: 'shirt_solana',  name: 'Aurora Plate',  description: 'Purple fading to green, like the northern lights.', category: 'shirt',     rarity: 'legendary', price: 1000,  currency: 'COINS',   colorTop: '#9945ff', colorBottom: '#14f195', emoji: '🌌', pixelMatrix: Icons.ICON_SHIRT_SOLANA },

  // ── Pants ─────────────────────────────────────────────────
  { id: 'pants_camo',    name: 'Camo Greaves',     description: 'Olive leg plates with a camo pattern.',         category: 'pants',     rarity: 'common',    price: 60,    currency: 'COINS', colorTop: '#4b5320', colorBottom: '#556b2f', emoji: '🌿', pixelMatrix: Icons.ICON_PANTS_GENERIC },
  { id: 'pants_gold',    name: 'Gilded Greaves', description: 'Leg plates in polished gold.',         category: 'pants',     rarity: 'legendary', price: 1000,  currency: 'COINS',  colorTop: '#fbbf24', colorBottom: '#92400e', emoji: '✨', pixelMatrix: Icons.ICON_PANTS_GOLD },
  { id: 'pants_cyber',   name: 'Voltage Greaves',  description: 'Violet leg plates with a bright edge.',           category: 'pants',     rarity: 'epic',      price: 400,   currency: 'COINS', colorTop: '#7c3aed', colorBottom: '#312e81', emoji: '💜', pixelMatrix: Icons.ICON_PANTS_GENERIC },

  // ── Shoes ─────────────────────────────────────────────────
  { id: 'shoes_speed',   name: 'Sonic Boots',    description: 'Red and orange, like they are already running.',   category: 'shoes',     rarity: 'epic',      price: 650,   currency: 'COINS',   colorTop: '#fbbf24', colorBottom: '#ef4444', emoji: '⚡', pixelMatrix: Icons.ICON_SHOES_SPEED },
  { id: 'shoes_pixel',   name: 'Ivory Boots',    description: 'Clean white boots.',       category: 'shoes',     rarity: 'common',    price: 40,    currency: 'COINS', colorTop: '#f1f5f9', colorBottom: '#94a3b8', emoji: '👟', pixelMatrix: Icons.ICON_SHOES_PIXEL },
  { id: 'shoes_crystal', name: 'Gemstone Boots', description: 'Ice-blue boots that sparkle as you walk.',         category: 'shoes',     rarity: 'legendary', price: 1200,  currency: 'COINS',  colorTop: '#bae6fd', colorBottom: '#7dd3fc', emoji: '💎', pixelMatrix: Icons.ICON_SHOES_CRYSTAL },

  // ── Accessories ───────────────────────────────────────────
  { id: 'acc_wings',     name: 'Angel Wings',    description: 'White wings on your back. Your shield comes off.',       category: 'accessory', rarity: 'legendary', price: 1100,  currency: 'COINS',   colorTop: '#f1f5f9', colorBottom: '#cbd5e1', emoji: '🪶', pixelMatrix: Icons.ICON_ACC_WINGS },
  { id: 'acc_sword',     name: 'Rune Blade',    description: 'A greatsword with glowing runes, worn on the back.',                category: 'accessory', rarity: 'rare',      price: 180,   currency: 'COINS', colorTop: '#94a3b8', colorBottom: '#64748b', emoji: '🗡️', pixelMatrix: Icons.ICON_ACC_SWORD },
  { id: 'acc_wand',      name: 'Star Wand',      description: 'A wand with a star that floats beside you.',        category: 'accessory', rarity: 'rare',      price: 220,   currency: 'COINS', colorTop: '#c084fc', colorBottom: '#7c3aed', emoji: '🪄', pixelMatrix: Icons.ICON_ACC_WAND },
  { id: 'acc_compass',   name: 'Gilded Compass', description: 'A gold compass that floats beside you.',        category: 'accessory', rarity: 'epic',      price: 500,   currency: 'COINS', colorTop: '#fbbf24', colorBottom: '#92400e', emoji: '🧭', pixelMatrix: Icons.ICON_ACC_COMPASS },
  { id: 'acc_shades',    name: 'Cyber Shades',   description: 'Black shades with a neon glint.',          category: 'accessory', rarity: 'epic',      price: 250,   currency: 'COINS', colorTop: '#06b6d4', colorBottom: '#0891b2', emoji: '🕶️', pixelMatrix: Icons.ICON_ACC_SHADES },

  // ── Easter Egg Items (found through exploration) ─────────
  { id: 'egg_ghost',     name: 'Soul Mask',      description: 'A hollow-eyed mask. Only found inside the mazes.',       category: 'hat',  rarity: 'legendary', price: 0, currency: 'COINS', colorTop: '#f1f5f9', colorBottom: '#94a3b8', emoji: '👻', isEasterEgg: true, pixelMatrix: Icons.ICON_EGG_GHOST },
  { id: 'egg_rainbow',   name: 'Prism Cape',     description: 'A rainbow cape. Only found inside the mazes.',        category: 'shirt',rarity: 'legendary', price: 0, currency: 'COINS', colorTop: '#ef4444', colorBottom: '#8b5cf6', emoji: '🌈', isEasterEgg: true, pixelMatrix: Icons.ICON_EGG_RAINBOW },
  { id: 'egg_pixel_pet', name: 'Lil\' Dragon',   description: 'A tiny dragon that follows you. Only found inside the mazes.',      category: 'accessory', rarity: 'legendary', price: 0, currency: 'COINS', colorTop: '#10b981', colorBottom: '#065f46', emoji: '🐉', isEasterEgg: true, pixelMatrix: Icons.ICON_EGG_DRAGON },
  { id: 'egg_neon_hat',  name: 'Neon Halo',      description: 'A ring of light above your head. Only found inside the mazes.',     category: 'hat',  rarity: 'legendary', price: 0, currency: 'COINS', colorTop: '#fbbf24', colorBottom: '#f59e0b', emoji: '😇', isEasterEgg: true, pixelMatrix: Icons.ICON_EGG_HALO },
  { id: 'egg_dark_cape', name: 'Vortex Shroud',  description: 'A deep violet cape. Only found inside the mazes.',      category: 'shirt',rarity: 'legendary', price: 0, currency: 'COINS', colorTop: '#1e1e35', colorBottom: '#7c3aed', emoji: '🦇', isEasterEgg: true, pixelMatrix: Icons.ICON_EGG_VORTEX },
];

export const EASTER_EGG_ITEM_IDS = SHOP_ITEMS
  .filter(i => i.isEasterEgg)
  .map(i => i.id);

export const RARITY_COLORS: Record<ShopItem['rarity'], string> = {
  common:    '#94a3b8',
  rare:      '#3b82f6',
  epic:      '#a855f7',
  legendary: '#fbbf24',
};

export function getItemById(id: string): ShopItem | undefined {
  return SHOP_ITEMS.find(i => i.id === id);
}

export function getShopItems(): ShopItem[] {
  return SHOP_ITEMS.filter(i => !i.isEasterEgg);
}

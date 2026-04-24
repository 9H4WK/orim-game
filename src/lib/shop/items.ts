import * as Icons from '@/lib/maze/itemPixels';

export type ItemCategory = 'hat' | 'shirt' | 'pants' | 'shoes' | 'accessory';
export type Currency = 'SOL' | 'USDC' | 'USDT' | 'COINS';

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
  { id: 'hat_wizard',    name: 'Wizard Hat',     description: 'A mysterious purple hat imbued with arcane energy.', category: 'hat',       rarity: 'rare',      price: 200,   currency: 'COINS', colorTop: '#7c3aed', colorBottom: '#5b21b6', emoji: '🧙', pixelMatrix: Icons.ICON_HAT_WIZARD },
  { id: 'hat_crown',     name: 'Royal Crown',    description: 'The ancient crown of a forgotten kingdom.',           category: 'hat',       rarity: 'legendary', price: 0.05,  currency: 'SOL',   colorTop: '#fbbf24', colorBottom: '#d97706', emoji: '👑', pixelMatrix: Icons.ICON_HAT_CROWN },
  { id: 'hat_cyber',     name: 'Cyber Helmet',   description: 'Built for the digital warriors of the future.',       category: 'hat',       rarity: 'epic',      price: 1.0,   currency: 'USDC',  colorTop: '#06b6d4', colorBottom: '#0284c7', emoji: '🪖', pixelMatrix: Icons.ICON_HAT_CYBER },
  { id: 'hat_pixel',     name: 'Pixel Cap',      description: 'A comfortable cap for everyday exploration.',         category: 'hat',       rarity: 'common',    price: 50,    currency: 'COINS', colorTop: '#1e40af', colorBottom: '#1e3a8a', emoji: '🧢', pixelMatrix: Icons.ICON_HAT_PIXEL },
  { id: 'hat_jester',    name: 'Jester Cap',     description: 'Worn by the legendary tricksters of the court.',      category: 'hat',       rarity: 'rare',      price: 150,   currency: 'COINS', colorTop: '#ef4444', colorBottom: '#fbbf24', emoji: '🃏', pixelMatrix: Icons.ICON_HAT_JESTER },

  // ── Shirts ────────────────────────────────────────────────
  { id: 'shirt_knight',  name: 'Knight Plate',   description: 'Gleaming armor forged in the fires of destiny.',      category: 'shirt',     rarity: 'epic',      price: 0.5,   currency: 'USDC',  colorTop: '#94a3b8', colorBottom: '#64748b', emoji: '⚔️', pixelMatrix: Icons.ICON_SHIRT_KNIGHT },
  { id: 'shirt_neon',    name: 'Neon Jacket',    description: 'Vibrant threads that glow in the darkest dungeons.',  category: 'shirt',     rarity: 'rare',      price: 300,   currency: 'COINS', colorTop: '#10b981', colorBottom: '#059669', emoji: '🟢', pixelMatrix: Icons.ICON_SHIRT_NEON },
  { id: 'shirt_pirate',  name: 'Pirate Coat',    description: 'The rugged attire of a sea-faring captain.',          category: 'shirt',     rarity: 'rare',      price: 250,   currency: 'COINS', colorTop: '#1e3a8a', colorBottom: '#991b1b', emoji: '🏴‍☠️', pixelMatrix: Icons.ICON_SHIRT_PIRATE },
  { id: 'shirt_hoodie',  name: 'Urban Hoodie',   description: 'Soft, stealthy, and perfect for quick escapes.',      category: 'shirt',     rarity: 'common',    price: 80,    currency: 'COINS', colorTop: '#374151', colorBottom: '#1f2937', emoji: '🎤', pixelMatrix: Icons.ICON_SHIRT_HOODIE },
  { id: 'shirt_solana',  name: 'Solana Jersey',  description: 'Woven with the spirit of high-speed consensus.',      category: 'shirt',     rarity: 'legendary', price: 1.0,   currency: 'SOL',   colorTop: '#9945ff', colorBottom: '#14f195', emoji: '◎', pixelMatrix: Icons.ICON_SHIRT_SOLANA },

  // ── Pants ─────────────────────────────────────────────────
  { id: 'pants_camo',    name: 'Camo Cargo',     description: 'Tactical pants designed for shadow-walking.',         category: 'pants',     rarity: 'common',    price: 60,    currency: 'COINS', colorTop: '#4b5320', colorBottom: '#556b2f', emoji: '🌿', pixelMatrix: Icons.ICON_PANTS_GENERIC },
  { id: 'pants_gold',    name: 'Gilded Greaves', description: 'Heirloom pants passed down through royalty.',         category: 'pants',     rarity: 'legendary', price: 2.0,   currency: 'USDT',  colorTop: '#fbbf24', colorBottom: '#92400e', emoji: '✨', pixelMatrix: Icons.ICON_PANTS_GOLD },
  { id: 'pants_cyber',   name: 'Voltage Pants',  description: 'Charged with energy to boost your stride.',           category: 'pants',     rarity: 'epic',      price: 400,   currency: 'COINS', colorTop: '#7c3aed', colorBottom: '#312e81', emoji: '💜', pixelMatrix: Icons.ICON_PANTS_GENERIC },

  // ── Shoes ─────────────────────────────────────────────────
  { id: 'shoes_speed',   name: 'Sonic Boots',    description: 'Legend says these boots defy the laws of gravity.',   category: 'shoes',     rarity: 'epic',      price: 0.3,   currency: 'SOL',   colorTop: '#fbbf24', colorBottom: '#ef4444', emoji: '⚡', pixelMatrix: Icons.ICON_SHOES_SPEED },
  { id: 'shoes_pixel',   name: 'Pixel Kicks',    description: 'Standard-issue footwear for novice explorers.',       category: 'shoes',     rarity: 'common',    price: 40,    currency: 'COINS', colorTop: '#f1f5f9', colorBottom: '#94a3b8', emoji: '👟', pixelMatrix: Icons.ICON_SHOES_PIXEL },
  { id: 'shoes_crystal', name: 'Gemstone Boots', description: 'Translucent boots carved from pure crystal.',         category: 'shoes',     rarity: 'legendary', price: 5.0,   currency: 'USDC',  colorTop: '#bae6fd', colorBottom: '#7dd3fc', emoji: '💎', pixelMatrix: Icons.ICON_SHOES_CRYSTAL },

  // ── Accessories ───────────────────────────────────────────
  { id: 'acc_wings',     name: 'Angel Wings',    description: 'Blessed feathers that grant an ethereal glow.',       category: 'accessory', rarity: 'legendary', price: 0.1,   currency: 'SOL',   colorTop: '#f1f5f9', colorBottom: '#cbd5e1', emoji: '🪶', pixelMatrix: Icons.ICON_ACC_WINGS },
  { id: 'acc_sword',     name: 'Pixel Blade',    description: 'A sharp companion for any dark maze.',                category: 'accessory', rarity: 'rare',      price: 180,   currency: 'COINS', colorTop: '#94a3b8', colorBottom: '#64748b', emoji: '🗡️', pixelMatrix: Icons.ICON_ACC_SWORD },
  { id: 'acc_wand',      name: 'Star Wand',      description: 'Radiates with the light of a thousand stars.',        category: 'accessory', rarity: 'rare',      price: 220,   currency: 'COINS', colorTop: '#c084fc', colorBottom: '#7c3aed', emoji: '🪄', pixelMatrix: Icons.ICON_ACC_WAND },
  { id: 'acc_compass',   name: 'Gilded Compass', description: 'Will guide you even through the densest fog.',        category: 'accessory', rarity: 'epic',      price: 500,   currency: 'COINS', colorTop: '#fbbf24', colorBottom: '#92400e', emoji: '🧭', pixelMatrix: Icons.ICON_ACC_COMPASS },
  { id: 'acc_shades',    name: 'Cyber Shades',   description: 'Digital eyewear for the elite maze runners.',          category: 'accessory', rarity: 'epic',      price: 250,   currency: 'COINS', colorTop: '#06b6d4', colorBottom: '#0891b2', emoji: '🕶️', pixelMatrix: Icons.ICON_ACC_SHADES },

  // ── Easter Egg Items (found through exploration) ─────────
  { id: 'egg_ghost',     name: 'Soul Mask',      description: '⚠️ Cursed artifact found within the labyrinth.',       category: 'hat',  rarity: 'legendary', price: 0, currency: 'COINS', colorTop: '#f1f5f9', colorBottom: '#94a3b8', emoji: '👻', isEasterEgg: true, pixelMatrix: Icons.ICON_EGG_GHOST },
  { id: 'egg_rainbow',   name: 'Prism Cape',     description: '⚠️ Radiant cloak discovered in a secret hall.',        category: 'shirt',rarity: 'legendary', price: 0, currency: 'COINS', colorTop: '#ef4444', colorBottom: '#8b5cf6', emoji: '🌈', isEasterEgg: true, pixelMatrix: Icons.ICON_EGG_RAINBOW },
  { id: 'egg_pixel_pet', name: 'Lil\' Dragon',   description: '⚠️ A tiny companion found hatching in darkness.',      category: 'accessory', rarity: 'legendary', price: 0, currency: 'COINS', colorTop: '#10b981', colorBottom: '#065f46', emoji: '🐉', isEasterEgg: true, pixelMatrix: Icons.ICON_EGG_DRAGON },
  { id: 'egg_neon_hat',  name: 'Neon Halo',      description: '⚠️ Spectral light salvaged from a broken portal.',     category: 'hat',  rarity: 'legendary', price: 0, currency: 'COINS', colorTop: '#fbbf24', colorBottom: '#f59e0b', emoji: '😇', isEasterEgg: true, pixelMatrix: Icons.ICON_EGG_HALO },
  { id: 'egg_dark_cape', name: 'Vortex Shroud',  description: '⚠️ Shadowy fabric found at the edge of the void.',      category: 'shirt',rarity: 'legendary', price: 0, currency: 'COINS', colorTop: '#1e1e35', colorBottom: '#7c3aed', emoji: '🦇', isEasterEgg: true, pixelMatrix: Icons.ICON_EGG_VORTEX },
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

/**
 * ORIM — Hero gear
 * Hats and accessories drawn for the hero sprites (3px pixel grid, shaded), served from /gear.
 * Placements are [centre x, bottom y, scale] in hero-frame pixels (244 × 244);
 * left-facing reuses the right-facing art, mirrored.
 */

import type { Facing } from './knight';

export type GearView = 'down' | 'up' | 'right';

export interface GearSprite {
  art: Partial<Record<GearView, { src: string; w: number; h: number }>>;
  at: Partial<Record<GearView, [number, number, number]>>;
  /** Views where the piece sits behind the hero */
  back?: GearView[];
  /** Views where the art faces the other way (e.g. the dragon turns to face the hero) */
  flip?: GearView[];
  /** Draw a mirrored copy on the other side (wings) */
  pair?: boolean;
  /** Hovers with a gentle bob */
  float?: boolean;
  glow?: string;
  /** Sits on the head / over the eyes: shifted to fit animal heads */
  head?: boolean;
  face?: boolean;
}

export const HERO_GEAR: Record<string, GearSprite> = {
  hat_crown: {
    art: { down: { src: '/gear/hat_crown_crown.png', w: 120, h: 72 }, up: { src: '/gear/hat_crown_crown.png', w: 120, h: 72 }, right: { src: '/gear/hat_crown_crown.png', w: 120, h: 72 } },
    at: { down: [122, 52, 0.8], up: [127, 50, 0.8], right: [136, 46, 0.8] }, head: true,
  },
  hat_wizard: {
    art: { down: { src: '/gear/hat_wizard_wizard.png', w: 144, h: 132 }, up: { src: '/gear/hat_wizard_wizard.png', w: 144, h: 132 }, right: { src: '/gear/hat_wizard_wizard.png', w: 144, h: 132 } },
    at: { down: [126, 66, 0.92], up: [131, 64, 0.92], right: [140, 60, 0.92] }, head: true,
  },
  egg_neon_hat: {
    art: { down: { src: '/gear/egg_neon_hat_halo.png', w: 114, h: 42 }, up: { src: '/gear/egg_neon_hat_halo.png', w: 114, h: 42 }, right: { src: '/gear/egg_neon_hat_halo.png', w: 114, h: 42 } },
    at: { down: [122, 18, 0.8], up: [127, 18, 0.8], right: [132, 14, 0.8] }, float: true, head: true, glow: '#fff3a0',
  },
  hat_pixel: {
    art: { down: { src: '/gear/hat_pixel_cap_front.png', w: 120, h: 72 }, up: { src: '/gear/hat_pixel_cap_front.png', w: 120, h: 72 }, right: { src: '/gear/hat_pixel_cap_side.png', w: 132, h: 66 } },
    at: { down: [122, 62, 0.95], up: [127, 60, 0.95], right: [146, 56, 0.95] }, head: true,
  },
  hat_jester: {
    art: { down: { src: '/gear/hat_jester_jester.png', w: 168, h: 96 }, up: { src: '/gear/hat_jester_jester.png', w: 168, h: 96 }, right: { src: '/gear/hat_jester_jester.png', w: 168, h: 96 } },
    at: { down: [122, 60, 0.82], up: [127, 58, 0.82], right: [134, 54, 0.82] }, head: true,
  },
  hat_cyber: {
    art: { down: { src: '/gear/hat_cyber_visor_front.png', w: 138, h: 42 }, right: { src: '/gear/hat_cyber_visor_side.png', w: 66, h: 42 } },
    at: { down: [122, 122, 0.85], right: [162, 112, 0.85] }, face: true, glow: '#52e0f5',
  },
  egg_ghost: {
    art: { down: { src: '/gear/egg_ghost_soul_front.png', w: 90, h: 102 }, right: { src: '/gear/egg_ghost_soul_side.png', w: 48, h: 102 } },
    at: { down: [122, 144, 0.95], right: [162, 136, 0.95] }, face: true,
  },
  acc_shades: {
    art: { down: { src: '/gear/acc_shades_shades_front.png', w: 120, h: 33 }, right: { src: '/gear/acc_shades_shades_side.png', w: 54, h: 33 } },
    at: { down: [122, 120, 0.85], right: [164, 108, 0.85] }, face: true,
  },
  acc_wings: {
    art: { down: { src: '/gear/acc_wings_wing.png', w: 90, h: 120 }, up: { src: '/gear/acc_wings_wing.png', w: 90, h: 120 }, right: { src: '/gear/acc_wings_wing.png', w: 90, h: 120 } },
    at: { down: [52, 196, 0.95], up: [52, 200, 0.95], right: [66, 196, 0.95] }, back: ['down', 'right'], pair: true,
  },
  acc_sword: {
    art: { down: { src: '/gear/acc_sword_greatsword.png', w: 156, h: 156 }, up: { src: '/gear/acc_sword_greatsword.png', w: 156, h: 156 }, right: { src: '/gear/acc_sword_greatsword.png', w: 156, h: 156 } },
    at: { down: [104, 180, 1.0], up: [118, 218, 1.0], right: [72, 178, 1.0] }, back: ['down', 'right'], flip: ['down'],
  },
  acc_wand: {
    art: { down: { src: '/gear/acc_wand_wand.png', w: 66, h: 138 }, up: { src: '/gear/acc_wand_wand.png', w: 66, h: 138 }, right: { src: '/gear/acc_wand_wand.png', w: 66, h: 138 } },
    at: { down: [216, 176, 0.9], up: [216, 176, 0.9], right: [28, 166, 0.9] }, float: true, glow: '#fff3a0',
  },
  acc_compass: {
    art: { down: { src: '/gear/acc_compass_compass.png', w: 78, h: 90 }, up: { src: '/gear/acc_compass_compass.png', w: 78, h: 90 }, right: { src: '/gear/acc_compass_compass.png', w: 78, h: 90 } },
    at: { down: [214, 168, 0.85], up: [214, 168, 0.85], right: [30, 160, 0.85] }, float: true,
  },
  egg_pixel_pet: {
    art: { down: { src: '/gear/egg_pixel_pet_dragon.png', w: 120, h: 102 }, up: { src: '/gear/egg_pixel_pet_dragon.png', w: 120, h: 102 }, right: { src: '/gear/egg_pixel_pet_dragon.png', w: 120, h: 102 } },
    at: { down: [212, 102, 0.85], up: [212, 102, 0.85], right: [34, 98, 0.85] }, flip: ['right'], float: true,
  },
};

export function gearView(facing: Facing): GearView {
  return facing === 'left' ? 'right' : facing;
}

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { HeroId } from '@/lib/maze/knight';

/**
 * Saved on this device under "orim-player".
 * v0 (before the Africa's Talking migration) also held a Solana wallet address;
 * v1 drops it and keeps every other field exactly as it was.
 */
export const PLAYER_STORE_VERSION = 1;

export function migratePlayerState(persisted: unknown, fromVersion: number): unknown {
  if (!persisted || typeof persisted !== 'object') return persisted;
  const state = { ...(persisted as Record<string, unknown>) };
  if (fromVersion < 1) {
    delete state.walletAddress;
  }
  return state;
}

export interface StageResult {
  stage: number;
  stars: number;
  time: number;
  mistakes: number;
  completedAt: number;
}

export interface PlayerState {
  username: string;
  hero: HeroId;
  totalStars: number;
  highestStage: number;
  stageResults: Record<number, StageResult>;
  infiniteHighScore: number;
  streak: number;
  lastPlayedDate: string | null;
  ownedItems: string[];
  equippedItems: {
    hat: string | null;
    shirt: string | null;
    pants: string | null;
    shoes: string | null;
    accessory: string | null;
  };
  foundEasterEggs: string[];
  coins: number;
  customMaps: any[];

  // Actions
  setHero: (hero: HeroId) => void;
  recordClear: (result: StageResult) => void;
  addItem: (itemId: string) => void;
  equipItem: (slot: keyof PlayerState['equippedItems'], itemId: string | null) => void;
  foundEgg: (eggId: string) => void;
  addCoins: (amount: number) => void;
  spendCoins: (amount: number) => boolean;
  updateStreak: () => void;
  addCustomMap: (map: any) => void;
}

export const usePlayerStore = create<PlayerState>()(
  persist(
    (set, get) => ({
      username: 'Explorer',
      hero: 'knight',
      totalStars: 0,
      highestStage: 0,
      stageResults: {},
      infiniteHighScore: 0,
      streak: 0,
      lastPlayedDate: null,
      ownedItems: [],
      equippedItems: {
        hat: null,
        shirt: null,
        pants: null,
        shoes: null,
        accessory: null,
      },
      foundEasterEggs: [],
      coins: 100, // start with some coins for demo
      customMaps: [],

      setHero: (hero) => set({ hero }),

      recordClear: (result) => {
        const { stageResults, totalStars, highestStage } = get();
        const prev = stageResults[result.stage];
        const isImprovement = !prev || result.stars > prev.stars;
        const starDelta = isImprovement
          ? result.stars - (prev?.stars ?? 0)
          : 0;

        set({
          stageResults: { ...stageResults, [result.stage]: result },
          totalStars: totalStars + starDelta,
          highestStage: Math.max(highestStage, result.stage),
          coins: get().coins + result.stars * 10,
        });
      },

      addItem: (itemId) =>
        set((s) => ({
          ownedItems: s.ownedItems.includes(itemId)
            ? s.ownedItems
            : [...s.ownedItems, itemId],
        })),

      equipItem: (slot, itemId) =>
        set((s) => ({
          equippedItems: { ...s.equippedItems, [slot]: itemId },
        })),

      foundEgg: (eggId) =>
        set((s) => ({
          foundEasterEggs: s.foundEasterEggs.includes(eggId)
            ? s.foundEasterEggs
            : [...s.foundEasterEggs, eggId],
        })),

      addCoins: (amount) => set((s) => ({ coins: s.coins + amount })),

      spendCoins: (amount) => {
        const { coins } = get();
        if (coins < amount) return false;
        set({ coins: coins - amount });
        return true;
      },

      updateStreak: () => {
        const today = new Date().toISOString().split('T')[0];
        const { lastPlayedDate, streak } = get();
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
        const newStreak =
          lastPlayedDate === yesterday ? streak + 1 :
          lastPlayedDate === today    ? streak :
          1;
        set({ streak: newStreak, lastPlayedDate: today });
      },

      addCustomMap: (map) => set((s) => ({ customMaps: [...s.customMaps, map] })),
    }),
    { name: 'orim-player', version: PLAYER_STORE_VERSION, migrate: migratePlayerState as never }
  )
);

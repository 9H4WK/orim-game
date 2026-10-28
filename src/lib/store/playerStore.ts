import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { HeroId } from '@/lib/maze/knight';

export interface StageResult {
  stage: number;
  stars: number;
  time: number;
  mistakes: number;
  completedAt: number;
}

export interface PlayerState {
  walletAddress: string | null;
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
  setWallet: (address: string | null) => void;
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
      walletAddress: null,
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

      setWallet: (address) => set({ walletAddress: address }),

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
    { name: 'orim-player' }
  )
);

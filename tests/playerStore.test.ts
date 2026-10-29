import { beforeEach, describe, expect, it, vi } from 'vitest';

/** A v0 save exactly as the Solana-era build wrote it to localStorage */
const V0_SAVE = {
  state: {
    walletAddress: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
    username: 'Explorer',
    hero: 'panda',
    totalStars: 41,
    highestStage: 17,
    stageResults: { 1: { stage: 1, stars: 3, time: 8123, mistakes: 0, completedAt: 1761000000000 } },
    infiniteHighScore: 4,
    streak: 3,
    lastPlayedDate: '2026-10-28',
    ownedItems: ['hat_crown', 'shirt_solana', 'egg_ghost'],
    equippedItems: { hat: 'hat_crown', shirt: 'shirt_solana', pants: null, shoes: null, accessory: 'egg_ghost' },
    foundEasterEggs: ['egg_ghost'],
    coins: 730,
    customMaps: [{ id: 'c_1', name: 'Dungeon #4', grid: '[]', createdAt: 1 }],
  },
  version: 0,
};

function memoryStorage(seed: Record<string, string>) {
  const data = new Map(Object.entries(seed));
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => { data.set(k, v); },
    removeItem: (k: string) => { data.delete(k); },
    data,
  };
}

beforeEach(() => { vi.resetModules(); });

describe('saved progress survives the migration', () => {
  it('keeps every achievement, item and setting and drops only the wallet', async () => {
    const storage = memoryStorage({ 'orim-player': JSON.stringify(V0_SAVE) });
    vi.stubGlobal('localStorage', storage);
    vi.stubGlobal('window', { localStorage: storage });

    const { usePlayerStore } = await import('@/lib/store/playerStore');
    await usePlayerStore.persist.rehydrate();
    const s = usePlayerStore.getState() as unknown as Record<string, unknown>;

    const { walletAddress: _dropped, ...kept } = V0_SAVE.state;
    for (const [k, v] of Object.entries(kept)) expect(s[k], k).toEqual(v);
    expect(s).not.toHaveProperty('walletAddress');

    const saved = JSON.parse(storage.data.get('orim-player')!);
    expect(saved.version).toBe(1);
    expect(saved.state.walletAddress).toBeUndefined();
    expect(saved.state.coins).toBe(730);
  });

  it('progress keeps working after the migration', async () => {
    const storage = memoryStorage({ 'orim-player': JSON.stringify(V0_SAVE) });
    vi.stubGlobal('localStorage', storage);
    vi.stubGlobal('window', { localStorage: storage });
    const { usePlayerStore } = await import('@/lib/store/playerStore');
    await usePlayerStore.persist.rehydrate();

    usePlayerStore.getState().recordClear({ stage: 18, stars: 2, time: 9000, mistakes: 1, completedAt: Date.now() });
    const s = usePlayerStore.getState();
    expect(s.highestStage).toBe(18);
    expect(s.totalStars).toBe(43);
    expect(s.coins).toBe(750);
    expect(s.stageResults[1].stars).toBe(3);
  });

  it('every item a v0 player owns still exists in the catalogue', async () => {
    const { getItemById } = await import('@/lib/shop/items');
    for (const id of V0_SAVE.state.ownedItems) expect(getItemById(id), id).toBeDefined();
  });
});

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { MazeData } from '@/lib/maze/generator';

export type GamePhase =
  | 'idle'
  | 'loading'
  | 'playing'
  | 'choosing_direction'
  | 'moving'
  | 'clear'
  | 'game_over';

export interface GameState {
  // Stage info
  currentStage: number;
  isInfiniteMode: boolean;

  // Maze
  mazeData: MazeData | null;

  // Player position
  playerX: number;
  playerY: number;
  playerDirection: 'up' | 'right' | 'down' | 'left';
  fromDirection: 'up' | 'right' | 'down' | 'left' | null;

  // Game stats
  phase: GamePhase;
  mistakes: number;
  startTime: number | null;
  elapsedTime: number;
  clearTime: number | null;
  stars: number;

  // Easter eggs found this run
  foundEasterEggs: string[];

  // Path history (for backtracking detection)
  pathHistory: { x: number; y: number }[];

  // Actions
  setStage: (stage: number, infinite?: boolean) => void;
  setMazeData: (data: MazeData) => void;
  startGame: () => void;
  movePlayer: (x: number, y: number, dir: 'up' | 'right' | 'down' | 'left') => void;
  chooseDirection: (dir: 'up' | 'right' | 'down' | 'left') => void;
  setPhase: (phase: GamePhase) => void;
  recordMistake: () => void;
  updateTimer: () => void;
  clearStage: () => void;
  findEasterEgg: (id: string) => void;
  resetGame: () => void;
}

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      currentStage: 1,
      isInfiniteMode: false,
      mazeData: null,
      playerX: 0,
      playerY: 0,
      playerDirection: 'right',
      fromDirection: null,
      phase: 'idle',
      mistakes: 0,
      startTime: null,
      elapsedTime: 0,
      clearTime: null,
      stars: 0,
      foundEasterEggs: [],
      pathHistory: [],

      setStage: (stage, infinite = false) =>
        set({ currentStage: stage, isInfiniteMode: infinite, phase: 'loading' }),

      setMazeData: (data) =>
        set({
          mazeData: data,
          playerX: 0,
          playerY: 0,
          playerDirection: 'right',
          fromDirection: null,
          pathHistory: [{ x: 0, y: 0 }],
        }),

      startGame: () =>
        set({
          phase: 'playing',
          mistakes: 0,
          startTime: Date.now(),
          elapsedTime: 0,
          clearTime: null,
          stars: 0,
          foundEasterEggs: [],
        }),

      movePlayer: (x, y, dir) => {
        const state = get();
        const { mazeData, startTime } = state;
        const newHistory = [...state.pathHistory, { x, y }];

        // Check if player reached the exit cell
        if (
          mazeData &&
          x === mazeData.width - 1 &&
          y === mazeData.height - 1
        ) {
          const now     = Date.now();
          const elapsed = startTime ? now - startTime : 0;
          const mistakeCount = state.mistakes;
          const awardStars   = mistakeCount === 0 ? 3 : mistakeCount <= 2 ? 2 : 1;

          set({
            playerX:       x,
            playerY:       y,
            playerDirection: dir,
            fromDirection:   dir,
            pathHistory:   newHistory,
            phase:         'clear',
            clearTime:     elapsed,
            stars:         awardStars,
          });
          return;   // ← IMPORTANT: return before setting normal move state
        }

        set({
          playerX:         x,
          playerY:         y,
          playerDirection: dir,
          fromDirection:   dir,
          pathHistory:     newHistory,
        });
      },

      chooseDirection: (dir) => set({ phase: 'moving', playerDirection: dir }),

      setPhase: (phase) => set({ phase }),

      recordMistake: () =>
        set((s) => ({ mistakes: s.mistakes + 1 })),

      updateTimer: () => {
        const { startTime, phase } = get();
        if (phase === 'playing' || phase === 'choosing_direction' || phase === 'moving') {
          if (startTime) {
            set({ elapsedTime: Date.now() - startTime });
          }
        }
      },

      clearStage: () => {
        const { mistakes } = get();
        const stars = mistakes === 0 ? 3 : mistakes <= 2 ? 2 : 1;
        set({ phase: 'clear', stars });
      },

      findEasterEgg: (id) =>
        set((s) => ({
          foundEasterEggs: s.foundEasterEggs.includes(id)
            ? s.foundEasterEggs
            : [...s.foundEasterEggs, id],
        })),

      resetGame: () =>
        set({
          mazeData: null,
          playerX: 0,
          playerY: 0,
          fromDirection: null,
          phase: 'idle',
          mistakes: 0,
          startTime: null,
          elapsedTime: 0,
          clearTime: null,
          stars: 0,
          foundEasterEggs: [],
          pathHistory: [],
        }),
    }),
    {
      name: 'orim-game',
      partialize: (s) => ({
        currentStage: s.currentStage,
        isInfiniteMode: s.isInfiniteMode,
      }),
    }
  )
);

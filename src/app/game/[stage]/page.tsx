'use client';

import { useEffect, useState, useCallback, useRef, Suspense, useMemo } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';

import {
  generateMaze,
  generateSovereignMaze,
  getAvailableDirections,
  MazeData,
} from '@/lib/maze/generator';
import { MazeAgentService } from '@/lib/blockchain/maze-agent-service';
import { useGameStore } from '@/lib/store/gameStore';
import { usePlayerStore } from '@/lib/store/playerStore';
import { EASTER_EGG_ITEM_IDS, getItemById } from '@/lib/shop/items';

import DirectionPicker from '@/components/maze/DirectionPicker';
import styles from './game.module.css';

const MazeCanvas  = dynamic(() => import('@/components/maze/MazeCanvas'),  { ssr: false });
const ClearScreen = dynamic(() => import('@/components/ui/ClearScreen'),   { ssr: false });

type Dir = 'up' | 'right' | 'down' | 'left';

function formatTime(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const min    = Math.floor(totalSec / 60).toString().padStart(2, '0');
  const sec    = (totalSec % 60).toString().padStart(2, '0');
  const msStr  = Math.floor((ms % 1000) / 10).toString().padStart(2, '0');
  return `${min}:${sec}.${msStr}`;
}

const DIR_DELTA: Record<Dir, { dx: number; dy: number }> = {
  up:    { dx: 0,  dy: -1 },
  right: { dx: 1,  dy: 0  },
  down:  { dx: 0,  dy: 1  },
  left:  { dx: -1, dy: 0  },
};
const OPPOSITE: Record<Dir, Dir> = {
  up: 'down', down: 'up', left: 'right', right: 'left',
};

function GameContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const stageParam   = params?.stage as string;
  const isInfinite   = stageParam === 'infinite';
  const isSovereign  = stageParam === 'sovereign';
  const stageNum     = isInfinite ? 100 : (isSovereign ? 0 : parseInt(stageParam || '1', 10));
  const sovereignId  = searchParams.get('id');
  const sovereignMood = searchParams.get('mood') || 'Neutral';

  const agentService = useMemo(() => {
    if (!mounted) return null;
    return new MazeAgentService(connection.rpcEndpoint, { publicKey }, "sk-placeholder");
  }, [connection.rpcEndpoint, publicKey, mounted]);

  // ── Zustand store ────────────────────────────────────────────
  const {
    phase, playerX, playerY, playerDirection, fromDirection,
    mistakes, startTime, clearTime, stars, foundEasterEggs,
    setMazeData, startGame, movePlayer, setPhase, recordMistake,
    findEasterEgg, resetGame
  } = useGameStore();

  const { recordClear, addItem, foundEgg } = usePlayerStore();

  // ── Local state ──────────────────────────────────────────────
  const [maze, setMaze]               = useState<MazeData | null>(null);
  const [loading, setLoading]         = useState(true);
  const [displayTime, setDisplayTime] = useState(0);
  const [showEgg, setShowEgg]         = useState<string | null>(null);
  const [infiniteCount, setInfiniteCount] = useState(0);
  const [availableDirs, setAvailableDirs] = useState<Dir[]>([]);

  // Refs to avoid stale closures
  const timerRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const moveRef     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMovingRef = useRef(false);
  const mazeRef     = useRef<MazeData | null>(null);

  // ── Timer ────────────────────────────────────────────────────
  useEffect(() => {
    const active =
      phase === 'playing' ||
      phase === 'choosing_direction' ||
      phase === 'moving';

    if (active) {
      if (!timerRef.current && startTime) {
        timerRef.current = setInterval(() => {
          const t = useGameStore.getState().startTime;
          if (t) setDisplayTime(Date.now() - t);
        }, 50);
      }
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [phase, startTime]);

  // ── Initialize maze ──────────────────────────────────────────
  const initMaze = useCallback((stg: number) => {
    setLoading(true);
    isMovingRef.current = false;

    if (moveRef.current) { clearTimeout(moveRef.current); moveRef.current = null; }
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }

    resetGame();

    let generated: MazeData;
    if (isSovereign && sovereignId) {
      generated = generateSovereignMaze(sovereignId, sovereignMood);
    } else {
      generated = generateMaze(stg, undefined, EASTER_EGG_ITEM_IDS);
    }
    
    setMaze(generated);
    mazeRef.current = generated;
    setMazeData(generated);
    setLoading(false);

    setTimeout(() => {
      startGame();
    }, 120);
  }, [resetGame, setMazeData, startGame, isSovereign, sovereignId, sovereignMood, isInfinite]);

  useEffect(() => {
    initMaze(stageNum);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stageNum, isSovereign, sovereignId]);

  // ── Auto-move ENGINE ─────────────────────────────────────────
  const doAutoMove = useCallback((
    cx: number,
    cy: number,
    lastDir: Dir | null,
    currentMaze: MazeData,
  ) => {
    const cell = currentMaze.grid[cy]?.[cx];
    if (!cell) return;

    const available = getAvailableDirections(cell);
    const fromOpp   = lastDir ? OPPOSITE[lastDir] : null;
    const forward   = fromOpp ? available.filter(d => d !== fromOpp) : available;

    const isAutoplay = typeof window !== 'undefined' && window.location.href.includes('autoplay');
    
    if (forward.length === 0) {
      recordMistake();
      if (fromOpp && available.includes(fromOpp)) {
        const { dx, dy } = DIR_DELTA[fromOpp];
        const nx = cx + dx, ny = cy + dy;
        moveRef.current = setTimeout(() => {
          if (useGameStore.getState().phase === 'clear') return;
          movePlayer(nx, ny, fromOpp!);
          isMovingRef.current = false;
          if (useGameStore.getState().phase !== 'clear') {
            setPhase('playing');
            doAutoMove(nx, ny, fromOpp!, currentMaze);
          }
        }, isAutoplay ? 16 : 300);
      }
      return;
    }

    if (forward.length === 1 || (isAutoplay && forward.length > 0)) {
      const dir = forward.length === 1 ? forward[0] : forward[Math.floor(Math.random() * forward.length)];
      const { dx, dy } = DIR_DELTA[dir];
      const nx = cx + dx, ny = cy + dy;

      moveRef.current = setTimeout(() => {
        if (useGameStore.getState().phase === 'clear') return;
        movePlayer(nx, ny, dir);
        const newPhase = useGameStore.getState().phase;
        if (newPhase === 'clear') {
          isMovingRef.current = false;
          return;
        }
        isMovingRef.current = false;
        setPhase('playing');
        doAutoMove(nx, ny, dir, currentMaze);
      }, isAutoplay ? 16 : 220);
    } else {
      setAvailableDirs(available);
      setPhase('choosing_direction');
      isMovingRef.current = false;
    }
  }, [movePlayer, recordMistake, setPhase]);

  useEffect(() => {
    if (phase === 'playing' && mazeRef.current && !isMovingRef.current) {
      isMovingRef.current = true;
      doAutoMove(playerX, playerY, fromDirection as Dir | null, mazeRef.current);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // ── Handle user direction choice ─────────────────────────────
  const handleChoose = useCallback((dir: Dir) => {
    const currentMaze = mazeRef.current;
    if (!currentMaze) return;

    const { dx, dy } = DIR_DELTA[dir];
    const px = useGameStore.getState().playerX;
    const py = useGameStore.getState().playerY;
    const nx = px + dx, ny = py + dy;

    if (nx < 0 || ny < 0 || nx >= currentMaze.width || ny >= currentMaze.height) return;

    setPhase('moving');
    isMovingRef.current = true;

    moveRef.current = setTimeout(() => {
      movePlayer(nx, ny, dir);
      const newPhase = useGameStore.getState().phase;
      if (newPhase === 'clear') {
        isMovingRef.current = false;
        return;
      }
      isMovingRef.current = false;
      setPhase('playing');
    }, 200);
  }, [movePlayer, setPhase]);

  // ── Easter egg ───────────────────────────────────────────────
  const handleEggFound = useCallback((id: string) => {
    if (foundEasterEggs.includes(id)) return;
    findEasterEgg(id);
    foundEgg(id);
    addItem(id);
    const item = getItemById(id);
    setShowEgg(item?.name || id);
    setTimeout(() => setShowEgg(null), 3500);
  }, [foundEasterEggs, findEasterEgg, foundEgg, addItem]);

  // ── Navigation after clear ───────────────────────────────────
  const handleNext = useCallback(() => {
    if (isInfinite) {
      const next = infiniteCount + 1;
      setInfiniteCount(next);
      initMaze(100 + next);
    } else if (stageNum >= 100) {
      router.push('/game/infinite');
    } else {
      router.push(`/game/${stageNum + 1}`);
    }
  }, [isInfinite, stageNum, infiniteCount, initMaze, router]);

  const handleRetry = useCallback(() => initMaze(stageNum), [initMaze, stageNum]);
  const handleMenu  = useCallback(() => router.push('/stages'), [router]);

  // ── Record clear ─────────────────────────────────────────────
  useEffect(() => {
    if (phase === 'clear' && clearTime != null) {
      recordClear({
        stage: stageNum,
        stars,
        time: clearTime,
        mistakes,
        completedAt: Date.now(),
      });

      // Record Sovereign Labyrinth Clear (On-chain/Global Stats)
      if (isSovereign && sovereignId && agentService) {
        agentService.recordLabyrinthClear(sovereignId);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, isSovereign, sovereignId, agentService]);

  // ── Render: loading ──────────────────────────────────────────
  if (!mounted || loading || !maze) {
    return (
      <div className={styles.loading}>
        <div className={styles.loadingBox}>
          <p className={styles.loadingTitle}>ORIM</p>
          <p className={styles.loadingText}>GENERATING MAZE...</p>
          <div className={styles.loadingDots}>
            <span className="px-loading">●</span>
            <span className="px-loading" style={{ animationDelay: '0.2s' }}>●</span>
            <span className="px-loading" style={{ animationDelay: '0.4s' }}>●</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.page} scanlines`}>
      {/* ── Header ── */}
      <header className={styles.header}>
        <button id="back-btn" className="btn btn-secondary btn-sm" onClick={handleMenu}>
          ◀ MENU
        </button>

        <div className={styles.headerCenter}>
          <span className={styles.stageName}>
            {isSovereign 
              ? 'SOVEREIGN LABYRINTH' 
              : isInfinite 
                ? `∞ INFINITE #${infiniteCount + 1}` 
                : `STAGE ${stageNum}`}
          </span>
        </div>

        <div className={styles.headerRight}>
          <div className={styles.timerBox}>
            <span className={styles.timerIcon}>⏱</span>
            <span className={styles.timerValue}>{formatTime(displayTime)}</span>
          </div>
          <div className={styles.mistakeBox}>
            <span>💢</span>
            <span className={styles.mistakeCount}>{mistakes}</span>
          </div>
        </div>
      </header>

      {/* ── Maze canvas ── */}
      <main className={styles.main}>
        <div className={styles.mazeWrap}>
          <MazeCanvas
            maze={maze}
            playerX={playerX}
            playerY={playerY}
            playerDirection={playerDirection}
            onEasterEggFound={handleEggFound}
          />
        </div>
      </main>

      {/* ── Direction picker (bottom bar, no overlay) ── */}
      {phase === 'choosing_direction' && (
        <DirectionPicker
          availableDirections={availableDirs}
          onChoose={handleChoose}
        />
      )}

      {/* ── Clear screen ── */}
      {phase === 'clear' && (
        <ClearScreen
          stage={stageNum}
          stars={stars}
          clearTime={clearTime ?? 0}
          mistakes={mistakes}
          onNext={handleNext}
          onRetry={handleRetry}
          onMenu={handleMenu}
          isInfiniteMode={isInfinite}
          infiniteStageCount={infiniteCount}
          foundEasterEggs={foundEasterEggs}
        />
      )}

      {/* ── Easter egg popup ── */}
      {showEgg && (
        <div className={styles.eggPopup}>
          <span className={styles.eggEmoji}>🎁</span>
          <div>
            <p className={styles.eggTitle}>LEGENDARY ITEM FOUND!</p>
            <p className={styles.eggName}>{showEgg}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function GamePage() {
  return (
    <Suspense fallback={null}>
      <GameContent />
    </Suspense>
  );
}

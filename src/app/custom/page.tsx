'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { 
  PublicKey, 
  SystemProgram, 
  Transaction, 
  LAMPORTS_PER_SOL 
} from '@solana/web3.js';

import styles from './custom.module.css';
import { usePlayerStore } from '@/lib/store/playerStore';
import { MazeData, Cell } from '@/lib/maze/generator';

const MazeCanvas = dynamic(() => import('@/components/maze/MazeCanvas'), { ssr: false });
const DirectionPicker = dynamic(() => import('@/components/maze/DirectionPicker'), { ssr: false });

// Tool Types
type Tool = 'wall' | 'floor' | 'start' | 'end' | 'chest';
type Dir = 'up' | 'down' | 'left' | 'right';

const GRID_SIZE = 15;
const CELL_SIZE = 36;

const DIR_DELTA: Record<Dir, { dx: number; dy: number }> = {
  up:    { dx: 0,  dy: -1 },
  right: { dx: 1,  dy: 0  },
  down:  { dx: 0,  dy: 1  },
  left:  { dx: -1, dy: 0  },
};
const OPPOSITE: Record<Dir, Dir> = {
  up: 'down', down: 'up', left: 'right', right: 'left',
};

export default function CustomMazeEditor() {
  const router = useRouter();
  const { publicKey, sendTransaction, connected } = useWallet();
  const { connection } = useConnection();
  const { addCustomMap } = usePlayerStore();

  const [mounted, setMounted] = useState(false);
  const [activeTool, setActiveTool] = useState<Tool>('floor');
  const [grid, setGrid] = useState<string[][]>(() => 
    Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill('wall'))
  );
  
  // Simulation State
  const [isSimulating, setIsSimulating] = useState(false);
  const [simPhase, setSimPhase] = useState<'idle' | 'playing' | 'choosing' | 'moving'>('idle');
  const [simMaze, setSimMaze] = useState<MazeData | null>(null);
  const [simPlayer, setSimPlayer] = useState({ x: 0, y: 0 });
  const [simDir, setSimDir] = useState<Dir>('down');
  const [simLastDir, setSimLastDir] = useState<Dir | null>(null);
  const [availableSimDirs, setAvailableSimDirs] = useState<Dir[]>([]);
  const [simSuccess, setSimSuccess] = useState(false);

  const [isMinting, setIsMinting] = useState(false);
  const [mintStatus, setMintStatus] = useState<'idle' | 'paying' | 'minting' | 'success'>('idle');
  const [error, setError] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const simMoveRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setMounted(true); }, []);

  // ── Auto-move Simulation Engine ───────────────────────────
  const getSimAvailableDirs = (cell: Cell): Dir[] => {
    const dirs: Dir[] = [];
    if (!cell.walls.top)    dirs.push('up');
    if (!cell.walls.right)  dirs.push('right');
    if (!cell.walls.bottom) dirs.push('down');
    if (!cell.walls.left)   dirs.push('left');
    return dirs;
  };

  const doSimAutoMove = useCallback((cx: number, cy: number, lastDir: Dir | null, currentMaze: MazeData) => {
    const cell = currentMaze.grid[cy]?.[cx];
    if (!cell) return;

    if (cell.isEnd) {
      setSimSuccess(true);
      return;
    }

    const available = getSimAvailableDirs(cell);
    const fromOpp   = lastDir ? OPPOSITE[lastDir] : null;
    const forward   = fromOpp ? available.filter(d => d !== fromOpp) : available;

    if (forward.length === 0) {
      if (fromOpp && available.includes(fromOpp)) {
        const { dx, dy } = DIR_DELTA[fromOpp];
        simMoveRef.current = setTimeout(() => {
          setSimPlayer({ x: cx + dx, y: cy + dy });
          setSimDir(fromOpp);
          setSimLastDir(fromOpp);
          setSimPhase('playing');
        }, 300);
      }
      return;
    }

    if (forward.length === 1) {
      const dir = forward[0];
      const { dx, dy } = DIR_DELTA[dir];
      simMoveRef.current = setTimeout(() => {
        setSimPlayer({ x: cx + dx, y: cy + dy });
        setSimDir(dir);
        setSimLastDir(dir);
        setSimPhase('playing');
      }, 220);
    } else {
      setAvailableSimDirs(forward);
      setSimPhase('choosing');
    }
  }, []);

  useEffect(() => {
    if (isSimulating && simPhase === 'playing' && simMaze && !simSuccess) {
      doSimAutoMove(simPlayer.x, simPlayer.y, simLastDir, simMaze);
    }
  }, [simPhase, isSimulating, simMaze, simPlayer, simLastDir, doSimAutoMove, simSuccess]);

  const handleSimChoice = (dir: Dir) => {
    const { dx, dy } = DIR_DELTA[dir];
    setSimPhase('moving');
    simMoveRef.current = setTimeout(() => {
      setSimPlayer({ x: simPlayer.x + dx, y: simPlayer.y + dy });
      setSimDir(dir);
      setSimLastDir(dir);
      setSimPhase('playing');
    }, 200);
  };

  // ── Convert Editor Grid to Maze Engine Data ─────────────────
  const startSimulation = () => {
    if (simMoveRef.current) clearTimeout(simMoveRef.current);
    
    const startY = grid.findIndex(r => r.includes('start'));
    const startX = startY >= 0 ? grid[startY].indexOf('start') : 0;
    
    const mazeGrid: Cell[][] = grid.map((row, y) => 
      row.map((type, x) => ({
        x, y,
        walls: {
          top:    type === 'wall' || (y > 0 && grid[y-1][x] === 'wall'),
          right:  type === 'wall' || (x < GRID_SIZE-1 && grid[y][x+1] === 'wall'),
          bottom: type === 'wall' || (y < GRID_SIZE-1 && grid[y+1][x] === 'wall'),
          left:   type === 'wall' || (x > 0 && grid[y][x-1] === 'wall'),
        },
        isStart: type === 'start',
        isEnd: type === 'end',
        hasEasterEgg: type === 'chest',
        visited: false
      }))
    );

    setSimMaze({ 
      width: GRID_SIZE, 
      height: GRID_SIZE, 
      grid: mazeGrid,
      junctions: [], // Not strictly needed for custom simulation
      solution: []  // Not strictly needed for custom simulation
    });
    setSimPlayer({ x: startX, y: startY >= 0 ? startY : 0 });
    setSimLastDir(null);
    setSimDir('down');
    setSimPhase('playing');
    setSimSuccess(false);
    setIsSimulating(true);
  };

  // ── Render Editor ───────────────────────────────────────────
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || isSimulating) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    grid.forEach((row, y) => {
      row.forEach((type, x) => {
        const px = x * CELL_SIZE; const py = y * CELL_SIZE;
        
        // Base canvas color
        ctx.fillStyle = '#05040a'; 
        ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE);

        if (type === 'floor') {
          // Path - Paved look
          ctx.fillStyle = '#1e1548'; // Brighter than background
          ctx.fillRect(px + 1, py + 1, CELL_SIZE - 2, CELL_SIZE - 2);
          
          // Pattern
          ctx.fillStyle = 'rgba(167,139,250,0.1)';
          ctx.fillRect(px + 4, py + 4, 2, 2);
          ctx.fillRect(px + CELL_SIZE - 6, py + CELL_SIZE - 6, 2, 2);
        } else if (type === 'wall') {
          // Solid Wall
          ctx.fillStyle = '#3b1f6e'; 
          ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE);
          
          // Bevel / 3D look
          ctx.strokeStyle = '#5b21b6'; 
          ctx.strokeRect(px + 1, py + 1, CELL_SIZE - 2, CELL_SIZE - 2);
          
          ctx.fillStyle = 'rgba(255,255,255,0.03)';
          ctx.fillRect(px + 2, py + 2, CELL_SIZE - 4, 4);
        } else if (type === 'start') {
          // Drawing start over potential wall
          ctx.fillStyle = '#1e1548'; ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE);
          ctx.font = '24px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText('🏃', px+CELL_SIZE/2, py+CELL_SIZE/2);
        } else if (type === 'end') {
          ctx.fillStyle = '#1e1548'; ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE);
          ctx.font = '24px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText('🌀', px+CELL_SIZE/2, py+CELL_SIZE/2);
        } else if (type === 'chest') {
          ctx.fillStyle = '#1e1548'; ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE);
          ctx.font = '24px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText('🎁', px+CELL_SIZE/2, py+CELL_SIZE/2);
        }
        
        ctx.strokeStyle = 'rgba(124,58,237,0.1)'; 
        ctx.strokeRect(px, py, CELL_SIZE, CELL_SIZE);
      });
    });
  }, [grid, isSimulating]);

  useEffect(() => { render(); }, [render]);

  const handleInteraction = (e: any) => {
    if (isSimulating) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const cx = e.clientX || e.touches?.[0].clientX;
    const cy = e.clientY || e.touches?.[0].clientY;
    const x = Math.floor((cx - rect.left) / CELL_SIZE);
    const y = Math.floor((cy - rect.top) / CELL_SIZE);

    if (x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE) {
      const newGrid = [...grid];
      if (['start', 'end'].includes(activeTool)) {
        for(let r=0; r<GRID_SIZE; r++) { for(let c=0; c<GRID_SIZE; c++) {
          if (newGrid[r][c] === activeTool) newGrid[r][c] = 'floor';
        }}
      }
      newGrid[y][x] = activeTool;
      setGrid(newGrid);
    }
  };

  const handleMint = async () => {
    if (!connected || !publicKey) { setError("Connect your wallet first!"); return; }
    const hasStart = grid.some(row => row.includes('start'));
    const hasEnd = grid.some(row => row.includes('end'));
    if (!hasStart || !hasEnd) { setError("Maze needs a Start (🏃) and a Portal (🌀)!"); return; }

    setError(null); setIsMinting(true); setMintStatus('paying');
    try {
      const treasury = new PublicKey("Gv9vVvA9p5x6K9vVvA9p5x6K9vVvA9p5x6K9vVvA9p5");
      const tx = new Transaction().add(SystemProgram.transfer({
        fromPubkey: publicKey, toPubkey: treasury, lamports: 0.1 * LAMPORTS_PER_SOL,
      }));
      await sendTransaction(tx, connection);
      setMintStatus('minting');
      await new Promise(r => setTimeout(r, 2000));
      addCustomMap({ id: `c_${Date.now()}`, name: `Dungeon #${Math.floor(Math.random()*1000)}`, creator: publicKey.toBase58(), grid: JSON.stringify(grid), createdAt: Date.now() });
      setMintStatus('success');
      setTimeout(() => router.push('/stages'), 3000);
    } catch (err: any) { setError(err.message || "Transaction failed"); setIsMinting(false); }
  };

  if (!mounted) return null;

  return (
    <div className={`${styles.page} scanlines`}>
      <header className={styles.header}>
        <button className="btn btn-secondary btn-sm" onClick={() => router.push('/')}>🏰 HOME</button>
        <h1 className={styles.title}>ORIM ARCHITECT</h1>
        <WalletMultiButton />
      </header>

      <main className={styles.main}>
        <section className={styles.toolbar}>
          <p className={styles.toolTitle}>BUILDING TOOLS</p>
          <div className={styles.toolGrid}>
            {(['floor', 'start', 'end', 'chest'] as Tool[]).map(t => (
              <button key={t} className={`${styles.toolBtn} ${activeTool === t ? styles.toolActive : ''}`} onClick={() => setActiveTool(t)}>
                <span className={styles.toolIcon}>{t === 'floor' ? '🧹' : t === 'start' ? '🏃' : t === 'end' ? '🌀' : '🎁'}</span>
                {t === 'floor' ? 'PATH' : t.toUpperCase()}
              </button>
            ))}
          </div>
          
          <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button className="btn btn-primary btn-sm" onClick={startSimulation} disabled={isSimulating}>
              🎮 TEST RUN
            </button>
            <button className="btn btn-secondary btn-xs" onClick={() => setGrid(Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill('wall')))}>
              🗑️ CLEAR ALL
            </button>
          </div>
        </section>

        <section className={styles.canvasWrap}>
          {isSimulating && simMaze ? (
            <div className={styles.simContainer}>
              <button className={`${styles.toolBtn} ${styles.stopBtn} ${styles.topStopBtn}`} onClick={() => setIsSimulating(false)}>
                🛑 STOP TEST
              </button>
              
              <div className={styles.simMazeWrap}>
                <MazeCanvas maze={simMaze} playerX={simPlayer.x} playerY={simPlayer.y} playerDirection={simDir} />
              </div>

              {simPhase === 'choosing' && (
                <div className={styles.simPickerWrap}>
                  <DirectionPicker availableDirections={availableSimDirs} onChoose={handleSimChoice} />
                </div>
              )}
              
              {simPhase !== 'choosing' && (
                <p className={styles.hint}>Characters move automatically. Choose paths at junctions!</p>
              )}
            </div>
          ) : (
            <>
              <canvas ref={canvasRef} width={GRID_SIZE * CELL_SIZE} height={GRID_SIZE * CELL_SIZE} className={styles.editorCanvas}
                onContextMenu={(e) => e.preventDefault()}
                onMouseDown={(e) => { 
                  isDrawing.current = true; 
                  if (e.button === 2) { // Right click -> Restore Wall
                    const rect = canvasRef.current!.getBoundingClientRect();
                    const x = Math.floor((e.clientX - rect.left) / CELL_SIZE);
                    const y = Math.floor((e.clientY - rect.top) / CELL_SIZE);
                    if (x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE) {
                      const newGrid = [...grid];
                      newGrid[y][x] = 'wall';
                      setGrid(newGrid);
                    }
                  } else {
                    handleInteraction(e); 
                  }
                }}
                onMouseMove={(e) => { 
                  if(isDrawing.current) {
                    if (e.buttons === 2) { // Right click drag -> Restore Walls
                      const rect = canvasRef.current!.getBoundingClientRect();
                      const x = Math.floor((e.clientX - rect.left) / CELL_SIZE);
                      const y = Math.floor((e.clientY - rect.top) / CELL_SIZE);
                      if (x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE) {
                        const newGrid = [...grid];
                        newGrid[y][x] = 'wall';
                        setGrid(newGrid);
                      }
                    } else {
                      handleInteraction(e);
                    }
                  }
                }}
                onMouseUp={() => { isDrawing.current = false; }}
                onMouseLeave={() => { isDrawing.current = false; }}
              />
              <p className={styles.hint}>Left-click to Carve Path. Right-click to Restore Wall.</p>
            </>
          )}

          {/* ── Architect's Handbook ── */}
          <div className={styles.guide}>
            <p className={styles.toolTitle}>ARCHITECT&apos;S HANDBOOK</p>
            <div className={styles.guideGrid}>
              <div className={styles.guideStep}>
                <span className={styles.stepNum}>1</span>
                <div>
                  <p className={styles.stepLabel}>🧹 CARVE PATHS</p>
                  <p className={styles.stepDesc}>Left-click to drill through the solid rock.</p>
                </div>
              </div>
              <div className={styles.guideStep}>
                <span className={styles.stepNum}>2</span>
                <div>
                  <p className={styles.stepLabel}>🧱 FIX MISTAKES</p>
                  <p className={styles.stepDesc}>Use Right-click to restore walls instantly.</p>
                </div>
              </div>
              <div className={styles.guideStep}>
                <span className={styles.stepNum}>3</span>
                <div>
                  <p className={styles.stepLabel}>🏃 HERO ENTRY</p>
                  <p className={styles.stepDesc}>Place the Runner at the starting line.</p>
                </div>
              </div>
              <div className={styles.guideStep}>
                <span className={styles.stepNum}>4</span>
                <div>
                  <p className={styles.stepLabel}>🌀 PORTAL EXIT</p>
                  <p className={styles.stepDesc}>Every dungeon needs a Waypoint to victory.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <aside className={styles.sidebar}>
          <div className={styles.infoBox}>
            <h3 className={styles.infoTitle}>MINT DUNGEON NFT</h3>
            <p className={styles.infoText}>Record your creation on-chain. Players pay <strong>0.1 SOL</strong> to explore your level!</p>
            <div className={styles.priceTag}><span className={styles.toolTitle}>MINT FEE</span><span className={styles.price}>0.1 SOL</span></div>
            {error && <p style={{ color: '#ef4444', fontSize: '9px', marginTop: '10px' }}>⚠️ {error}</p>}
            <button className="btn btn-gold btn-lg btn-block" style={{ marginTop: '20px' }} onClick={handleMint} disabled={isMinting || isSimulating}>
              {isMinting ? 'PROCESSING...' : '💎 CREATE NFT MAP'}
            </button>
          </div>
        </aside>
      </main>

      {/* ── Simulation Success Modal ── */}
      {simSuccess && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.successIcon}>🏆</div>
            <h2 className={styles.modalTitle}>DUNGEON VERIFIED!</h2>
            <p className={styles.modalDesc}>
              Congratulations! Your maze is traversable and ready for the world. 
              Mint it now to share it with players across the Solana network!
            </p>
            <div className={styles.modalButtons}>
              <button className="btn btn-secondary btn-sm" onClick={() => { setSimSuccess(false); setIsSimulating(false); }}>
                🛠️ EDIT MORE
              </button>
              <button className="btn btn-gold btn-sm" onClick={() => { setSimSuccess(false); setIsSimulating(false); handleMint(); }}>
                💎 MINT NFT
              </button>
            </div>
          </div>
        </div>
      )}

      {isMinting && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.loadingCircle} />
            <h2 className={styles.modalTitle}>{mintStatus === 'paying' ? 'CONFIRMING PAYMENT...' : mintStatus === 'minting' ? 'MINTING NFT...' : 'DUNGEON READY!'}</h2>
            <p className={styles.modalDesc}>{mintStatus === 'paying' ? 'Verify in wallet.' : mintStatus === 'minting' ? 'Saving structure...' : 'Redirecting...'}</p>
          </div>
        </div>
      )}
    </div>
  );
}

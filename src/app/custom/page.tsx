'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import WorldShell from '@/components/ui/WorldShell';

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

  const [saved, setSaved] = useState(false);
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

    const mark = (draw: (cx: number, cy: number) => void, px: number, py: number) => {
      ctx.fillStyle = '#231a40'; ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE);
      draw(px + CELL_SIZE / 2, py + CELL_SIZE / 2);
    };

    grid.forEach((row, y) => {
      row.forEach((type, x) => {
        const px = x * CELL_SIZE; const py = y * CELL_SIZE;

        // Base canvas color
        ctx.fillStyle = '#110b22';
        ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE);

        if (type === 'floor') {
          // Open path: dusk checker
          ctx.fillStyle = (x + y) % 2 === 0 ? '#1c1434' : '#231a40';
          ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE);
        } else if (type === 'wall') {
          // Cream stone block with a plum base, like the in-game walls
          ctx.fillStyle = '#3b2868';
          ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE);
          ctx.fillStyle = '#f6eedb';
          ctx.fillRect(px + 1, py + 1, CELL_SIZE - 2, CELL_SIZE - 8);
          ctx.fillStyle = '#c4b691';
          ctx.fillRect(px + 1, py + CELL_SIZE - 9, CELL_SIZE - 2, 3);
        } else if (type === 'start') {
          mark((cx, cy) => {
            ctx.strokeStyle = '#f6eedb'; ctx.lineWidth = 3;
            ctx.strokeRect(cx - 9, cy - 9, 18, 18);
            ctx.fillStyle = '#f6eedb'; ctx.fillRect(cx - 3, cy - 3, 6, 6);
          }, px, py);
        } else if (type === 'end') {
          mark((cx, cy) => {
            ctx.fillStyle = 'rgba(212,255,58,0.25)'; ctx.fillRect(px + 2, py + 2, CELL_SIZE - 4, CELL_SIZE - 4);
            ctx.strokeStyle = '#d4ff3a'; ctx.lineWidth = 3;
            ctx.strokeRect(cx - 10, cy - 10, 20, 20);
            ctx.fillStyle = '#d4ff3a'; ctx.fillRect(cx - 4, cy - 4, 8, 8);
          }, px, py);
        } else if (type === 'chest') {
          mark((cx, cy) => {
            ctx.save(); ctx.translate(cx, cy); ctx.rotate(Math.PI / 4);
            ctx.fillStyle = '#d4ff3a'; ctx.fillRect(-7, -7, 14, 14);
            ctx.restore();
          }, px, py);
        }

        ctx.strokeStyle = 'rgba(246,238,219,0.06)';
        ctx.strokeRect(px, py, CELL_SIZE, CELL_SIZE);
      });
    });
  }, [grid, isSimulating]);

  useEffect(() => { if (mounted) render(); }, [render, mounted]);

  /** Paint one cell under a pointer; the canvas may be drawn smaller than its pixel size on phones */
  const paintAt = (clientX: number, clientY: number, tool: Tool) => {
    if (isSimulating) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scale = canvas.width / rect.width;
    const x = Math.floor(((clientX - rect.left) * scale) / CELL_SIZE);
    const y = Math.floor(((clientY - rect.top) * scale) / CELL_SIZE);
    if (x < 0 || x >= GRID_SIZE || y < 0 || y >= GRID_SIZE) return;
    setGrid(prev => {
      if (prev[y][x] === tool) return prev;
      const next = prev.map(row => [...row]);
      if (tool === 'start' || tool === 'end') {
        for (let r = 0; r < GRID_SIZE; r++) for (let c = 0; c < GRID_SIZE; c++) if (next[r][c] === tool) next[r][c] = 'floor';
      }
      next[y][x] = tool;
      return next;
    });
  };


  /** Keeps the drawing on this device, alongside the rest of the player's progress */
  const handleSave = () => {
    const hasStart = grid.some(row => row.includes('start'));
    const hasEnd = grid.some(row => row.includes('end'));
    if (!hasStart || !hasEnd) { setError("Your maze needs a start and an exit."); return; }
    setError(null);
    addCustomMap({ id: `c_${Date.now()}`, name: `Dungeon #${Math.floor(Math.random()*1000)}`, grid: JSON.stringify(grid), createdAt: Date.now() });
    setSaved(true);
  };

  if (!mounted) return null;

  return (
    <WorldShell active="create">
    <div className={styles.page}>
      <header className={styles.header}>
        <span className={styles.headTag}>▶ Create · draw by hand</span>
        <h1 className={styles.title}>Maze editor</h1>
      </header>

      <main className={styles.main}>
        <section className={styles.toolbar}>
          <p className={styles.toolTitle}>Building tools</p>
          <div className={styles.toolGrid}>
            {(['floor', 'wall', 'start', 'end', 'chest'] as Tool[]).map(t => (
              <button key={t} className={`${styles.toolBtn} ${activeTool === t ? styles.toolActive : ''}`} onClick={() => setActiveTool(t)}>
                <span className={`${styles.toolIcon} ${styles[`tool_${t}`]}`} aria-hidden="true" />
                {t === 'floor' ? 'Path' : t === 'wall' ? 'Wall' : t === 'start' ? 'Start' : t === 'end' ? 'Exit' : 'Item'}
              </button>
            ))}
          </div>
          
          <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button className="btn btn-primary btn-sm" onClick={startSimulation} disabled={isSimulating}>
              Test run
            </button>
            <button className="btn btn-secondary btn-xs" onClick={() => setGrid(Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill('wall')))}>
              Clear all
            </button>
          </div>
        </section>

        <section className={styles.canvasWrap}>
          {isSimulating && simMaze ? (
            <div className={styles.simContainer}>
              <button className={`${styles.toolBtn} ${styles.stopBtn} ${styles.topStopBtn}`} onClick={() => setIsSimulating(false)}>
                Stop test
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
                <p className={styles.hint}>Your hero runs on its own. Choose a path at each junction.</p>
              )}
            </div>
          ) : (
            <>
              <canvas ref={canvasRef} width={GRID_SIZE * CELL_SIZE} height={GRID_SIZE * CELL_SIZE} className={styles.editorCanvas}
                style={{ touchAction: 'none' }}
                onContextMenu={(e) => e.preventDefault()}
                onPointerDown={(e) => {
                  e.currentTarget.setPointerCapture(e.pointerId);
                  isDrawing.current = true;
                  paintAt(e.clientX, e.clientY, e.button === 2 ? 'wall' : activeTool);
                }}
                onPointerMove={(e) => {
                  if (!isDrawing.current) return;
                  const tool = e.buttons & 2 ? 'wall' : activeTool;
                  // Only paths and walls paint while dragging; markers are placed with a tap
                  if (tool === 'floor' || tool === 'wall') paintAt(e.clientX, e.clientY, tool);
                }}
                onPointerUp={() => { isDrawing.current = false; }}
                onPointerCancel={() => { isDrawing.current = false; }}
              />
              <p className={styles.hint}>Tap or drag to carve paths. Pick Wall to fill one back in.</p>
            </>
          )}

          {/* ── Architect's Handbook ── */}
          <div className={styles.guide}>
            <p className={styles.toolTitle}>Architect&apos;s handbook</p>
            <div className={styles.guideGrid}>
              <div className={styles.guideStep}>
                <span className={styles.stepNum}>1</span>
                <div>
                  <p className={styles.stepLabel}>Carve paths</p>
                  <p className={styles.stepDesc}>Tap or drag through solid rock.</p>
                </div>
              </div>
              <div className={styles.guideStep}>
                <span className={styles.stepNum}>2</span>
                <div>
                  <p className={styles.stepLabel}>Fix mistakes</p>
                  <p className={styles.stepDesc}>Pick Wall and tap to fill a path back in. Right-click works too.</p>
                </div>
              </div>
              <div className={styles.guideStep}>
                <span className={styles.stepNum}>3</span>
                <div>
                  <p className={styles.stepLabel}>Hero entry</p>
                  <p className={styles.stepDesc}>Place the start where your hero enters.</p>
                </div>
              </div>
              <div className={styles.guideStep}>
                <span className={styles.stepNum}>4</span>
                <div>
                  <p className={styles.stepLabel}>Portal exit</p>
                  <p className={styles.stepDesc}>Every dungeon needs a way out.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <aside className={styles.sidebar}>
          <div className={styles.infoBox}>
            <h3 className={styles.infoTitle}>Save your dungeon</h3>
            <p className={styles.infoText}>Keep it on this device with the rest of your progress. Want a friend to race you? Use <strong>Challenge a friend</strong> on the Create page.</p>
            {error && <p style={{ color: '#ff9a8a', fontSize: '13px', marginTop: '10px' }}>{error}</p>}
            {saved && <p style={{ color: '#d4ff3a', fontSize: '13px', marginTop: '10px' }} role="status">Saved on this device.</p>}
            <button className="btn btn-gold btn-lg btn-block" style={{ marginTop: '20px' }} onClick={handleSave} disabled={isSimulating}>
              Save to this device
            </button>
          </div>
        </aside>
      </main>

      {/* ── Simulation Success Modal ── */}
      {simSuccess && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.successIcon} aria-hidden="true" />
            <h2 className={styles.modalTitle}>Dungeon verified</h2>
            <p className={styles.modalDesc}>
              Your maze can be escaped. Save it to keep it on this device.
            </p>
            <div className={styles.modalButtons}>
              <button className="btn btn-secondary btn-sm" onClick={() => { setSimSuccess(false); setIsSimulating(false); }}>
                Edit more
              </button>
              <button className="btn btn-gold btn-sm" onClick={() => { setSimSuccess(false); setIsSimulating(false); handleSave(); }}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
    </WorldShell>
  );
}

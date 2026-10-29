'use client';

import Link from 'next/link';
import { useEffect, useState, useRef } from 'react';
import KnightSprite from '@/components/character/KnightSprite';
import { play } from '@/lib/sfx';
import { usePlayerStore } from '@/lib/store/playerStore';
import WorldShell from '@/components/ui/WorldShell';
import styles from './stages.module.css';

const WORLDS = [
  { id: 1, name: 'Pixel Forest',  range: [1,  20],  accent: '#9be15d' },
  { id: 2, name: 'Crystal Cave',  range: [21, 40],  accent: '#5fd8f0' },
  { id: 3, name: 'Shadow Realm',  range: [41, 60],  accent: '#b48cff' },
  { id: 4, name: 'Fire Mountain', range: [61, 80],  accent: '#ff8a4c' },
  { id: 5, name: 'Golden Palace', range: [81, 100], accent: '#ffd25e' },
];

/** Height of one row of the stage path: 96 px on phones, 112 px wider */
const rowHeight = (cols: number) => (cols === 4 ? 96 : 112);

/** Where stage i sits on a winding path `cols` wide: rows alternate direction */
function spot(i: number, cols: number) {
  const row = Math.floor(i / cols);
  const k = i % cols;
  return { row, col: row % 2 === 0 ? k : cols - 1 - k };
}

export default function StagesPage() {
  const { stageResults, highestStage, infiniteHighScore, hero, equippedItems } = usePlayerStore();
  const [cols, setCols] = useState(5);
  const swipe = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const fit = () => setCols(window.innerWidth < 640 ? 4 : 5);
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);

  const goWorld = (id: number) => {
    const w = Math.min(5, Math.max(1, id));
    if (w !== worldId) play('choose');
    setWorldId(w);
  };
  const [mounted, setMounted] = useState(false);
  const [worldId, setWorldId] = useState(1);

  const progress = mounted ? highestStage : 0;
  const next = Math.min(progress + 1, 100);

  // Open on the world that holds the next stage
  useEffect(() => {
    setMounted(true);
    const h = usePlayerStore.getState().highestStage;
    setWorldId(Math.min(5, Math.floor(Math.min(h, 99) / 20) + 1));
  }, []);

  const world = WORLDS[worldId - 1];
  const [from, to] = world.range;
  const stages = Array.from({ length: to - from + 1 }, (_, i) => from + i);
  const cleared = mounted ? stages.filter(n => stageResults[n]).length : 0;
  const stars = mounted ? stages.reduce((sum, n) => sum + (stageResults[n]?.stars ?? 0), 0) : 0;
  const locked = from > progress + 1;
  const continueStage = next >= from && next <= to ? next : null;

  const ROW = rowHeight(cols);

  return (
    <WorldShell active="worlds">
      <div className={styles.page} style={{ ['--world' as string]: world.accent }}>
        {/* ── World title ─────────────────────── */}
        <header className={styles.head}>
          <div className={styles.titleBlock}>
            <span className={styles.tag}>World {worldId} of 5</span>
            <h1 className={styles.title} key={worldId}>{world.name}</h1>
            <p className={styles.meta}>
              {locked
                ? `Opens after stage ${from - 1}`
                : <>{cleared} of 20 cleared · <span className={styles.lime}>★</span> {stars} of 60</>}
            </p>
          </div>
          <div className={styles.arrows}>
            <button
              type="button"
              className={styles.arrow}
              onClick={() => goWorld(worldId - 1)}
              disabled={worldId === 1}
              aria-label="Previous world"
            >
              <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
            <button
              type="button"
              className={styles.arrow}
              onClick={() => goWorld(worldId + 1)}
              disabled={worldId === 5}
              aria-label="Next world"
            >
              <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
          </div>
        </header>

        {/* ── Stage path ──────────────────────── */}
        <section
          className={`${styles.board} ${locked ? styles.boardLocked : ''}`}
          aria-label={`${world.name} stages`}
          onTouchStart={e => { const t = e.touches[0]; swipe.current = { x: t.clientX, y: t.clientY }; }}
          onTouchEnd={e => {
            const st = swipe.current;
            swipe.current = null;
            if (!st) return;
            const t = e.changedTouches[0];
            const dx = t.clientX - st.x;
            if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(t.clientY - st.y) * 1.5) goWorld(worldId + (dx < 0 ? 1 : -1));
          }}
        >
          <div className={styles.map} key={`${worldId}-${cols}`} style={{ height: Math.ceil(stages.length / cols) * ROW }}>
            <svg className={styles.trail} viewBox={`0 0 1000 ${Math.ceil(stages.length / cols) * ROW}`} preserveAspectRatio="none" aria-hidden="true">
              {stages.slice(1).map((n, i) => {
                const a = spot(i, cols);
                const b = spot(i + 1, cols);
                const ax = ((a.col + 0.5) / cols) * 1000, ay = a.row * ROW + ROW / 2;
                const bx = ((b.col + 0.5) / cols) * 1000, by = b.row * ROW + ROW / 2;
                const bend = a.row !== b.row ? (a.col === 0 ? -70 : 70) : 0;
                const d = bend
                  ? `M${ax} ${ay} C${ax + bend} ${ay} ${bx + bend} ${by} ${bx} ${by}`
                  : `M${ax} ${ay} L${bx} ${by}`;
                const lit = mounted && n <= progress + 1;
                return <path key={n} d={d} className={lit ? styles.trailLit : styles.trailDim} vectorEffect="non-scaling-stroke" />;
              })}
            </svg>

            {stages.map((n, i) => {
              const { row, col } = spot(i, cols);
              const r = mounted ? stageResults[n] : undefined;
              const isLocked = !mounted || n > progress + 1;
              const isNext = mounted && n === next && !r;
              const gate = n === to;
              const cls = `${styles.node} ${r ? styles.cleared : ''} ${isNext ? styles.next : ''} ${isLocked ? styles.locked : ''} ${gate ? styles.gate : ''}`;
              const pos = { left: `${((col + 0.5) / cols) * 100}%`, top: row * ROW + ROW / 2, animationDelay: `${i * 18}ms` };
              const body = (
                <>
                  {isNext && <KnightSprite className={styles.nodeHero} hero={hero} gear={equippedItems} fps={4} />}
                  <span className={styles.disc}>
                    {isLocked ? <span className={styles.lockIcon} aria-hidden="true" /> : <span className={styles.num}>{n}</span>}
                  </span>
                  {r && (
                    <span className={styles.stars} aria-hidden="true">
                      {[1, 2, 3].map(k => <i key={k} className={k <= r.stars ? styles.starOn : ''}>★</i>)}
                    </span>
                  )}
                </>
              );
              return isLocked ? (
                <span key={n} className={cls} style={pos} aria-label={`Stage ${n}, locked`}>{body}</span>
              ) : (
                <Link
                  key={n}
                  id={`stage-btn-${n}`}
                  href={`/game/${n}`}
                  className={cls}
                  style={pos}
                  onClick={() => play('choose')}
                  aria-label={`Stage ${n}${r ? `, ${r.stars} of 3 stars` : ''}`}
                >
                  {body}
                </Link>
              );
            })}
          </div>

          <div className={styles.boardFoot}>
            {continueStage ? (
              <Link href={`/game/${continueStage}`} className={styles.play} onClick={() => play('start')}>
                {progress === 0 ? 'Start stage 1' : `Continue · stage ${continueStage}`} <b aria-hidden="true" />
              </Link>
            ) : locked ? (
              <span className={styles.footNote}>This world opens after stage {from - 1}.</span>
            ) : (
              <span className={styles.footNote}>World cleared. Replay any stage to earn all three stars.</span>
            )}
          </div>
        </section>

        {/* ── More ways to play ───────────────── */}
        <section className={styles.modes} aria-labelledby="more-modes">
          <h2 id="more-modes" className={styles.modesTitle}>More ways to play</h2>
          <Link href="/game/infinite" className={styles.mode}>
            <span className={styles.modeBadge} aria-hidden="true">∞</span>
            <span className={styles.modeText}>
              <strong>Infinite run</strong>
              <small>{mounted && infiniteHighScore > 0 ? `Endless mazes · best ${infiniteHighScore}` : 'Endless mazes, as far as you can go'}</small>
            </span>
            <svg className={styles.modeGo} viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </Link>
          <Link href="/architect" className={styles.mode}>
            <span className={`${styles.modeBadge} ${styles.modeBadgeStone}`} aria-hidden="true" />
            <span className={styles.modeText}>
              <strong>Challenge a friend</strong>
              <small>One maze for both of you, by link or SMS</small>
            </span>
            <svg className={styles.modeGo} viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </Link>
          <Link href="/compete" className={styles.mode}>
            <span className={styles.modeBadge} aria-hidden="true">★</span>
            <span className={styles.modeText}>
              <strong>Competitions</strong>
              <small>Verified leaderboards, with airtime prizes when announced</small>
            </span>
            <svg className={styles.modeGo} viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </Link>
        </section>
      </div>
    </WorldShell>
  );
}

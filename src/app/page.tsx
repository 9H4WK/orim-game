'use client';

import { useEffect, useState, useRef, type CSSProperties } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import KnightSprite from '@/components/character/KnightSprite';
import RankingBoard from '@/components/ui/RankingBoard';
import { usePlayerStore } from '@/lib/store/playerStore';
import styles from './home.module.css';

const FEATURES = [
  { tag: '100 floors', title: 'Legendary quests', desc: 'Conquer 100 floors of progressive mechanical peril across five worlds.' },
  { tag: 'Draw your maze', title: 'Architect mode', desc: 'Draw your own dungeon and run it yourself to prove it works.' },
  { tag: 'Hidden loot', title: 'Hidden loot', desc: 'Find rare hats and relics deep in the mazes, or unlock them with coins. Your hero wears them in every run.' },
  { tag: 'SMS challenges', title: 'Challenge a friend', desc: 'Text a friend the exact same maze and compare verified times.' },
];

/** About, in plain words: what it is, how it plays, what it runs on */
const ABOUT = [
  { title: 'How it plays', desc: 'Your hero runs the corridors on their own. At every fork you choose the way. Fewer wrong turns, more stars.' },
  { title: '100 stages', desc: 'Five worlds, from small 7×7 mazes to sprawling ones. Then an infinite run that never repeats.' },
  { title: 'Items', desc: 'Hats, armour and relics for your hero. Buy them with coins from your stars, or find the rare ones hidden in the mazes.' },
  { title: 'Challenge friends', desc: 'Send a friend the exact maze you just ran, by link or by SMS. The server checks both runs, so the comparison is fair.' },
  { title: 'Make your own', desc: 'Draw a maze by hand and run it yourself to prove it works.' },
];

const BUILT_ON = 'Next.js · Africa’s Talking SMS and Airtime';

const STICKERS: { cls: string; r: string; delay: string }[] = [
  { cls: styles.s1, r: '-7deg', delay: '0.8s' },
  { cls: styles.s2, r: '6deg', delay: '0.95s' },
  { cls: styles.s3, r: '4deg', delay: '1.1s' },
  { cls: styles.s4, r: '-4deg', delay: '1.25s' },
];

type Sheet = 'about' | 'ranks' | 'menu' | null;

export default function HomePage() {
  const router = useRouter();
  const { highestStage } = usePlayerStore();

  const [mounted, setMounted] = useState(false);
  const [sheet, setSheet] = useState<Sheet>(null);
  const skyRef = useRef<HTMLDivElement>(null);

  const nextStage = Math.min((mounted ? highestStage : 0) + 1, 100);
  const playHref = mounted && highestStage >= 100 ? '/game/infinite' : `/game/${nextStage}`;

  useEffect(() => { setMounted(true); }, []);

  // Enter plays, Escape closes a sheet
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSheet(null);
      if (e.key === 'Enter' && !sheet && e.target === document.body) router.push(playHref);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [router, sheet, playHref]);

  // Gentle parallax on the mountains
  useEffect(() => {
    const move = (e: PointerEvent) => {
      const el = skyRef.current;
      if (!el) return;
      el.style.setProperty('--px', `${(e.clientX / window.innerWidth - 0.5) * -14}px`);
      el.style.setProperty('--py', `${(e.clientY / window.innerHeight - 0.5) * -8}px`);
    };
    window.addEventListener('pointermove', move);
    return () => window.removeEventListener('pointermove', move);
  }, []);

  return (
    <div className={styles.page}>
      <div ref={skyRef} className={styles.sky} />
      <div className={styles.mist} />
      <div className={styles.shade} />

      {/* ── Nav ─────────────────────────────── */}
      <nav className={styles.nav}>
        <Link className={styles.logo} href="/">
          <svg width="24" height="24" viewBox="0 0 12 12" aria-hidden="true" shapeRendering="crispEdges">
            <path fill="#f6eedb" d="M0 0h12v2H2v8h8V4H4v4h2V6h2v4H4v-2H2V2h10v10H0Z" />
            <rect x="6" y="6" width="2" height="2" fill="#d4ff3a" />
          </svg>
          ORIM
        </Link>

        <div className={styles.menu}>
          <Link href="/stages">Worlds</Link>
          <Link href="/shop">Items</Link>
          <Link href="/architect">Create</Link>
          <button type="button" onClick={() => setSheet('ranks')}>Ranks</button>
          <button type="button" onClick={() => setSheet('about')}>About</button>
        </div>

        <div className={styles.account}>
          <button type="button" className={styles.menuBtn} onClick={() => setSheet('menu')} aria-label="Open menu">
            <span /><span /><span />
          </button>
        </div>
      </nav>

      {/* ── Stage ───────────────────────────── */}
      <div className={styles.stage} aria-hidden="true">
        <div className={styles.word}>ORIM</div>
        {FEATURES.map((f, i) => (
          <span
            key={f.tag}
            className={`${styles.sticker} ${STICKERS[i].cls}`}
            style={{ '--r': STICKERS[i].r, '--in': STICKERS[i].delay } as CSSProperties}
          >
            {f.tag}
          </span>
        ))}
        <div className={styles.rock} />
        <div className={styles.ground} />
        <div className={styles.hero}>
          <KnightSprite />
        </div>
        {mounted && Array.from({ length: 16 }, (_, i) => (
          <span
            key={i}
            className={styles.spark}
            style={{
              left: `${36 + ((i * 37) % 28)}%`,
              '--s': i % 3 === 0 ? '5px' : '3px',
              '--c': i % 3 === 1 ? '#f6eedb' : '#d4ff3a',
              '--d': `${5 + (i % 5)}s`,
              '--delay': `${-((i * 0.73) % 10)}s`,
              '--dx': `${((i * 29) % 120) - 60}px`,
            } as CSSProperties}
          />
        ))}
      </div>

      {/* ── Bottom ──────────────────────────── */}
      <section className={styles.bottom}>
        <div className={styles.pitch}>
          <span className={styles.tag}>▶ The eternal maze</span>
          <h1>Find the way out.</h1>
          <p>Pick a hero. They run every corridor, you choose every turn. 100 stages, hidden loot, and the same maze for a friend to beat.</p>
        </div>

        <div className={styles.cta}>
          <Link href={playHref} className={styles.play}>
            {mounted && highestStage > 0 ? `Play stage ${nextStage}` : 'Play now'} <b aria-hidden="true" />
          </Link>
        </div>
      </section>

      {/* ── Sheets ──────────────────────────── */}
      {sheet && (
        <div className={styles.sheetBackdrop} onClick={e => { if (e.target === e.currentTarget) setSheet(null); }}>
          <div className={styles.sheet} role="dialog" aria-modal="true" aria-label={sheet === 'about' ? 'About ORIM' : sheet === 'ranks' ? 'Rankings' : 'Menu'}>
            <button type="button" className={styles.close} onClick={() => setSheet(null)} aria-label="Close">✕</button>

            {sheet === 'menu' ? (
              <nav className={styles.mobileMenu}>
                <Link href="/stages">Worlds</Link>
                <Link href="/shop">Items</Link>
                <Link href="/architect">Create</Link>
                <button type="button" onClick={() => setSheet('ranks')}>Ranks</button>
                <button type="button" onClick={() => setSheet('about')}>About</button>
              </nav>
            ) : sheet === 'about' ? (
              <div className={styles.about}>
                <h2>About ORIM</h2>
                <p className={styles.lead}>A maze game where your hero runs and you choose the turns.</p>
                <dl className={styles.aboutList}>
                  {ABOUT.map(a => (
                    <div key={a.title}>
                      <dt>{a.title}</dt>
                      <dd>{a.desc}</dd>
                    </div>
                  ))}
                </dl>
                <p className={styles.built}>Built on {BUILT_ON}</p>
              </div>
            ) : (
              <div className={styles.ranks}>
                <RankingBoard />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

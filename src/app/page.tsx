'use client';

import { useEffect, useState, useCallback, useRef, type CSSProperties } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useWallet, useConnection, useAnchorWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { PublicKey } from '@solana/web3.js';
import { OrimBlockchainService, PROGRAM_ID } from '@/lib/blockchain/program-service';
import KnightSprite from '@/components/character/KnightSprite';
import RankingBoard from '@/components/ui/RankingBoard';
import { usePlayerStore } from '@/lib/store/playerStore';
import styles from './home.module.css';

const SANDBOX_PROGRAM = 'Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS';

const FEATURES = [
  { tag: '100 floors', title: 'Legendary quests', desc: 'Conquer 100 floors of progressive mechanical peril across five worlds.' },
  { tag: 'Mint your maze', title: 'Architect mode', desc: 'Design, verify, and mint your own dungeons as NFTs.' },
  { tag: 'Hidden loot', title: 'Hidden loot', desc: 'Find rare hats and relics deep in the mazes, or unlock them with coins. Your hero wears them in every run.' },
  { tag: 'MagicBlock VRF', title: 'On-chain glory', desc: 'Fair randomness powered by MagicBlock VRF and Solana.' },
];

/** About, in plain words: what it is, how it plays, what it runs on */
const ABOUT = [
  { title: 'How it plays', desc: 'Your hero runs the corridors on their own. At every fork you choose the way. Fewer wrong turns, more stars.' },
  { title: '100 stages', desc: 'Five worlds, from small 7×7 mazes to sprawling ones. Then an infinite run that never repeats.' },
  { title: 'Items', desc: 'Hats, armour and relics for your hero. Buy them with coins from your stars, or find the rare ones hidden in the mazes.' },
  { title: 'Make your own', desc: 'Draw a maze for anyone to play, or summon a labyrinth on Solana that takes its mood from the market.' },
];

const BUILT_ON = 'Solana · Metaplex Core · MagicBlock';

const STICKERS: { cls: string; r: string; delay: string }[] = [
  { cls: styles.s1, r: '-7deg', delay: '0.8s' },
  { cls: styles.s2, r: '6deg', delay: '0.95s' },
  { cls: styles.s3, r: '4deg', delay: '1.1s' },
  { cls: styles.s4, r: '-4deg', delay: '1.25s' },
];

type Sheet = 'about' | 'ranks' | 'menu' | null;

export default function HomePage() {
  const { connection } = useConnection();
  const wallet = useAnchorWallet();
  const { connected, publicKey } = useWallet();
  const router = useRouter();
  const { highestStage } = usePlayerStore();

  const [mounted, setMounted] = useState(false);
  const [profileExists, setProfileExists] = useState<boolean | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [initError, setInitError] = useState('');
  const [sheet, setSheet] = useState<Sheet>(null);
  const skyRef = useRef<HTMLDivElement>(null);

  const isSandbox = PROGRAM_ID.toBase58() === SANDBOX_PROGRAM;
  const nextStage = Math.min((mounted ? highestStage : 0) + 1, 100);
  const playHref = mounted && highestStage >= 100 ? '/game/infinite' : `/game/${nextStage}`;

  const checkProfile = useCallback(async (pubkey: PublicKey) => {
    try {
      if (isSandbox) {
        setProfileExists(localStorage.getItem(`orim_sandbox_init_${pubkey.toBase58()}`) === 'true');
        return;
      }
      const service = new OrimBlockchainService(connection, wallet!);
      const pda = await service.getUserProfilePda(pubkey);
      const acc = await connection.getAccountInfo(pda);
      setProfileExists(acc !== null);
    } catch {
      setProfileExists(false);
    }
  }, [connection, wallet, isSandbox]);

  useEffect(() => {
    setMounted(true);
    if (connected && wallet && publicKey) {
      setProfileExists(null);
      checkProfile(publicKey);
    }
  }, [connected, wallet, publicKey, checkProfile]);

  const handleInitProfile = async () => {
    if (!wallet) return;
    setIsInitializing(true);
    setInitError('');
    try {
      const service = new OrimBlockchainService(connection, wallet);
      await service.initializeUserProfile();
      setProfileExists(true);
    } catch (e) {
      console.error('Initialization Error:', e);
      setInitError(e instanceof Error ? e.message : 'Initialization failed');
    } finally {
      setIsInitializing(false);
    }
  };

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

  const short = publicKey ? `${publicKey.toBase58().slice(0, 4)}…${publicKey.toBase58().slice(-4)}` : '';

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
          {mounted && connected && isSandbox && <span className={styles.sandbox}>Sandbox</span>}
          {mounted && <WalletMultiButton />}
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
          <span className={styles.tag}>▶ The eternal maze · on Solana</span>
          <h1>Find the way out.</h1>
          <p>Pick a hero. They run every corridor, you choose every turn. 100 stages, hidden loot, and mazes you build yourself.</p>
        </div>

        <div className={styles.cta}>
          <Link href={playHref} className={styles.play}>
            {mounted && highestStage > 0 ? `Play stage ${nextStage}` : 'Play now'} <b aria-hidden="true" />
          </Link>

          <div className={styles.status}>
            {!mounted || !connected ? (
              <span>No wallet needed · <Link href="/stages">All worlds</Link> · <Link href="/architect">Build a maze</Link></span>
            ) : profileExists === null ? (
              <span><i className={styles.dot} />Syncing with adventure ledger…</span>
            ) : profileExists === false ? (
              <span>
                {isSandbox ? 'Local character not initialised' : 'No adventurer on-chain yet'} ·{' '}
                <button type="button" onClick={handleInitProfile} disabled={isInitializing}>
                  {isInitializing ? 'Initialising…' : 'Initialise adventurer'}
                </button>
              </span>
            ) : (
              <span><i className={`${styles.dot} ${styles.dotOn}`} />{isSandbox ? 'Sandbox adventurer' : 'Adventurer'} {short} ready</span>
            )}
            {initError && <span className={styles.error}>{initError}</span>}
          </div>
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

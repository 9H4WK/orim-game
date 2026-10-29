'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import styles from './ClearScreen.module.css';
import { getItemById } from '@/lib/shop/items';
import { usePlayerStore } from '@/lib/store/playerStore';

const KnightSprite = dynamic(() => import('../character/KnightSprite'), { ssr: false });

/** What the server said about an online run. Wording never claims more than is known. */
export type Verification =
  | { state: 'submitting' }
  | { state: 'verified'; durationMs: number; mistakes: number; underReview: boolean }
  | { state: 'rejected'; reason: string }
  | { state: 'error'; message: string };

interface ClearScreenProps {
  stage: number;
  stars: number;
  clearTime: number;
  mistakes: number;
  onNext: () => void;
  onRetry: () => void;
  onMenu: () => void;
  isInfiniteMode?: boolean;
  infiniteStageCount?: number;
  foundEasterEggs?: string[];
  /** Online runs (challenge or competition): result is checked by the server, no coins */
  online?: { label: string; nextLabel: string; verification: Verification };
  onChallenge?: () => void;
  challengeBusy?: boolean;
  challengeError?: string;
}

function formatTime(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60).toString().padStart(2, '0');
  const sec = (totalSec % 60).toString().padStart(2, '0');
  const msStr = Math.floor((ms % 1000) / 10).toString().padStart(2, '0');
  return `${min}:${sec}.${msStr}`;
}

import PixelIcon from './PixelIcon';

const REJECT_TEXT: Record<string, string> = {
  expired: 'This run took too long to submit, so it was not counted.',
  implausibly_fast: 'This run was faster than the game allows, so it was not counted.',
};

function statusLine(v: Verification | undefined, online: boolean): { text: string; tone: 'ok' | 'wait' | 'warn' } {
  if (!online || !v) return { text: 'Saved on this device', tone: 'ok' };
  switch (v.state) {
    case 'submitting': return { text: 'Run submitted · checking your path…', tone: 'wait' };
    case 'verified': return v.underReview
      ? { text: 'Verified · this result will be reviewed before any prize', tone: 'ok' }
      : { text: 'Verified by the server', tone: 'ok' };
    case 'rejected': return { text: REJECT_TEXT[v.reason] ?? 'This run could not be verified, so it was not counted.', tone: 'warn' };
    case 'error': return { text: v.message, tone: 'warn' };
  }
}

export default function ClearScreen({
  stage,
  stars,
  clearTime,
  mistakes,
  onNext,
  onRetry,
  onMenu,
  isInfiniteMode = false,
  infiniteStageCount = 0,
  foundEasterEggs = [],
  online,
  onChallenge,
  challengeBusy = false,
  challengeError,
}: ClearScreenProps) {
  const equippedItems = usePlayerStore((st) => st.equippedItems);
  const hero = usePlayerStore((st) => st.hero);
  const [visibleStars, setVisibleStars] = useState(0);
  const [showContent, setShowContent] = useState(false);
  const confettiRef = useRef(false);
  const verification = online?.verification;
  const verified = verification?.state === 'verified' ? verification : null;
  const status = statusLine(verification, !!online);

  useEffect(() => {
    const delays = [600, 1000, 1400];
    delays.slice(0, stars).forEach((delay, i) => {
      setTimeout(() => setVisibleStars(i + 1), delay);
    });

    setTimeout(() => setShowContent(true), 1900);

    if (!confettiRef.current) {
      confettiRef.current = true;
      import('canvas-confetti').then((mod) => {
        const confetti = mod.default;
        const end = Date.now() + 1500;
        const colors = ['#d4ff3a', '#f6eedb', '#8fb300', '#c9b8ff'];
        (function fire() {
          confetti({ particleCount: 5, angle: 60, spread: 60, origin: { x: 0 }, colors });
          confetti({ particleCount: 5, angle: 120, spread: 60, origin: { x: 1 }, colors });
          if (Date.now() < end) requestAnimationFrame(fire);
        })();
      });
    }
  }, [stars]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'r' || e.key === 'R') onRetry();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onRetry]);

  const headline = stars === 3 ? 'Flawless!' : stars === 2 ? 'Cleared!' : 'Escaped!';
  const nextLabel = online?.nextLabel ?? (isInfiniteMode ? 'Keep going' : stage >= 100 ? 'Infinite mode' : `Stage ${stage + 1}`);
  const label = online?.label ?? (isInfiniteMode ? `Infinite maze #${infiniteStageCount + 1}` : `Stage ${stage}`);

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label={`${headline} ${label}`}>
      <div className={styles.card}>
        <span className={styles.tag}>
          ▶ {label}
        </span>
        <h2 className={styles.stageBadge}>{headline}</h2>

        <div className={styles.trophyWrap}>
          <KnightSprite fps={7} gear={equippedItems} hero={hero} />
          <div className={styles.trophyGlow} />
          <div className={styles.rock} />
        </div>

        <div className={styles.stars} aria-label={`${stars} of 3 stars`}>
          {[1, 2, 3].map((n) => (
            <span key={n} className={`${styles.star} ${n <= visibleStars ? styles.starVisible : ''}`}>★</span>
          ))}
        </div>

        {showContent && (
          <div className={`${styles.stats} anim-slideup`}>
            <div className={styles.statRow}>
              <span className={styles.statLabel}>{verified ? 'Verified time' : 'Time'}</span>
              <span className={styles.statValue}>{formatTime(verified ? verified.durationMs : clearTime)}</span>
            </div>
            <div className={styles.statRow}>
              <span className={styles.statLabel}>Wrong turns</span>
              <span className={`${styles.statValue} ${(verified ? verified.mistakes : mistakes) > 0 ? styles.statDanger : styles.statSuccess}`}>
                {verified ? verified.mistakes : mistakes}
              </span>
            </div>
            {!online && (
              <div className={styles.statRow}>
                <span className={styles.statLabel}>Coins</span>
                <span className={`${styles.statValue} ${styles.statSuccess}`}>+{stars * 10}</span>
              </div>
            )}
          </div>
        )}

        {showContent && foundEasterEggs.length > 0 && (
          <div className={styles.itemsFound}>
            <p className={styles.itemsFoundTitle}>Legendary item found</p>
            <div className={styles.itemsList}>
              {foundEasterEggs.map(id => {
                const item = getItemById(id);
                return (
                  <div key={id} className={styles.foundItem}>
                    <div className={styles.itemEmoji}>
                      {item?.pixelMatrix && <PixelIcon matrix={item.pixelMatrix} size={32} />}
                    </div>
                    <span className={styles.itemName}>{item?.name || 'Unknown item'}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {showContent && (
          <div className={`${styles.buttons} anim-slideup`}>
            <button id="clear-next-btn" className={styles.next} onClick={onNext} autoFocus>
              {nextLabel} <b aria-hidden="true" />
            </button>
            <div className={styles.secondary}>
              <button id="clear-retry-btn" onClick={onRetry}>Retry <kbd>R</kbd></button>
              {onChallenge && (
                <>
                  <span aria-hidden="true">·</span>
                  <button id="clear-challenge-btn" onClick={onChallenge} disabled={challengeBusy}>
                    {challengeBusy ? 'Making…' : 'Challenge a friend'}
                  </button>
                </>
              )}
              <span aria-hidden="true">·</span>
              <button id="clear-menu-btn" onClick={onMenu}>Worlds</button>
            </div>
            <div className={styles.status} role="status" aria-live="polite">
              <div className={`${styles.dot} ${status.tone === 'wait' ? styles.dotWait : status.tone === 'warn' ? styles.dotWarn : ''}`} />
              <span className={styles.statusText}>{challengeError || status.text}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

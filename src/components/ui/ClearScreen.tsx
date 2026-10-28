'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import styles from './ClearScreen.module.css';
import { getItemById } from '@/lib/shop/items';
import { usePlayerStore } from '@/lib/store/playerStore';

const KnightSprite = dynamic(() => import('../character/KnightSprite'), { ssr: false });

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
}

function formatTime(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60).toString().padStart(2, '0');
  const sec = (totalSec % 60).toString().padStart(2, '0');
  const msStr = Math.floor((ms % 1000) / 10).toString().padStart(2, '0');
  return `${min}:${sec}.${msStr}`;
}

import PixelIcon from './PixelIcon';

import { useWallet, useConnection, useAnchorWallet } from '@solana/wallet-adapter-react';
import { OrimBlockchainService } from '@/lib/blockchain/program-service';

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
}: ClearScreenProps) {
  const { connection } = useConnection();
  const equippedItems = usePlayerStore((st) => st.equippedItems);
  const hero = usePlayerStore((st) => st.hero);
  const wallet = useAnchorWallet();
  const [visibleStars, setVisibleStars] = useState(0);
  const [showContent, setShowContent] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [txId, setTxId] = useState<string | null>(null);
  const confettiRef = useRef(false);

  const syncResult = useCallback(async () => {
    setStatusText('Recording on Solana…');
    try {
      const service = new OrimBlockchainService(connection, wallet!);
      const sig = await service.recordStageClear(stage, stars);
      setTxId(sig);
      setStatusText('Recorded on-chain');
    } catch (e: any) {
      console.error('Sync error:', e);
      setStatusText('Sync failed · your result is saved on this device');
    }
  }, [connection, wallet, stage, stars]);

  useEffect(() => {
    const delays = [600, 1000, 1400];
    delays.slice(0, stars).forEach((delay, i) => {
      setTimeout(() => setVisibleStars(i + 1), delay);
    });

    setTimeout(() => {
      setShowContent(true);
      if (wallet) {
        syncResult();
      } else {
        setStatusText('Saved on this device · connect a wallet to record on-chain');
      }
    }, 1900);

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
  }, [stars, wallet, syncResult]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'r' || e.key === 'R') onRetry();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onRetry]);

  const headline = stars === 3 ? 'Flawless!' : stars === 2 ? 'Cleared!' : 'Escaped!';
  const nextLabel = isInfiniteMode ? 'Keep going' : stage >= 100 ? 'Infinite mode' : `Stage ${stage + 1}`;

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label={`${headline} ${isInfiniteMode ? 'Infinite maze' : `Stage ${stage}`}`}>
      <div className={styles.card}>
        <span className={styles.tag}>
          ▶ {isInfiniteMode ? `Infinite maze #${infiniteStageCount + 1}` : `Stage ${stage}`}
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
              <span className={styles.statLabel}>Time</span>
              <span className={styles.statValue}>{formatTime(clearTime)}</span>
            </div>
            <div className={styles.statRow}>
              <span className={styles.statLabel}>Wrong turns</span>
              <span className={`${styles.statValue} ${mistakes > 0 ? styles.statDanger : styles.statSuccess}`}>
                {mistakes}
              </span>
            </div>
            <div className={styles.statRow}>
              <span className={styles.statLabel}>Coins</span>
              <span className={`${styles.statValue} ${styles.statSuccess}`}>+{stars * 10}</span>
            </div>
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
              <span aria-hidden="true">·</span>
              <button id="clear-menu-btn" onClick={onMenu}>Worlds</button>
            </div>
            <div className={styles.onChainStatus}>
              <div className={styles.onlineDot} />
              <span className={styles.syncText}>{statusText || 'Ready to sync'}</span>
              {txId && !txId.startsWith('sandbox') && (
                <a
                  href={`https://explorer.solana.com/tx/${txId}?cluster=devnet`}
                  target="_blank"
                  rel="noreferrer"
                  className={styles.txLink}
                >
                  View tx ↗
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

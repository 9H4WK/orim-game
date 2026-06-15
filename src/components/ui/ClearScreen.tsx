'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import styles from './ClearScreen.module.css';
import { getItemById } from '@/lib/shop/items';

const Trophy3D = dynamic(() => import('./Trophy3D'), { ssr: false });

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
  finalPnL?: number;
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
  finalPnL,
}: ClearScreenProps) {
  const { connection } = useConnection();
  const wallet = useAnchorWallet();
  const [visibleStars, setVisibleStars] = useState(0);
  const [showContent, setShowContent] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [txId, setTxId] = useState<string | null>(null);
  const confettiRef = useRef(false);

  const syncResult = useCallback(async () => {
    setStatusText('TRANSMITTING TO SOLANA LEDGER...');
    try {
      const service = new OrimBlockchainService(connection, wallet!);
      const sig = await service.recordStageClear(stage, stars);
      setTxId(sig);
      setStatusText('SYNC COMPLETE: STARDUST SECURED');
    } catch (e: any) {
      console.error('Sync error:', e);
      setStatusText('SYNC FAILED: RETRY IN VAULT');
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
        setStatusText('OFFLINE: CONNECT WALLET TO RECORD');
      }
    }, 1900);

    if (!confettiRef.current) {
      confettiRef.current = true;
      import('canvas-confetti').then((mod) => {
        const confetti = mod.default;
        const end = Date.now() + 1500;
        const colors = ['#fbbf24', '#d97706', '#7c3aed', '#fff'];
        (function fire() {
          confetti({ particleCount: 5, angle: 60, spread: 60, origin: { x: 0 }, colors });
          confetti({ particleCount: 5, angle: 120, spread: 60, origin: { x: 1 }, colors });
          if (Date.now() < end) requestAnimationFrame(fire);
        })();
      });
    }
  }, [stars, wallet, syncResult]);

  return (
    <div className={`${styles.overlay} scanlines`}>
      <div className={styles.card}>
        <div className={styles.stageBadge}>
          {isInfiniteMode 
            ? `INFINITE MAZE #${infiniteStageCount + 1} COMPLETE!` 
            : `STAGE ${stage} COMPLETE!`}
        </div>

        {/* Feature: Centered High-Quality Trophy */}
        <div className={styles.trophyWrap}>
          <Trophy3D size={260} autoRotate />
          <div className={styles.trophyGlow} />
        </div>

        <div className={styles.stars}>
          {[1, 2, 3].map((n) => (
            <span key={n} className={`${styles.star} ${n <= visibleStars ? styles.starVisible : ''}`}>★</span>
          ))}
        </div>

        {showContent && (
          <div className={`${styles.stats} anim-slideup`}>
            <div className={styles.statRow}>
              <span className={styles.statLabel}>⏱ TIME</span>
              <span className={styles.statValue}>{formatTime(clearTime)}</span>
            </div>
            <div className={styles.statRow}>
              <span className={styles.statLabel}>💢 MISTAKES</span>
              <span className={`${styles.statValue} ${mistakes > 0 ? styles.statDanger : styles.statSuccess}`}>
                {mistakes}
              </span>
            </div>

            {/* Flash Trade Final PnL */}
            {finalPnL !== undefined && (
              <div className={styles.statRow}>
                <span className={styles.statLabel}>⚡ FLASH PnL</span>
                <span className={`${styles.statValue} ${finalPnL >= 0 ? styles.statSuccess : styles.statDanger}`}>
                  {finalPnL >= 0 ? '+' : ''}{finalPnL.toFixed(2)}%
                </span>
              </div>
            )}
            
            {/* Items Found Section */}
            {foundEasterEggs.length > 0 && (
              <div className={styles.itemsFound}>
                <p className={styles.itemsFoundTitle}>🎁 LEGENDARY ITEMS FOUND</p>
                <div className={styles.itemsList}>
                  {foundEasterEggs.map(id => {
                    const item = getItemById(id);
                    return (
                      <div key={id} className={styles.foundItem}>
                        <div className={styles.itemEmoji}>
                          {item?.pixelMatrix ? (
                            <PixelIcon matrix={item.pixelMatrix} size={32} glow={item.rarity === 'legendary'} />
                          ) : (
                            <span>{item?.emoji || '❔'}</span>
                          )}
                        </div>
                        <span className={styles.itemName}>{item?.name || 'Unknown Item'}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* On-Chain Status Info */}
            <div className={styles.onChainStatus}>
              <div className={styles.onlineDot} />
              <span className={styles.syncText}>
                {statusText || 'READY TO SYNC STARDUST...'}
              </span>
              {txId && !txId.startsWith('sandbox') && (
                <a 
                  href={`https://explorer.solana.com/tx/${txId}?cluster=devnet`} 
                  target="_blank" 
                  rel="noreferrer"
                  className={styles.txLink}
                >
                  VIEW TX ↗
                </a>
              )}
            </div>
          </div>
        )}

        {showContent && (
          <div className={`${styles.buttons} anim-slideup`}>
            <button id="clear-next-btn" className="btn btn-gold btn-lg" onClick={onNext}>
              {isInfiniteMode ? 'CONTINUE EXPLORING ▶' : stage >= 100 ? 'ENTER INFINITE MODE' : 'NEXT STAGE ▶'}
            </button>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', width: '100%' }}>
              <button id="clear-retry-btn" className="btn btn-secondary btn-sm" onClick={onRetry}>🔄 RETRY</button>
              <button id="clear-menu-btn" className="btn btn-secondary btn-sm" onClick={onMenu}>🏰 STAGES</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

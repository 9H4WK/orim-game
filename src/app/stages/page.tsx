'use client';

import { useRouter } from 'next/navigation';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { useEffect, useState, useMemo } from 'react';
import { usePlayerStore } from '@/lib/store/playerStore';
import { MazeAgentService } from '@/lib/blockchain/maze-agent-service';
import styles from './stages.module.css';

const WORLDS = [
  { id: 1, name: 'PIXEL FOREST',   range: [1,  20],  color: '#4ade80', emoji: '🌲' },
  { id: 2, name: 'CRYSTAL CAVE',   range: [21, 40],  color: '#22d3ee', emoji: '💎' },
  { id: 3, name: 'SHADOW REALM',   range: [41, 60],  color: '#a78bfa', emoji: '🌑' },
  { id: 4, name: 'FIRE MOUNTAIN',  range: [61, 80],  color: '#f87171', emoji: '🌋' },
  { id: 5, name: 'GOLDEN PALACE',  range: [81, 100], color: '#fbbf24', emoji: '👑' },
];

function getStarCount(results: Record<number, { stars: number }>, stage: number): number {
  return results[stage]?.stars ?? 0;
}

function Stars({ count }: { count: number }) {
  return (
    <div className={styles.stars}>
      {[1, 2, 3].map(n => (
        <span key={n} className={n <= count ? styles.starOn : styles.starOff}>★</span>
      ))}
    </div>
  );
}

export default function StagesPage() {
  const router = useRouter();
  const { connection } = useConnection();
  const { connected, publicKey } = useWallet();
  const { stageResults, highestStage, totalStars } = usePlayerStore();
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<'SOLO' | 'COMMUNITY'>('SOLO');
  
  const [sovereignLabyrinths, setSovereignLabyrinths] = useState<{address: string, name: string}[]>([]);
  const [communityLabyrinths, setCommunityLabyrinths] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const agentService = useMemo(() => {
    if (!connected || !mounted) return null;
    return new MazeAgentService(connection.rpcEndpoint, { publicKey }, "sk-placeholder");
  }, [connection.rpcEndpoint, connected, publicKey, mounted]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (agentService) {
      setIsLoading(true);
      
      const p1 = publicKey ? agentService.getSovereignLabyrinths(publicKey.toString()) : Promise.resolve([]);
      const p2 = agentService.getCommunityLabyrinths();
      
      Promise.all([p1, p2]).then(([myLabs, publicLabs]) => {
        setSovereignLabyrinths(myLabs);
        setCommunityLabyrinths(publicLabs);
      }).finally(() => setIsLoading(false));
    }
  }, [agentService, publicKey]);

  const handleStage = (n: number) => router.push(`/game/${n}`);
  const handleInfinite = () => router.push('/game/infinite');
  const handleSovereign = (address: string) => router.push(`/game/sovereign?id=${address}`);

  return (
    <div className={`${styles.page} scanlines`}>
      {/* ── Header ── */}
      <header className={styles.header}>
        <button 
          id="home-btn" 
          className="btn btn-secondary btn-sm" 
          onClick={() => router.push('/')}
        >
          ◀ HOME
        </button>
        <h1 className={styles.title}>ORIM</h1>
        <div className={styles.headerStats}>
          <div className={styles.coinDisplay}>
             <span className="font-pixel">⭐ {totalStars}</span>
          </div>
          <button 
            id="shop-btn" 
            className="btn btn-gold btn-sm" 
            onClick={() => router.push('/shop')}
          >
            🛒 SHOP
          </button>
        </div>
      </header>

      {/* ── Tab Switcher ── */}
      <div className={styles.tabSwitcher}>
        <button 
          className={`${styles.tabBtn} ${activeTab === 'SOLO' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('SOLO')}
        >
          SOLO CAMPAIGN
        </button>
        <button 
          className={`${styles.tabBtn} ${activeTab === 'COMMUNITY' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('COMMUNITY')}
        >
          COMMUNITY LABYRINTHS
        </button>
      </div>

      {activeTab === 'SOLO' ? (
        <div className="anim-fadein">
          {/* ── Global Stats Bar ── */}
          <div className={styles.statsBar}>
            <div className={styles.statItem}>
              <span className={styles.statVal}>{mounted ? highestStage : 0}</span>
              <span className={styles.statLab}>HIGH SCORE</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statVal}>{mounted ? totalStars : 0}</span>
              <span className={styles.statLab}>TOTAL STARS</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statVal}>{mounted ? Object.keys(stageResults).length : 0}</span>
              <span className={styles.statLab}>CLEARED</span>
            </div>
          </div>

          {/* ── Worlds ── */}
          <div className={styles.worlds}>
            {mounted && WORLDS.map((world) => {
              const [from, to] = world.range;
              const worldStages = Array.from({ length: to - from + 1 }, (_, i) => from + i);
              const worldCleared = worldStages.filter(s => getStarCount(stageResults, s) > 0).length;
              const isWorldLocked = from > 1 && highestStage < from - 1;

              return (
                <div 
                  key={world.id} 
                  className={`${styles.world} ${isWorldLocked ? styles.worldLocked : ''}`}
                >
                  <div className={styles.worldHeader}>
                    <span className={styles.worldEmoji}>{world.emoji}</span>
                    <div className={styles.worldInfo}>
                      <p className={styles.worldName} style={{ color: world.color }}>
                        {world.name}
                      </p>
                      <p className={styles.worldRange}>Stages {from} – {to}</p>
                    </div>
                    <div className={styles.worldProgress}>
                      {isWorldLocked ? (
                        <span className={styles.lock}>🔒</span>
                      ) : (
                        <span className={styles.worldCount}>
                          {worldCleared}/{worldStages.length}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className={styles.stageGrid}>
                    {worldStages.map((n) => {
                      const stars = getStarCount(stageResults, n);
                      const isCleared = stars > 0;
                      const isNext    = n === highestStage + 1;
                      const isLocked  = isWorldLocked || (n > 1 && n > highestStage + 1);

                      return (
                        <button
                          key={n}
                          id={`stage-btn-${n}`}
                          className={`${styles.stageBtn}
                            ${isCleared ? styles.stageCleared : ''}
                            ${isNext    ? styles.stageNext    : ''}
                            ${isLocked  ? styles.stageLocked  : ''}
                          `}
                          onClick={() => !isLocked && handleStage(n)}
                          disabled={isLocked}
                        >
                          <span className={styles.stageNum}>{n}</span>
                          <Stars count={stars} />
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Infinite Mode ── */}
          <div className={styles.infiniteSection}>
            <button
              id="infinite-mode-btn"
              className={`${styles.infiniteBtn} ${mounted && highestStage < 100 ? styles.infiniteLocked : ''}`}
              onClick={() => mounted && highestStage >= 100 && handleInfinite()}
              disabled={!mounted || highestStage < 100}
            >
              <span className={styles.infiniteIcon}>∞</span>
              <div>
                <p className={styles.infiniteTitle}>INFINITE MAZE MODE</p>
                <p className={styles.infiniteSub}>
                  {mounted && highestStage >= 100 
                    ? 'Endless mazes generated on-chain via VRF.' 
                    : `Clear Stage 100 to unlock (${mounted ? highestStage : 0}/100)`}
                </p>
              </div>
            </button>
          </div>
        </div>
      ) : (
        <div className="anim-fadein">
          {/* ── Sovereign Labyrinths (My Creations) ── */}
          {mounted && sovereignLabyrinths.length > 0 && (
            <div className={styles.sovereignSection}>
              <div className={styles.sectionHeader}>
                <span className={styles.sectionIcon}>🏺</span>
                <h2 className={styles.sectionTitle}>MY SOVEREIGN LABYRINTHS</h2>
              </div>
              <div className={styles.sovereignGrid}>
                {sovereignLabyrinths.map((lab) => (
                  <button 
                    key={lab.address}
                    className={styles.sovereignBtn}
                    onClick={() => handleSovereign(lab.address)}
                  >
                    <div className={styles.sovereignIcon}>💠</div>
                    <div className={styles.sovereignInfo}>
                      <p className={styles.sovereignName}>{lab.name}</p>
                      <p className={styles.sovereignAddr}>{lab.address.slice(0, 8)}...{lab.address.slice(-4)}</p>
                    </div>
                    <span className={styles.playArrow}>▶</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Community Discover (Public) ── */}
          <div className={styles.sovereignSection}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionIcon}>🌎</span>
              <h2 className={styles.sectionTitle}>GLOBAL DISCOVERY</h2>
            </div>
            <div className={styles.sovereignGrid}>
              {communityLabyrinths.map((lab) => (
                <button 
                  key={lab.address}
                  className={styles.sovereignBtn}
                  style={{ borderLeftColor: lab.mood === 'Void' ? '#7c3aed' : lab.mood === 'Radiant' ? '#fbbf24' : '#06b6d4' }}
                  onClick={() => handleSovereign(lab.address)}
                >
                  <div className={styles.sovereignIcon}>
                    {lab.mood === 'Void' ? '🌑' : lab.mood === 'Radiant' ? '☀️' : '💠'}
                  </div>
                  <div className={styles.sovereignInfo}>
                    <p className={styles.sovereignName}>{lab.name}</p>
                    <p className={styles.sovereignAddr}>BY {lab.creator}</p>
                  </div>
                  <div className={styles.playsInfo}>
                    <span className={styles.playCount}>👤 {lab.plays}</span>
                    <span className={styles.playArrow}>▶</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

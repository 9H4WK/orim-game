'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePlayerStore } from '@/lib/store/playerStore';
import styles from './RankingBoard.module.css';

const WORLDS = [
  { id: 1, name: 'PIXEL FOREST',   range: [1,  20],  color: '#4ade80', emoji: '🌲' },
  { id: 2, name: 'CRYSTAL CAVE',   range: [21, 40],  color: '#22d3ee', emoji: '💎' },
  { id: 3, name: 'SHADOW REALM',   range: [41, 60],  color: '#a78bfa', emoji: '🌑' },
  { id: 4, name: 'FIRE MOUNTAIN',  range: [61, 80],  color: '#f87171', emoji: '🌋' },
  { id: 5, name: 'GOLDEN PALACE',  range: [81, 100], color: '#fbbf24', emoji: '👑' },
];

interface RankingEntry {
  wallet: string;
  time: number;
  isMe: boolean;
}

const generateRandomWallet = (seed: number) => {
  const chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  let res = '';
  let rng = seed;
  for (let i = 0; i < 4; i++) {
    rng = (rng * 16807) % 2147483647;
    res += chars[rng % chars.length];
  }
  res += '...';
  for (let i = 0; i < 4; i++) {
    rng = (rng * 16807) % 2147483647;
    res += chars[rng % chars.length];
  }
  return res;
};

const generateMockData = (stage: number): RankingEntry[] => {
  const data: RankingEntry[] = [];
  const baseTime = 15000 + stage * 2000; 
  
  for (let i = 0; i < 15; i++) {
    const seed = stage * 100 + i;
    data.push({
      wallet: generateRandomWallet(seed),
      time: baseTime + ((seed * 37) % 20000),
      isMe: false
    });
  }
  return data;
};

export default function RankingBoard() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [activeWorldId, setActiveWorldId] = useState<number>(1);
  const [selectedStage, setSelectedStage] = useState<number | null>(null);
  
  const { walletAddress, stageResults } = usePlayerStore();

  useEffect(() => {
    setMounted(true);
  }, []);

  const activeWorld = WORLDS.find(w => w.id === activeWorldId)!;
  const stagesInWorld = Array.from({ length: activeWorld.range[1] - activeWorld.range[0] + 1 }, (_, i) => activeWorld.range[0] + i);

  // Compute rankings for the currently selected stage
  const currentRankings = useMemo(() => {
    if (selectedStage === null) return [];
    
    let stageData = generateMockData(selectedStage);
    
    // Inject local user's record
    const myRecord = stageResults[selectedStage];
    if (myRecord && myRecord.time > 0) {
      stageData.push({
        wallet: walletAddress ? `${walletAddress.slice(0,4)}...${walletAddress.slice(-4)}` : 'YOU',
        time: myRecord.time,
        isMe: true
      });
    }

    stageData.sort((a, b) => a.time - b.time);
    return stageData;
  }, [selectedStage, stageResults, walletAddress]);

  if (!mounted) return null;

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const milliseconds = ms % 1000;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0').slice(0, 2)}`;
  };

  const getRankClass = (idx: number) => {
    if (idx === 0) return styles.rank1;
    if (idx === 1) return styles.rank2;
    if (idx === 2) return styles.rank3;
    return '';
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Leaderboard</h1>
      <p className={styles.note}>Sample rankings for the demo · your own times are real and saved on this device</p>

      <div className={styles.board}>
        {/* Sidebar for Worlds */}
        <div className={styles.sidebar}>
          {WORLDS.map(world => (
            <button 
              key={world.id}
              className={`${styles.worldTab} ${activeWorldId === world.id ? styles.active : ''}`}
              onClick={() => {
                setActiveWorldId(world.id);
                setSelectedStage(null);
              }}
            >
              <span className={styles.worldEmoji}>{String(world.id).padStart(2, '0')}</span>
              <span>{world.name}</span>
            </button>
          ))}
        </div>

        {/* Main Content Area */}
        <div className={styles.mainContent}>
          {selectedStage === null ? (
            <>
              <div className={styles.mainHeader}>
                <h2 className={styles.mainTitle}>
                  {activeWorld.name} <span className={styles.mainRange}>Stages {activeWorld.range[0]}–{activeWorld.range[1]}</span>
                </h2>
              </div>
              <div className={styles.stageGrid}>
                {stagesInWorld.map(stage => {
                  const isCleared = !!stageResults[stage];
                  return (
                    <button 
                      key={stage} 
                      className={`${styles.stageBtn} ${isCleared ? styles.cleared : ''}`}
                      onClick={() => setSelectedStage(stage)}
                    >
                      {stage}
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <div className={styles.leaderboardView}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <button 
                  className={`btn btn-secondary btn-sm ${styles.backToStages}`}
                  style={{ marginBottom: 0 }}
                  onClick={() => setSelectedStage(null)}
                >
                  ← All stages
                </button>
                <button 
                  className="btn btn-primary btn-sm"
                  onClick={() => router.push(`/game/${selectedStage}`)}
                >
                  Play stage {selectedStage} →
                </button>
              </div>
              
              <div className={styles.mainHeader}>
                <h2 className={styles.mainTitle}>
                  Stage {selectedStage}
                </h2>
              </div>

              <div className={styles.tableWrapper}>
                <table className={styles.rankingTable}>
                  <thead>
                    <tr>
                      <th className={styles.rank}>Rank</th>
                      <th>Explorer</th>
                      <th className={styles.timeHeader}>Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentRankings.map((entry, idx) => (
                      <tr key={idx} className={entry.isMe ? styles.isMe : ''}>
                        <td className={`${styles.rank} ${getRankClass(idx)}`}>
                          #{idx + 1}
                        </td>
                        <td className={styles.wallet}>
                          {entry.wallet} {entry.isMe && '(you)'}
                        </td>
                        <td className={styles.time}>
                          {formatTime(entry.time)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
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
  name: string;
  time: number;
  isMe: boolean;
}

export default function RankingBoard() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [activeWorldId, setActiveWorldId] = useState<number>(1);
  const [selectedStage, setSelectedStage] = useState<number | null>(null);
  
  const { stageResults } = usePlayerStore();

  useEffect(() => {
    setMounted(true);
  }, []);

  const activeWorld = WORLDS.find(w => w.id === activeWorldId)!;
  const stagesInWorld = Array.from({ length: activeWorld.range[1] - activeWorld.range[0] + 1 }, (_, i) => activeWorld.range[0] + i);

  // Campaign times live only on this device, so this board shows only real, local records.
  // Shared rankings come from server-verified competition runs.
  const currentRankings = useMemo<RankingEntry[]>(() => {
    if (selectedStage === null) return [];
    const myRecord = stageResults[selectedStage];
    return myRecord && myRecord.time > 0 ? [{ name: 'You', time: myRecord.time, isMe: true }] : [];
  }, [selectedStage, stageResults]);

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
      <p className={styles.note}>
        Your best times, saved on this device · <Link href="/compete">Verified competition leaderboards →</Link>
      </p>

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
                    {currentRankings.length === 0 && (
                      <tr>
                        <td colSpan={3} className={styles.wallet}>No time yet. Clear this stage to set one.</td>
                      </tr>
                    )}
                    {currentRankings.map((entry, idx) => (
                      <tr key={idx} className={entry.isMe ? styles.isMe : ''}>
                        <td className={`${styles.rank} ${getRankClass(idx)}`}>
                          #{idx + 1}
                        </td>
                        <td className={styles.wallet}>
                          {entry.name}
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

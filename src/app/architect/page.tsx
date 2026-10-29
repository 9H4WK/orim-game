'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './architect.module.css';
import { api } from '@/lib/online/api';

// ORIM UI Components
import PixelIcon from '@/components/ui/PixelIcon';
import WorldShell from '@/components/ui/WorldShell';
import {
  ICON_FEAT_ARCHITECT,
  UI_PALETTE
} from '@/lib/maze/uiPixels';

/** Challenge sizes borrow the campaign's stage sizes, so a friend gets a familiar difficulty */
const SIZES = [
  { stage: 1, label: 'Quick', note: '7×7 · under a minute' },
  { stage: 21, label: 'Classic', note: '22×22 · a proper run' },
  { stage: 41, label: 'Long', note: '37×37 · for the patient' },
];

export default function ArchitectPage() {
  const router = useRouter();
  const [stage, setStage] = useState(SIZES[0].stage);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleChallenge = async () => {
    setBusy(true);
    setError('');
    try {
      const { token } = await api.createChallenge(stage);
      router.push(`/c/${token}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the challenge.');
      setBusy(false);
    }
  };

  if (!mounted) return null;

  return (
    <WorldShell active="create">
      <div className={styles.page}>
        <header className={styles.head}>
          <span className={styles.tag}>▶ Create</span>
          <h1 className={styles.title}>Build a maze</h1>
          <p className={styles.sub}>Draw one by hand, or send a friend a maze to race you on.</p>
        </header>

        <div className={styles.paths}>
          {/* ── Draw ─────────────────────────────── */}
          <section className={styles.card}>
            <div className={styles.cardArt}>
              <div className={styles.miniGrid} aria-hidden="true">
                {Array.from({ length: 49 }, (_, i) => {
                  const open = [8, 9, 10, 17, 24, 25, 26, 33, 40, 41, 12, 19, 26, 27, 34].includes(i);
                  return <i key={i} className={i === 8 ? styles.cellStart : i === 41 ? styles.cellEnd : open ? styles.cellOpen : ''} />;
                })}
              </div>
            </div>
            <div className={styles.cardBody}>
              <span className={styles.badge}>Free · instant</span>
              <h2>Draw a maze</h2>
              <p>Paint paths on a 15×15 grid, place a start and an exit, then run it yourself to prove it works.</p>
              <button type="button" className={styles.primary} onClick={() => router.push('/custom')}>
                Open the editor <b aria-hidden="true" />
              </button>
            </div>
          </section>

          {/* ── Challenge ────────────────────────── */}
          <section className={`${styles.card} ${styles.cardChain}`}>
            <div className={styles.cardArt}>
              <div className={styles.iconWrap}>
                <PixelIcon matrix={ICON_FEAT_ARCHITECT} size={96} palette={UI_PALETTE} />
              </div>
            </div>
            <div className={styles.cardBody}>
              <span className={styles.badge}>Free · link or SMS</span>
              <h2>Challenge a friend</h2>
              <p>ORIM makes one maze for both of you. Set your time, then send the link. Both runs are checked by the server before anyone wins.</p>
              <div className={styles.inputGroup}>
                <label id="size-label">Maze size</label>
                <div className={styles.moods} role="radiogroup" aria-labelledby="size-label">
                  {SIZES.map(s => (
                    <button
                      key={s.stage}
                      type="button"
                      role="radio"
                      className={`${styles.mood} ${stage === s.stage ? styles.moodOn : ''}`}
                      onClick={() => setStage(s.stage)}
                      disabled={busy}
                      aria-checked={stage === s.stage}
                    >
                      <strong>{s.label}</strong>
                      <small>{s.note}</small>
                    </button>
                  ))}
                </div>
              </div>
              <button type="button" className={styles.primary} onClick={handleChallenge} disabled={busy}>
                {busy ? 'Making your maze…' : 'Make a challenge'} <b aria-hidden="true" />
              </button>
              {error && <p className={styles.error} role="alert">{error}</p>}
            </div>
          </section>
        </div>
      </div>
    </WorldShell>
  );
}

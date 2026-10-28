'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { MazeAgentService } from '@/lib/blockchain/maze-agent-service';
import styles from './architect.module.css';

// ORIM UI Components
import PixelIcon from '@/components/ui/PixelIcon';
import WorldShell from '@/components/ui/WorldShell';
import {
  ICON_FEAT_ARCHITECT,
  UI_PALETTE
} from '@/lib/maze/uiPixels';

export default function ArchitectPage() {
  const { connection } = useConnection();
  const wallet = useWallet();
  const router = useRouter();
  const [name, setName] = useState('');
  const [mood, setMood] = useState('Mystic');
  const [isSummoning, setIsSummoning] = useState(false);
  const [isEvolving, setIsEvolving] = useState(false);
  const [status, setStatus] = useState<string[]>([]);
  const [result, setResult] = useState<any>(null);
  const [evolution, setEvolution] = useState<any>(null);
  const [mounted, setMounted] = useState(false);

  // Memoize the service to avoid expensive re-initializations (Umi/Plugins)
  const agentService = useMemo(() => {
    if (!wallet.publicKey || !mounted) return null;
    return new MazeAgentService(connection.rpcEndpoint, wallet, "sk-placeholder");
  }, [connection.rpcEndpoint, wallet, mounted]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const addStatus = (msg: string) => {
    setStatus(prev => [...prev, `> ${new Date().toLocaleTimeString()}: ${msg}`]);
  };

  const handleSummon = async () => {
    if (!wallet.publicKey || !wallet.signTransaction) {
      addStatus("Error: Please connect your wallet first.");
      return;
    }

    setIsSummoning(true);
    setStatus([]);
    setResult(null);
    addStatus(`Beginning Summoning Ritual for '${name}'...`);

    try {
      if (!agentService) throw new Error("Service not initialized");
      
      addStatus("Initiating Atomic Summoning Ritual (Identity + Economy)...");
      const result = await agentService.summonLabyrinth({
        name,
        uri: "https://arweave.net/maze-metadata-placeholder",
        initialMood: mood
      });

      addStatus(`Success! Labyrinth ALIVE at: ${result.assetAddress.slice(0, 8)}...`);
      addStatus(`Energy Economy Established: ${result.tokenMint.slice(0, 8)}...`);

      setResult(result);
      addStatus("Summoning Ritual Complete.");
    } catch (err: any) {
      console.error(err);
      addStatus(`Summoning Failed: ${err.message}`);
    } finally {
      setIsSummoning(false);
    }
  };

  const handleEvolve = async () => {
    if (!result) return;
    setIsEvolving(true);
    addStatus("Initiating Market Synchronization Ritual...");

    try {
      if (!agentService) throw new Error("Service not initialized");
      const evoData = await agentService.evolveMaze(result.assetAddress);
      setEvolution(evoData);
      addStatus(`Evolution Complete! Current Pulse: $${evoData.currentPrice}. Mood Shift: ${evoData.newMood}.`);
    } catch (err: any) {
      addStatus(`Evolution Failed: ${err.message}`);
    } finally {
      setIsEvolving(false);
    }
  };

  if (!mounted) return null;

  const explorer = (path: string) => `https://explorer.solana.com/${path}?cluster=devnet`;

  return (
    <WorldShell active="create">
      <div className={styles.page}>
        <header className={styles.head}>
          <span className={styles.tag}>▶ Create</span>
          <h1 className={styles.title}>Build a maze</h1>
          <p className={styles.sub}>Draw one by hand, or summon a living labyrinth on Solana.</p>
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

          {/* ── Summon ───────────────────────────── */}
          <section className={`${styles.card} ${styles.cardChain}`}>
            <div className={styles.cardArt}>
              <div className={styles.iconWrap}>
                <PixelIcon matrix={ICON_FEAT_ARCHITECT} size={96} palette={UI_PALETTE} />
              </div>
            </div>
            <div className={styles.cardBody}>
              <span className={styles.badge}>Solana devnet</span>
              <h2>Summon a labyrinth</h2>

              {!result ? (
                <>
                  <p>A sovereign NFT with its own soul and energy token. Its layout comes from its address.</p>
                  <div className={styles.inputGroup}>
                    <label htmlFor="lab-name">Labyrinth name</label>
                    <input
                      id="lab-name"
                      type="text"
                      placeholder="e.g. Neon Void, Crystal Sanctum"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      disabled={isSummoning}
                    />
                  </div>
                  <div className={styles.inputGroup}>
                    <label>Starting mood</label>
                    <div className={styles.moods}>
                      {[
                        ['Mystic', 'Ethereal & complex'],
                        ['Aggressive', 'Chaotic & rewarding'],
                        ['Zen', 'Symmetrical & flowing'],
                        ['Greedy', 'Market-driven'],
                      ].map(([id, note]) => (
                        <button
                          key={id}
                          type="button"
                          className={`${styles.mood} ${mood === id ? styles.moodOn : ''}`}
                          onClick={() => setMood(id)}
                          disabled={isSummoning}
                          aria-pressed={mood === id}
                        >
                          <strong>{id}</strong>
                          <small>{note}</small>
                        </button>
                      ))}
                    </div>
                  </div>
                  {wallet.publicKey ? (
                    <button type="button" className={styles.primary} onClick={handleSummon} disabled={isSummoning || !name.trim()}>
                      {isSummoning ? 'Summoning…' : 'Summon labyrinth'} <b aria-hidden="true" />
                    </button>
                  ) : (
                    <div className={styles.walletBox}><WalletMultiButton /></div>
                  )}
                </>
              ) : (
                <div className={styles.result}>
                  <p className={styles.resultTitle}>Your labyrinth is alive.</p>
                  <div className={styles.statRow}>
                    <span className={styles.statLabel}>Core identity</span>
                    <a href={explorer(`address/${result.assetAddress}`)} target="_blank" rel="noreferrer" className={styles.linkValue}>
                      {result.assetAddress.slice(0, 10)}… ↗
                    </a>
                  </div>
                  <div className={styles.statRow}>
                    <span className={styles.statLabel}>Energy token</span>
                    <a href={explorer(`address/${result.tokenMint}`)} target="_blank" rel="noreferrer" className={styles.linkValue}>
                      {result.tokenMint.slice(0, 10)}… ↗
                    </a>
                  </div>
                  <div className={styles.statRow}>
                    <span className={styles.statLabel}>Summoning tx</span>
                    <a href={explorer(`tx/${result.signature}`)} target="_blank" rel="noreferrer" className={styles.linkValue}>
                      View ↗
                    </a>
                  </div>
                  {evolution && (
                    <div className={styles.statRow}>
                      <span className={styles.statLabel}>Mood · SOL ${evolution.currentPrice}</span>
                      <span className={styles.statValue}>{evolution.newMood}</span>
                    </div>
                  )}
                  <button
                    type="button"
                    className={styles.primary}
                    onClick={() => router.push(`/game/sovereign?id=${result.assetAddress}&mood=${evolution?.newMood || mood}`)}
                  >
                    Enter your labyrinth <b aria-hidden="true" />
                  </button>
                  <button type="button" className={styles.secondary} onClick={handleEvolve} disabled={isEvolving}>
                    {isEvolving ? 'Syncing market…' : 'Sync mood with the market'}
                  </button>
                </div>
              )}

              {status.length > 0 && (
                <div className={styles.terminal} role="log" aria-live="polite">
                  {status.map((line, i) => (
                    <div key={i} className={styles.terminalLine}>{line}</div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </WorldShell>
  );
}

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { MazeAgentService } from '@/lib/blockchain/maze-agent-service';
import styles from './architect.module.css';

// ORIM UI Components
import PixelIcon from '@/components/ui/PixelIcon';
import PixelPanel from '@/components/ui/PixelPanel';
import PixelBackground from '@/components/ui/PixelBackground';
import { 
  ICON_FEAT_ARCHITECT, 
  BG_STARS, BG_CLOUDS, 
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
  }, [connection.rpcEndpoint, wallet.publicKey, mounted]);

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

  return (
    <div className={styles.page}>
      <PixelBackground 
        layers={[
          { matrix: BG_STARS, palette: UI_PALETTE, scale: 6, opacity: 0.3, speedY: 0.2 },
          { matrix: BG_CLOUDS, palette: UI_PALETTE, scale: 8, opacity: 0.1, speedX: 0.1, speedY: 0 },
        ]} 
      />
      <div className={styles.scanlines} />

      <div className={styles.content}>
        <button className={styles.backButton} onClick={() => router.push('/')}>
          « BACK TO VOID
        </button>

        <PixelPanel variant="stone" className={styles.mainBoard}>
          <header className={styles.header}>
            <div className={styles.iconWrap}>
              <PixelIcon matrix={ICON_FEAT_ARCHITECT} size={80} palette={UI_PALETTE} />
            </div>
            <h1>Divine Architect</h1>
            <p className={styles.subtext}>Forge a living labyrinth with its own soul and economy.</p>
            <div className={styles.walletBox}>
              <WalletMultiButton />
            </div>
          </header>

          <div className={styles.grid}>
            <div className={styles.summonCard}>
              <div className={styles.inputGroup}>
                <label>Labyrinth Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. Neon Void, Crystal Sanctum" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isSummoning}
                />
              </div>

              <div className={styles.inputGroup}>
                <label>Initial Mood / Soul Type</label>
                <select 
                  value={mood} 
                  onChange={(e) => setMood(e.target.value)}
                  disabled={isSummoning}
                >
                  <option value="Mystic">Mystic (Ethereal & Complex)</option>
                  <option value="Aggressive">Aggressive (Chaotic & Rewarding)</option>
                  <option value="Zen">Zen (Symmetrical & Flowing)</option>
                  <option value="Greedy">Greedy (Market-Driven & Volatile)</option>
                </select>
              </div>

              <button 
                className="btn btn-primary btn-lg" 
                style={{ width: '100%' }}
                onClick={handleSummon}
                disabled={isSummoning || !name || !wallet.publicKey}
              >
                {isSummoning ? 'SUMMONING...' : 'SUMMON AUTONOMOUS LABYRINTH'}
              </button>

              {status.length > 0 && (
                <div className={styles.terminal}>
                  {status.map((line, i) => (
                    <div key={i} className={styles.terminalLine}>{line}</div>
                  ))}
                </div>
              )}
            </div>

            {result && (
              <div className={styles.resultCard}>
                <h2 className={styles.resultTitle}>LABYRINTH ASCENDED</h2>
                <div className={styles.statRow}>
                  <span className={styles.statLabel}>CORE IDENTITY</span>
                  <span className={styles.statValue}>{result.assetAddress.slice(0, 12)}...</span>
                </div>
                <div className={styles.statRow}>
                  <span className={styles.statLabel}>ENERGY TOKEN</span>
                  <span className={styles.statValue}>{result.tokenMint.slice(0, 12)}...</span>
                </div>
                <div className={styles.statRow}>
                  <span className={styles.statLabel}>AUTONOMY</span>
                  <span className={styles.statValue} style={{ color: '#10b981' }}>SOVEREIGN</span>
                </div>
                
                <div className={styles.evolutionBox}>
                  <p className={styles.loreText}>
                    "The Labyrinth senses your presence. It will now begin to evolve based on the world's pulse."
                  </p>
                  
                  <button 
                    className="btn btn-gold btn-sm" 
                    style={{ width: '100%', marginTop: '1rem' }}
                    onClick={handleEvolve}
                    disabled={isEvolving}
                  >
                    {isEvolving ? 'SYNCING MARKET...' : 'SYNCHRONIZE WITH PULSE'}
                  </button>

                  {evolution && (
                    <div className={styles.evoStats}>
                      <div className={styles.statRow}>
                        <span className={styles.statLabel}>SOL PRICE</span>
                        <span className={styles.statValue}>${evolution.currentPrice}</span>
                      </div>
                      <div className={styles.statRow}>
                        <span className={styles.statLabel}>ACTIVE MOOD</span>
                        <span className={styles.statValue} style={{ color: '#fbbf24' }}>{evolution.newMood}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </PixelPanel>
      </div >
    </div>
  );
}

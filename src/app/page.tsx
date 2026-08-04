'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet, useConnection, useAnchorWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { PublicKey } from '@solana/web3.js';
import { OrimBlockchainService, PROGRAM_ID } from '@/lib/blockchain/program-service';
import styles from './home.module.css';
import PixelIcon from '@/components/ui/PixelIcon';
import PixelPanel from '@/components/ui/PixelPanel';
import PixelBackground from '@/components/ui/PixelBackground';
import HeroChibi from '@/components/character/HeroChibi';
import RankingBoard from '@/components/ui/RankingBoard';
import { 
  LOGO_O, LOGO_R, LOGO_I, LOGO_M, 
  ICON_FEAT_QUEST, ICON_FEAT_ARCHITECT, 
  ICON_FEAT_CHIBI, ICON_FEAT_GLORY,
  BG_STARS, BG_CLOUDS, BG_MOUNTAINS,
  UI_PALETTE 
} from '@/lib/maze/uiPixels';

const FEATURES = [
  { matrix: ICON_FEAT_QUEST, title: 'Legendary Quests', desc: 'Conquer 100 floors of progressive mechanical peril.' },
  { matrix: ICON_FEAT_ARCHITECT, title: 'Architect Mode', desc: 'Design, verify, and mint your own dungeons as NFTs.' },
  { matrix: ICON_FEAT_CHIBI, title: 'Heroic Chibi', desc: 'Equip rare artifacts that physically change your appearance.' },
  { matrix: ICON_FEAT_GLORY, title: 'On-Chain Glory', desc: 'Fair randomness powered by MagicBlock VRF and Solana.' },
];

const CORE_TECH = [
  { name: 'METAPLEX CORE', desc: 'The foundational layer for Sovereign Labyrinths. Utilizing the next-gen asset standard for atomic minting and autonomous metadata updates.' },
  { name: 'MAGICBLOCK', desc: 'Powering high-fidelity performance. Ephemeral Rollups enable zero-latency movement, while VRF ensures tamper-proof procedural generation.' },
  { name: 'SOLANA AGENT KIT', desc: 'The cognitive core of the Architect. AI-driven market analysis synchronizes the labyrinth state with real-world price data.' },
];

const ROADMAP = [
  { phase: 'PHASE 1', title: 'GENESIS SUMMONING', desc: 'Core engine deployment, Metaplex Core asset integration, and basic stage architecture.' },
  { phase: 'PHASE 2', title: 'DIVINE EVOLUTION', desc: 'Solana Agent Kit integration for market-driven labyrinth shifts and AI-guided discovery.' },
  { phase: 'PHASE 3', title: 'SOVEREIGN CLASH', desc: 'Community discovery hub, multi-user clear tracking, and expanded item economy.' },
  { phase: 'PHASE 4', title: 'ETERNAL EXPANSION', desc: 'Cross-chain labyrinth portals, autonomous reward distribution, and advanced architect tools.' },
];

export default function HomePage() {
  const { connection } = useConnection();
  const wallet = useAnchorWallet();
  const { connected, publicKey } = useWallet();
  const router = useRouter();
  
  const [mounted, setMounted] = useState(false);
  const [profileExists, setProfileExists] = useState<boolean | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);

  const checkProfile = useCallback(async (pubkey: PublicKey) => {
    try {
      const service = new OrimBlockchainService(connection, wallet!);
      if (PROGRAM_ID.toBase58() === 'Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS') {
        const isInit = localStorage.getItem(`orim_sandbox_init_${pubkey.toBase58()}`);
        setProfileExists(isInit === 'true');
        return;
      }
      const pda = await service.getUserProfilePda(pubkey);
      const acc = await connection.getAccountInfo(pda);
      setProfileExists(acc !== null);
    } catch (e) {
      setProfileExists(false);
    }
  }, [connection, wallet]);

  useEffect(() => {
    setMounted(true);
    if (connected && wallet && publicKey) {
      checkProfile(publicKey);
    }
  }, [connected, wallet, publicKey, checkProfile]);

  const handleInitProfile = async () => {
    if (!wallet) return;
    setIsInitializing(true);
    try {
      const service = new OrimBlockchainService(connection, wallet);
      await service.initializeUserProfile();
      setProfileExists(true);
    } catch (e: any) {
      console.error('Initialization Error:', e);
      alert(`Initialization Failed: ${e.message || 'Check Console'}`);
    } finally {
      setIsInitializing(false);
    }
  };

  if (!mounted) return null;

  const isSandbox = PROGRAM_ID.toBase58() === 'Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS';

  return (
    <div className={styles.page}>
      <PixelBackground 
        layers={[
          { matrix: BG_STARS, palette: UI_PALETTE, scale: 6, opacity: 0.3, speedY: 0.2 },
          { matrix: BG_CLOUDS, palette: UI_PALETTE, scale: 8, opacity: 0.15, speedX: 0.1, speedY: 0 },
          { matrix: BG_MOUNTAINS, palette: UI_PALETTE, scale: 12, opacity: 0.08, speedY: 0 }
        ]} 
      />

      <div className={styles.scanlines} />

      <div className={styles.content}>
        <PixelPanel variant="stone" className={styles.mainBoard}>
          <div className={styles.integratedLogo}>
            <div className={styles.logoRow}>
              {[LOGO_O, LOGO_R, LOGO_I, LOGO_M].map((matrix, i) => (
                <div key={i} className={styles.logoCharWrap} style={{ animationDelay: `${i * 0.15}s` }}>
                  <PixelIcon matrix={matrix} size={100} palette={UI_PALETTE} />
                </div>
              ))}
            </div>
            <p className={styles.logoSub}>The Eternal Maze</p>
          </div>

          <div className={styles.walletInside}>
            {connected ? (
              <div className={styles.connectedArea}>
                <div className={styles.walletHeader}>
                   <div className={styles.onlineDot} style={{ background: isSandbox ? '#fbbf24' : '#10b981' }} />
                   <span className={styles.walletAddr}>
                     {publicKey?.toBase58().slice(0, 4)}...{publicKey?.toBase58().slice(-4)}
                   </span>
                   {isSandbox && <span className={styles.sandboxBadge}>SANDBOX</span>}
                </div>

                <div className={styles.heroDossier}>
                  <div className={styles.heroPreviewWrap}>
                    <HeroChibi size={120} animate={true} />
                    <div className={styles.heroGlow} />
                  </div>
                  <div className={styles.heroStats}>
                    <p className={styles.heroName}>{isSandbox ? 'SANDBOX ADVENTURER' : 'LEGENDARY EXPLORER'}</p>
                    <p className={styles.heroRank}>RANK: ASCENDANT</p>
                  </div>
                </div>

                {profileExists === null ? (
                  <div className={styles.registrationArea}>
                    <div className={styles.loadingSpinner} />
                    <p className={styles.connectHint}>SYNCING WITH ADVENTURE LEDGER...</p>
                  </div>
                ) : profileExists === false ? (
                  <div className={styles.registrationArea}>
                    <p className={styles.connectHint}>
                      {isSandbox ? 'LOCAL CHARACTER NOT INITIALIZED' : 'CHARACTER NOT FOUND ON-CHAIN'}
                    </p>
                    <button className="btn btn-gold btn-lg" onClick={handleInitProfile} disabled={isInitializing}>
                      {isInitializing ? 'INITIALIZING...' : 'INITIALIZE ADVENTURER'}
                    </button>
                  </div>
                ) : (
                  <div className={styles.primaryActions}>
                    <button className="btn btn-primary btn-lg" onClick={() => router.push('/stages')}>
                      START GAME ▶
                    </button>
                    <div className={styles.subActions}>
                      <button className="btn btn-gold btn-sm" onClick={() => router.push('/architect')}>
                        CREATE MAZE MAP
                      </button>
                      <button className="btn btn-gold btn-sm" onClick={() => router.push('/shop')}>
                        ITEM
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className={styles.connectArea}>
                <p className={styles.connectHint}>SYNC WALLET TO TRANSCEND</p>
                <div style={{ marginBottom: '10px' }}>
                  <WalletMultiButton />
                </div>
              </div>
            )}
          </div>

          <div className={styles.featuresInside}>
            {FEATURES.map(({ matrix, title, desc }, i) => (
              <div key={i} className={styles.featureCell}>
                <div className={styles.featureIcon}>
                  <PixelIcon matrix={matrix} size={48} palette={UI_PALETTE} />
                </div>
                <div>
                  <p className={styles.featureTitle}>{title}</p>
                  <p className={styles.featureDesc}>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </PixelPanel>

        {/* ── Core Technologies Section ── */}
        <section className={styles.architectureSection}>
          <h2 className={styles.sectionTitle}>CORE ARCHITECTURE</h2>
          <div className={styles.coreTechGrid}>
            {CORE_TECH.map((tech, i) => (
              <div key={i} className={styles.techCard}>
                <h3 className={styles.techName}>{tech.name}</h3>
                <p className={styles.techDesc}>{tech.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Ranking Board Section ── */}
        <section id="rankingBoard" className={styles.rankingSection} style={{ width: '100%', marginTop: '100px', marginBottom: '80px' }}>
          <RankingBoard />
        </section>

        <p className={styles.footer}>
          Est. 2026 • Code-Art Developed • Solomon Ecosystem
        </p>
      </div>
    </div>
  );
}

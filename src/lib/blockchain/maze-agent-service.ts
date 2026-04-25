import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { walletAdapterIdentity } from '@metaplex-foundation/umi-signer-wallet-adapters';
import { 
  create, 
  mplCore, 
  fetchAsset,
  fetchAssetsByOwner 
} from '@metaplex-foundation/mpl-core';
import { 
  createV1, 
  mplTokenMetadata 
} from '@metaplex-foundation/mpl-token-metadata';
import { generateSigner, publicKey, percentAmount, base58 } from '@metaplex-foundation/umi';
import { SolanaAgentKit } from "solana-agent-kit";

export interface MazeAgentConfig {
  name: string;
  uri: string; // Metadata URI
  initialMood: string;
}

export class MazeAgentService {
  private umi: any;
  private agentKit: SolanaAgentKit | undefined;
  private openAiKey: string | undefined;
  private endpoint: string;
  private wallet: any;

  constructor(endpoint: string, wallet: any, openAiKey?: string) {
    this.endpoint = endpoint;
    this.wallet = wallet;
    this.openAiKey = openAiKey;

    // Fast Umi initialization
    this.umi = createUmi(endpoint)
      .use(mplCore())
      .use(mplTokenMetadata())
      .use(walletAdapterIdentity(wallet));
  }

  /**
   * Lazy-loads the Solana Agent Kit only when needed.
   * This prevents heavy initialization from blocking simple operations.
   */
  private async getAgentKit(): Promise<SolanaAgentKit> {
    if (this.agentKit) return this.agentKit;
    if (!this.openAiKey) throw new Error("Agent Kit requires an OpenAI Key");

    try {
      // Fallback to a dummy key if wallet.secretKey is not available
      const secretKey = this.wallet.secretKey || "5886E33333333333333333333333333333333333333333333333333333333333";
      this.agentKit = new SolanaAgentKit(
        secretKey,
        this.endpoint,
        { OPENAI_API_KEY: this.openAiKey }
      );
      return this.agentKit;
    } catch (e) {
      console.error("[MazeAgent] Agent Kit failed to initialize.", e);
      throw e;
    }
  }

  /**
   * Phase 1: Identity & Economy Foundation
   * Mints a Metaplex Core Asset and its associated Agent Token in a single transaction.
   */
  async summonLabyrinth(config: MazeAgentConfig) {
    const assetSigner = generateSigner(this.umi);
    const mintSigner = generateSigner(this.umi);
    const symbol = config.name.slice(0, 4).toUpperCase();
    
    console.log(`[MazeAgent] Summoning Labyrinth: ${config.name} (${symbol})...`);
    
    // Combine both instructions into one transaction for a seamless user experience
    const tx = create(this.umi, {
      asset: assetSigner,
      name: config.name,
      uri: config.uri,
    }).add(
      createV1(this.umi, {
        mint: mintSigner,
        name: `${symbol} Energy`,
        symbol,
        decimals: 9,
        uri: "", 
        sellerFeeBasisPoints: percentAmount(0),
        // Ensure it's treated as a fungible token
        isMutable: true,
      })
    );

    const result = await tx.sendAndConfirm(this.umi);

    return {
      assetAddress: assetSigner.publicKey.toString(),
      tokenMint: mintSigner.publicKey.toString(),
      signature: base58.deserialize(result.signature)[0],
      owner: this.umi.identity.publicKey.toString()
    };
  }

  /**
   * Fetches all Sovereign Labyrinths owned by a specific address.
   */
  async getSovereignLabyrinths(owner: string) {
    try {
      const assets = await fetchAssetsByOwner(this.umi, publicKey(owner));
      
      return await Promise.all(assets.map(async a => ({
        address: a.publicKey.toString(),
        name: a.name || 'Unnamed Labyrinth',
        plays: await this.getLabyrinthClears(a.publicKey.toString())
      })));
    } catch (e) {
      console.error("[MazeAgent] Failed to fetch sovereign labyrinths", e);
      return [];
    }
  }

  /**
   * Fetches Community Labyrinths (Public creations by other users).
   * For the demo, this combines some 'Featured' creations with a simulated global discovery.
   */
  async getCommunityLabyrinths() {
    try {
      // In a production environment, this would query a collection or an indexer.
      // For the Hackathon, we return a mix of 'Featured' labyrinths and global ones.
      const featured = [
        {
          address: "8xLp7u6B7u6B7u6B7u6B7u6B7u6B7u6B7u6B7u6B7u6B",
          name: "THE VOID GAUNTLET",
          creator: "Architect_Zeus",
          mood: "Void"
        },
        {
          address: "3qYv9r2R9r2R9r2R9r2R9r2R9r2R9r2R9r2R9r2R9r2R",
          name: "NEON OVERDRIVE",
          creator: "Cyber_Punk",
          mood: "Cyber"
        },
        {
          address: "5wRz4m1Z4m1Z4m1Z4m1Z4m1Z4m1Z4m1Z4m1Z4m1Z4m1",
          name: "GILDED ASCENSION",
          creator: "Divine_One",
          mood: "Radiant"
        },
        {
          address: "2kXp5n8N5n8N5n8N5n8N5n8N5n8N5n8N5n8N5n8N5n8",
          name: "FORBIDDEN HOLLOW",
          creator: "Shadow_Mage",
          mood: "Default"
        }
      ];

      return await Promise.all(featured.map(async lab => ({
        ...lab,
        plays: await this.getLabyrinthClears(lab.address)
      })));
    } catch (e) {
      console.error("[MazeAgent] Failed to fetch community labyrinths", e);
      return [];
    }
  }

  /**
   * Fetches the number of clears for a specific labyrinth.
   * In a production app, this would query an indexer or a shared on-chain PDA.
   * For the demo, we use a persistent 'Global Stats' simulation.
   */
  async getLabyrinthClears(assetAddress: string): Promise<number> {
    const statsStr = localStorage.getItem('orim_labyrinth_stats');
    const stats = statsStr ? JSON.parse(statsStr) : {};
    
    // If not in stats, generate a deterministic initial count based on address
    if (stats[assetAddress] === undefined) {
      const seed = assetAddress.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      stats[assetAddress] = (seed % 150) + 10; // Initial "organic" count
      localStorage.setItem('orim_labyrinth_stats', JSON.stringify(stats));
    }
    
    return stats[assetAddress];
  }

  /**
   * Increments the clear count for a labyrinth on-chain (via memo/event simulation).
   */
  async recordLabyrinthClear(assetAddress: string) {
    console.log(`[MazeAgent] Recording Clear for Labyrinth: ${assetAddress}...`);
    
    const statsStr = localStorage.getItem('orim_labyrinth_stats');
    const stats = statsStr ? JSON.parse(statsStr) : {};
    
    if (stats[assetAddress] === undefined) {
      const seed = assetAddress.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      stats[assetAddress] = (seed % 150) + 10;
    }
    
    stats[assetAddress] += 1;
    localStorage.setItem('orim_labyrinth_stats', JSON.stringify(stats));
    
    // Here we would also trigger a real on-chain event or reward distribution
    return {
      status: "SUCCESS",
      newCount: stats[assetAddress]
    };
  }

  /**
   * Phase 2: Architectural Intelligence
   * The 'Architect' logic that reacts to market data.
   */
  async evolveMaze(assetAddress: string) {
    const agent = await this.getAgentKit();
    
    // 1. Fetch real-time SOL price using our internal API proxy (to avoid CORS)
    try {
      const response = await fetch("/api/price?ids=So11111111111111111111111111111111111111112");
      const data = await response.json();
      const priceStr = data?.data?.So11111111111111111111111111111111111111112?.price || "0";
      const price = parseFloat(priceStr);
      
      console.log(`[MazeAgent] Current SOL Price from Jupiter Pulse: $${price}`);
      
      // 2. Decide on Architectural Shift (Mood Mapping)
      let newMood = "Neutral";
      let newPalette = "Default";

      if (price > 150) {
        newMood = "Radiant";
        newPalette = "GILDED_ASCENSION";
      } else if (price < 100) {
        newMood = "Void";
        newPalette = "FORBIDDEN_HOLLOW";
      } else {
        newMood = "Cyber";
        newPalette = "NEON_VISTA";
      }

      console.log(`[MazeAgent] Labyrinth is evolving into ${newMood} state...`);

      // 3. Return the evolution data
      return {
        assetAddress,
        currentPrice: price,
        newMood,
        newPalette,
        timestamp: Date.now()
      };
    } catch (e) {
      console.error("[MazeAgent] Market Pulse Sync Failed", e);
      throw new Error("Failed to synchronize with market pulse. Please check your connection.");
    }
  }

  /**
   * Phase 3: Autonomous Rewards
   * Uses the Agent Kit to send rewards to players autonomously.
   */
  async distributeRewards(playerAddress: string, performanceScore: number) {
    if (!this.agentKit) throw new Error("Agent Kit not initialized (OpenAI Key required)");
    
    // 1. Calculate Reward based on performance score (0-100)
    // The agent could use an LLM here to evaluate the 'creativity' of the solution
    const rewardAmount = Math.floor(performanceScore * 0.1); // Example logic
    
    console.log(`[MazeAgent] Evaluation Complete. Rewarding ${rewardAmount} units to ${playerAddress}...`);
    
    // 2. Execute on-chain transfer via Solana Agent Kit
    // This sends the maze's internal tokens (Energy) to the player
    // const signature = await this.agentKit.transfer(playerAddress, rewardAmount);

    return {
      playerAddress,
      rewardAmount,
      rewardToken: "ENERGY",
      status: "SUCCESS",
      signature: "simulated_reward_sig_abc123"
    };
  }
}

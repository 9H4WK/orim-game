import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { walletAdapterIdentity } from '@metaplex-foundation/umi-signer-wallet-adapters';
import { 
  createNft, 
  mplTokenMetadata 
} from '@metaplex-foundation/mpl-token-metadata';
import { generateSigner, percentAmount } from '@metaplex-foundation/umi';

export class DungeonMintService {
  private umi: any;

  constructor(endpoint: string, wallet: any) {
    this.umi = createUmi(endpoint)
      .use(mplTokenMetadata())
      .use(walletAdapterIdentity(wallet));
  }

  /**
   * Mint a custom Maze as an NFT
   * @param name Name of the dungeon
   * @param uri URI pointing to JSON metadata (maze matrix)
   */
  async mintDungeonNft(name: string, uri: string) {
    const mint = generateSigner(this.umi);
    
    console.log(`Umi: Minting Dungeon NFT '${name}'...`);
    
    const { signature } = await createNft(this.umi, {
      mint,
      name,
      uri,
      sellerFeeBasisPoints: percentAmount(0),
    }).sendAndConfirm(this.umi);

    return {
      mintAddress: mint.publicKey.toString(),
      signature: signature.toString()
    };
  }
}

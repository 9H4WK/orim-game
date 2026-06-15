export interface FlashTradePosition {
  symbol: string;
  type: 'LONG' | 'SHORT';
  entryPrice: number;
  openTime: number;
}

export class FlashTradeService {
  private apiUrl = 'https://flashapi.trade/v2';

  /**
   * Fetches the real-time price of a given asset from Flash Trade API.
   * e.g., symbol = 'SOL'
   */
  async getLivePrice(symbol: string = 'SOL'): Promise<number> {
    try {
      // Real API endpoint as per Flash Trade V2 docs
      const response = await fetch(`${this.apiUrl}/prices/${symbol}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      // Adjust based on actual API response structure. 
      let price = data?.price || parseFloat(data) || 0; 
      
      // Flash/Pyth prices are often scaled by 1e8 (8 decimals)
      if (price > 100000) {
        price = price / 1e8;
      }
      if (price === 0) {
        // Fallback to internal Jupiter price if Flash API is unavailable
        return this.getFallbackPrice();
      }
      return parseFloat(price);
    } catch (error) {
      console.warn(`[FlashTrade] Failed to fetch live price for ${symbol}. Falling back.`, error);
      return this.getFallbackPrice();
    }
  }

  private async getFallbackPrice(): Promise<number> {
    try {
      const response = await fetch("/api/price?ids=So11111111111111111111111111111111111111112");
      const data = await response.json();
      const priceStr = data?.data?.So11111111111111111111111111111111111111112?.price || "0";
      return parseFloat(priceStr);
    } catch (e) {
      return 150.00; // Final fallback
    }
  }

  /**
   * Simulates opening a position using real market data for the Hackathon Demo.
   * Since we cannot easily sign mainnet transactions in a devnet environment without risking real user funds,
   * we use the "paper trading" approach built directly on real Flash Trade data.
   */
  async openPosition(symbol: string, type: 'LONG' | 'SHORT'): Promise<FlashTradePosition> {
    const entryPrice = await this.getLivePrice(symbol);
    return {
      symbol,
      type,
      entryPrice,
      openTime: Date.now()
    };
  }

  /**
   * Calculates the current PnL percentage based on a live price.
   * Returns a percentage value (e.g., 5.2 for +5.2%, -2.1 for -2.1%).
   */
  calculatePnL(position: FlashTradePosition, currentPrice: number): number {
    const { entryPrice, type } = position;
    if (entryPrice <= 0) return 0;

    const diff = currentPrice - entryPrice;
    const pnlPercentage = (diff / entryPrice) * 100;

    // Multiply by standard leverage (e.g., 10x) for more exciting gameplay
    const LEVERAGE = 10; 

    if (type === 'LONG') {
      return pnlPercentage * LEVERAGE;
    } else {
      return -pnlPercentage * LEVERAGE;
    }
  }
}

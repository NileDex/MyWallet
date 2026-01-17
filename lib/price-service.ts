
// Price Service to handle token pricing with fallbacks
// Since we don't have a paid aggressive API, we use CoinGecko free tier + fallback map

const COINGECKO_API = "https://api.coingecko.com/api/v3/simple/price";

interface PriceMap {
    [symbol: string]: number;
}

// Map symbols to CoinGecko IDs
const COINGECKO_IDS: Record<string, string> = {
    'MOVE': 'movement', // Hypothetical
    'USDT': 'tether',
    'USDT.E': 'tether',
    'USDC': 'usd-coin',
    'USDC.E': 'usd-coin',
    'ETH': 'ethereum',
    'WETH': 'weth',
    'BTC': 'bitcoin',
    'WBTC': 'wrapped-bitcoin',
};

export class PriceService {
    private prices: PriceMap = {};
    private lastFetch: number = 0;
    private cacheDuration = 300000; // 5 minutes
    private isFetching: boolean = false;
    private refreshPromise: Promise<void> | null = null;

    constructor() {
        // Start empty, will fetch on first request
        this.prices = {};
    }

    private async refreshPrices(): Promise<void> {
        if (this.refreshPromise) return this.refreshPromise;

        const now = Date.now();
        if (now - this.lastFetch < this.cacheDuration) return;

        this.refreshPromise = (async () => {
            this.isFetching = true;
            try {
                const ids = Object.values(COINGECKO_IDS).join(',');
                const response = await fetch(`${COINGECKO_API}?ids=${ids}&vs_currencies=usd`);

                if (!response.ok) throw new Error(`CoinGecko API error: ${response.status}`);

                const data = await response.json();

                // Update prices map
                Object.entries(COINGECKO_IDS).forEach(([symbol, id]) => {
                    if (data[id] && data[id].usd) {
                        this.prices[symbol] = data[id].usd;
                    }
                });

                this.lastFetch = now;
                console.log('Prices refreshed from CoinGecko:', this.prices);
            } catch (error) {
                console.error('Failed to refresh prices:', error);
                // Fallback to existing or hardcoded prices on error
            } finally {
                this.isFetching = false;
                this.refreshPromise = null;
            }
        })();

        return this.refreshPromise;
    }

    async getPrice(symbol: string): Promise<number> {
        // Normalize symbol
        const cleanSymbol = symbol.toUpperCase();

        // If it's the first time or cache is stale
        if (this.lastFetch === 0) {
            await this.refreshPrices();
        } else if (Date.now() - this.lastFetch > this.cacheDuration) {
            // Background refresh if just stale but we have old data
            this.refreshPrices();
        }

        // Return from cache
        return this.prices[cleanSymbol] || 0;
    }

    async getPrices(symbols: string[]): Promise<PriceMap> {
        // If it's the first time or cache is stale
        if (this.lastFetch === 0) {
            await this.refreshPrices();
        } else if (Date.now() - this.lastFetch > this.cacheDuration) {
            // Background refresh if just stale but we have old data
            this.refreshPrices();
        }

        const result: PriceMap = {};
        symbols.forEach(s => {
            const clean = s.toUpperCase();
            result[clean] = this.prices[clean] || 0;
        });

        return result;
    }

    // Helper to format currency
    formatCurrency(value: number): string {
        return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }

    // Helper to format value
    formatValue(amount: number, price: number): string {
        return this.formatCurrency(amount * price);
    }
}

export const priceService = new PriceService();


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
    private exchangeRates: Record<string, number> = { USD: 1, EUR: 1, GBP: 1 };
    private currentCurrency: string = "USD";

    constructor() {
        // Start empty, will fetch on first request
        this.prices = {};
    }

    setCurrency(currency: string) {
        this.currentCurrency = currency;
    }

    private async refreshPrices(): Promise<void> {
        if (this.refreshPromise) return this.refreshPromise;

        const now = Date.now();
        if (now - this.lastFetch < this.cacheDuration) return;

        this.refreshPromise = (async () => {
            this.isFetching = true;
            try {
                const ids = Object.values(COINGECKO_IDS).join(',');
                // Fetch prices in USD and the exchange rates for multiple currencies
                const [priceResponse, rateResponse] = await Promise.all([
                    fetch(`${COINGECKO_API}?ids=${ids}&vs_currencies=usd`),
                    fetch(`https://api.coingecko.com/api/v3/simple/price?ids=usd-coin&vs_currencies=eur,gbp`)
                ]);

                if (!priceResponse.ok) throw new Error(`CoinGecko API error: ${priceResponse.status}`);

                const priceData = await priceResponse.json();

                // Update prices map
                Object.entries(COINGECKO_IDS).forEach(([symbol, id]) => {
                    if (priceData[id] && priceData[id].usd) {
                        this.prices[symbol] = priceData[id].usd;
                    }
                });

                if (rateResponse.ok) {
                    const rateData = await rateResponse.json();
                    if (rateData['usd-coin']) {
                        if (rateData['usd-coin'].eur) this.exchangeRates.EUR = rateData['usd-coin'].eur;
                        if (rateData['usd-coin'].gbp) this.exchangeRates.GBP = rateData['usd-coin'].gbp;
                    }
                }

                this.lastFetch = now;
                console.log('Prices refreshed. Rates:', this.exchangeRates);
            } catch (error) {
                console.error('Failed to refresh prices:', error);
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

        // Return USD price from cache
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

    // Helper to format currency from a USD base value
    formatCurrency(usdValue: number): string {
        const rate = this.exchangeRates[this.currentCurrency] || 1;
        const amount = usdValue * rate;
        const symbols: Record<string, string> = { USD: "$", EUR: "€", GBP: "£", MOVE: "" };
        const symbol = symbols[this.currentCurrency] || "$";

        return `${symbol}${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }

    // Helper to format a value that is already converted to the current currency
    formatConvertedValue(value: number): string {
        const symbols: Record<string, string> = { USD: "$", EUR: "€", GBP: "£", MOVE: "" };
        const symbol = symbols[this.currentCurrency] || "$";
        return `${symbol}${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }

    // Helper to format value from amount and a USD price
    formatValue(amount: number, usdPrice: number): string {
        const usdValue = amount * usdPrice;
        return this.formatCurrency(usdValue);
    }

    // Synchronous helper to get cached price
    getPriceSync(symbol: string): number {
        return this.prices[symbol.toUpperCase()] || 0;
    }
}

export const priceService = new PriceService();

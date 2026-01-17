// Movement Network - Get All Fungible Assets (TypeScript Implementation)
// Indexer GraphQL Endpoint

// ============================================
// TYPES & INTERFACES
// ============================================

export interface FungibleAssetMetadata {
    token_standard: string;
    name: string;
    symbol: string;
    decimals: number;
    icon_uri: string | null;
    project_uri: string | null;
    asset_type: string;
    supply_aggregator_table_handle_v1: string | null;
    supply_aggregator_table_key_v1: string | null;
}

export interface FungibleAssetBalance {
    asset_type: string;
    amount: string;
    last_transaction_timestamp: string;
    owner_address: string;
    storage_id: string;
    is_frozen: boolean;
    is_primary: boolean;
    token_standard: string;
    metadata: FungibleAssetMetadata | null;
}

export interface GetFungibleAssetsResponse {
    current_fungible_asset_balances: FungibleAssetBalance[];
}

export interface GraphQLResponse<T> {
    data: T;
    errors?: Array<{
        message: string;
        locations?: Array<{ line: number; column: number }>;
        path?: string[];
    }>;
}

export interface FungibleAssetActivity {
    transaction_version: string;
    transaction_timestamp: string;
    amount: string;
    asset_type: string;
    type: string;
    owner_address: string;
    is_transaction_success: boolean;
}

export interface TransactionHistoryResponse {
    fungible_asset_activities: FungibleAssetActivity[];
}

export interface ChartDataPoint {
    timestamp: string;
    date: Date;
    balance: number;
    displayDate: string;
    transactions: number;
}

export interface MoveObject {
    object_address: string;
    owner_address: string;
    last_transaction_version: string;
    display_name?: string;
    description?: string;
}

export interface GetUserObjectsResponse {
    current_objects: MoveObject[];
}

import { GET_FUNGIBLE_ASSETS_DETAILED, GET_MOVE_BALANCE_QUERY, GET_USER_OBJECTS, GET_RESOURCES_BY_ADDRESSES } from "./queries";
import { GET_FUNGIBLE_ASSET_ACTIVITIES } from "@/components/balance-chart";


// ============================================
// MOVEMENT INDEXER CLIENT
// ============================================

class MovementIndexerClient {
    private endpoint: string;

    constructor(endpoint: string = "https://indexer.mainnet.movementnetwork.xyz/v1/graphql") {
        this.endpoint = endpoint;
    }

    /**
     * Execute a GraphQL query against the Movement Indexer via our API proxy
     */
    private async executeQuery<T>(
        query: string,
        variables: Record<string, unknown> = {}
    ): Promise<T> {
        try {
            // Route through our internal proxy to avoid CORS/Network issues
            const response = await fetch("/api/indexer", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    endpoint: this.endpoint,
                    query,
                    variables,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const errorMessage = errorData.errors?.[0]?.message || response.statusText;
                throw new Error(`Indexer Proxy Error: ${errorMessage}`);
            }

            const result: GraphQLResponse<T> = await response.json();

            if (result.errors && result.errors.length > 0) {
                const errorMessages = result.errors
                    .map((err) => err.message)
                    .join(", ");
                throw new Error(`GraphQL errors: ${errorMessages}`);
            }

            return result.data;
        } catch (error: unknown) {
            console.error("[MovementIndexerClient] Request failed:", error);
            throw error;
        }
    }

    /**
     * Get all fungible assets (coins/tokens) for a user address
     */
    async getFungibleAssets(
        userAddress: string
    ): Promise<FungibleAssetBalance[]> {
        const data = await this.executeQuery<GetFungibleAssetsResponse>(
            GET_FUNGIBLE_ASSETS_DETAILED,
            { userAddress: userAddress.toString() }
        );

        return data.current_fungible_asset_balances;
    }

    /**
     * Get fungible assets and format them for display
     */
    async getFungibleAssetsFormatted(userAddress: string) {
        const assets = await this.getFungibleAssets(userAddress);

        return assets.map((asset) => ({
            assetType: asset.asset_type,
            balance: asset.amount,
            balanceFormatted: this.formatBalance(
                asset.amount,
                asset.metadata?.decimals || 0
            ),
            name: asset.metadata?.name || "Unknown Token",
            symbol: asset.metadata?.symbol || "???",
            decimals: asset.metadata?.decimals || 0,
            iconUri: asset.metadata?.icon_uri || null,
            projectUri: asset.metadata?.project_uri || null,
            lastUpdated: new Date(asset.last_transaction_timestamp),
            isFrozen: asset.is_frozen,
            isPrimary: asset.is_primary,
            tokenStandard: asset.token_standard,
        }));
    }

    /**
     * Format balance with decimals
     */
    private formatBalance(amount: string, decimals: number): string {
        const value = BigInt(amount);
        const divisor = BigInt(10 ** decimals);
        const integerPart = value / divisor;
        const fractionalPart = value % divisor;

        if (fractionalPart === BigInt(0)) {
            return integerPart.toString();
        }

        const fractionalStr = fractionalPart
            .toString()
            .padStart(decimals, "0")
            .replace(/0+$/, "");
        return `${integerPart}.${fractionalStr}`;
    }


    /**
     * Get MOVE token balance and metadata specifically using a direct query
     */
    async getMoveBalance(userAddress: string) {
        try {
            // Try direct fetch by asset type first (AptosCoin) 
            const data = await this.executeQuery<GetFungibleAssetsResponse>(
                GET_MOVE_BALANCE_QUERY,
                {
                    userAddress: userAddress.toString(),
                    assetType: "0x1::aptos_coin::AptosCoin"
                }
            );

            const balances = data.current_fungible_asset_balances;

            if (balances.length > 0) {
                const moveToken = balances[0];
                const decimals = moveToken.metadata?.decimals || 8;

                return {
                    assetType: moveToken.asset_type,
                    balance: moveToken.amount,
                    balanceFormatted: this.formatBalance(moveToken.amount, decimals),
                    name: moveToken.metadata?.name || "MOVE",
                    symbol: moveToken.metadata?.symbol || "MOVE",
                    iconUri: moveToken.metadata?.icon_uri || null,
                    lastUpdated: new Date(moveToken.last_transaction_timestamp),
                };
            }

            // Fallback: search all assets for symbol "MOVE"
            const allAssets = await this.getFungibleAssetsFormatted(userAddress);
            return allAssets.find(a =>
                a.symbol.toLowerCase() === "move" ||
                a.name.toLowerCase().includes("move")
            ) || null;

        } catch (error) {
            console.error("Error fetching MOVE balance:", error);
            try {
                const allAssets = await this.getFungibleAssetsFormatted(userAddress);
                return allAssets.find(a =>
                    a.symbol.toLowerCase() === "move" ||
                    a.name.toLowerCase().includes("move")
                ) || null;
            } catch (fallbackError) {
                console.error("Fallback fetch failed:", fallbackError);
                return null;
            }
        }
    }

    /**
     * Get balance history for a user address to be used in a chart
     */
    async getHistoryForChart(address: string, limit: number = 2000): Promise<ChartDataPoint[]> {
        try {
            const data = await this.executeQuery<TransactionHistoryResponse>(
                GET_FUNGIBLE_ASSET_ACTIVITIES,
                { ownerAddress: address, limit, offset: 0 }
            );

            const moveData = await this.getMoveBalance(address);
            if (!moveData) return [];

            const currentBalanceStr = moveData.balance || "0";
            const decimals = 8; // MOVE standard
            const targetAssetType = moveData.assetType;

            const formatToNumber = (amount: string, decs: number) => {
                return Number(BigInt(amount)) / Math.pow(10, decs);
            };

            const currentBalance = formatToNumber(currentBalanceStr, decimals);
            const activities = data.fungible_asset_activities;

            const now = new Date();
            const sixMonthsAgo = new Date();
            sixMonthsAgo.setMonth(now.getMonth() - 6);

            // If there are no activities, fall back to a simple flat line (handled later).
            // Continue to filter and process real MOVE transactions.


            // Filter for MOVE transactions only and sort by timestamp ascending (oldest first)
            const moveActivities = activities
                .filter(activity => {
                    const activityType = activity.asset_type.toLowerCase();
                    const target = targetAssetType ? targetAssetType.toLowerCase() : "";

                    // Match exactly if we have targetAssetType (case-insensitive)
                    if (target && activityType === target) return true;

                    const isMoveAsset =
                        activityType === "0x1::aptos_coin::aptoscoin" ||
                        activityType.includes("aptos_coin") ||
                        activityType.includes("move");
                    return isMoveAsset;
                })
                .sort((a, b) => new Date(a.transaction_timestamp).getTime() - new Date(b.transaction_timestamp).getTime());

            if (moveActivities.length === 0) {
                // ... (existing empty handling)
                return [
                    {
                        timestamp: sixMonthsAgo.toISOString(),
                        date: sixMonthsAgo,
                        balance: currentBalance,
                        displayDate: sixMonthsAgo.toLocaleDateString(),
                        transactions: 0,
                    },
                    {
                        timestamp: now.toISOString(),
                        date: now,
                        balance: currentBalance,
                        displayDate: now.toLocaleDateString(),
                        transactions: 0,
                    }
                ];
            }

            // Calculate the starting balance by working backwards from current balance
            let calculatedStartBalance = currentBalance;

            // Work backwards through all filtered transactions to find starting balance
            for (let i = moveActivities.length - 1; i >= 0; i--) {
                const activity = moveActivities[i];
                const amount = formatToNumber(activity.amount, decimals);
                const typeStr = (activity.type || "").toLowerCase();

                // Explicit keywords for withdrawals
                const isWithdraw = typeStr.includes('withdraw') || typeStr.includes('burn') || typeStr.includes('fee') || typeStr.includes('debit') || typeStr.includes('gas');

                // Explicit keywords for deposits
                const isExplicitDeposit = typeStr.includes('deposit') || typeStr.includes('mint') || typeStr.includes('receive');

                // If it's a gas fee event, it's definitely a withdraw.
                // If it's explicitly a deposit, it's a deposit.
                // Otherwise default to !isWithdraw.
                const isDeposit = isExplicitDeposit || !isWithdraw;

                // Reverse the transaction to get to the earlier balance
                if (isWithdraw) {
                    // If it was a withdraw, we had MORE before.
                    calculatedStartBalance += amount;
                } else if (isDeposit) {
                    // If it was a deposit, we had LESS before.
                    calculatedStartBalance -= amount;
                }
            }

            const points: ChartDataPoint[] = [];
            let runningBalance = Math.max(0, calculatedStartBalance);

            // Add a point at 6 months ago with the starting balance
            points.push({
                timestamp: sixMonthsAgo.toISOString(),
                date: sixMonthsAgo,
                balance: runningBalance,
                displayDate: sixMonthsAgo.toLocaleDateString(),
                transactions: 0,
            });

            // Now process transactions forward in time
            for (let i = 0; i < moveActivities.length; i++) {
                const activity = moveActivities[i];
                const date = new Date(activity.transaction_timestamp);
                const amount = formatToNumber(activity.amount, decimals);
                const typeStr = (activity.type || "").toLowerCase();

                const isWithdraw = typeStr.includes('withdraw') || typeStr.includes('burn') || typeStr.includes('fee') || typeStr.includes('debit') || typeStr.includes('gas');
                const isExplicitDeposit = typeStr.includes('deposit') || typeStr.includes('mint') || typeStr.includes('receive');
                const isDeposit = isExplicitDeposit || !isWithdraw;

                // Add a "jump point" before the transaction to keep the line flat until the change
                const beforeDate = new Date(date.getTime() - 1);
                points.push({
                    timestamp: beforeDate.toISOString(),
                    date: beforeDate,
                    balance: Math.max(0, runningBalance),
                    displayDate: date.toLocaleDateString(),
                    transactions: 0,
                });

                // Update balance based on transaction type
                if (isWithdraw) {
                    runningBalance -= amount;
                } else if (isDeposit) {
                    runningBalance += amount;
                }

                // Add point AFTER transaction
                points.push({
                    timestamp: activity.transaction_timestamp,
                    date,
                    balance: Math.max(0, runningBalance),
                    displayDate: date.toLocaleDateString(),
                    transactions: 1,
                });
            }

            // Add current point
            points.push({
                timestamp: now.toISOString(),
                date: now,
                balance: currentBalance,
                displayDate: now.toLocaleDateString(),
                transactions: 0,
            });

            return points;
        } catch (error) {
            console.error("Error fetching history for chart:", error);
            return [];
        }
    }

    /**
     * Get all objects owned by a user
     */
    async getUserOwnedObjects(userAddress: string): Promise<MoveObject[]> {
        // 1. Fetch all objects owned by the user
        const objectsData = await this.executeQuery<{ current_objects: any[] }>(
            GET_USER_OBJECTS,
            { ownerAddress: userAddress.toString() }
        );

        return objectsData.current_objects || [];
    }

    /**
     * Get the current endpoint
     */
    getEndpoint(): string {
        return this.endpoint;
    }
}

export const CANOPY_CONTRACTS = {
    CORE_VAULTS: "0x6a01d5761d43a5b5a0ccbfc42edf2d02c0611464aae99a2ea0e0d4819f0550b5",
    STAKING: "0x6a01d5761d43a5b5a0ccbfc42edf2d02c0611464aae99a2ea0e0d4819f0550b5"
};

export { MovementIndexerClient };

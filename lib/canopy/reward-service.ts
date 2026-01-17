import { MOVEMENT_NETWORKS } from "@/config/networks";

const RPC_URL = MOVEMENT_NETWORKS.mainnet.rpcEndpoints[0].url;
const CONTRACT_ADDRESS = '0x113a1769acc5ce21b5ece6f9533eef6dd34c758911fa5235124c87ff1298633b';
const EVENT_TYPE = `${CONTRACT_ADDRESS}::multi_rewards::RewardClaimedEvent`;

export interface RewardClaim {
    poolAddress: string;
    rewardToken: string;
    rewardAmount: string;
    rewardAmountParsed: number;
    sequenceNumber: string;
    transactionVersion: string;
    transactionHash: string;
    timestamp: string;
    eventType: string;
    moveAmount?: number;
    date?: string;
}

export interface RewardSummary {
    totalClaims: number;
    totalMoveTokens: number;
    averageClaimAmount: number;
    poolBreakdown: Record<string, { count: number, total: number, totalMove: number }>;
    recentClaims: RewardClaim[];
}

export interface RewardHistory {
    userAddress: string;
    totalRewards: Record<string, number>;
    claimHistory: RewardClaim[];
    summary: RewardSummary;
}

interface AptosTransaction {
    version: string;
    hash: string;
    timestamp: string;
    events?: AptosEvent[];
}

interface AptosEvent {
    type: string;
    data: any;
    sequence_number: string;
}

async function getEventsUsingUserTransactions(userAddress: string): Promise<any[]> {
    console.log(`Fetching user transactions for ${userAddress}...`);

    let allTransactions: AptosTransaction[] = [];
    let start = 0;
    const limit = 100;
    let hasMore = true;

    while (hasMore && start < 2000) { // Limit to 2000 transactions
        try {
            const response = await fetch(`${RPC_URL}/accounts/${userAddress}/transactions?start=${start}&limit=${limit}`);
            const data = await response.json();

            if (data && Array.isArray(data) && data.length > 0) {
                allTransactions = allTransactions.concat(data);
                start += limit;

                if (data.length < limit) {
                    hasMore = false;
                }
            } else {
                hasMore = false;
            }
        } catch (error) {
            console.log(`Error fetching transactions at start ${start}:`, error);
            hasMore = false;
        }
    }

    console.log(`Found ${allTransactions.length} total user transactions`);

    // Filter for reward claim events
    const rewardEvents: any[] = [];

    allTransactions.forEach(tx => {
        if (tx.events) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            tx.events.forEach((event: any) => {
                if (event.type === EVENT_TYPE) {
                    rewardEvents.push({
                        ...event,
                        transaction_version: tx.version,
                        transaction_hash: tx.hash,
                        timestamp: tx.timestamp
                    });
                }
            });
        }
    });

    console.log(`Found ${rewardEvents.length} reward claim events`);
    return rewardEvents;
}

async function processEvents(events: any[], userAddress: string): Promise<{ rewardTotals: Record<string, number>, claimHistory: RewardClaim[] }> {
    const rewardTotals: Record<string, number> = {};
    const claimHistory: RewardClaim[] = [];

    events.forEach(event => {
        try {
            let data = event.data;

            if (typeof data === 'string') {
                try {
                    data = JSON.parse(data);
                } catch (e) {
                    console.warn('Could not parse event data as JSON:', data);
                    return;
                }
            }

            const eventUserAddress = data.user || data.claimer || data.account;

            if (eventUserAddress === userAddress) {
                let rewardToken = data.reward_token || data.token || data.reward_type;
                if (rewardToken && typeof rewardToken === 'object' && rewardToken.inner) {
                    rewardToken = rewardToken.inner;
                }

                const rewardAmountStr = data.reward_amount || data.amount || data.value;
                const rewardAmount = parseInt(rewardAmountStr) || 0;

                if (rewardToken && rewardAmount > 0) {
                    rewardTotals[rewardToken] = (rewardTotals[rewardToken] || 0) + rewardAmount;

                    claimHistory.push({
                        poolAddress: data.pool_address || data.pool || 'unknown',
                        rewardToken: rewardToken,
                        rewardAmount: rewardAmountStr,
                        rewardAmountParsed: rewardAmount,
                        sequenceNumber: event.sequence_number || event.seq || 'unknown',
                        transactionVersion: event.version || event.transaction_version || 'unknown',
                        transactionHash: event.transaction_hash || 'unknown',
                        timestamp: event.timestamp || 'unknown',
                        eventType: event.type || 'unknown'
                    });
                }
            }
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.warn('Error processing event:', errorMessage, event);
        }
    });

    return { rewardTotals, claimHistory };
}

export async function getRewardHistory(userAddress: string): Promise<RewardHistory> {
    try {
        console.log(`Fetching reward history for: ${userAddress}`);

        const events = await getEventsUsingUserTransactions(userAddress);

        if (events.length === 0) {
            return {
                userAddress,
                totalRewards: {},
                claimHistory: [],
                summary: {
                    totalClaims: 0,
                    totalMoveTokens: 0,
                    averageClaimAmount: 0,
                    poolBreakdown: {},
                    recentClaims: []
                }
            };
        }

        const result = await processEvents(events, userAddress);

        const totalAmount = Object.values(result.rewardTotals).reduce((sum, amount) => sum + amount, 0);
        const totalMoveTokens = totalAmount / Math.pow(10, 8);
        const avgAmount = result.claimHistory.length > 0 ? totalAmount / result.claimHistory.length : 0;
        const avgMoveAmount = avgAmount / Math.pow(10, 8);

        const poolBreakdown: Record<string, { count: number, total: number, totalMove: number }> = {};
        result.claimHistory.forEach(claim => {
            if (!poolBreakdown[claim.poolAddress]) {
                poolBreakdown[claim.poolAddress] = { count: 0, total: 0, totalMove: 0 };
            }
            poolBreakdown[claim.poolAddress].count++;
            poolBreakdown[claim.poolAddress].total += claim.rewardAmountParsed;
        });

        Object.keys(poolBreakdown).forEach(pool => {
            poolBreakdown[pool].totalMove = poolBreakdown[pool].total / Math.pow(10, 8);
        });

        const recentClaims = result.claimHistory.slice(-10).reverse().map(claim => ({
            ...claim,
            moveAmount: claim.rewardAmountParsed / Math.pow(10, 8),
            date: new Date(parseInt(claim.timestamp) / 1000).toISOString()
        }));

        console.log('Summary calculated:', {
            claimHistoryLength: result.claimHistory.length,
            totalMoveTokens: totalMoveTokens,
            avgMoveAmount: avgMoveAmount
        });

        return {
            userAddress,
            totalRewards: result.rewardTotals,
            claimHistory: result.claimHistory,
            summary: {
                totalClaims: result.claimHistory.length,
                totalMoveTokens,
                averageClaimAmount: avgMoveAmount,
                poolBreakdown,
                recentClaims
            }
        };

    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`Error getting reward history for ${userAddress}:`, errorMessage);
        throw error;
    }
}

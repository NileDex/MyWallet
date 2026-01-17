"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */

import { useState, useEffect } from "react";
import { Activity, ExternalLink, Loader2 } from "lucide-react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { useNetwork } from "@/context/network-context";
import { MOVEMENT_NETWORKS } from "@/config/networks";
import projectsData from "../data/projects.json";

// ============================================
// TYPES
// ============================================

interface WalletActivity {
    transaction_version: string;
    transaction_timestamp: string;
    amount: string;
    asset_type: string;
    type: string;
    owner_address: string;
    is_transaction_success: boolean;
    is_gas_fee: boolean;
}

interface FormattedActivity {
    version: string;
    timestamp: Date;
    type: 'deposit' | 'withdraw' | 'swap' | 'mint' | 'burn' | 'interaction' | 'other';
    displayType: string;
    eventType: string;
    amount: number;
    amountFormatted: string;
    assetType: string;
    symbol: string;
    iconUri: string | null;
    success: boolean;
    isGasFee: boolean;
    appName: string;
}

// ============================================
// QUERIES
// ============================================

const GET_WALLET_ACTIVITIES = `
query GetWalletActivities($ownerAddress: String!, $limit: Int, $offset: Int) {
  fungible_asset_activities(
    where: {
      owner_address: {_eq: $ownerAddress},
      is_transaction_success: {_eq: true}
    },
    order_by: {transaction_timestamp: desc},
    limit: $limit,
    offset: $offset
  ) {
    transaction_version
    transaction_timestamp
    amount
    asset_type
    type
    owner_address
    is_transaction_success
    is_gas_fee
  }
  user_transactions(
    where: {
      sender: {_eq: $ownerAddress}
    },
    order_by: {version: desc},
    limit: $limit,
    offset: $offset
  ) {
    version
    entry_function_id_str
  }
  current_fungible_asset_balances(
    where: {
      owner_address: {_eq: $ownerAddress}
    }
  ) {
    asset_type
    metadata {
      icon_uri
      name
      symbol
    }
  }
}
`;

// ============================================
// COMPONENT
// ============================================

export function ActivityTable() {
    const { account } = useWallet();
    const { activeRpc } = useNetwork();
    const [activities, setActivities] = useState<FormattedActivity[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [hasError, setHasError] = useState(false);
    const [isMounted, setIsMounted] = useState(false);
    const [explorerUrl, setExplorerUrl] = useState('https://explorer.movementnetwork.xyz');

    const MOVE_DECIMALS = 8;

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const formatBalance = (amount: string, decimals: number = MOVE_DECIMALS): number => {
        return Number(BigInt(amount)) / Math.pow(10, decimals);
    };

    const getAssetSymbol = (assetType: string): string => {
        if (assetType.includes('aptos_coin') || assetType.includes('AptosCoin')) {
            return 'MOVE';
        }

        const parts = assetType.split('::');
        if (parts.length >= 3) {
            const tokenName = parts[parts.length - 1];
            if (tokenName && tokenName !== 'FA' && tokenName.length < 20) {
                return tokenName;
            }
        }

        if (assetType.startsWith('0x') && assetType.length > 40) {
            return 'Token';
        }

        return parts[parts.length - 1] || 'UNKNOWN';
    };

    const categorizeActivity = (type: string, assetType: string): {
        type: 'deposit' | 'withdraw' | 'swap' | 'mint' | 'burn' | 'interaction' | 'other';
        displayType: string;
        appName: string;
    } => {
        const typeStr = type.toLowerCase();
        const fullType = type;

        const parts = fullType.split('::');
        let appName = 'Movement';
        let moduleName = '';

        if (parts.length >= 2) {
            moduleName = parts[parts.length - 2] || '';
            const functionName = parts[parts.length - 1] || '';

            if (moduleName.includes('router') || functionName.includes('swap')) appName = 'Router';
            else if (moduleName.includes('banana')) appName = 'Banana';
            else if (moduleName.includes('pool')) appName = 'Pool';
            else if (moduleName.includes('stake')) appName = 'Staking';
            else if (moduleName.includes('vault')) appName = 'Vault';
            else if (moduleName.includes('farm')) appName = 'Farm';
            else if (moduleName.includes('aptos_account')) appName = 'Transfer';
            else if (moduleName.includes('object')) appName = 'Object';
            else if (moduleName) appName = moduleName.charAt(0).toUpperCase() + moduleName.slice(1).replace(/_/g, ' ');
        }

        if (typeStr.includes('swap')) {
            return { type: 'swap', displayType: 'Swap', appName };
        }
        if (typeStr.includes('transfer') && !typeStr.includes('withdraw')) {
            return { type: 'interaction', displayType: 'Transfer', appName };
        }
        if (typeStr.includes('farm')) {
            return { type: 'interaction', displayType: 'Farm', appName };
        }
        if (typeStr.includes('mint') && !typeStr.includes('withdraw')) {
            return { type: 'mint', displayType: 'Mint', appName };
        }
        if (typeStr.includes('burn')) {
            return { type: 'burn', displayType: 'Burn', appName };
        }
        if (typeStr.includes('stake')) {
            return { type: 'interaction', displayType: 'Stake', appName };
        }
        if (typeStr.includes('unstake')) {
            return { type: 'interaction', displayType: 'Unstake', appName };
        }
        if (typeStr.includes('claim') || typeStr.includes('harvest')) {
            return { type: 'interaction', displayType: 'Claim', appName };
        }
        if (typeStr.includes('deposit') && !typeStr.includes('withdraw')) {
            return { type: 'deposit', displayType: 'Deposit', appName };
        }
        if (typeStr.includes('withdraw') || typeStr.includes('fee') || typeStr.includes('debit') || typeStr.includes('gas')) {
            return { type: 'withdraw', displayType: 'Withdraw', appName };
        }

        const eventName = parts[parts.length - 1] || 'Interaction';
        return {
            type: 'interaction',
            displayType: eventName.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').trim(),
            appName
        };
    };

    useEffect(() => {
        const fetchActivities = async () => {
            if (!account?.address) return;

            setIsLoading(true);
            setHasError(false);

            try {
                const currentNetwork = Object.values(MOVEMENT_NETWORKS).find(net =>
                    net.rpcEndpoints.some(rpc => rpc.url === activeRpc)
                ) || MOVEMENT_NETWORKS.mainnet;

                setExplorerUrl(currentNetwork.explorers[0].url);

                const response = await fetch('/api/indexer', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        endpoint: currentNetwork.indexerUrl,
                        query: GET_WALLET_ACTIVITIES,
                        variables: {
                            ownerAddress: account.address.toString(),
                            limit: 100,
                            offset: 0,
                        },
                    }),
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }

                const result = await response.json();

                if (result.errors) {
                    throw new Error(result.errors[0]?.message || 'GraphQL error');
                }

                const rawActivities = result.data.fungible_asset_activities || [];
                const userTransactions = result.data.user_transactions || [];
                const assetBalances = result.data.current_fungible_asset_balances || [];

                const functionMap = new Map<string, string>();
                userTransactions.forEach((tx: { version: string; entry_function_id_str: string }) => {
                    functionMap.set(tx.version, tx.entry_function_id_str);
                });

                const metadataMap = new Map<string, { icon_uri: string | null; name: string; symbol: string }>();
                assetBalances.forEach((balance: { asset_type: string; metadata: { icon_uri: string | null; name: string; symbol: string } }) => {
                    if (balance.metadata) {
                        metadataMap.set(balance.asset_type, balance.metadata);
                    }
                });

                const formatted: FormattedActivity[] = rawActivities.map((activity: WalletActivity) => {
                    const entryFunction = functionMap.get(activity.transaction_version) || activity.type || 'Unknown';
                    const categorized = categorizeActivity(entryFunction, activity.asset_type);
                    const metadata = metadataMap.get(activity.asset_type);
                    const symbol = metadata?.symbol || getAssetSymbol(activity.asset_type);
                    const iconUri = metadata?.icon_uri || null;

                    return {
                        version: activity.transaction_version,
                        timestamp: new Date(activity.transaction_timestamp),
                        type: categorized.type,
                        displayType: categorized.displayType,
                        eventType: entryFunction?.split('::').pop() || 'Unknown',
                        amount: formatBalance(activity.amount),
                        amountFormatted: formatBalance(activity.amount).toFixed(4),
                        assetType: activity.asset_type,
                        symbol: symbol,
                        iconUri: iconUri,
                        success: activity.is_transaction_success,
                        isGasFee: activity.is_gas_fee,
                        appName: categorized.appName,
                    };
                });

                setActivities(formatted);
            } catch (error) {
                console.error('Error fetching activities:', error);
                setHasError(true);
            } finally {
                setIsLoading(false);
            }
        };

        fetchActivities();
    }, [account?.address, activeRpc]);

    const formatTime = (date: Date): string => {
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    };

    const formatDate = (date: Date): string => {
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    // Group activities by date
    const groupedActivities = activities.reduce((groups, activity) => {
        const dateKey = formatDate(activity.timestamp);
        if (!groups[dateKey]) {
            groups[dateKey] = [];
        }
        groups[dateKey].push(activity);
        return groups;
    }, {} as Record<string, FormattedActivity[]>);

    if (!isMounted) return null;

    return (
        <div className="space-y-6">
            {isLoading && activities.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-white/20 mb-4" />
                    <span className="text-sm text-white/40 font-mono">Loading activities...</span>
                </div>
            ) : hasError ? (
                <div className="flex flex-col items-center justify-center py-20">
                    <Activity className="w-12 h-12 text-white/10 mb-4" />
                    <span className="text-sm text-white/40 font-mono">Failed to load activities</span>
                </div>
            ) : activities.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20">
                    <Activity className="w-12 h-12 text-white/10 mb-4" />
                    <span className="text-sm text-white/40 font-mono">No activities found</span>
                </div>
            ) : (
                Object.entries(groupedActivities).map(([date, dayActivities]) => (
                    <div key={date} className="space-y-3">
                        {/* Date Header */}
                        <div className="flex items-center justify-between px-4 py-2">
                            <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-white/40"></div>
                                <span className="text-xs font-mono text-white/60">{date}</span>
                            </div>
                            <span className="text-xs font-mono text-white/40">
                                {dayActivities.length} {dayActivities.length === 1 ? 'activity' : 'activities'}
                            </span>
                        </div>

                        <div className="overflow-x-auto pb-4 -mx-4 px-4 scrollbar-none">
                            <div className="min-w-[700px]">
                                {/* Header Row */}
                                <div className="grid grid-cols-[80px_140px_1fr_1fr_120px_60px] gap-4 py-2 text-[10px] font-mono text-white/40 uppercase tracking-wider">
                                    <div>Time</div>
                                    <div>App</div>
                                    <div>Received</div>
                                    <div>Sent</div>
                                    <div>Tags</div>
                                    <div className="text-right">Link</div>
                                </div>

                                {/* Activity Rows */}
                                <div className="space-y-0.5">
                                    {dayActivities.map((activity, i) => (
                                        <div
                                            key={`${activity.version}-${i}`}
                                            className="grid grid-cols-[80px_140px_1fr_1fr_120px_60px] gap-4 px-4 py-3 bg-[#1a1b1f]/40 hover:bg-[#1a1b1f]/60 transition-colors border-l-2 border-transparent hover:border-white/10 -mx-4"
                                        >
                                            {/* Time */}
                                            <div className="flex items-center">
                                                <span className="text-xs font-mono text-white/80">
                                                    {formatTime(activity.timestamp)}
                                                </span>
                                            </div>

                                            {/* App */}
                                            <div className="flex items-center gap-2">
                                                {(() => {
                                                    const project = projectsData.find(p =>
                                                        p.name.toLowerCase() === activity.appName.toLowerCase() ||
                                                        activity.appName.toLowerCase().includes(p.name.toLowerCase())
                                                    );
                                                    return project ? (
                                                        <div className="w-6 h-6 rounded border border-white/10 overflow-hidden flex items-center justify-center bg-white/5">
                                                            <img src={project.logo} alt={project.name} className="w-full h-full object-cover" />
                                                        </div>
                                                    ) : (
                                                        <div className="w-6 h-6 rounded bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 flex items-center justify-center">
                                                            <div className="w-2 h-2 rounded-full bg-cyan-400"></div>
                                                        </div>
                                                    );
                                                })()}
                                                <div className="flex flex-col">
                                                    <span className="text-xs text-white font-medium">{activity.appName}</span>
                                                    <span className="text-[10px] text-white/40 font-mono">{activity.displayType}</span>
                                                </div>
                                            </div>

                                            {/* Received */}
                                            <div className="flex items-center gap-2">
                                                {(activity.type === 'deposit' || activity.type === 'mint') && (
                                                    <>
                                                        {activity.iconUri ? (
                                                            <img
                                                                src={activity.iconUri}
                                                                alt={activity.symbol}
                                                                className="w-5 h-5 rounded-full"
                                                                onError={(e) => e.currentTarget.style.display = 'none'}
                                                            />
                                                        ) : (
                                                            <div className="w-5 h-5 rounded-full bg-white/5 flex items-center justify-center">
                                                                <span className="text-[8px] text-white/40 font-mono">
                                                                    {activity.symbol.slice(0, 2)}
                                                                </span>
                                                            </div>
                                                        )}
                                                        <span className="text-xs font-mono text-green-400">
                                                            +{activity.amountFormatted}
                                                        </span>
                                                    </>
                                                )}
                                            </div>

                                            {/* Sent */}
                                            <div className="flex items-center gap-2">
                                                {(activity.type === 'withdraw' || activity.type === 'burn' || activity.type === 'swap') && (
                                                    <>
                                                        {activity.iconUri ? (
                                                            <img
                                                                src={activity.iconUri}
                                                                alt={activity.symbol}
                                                                className="w-5 h-5 rounded-full"
                                                                onError={(e) => e.currentTarget.style.display = 'none'}
                                                            />
                                                        ) : (
                                                            <div className="w-5 h-5 rounded-full bg-white/5 flex items-center justify-center">
                                                                <span className="text-[8px] text-white/40 font-mono">
                                                                    {activity.symbol.slice(0, 2)}
                                                                </span>
                                                            </div>
                                                        )}
                                                        <span className="text-xs font-mono text-red-400">
                                                            -{activity.amountFormatted}
                                                        </span>
                                                    </>
                                                )}
                                            </div>

                                            {/* Tags */}
                                            <div className="flex items-center gap-2">
                                                <span className="px-2 py-0.5 bg-cyan-500/10 border border-cyan-500/20 rounded text-[10px] text-cyan-400 font-mono">
                                                    {activity.symbol}
                                                </span>
                                                {activity.success && (
                                                    <span className="px-2 py-0.5 bg-green-500/10 border border-green-500/20 rounded text-[10px] text-green-400 font-mono">
                                                        Success
                                                    </span>
                                                )}
                                            </div>

                                            {/* Link */}
                                            <div className="flex items-center justify-end">
                                                <a
                                                    href={`${explorerUrl}/txn/${activity.version}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="p-1.5 rounded hover:bg-white/10 transition-colors group"
                                                >
                                                    <ExternalLink className="w-3.5 h-3.5 text-cyan-400/60 group-hover:text-cyan-400" />
                                                </a>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                ))
            )}
        </div>
    );
}

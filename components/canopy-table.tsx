"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */

import { useState, useEffect, useCallback } from "react";
import {
    Zap,
    TrendingUp,
    History,
    ExternalLink,
    AlertTriangle,
    Wallet,
    Loader2
} from "lucide-react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { useNetwork } from "@/context/network-context";
import { MOVEMENT_NETWORKS } from "@/config/networks";
import { MovementIndexerClient, CANOPY_CONTRACTS } from "@/lib/movement-client";
import { Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";
import { getRewardHistory } from "@/lib/canopy/reward-service";
import { priceService } from "@/lib/price-service";

// ============================================
// TYPES
// ============================================

interface CanopyPosition {
    id: string;
    protocol: string;
    type: 'lending' | 'staking' | 'vault' | 'looping';
    asset: string;
    assetSymbol: string;
    amount: string;
    amountFormatted: string;
    value?: number;
    valueFormatted?: string;
    rewards?: string[];
    totalClaimed?: number;
}

// ============================================
// HELPER COMPONENTS
// ============================================

function ProtocolIcon({ protocol }: { protocol: string }) {
    if (protocol.toLowerCase().includes('canopy')) {
        return (
            <div className="w-8 h-8 rounded-full bg-emerald-400/10 flex items-center justify-center border border-emerald-400/20">
                <Zap className="w-4 h-4 text-emerald-400" />
            </div>
        );
    }
    return (
        <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center border border-white/10 text-white/40">
            <Wallet className="w-4 h-4" />
        </div>
    );
}

function PositionRow({ position }: { position: CanopyPosition }) {
    const typeColors = {
        lending: 'text-blue-400 border-blue-400/20 bg-blue-400/5',
        staking: 'text-pink-400 border-pink-400/20 bg-pink-400/5',
        vault: 'text-purple-400 border-purple-400/20 bg-purple-400/5',
        looping: 'text-orange-400 border-orange-400/20 bg-orange-400/5'
    };

    const typeIcons = {
        lending: <TrendingUp className="w-2.5 h-2.5" />,
        staking: <TrendingUp className="w-2.5 h-2.5 rotate-45" />,
        vault: <History className="w-2.5 h-2.5" />,
        looping: <Zap className="w-2.5 h-2.5" />
    };

    return (
        <tr className="hover:bg-white/[0.02] transition-colors group">
            <td className="px-4 py-4">
                <div className="flex items-center gap-3">
                    <ProtocolIcon protocol={position.protocol} />
                    <div className="flex flex-col">
                        <span className="text-xs font-bold text-white uppercase tracking-wider">{position.protocol}</span>
                        <div className={`mt-1 flex items-center gap-1.5 px-1.5 py-0.5 rounded-[2px] border w-fit ${typeColors[position.type]}`}>
                            {typeIcons[position.type]}
                            <span className="text-[9px] font-mono font-bold uppercase tracking-widest">{position.type}</span>
                        </div>
                    </div>
                </div>
            </td>
            <td className="px-4 py-4">
                <div className="flex flex-col">
                    <span className="text-sm font-mono text-white">{position.amountFormatted}</span>
                    <span className="text-[10px] font-mono text-white/40 uppercase">{position.assetSymbol}</span>
                </div>
            </td>
            <td className="px-4 py-4">
                <div className="flex flex-col">
                    <span className="text-sm font-mono text-white">{position.valueFormatted || '--'}</span>
                </div>
            </td>
            <td className="px-4 py-4 text-right">
                <div className="flex flex-col items-end gap-2">
                    {position.totalClaimed !== undefined && position.totalClaimed > 0 && (
                        <div className="flex flex-col items-end">
                            <span className="text-xs font-mono text-emerald-400">
                                {position.totalClaimed.toFixed(4)} MOVE
                            </span>
                            <span className="text-[8px] font-mono text-white/30 uppercase">Total Claimed</span>
                        </div>
                    )}
                    {position.rewards && position.rewards.length > 0 ? (
                        <div className="flex flex-col items-end gap-1">
                            {position.rewards.map((reward, i) => (
                                <div key={i} className="flex items-center gap-1 bg-white/5 border border-white/10 px-1.5 py-0.5 rounded text-[9px] font-mono text-emerald-400">
                                    < Zap className="w-2 h-2" />
                                    {reward}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <span className="text-[10px] font-mono text-white/20 uppercase">No Pending</span>
                    )}
                </div>
            </td>
        </tr>
    );
}

// ============================================
// MAIN COMPONENT
// ============================================

export function CanopyTable() {
    const { account } = useWallet();
    const { activeRpc, refreshKey } = useNetwork();
    const [positions, setPositions] = useState<CanopyPosition[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchPortfolio = useCallback(async () => {
        if (!account?.address) return;

        setIsLoading(true);
        setError(null);

        try {
            const networkConfig = Object.values(MOVEMENT_NETWORKS).find(net =>
                net.rpcEndpoints.some(rpc => rpc.url === activeRpc)
            ) || MOVEMENT_NETWORKS.mainnet;

            const indexerClient = new MovementIndexerClient(networkConfig.indexerUrl);
            const aptosConfig = new AptosConfig({
                network: Network.CUSTOM,
                fullnode: activeRpc,
            });
            const aptosClient = new Aptos(aptosConfig);
            const userAddress = account.address.toString();

            // Parallel fetch: Resources, Objects, AND Reward History
            const [accountResources, userObjects, rewardHistory] = await Promise.all([
                aptosClient.getAccountResources({ accountAddress: userAddress }).catch(() => []),
                indexerClient.getUserOwnedObjects(userAddress).catch(() => []),
                getRewardHistory(userAddress).catch(err => {
                    console.error("Failed to fetch rewards:", err);
                    return null;
                })
            ]);

            const objectResourcesResults = await Promise.all(
                userObjects.map(async (obj) => {
                    try {
                        const resources = await aptosClient.getAccountResources({ accountAddress: obj.object_address });
                        return { object: obj, resources };
                    } catch (e) {
                        return { object: obj, resources: [] };
                    }
                })
            );

            const newPositions: CanopyPosition[] = [];

            const getSymbol = (type: string) => {
                const parts = type.split("::");
                const base = parts[parts.length - 1] || "UNKNOWN";
                if (base.toLowerCase().includes('aptoscoin')) return 'MOVE';
                return base;
            };

            // 1. Process Account Resources
            accountResources.forEach(resource => {
                const data = resource.data as any;

                // Canopy Vault tokens in Account
                if (resource.type.includes(CANOPY_CONTRACTS.CORE_VAULTS) || resource.type.includes('VaultToken')) {
                    const amount = data.value || data.amount || '0';
                    if (amount !== '0') {
                        newPositions.push({
                            id: `vault-${resource.type}`,
                            protocol: 'Canopy Core',
                            type: 'vault',
                            asset: resource.type,
                            assetSymbol: getSymbol(resource.type),
                            amount,
                            amountFormatted: (Number(amount) / 1e8).toFixed(4),
                        });
                    }
                }

                // Staking (MultiRewards / Farming)
                if (resource.type.includes("multi_rewards::UserData") || resource.type.includes("farming::Staker")) {
                    let totalStaked = 0;

                    // Direct amount
                    const directAmount = data.amount || data.active_stake || data.stake || data.balance || data.staked || data.value;
                    if (directAmount) totalStaked += Number(directAmount);

                    // Nested pools
                    if (data.user_pools?.data) {
                        data.user_pools.data.forEach((entry: any) => {
                            const val = entry.value || {};
                            const poolValue = val.stake_amount || val.amount || val.staked || val.balance || val.value ||
                                val.active_stake || val.staked_amount || val.deposited || val.deposit || val.coins || val.stake || 0;
                            totalStaked += Number(poolValue);
                        });
                    }

                    newPositions.push({
                        id: `staking-${resource.type}-${userAddress}`,
                        protocol: 'Canopy Staking',
                        type: 'staking',
                        asset: resource.type,
                        assetSymbol: 'MOVE',
                        amount: totalStaked.toString(),
                        amountFormatted: totalStaked === 0 ? '?.??' : (totalStaked / 1e8).toLocaleString(undefined, { minimumFractionDigits: 4 }),
                        rewards: [],
                        totalClaimed: rewardHistory?.summary.totalMoveTokens
                    });
                }
            });

            // 2. Process Object Resources
            objectResourcesResults.forEach(({ object: obj, resources }) => {
                resources.forEach(resource => {
                    const data = resource.data as any;
                    const type = resource.type;

                    // Layerbank
                    if (type.toLowerCase().includes("layerbank") || type.includes("::lending::UserAccount")) {
                        const amount = data.amount || data.balance || data.coin?.value || data.share || '0';
                        if (amount !== '0') {
                            newPositions.push({
                                id: `lb-${obj.object_address}`,
                                protocol: 'LayerBank',
                                type: 'vault',
                                asset: type,
                                assetSymbol: 'MOVE',
                                amount: amount.toString(),
                                amountFormatted: (Number(amount) / 1e8).toFixed(4),
                                rewards: ['LayerBank Points']
                            });
                        }
                    }

                    // Staking in Objects
                    if (type.includes("::multi_rewards::") || type.includes("::farming::")) {
                        const amount = data.amount || data.staked_amount || data.balance || data.value ||
                            data.active_stake || data.staked || data.deposited || data.deposit || data.coins || '0';

                        if (amount !== '0' || type.includes("farming::Staker")) {
                            newPositions.push({
                                id: `staking-obj-${obj.object_address}`,
                                protocol: 'Canopy Staking',
                                type: 'staking',
                                asset: type,
                                assetSymbol: 'MOVE',
                                amount: amount.toString(),
                                amountFormatted: amount === '0' ? '?.??' : (Number(amount) / 1e8).toLocaleString(undefined, { minimumFractionDigits: 4 }),
                                rewards: [],
                                totalClaimed: rewardHistory?.summary.totalMoveTokens
                            });
                        }
                    }

                    // Canopy Vaults in Objects
                    if (type.includes(CANOPY_CONTRACTS.CORE_VAULTS) || type.includes('VaultToken')) {
                        const amount = data.value || data.amount || '0';
                        if (amount !== '0') {
                            newPositions.push({
                                id: `vault-obj-${obj.object_address}`,
                                protocol: 'Canopy Core',
                                type: 'vault',
                                asset: type,
                                assetSymbol: getSymbol(type),
                                amount: amount.toString(),
                                amountFormatted: (Number(amount) / 1e8).toFixed(4),
                            });
                        }
                    }
                });
            });

            // 3. Group & De-duplicate
            const groupedMap = new Map<string, CanopyPosition>();

            newPositions.forEach(pos => {
                const key = `${pos.protocol}-${pos.type}-${pos.assetSymbol}`;
                const existing = groupedMap.get(key);

                if (existing) {
                    const totalAmount = (Number(existing.amount) || 0) + (Number(pos.amount) || 0);
                    if (totalAmount > 0) {
                        existing.amount = totalAmount.toString();
                        existing.amountFormatted = (totalAmount / 1e8).toLocaleString(undefined, { minimumFractionDigits: 4 });
                    }
                    // Carry over totalClaimed
                    if (pos.totalClaimed) existing.totalClaimed = (existing.totalClaimed || 0) + pos.totalClaimed;
                } else {
                    groupedMap.set(key, { ...pos });
                }
            });

            // 4. Attach Prices & Values
            const finalPositions = await Promise.all(Array.from(groupedMap.values()).map(async (pos) => {
                const price = await priceService.getPrice(pos.assetSymbol);
                const amount = Number(pos.amountFormatted.replace(/,/g, ''));
                const value = isNaN(amount) ? 0 : amount * price;

                return {
                    ...pos,
                    value,
                    valueFormatted: priceService.formatCurrency(value)
                };
            }));

            const filteredPositions = finalPositions.filter(pos => {
                if (pos.amountFormatted === '?.??') {
                    const hasRealData = finalPositions.some(p =>
                        p.protocol === pos.protocol && p.amountFormatted !== '?.??'
                    );
                    return !hasRealData;
                }
                return true;
            });

            setPositions(filteredPositions);

        } catch (err) {
            console.error("Failed to fetch Canopy portfolio:", err);
            setError("Could not retrieve protocol positions.");
        } finally {
            setIsLoading(false);
        }
    }, [account?.address, activeRpc, refreshKey]);

    useEffect(() => {
        fetchPortfolio();
    }, [fetchPortfolio]);

    if (!account?.address) return null;

    if (error) {
        return (
            <div className="border border-red-500/20 bg-red-500/5 p-12 text-center">
                <div className="flex flex-col items-center gap-4">
                    <AlertTriangle className="w-6 h-6 text-red-400" />
                    <div className="space-y-1">
                        <p className="text-sm font-mono text-red-400">{error}</p>
                        <button onClick={fetchPortfolio} className="text-[10px] font-mono text-white/40 uppercase hover:text-white underline underline-offset-4">Try Again</button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="border border-white/5 overflow-x-auto md:overflow-x-visible">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="text-[10px] text-white/40 uppercase tracking-[0.2em] border-b border-white/5 bg-[#1a1b1f]">
                            <tr>
                                <th className="px-4 py-4 font-normal">Protocol / Type</th>
                                <th className="px-4 py-4 font-normal">Position</th>
                                <th className="px-4 py-4 font-normal">Value</th>
                                <th className="px-4 py-4 font-normal text-right">Rewards (Claimed / Pending)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {positions.map((pos) => (
                                <PositionRow key={pos.id} position={pos} />
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            {positions.length === 0 && (
                <div className="p-12 text-center border-t border-white/5 bg-white/[0.01]">
                    <p className="text-[10px] font-mono text-white/20 uppercase tracking-[0.2em]">No multi-protocol positions detected</p>
                </div>
            )}
        </div>
    );
}

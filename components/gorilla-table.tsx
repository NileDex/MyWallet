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

interface CanopyPosition {
    id: string;
    protocol: string;
    type: string;
    asset: string;
    assetSymbol: string;
    amount: string;
    amountFormatted: string;
    value: number;
    valueFormatted: string;
    rewards: any[];
}
// ============================================
// MAIN COMPONENT
// ============================================

export function GorillaTable({ extraAssets = [] }: { extraAssets?: any[] }) {
    const { account } = useWallet();
    const [positions, setPositions] = useState<CanopyPosition[]>([]);

    useEffect(() => {
        if (!account?.address) return;

        const newPositions: CanopyPosition[] = [];

        // Process Extra Assets (Holdings passed from parent - e.g. BANANA)
        extraAssets.forEach(asset => {
            newPositions.push({
                id: `holding-${asset.symbol || 'unknown'}`,
                protocol: 'Gorilla Moverz',
                type: 'holding',
                asset: asset.assetType || asset.symbol || 'Unknown',
                assetSymbol: asset.symbol || '???',
                amount: String(asset.balance || '0').replace(/,/g, ''),
                amountFormatted: asset.balanceFormatted || '0',
                value: asset.value || 0,
                valueFormatted: asset.valueFormatted || '$0.00',
                rewards: []
            });
        });

        setPositions(newPositions);

    }, [account?.address, extraAssets]);

    if (!account?.address) return null;

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
                    <p className="text-[10px] font-mono text-white/20 uppercase tracking-[0.2em]">No Gorilla Moverz assets detected</p>
                </div>
            )}
        </div>
    );
}

function PositionRow({ position }: { position: CanopyPosition }) {
    return (
        <tr className="hover:bg-white/[0.02] transition-colors group">
            <td className="px-4 py-4">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-yellow-400/10 flex items-center justify-center border border-yellow-400/20">
                        <Zap className="w-4 h-4 text-yellow-400" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-xs font-bold text-white uppercase tracking-wider">{position.protocol}</span>
                        <div className="mt-1 flex items-center gap-1.5 px-1.5 py-0.5 rounded-[2px] border w-fit text-emerald-400 border-emerald-400/20 bg-emerald-400/5">
                            <Wallet className="w-2.5 h-2.5" />
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
        </tr>
    );
}

"use client";

import { useState, useEffect } from "react";
import { Info, Activity, ExternalLink, ChevronRight, Copy, Check } from "lucide-react";
import { MovementIndexerClient, StakingInfo } from "@/lib/movement-client";
import { useNetwork } from "@/context/network-context";
import { MOVEMENT_NETWORKS } from "@/config/networks";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { priceService } from "@/lib/price-service";

const VALIDATORS = [
    {
        pool: "0x1ef54ef84e7fb389095f83021755dd71bb51cbfbc8124a4349ec619f9d901f1f",
        operator: "0xe3182576475dba780baac237cf5ddd48ecdd1af46fdb4556213099b712f685c0",
        name: "Movement Validator 1"
    },
    {
        pool: "0x830bfd0cd58b06dc938d409b6f3bc8ee97818ffcf9b32d714c068454afb644c7",
        operator: "0x7f2f6077ad31fbfe3f03b514405b35945eb0ecdfce9ff9d85c30dffdb2e19140",
        name: "Movement Validator 2"
    },
    {
        pool: "0x39f116ee9ef048895bff51a5ce62229d153a6fe855798fa75810fd2b85008b9c",
        operator: "0x58354b7f12cf6162a2702a61d1f5db7b30e3903c146b16616b036364346d9e5b",
        name: "Movement Validator 3"
    },
    {
        pool: "0xccba2d929183a642f64d10d27bae0947c112ed7f5427ca3c64a1f0dd0b4b76ea",
        operator: "0x58354b7f12cf6162a2702a61d1f5db7b30e3903c146b16616b036364346d9e5b",
        name: "Movement Validator 4"
    }
];

interface ValidatorRowProps {
    pool: string;
    operator: string;
    name: string;
    stakingData: StakingInfo | null;
    isLoading: boolean;
}

function ValidatorRow({ pool, operator, name, stakingData, isLoading }: ValidatorRowProps) {
    const [copied, setCopied] = useState(false);

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const formatAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

    return (
        <tr className="group hover:bg-white/[0.02] transition-none border-b border-white/5 last:border-0">
            <td className="px-3 py-4">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 border border-white/5 flex items-center justify-center bg-white/5">
                        <Activity className="w-4 h-4 text-white/40" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-sm font-mono font-bold text-white">{name}</span>
                        <div className="flex items-center gap-1 opacity-40 hover:opacity-100 transition-opacity">
                            <span className="text-[10px] font-mono">{formatAddress(pool)}</span>
                            <button onClick={() => handleCopy(pool)} className="p-0.5">
                                {copied ? <Check className="w-2.5 h-2.5 text-green-500" /> : <Copy className="w-2.5 h-2.5" />}
                            </button>
                        </div>
                    </div>
                </div>
            </td>
            <td className="px-3 py-4">
                <div className="flex flex-col">
                    <span className="text-xs font-mono text-white/60">Operator</span>
                    <span className="text-[10px] font-mono text-white/40">{formatAddress(operator)}</span>
                </div>
            </td>
            <td className="px-3 py-4">
                {isLoading ? (
                    <div className="h-4 w-16 bg-white/5 animate-pulse" />
                ) : (
                    <div className="flex items-center gap-1.5">
                        <div className={`w-1.5 h-1.5 rounded-full ${stakingData ? 'bg-green-500' : 'bg-white/20'}`} />
                        <span className="text-xs font-mono text-white">{stakingData?.status || "Active"}</span>
                    </div>
                )}
            </td>
            <td className="px-3 py-4 text-right">
                <div className="flex flex-col items-end">
                    <span className="text-sm font-mono text-white">
                        {isLoading ? "..." : (stakingData ? `${stakingData.stakedAmountFormatted} MOVE` : "0.00 MOVE")}
                    </span>
                    <span className="text-[10px] font-mono text-white/40">
                        Stake
                    </span>
                </div>
            </td>
            <td className="px-3 py-4 text-right">
                <div className="flex flex-col items-end">
                    <span className="text-sm font-mono text-emerald-400">
                        {isLoading ? "..." : (stakingData ? `${stakingData.rewardsPendingFormatted} MOVE` : "0.00 MOVE")}
                    </span>
                    <span className="text-[10px] font-mono text-white/40">
                        Rewards
                    </span>
                </div>
            </td>
            <td className="px-3 py-4 text-right">
                <a
                    href={`https://explorer.movementnetwork.xyz/address/${pool}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 hover:bg-white/10 rounded transition-colors inline-block"
                >
                    <ExternalLink className="w-3.5 h-3.5 text-white/40" />
                </a>
            </td>
        </tr>
    );
}

export function ValidatorTable({ address }: { address: string }) {
    const { activeRpc } = useNetwork();
    const [stakingInfo, setStakingInfo] = useState<Record<string, StakingInfo | null>>({});
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const controller = new AbortController();

        const fetchStakingData = async () => {
            if (!address) return;
            setIsLoading(true);

            const currentNetwork = Object.values(MOVEMENT_NETWORKS).find(net =>
                net.rpcEndpoints.some(rpc => rpc.url === activeRpc)
            ) || MOVEMENT_NETWORKS.mainnet;

            const client = new MovementIndexerClient(currentNetwork.indexerUrl, activeRpc);

            const data: Record<string, StakingInfo | null> = {};

            try {
                const timeoutId = setTimeout(() => controller.abort(), 30000);

                await Promise.all(VALIDATORS.map(async (v) => {
                    const info = await client.getStakingData(address, v.pool, controller.signal);
                    data[v.pool] = info;
                }));

                clearTimeout(timeoutId);

                if (!controller.signal.aborted) {
                    setStakingInfo(data);
                }
            } catch (error: any) {
                if (error.name !== 'AbortError') {
                    console.error("Failed to fetch validator staking data:", error);
                }
            } finally {
                if (!controller.signal.aborted) {
                    setIsLoading(false);
                }
            }
        };

        fetchStakingData();

        return () => {
            controller.abort();
        };
    }, [address, activeRpc]);

    return (
        <div className="border border-white/5 overflow-x-auto md:overflow-x-visible">
            <table className="w-full text-left font-mono">
                <thead className="text-[10px] text-white/40 uppercase tracking-[0.2em] border-b border-white/5 bg-[#1a1b1f]">
                    <tr>
                        <th className="px-3 py-4 font-normal text-left">Validator</th>
                        <th className="px-3 py-4 font-normal text-left">Operator</th>
                        <th className="px-3 py-4 font-normal text-left">Status</th>
                        <th className="px-3 py-4 font-normal text-right">My Stake</th>
                        <th className="px-3 py-4 font-normal text-right">Rewards</th>
                        <th className="px-3 py-4 font-normal text-right"></th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                    {VALIDATORS.map((v) => (
                        <ValidatorRow
                            key={v.pool}
                            pool={v.pool}
                            operator={v.operator}
                            name={v.name}
                            stakingData={stakingInfo[v.pool] || null}
                            isLoading={isLoading}
                        />
                    ))}
                </tbody>
            </table>

            <div className="p-4 bg-white/[0.02] border-t border-white/5">
                <div className="flex items-center gap-2">
                    <Info className="w-3.5 h-3.5 text-white/40" />
                    <p className="text-[10px] font-mono text-white/40 uppercase tracking-wider">
                        Real-time staking rewards from Movement Delegation Pools
                    </p>
                </div>
            </div>
        </div>
    );
}

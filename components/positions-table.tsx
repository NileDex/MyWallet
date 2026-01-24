"use client";
// Force recompile

import { useState, useEffect } from "react";
import { PieChart, Activity, Info, ChevronRight, Loader2, AlertTriangle, ExternalLink, Zap } from "lucide-react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { MovementIndexerClient } from "@/lib/movement-client";
import { useNetwork } from "@/context/network-context";
import { MOVEMENT_NETWORKS } from "@/config/networks";
import { GorillaTable } from "./gorilla-table";
import projectsData from "../data/projects.json";

import { priceService } from "@/lib/price-service";
import { useCurrency } from "@/context/currency-context";


interface AssetData {
    name: string;
    symbol: string;
    balance: string;
    balanceFormatted: string;
    iconUri: string | null;
    price?: number;
    value?: number;
    valueFormatted?: string;
    delta?: string;
}

interface AssetRowProps {
    name: string;
    symbol: string;
    balance: string;
    price: string;
    delta: string;
    value: string;
    iconUri?: string | null;
    hasBadge?: boolean;
    yieldBadge?: string;
    isScam?: boolean;
}

function AssetRow({ name, symbol, balance, price, delta, value, iconUri, hasBadge, yieldBadge, isScam, style }: AssetRowProps & { style?: React.CSSProperties }) {
    const isNegative = delta.startsWith('-');
    return (
        <tr className="group hover:bg-white/[0.02] transition-none" style={style}>
            <td className="px-3 py-4">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 border border-white/5 flex items-center justify-center text-[10px] font-mono text-white/40 overflow-hidden">
                        {(iconUri || (symbol === 'MOVE' && "https://explorer.movementnetwork.xyz/logo.png")) ? (
                            <img src={iconUri || "https://explorer.movementnetwork.xyz/logo.png"} alt={symbol} className="w-full h-full object-cover" />
                        ) : (
                            symbol
                        )}
                    </div>
                    <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                            <span className="text-sm font-mono font-bold text-white">{name}</span>
                            {isScam && (
                                <div className="flex items-center gap-1 bg-red-500/10 border border-red-500/20 rounded px-1.5 py-0.5">
                                    <AlertTriangle className="w-3 h-3 text-red-500" />
                                    <span className="text-[9px] font-bold text-red-400 uppercase tracking-wide">Scam</span>
                                </div>
                            )}
                            {hasBadge && (
                                <div className="w-3 h-3 rounded-full border border-white/20 flex items-center justify-center">
                                    <div className="w-1 h-1 bg-white rounded-full" />
                                </div>
                            )}
                            {yieldBadge && (
                                <span className="text-[9px] font-mono bg-white/10 text-white px-1.5 py-0.5 border border-white/10">
                                    {yieldBadge}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </td>
            <td className="px-3 py-4 font-mono text-sm text-white">{balance}</td>
            <td className="px-3 py-4 text-right">
                <div className="flex flex-col items-end">
                    <span className="text-sm font-mono text-white">
                        {price}
                    </span>

                    <span className={`text-[10px] font-mono ${isNegative ? 'text-white opacity-40' : 'text-white opacity-40'}`}>
                        {delta}
                    </span>
                </div>
            </td>
            <td className="px-3 py-4 text-right">
                <div className="flex flex-col items-end gap-1.5">
                    <span className="text-sm font-mono text-white">{value}</span>
                </div>
            </td>
        </tr>
    );
}

export function PositionsTable({ address }: { address?: string }) {
    const { account } = useWallet();
    const { activeRpc } = useNetwork();
    const { currency } = useCurrency();
    const [isHoldingsExpanded, setIsHoldingsExpanded] = useState(true);
    const [isWalletExpanded, setIsWalletExpanded] = useState(true);
    const [assets, setAssets] = useState<AssetData[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [hasError, setHasError] = useState(false);
    const [isMounted, setIsMounted] = useState(false);
    const [totalValue, setTotalValue] = useState("$0.00");


    useEffect(() => {
        setIsMounted(true);
    }, []);

    useEffect(() => {
        const fetchAssets = async () => {
            const targetAddress = address || account?.address?.toString();
            if (!targetAddress) return;

            setIsLoading(true);
            setHasError(false);
            try {
                // Find current network config from activeRpc
                const currentNetwork = Object.values(MOVEMENT_NETWORKS).find(net =>
                    net.rpcEndpoints.some(rpc => rpc.url === activeRpc)
                ) || MOVEMENT_NETWORKS.mainnet;

                const client = new MovementIndexerClient(currentNetwork.indexerUrl);
                // Add timeout to prevent hanging (increased to 30s)
                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Indexer Request Timeout: Asset fetch took longer than 30 seconds')), 30000)
                );

                const fetchedAssets = await Promise.race([
                    client.getFungibleAssetsFormatted(targetAddress),
                    timeoutPromise
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                ]) as any[];

                // Fetch prices
                const assetWithPrices = await Promise.all(fetchedAssets.map(async (a) => {
                    const price = await priceService.getPrice(a.symbol);
                    const amount = Number(a.balanceFormatted.replace(/,/g, ''));
                    const value = amount * price;

                    return {
                        name: a.name,
                        symbol: a.symbol,
                        balance: a.balance,
                        balanceFormatted: a.balanceFormatted,
                        iconUri: a.iconUri,
                        price,
                        value,
                        valueFormatted: `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                        delta: "+0.00%" // Mock delta for now
                    };
                }));

                // Calculate total value
                const total = assetWithPrices.reduce((acc, curr) => acc + (curr.value || 0), 0);
                setTotalValue(priceService.formatCurrency(total));


                setAssets(assetWithPrices);
            } catch (error: any) {
                console.error(`[PositionsTable] Failed to fetch assets: ${error.message || error}`);
                setHasError(true);
            } finally {
                setIsLoading(false);
            }
        };

        fetchAssets();
    }, [address, account?.address, activeRpc]);

    // Split assets
    const positionTokens = assets.filter(a => a.name === 'Position ID Token' || a.name.includes('Position ID'));
    const gorillaTokens = assets.filter(a => a.symbol === 'BANANA' || a.name.toLowerCase().includes('gorilla') || a.name.toLowerCase().includes('banana'));
    const otherTokens = assets.filter(a => !positionTokens.includes(a) && !gorillaTokens.includes(a));

    if (!isMounted) return null;

    return (
        <div className="space-y-4">
            {/* Holdings Group */}
            <div className="space-y-0.5">
                <div
                    onClick={() => setIsHoldingsExpanded(!isHoldingsExpanded)}
                    className="bg-[#1a1b1f] border border-white/5 p-3 flex items-center justify-between cursor-pointer hover:bg-white/[0.03] transition-none"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-5 h-5 bg-white/10 rounded-sm flex items-center justify-center">
                            <Info className="w-3 h-3 text-white/40" />
                        </div>
                        <span className="text-sm font-mono font-bold text-white">Holdings</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="text-sm font-mono text-white font-bold">{totalValue}</span>
                        <ChevronRight className={`w-4 h-4 text-white transition-transform duration-200 ${isHoldingsExpanded ? 'rotate-[270deg]' : 'rotate-90'}`} />
                    </div>
                </div>

                {isHoldingsExpanded && (
                    <div className="space-y-0.5">
                        {/* Wallet Subgroup */}
                        <div
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsWalletExpanded(!isWalletExpanded);
                            }}
                            className="bg-[#242424] border border-white/5 p-3 flex items-center justify-between cursor-pointer hover:bg-white/[0.03] transition-none"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-5 h-5 bg-white/10 rounded-sm flex items-center justify-center">
                                    <PieChart className="w-3 h-3 text-white/40" />
                                </div>
                                <span className="text-sm font-mono text-white">Wallet</span>
                            </div>
                            <div className="flex items-center gap-4">
                                <span className="text-sm font-mono text-white">{totalValue}</span>
                                <ChevronRight className={`w-4 h-4 text-white transition-transform duration-200 ${isWalletExpanded ? 'rotate-[270deg]' : 'rotate-90'}`} />
                            </div>
                        </div>

                        {isWalletExpanded && (
                            /* Assets Table */
                            <div className="border border-white/5 overflow-x-auto md:overflow-x-visible">
                                <table className="w-full text-left font-mono">
                                    <thead className="text-[10px] text-white/40 uppercase tracking-[0.2em] border-b border-white/5 bg-[#1a1b1f]">
                                        <tr>
                                            <th className="px-3 py-4 font-normal text-left">Asset</th>
                                            <th className="px-3 py-4 font-normal text-left">Balance</th>
                                            <th className="px-3 py-4 font-normal text-right">Price/24hΔ</th>
                                            <th className="px-3 py-4 font-normal text-right">Value</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {otherTokens.length > 0 ? (
                                            otherTokens.map((asset, i) => (
                                                <AssetRow
                                                    key={`${asset.symbol}-${i}`}
                                                    name={asset.name}
                                                    symbol={asset.symbol}
                                                    balance={asset.balanceFormatted}
                                                    price={priceService.formatCurrency(asset.price || 0)}
                                                    delta={asset.delta || "+0.00%"}
                                                    value={priceService.formatValue(Number(asset.balanceFormatted.replace(/,/g, '')), asset.price || 0)}
                                                    iconUri={asset.iconUri}
                                                    hasBadge={asset.symbol === 'MOVE'}
                                                    isScam={asset.name.toLowerCase().includes('movedrops') || asset.name.toLowerCase().includes('drops')}
                                                />

                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={4} className="px-3 py-12 text-center">
                                                    <span className="text-[10px] font-mono text-white/20 uppercase tracking-widest">No assets found</span>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Positions Section (Sibling to Holdings) */}
            {positionTokens.length > 0 && (
                <PositionsSection
                    tokens={positionTokens}
                    project={projectsData.find(p => p.id === 'brkt')}
                />
            )}

            {/* Gorilla Moverz Section */}
            <GorillaMoverzSection tokens={gorillaTokens} />
        </div>
    );
}

function GorillaMoverzSection({ tokens }: { tokens: AssetData[] }) {
    const [isProjectExpanded, setIsProjectExpanded] = useState(true);
    const [isTableExpanded, setIsTableExpanded] = useState(true);
    const gorillaProject = projectsData.find(p => p.id === 'canopy');

    return (
        <div className="space-y-0.5">
            {/* Top Level Project Header (Gorilla Moverz) */}
            <div
                onClick={() => setIsProjectExpanded(!isProjectExpanded)}
                className="bg-[#1a1b1f] border border-white/5 p-3 flex items-center justify-between cursor-pointer hover:bg-white/[0.03] transition-none"
            >
                <div className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full overflow-hidden flex items-center justify-center bg-black/20">
                        <img src={gorillaProject?.logo} alt="Gorilla Moverz" className="w-full h-full object-cover" />
                    </div>
                    <span className="text-sm font-mono font-bold text-white uppercase tracking-wider">Gorilla Moverz</span>
                </div>
                <div className="flex items-center gap-4">
                    <ChevronRight className={`w-4 h-4 text-white transition-transform duration-200 ${isProjectExpanded ? 'rotate-[270deg]' : 'rotate-90'}`} />
                </div>
            </div>

            {isProjectExpanded && (
                <div className="space-y-0.5">
                    {/* Secondary Dropdown (Protocol) */}
                    <div
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsTableExpanded(!isTableExpanded);
                        }}
                        className="bg-[#242424] border border-white/5 p-3 flex items-center justify-between cursor-pointer hover:bg-white/[0.03] transition-none"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-5 h-5 bg-white/10 rounded-sm flex items-center justify-center">
                                <Activity className="w-3 h-3 text-white/40" />
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-mono text-white">Protocol</span>
                                {gorillaProject && (
                                    <div className="flex items-center gap-1">
                                        <a
                                            href={gorillaProject.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={(e) => e.stopPropagation()}
                                            className="p-0.5 hover:bg-white/10 rounded-sm transition-colors group/link"
                                            title="Launch App"
                                        >
                                            <ExternalLink className="w-3 h-3 text-white/40 group-hover/link:text-white" />
                                        </a>
                                        <a
                                            href="https://farm.gorilla-moverz.xyz/farm"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={(e) => e.stopPropagation()}
                                            className="px-1.5 py-0.5 bg-yellow-400/10 hover:bg-yellow-400/20 border border-yellow-400/20 rounded-sm transition-colors group/mine flex items-center gap-1"
                                            title="Mine for Yield"
                                        >
                                            <Zap className="w-2.5 h-2.5 text-yellow-400" />
                                            <span className="text-[9px] font-mono font-bold text-yellow-400 uppercase">Mine</span>
                                        </a>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="text-sm font-mono text-white">--</span>
                            <ChevronRight className={`w-4 h-4 text-white transition-transform duration-200 ${isTableExpanded ? 'rotate-[270deg]' : 'rotate-90'}`} />
                        </div>
                    </div>

                    {isTableExpanded && (
                        <div className="pt-0.5">
                            <GorillaTable extraAssets={tokens} />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function PositionsSection({ tokens, project }: {
    tokens: AssetData[],
    project?: { name: string, description: string, logo: string, url: string }
}) {
    const [isProjectExpanded, setIsProjectExpanded] = useState(true);
    const [isTokensExpanded, setIsTokensExpanded] = useState(true);

    return (
        <div className="space-y-0.5">
            {/* Top Level Project Header (BRKT) */}
            <div
                onClick={() => setIsProjectExpanded(!isProjectExpanded)}
                className="bg-[#1a1b1f] border border-white/5 p-3 flex items-center justify-between cursor-pointer hover:bg-white/[0.03] transition-none"
            >
                <div className="flex items-center gap-3">
                    {project ? (
                        <div className="w-5 h-5 rounded-full overflow-hidden flex items-center justify-center bg-black/20">
                            <img src={project.logo} alt={project.name} className="w-full h-full object-cover" />
                        </div>
                    ) : (
                        <div className="w-5 h-5 bg-white/10 rounded-sm flex items-center justify-center">
                            <Activity className="w-3 h-3 text-white/40" />
                        </div>
                    )}
                    <span className="text-sm font-mono font-bold text-white">{project ? project.name : `Positions (${tokens.length})`}</span>
                </div>
                <div className="flex items-center gap-4">
                    <ChevronRight className={`w-4 h-4 text-white transition-transform duration-200 ${isProjectExpanded ? 'rotate-[270deg]' : 'rotate-90'}`} />
                </div>
            </div>

            {isProjectExpanded && (
                <div className="space-y-0.5">
                    {/* Secondary Dropdown (Prediction Market) */}
                    <div
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsTokensExpanded(!isTokensExpanded);
                        }}
                        className="bg-[#242424] border border-white/5 p-3 flex items-center justify-between cursor-pointer hover:bg-white/[0.03] transition-none"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-5 h-5 bg-white/10 rounded-sm flex items-center justify-center">
                                <Activity className="w-3 h-3 text-white/40" />
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-mono text-white">{project ? project.description : 'Assets'}</span>
                                {project && (
                                    <a
                                        href={project.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        className="p-0.5 hover:bg-white/10 rounded-sm transition-colors group/link"
                                        title="Launch App"
                                    >
                                        <ExternalLink className="w-3 h-3 text-white/40 group-hover/link:text-white" />
                                    </a>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="text-sm font-mono text-white">--</span>
                            <ChevronRight className={`w-4 h-4 text-white transition-transform duration-200 ${isTokensExpanded ? 'rotate-[270deg]' : 'rotate-90'}`} />
                        </div>
                    </div>

                    {isTokensExpanded && (
                        <div className="border border-white/5 overflow-x-auto md:overflow-x-visible">
                            <table className="w-full text-left font-mono">
                                <thead className="text-[10px] text-white/40 uppercase tracking-[0.2em] border-b border-white/5 bg-[#1a1b1f]">
                                    <tr>
                                        <th className="px-3 py-4 font-normal text-left">Asset</th>
                                        <th className="px-3 py-4 font-normal text-left">Balance</th>
                                        <th className="px-3 py-4 font-normal text-right">Price/24hΔ</th>
                                        <th className="px-3 py-4 font-normal text-right">Value</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {tokens.map((asset, i) => (
                                        <AssetRow
                                            key={`pos-${i}`}
                                            name={asset.name}
                                            symbol={asset.symbol}
                                            balance={asset.balanceFormatted}
                                            price={`$${(asset.price || 0).toFixed(2)}`}
                                            delta={asset.delta || "+0.00%"}
                                            value={asset.valueFormatted || "$0.00"}
                                            iconUri={asset.iconUri}
                                            style={{ backgroundColor: 'rgba(255,255,255,0.01)' }}
                                        />
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

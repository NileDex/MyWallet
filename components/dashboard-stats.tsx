"use client";

import { useState, useEffect } from "react";
import { PieChart, Activity, Info, ChevronRight } from "lucide-react";
import { PositionsTable } from "./positions-table";
import { ActivityTable } from "./activity-table";
import { AddressBook } from "./address-book";
import { useWallet } from "@aptos-labs/wallet-adapter-react";

import { useNetwork } from "@/context/network-context";
import { MOVEMENT_NETWORKS } from "@/config/networks";
import { MovementIndexerClient, ChartDataPoint } from "@/lib/movement-client";

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { priceService } from "@/lib/price-service";
import { useCurrency } from "@/context/currency-context";
import { ValidatorTable } from "./validator-table";

const STAKING_POOLS = [
    "0x1ef54ef84e7fb389095f83021755dd71bb51cbfbc8124a4349ec619f9d901f1f",
    "0x830bfd0cd58b06dc938d409b6f3bc8ee97818ffcf9b32d714c068454afb644c7",
    "0x39f116ee9ef048895bff51a5ce62229d153a6fe855798fa75810fd2b85008b9c",
    "0xccba2d929183a642f64d10d27bae0947c112ed7f5427ca3c64a1f0dd0b4b76ea"
];


interface DashboardAsset {
    name: string;
    symbol: string;
    iconUri: string | null;
    balanceFormatted: string;
    percentage?: number;
    color?: string;
    isOthers?: boolean;
    weight?: number;
}

function BreakdownDetailModal({
    isOpen,
    onOpenChange,
    title,
    items,
    color
}: {
    isOpen: boolean,
    onOpenChange: (open: boolean) => void,
    title: string,
    items: DashboardAsset[],
    color: string
}) {
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="bg-[#0c0c0e] border-white/10 text-white sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="text-sm font-mono uppercase tracking-widest flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                        {title}
                    </DialogTitle>
                </DialogHeader>
                <div className="max-h-[60vh] overflow-y-auto pr-2 space-y-2 custom-scrollbar">
                    {items.map((item, i) => (
                        <div key={i} className="flex items-center justify-between p-2 rounded hover:bg-white/5 transition-colors border border-transparent hover:border-white/5">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-white/5 flex items-center justify-center overflow-hidden border border-white/10 relative">
                                    {item.iconUri ? (
                                        <img src={item.iconUri} alt={item.symbol} className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-xs font-mono text-white/40">{item.symbol[0]}</span>
                                    )}
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-xs font-bold text-white">{item.name}</span>
                                    <span className="text-[10px] font-mono text-muted-foreground">{item.symbol}</span>
                                </div>
                            </div>
                            <div className="flex flex-col items-end">
                                <span className="text-xs font-mono text-white">{item.balanceFormatted}</span>
                                <span className="text-[10px] font-mono text-muted-foreground opacity-60">
                                    {(item.percentage || 0).toFixed(2)}%
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </DialogContent>
        </Dialog>
    );
}

function TokenItem({ name, percentage, symbol, color, iconUri, isOthers = false, onClick }: {
    name: string,
    percentage: string,
    symbol: string,
    color: string,
    iconUri?: string | null,
    isLast?: boolean,
    isOthers?: boolean,
    onClick?: () => void
}) {
    return (
        <div
            onClick={onClick}
            className={`flex items-center gap-2 group ${onClick ? 'cursor-pointer hover:opacity-80 transition-opacity' : 'cursor-default'}`}
        >
            <div className={`w-6 h-6 border border-white/10 flex items-center justify-center overflow-hidden relative ${isOthers ? 'rounded-full bg-white/5' : 'bg-transparent'}`}>
                {iconUri ? (
                    <img src={iconUri} alt={symbol} className="w-full h-full object-cover" />
                ) : (
                    <span className="text-[10px] font-mono text-white/40">{symbol[0]}</span>
                )}
            </div>
            <div className="flex flex-col">
                <div className="flex items-center gap-1">
                    <span className="text-[10px] font-mono text-white whitespace-nowrap">{name}</span>
                    {isOthers && <ChevronRight className="w-2.5 h-2.5 text-muted-foreground" />}
                </div>
                <span className={`text-[10px] font-mono border-b border-dotted border-current inline-block pb-0.5 w-fit leading-none`} style={{ color: color, borderColor: `${color}66` }}>
                    {percentage}
                </span>
            </div>
        </div>
    );
}

function MultiColorProgressBar({ items }: { items: { percentage: number, color: string }[] }) {
    return (
        <div className="h-3 w-full flex bg-white/5 overflow-hidden">
            {items.map((item, i) => (
                <div
                    key={i}
                    className="h-full transition-all duration-500"
                    style={{
                        width: `${item.percentage}%`,
                        backgroundColor: item.color,
                        boxShadow: `inset 0 0 10px rgba(0,0,0,0.1)`
                    }}
                />
            ))}
        </div>
    );
}

export function DashboardStats() {
    const { account } = useWallet();
    const { activeRpc, refreshKey } = useNetwork();
    const { currency } = useCurrency();
    const [breakdownType, setBreakdownType] = useState<"tokens" | "platforms">("tokens");
    const [mainTab, setMainTab] = useState<"positions" | "activity" | "validators">("positions");
    const [viewTab, setViewTab] = useState<"dashboard" | "addressbook">("dashboard");

    const [stakingData, setStakingData] = useState<{ totalStaked: number, totalRewards: number, isLoading: boolean }>({
        totalStaked: 0,
        totalRewards: 0,
        isLoading: false
    });



    const [moveData, setMoveData] = useState<{ balance: string, iconUri: string | null } | null>(null);
    const [assets, setAssets] = useState<DashboardAsset[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [hasError, setHasError] = useState(false);

    // Modal state
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [selectedGroup, setSelectedGroup] = useState<{ title: string, items: any[], color: string } | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const [netWorth, setNetWorth] = useState("$0.00");
    const [holdingsPnL, setHoldingsPnL] = useState("-$0.00");

    // Address Book Integration
    const [savedAddresses, setSavedAddresses] = useState<Array<{ id: number, username: string, address: string }>>([]);
    const [selectedAddress, setSelectedAddress] = useState<string | null>(null);

    useEffect(() => {
        // Load saved addresses from IndexedDB
        const loadSavedAddresses = async () => {
            try {
                const { addressBookDB } = await import("@/lib/addressbook-db");
                const addresses = await addressBookDB.getAllAddresses();
                setSavedAddresses(addresses.map(a => ({
                    id: a.id!,
                    username: a.username,
                    address: a.address
                })));
            } catch (error) {
                console.error("Failed to load saved addresses:", error);
            }
        };
        loadSavedAddresses();
    }, []);

    useEffect(() => {
        const controller = new AbortController();

        const fetchData = async () => {
            const addressToFetch = selectedAddress || account?.address?.toString();
            if (!addressToFetch) return;

            setIsLoading(true);
            setHasError(false);
            try {
                const currentNetwork = Object.values(MOVEMENT_NETWORKS).find(net =>
                    net.rpcEndpoints.some(rpc => rpc.url === activeRpc)
                ) || MOVEMENT_NETWORKS.mainnet;

                const client = new MovementIndexerClient(currentNetwork.indexerUrl, activeRpc);

                const timeoutId = setTimeout(() => controller.abort(), 30000);

                const dataPromise = Promise.all([
                    client.getMoveBalance(addressToFetch, controller.signal),
                    client.getFungibleAssetsFormatted(addressToFetch, controller.signal)
                ]);

                const [moveResponse, allAssets] = await dataPromise;
                clearTimeout(timeoutId);

                if (moveResponse) {
                    setMoveData({
                        balance: moveResponse.balanceFormatted,
                        iconUri: moveResponse.iconUri
                    });
                } else {
                    setMoveData({ balance: "0.00", iconUri: null });
                }

                // Calculate Net Worth and populate assets with prices
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const assetsWithVals = await Promise.all(allAssets.map(async (asset: any) => {
                    const price = await priceService.getPrice(asset.symbol);
                    const amount = Number(asset.balanceFormatted.replace(/,/g, ''));
                    const val = amount * price;
                    return {
                        ...asset,
                        balanceFormatted: asset.balanceFormatted,
                        weight: val,
                        percentage: 0
                    } as DashboardAsset;
                }));

                const totalVal = assetsWithVals.reduce((acc, curr) => acc + (curr.weight || 0), 0);
                setNetWorth(priceService.formatCurrency(totalVal));
                setHoldingsPnL(`-${priceService.formatCurrency(totalVal * 0.05)}`); // Example PnL calculation
                setAssets(assetsWithVals);

                // Fetch Staking Data
                setStakingData(prev => ({ ...prev, isLoading: true }));
                try {
                    const stakingResults = await Promise.all(STAKING_POOLS.map(pool =>
                        client.getStakingData(addressToFetch, pool, controller.signal)
                    ));

                    const totalStakedFloat = stakingResults.reduce((acc, curr) =>
                        acc + (curr ? Number(curr.stakedAmount) / 1e8 : 0), 0);
                    const totalRewardsFloat = stakingResults.reduce((acc, curr) =>
                        acc + (curr ? Number(curr.rewardsPending) / 1e8 : 0), 0);

                    if (!controller.signal.aborted) {
                        setStakingData({
                            totalStaked: totalStakedFloat,
                            totalRewards: totalRewardsFloat,
                            isLoading: false
                        });
                    }
                } catch (stakeErr) {
                    if (!controller.signal.aborted) {
                        console.error("Error fetching total stake:", stakeErr);
                        setStakingData(prev => ({ ...prev, isLoading: false }));
                    }
                }

            } catch (error: any) {
                if (error.name === 'AbortError') {
                    console.log('[DashboardStats] Fetch aborted');
                } else {
                    console.error(`[DashboardStats] Failed to fetch data: ${error.message || error}`);
                    setHasError(true);
                }
            } finally {
                if (!controller.signal.aborted) {
                    setIsLoading(false);
                }
            }
        };

        fetchData();

        return () => {
            controller.abort();
        };
    }, [account?.address, activeRpc, refreshKey, selectedAddress]);

    // Calculate breakdown for visual display
    const calculateBreakdown = () => {
        if (!assets || assets.length === 0) return { breakdown: [], totalWeight: 0 };

        const highlightSymbols = ['MOVE', 'USDC.e', 'USDT.e', 'ETH', 'MoveDog', 'Banana'];
        const colors: Record<string, string> = {
            'MOVE': '#22c55e',
            'USDC.e': '#2563eb',
            'USDT.e': '#14b8a6',
            'ETH': '#6366f1',
            'MoveDog': '#f59e0b',
            'Banana': '#eab308',
            'Others': '#ec4899'
        };

        const totalRaw = assets.reduce((acc: number, asset: DashboardAsset) => acc + (asset.weight || 0), 0);
        if (totalRaw === 0) return { breakdown: [], totalWeight: 0 };

        const items = (assets as DashboardAsset[])
            .filter((asset: DashboardAsset) => {
                const nameLower = asset.name.toLowerCase();
                return !nameLower.includes('movedrops') && !nameLower.includes('drops');
            })
            .map((asset: DashboardAsset) => {
                const weight = asset.weight || 0;
                const percentage = totalRaw > 0 ? (weight / totalRaw) * 100 : 0;
                return {
                    name: asset.name,
                    symbol: asset.symbol,
                    iconUri: asset.iconUri,
                    balanceFormatted: asset.balanceFormatted,
                    weight,
                    percentageString: percentage > 0 && percentage < 0.01 ? '< 0.01%' : `${percentage.toFixed(2)}%`,
                    percentage
                };
            })
            .sort((a, b) => b.weight - a.weight);

        const positionTokens = items.filter(item => item.name === 'Position ID Token' || item.name.includes('Position ID'));
        const standardTokens = items.filter(item => !positionTokens.includes(item));

        let positionsItem = null;
        if (positionTokens.length > 0) {
            const posWeight = positionTokens.reduce((acc, item) => acc + item.weight, 0);
            positionsItem = {
                name: `Positions (${positionTokens.length})`,
                symbol: 'POS',
                iconUri: null,
                weight: posWeight,
                percentage: (posWeight / totalRaw) * 100,
                color: colors['Positions'] || '#8b5cf6'
            };
        }

        const highlighted = standardTokens.filter(item => highlightSymbols.includes(item.symbol));
        const others = standardTokens.filter(item => !highlightSymbols.includes(item.symbol));

        const topOthers = others.slice(0, 3);
        const remainingOthers = others.slice(3);

        const othersWeight = remainingOthers.reduce((acc, item) => acc + item.weight, 0);
        const othersPercentage = (othersWeight / totalRaw) * 100;

        const breakdownData: DashboardAsset[] = [
            ...highlighted.map(item => ({
                ...item,
                color: colors[item.symbol] || '#ffffff',
                isOthers: false
            }) as DashboardAsset),
            ...(positionsItem ? [{
                ...positionsItem,
                color: positionsItem.color || '#6b7280',
                isOthers: false
            } as DashboardAsset] : []),
            ...topOthers.map((item, index) => ({
                ...item,
                color: (['#f472b6', '#a78bfa', '#34d399'][index % 3]),
                isOthers: false
            } as DashboardAsset))
        ];

        if (remainingOthers.length > 0) {
            const othersBalanceFormatted = remainingOthers
                .reduce((sum, item) => sum + Number(item.balanceFormatted.replace(/,/g, '')), 0)
                .toFixed(2);

            breakdownData.push({
                name: `Others (${remainingOthers.length})`,
                symbol: '...',
                iconUri: null,
                balanceFormatted: othersBalanceFormatted,
                weight: othersWeight,
                percentage: othersPercentage,
                color: colors['Others'] || '#6b7280',
                isOthers: true
            } as DashboardAsset);
        }

        return { breakdown: breakdownData, totalWeight: totalRaw };
    };

    const { breakdown } = calculateBreakdown();

    const handleGroupClick = (groupItem: DashboardAsset) => {
        if (!groupItem.isOthers && groupItem.name !== 'Positions' && !groupItem.name.startsWith('Positions (')) return;

        let groupTitle = groupItem.name;
        let groupItems: DashboardAsset[] = [];

        if (groupItem.name.startsWith('Positions')) {
            groupItems = assets.filter((item: DashboardAsset) => item.name === 'Position ID Token' || item.name.includes('Position ID'));
            groupTitle = "All Positions";
        } else if (groupItem.isOthers) {
            const highlightSymbols = ['MOVE', 'USDC.e', 'USDT.e', 'ETH', 'MoveDog', 'Banana'];
            const positionTokens = assets.filter((item: DashboardAsset) => item.name === 'Position ID Token' || item.name.includes('Position ID'));
            const standardTokens = assets.filter((item: DashboardAsset) => !positionTokens.includes(item));
            const others = standardTokens.filter(item => !highlightSymbols.includes(item.symbol));
            groupItems = others.slice(3);
            groupTitle = "Other Tokens";
        }

        const totalVal = assets.reduce((acc: number, asset: DashboardAsset) => acc + (asset.weight || 0), 0);
        groupItems = groupItems.map((item: DashboardAsset) => {
            const weight = item.weight || 0;
            const percentage = totalVal > 0 ? (weight / totalVal) * 100 : 0;
            return {
                ...item,
                percentage: percentage,
                percentageString: percentage > 0 && percentage < 0.01 ? '< 0.01%' : `${percentage.toFixed(2)}%`
            };
        }).sort((a: DashboardAsset, b: DashboardAsset) => {
            return (b.weight || 0) - (a.weight || 0);
        });

        setSelectedGroup({
            title: groupTitle,
            items: groupItems,
            color: groupItem.color || '#ec4899'
        });
        setIsModalOpen(true);
    };

    if (!isMounted) return <div className="space-y-6 w-full animate-pulse pt-12"><div className="h-[300px] bg-white/5" /><div className="h-[400px] bg-white/5" /></div>;

    return (
        <div className="space-y-6 w-full">
            <BreakdownDetailModal
                isOpen={isModalOpen}
                onOpenChange={setIsModalOpen}
                title={selectedGroup?.title || ""}
                items={selectedGroup?.items || []}
                color={selectedGroup?.color || "#fff"}
            />

            {/* View Tabs */}
            <div className="px-4 md:px-0">
                <div className="inline-flex bg-[#1a1b1f] p-1 rounded-none border border-white/5">
                    <button
                        onClick={() => setViewTab("dashboard")}
                        className={`px-6 py-2 text-sm font-mono uppercase tracking-wider transition-none ${viewTab === 'dashboard'
                            ? 'bg-[#0c0d11] text-white'
                            : 'text-muted-foreground hover:text-white'
                            }`}
                    >
                        Dashboard
                    </button>
                    <button
                        onClick={() => setViewTab("addressbook")}
                        className={`px-6 py-2 text-sm font-mono uppercase tracking-wider transition-none ${viewTab === 'addressbook'
                            ? 'bg-[#0c0d11] text-white'
                            : 'text-muted-foreground hover:text-white'
                            }`}
                    >
                        Address Book
                    </button>
                </div>
            </div>

            {viewTab === 'dashboard' ? (
                <>
                    {/* Address Selector */}
                    {savedAddresses.length > 0 && (
                        <div className="px-4 md:px-0 mb-4">
                            <div className="flex items-center gap-3">
                                <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Viewing:</span>
                                <select
                                    value={selectedAddress || account?.address?.toString() || ""}
                                    onChange={(e) => setSelectedAddress(e.target.value === account?.address?.toString() ? null : e.target.value)}
                                    className="bg-[#1a1b1f] border border-white/10 px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-white/20 rounded-none cursor-pointer hover:bg-[#242424] transition-colors"
                                >
                                    {account?.address && (
                                        <option value={account.address.toString()}>
                                            My Wallet ({account.address.toString().slice(0, 6)}...{account.address.toString().slice(-4)})
                                        </option>
                                    )}
                                    {savedAddresses.map((addr) => (
                                        <option key={addr.id} value={addr.address}>
                                            {addr.username} ({addr.address.slice(0, 6)}...{addr.address.slice(-4)})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )}

                    <div className="flex overflow-x-auto snap-x snap-mandatory md:grid md:grid-cols-2 gap-4 pb-2 md:pb-0 scrollbar-hide px-4 md:px-0">

                        <div className="min-w-full md:min-w-0 snap-center border border-white/5 h-[300px] rounded-none p-6 flex flex-col justify-between relative overflow-hidden">
                            <div className="absolute top-4 right-4 w-36 h-36 pointer-events-none opacity-90 hover:opacity-100 transition-opacity">
                                <img src="/greek_moveus1.PNG" alt="Greek Moveus" className="w-full h-full object-contain drop-shadow-lg" />
                            </div>

                            <div className="space-y-3 relative z-10">
                                <p className="text-muted-foreground text-[10px] font-mono uppercase tracking-widest opacity-60">Net Worth</p>
                                <h3 className="text-3xl font-bold font-mono text-white">{netWorth}</h3>
                                <div className="flex items-center gap-2 bg-white/5 px-2 py-1 border border-white/5 w-fit">
                                    <div className="w-4 h-4 border border-white/10 flex items-center justify-center text-[10px] font-mono text-white/40 overflow-hidden">
                                        {(moveData?.iconUri || (moveData && "https://explorer.movementnetwork.xyz/logo.png")) ? (
                                            <img src={moveData?.iconUri || "https://explorer.movementnetwork.xyz/logo.png"} alt="MOVE" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-1.5 h-1.5 rounded-none bg-white/40" />
                                        )}
                                    </div>
                                    <span className="text-white text-xs font-mono">
                                        {isLoading ? "..." : `${moveData?.balance || "0.00"} MOVE`}
                                    </span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-y-4 pt-4 border-t border-white/5">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-1">
                                        <span className="text-[9px] text-muted-foreground font-mono uppercase tracking-wider opacity-60">PnL (Estimate)</span>
                                    </div>
                                    <p className="text-sm font-mono text-pink-500">{holdingsPnL}</p>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-[9px] text-muted-foreground font-mono uppercase tracking-wider opacity-60">Claimable</span>
                                    <p className="text-sm font-mono text-white">
                                        {stakingData.isLoading ? "..." : priceService.formatCurrency(stakingData.totalRewards * (priceService.getPriceSync("MOVE") || 0))}
                                    </p>

                                </div>
                                <div className="space-y-1">
                                    <div className="flex items-center gap-1.5 opacity-60">
                                        <div className="w-1.5 h-1.5 rounded-none bg-white/40" />
                                        <span className="text-[9px] text-muted-foreground font-mono uppercase tracking-wider">MOVE Holdings</span>
                                    </div>
                                    <p className="text-xs font-mono text-white">{isLoading ? "..." : moveData?.balance || "0.00"}</p>
                                </div>
                                <div className="space-y-1">
                                    <div className="flex items-center gap-1.5 opacity-60">
                                        <div className="w-1.5 h-1.5 rounded-none bg-white/40" />
                                        <span className="text-[9px] text-muted-foreground font-mono uppercase tracking-wider">MOVE Staked</span>
                                    </div>
                                    <p className="text-xs font-mono text-white">
                                        {stakingData.isLoading ? "..." : `${stakingData.totalStaked.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MOVE`}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="min-w-full md:min-w-0 snap-center border border-white/5 h-[300px] rounded-none flex flex-col overflow-hidden">
                            <div className="p-4 border-b border-white/5 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <PieChart className="w-3 h-3 text-white/40" />
                                    <span className="text-[10px] font-mono text-white uppercase tracking-widest font-bold">Breakdown</span>
                                </div>

                                <div className="flex bg-[#1a1b1f] p-1 rounded-none scale-75 origin-right">
                                    <button
                                        onClick={() => setBreakdownType("tokens")}
                                        className={`px-3 py-1 text-[10px] font-mono transition-none ${breakdownType === 'tokens' ? 'bg-[#242424] text-white' : 'text-muted-foreground'}`}
                                    >
                                        Tokens
                                    </button>
                                    <button
                                        onClick={() => setBreakdownType("platforms")}
                                        className={`px-3 py-1 text-[10px] font-mono transition-none ${breakdownType === 'platforms' ? 'bg-[#242424] text-white' : 'text-muted-foreground'}`}
                                    >
                                        Platforms
                                    </button>
                                </div>
                            </div>

                            <div className="flex-1 flex flex-col p-6">
                                <div className="flex-1 flex flex-col">
                                    <div className="flex-1 flex flex-wrap gap-x-6 gap-y-4 content-start">
                                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                        {breakdown.map((item: any, i: number) => (
                                            <TokenItem
                                                key={i}
                                                name={item.name}
                                                symbol={item.symbol}
                                                iconUri={item.iconUri}
                                                percentage={item.percentageString || `${(item.percentage || 0).toFixed(2)}%`}
                                                color={item.color || "#ffffff"}
                                                isOthers={item.isOthers}
                                                onClick={() => handleGroupClick(item)}
                                            />
                                        ))}
                                        {breakdown.length === 0 && (
                                            <div className="w-full flex justify-center py-8 opacity-20">
                                                <p className="text-[10px] font-mono uppercase tracking-widest">{isLoading ? "Loading breakdown..." : "No tokens found"}</p>
                                            </div>
                                        )}
                                    </div>

                                    <div className="mt-auto space-y-2">
                                        <MultiColorProgressBar
                                            items={breakdown.map((item: DashboardAsset) => ({
                                                percentage: item.percentage || 0,
                                                color: item.color || "#ffffff"
                                            }))}
                                        />
                                        <p className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest leading-none">
                                            {assets.length} {assets.length === 1 ? 'token' : 'tokens'} detected
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4 px-4 md:px-0">
                        <div className="flex gap-6 border-b border-white/5 pt-2">
                            <button
                                onClick={() => setMainTab("positions")}
                                className={`pb-2 text-xs font-mono relative uppercase tracking-widest transition-none ${mainTab === 'positions' ? 'text-white' : 'text-muted-foreground opacity-60 hover:opacity-100'}`}
                            >
                                Positions
                                {mainTab === 'positions' && <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-white" />}
                            </button>
                            <button
                                onClick={() => setMainTab("activity")}
                                className={`pb-2 text-xs font-mono relative uppercase tracking-widest transition-none ${mainTab === 'activity' ? 'text-white' : 'text-muted-foreground opacity-60 hover:opacity-100'}`}
                            >
                                Activity
                                {mainTab === 'activity' && <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-white" />}
                            </button>
                            <button
                                onClick={() => setMainTab("validators")}
                                className={`pb-2 text-xs font-mono relative uppercase tracking-widest transition-none ${mainTab === 'validators' ? 'text-white' : 'text-muted-foreground opacity-60 hover:opacity-100'}`}
                            >
                                Validators
                                {mainTab === 'validators' && <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-white" />}
                            </button>
                        </div>

                        {mainTab === 'positions' ? (
                            <div className="space-y-4">
                                <PositionsTable address={selectedAddress || account?.address?.toString() || ""} />
                            </div>
                        ) : mainTab === 'activity' ? (
                            <ActivityTable address={selectedAddress || account?.address?.toString() || ""} />
                        ) : (
                            <ValidatorTable address={selectedAddress || account?.address?.toString() || ""} />
                        )}
                    </div>

                    {selectedGroup && (
                        <BreakdownDetailModal
                            isOpen={isModalOpen}
                            onOpenChange={setIsModalOpen}
                            title={selectedGroup.title}
                            items={selectedGroup.items}
                            color={selectedGroup.color}
                        />
                    )}
                </>
            ) : (
                /* Address Book View */
                <AddressBook />
            )}

        </div>
    );
}

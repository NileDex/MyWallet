"use client";

import { useState, useEffect, useCallback } from 'react';
import {
    Download,
    Twitter,
    ExternalLink,
    Zap,
    Search,
    Plus,
    X,
    History,
    Activity,
    Calendar,
    DollarSign
} from 'lucide-react';
import { Header } from "@/components/header";
import { SiteFooter } from "@/components/site-footer";
import { RewardClaim, RewardSummary } from '@/lib/canopy/reward-service';
import "../../components/canopy-rewards/rewards.css";

// Address result type using imported interfaces
interface AddressResult {
    address: string;
    success: boolean;
    data?: {
        summary: RewardSummary;
        claimHistory: RewardClaim[];
    };
    error?: string;
}

export default function RewardsPage() {
    const [addresses, setAddresses] = useState(['']);
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState<{ results: AddressResult[] } | null>(null);
    const [showResults, setShowResults] = useState(false);
    const [movePrice, setMovePrice] = useState<number | null>(null);
    const [priceLoading, setPriceLoading] = useState(true);

    // Fetch real-time MOVE price
    const fetchMovePrice = useCallback(async () => {
        try {
            setPriceLoading(true);
            const response = await fetch('/api/move-price');
            const data = await response.json();

            if (data.success && data.price) {
                setMovePrice(data.price);
            } else {
                setMovePrice(2.30); // Default fallback
            }
        } catch (error) {
            console.error('Error fetching MOVE price:', error);
            setMovePrice(2.30);
        } finally {
            setPriceLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchMovePrice();
        const interval = setInterval(fetchMovePrice, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, [fetchMovePrice]);

    const addAddressInput = () => {
        setAddresses([...addresses, '']);
    };

    const removeAddress = (index: number) => {
        if (addresses.length > 1) {
            const newAddresses = addresses.filter((_, i) => i !== index);
            setAddresses(newAddresses);
        }
    };

    const updateAddress = (index: number, value: string) => {
        const newAddresses = [...addresses];
        newAddresses[index] = value;
        setAddresses(newAddresses);
    };

    const trackRewards = async () => {
        setLoading(true);
        setShowResults(false);

        try {
            const validAddresses = addresses.filter(addr => addr.trim() !== '');

            const response = await fetch('/api/rewards', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ addresses: validAddresses }),
            });

            const data = await response.json();
            setResults(data);
            setShowResults(true);
        } catch (error) {
            console.error('Error tracking rewards:', error);
            alert('Error tracking rewards. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const formatMoveAmount = (amount: number) => {
        return amount.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 8
        });
    };

    const formatDate = (timestamp: string) => {
        if (!timestamp || timestamp === 'unknown') return 'Unknown';
        try {
            const date = new Date(parseInt(timestamp) / 1000);
            return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
        } catch {
            return 'Invalid Date';
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount);
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const downloadCSV = (claims: any[], address: string) => {
        if (!claims || claims.length === 0) {
            alert('No claims data available to download.');
            return;
        }

        const headers = ['Timestamp', 'Date (UTC)', 'MOVE Amount', 'Value (USD)', 'Pool Address'];
        const rows = claims.map(claim => {
            const moveAmt = claim.moveAmount !== undefined ? claim.moveAmount : (claim.rewardAmountParsed || 0) / Math.pow(10, 8);
            return [
                claim.timestamp,
                formatDate(claim.timestamp),
                moveAmt,
                (moveAmt * (movePrice || 0)).toFixed(2),
                claim.poolAddress
            ];
        });

        const csvContent = "data:text/csv;charset=utf-8,"
            + headers.join(",") + "\n"
            + rows.map(e => e.join(",")).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `move_claims_${address}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const totalTokensClaimed = results?.results
        ?.filter(result => result.success && result.data)
        .reduce((sum, result) => sum + (result.data?.summary.totalMoveTokens || 0), 0) || 0;

    const handleTwitterShare = () => {
        if (typeof window !== 'undefined') {
            const text = `I've claimed a total of ${formatMoveAmount(totalTokensClaimed)} $MOVE tokens from the @canopyxyz Vaults! Check out your own rewards.`;
            const url = window.location.href;
            const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}&hashtags=MOVE,MovementNetwork,DeFi`;
            window.open(twitterUrl, '_blank', 'noopener,noreferrer');
        }
    };

    return (
        <div className="min-h-screen bg-background flex flex-col canopy-rewards-page">
            <Header />

            <main className="flex-1 container mx-auto px-4 py-8">
                <div className="max-w-4xl mx-auto space-y-8">

                    {/* Header Section */}
                    <section className="text-center space-y-4">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary animate-pulse-subtle">
                            <Zap className="w-4 h-4" />
                            <span className="text-[10px] font-mono uppercase tracking-widest font-bold font-mono">Real-time Data Active</span>
                        </div>
                        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white mb-2">
                            Canopy Rewards <span className="text-primary tracking-tighter uppercase font-mono italic">Tracker</span>
                        </h1>
                        <p className="text-muted-foreground text-sm max-w-xl mx-auto font-mono uppercase">
                            Track your MOVE token rewards from Canopy vaults across the Movement Network.
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 max-w-lg mx-auto">
                            <div className="bg-white/[0.03] border border-white/5 p-3 rounded-lg flex items-center justify-between">
                                <span className="text-[9px] font-mono text-white/40 uppercase">MOVE Price</span>
                                <span className="text-sm font-mono text-emerald-400 font-bold">
                                    {priceLoading ? '...' : `$${movePrice?.toFixed(4)}`}
                                </span>
                            </div>
                            <div className="bg-white/[0.03] border border-white/5 p-3 rounded-lg flex items-center justify-between">
                                <span className="text-[9px] font-mono text-white/40 uppercase">Network</span>
                                <span className="text-sm font-mono text-cyan-400 font-bold uppercase tracking-tight">Movement Mainnet</span>
                            </div>
                        </div>
                    </section>

                    {/* Input Section */}
                    <section className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 md:p-8 backdrop-blur-sm self-center">
                        <h2 className="text-xs font-mono text-white/40 uppercase tracking-[0.3em] mb-6 flex items-center gap-2">
                            <Activity className="w-3 h-3" />
                            Wallet Addresses
                        </h2>

                        <div className="space-y-4">
                            {addresses.map((address, index) => (
                                <div key={index} className="relative group">
                                    <input
                                        type="text"
                                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-4 text-sm font-mono focus:border-primary/50 focus:ring-1 focus:ring-primary/20 outline-none transition-all group-hover:border-white/20"
                                        placeholder="Enter wallet address (0x...)"
                                        value={address}
                                        onChange={(e) => updateAddress(index, e.target.value)}
                                    />
                                    {addresses.length > 1 && (
                                        <button
                                            onClick={() => removeAddress(index)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 hover:text-red-400 transition-colors"
                                        >
                                            <X className="w-5 h-5" />
                                        </button>
                                    )}
                                </div>
                            ))}

                            <div className="flex flex-col sm:flex-row gap-4 pt-2">
                                <button
                                    onClick={addAddressInput}
                                    className="flex-1 py-3 px-4 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 transition-all text-xs font-mono uppercase tracking-widest text-white/60 hover:text-white flex items-center justify-center gap-2"
                                >
                                    <Plus className="w-3 h-3" /> Add Address
                                </button>
                                <button
                                    onClick={trackRewards}
                                    disabled={loading || addresses.every(a => !a.trim())}
                                    className="flex-1 py-3 px-4 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all text-xs font-mono font-bold uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_rgba(255,255,255,0.2)]"
                                >
                                    {loading ? 'Tracking...' : <><Search className="w-3 h-3" /> Track Rewards</>}
                                </button>
                            </div>
                        </div>
                    </section>

                    {/* Results Section */}
                    {showResults && results && (
                        <section className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                            <div className="flex flex-col md:flex-row items-center justify-between gap-4 border-b border-white/5 pb-6">
                                <div>
                                    <h2 className="text-2xl font-bold text-white uppercase italic font-mono tracking-tighter">📊 Reward Summary</h2>
                                    <p className="text-[10px] font-mono text-white/30 uppercase tracking-widest mt-1">Processed {results.results.length} addresses</p>
                                </div>
                                {totalTokensClaimed > 0 && (
                                    <button
                                        onClick={handleTwitterShare}
                                        className="group relative flex items-center gap-3 bg-black border border-white/10 py-3 px-6 rounded-full overflow-hidden transition-all hover:scale-105 active:scale-95 shadow-xl hover:shadow-[0_0_30px_rgba(255,255,255,0.1)]"
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                                        <Twitter className="w-4 h-4 group-hover:text-primary transition-colors" />
                                        <span className="text-[10px] font-mono uppercase tracking-widest font-bold">Share Milestone</span>
                                    </button>
                                )}
                            </div>

                            <div className="space-y-6">
                                {results.results.map((result, index) => (
                                    <div key={index} className="bg-white/[0.02] border border-white/5 rounded-2xl overflow-hidden backdrop-blur-sm shadow-2xl">
                                        <div className="p-4 md:p-6 border-b border-white/5 bg-white/[0.01] flex flex-col md:flex-row md:items-center justify-between gap-4">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <h3 className="text-xs font-mono text-white/60 truncate max-w-[200px] md:max-w-md">
                                                        {result.address}
                                                    </h3>
                                                    <span className={`text-[8px] font-mono uppercase tracking-[0.2em] px-2 py-0.5 rounded-sm ${result.success ? 'bg-emerald-400/10 text-emerald-400' : 'bg-red-400/10 text-red-400'}`}>
                                                        {result.success ? 'Synced' : 'Error'}
                                                    </span>
                                                </div>
                                            </div>
                                            {result.success && result.data && result.data.claimHistory?.length > 0 && (
                                                <button
                                                    onClick={() => downloadCSV(result.data!.claimHistory, result.address)}
                                                    className="text-[9px] font-mono uppercase tracking-widest text-white/40 hover:text-white flex items-center gap-2 transition-colors border border-white/5 hover:border-white/10 px-3 py-1.5 rounded-lg bg-black/40"
                                                >
                                                    <Download className="w-3 h-3" /> Export CSV
                                                </button>
                                            )}
                                        </div>

                                        {result.success && result.data ? (
                                            <div className="p-4 md:p-6 space-y-8">
                                                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                                    <RewardStat label="Total Claims" value={result.data.summary.totalClaims} icon={<History className="w-3 h-3" />} />
                                                    <RewardStat label="Total MOVE" value={formatMoveAmount(result.data.summary.totalMoveTokens)} icon={<Zap className="w-3 h-3 text-emerald-400" />} />
                                                    <RewardStat label="USD Value" value={formatCurrency(result.data.summary.totalMoveTokens * (movePrice || 0))} icon={<DollarSign className="w-3 h-3 text-cyan-400" />} />
                                                    <RewardStat label="Avg Claim" value={formatMoveAmount(result.data.summary.averageClaimAmount)} icon={<Activity className="w-3 h-3" />} />
                                                    <RewardStat
                                                        label="Today"
                                                        value={(() => {
                                                            const today = new Date();
                                                            let dailyTotal = 0;
                                                            result.data!.summary.recentClaims.forEach(claim => {
                                                                const claimDate = new Date(parseInt(claim.timestamp) / 1000);
                                                                if (claimDate.getFullYear() === today.getFullYear() &&
                                                                    claimDate.getMonth() === today.getMonth() &&
                                                                    claimDate.getDate() === today.getDate()) {
                                                                    dailyTotal += claim.moveAmount || 0;
                                                                }
                                                            });
                                                            return formatMoveAmount(dailyTotal);
                                                        })()}
                                                        icon={<Calendar className="w-3 h-3" />}
                                                    />
                                                </div>

                                                {result.data.summary.recentClaims.length > 0 && (
                                                    <div className="space-y-4">
                                                        <h4 className="text-[10px] font-mono text-white/30 uppercase tracking-[0.3em] flex items-center gap-2">
                                                            <History className="w-3 h-3" /> Recent Activity
                                                        </h4>
                                                        <div className="space-y-2">
                                                            {result.data.summary.recentClaims.slice(0, 5).map((claim, cIdx) => (
                                                                <div key={cIdx} className="bg-white/[0.02] border border-white/5 p-3 rounded-xl flex items-center justify-between hover:bg-white/[0.04] transition-all group">
                                                                    <div className="flex items-center gap-4">
                                                                        <div className="w-8 h-8 rounded-full bg-emerald-400/10 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                                                                            <Zap className="w-4 h-4" />
                                                                        </div>
                                                                        <div>
                                                                            <div className="text-sm font-mono text-white font-bold">{formatMoveAmount(claim.moveAmount || 0)} MOVE</div>
                                                                            <div className="text-[9px] font-mono text-white/30 truncate max-w-[100px] md:max-w-xs">{claim.poolAddress}</div>
                                                                        </div>
                                                                    </div>
                                                                    <div className="text-right">
                                                                        <div className="text-[10px] font-mono text-white/60">{formatDate(claim.timestamp)}</div>
                                                                        <div className="text-[9px] font-mono text-emerald-400/60 uppercase">{formatCurrency((claim.moveAmount || 0) * (movePrice || 0))}</div>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="p-12 text-center text-red-400 bg-red-400/5">
                                                <p className="font-mono text-xs uppercase tracking-widest">{result.error || 'Failed to sync address'}</p>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Call to Action */}
                    <section className="bg-gradient-to-br from-primary/20 to-cyan-400/10 border border-white/10 rounded-3xl p-8 text-center space-y-4 max-w-2xl mx-auto shadow-2xl relative overflow-hidden group">
                        <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <h3 className="text-xl md:text-2xl font-bold text-white tracking-tight">Earning $MOVE with Canopy</h3>
                        <p className="text-sm text-white/60 font-mono uppercase tracking-tight max-w-md mx-auto leading-relaxed">
                            Canopy&apos;s vaults automate your yield strategy, ensuring you get the best rewards across the Movement Network.
                        </p>
                        <div className="pt-2">
                            <a
                                href="https://canopy.xyz"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.2em] font-bold text-white bg-white/10 px-6 py-3 rounded-full hover:bg-white/20 transition-all border border-white/5"
                            >
                                Launch App <ExternalLink className="w-3 h-3" />
                            </a>
                        </div>
                    </section>

                </div>
            </main>

            <SiteFooter />
        </div>
    );
}

function RewardStat({ label, value, icon }: { label: string, value: string | number, icon: React.ReactNode }) {
    return (
        <div className="bg-white/[0.03] border border-white/5 p-4 rounded-xl space-y-2 hover:bg-white/[0.05] transition-all group">
            <div className="flex items-center gap-2 text-white/30 group-hover:text-white/50 transition-colors">
                {icon}
                <span className="text-[9px] font-mono uppercase tracking-widest">{label}</span>
            </div>
            <div className="text-sm md:text-lg font-mono text-white font-bold font-mono tracking-tight">{value}</div>
        </div>
    );
}

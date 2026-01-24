"use client";

import { useState, useEffect } from "react";
import { X, Copy, Eye, EyeOff, Send, LogOut, ListFilter, ExternalLink, ChevronRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { toast } from "sonner";
import { fetchPortfolio, PortfolioData } from "@/lib/portfolio-service";
import { priceService } from "@/lib/price-service";
import { useNetwork } from "@/context/network-context";
import { useCurrency } from "@/context/currency-context";
import { MOVEMENT_NETWORKS } from "@/config/networks";


interface WalletPanelProps {
    isOpen: boolean;
    onClose: () => void;
}

export function WalletPanel({ isOpen, onClose }: WalletPanelProps) {
    const { account, disconnect } = useWallet();
    const [showBalance, setShowBalance] = useState(true);
    const [portfolio, setPortfolio] = useState<PortfolioData | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isCopied, setIsCopied] = useState(false);
    const { activeRpc, refreshKey } = useNetwork();
    const { currency } = useCurrency();


    const address = account?.address?.toString() || "";
    const shortAddress = address ? `${address.slice(0, 4)}...${address.slice(-4)}` : "";

    const handleCopyAddress = () => {
        if (address) {
            navigator.clipboard.writeText(address);
            setIsCopied(true);
            toast.success("Address copied to clipboard");
            setTimeout(() => setIsCopied(false), 2000);
        }
    };

    const handleLogout = () => {
        disconnect();
        onClose();
    };

    // Close on Escape key
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", handleEsc);
        return () => window.removeEventListener("keydown", handleEsc);
    }, [onClose]);

    // Fetch portfolio data
    useEffect(() => {
        if (!isOpen || !address) return;

        const loadData = async () => {
            setIsLoading(true);
            try {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const currentNetwork = Object.values(MOVEMENT_NETWORKS).find((net: any) =>
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    net.rpcEndpoints.some((rpc: any) => rpc.url === activeRpc)
                ) || MOVEMENT_NETWORKS.mainnet;

                const data = await fetchPortfolio(address, currentNetwork.indexerUrl, activeRpc);
                setPortfolio(data);
            } catch (err) {
                console.error("Failed to fetch wallet panel portfolio:", err);
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
    }, [isOpen, address, activeRpc, refreshKey]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            {/* Overlay */}
            <div
                className="absolute inset-0 bg-black/10 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Panel */}
            <div className="relative w-full max-w-[500px] bg-[#0c0d11] border-l border-border h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">

                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-border">
                    <div className="flex items-center gap-2">
                        <span className="font-mono text-sm">{shortAddress}</span>
                        <button onClick={handleCopyAddress} className="text-muted-foreground p-1">
                            {isCopied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                        </button>
                    </div>
                    <button onClick={onClose} className="p-1">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 flex flex-col">
                    {/* Balance Section */}
                    {/* Balance Section */}
                    <div className="p-4 md:p-6 space-y-4">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <h2 className="text-2xl md:text-4xl font-bold">
                                        {showBalance ? (portfolio ? priceService.formatCurrency(portfolio.netWorth) : "$0.00") : "****"}
                                    </h2>
                                    <button onClick={() => setShowBalance(!showBalance)} className="text-muted-foreground p-1">
                                        {showBalance ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                                    </button>
                                </div>
                                <p className="text-muted-foreground text-sm">~{portfolio?.moveBalance.toFixed(2) || "0"} MOVE</p>
                            </div>
                            <div className="flex items-center gap-2 w-full md:w-auto">
                                <Button
                                    className="flex-1 md:flex-none bg-white text-black rounded-none font-mono text-xs px-4 py-1.5 h-auto border-none hover:bg-white transition-none"
                                >
                                    SEND
                                </Button>
                                <Button
                                    className="flex-1 md:flex-none bg-white text-black rounded-none font-mono text-xs px-4 py-1.5 h-auto border-none hover:bg-white transition-none"
                                    onClick={handleLogout}
                                >
                                    DISCONNECT
                                </Button>
                            </div>
                        </div>
                    </div>

                    <div className="p-4 flex-1 flex flex-col items-center justify-center text-center space-y-2 opacity-30">
                        <p className="text-sm font-medium">No Holdings</p>
                    </div>
                </div>

            </div>
        </div>
    );
}

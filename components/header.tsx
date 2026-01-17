"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, Settings, RefreshCcw, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { WalletPanel } from "@/components/wallet-panel";
import { SettingsModal } from "@/components/settings-modal";
import { ProjectsSheet } from "@/components/projects-sheet";
import { useNetwork } from "@/context/network-context";

export function Header() {
  const [walletPanelOpen, setWalletPanelOpen] = useState(false);
  const { account, connected, network } = useWallet();
  const { triggerRefresh } = useNetwork();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    triggerRefresh();
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const formatAddress = (addr: any) => {
    if (!addr) return "";
    const addressStr = addr.toString();
    return `${addressStr.slice(0, 6)}...${addressStr.slice(-4)}`;
  };

  return (
    <header className="relative">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 gap-2 md:gap-4">
        <Link href="/" className="text-lg md:text-xl font-bold text-foreground hover:text-white transition-colors shrink-0">
          My Wallet
        </Link>

        <div className="flex items-center gap-2 md:gap-4">
          {connected && account ? (
            <>
              <button
                onClick={handleRefresh}
                className={`text-white/60 hover:text-white transition-all ${isRefreshing ? 'animate-spin' : ''}`}
              >
                <RefreshCcw className="w-4 h-4" />
              </button>
              <ProjectsSheet
                trigger={
                  <button className="text-sm font-mono font-bold text-white/60 hover:text-white transition-colors flex items-center gap-1">
                    <LayoutGrid className="w-4 h-4 md:hidden" />
                    <span className="hidden md:inline">Projects</span>
                  </button>
                }
              />
              <SettingsModal>
                <button className="text-white opacity-80 cursor-pointer outline-none">
                  <Settings className="w-4 h-4 md:w-5 md:h-5" />
                </button>
              </SettingsModal>
              <div
                className="flex items-center justify-center px-3 md:px-8 py-1 bg-white text-black font-mono text-xs md:text-sm rounded-none cursor-pointer"
                onClick={() => setWalletPanelOpen(true)}
              >
                <span>{formatAddress(account.address)}</span>
              </div>
            </>
          ) : (
            <div className="md:block">
              {/* No links here as per "remove bread crumb" */}
            </div>
          )}
        </div>
      </div>

      <WalletPanel isOpen={walletPanelOpen} onClose={() => setWalletPanelOpen(false)} />
    </header>
  );
}
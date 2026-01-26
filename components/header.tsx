"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, Settings, RefreshCcw, LayoutGrid, Menu, X, Wallet } from "lucide-react";
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    triggerRefresh();
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
              {/* Desktop View */}
              <div className="hidden md:flex items-center gap-4">
                <a
                  href="https://staking.movementnetwork.xyz/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-6 py-2 rounded-none font-bold uppercase tracking-wider text-sm transition-all"
                  style={{
                    background: "linear-gradient(90deg, #5EEAD4 0%, #22D3EE 100%)",
                    color: "#0c0d11",
                  }}
                >
                  <Wallet className="w-4 h-4" />
                  Validator Staking
                </a>

                <button
                  onClick={handleRefresh}
                  className={`text-white/60 hover:text-white transition-all ${isRefreshing ? 'animate-spin' : ''}`}
                >
                  <RefreshCcw className="w-4 h-4" />
                </button>
                <ProjectsSheet
                  trigger={
                    <button className="text-sm font-mono font-bold text-white/60 hover:text-white transition-colors flex items-center gap-1">
                      <span>Projects</span>
                    </button>
                  }
                />
                <SettingsModal>
                  <button className="text-white opacity-80 cursor-pointer outline-none">
                    <Settings className="w-4 h-4" />
                  </button>
                </SettingsModal>
                <div
                  className="flex items-center justify-center px-8 py-1 bg-white text-black font-mono text-sm rounded-none cursor-pointer"
                  onClick={() => setWalletPanelOpen(true)}
                >
                  <span>{formatAddress(account.address)}</span>
                </div>
              </div>

              {/* Mobile View Toggle */}
              <button
                className="md:hidden text-white p-2"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </>
          ) : (
            <div className="md:block">
              {/* No links here as per "remove bread crumb" */}
            </div>
          )}
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && connected && account && (
        <div className="absolute top-16 left-0 right-0 bg-[#0c0d11] border-b border-white/10 z-50 md:hidden animate-in slide-in-from-top duration-300">
          <div className="flex flex-col p-4 gap-4">
            <a
              href="https://staking.movementnetwork.xyz/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 px-6 py-3 rounded-none font-bold uppercase tracking-wider text-sm w-full"
              style={{
                background: "linear-gradient(90deg, #5EEAD4 0%, #22D3EE 100%)",
                color: "#1E3A8A",
              }}
            >
              <Wallet className="w-4 h-4" />
              Validator Staking
            </a>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  handleRefresh();
                  setMobileMenuOpen(false);
                }}
                className="flex items-center justify-center gap-2 bg-white/5 p-3 rounded-none text-white/60 font-mono text-xs uppercase"
              >
                <RefreshCcw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <ProjectsSheet
                trigger={
                  <button className="flex items-center justify-center gap-2 bg-white/5 p-3 rounded-none text-white/60 font-mono text-xs uppercase w-full">
                    <LayoutGrid className="w-4 h-4" />
                    Projects
                  </button>
                }
              />
            </div>

            <div className="flex flex-col gap-2">
              <SettingsModal>
                <button className="flex items-center justify-center gap-2 bg-white/5 p-3 rounded-none text-white/60 font-mono text-xs uppercase w-full">
                  <Settings className="w-4 h-4" />
                  Settings
                </button>
              </SettingsModal>
              <div
                className="flex items-center justify-center p-3 bg-white text-black font-mono text-sm rounded-none font-bold"
                onClick={() => {
                  setWalletPanelOpen(true);
                  setMobileMenuOpen(false);
                }}
              >
                <span>{formatAddress(account.address)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <WalletPanel isOpen={walletPanelOpen} onClose={() => setWalletPanelOpen(false)} />
    </header>
  );
}
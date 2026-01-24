"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/header";
import { WalletSelectionModal } from "@/components/wallet-selection-modal";
import { RobotVerification } from "@/components/robot-verification";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { DashboardStats } from "@/components/dashboard-stats";
import { SiteFooter } from "@/components/site-footer";

export default function Home() {
  const {
    account,
    connected
  } = useWallet();

  const [isVerified, setIsVerified] = useState(false);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      <main className={`flex-1 container mx-auto px-0 md:px-4 ${connected ? "py-8" : "flex items-center justify-center"}`}>
        {connected && account?.address ? (
          <div className="relative max-w-5xl mx-auto pt-12">
            {!isVerified ? (
              <RobotVerification onVerify={(token: string | null) => setIsVerified(!!token)} />
            ) : (
              <DashboardStats />
            )}
          </div>
        ) : (


          <div className="max-w-2xl mx-auto text-center space-y-8">
            <div className="space-y-4">
              <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
                My Wallet
              </h1>
              <p className="text-xl text-muted-foreground">
                Connect your wallet to start interacting with Movement Network
              </p>
            </div>

            <WalletSelectionModal>
              <Button size="lg" className="text-xl px-12 py-8 rounded-none bg-white text-black font-mono tracking-widest border-none hover:bg-white transition-none">
                Connect Wallet
              </Button>
            </WalletSelectionModal>
          </div>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}

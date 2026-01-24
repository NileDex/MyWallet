"use client";

import { ReactNode, useMemo } from "react";
import { AptosWalletAdapterProvider } from "@aptos-labs/wallet-adapter-react";
import { AptosConfig, Network } from "@aptos-labs/ts-sdk";
import { useNetwork } from "@/context/network-context";

import { toast } from "sonner";

interface WalletProviderProps {
  children: ReactNode;
}

export function WalletProvider({ children }: WalletProviderProps) {
  const { activeRpc } = useNetwork();

  const aptosConfig = useMemo(() => new AptosConfig({
    network: Network.MAINNET,
    fullnode: activeRpc,
  }), [activeRpc]);

  return (
    <AptosWalletAdapterProvider
      autoConnect={true}
      dappConfig={aptosConfig}
      onError={(error: Error | { message?: string } | string) => {
        const errorMsg = typeof error === 'string' ? error : (error as Error).message || "Wallet connection error";


        if (errorMsg.includes("rejected the request")) {
          toast.info("Connection request canceled");
        } else {
          console.error("Wallet error:", error);
          toast.error(errorMsg);
        }
      }}
    >
      {children}
    </AptosWalletAdapterProvider>
  );
}
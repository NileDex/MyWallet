"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { DEFAULT_RPC } from "@/config/networks";

interface NetworkContextType {
    activeRpc: string;
    setActiveRpc: (rpc: string) => void;
    refreshKey: number;
    triggerRefresh: () => void;
}

const NetworkContext = createContext<NetworkContextType | undefined>(undefined);

export function NetworkProvider({ children }: { children: React.ReactNode }) {
    const [activeRpc, setActiveRpcState] = useState<string>(DEFAULT_RPC);
    const [refreshKey, setRefreshKey] = useState<number>(0);

    useEffect(() => {
        const savedRpc = localStorage.getItem("activeRpc");
        if (savedRpc) {
            setActiveRpcState(savedRpc);
        }
    }, []);

    const setActiveRpc = (rpc: string) => {
        setActiveRpcState(rpc);
        localStorage.setItem("activeRpc", rpc);
    };

    const triggerRefresh = () => {
        setRefreshKey(prev => prev + 1);
    };

    return (
        <NetworkContext.Provider value={{ activeRpc, setActiveRpc, refreshKey, triggerRefresh }}>
            {children}
        </NetworkContext.Provider>
    );
}

export function useNetwork() {
    const context = useContext(NetworkContext);
    if (context === undefined) {
        throw new Error("useNetwork must be used within a NetworkProvider");
    }
    return context;
}

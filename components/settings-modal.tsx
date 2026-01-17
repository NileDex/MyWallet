"use client";

import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNetwork } from "@/context/network-context";
import { MOVEMENT_NETWORKS } from "@/config/networks";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function SettingsModal({ children }: { children: React.ReactNode }) {
    const { activeRpc, setActiveRpc } = useNetwork();
    const [customRpc, setCustomRpc] = useState("");
    const [currency, setCurrency] = useState("MOVE");
    const [explorer, setExplorer] = useState(MOVEMENT_NETWORKS.mainnet.explorers[0]);

    const networks = MOVEMENT_NETWORKS.mainnet.rpcEndpoints;
    const explorers = MOVEMENT_NETWORKS.mainnet.explorers;

    return (
        <Dialog>
            <DialogTrigger asChild>
                {children}
            </DialogTrigger>
            <DialogContent className="sm:max-w-md bg-[#0c0d11] border-none rounded-none p-0 gap-0 overflow-hidden outline-none shadow-none">
                <DialogHeader className="p-6 pb-2">
                    <DialogTitle className="text-xl font-bold font-mono">Settings</DialogTitle>
                </DialogHeader>

                <div className="px-6">
                    <div className="flex gap-4 border-b border-white/5">
                        <div className="pb-2 text-sm font-mono relative text-white">
                            General
                            <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-white" />
                        </div>
                    </div>
                </div>

                <div className="p-6 space-y-6">
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground font-mono">Default Currency</span>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <div className="flex items-center gap-2 bg-[#242424] px-3 py-1.5 rounded-none border-none cursor-pointer min-w-[120px] justify-between group h-8">
                                        <span className="text-xs font-mono text-white">{currency}</span>
                                        <ChevronDown className="w-3 h-3 text-white opacity-50" />
                                    </div>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="bg-[#1a1b1f] border-white/5 rounded-none p-0 min-w-[120px]">
                                    {["MOVE", "USD", "EUR"].map((curr) => (
                                        <DropdownMenuItem
                                            key={curr}
                                            onClick={() => setCurrency(curr)}
                                            className="text-xs font-mono text-white hover:bg-white hover:text-black rounded-none cursor-pointer px-3 py-2"
                                        >
                                            {curr}
                                        </DropdownMenuItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>

                        <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground font-mono">Preferred Explorer</span>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <div className="flex items-center gap-2 bg-[#242424] px-3 py-1.5 rounded-none border-none cursor-pointer min-w-[120px] justify-between group h-8">
                                        <span className="text-xs font-mono text-white truncate max-w-[150px]">{explorer.name}</span>
                                        <ChevronDown className="w-3 h-3 text-white opacity-50" />
                                    </div>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="bg-[#1a1b1f] border-white/5 rounded-none p-0 min-w-[180px]">
                                    {explorers.map((exp) => (
                                        <DropdownMenuItem
                                            key={exp.url}
                                            onClick={() => setExplorer(exp)}
                                            className="text-xs font-mono text-white hover:bg-white hover:text-black rounded-none cursor-pointer px-3 py-2"
                                        >
                                            {exp.name}
                                        </DropdownMenuItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>

                    <div className="pt-4 space-y-4">
                        <span className="text-xs font-bold text-white font-mono uppercase tracking-widest text-left block">RPC Endpoint</span>
                        <div className="space-y-3">
                            {networks.map((rpc) => (
                                <div
                                    key={rpc.name}
                                    className="flex items-center justify-between cursor-pointer group"
                                    onClick={() => setActiveRpc(rpc.url)}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-4 h-4 rounded-none border-2 ${activeRpc === rpc.url ? 'border-white bg-white/20' : 'border-white/20'} flex items-center justify-center transition-none`}>
                                            {activeRpc === rpc.url && <div className="w-1.5 h-1.5 rounded-none bg-white" />}
                                        </div>
                                        <span className={`text-xs font-mono ${activeRpc === rpc.url ? 'text-white' : 'text-muted-foreground transition-none'}`}>{rpc.name}</span>
                                    </div>
                                    {rpc.latency && (
                                        <div className="flex items-center gap-2">
                                            <div className={`w-1.5 h-1.5 rounded-none ${rpc.status === 'orange' ? 'bg-orange-500' : rpc.status === 'pink' ? 'bg-pink-500' : 'bg-yellow-500'}`} />
                                            <span className="text-[10px] font-mono text-muted-foreground/60">{rpc.latency}</span>
                                        </div>
                                    )}
                                </div>
                            ))}
                            <div
                                className="flex items-center justify-between cursor-pointer group"
                                onClick={() => { if (customRpc) setActiveRpc(customRpc) }}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-4 h-4 rounded-none border-2 ${!networks.some(n => n.url === activeRpc) ? 'border-white bg-white/20' : 'border-white/20'} flex items-center justify-center transition-none`}>
                                        {!networks.some(n => n.url === activeRpc) && <div className="w-1.5 h-1.5 rounded-none bg-white" />}
                                    </div>
                                    <span className={`text-xs font-mono ${!networks.some(n => n.url === activeRpc) ? 'text-white' : 'text-muted-foreground transition-none'}`}>Custom</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="pt-2">
                        <div className="flex items-center gap-2 bg-[#222329]/50 border-none p-1 rounded-none">
                            <input
                                type="text"
                                placeholder="Custom RPC URL"
                                value={customRpc}
                                onChange={(e) => setCustomRpc(e.target.value)}
                                className="flex-1 bg-transparent border-none outline-none px-3 py-1.5 text-xs font-mono placeholder:text-muted-foreground/40 text-white"
                            />
                            <Button
                                onClick={() => setActiveRpc(customRpc)}
                                className="bg-[#242424] text-white text-[10px] h-7 px-3 rounded-none transition-none border-none hover:bg-white hover:text-black"
                            >
                                SAVE
                            </Button>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

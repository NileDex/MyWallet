"use client";

import { Activity, Globe, Radio } from "lucide-react";

export function SiteFooter() {
    return (
        <footer className="border-t border-white/5 bg-background py-3 mt-auto">
            <div className="container mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4 md:gap-6">
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 md:gap-8">
                    {/* Status */}
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                        <span className="text-[10px] font-mono text-white uppercase tracking-wider">Operational</span>
                    </div>

                    {/* Network */}
                    <div className="flex items-center gap-2">
                        <Globe className="w-3 h-3 text-muted-foreground opacity-50" />
                        <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Network:</span>
                        <span className="text-[10px] font-mono text-white uppercase tracking-wider">Movement Mainnet</span>
                    </div>

                    {/* Latency */}
                    <div className="flex items-center gap-2">
                        <Radio className="w-3 h-3 text-muted-foreground opacity-50" />
                        <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Latency:</span>
                        <span className="text-[10px] font-mono text-white uppercase tracking-wider">42ms</span>
                    </div>
                </div>

                <div className="flex items-center gap-4 opacity-30">
                    <Activity className="w-3 h-3" />
                    <span className="text-[8px] font-mono uppercase tracking-[0.2em]">System Synced</span>
                    <span className="text-[8px] font-mono uppercase tracking-[0.2em]">v1.2.4</span>
                </div>
            </div>
        </footer>
    );
}

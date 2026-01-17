"use client";

import { useEffect, useState } from "react";
import { X, PanelLeftOpen } from "lucide-react";
import { ProjectCards } from "@/components/project-cards";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";

// We'll use a custom Sheet-like implementation using Dialog primitives or fixed div for simplicity and control
// since we want precise "come out from the right" behavior.

export function ProjectsSheet({ trigger }: { trigger?: React.ReactNode }) {
    const [isOpen, setIsOpen] = useState(false);

    // Prevent body scroll when open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [isOpen]);

    return (
        <>
            {/* Trigger Button */}
            {trigger ? (
                <div onClick={() => setIsOpen(true)} className="cursor-pointer">
                    {trigger}
                </div>
            ) : (
                <button
                    onClick={() => setIsOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-[#1a1b1f] border border-white/5 rounded-lg hover:bg-white/5 transition-colors mb-6 w-full justify-between group"
                >
                    <span className="text-sm font-mono font-bold text-white uppercase tracking-widest">
                        View Projects
                    </span>
                    <PanelLeftOpen className="w-4 h-4 text-white/40 group-hover:text-white transition-colors rotate-180" />
                </button>
            )}

            {/* Backdrop */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 transition-opacity animate-in fade-in duration-200"
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* Slide-over Panel */}
            <div
                className={`fixed top-0 right-0 h-full w-[300px] bg-[#0a0a0a] border-l border-white/10 z-50 p-6 flex flex-col gap-6 shadow-2xl transition-transform duration-300 ease-out transform ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
            >
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-white font-mono uppercase tracking-widest">
                        Projects
                    </h2>
                    <button
                        onClick={() => setIsOpen(false)}
                        className="p-1 hover:bg-white/10 rounded-md transition-colors"
                    >
                        <X className="w-5 h-5 text-white/60" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto">
                    <ProjectCards orientation="vertical" />
                </div>
            </div>
        </>
    );
}

"use client";

import { useEffect, useState } from "react";
import { User, ExternalLink } from "lucide-react";
import projectsData from "../data/projects.json";

// Typed projects data to help with module resolution
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const projects: any[] = projectsData;

interface Project {
    id: string;
    name: string;
    description: string;
    url: string;
    logo: string;
    balance?: string;
}

export function ProjectCards({ orientation = 'horizontal' }: { orientation?: 'horizontal' | 'vertical' }) {
    const [holdingsTotal, setHoldingsTotal] = useState("$0.17"); // Placeholder: ideally passed from parent

    // In a real app, you might want to fetch this dynamic balance from the parent state
    // For now we match the screenshot style

    const containerClasses = orientation === 'vertical'
        ? "grid grid-cols-2 gap-2 w-full"
        : "flex gap-4 overflow-x-auto pb-4 scrollbar-hide";

    const cardClasses = orientation === 'vertical'
        ? "flex flex-col gap-2 group relative p-1 hover:opacity-80 transition-opacity"
        : "min-w-[140px] bg-[#1a1b1f] border border-white/5 rounded-lg p-3 flex flex-col gap-3 group hover:border-white/10 transition-colors relative";

    return (
        <div className={containerClasses}>
            {/* Holdings Card - First Item */}
            <div className={orientation === 'vertical' ? "flex flex-col gap-2 group relative p-1 hover:opacity-80 transition-opacity" : cardClasses}>
                <div className={`flex items-center justify-center transition-colors ${orientation === 'vertical' ? 'w-8 h-8 rounded-none' : 'w-8 h-8 bg-white/5 rounded-md group-hover:bg-white/10'}`}>
                    <User className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="flex flex-col">
                    <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest">Holdings</span>
                    <span className="text-sm font-bold text-white font-mono">{holdingsTotal}</span>
                </div>
            </div>

            {/* Project Cards */}
            {projectsData.map((project: Project) => (
                <a
                    key={project.id}
                    href={project.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={orientation === 'vertical' ? "flex flex-col gap-2 group relative p-1 hover:opacity-80 transition-opacity" : cardClasses}
                >
                    <div className={`flex items-center justify-center overflow-hidden transition-colors ${orientation === 'vertical' ? 'w-8 h-8 rounded-none' : 'w-8 h-8 bg-white/5 rounded-md group-hover:bg-white/10'}`}>
                        <img src={project.logo} alt={project.name} className="w-full h-full object-cover" />
                    </div>

                    <div className="flex flex-col">
                        <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest truncate max-w-[120px]" title={project.name}>
                            {project.name}
                        </span>
                        <span className="text-sm font-bold text-white font-mono">{project.balance}</span>
                    </div>

                    {/* Hover Effect: Show external link icon */}
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <ExternalLink className="w-3 h-3 text-white/40" />
                    </div>
                </a>
            ))}
        </div>
    );
}

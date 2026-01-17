"use client";

import { ProjectCards } from "./project-cards";

export function DashboardSidebar() {
    return (
        <div className="w-60 border border-white/5 h-[576px] rounded-none p-4 flex flex-col gap-4">
            <ProjectCards orientation="vertical" />
        </div>
    );
}

"use client";

import { useState, useEffect } from "react";

import { Loader2, TrendingUp } from "lucide-react";
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts';
import { ChartDataPoint } from "@/lib/movement-client";

export const GET_FUNGIBLE_ASSET_ACTIVITIES = `
query GetFungibleAssetActivities($ownerAddress: String!, $limit: Int, $offset: Int) {
  fungible_asset_activities(
    where: {
      owner_address: {_eq: $ownerAddress},
      is_transaction_success: {_eq: true}
    },
    order_by: {transaction_timestamp: desc},
    limit: $limit,
    offset: $offset
  ) {
    transaction_version
    transaction_timestamp
    amount
    asset_type
    type
    owner_address
    is_transaction_success
  }
}
`;

interface BalanceChartProps {
    data: ChartDataPoint[];
    isLoading: boolean;
    timeRange: "1D" | "1W" | "1M" | "3M" | "6M";
}

interface CustomTooltipProps {
    active?: boolean;
    payload?: Array<{
        payload: {
            displayDate: string;
        };
        value: number;
    }>;
}

const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
    if (active && payload && payload.length) {
        const item = payload[0];
        const data = item.payload;
        return (
            <div className="bg-black/80 backdrop-blur-md border border-white/10 p-2.5 shadow-2xl">
                <p className="text-[9px] font-mono text-white/40 mb-0.5 uppercase tracking-tight">{data.displayDate}</p>
                <p className="text-xs font-mono font-bold text-[#22c55e]">
                    {Number(item.value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })} MOVE
                </p>
            </div>
        );
    }
    return null;
};

export function BalanceChart({ data, isLoading, timeRange }: BalanceChartProps) {
    const filterChartData = (data: ChartDataPoint[]) => {
        if (data.length === 0) return [];
        const now = new Date();
        const startTime = new Date();

        switch (timeRange) {
            case "1D":
                startTime.setDate(now.getDate() - 1);
                break;
            case "1W":
                startTime.setDate(now.getDate() - 7);
                break;
            case "1M":
                startTime.setMonth(now.getMonth() - 1);
                break;
            case "3M":
                startTime.setMonth(now.getMonth() - 3);
                break;
            case "6M":
                startTime.setMonth(now.getMonth() - 6);
                break;
            default:
                return data;
        }

        startTime.setHours(0, 0, 0, 0);

        const filtered = data.filter(point => new Date(point.timestamp) >= startTime);

        if (filtered.length > 0) {
            const firstFilteredDate = new Date(filtered[0].timestamp);
            if (firstFilteredDate > startTime) {
                const pointBefore = [...data].reverse().find(p => new Date(p.timestamp) < startTime);
                const baselineBalance = pointBefore ? pointBefore.balance : filtered[0].balance;

                filtered.unshift({
                    timestamp: startTime.toISOString(),
                    date: startTime,
                    balance: baselineBalance,
                    displayDate: startTime.toLocaleDateString(),
                    transactions: 0
                });
            }
        }

        return filtered;
    };

    const filteredData = filterChartData(data);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    if (!isMounted) return <div className="flex-1 flex items-center justify-center min-h-0 w-full pt-4"><Loader2 className="w-5 h-5 animate-spin text-white/20" /></div>;

    return (
        <div className="flex-1 flex flex-col items-center justify-center h-[220px] relative w-full pt-4">
            {isLoading ? (
                <div className="absolute inset-0 flex items-center justify-center">
                    <Loader2 className="w-5 h-5 animate-spin text-white/20" />
                </div>
            ) : filteredData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={filteredData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                        <defs>
                            <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.2} />
                                <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.03)" />
                        <XAxis
                            dataKey="timestamp"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 8, fontFamily: 'monospace' }}
                            minTickGap={40}
                            tickFormatter={(val) => {
                                const d = new Date(val);
                                const year = d.getFullYear() === new Date().getFullYear() ? "" : ` / ${d.getFullYear()}`;
                                return `${d.getMonth() + 1}/${d.getDate()}${year}`;
                            }}
                        />
                        <YAxis
                            hide
                            domain={['dataMin', 'dataMax']}
                        />
                        <Tooltip
                            content={<CustomTooltip />}
                            cursor={{ stroke: '#22c55e', strokeWidth: 1, strokeDasharray: '3 3' }}
                        />
                        <Area
                            type="stepAfter"
                            dataKey="balance"
                            stroke="#22c55e"
                            strokeWidth={2}
                            fillOpacity={1}
                            fill="url(#colorBalance)"
                            animationDuration={800}
                            dot={true}
                            activeDot={{ r: 4, fill: '#22c55e', strokeWidth: 0 }}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center opacity-20">
                    <TrendingUp className="w-8 h-8 mb-2" />
                    <p className="text-[10px] font-mono uppercase">Insufficient history</p>
                </div>
            )}
        </div>
    );
}

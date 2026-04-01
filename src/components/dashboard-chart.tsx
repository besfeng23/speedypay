"use client";

import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart";

interface DashboardChartProps {
    data: any[];
    config: ChartConfig;
}

export function DashboardChart({ data, config }: DashboardChartProps) {
    return (
        <ChartContainer config={config} className="h-[300px] w-full">
            <BarChart accessibilityLayer data={data}>
                <CartesianGrid vertical={false} />
                <XAxis
                    dataKey="month"
                    tickLine={false}
                    tickMargin={10}
                    axisLine={false}
                    tickFormatter={(value) => value.slice(0, 3)}
                />
                <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent indicator="dot" />}
                />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar dataKey="volume" fill="var(--color-volume)" radius={4} />
                <Bar dataKey="fees" fill="var(--color-fees)" radius={4} />
            </BarChart>
        </ChartContainer>
    );
}

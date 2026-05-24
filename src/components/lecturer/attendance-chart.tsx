"use client";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

interface SessionDataPoint {
  date: string;
  attended: number;
  total: number;
}

const chartConfig = {
  attended: {
    label: "Attended",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig;

export function AttendanceChart({ data }: { data: SessionDataPoint[] }) {
  const formatted = data.map((d) => ({
    ...d,
    date: new Date(d.date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
  }));

  return (
    <ChartContainer config={chartConfig} className="aspect-[3/1] w-full">
      <BarChart data={formatted}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          fontSize={12}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          fontSize={12}
          allowDecimals={false}
        />
        <ChartTooltip
          cursor={{ fill: "var(--color-muted)", opacity: 0.3 }}
          content={<ChartTooltipContent />}
        />
        <Bar
          dataKey="attended"
          fill="var(--color-attended)"
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ChartContainer>
  );
}

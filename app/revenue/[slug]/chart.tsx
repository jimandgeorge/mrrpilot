"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

type Point = { month: string; mrr: number };

function ChartTooltip({ active, payload, label, hideRevenue }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900 text-white text-xs px-3 py-2 rounded-lg shadow-xl">
      {label && <p className="text-gray-400 mb-1">{label}</p>}
      <p className="text-white font-semibold">
        {hideRevenue ? "↑" : `£${Number(payload[0]?.value ?? 0).toLocaleString("en-GB")}`}
      </p>
    </div>
  );
}

export default function MrrChart({
  data,
  hideRevenue,
}: {
  data: Point[];
  hideRevenue: boolean;
}) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="pubGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.18} />
            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="#f3f4f6" />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 11, fill: "#9ca3af" }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "#9ca3af" }}
          tickLine={false}
          axisLine={false}
          width={hideRevenue ? 0 : 52}
          tickFormatter={hideRevenue ? () => "" : (v) => `£${v.toLocaleString("en-GB")}`}
        />
        <Tooltip content={(props) => <ChartTooltip {...props} hideRevenue={hideRevenue} />} />
        <Area
          type="monotone"
          dataKey="mrr"
          stroke="#6366f1"
          strokeWidth={2.5}
          fill="url(#pubGrad)"
          dot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

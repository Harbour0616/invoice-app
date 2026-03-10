"use client";

import { memo } from "react";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from "recharts";
import type { SiteProfit } from "./actions";

const fmt = (n: number) =>
  "¥" + Math.round(Math.abs(n)).toLocaleString("ja-JP");
const pct = (s: number, c: number) =>
  s === 0 ? 0 : +(((s - c) / s) * 100).toFixed(1);

const rateColor = (r: number) =>
  r >= 30 ? "#2D7A5F" : r >= 20 ? "#D4A017" : "#B85450";

type ChartRow = {
  name: string;
  fullName: string;
  原価: number;
  粗利益: number;
  粗利率: number;
  売上: number;
};

export const ProfitChart = memo(function ProfitChart({
  sites,
}: {
  sites: SiteProfit[];
}) {
  const data: ChartRow[] = sites.map((s) => ({
    name: s.name.length > 8 ? s.name.slice(0, 8) + "…" : s.name,
    fullName: s.name,
    原価: s.total_cost,
    粗利益: s.gross_profit,
    粗利率: pct(s.sales, s.total_cost),
    売上: s.sales,
  }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart
        data={data}
        margin={{ top: 16, right: 12, left: 4, bottom: 4 }}
        barCategoryGap="20%"
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="#e2e8f0"
          vertical={false}
        />
        <XAxis
          dataKey="name"
          tick={{ fill: "#64748b", fontSize: 10, fontWeight: 500 }}
          tickLine={false}
          axisLine={{ stroke: "#e2e8f0" }}
          angle={-20}
          textAnchor="end"
          height={50}
          interval={0}
        />
        <YAxis
          yAxisId="left"
          tick={{ fill: "#64748b", fontSize: 10, fontWeight: 500 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: number) =>
            v >= 1_000_000
              ? `${(v / 1_000_000).toFixed(0)}M`
              : v >= 1_000
                ? `${(v / 1_000).toFixed(0)}K`
                : String(v)
          }
          width={48}
        />
        <YAxis
          yAxisId="right"
          orientation="right"
          tick={{ fill: "#1e3a5f", fontSize: 10, fontWeight: 600 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: number) => `${v}%`}
          domain={[0, "auto"]}
          width={40}
        />
        <Tooltip
          content={<CustomTooltip />}
          cursor={{ fill: "rgba(30,58,95,0.04)" }}
        />
        <Legend
          iconType="circle"
          iconSize={8}
          wrapperStyle={{
            fontSize: 11,
            fontWeight: 500,
            color: "#475569",
            paddingTop: 4,
          }}
        />
        <Bar
          yAxisId="left"
          dataKey="原価"
          stackId="stack"
          fill="#cbd5e1"
          radius={[0, 0, 0, 0]}
        />
        <Bar
          yAxisId="left"
          dataKey="粗利益"
          stackId="stack"
          fill="#2c5282"
          radius={[3, 3, 0, 0]}
        />
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="粗利率"
          stroke="#1e3a5f"
          strokeWidth={2}
          dot={<RateDot />}
          activeDot={{ r: 7, stroke: "#1e3a5f", strokeWidth: 2, fill: "#fff" }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
});

function RateDot(props: any) {
  const { cx, cy, payload } = props;
  if (cx == null || cy == null) return null;
  const color = rateColor(payload?.粗利率 ?? 0);
  return (
    <circle
      cx={cx}
      cy={cy}
      r={5}
      fill={color}
      stroke="#fff"
      strokeWidth={2}
    />
  );
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  const color = rateColor(d.粗利率);

  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e2e8f0",
        borderRadius: 8,
        padding: "12px 16px",
        fontSize: 12,
        lineHeight: 1.9,
        boxShadow: "0 4px 12px rgba(30,58,95,0.08)",
      }}
    >
      <div
        style={{
          fontWeight: 700,
          color: "#1e293b",
          marginBottom: 6,
          fontSize: 13,
        }}
      >
        {d.fullName}
      </div>
      <div style={{ color: "#475569", fontFamily: "'Inter', monospace" }}>
        売上　: {fmt(d.売上)}
      </div>
      <div style={{ color: "#475569", fontFamily: "'Inter', monospace" }}>
        原価　: {fmt(d.原価)}
      </div>
      <div style={{ color: "#475569", fontFamily: "'Inter', monospace" }}>
        粗利益: {d.粗利益 >= 0 ? "+" : "-"}
        {fmt(d.粗利益)}
      </div>
      <div
        style={{
          borderTop: "1px solid #e2e8f0",
          marginTop: 6,
          paddingTop: 6,
          fontWeight: 700,
          fontFamily: "'Inter', monospace",
          color,
          fontSize: 13,
        }}
      >
        粗利率: {d.粗利率}%
      </div>
    </div>
  );
}

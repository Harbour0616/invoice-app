"use client";

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
} from "recharts";
import type { SiteProfit } from "./actions";

const fmt = (n: number) =>
  "¥" + Math.round(Math.abs(n)).toLocaleString("ja-JP");
const pct = (s: number, c: number) =>
  s === 0 ? 0 : +( ((s - c) / s) * 100 ).toFixed(1);

export function ProfitChart({ sites }: { sites: SiteProfit[] }) {
  const data = sites.map((s) => ({
    name: s.name.length > 10 ? s.name.slice(0, 10) + "…" : s.name,
    fullName: s.name,
    原価: s.total_cost,
    粗利益: s.gross_profit,
    粗利率: pct(s.sales, s.total_cost),
    売上: s.sales,
  }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" />
        <XAxis
          dataKey="name"
          tick={{ fill: "#8a9bb0", fontSize: 10, fontWeight: 500 }}
          tickLine={false}
          axisLine={false}
          angle={-20}
          textAnchor="end"
          height={50}
        />
        <YAxis
          yAxisId="left"
          tick={{ fill: "#8a9bb0", fontSize: 10, fontWeight: 500 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: number) => Math.round(v).toLocaleString("ja-JP")}
        />
        <YAxis
          yAxisId="right"
          orientation="right"
          tick={{ fill: "#2E8B9A", fontSize: 10, fontWeight: 500 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: number) => `${v}%`}
          domain={[0, "auto"]}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{ fontSize: 10, fontWeight: 500, color: "#6a8a9e" }}
        />
        <Bar
          yAxisId="left"
          dataKey="原価"
          stackId="stack"
          fill="#c8d8e8"
          barSize={40}
          radius={[0, 0, 0, 0]}
        />
        <Bar
          yAxisId="left"
          dataKey="粗利益"
          stackId="stack"
          fill="#1a7a4a"
          barSize={40}
          radius={[2, 2, 0, 0]}
        />
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="粗利率"
          stroke="#2E8B9A"
          strokeWidth={1.5}
          dot={{ fill: "#2E8B9A", stroke: "#fff", strokeWidth: 2, r: 4 }}
          activeDot={{ r: 6 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;

  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e2e6ec",
        borderRadius: 6,
        padding: 14,
        fontSize: 12,
        lineHeight: 1.8,
      }}
    >
      <div style={{ fontWeight: 600, color: "#1a2332", marginBottom: 4 }}>
        {d.fullName}
      </div>
      <div style={{ color: "#4a6a82", fontFamily: "'Inter', monospace" }}>
        原価　: {fmt(d.原価)}
      </div>
      <div style={{ color: "#4a6a82", fontFamily: "'Inter', monospace" }}>
        粗利益: {fmt(d.粗利益)}
      </div>
      <div style={{ color: "#4a6a82", fontFamily: "'Inter', monospace" }}>
        粗利率: {d.粗利率}%
      </div>
      <div
        style={{
          borderTop: "1px solid #e8ecf0",
          marginTop: 4,
          paddingTop: 4,
          color: "#4a6a82",
          fontFamily: "'Inter', monospace",
        }}
      >
        売上　: {fmt(d.売上)}
      </div>
    </div>
  );
}

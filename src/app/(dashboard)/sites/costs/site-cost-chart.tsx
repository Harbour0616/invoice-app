"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

type Props = {
  data: Record<string, string | number>[];
  accountKeys: { key: string; name: string; color: string }[];
};

function formatYen(value: number): string {
  if (value >= 10_000_000) return `${(value / 1_000_000).toFixed(0)}M`;
  if (value >= 10_000) return `${(value / 10_000).toFixed(0)}万`;
  return value.toLocaleString("ja-JP");
}

export function SiteCostChart({ data, accountKeys }: Props) {
  if (data.length === 0) return null;

  return (
    <div
      className="rounded-[20px] border border-border bg-card mb-6"
      style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.03)" }}
    >
      <div className="px-7 pt-6 pb-2">
        <h2 className="text-sm font-semibold text-foreground">科目別費用内訳</h2>
      </div>
      <div className="px-3 pb-5">
        <ResponsiveContainer width="100%" height={Math.max(280, data.length * 48 + 80)}>
          <BarChart
            data={data}
            layout="vertical"
            margin={{ left: 8, right: 24, top: 8, bottom: 0 }}
            barCategoryGap="20%"
          >
            <CartesianGrid horizontal={false} stroke="#EDF2F0" strokeDasharray="3 3" />
            <XAxis
              type="number"
              tickFormatter={formatYen}
              tick={{ fontSize: 11, fill: "#7B8A86" }}
              axisLine={{ stroke: "#E3E8E6" }}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={96}
              tick={{ fontSize: 12, fill: "#1F2D29", fontWeight: 500 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              cursor={{ fill: "rgba(47,158,119,0.04)" }}
              contentStyle={{
                borderRadius: 12,
                border: "1px solid #D8E5E0",
                boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                padding: "10px 14px",
                fontSize: 13,
              }}
              formatter={(value, name) => [
                `¥${Number(value).toLocaleString("ja-JP")}`,
                String(name),
              ]}
            />
            <Legend
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
            />
            {accountKeys.map((ak) => (
              <Bar
                key={ak.key}
                dataKey={ak.key}
                name={ak.name}
                stackId="cost"
                fill={ak.color}
                radius={[0, 0, 0, 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

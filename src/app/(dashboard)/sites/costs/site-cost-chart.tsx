"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

type Props = {
  data: Record<string, string | number>[];
  accountKeys: { key: string; name: string; color: string }[];
};

const COLORS = [
  "#2F9E77",
  "#3B82F6",
  "#F59E0B",
  "#8B5CF6",
  "#EF4444",
  "#06B6D4",
  "#EC4899",
  "#84CC16",
  "#F97316",
  "#6366F1",
];

function formatYen(value: number): string {
  if (value >= 10_000_000) return `${(value / 1_000_000).toFixed(0)}M`;
  if (value >= 10_000) return `${(value / 10_000).toFixed(0)}万`;
  return value.toLocaleString("ja-JP");
}

export function SiteCostChart({ data, accountKeys }: Props) {
  if (data.length === 0) return null;

  return (
    <div className="card mb-6">
      <h2 className="text-sm font-semibold text-foreground mb-4">科目別費用内訳</h2>
      <ResponsiveContainer width="100%" height={Math.max(300, data.length * 50 + 80)}>
        <BarChart data={data} layout="vertical" margin={{ left: 20, right: 20, top: 5, bottom: 5 }}>
          <XAxis type="number" tickFormatter={formatYen} tick={{ fontSize: 12 }} />
          <YAxis
            type="category"
            dataKey="name"
            width={100}
            tick={{ fontSize: 12 }}
          />
          <Tooltip
            formatter={(value, name) => [
              `¥${Number(value).toLocaleString("ja-JP")}`,
              String(name),
            ]}
          />
          <Legend />
          {accountKeys.map((ak) => (
            <Bar
              key={ak.key}
              dataKey={ak.key}
              name={ak.name}
              stackId="cost"
              fill={ak.color}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

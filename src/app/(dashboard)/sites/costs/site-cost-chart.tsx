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
  return value.toLocaleString("ja-JP");
}

function CustomYTick({ x, y, payload }: { x: number; y: number; payload: { value: string } }) {
  const text = payload.value;
  const CHAR_LIMIT = 8;
  if (text.length <= CHAR_LIMIT) {
    return (
      <text x={x} y={y} textAnchor="end" fill="#1F2D29" fontSize={12} fontWeight={500} dominantBaseline="central">
        {text}
      </text>
    );
  }
  const line1 = text.slice(0, CHAR_LIMIT);
  const line2 = text.slice(CHAR_LIMIT);
  return (
    <text x={x} y={y} textAnchor="end" fill="#1F2D29" fontSize={12} fontWeight={500}>
      <tspan x={x} dy="-0.5em">{line1}</tspan>
      <tspan x={x} dy="1.2em">{line2}</tspan>
    </text>
  );
}

export function SiteCostChart({ data, accountKeys }: Props) {
  if (data.length === 0) return null;

  return (
    <div
      className="rounded-[20px] border border-border bg-card mb-8"
      style={{ boxShadow: "0 1px 6px rgba(0,0,0,0.04)" }}
    >
      <div className="px-7 pt-6 pb-1 flex items-center justify-between">
        <h2 className="text-[13px] font-bold text-foreground tracking-wide">科目別費用内訳</h2>
        <span className="text-[11px] text-sub-text">{data.length} 現場</span>
      </div>
      <div className="px-4 pb-6">
        <ResponsiveContainer width="100%" height={Math.max(280, data.length * 48 + 80)}>
          <BarChart
            data={data}
            layout="vertical"
            margin={{ left: 8, right: 24, top: 8, bottom: 0 }}
            barCategoryGap="20%"
          >
            <CartesianGrid horizontal={false} stroke="#E8F0EC" strokeDasharray="4 4" />
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
              width={200}
              tick={CustomYTick as any}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              cursor={{ fill: "rgba(47,158,119,0.05)" }}
              contentStyle={{
                borderRadius: 14,
                border: "1px solid #D8E5E0",
                boxShadow: "0 6px 20px rgba(0,0,0,0.08)",
                padding: "12px 16px",
                fontSize: 13,
                lineHeight: 1.6,
              }}
              formatter={(value, name) => [
                `¥${Number(value).toLocaleString("ja-JP")}`,
                String(name),
              ]}
            />
            <Legend
              iconType="circle"
              iconSize={7}
              wrapperStyle={{ fontSize: 11, paddingTop: 16, color: "#7B8A86" }}
            />
            {accountKeys.map((ak, i) => (
              <Bar
                key={ak.key}
                dataKey={ak.key}
                name={ak.name}
                stackId="cost"
                fill={ak.color}
                radius={i === accountKeys.length - 1 ? [0, 4, 4, 0] : [0, 0, 0, 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

type SiteCost = { id: string; code: string; name: string; total: number };

type Props = {
  siteCosts: SiteCost[];
};

const C = {
  green: "#2F9E77",
  greenDark: "#1F7A5C",
  mint: "#DDF5EC",
  bg: "#F7FBF9",
  white: "#FFFFFF",
  text: "#1F2D29",
  sub: "#7B8A86",
  border: "#D8E5E0",
};

function formatNumber(n: number): string {
  return n.toLocaleString("ja-JP");
}

function CustomYTick({
  x,
  y,
  payload,
}: {
  x: number;
  y: number;
  payload: { value: string };
}) {
  const text = payload.value;
  const CHAR_LIMIT = 6;
  if (text.length <= CHAR_LIMIT) {
    return (
      <text
        x={x}
        y={y}
        textAnchor="end"
        fill={C.text}
        fontSize={11}
        fontWeight={500}
        dominantBaseline="central"
      >
        {text}
      </text>
    );
  }
  const line1 = text.slice(0, CHAR_LIMIT);
  const line2 = text.slice(CHAR_LIMIT);
  return (
    <text x={x} y={y} textAnchor="end" fill={C.text} fontSize={11} fontWeight={500}>
      <tspan x={x} dy="-0.5em">
        {line1}
      </tspan>
      <tspan x={x} dy="1.2em">
        {line2}
      </tspan>
    </text>
  );
}

export function DashboardContent({ siteCosts }: Props) {
  const grandTotal = siteCosts.reduce((sum, s) => sum + s.total, 0);
  const chartData = siteCosts.map((s) => ({ name: s.name, total: s.total }));

  return (
    <div
      style={{
        minHeight: "100vh",
        background: C.bg,
        padding: "0 0 40px",
        maxWidth: 480,
        margin: "0 auto",
      }}
    >
      {/* ヘッダー */}
      <div
        style={{
          padding: "20px 20px 16px",
        }}
      >
        <h1
          style={{
            fontSize: 20,
            fontWeight: 700,
            color: C.text,
            margin: 0,
          }}
        >
          現場別費用
        </h1>
      </div>

      {/* 合計カード */}
      <div
        style={{
          margin: "0 16px 20px",
          padding: "20px 20px",
          borderRadius: 16,
          background: `linear-gradient(135deg, ${C.white} 0%, #F0F9F4 60%, #E6F5ED 100%)`,
          boxShadow: "0 2px 10px rgba(47,158,119,0.07)",
          border: `1px solid ${C.border}`,
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: C.sub,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            marginBottom: 6,
          }}
        >
          税抜費用合計
        </div>
        <div
          style={{
            fontSize: 32,
            fontWeight: 800,
            fontFamily: "monospace",
            color: C.green,
            letterSpacing: "-0.02em",
            lineHeight: 1,
          }}
        >
          ¥{formatNumber(grandTotal)}
        </div>
      </div>

      {/* グラフカード */}
      {chartData.length > 0 && (
        <div
          style={{
            margin: "0 16px 20px",
            background: C.white,
            borderRadius: 16,
            border: `1px solid ${C.border}`,
            boxShadow: "0 1px 4px rgba(0,0,0,0.03)",
            overflow: "hidden",
          }}
        >
          <div style={{ padding: "16px 16px 4px" }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: C.text,
              }}
            >
              現場別内訳
            </div>
          </div>
          <div style={{ padding: "0 8px 16px" }}>
            <ResponsiveContainer
              width="100%"
              height={Math.max(180, chartData.length * 44 + 40)}
            >
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ left: 4, right: 16, top: 8, bottom: 0 }}
                barCategoryGap="24%"
              >
                <CartesianGrid
                  horizontal={false}
                  stroke="#E8F0EC"
                  strokeDasharray="4 4"
                />
                <XAxis
                  type="number"
                  tickFormatter={(v) => formatNumber(v)}
                  tick={{ fontSize: 10, fill: C.sub }}
                  axisLine={{ stroke: "#E3E8E6" }}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={100}
                  tick={CustomYTick as any}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: "rgba(47,158,119,0.05)" }}
                  contentStyle={{
                    borderRadius: 12,
                    border: `1px solid ${C.border}`,
                    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                    padding: "10px 14px",
                    fontSize: 13,
                  }}
                  formatter={(value) => [
                    `¥${Number(value).toLocaleString("ja-JP")}`,
                    "税抜金額",
                  ]}
                />
                <Bar
                  dataKey="total"
                  name="税抜金額"
                  fill={C.green}
                  radius={[0, 6, 6, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* 現場カード一覧 */}
      <div style={{ padding: "0 16px" }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: C.sub,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            marginBottom: 10,
          }}
        >
          現場一覧
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {siteCosts.map((site, idx) => {
            const pct = grandTotal > 0 ? (site.total / grandTotal) * 100 : 0;
            return (
              <div
                key={site.id}
                style={{
                  background: C.white,
                  borderRadius: 14,
                  border: `1px solid ${C.border}`,
                  padding: "14px 16px",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 6,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      minWidth: 0,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 11,
                        fontFamily: "monospace",
                        color: C.sub,
                        opacity: 0.6,
                        width: 18,
                        textAlign: "right",
                        flexShrink: 0,
                      }}
                    >
                      {idx + 1}
                    </span>
                    <span
                      style={{
                        fontSize: 15,
                        fontWeight: 600,
                        color: C.text,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {site.name}
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 500,
                      color: C.sub,
                      opacity: 0.7,
                      flexShrink: 0,
                      marginLeft: 8,
                    }}
                  >
                    {pct.toFixed(1)}%
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    justifyContent: "space-between",
                  }}
                >
                  <span style={{ fontSize: 12, color: C.sub }}>
                    {site.code}
                  </span>
                  <span
                    style={{
                      fontSize: 18,
                      fontWeight: 700,
                      fontFamily: "monospace",
                      color: C.text,
                    }}
                  >
                    ¥{formatNumber(site.total)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useMemo } from "react";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { getProfitData, type ProfitSummary, type SiteProfit } from "./actions";

/* ─── helpers ─── */

const fmt = (n: number) => `¥${n.toLocaleString("ja-JP")}`;
const fmtShort = (n: number) => {
  if (Math.abs(n) >= 100_000_000) return `${Math.round(n / 1_000_000)}百万`;
  if (Math.abs(n) >= 10_000_000) return `${(n / 10_000).toFixed(0)}万`;
  if (Math.abs(n) >= 1_000_000) return `${(n / 10_000).toFixed(0)}万`;
  return n.toLocaleString("ja-JP");
};

function getVerdict(margin: number | null): { label: string; style: string } {
  if (margin === null) return { label: "—", style: "bg-muted text-sub-text" };
  if (margin >= 30) return { label: "正常", style: "bg-accent/10 text-accent" };
  if (margin >= 20) return { label: "正常", style: "bg-accent/10 text-accent" };
  if (margin >= 10) return { label: "要注意", style: "bg-yellow-50 text-yellow-700 border border-yellow-200" };
  if (margin >= 0) return { label: "危険", style: "bg-red-50 text-red-600 border border-red-200" };
  return { label: "赤字", style: "bg-red-100 text-red-700 border border-red-300" };
}

function marginColor(margin: number | null): string {
  if (margin === null) return "text-sub-text";
  if (margin >= 30) return "text-accent";
  if (margin >= 20) return "text-green-600";
  if (margin >= 10) return "text-yellow-600";
  return "text-red-500";
}

/* ─── main component ─── */

export function ProfitClient({ initialData }: { initialData: ProfitSummary }) {
  const [yearMonth, setYearMonth] = useState("");
  const [status, setStatus] = useState("all");
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(false);

  const handleFilter = async () => {
    setLoading(true);
    const result = await getProfitData(yearMonth || undefined, status || undefined);
    setData(result);
    setLoading(false);
  };

  const handleReset = async () => {
    setYearMonth("");
    setStatus("all");
    setLoading(true);
    const result = await getProfitData(undefined, undefined);
    setData(result);
    setLoading(false);
  };

  /* derived stats */
  const activeSites = useMemo(() => data.sites.filter((s) => s.sales > 0 || s.total_cost > 0), [data.sites]);

  const alertSites = useMemo(
    () => activeSites.filter((s) => s.gross_margin !== null && s.gross_margin < 20).sort((a, b) => (a.gross_margin ?? 0) - (b.gross_margin ?? 0)),
    [activeSites]
  );

  const countWarning = alertSites.filter((s) => s.gross_margin !== null && s.gross_margin >= 10 && s.gross_margin < 20).length;
  const countDanger = alertSites.filter((s) => s.gross_margin !== null && s.gross_margin >= 0 && s.gross_margin < 10).length;
  const countDeficit = alertSites.filter((s) => s.gross_margin !== null && s.gross_margin < 0).length;

  /* margin distribution */
  const distGood = activeSites.filter((s) => s.gross_margin !== null && s.gross_margin >= 30).length;
  const distOk = activeSites.filter((s) => s.gross_margin !== null && s.gross_margin >= 20 && s.gross_margin < 30).length;
  const distBad = activeSites.filter((s) => s.gross_margin !== null && s.gross_margin < 20).length;

  const topSite = useMemo(() => {
    const sorted = [...activeSites].filter((s) => s.gross_margin !== null).sort((a, b) => (b.gross_margin ?? 0) - (a.gross_margin ?? 0));
    return sorted[0] ?? null;
  }, [activeSites]);
  const lowSite = useMemo(() => {
    const sorted = [...activeSites].filter((s) => s.gross_margin !== null).sort((a, b) => (a.gross_margin ?? 0) - (b.gross_margin ?? 0));
    return sorted[0] ?? null;
  }, [activeSites]);

  /* chart data */
  const chartData = useMemo(
    () =>
      data.sites
        .filter((s) => s.sales > 0 || s.total_cost > 0)
        .map((s) => ({
          name: s.name.length > 8 ? s.name.slice(0, 8) + "…" : s.name,
          粗利益: s.gross_profit,
          原価: s.total_cost,
          粗利率: s.gross_margin ?? 0,
        })),
    [data.sites]
  );

  const costRatio = data.totalSales > 0 ? Math.round((data.totalCost / data.totalSales) * 1000) / 10 : null;

  return (
    <div>
      <h1 className="text-xl font-bold mb-6">現場別利益レポート</h1>

      {/* ─── フィルター ─── */}
      <div className="bg-card rounded-[10px] shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-5 mb-6">
        <div className="flex items-center gap-1.5 mb-4">
          <span className="w-1 h-4 bg-primary rounded-full" />
          <h2 className="text-sm font-bold">完工フィルタ</h2>
        </div>
        <div className="flex items-end gap-3 flex-wrap">
          <div>
            <label className="label">完工年</label>
            <input
              type="month"
              value={yearMonth}
              onChange={(e) => setYearMonth(e.target.value)}
              className="input-bordered"
            />
          </div>
          <div>
            <label className="label">判定</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="select-bordered"
            >
              <option value="all">すべて</option>
              <option value="進行中">進行中</option>
              <option value="完了">完了</option>
              <option value="中止">中止</option>
            </select>
          </div>
          <button
            onClick={handleFilter}
            disabled={loading}
            className="px-5 h-11 bg-primary text-white rounded-lg hover:bg-primary-hover disabled:opacity-50 text-sm cursor-pointer"
          >
            {loading ? "集計中..." : "表示"}
          </button>
          <button
            onClick={handleReset}
            className="px-4 h-11 border border-border rounded-lg text-sm hover:bg-muted cursor-pointer"
          >
            クリア
          </button>
        </div>
      </div>

      {/* ─── サマリーカード (4枚) ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* 売上合計 */}
        <div className="bg-card rounded-[10px] shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-5 border-l-4 border-l-blue-500">
          <div className="text-xs text-sub-text font-medium mb-1">売上合計</div>
          <div className="text-2xl font-bold font-mono">{fmt(data.totalSales)}</div>
          <div className="text-xs text-sub-text mt-1">案件数: {data.siteCount} 件</div>
        </div>
        {/* 原価合計 */}
        <div className="bg-card rounded-[10px] shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-5 border-l-4 border-l-gray-400">
          <div className="text-xs text-sub-text font-medium mb-1">原価合計</div>
          <div className="text-2xl font-bold font-mono">{fmt(data.totalCost)}</div>
          <div className="text-xs text-sub-text mt-1">売上比: {costRatio !== null ? `${costRatio}%` : "—"}</div>
        </div>
        {/* 粗利合計 */}
        <div className="bg-card rounded-[10px] shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-5 border-l-4 border-l-green-500">
          <div className="text-xs text-sub-text font-medium mb-1">粗利合計</div>
          <div className={`text-2xl font-bold font-mono ${data.totalProfit >= 0 ? "text-green-600" : "text-red-500"}`}>
            {fmt(data.totalProfit)}
          </div>
          <div className="text-xs text-sub-text mt-1">売上 − 原価</div>
        </div>
        {/* 平均粗利率 */}
        <div className="bg-card rounded-[10px] shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-5 border-l-4 border-l-amber-500">
          <div className="text-xs text-sub-text font-medium mb-1">平均粗利率</div>
          <div className={`text-2xl font-bold font-mono ${marginColor(data.profitRate)}`}>
            {data.profitRate !== null ? `${data.profitRate}%` : "—"}
          </div>
          <div className="text-xs text-sub-text mt-1">
            {data.profitRate !== null && data.profitRate >= 20
              ? "標準水準"
              : data.profitRate !== null && data.profitRate >= 10
                ? "要注意水準"
                : data.profitRate !== null
                  ? "危険水準"
                  : "—"}
          </div>
        </div>
      </div>

      {/* ─── ステータス件数カード ─── */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: "要注意", count: countWarning, color: "text-yellow-600" },
          { label: "危険", count: countDanger, color: "text-red-500" },
          { label: "赤字", count: countDeficit, color: "text-red-700" },
          { label: "完工間近", count: data.sites.filter((s) => s.status === "進行中" && s.end_date && new Date(s.end_date) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)).length, color: "text-blue-600" },
        ].map((item) => (
          <div
            key={item.label}
            className="bg-card rounded-[10px] shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-4 text-center"
          >
            <div className="text-xs text-sub-text mb-1">{item.label}</div>
            <div className={`text-2xl font-bold ${item.color}`}>
              {item.count}<span className="text-sm font-normal text-sub-text ml-0.5">件</span>
            </div>
          </div>
        ))}
      </div>

      {/* ─── 要確認現場 ─── */}
      {alertSites.length > 0 && (
        <div className="bg-card rounded-[10px] shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-5 mb-6 border-l-4 border-l-red-400">
          <div className="flex items-center gap-1.5 mb-3">
            <span className="text-red-500 text-sm">&#9888;</span>
            <h2 className="text-sm font-bold">要確認現場</h2>
          </div>
          <div className="space-y-2">
            {alertSites.slice(0, 5).map((site) => {
              const v = getVerdict(site.gross_margin);
              return (
                <div key={site.id} className="flex items-center justify-between py-2 border-b border-table-separator last:border-b-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${v.style}`}>{v.label}</span>
                    <span className="text-sm">{site.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-sm font-bold font-mono ${marginColor(site.gross_margin)}`}>
                      {site.gross_margin !== null ? `${site.gross_margin}%` : "—"}
                    </span>
                    <span className="text-xs text-sub-text">
                      {site.gross_margin !== null && site.gross_margin < 0
                        ? "赤字"
                        : site.gross_margin !== null && site.gross_margin < 10
                          ? "危険水準"
                          : "粗利率低下"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── 工事別利益チャート & 粗利率分布 ─── */}
      {chartData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* チャート */}
          <div className="lg:col-span-2 bg-card rounded-[10px] shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-5">
            <div className="flex items-center gap-1.5 mb-4">
              <span className="w-1 h-4 bg-primary rounded-full" />
              <h2 className="text-sm font-bold">工事別利益</h2>
            </div>
            <ResponsiveContainer width="100%" height={320}>
              <ComposedChart data={chartData} margin={{ left: 8, right: 8, top: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E8F0EC" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: "#7B8A86" }}
                  axisLine={{ stroke: "#E3E8E6" }}
                  tickLine={false}
                />
                <YAxis
                  yAxisId="left"
                  tickFormatter={fmtShort}
                  tick={{ fontSize: 11, fill: "#7B8A86" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tickFormatter={(v: number) => `${v}%`}
                  tick={{ fontSize: 11, fill: "#7B8A86" }}
                  axisLine={false}
                  tickLine={false}
                  domain={[0, 50]}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 10,
                    border: "1px solid #D8E5E0",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                    fontSize: 12,
                  }}
                  formatter={(value, name) =>
                    name === "粗利率" ? [`${value}%`, name] : [fmt(Number(value)), name]
                  }
                />
                <Legend iconSize={10} wrapperStyle={{ fontSize: 12 }} />
                <Bar yAxisId="left" dataKey="粗利益" fill="#2F9E77" radius={[4, 4, 0, 0]} barSize={36} />
                <Bar yAxisId="left" dataKey="原価" fill="#D1D5DB" radius={[4, 4, 0, 0]} barSize={36} />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="粗利率"
                  stroke="#1D4ED8"
                  strokeWidth={2}
                  dot={{ fill: "#1D4ED8", r: 4 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* 粗利率分布 */}
          <div className="bg-card rounded-[10px] shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-5">
            <div className="flex items-center gap-1.5 mb-4">
              <span className="w-1 h-4 bg-primary rounded-full" />
              <h2 className="text-sm font-bold">粗利率分布</h2>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-6">
              {[
                { count: distGood, total: activeSites.length, label: "良好", sub: "≧30%", color: "text-accent", bar: "bg-accent" },
                { count: distOk, total: activeSites.length, label: "注意", sub: "20-30%", color: "text-yellow-600", bar: "bg-yellow-400" },
                { count: distBad, total: activeSites.length, label: "要改善", sub: "<20%", color: "text-red-500", bar: "bg-red-400" },
              ].map((d) => (
                <div key={d.label} className="text-center">
                  <div className={`text-3xl font-bold ${d.color}`}>{d.count}</div>
                  <div className="text-xs text-sub-text">
                    {d.count}件 / {activeSites.length > 0 ? Math.round((d.count / activeSites.length) * 100) : 0}%
                  </div>
                  <div className="text-xs text-sub-text mt-0.5">{d.label}</div>
                  <div className="text-[10px] text-sub-text">{d.sub}</div>
                  <div className={`h-1 rounded-full mt-2 ${d.bar}`} />
                </div>
              ))}
            </div>

            {/* TOP / LOW */}
            <div className="border-t border-border pt-4">
              <div className="flex items-center gap-1.5 mb-3">
                <span className="w-1 h-4 bg-primary rounded-full" />
                <span className="text-xs font-bold">TOP / LOW</span>
              </div>
              {topSite && (
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent/10 text-accent font-semibold mr-2">TOP</span>
                    <span className="text-sm">{topSite.name}</span>
                    <div className="text-[10px] text-sub-text ml-10">{topSite.code}</div>
                  </div>
                  <span className="text-lg font-bold font-mono text-accent">{topSite.gross_margin}%</span>
                </div>
              )}
              {lowSite && (
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-50 text-red-500 font-semibold mr-2">LOW</span>
                    <span className="text-sm">{lowSite.name}</span>
                    <div className="text-[10px] text-sub-text ml-10">{lowSite.code}</div>
                  </div>
                  <span className={`text-lg font-bold font-mono ${marginColor(lowSite.gross_margin)}`}>{lowSite.gross_margin}%</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── 工事一覧 ─── */}
      <div className="bg-card rounded-[10px] shadow-[0_2px_8px_rgba(0,0,0,0.04)] overflow-hidden">
        <div className="px-5 pt-5 pb-3 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="w-1 h-4 bg-primary rounded-full" />
            <h2 className="text-sm font-bold">工事一覧</h2>
          </div>
          <div className="flex items-center gap-3 text-[10px]">
            <span className="text-sm text-sub-text">{data.sites.length} 件</span>
            <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-accent inline-block" /> ≧30%</span>
            <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-yellow-400 inline-block" /> 10-30%</span>
            <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-red-400 inline-block" /> &lt;10%</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border">
              <tr>
                <th className="text-center px-3 py-3 text-xs text-sub-text font-semibold w-8">#</th>
                <th className="text-left px-3 py-3 text-xs text-sub-text font-semibold whitespace-nowrap">工事番号</th>
                <th className="text-left px-3 py-3 text-xs text-sub-text font-semibold whitespace-nowrap">工事名</th>
                <th className="text-right px-3 py-3 text-xs text-sub-text font-semibold whitespace-nowrap">請負金額</th>
                <th className="text-right px-3 py-3 text-xs text-sub-text font-semibold whitespace-nowrap">原価合計</th>
                <th className="text-right px-3 py-3 text-xs text-sub-text font-semibold whitespace-nowrap">粗利</th>
                <th className="text-center px-3 py-3 text-xs text-sub-text font-semibold whitespace-nowrap">粗利率</th>
                <th className="text-center px-3 py-3 text-xs text-sub-text font-semibold whitespace-nowrap">判定</th>
                <th className="text-left px-3 py-3 text-xs text-sub-text font-semibold whitespace-nowrap">要注意理由</th>
                <th className="text-center px-3 py-3 text-xs text-sub-text font-semibold whitespace-nowrap">工期開始</th>
                <th className="text-center px-3 py-3 text-xs text-sub-text font-semibold whitespace-nowrap">工期完了</th>
              </tr>
            </thead>
            <tbody>
              {data.sites.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-8 text-center text-sub-text">
                    データがありません
                  </td>
                </tr>
              ) : (
                data.sites.map((site, i) => {
                  const verdict = getVerdict(site.gross_margin);
                  const reason = getAlertReason(site);
                  return (
                    <tr key={site.id} className="border-b border-table-separator last:border-b-0 hover:bg-table-row-hover">
                      <td className="text-center px-3 py-3 text-sub-text">{i + 1}</td>
                      <td className="px-3 py-3 font-mono whitespace-nowrap">{site.code}</td>
                      <td className="px-3 py-3 whitespace-nowrap">{site.name}</td>
                      <td className="px-3 py-3 text-right font-mono whitespace-nowrap">{site.contract_amount != null ? fmt(site.contract_amount) : "—"}</td>
                      <td className="px-3 py-3 text-right font-mono whitespace-nowrap">{fmt(site.total_cost)}</td>
                      <td className={`px-3 py-3 text-right font-mono whitespace-nowrap font-medium ${site.gross_profit >= 0 ? "text-foreground" : "text-red-500"}`}>
                        {fmt(site.gross_profit)}
                      </td>
                      <td className="px-3 py-3 text-center whitespace-nowrap">
                        <MarginPill margin={site.gross_margin} />
                      </td>
                      <td className="px-3 py-3 text-center whitespace-nowrap">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${verdict.style}`}>{verdict.label}</span>
                      </td>
                      <td className="px-3 py-3 text-xs text-sub-text whitespace-nowrap">{reason}</td>
                      <td className="px-3 py-3 text-center text-xs whitespace-nowrap">{site.start_date || "—"}</td>
                      <td className="px-3 py-3 text-center text-xs whitespace-nowrap">{site.end_date || "—"}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ─── sub-components ─── */

function MarginPill({ margin }: { margin: number | null }) {
  if (margin === null) return <span className="text-sub-text text-xs">—</span>;
  const bg =
    margin >= 30
      ? "bg-accent text-white"
      : margin >= 20
        ? "bg-green-100 text-green-700"
        : margin >= 10
          ? "bg-yellow-100 text-yellow-700"
          : margin >= 0
            ? "bg-red-100 text-red-600"
            : "bg-red-500 text-white";
  return (
    <span className={`inline-block text-xs font-bold font-mono px-2.5 py-1 rounded-full ${bg}`}>
      {margin}%
    </span>
  );
}

function getAlertReason(site: SiteProfit): string {
  if (site.gross_margin === null) return "—";
  if (site.gross_margin < 0) return "赤字";
  if (site.gross_margin < 10) return "危険水準";
  if (site.gross_margin < 20) return "粗利率低下";
  return "—";
}

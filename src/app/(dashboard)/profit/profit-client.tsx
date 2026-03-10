"use client";

import { useState } from "react";
import { getProfitData, type ProfitSummary, type SiteProfit } from "./actions";

const fmt = (n: number) => `¥${n.toLocaleString("ja-JP")}`;

function MarginBadge({ margin }: { margin: number | null }) {
  if (margin === null) return <span className="text-sub-text">—</span>;
  const style =
    margin >= 20
      ? "bg-accent/10 text-accent"
      : margin >= 10
        ? "bg-yellow-50 text-yellow-600"
        : "bg-red-50 text-red-500";
  return (
    <span className={`text-xs px-2 py-1 rounded-full font-medium ${style}`}>
      {margin}%
    </span>
  );
}

export function ProfitClient({ initialData }: { initialData: ProfitSummary }) {
  const now = new Date();
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

  const summaryCards = [
    { label: "売上合計", value: fmt(data.totalSales), color: "text-blue-600" },
    { label: "原価合計", value: fmt(data.totalCost), color: "text-foreground" },
    { label: "粗利合計", value: fmt(data.totalProfit), color: data.totalProfit >= 0 ? "text-accent" : "text-red-500" },
    { label: "粗利率", value: data.profitRate !== null ? `${data.profitRate}%` : "—", color: data.profitRate !== null && data.profitRate >= 20 ? "text-accent" : data.profitRate !== null && data.profitRate >= 10 ? "text-yellow-600" : "text-red-500" },
  ];

  return (
    <div>
      <h1 className="text-xl font-bold mb-6">現場別利益ダッシュボード</h1>

      {/* フィルター */}
      <div className="flex items-end gap-3 mb-6 flex-wrap">
        <div>
          <label className="label">対象月</label>
          <input
            type="month"
            value={yearMonth}
            onChange={(e) => setYearMonth(e.target.value)}
            className="input-bordered"
            placeholder="全期間"
          />
        </div>
        <div>
          <label className="label">ステータス</label>
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
          className="px-4 h-11 bg-primary text-white rounded-lg hover:bg-primary-hover disabled:opacity-50 text-sm cursor-pointer"
        >
          {loading ? "集計中..." : "表示"}
        </button>
        {yearMonth && (
          <button
            onClick={() => { setYearMonth(""); setTimeout(handleFilter, 0); }}
            className="px-4 h-11 border border-border rounded-lg text-sm hover:bg-muted cursor-pointer"
          >
            全期間に戻す
          </button>
        )}
      </div>

      {/* サマリーカード */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {summaryCards.map((card) => (
          <div
            key={card.label}
            className="bg-card rounded-[10px] shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-5"
          >
            <div className="text-xs text-sub-text font-medium mb-2">{card.label}</div>
            <div className={`text-xl font-bold font-mono ${card.color}`}>{card.value}</div>
          </div>
        ))}
      </div>

      {/* 現場別テーブル */}
      <div className="bg-card rounded-[10px] shadow-[0_2px_8px_rgba(0,0,0,0.04)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border">
              <tr>
                <th className="text-left px-4 py-3.5 text-xs text-sub-text font-semibold uppercase tracking-wider whitespace-nowrap">現場</th>
                <th className="text-right px-4 py-3.5 text-xs text-sub-text font-semibold uppercase tracking-wider whitespace-nowrap">請負金額</th>
                <th className="text-right px-4 py-3.5 text-xs text-sub-text font-semibold uppercase tracking-wider whitespace-nowrap">売上</th>
                <th className="text-right px-4 py-3.5 text-xs text-sub-text font-semibold uppercase tracking-wider whitespace-nowrap">支払原価</th>
                <th className="text-right px-4 py-3.5 text-xs text-sub-text font-semibold uppercase tracking-wider whitespace-nowrap">労務費</th>
                <th className="text-right px-4 py-3.5 text-xs text-sub-text font-semibold uppercase tracking-wider whitespace-nowrap">原価合計</th>
                <th className="text-right px-4 py-3.5 text-xs text-sub-text font-semibold uppercase tracking-wider whitespace-nowrap">粗利</th>
                <th className="text-center px-4 py-3.5 text-xs text-sub-text font-semibold uppercase tracking-wider whitespace-nowrap">粗利率</th>
              </tr>
            </thead>
            <tbody>
              {data.sites.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-sub-text">
                    データがありません
                  </td>
                </tr>
              ) : (
                <>
                  {data.sites.map((site) => (
                    <tr key={site.id} className="border-b border-table-separator last:border-b-0 hover:bg-table-row-hover">
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="font-medium">{site.code} - {site.name}</div>
                        <StatusBadge status={site.status} />
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono whitespace-nowrap">{site.contract_amount != null ? fmt(site.contract_amount) : "—"}</td>
                      <td className="px-4 py-3.5 text-right font-mono whitespace-nowrap text-blue-600">{fmt(site.sales)}</td>
                      <td className="px-4 py-3.5 text-right font-mono whitespace-nowrap">{fmt(site.invoice_cost)}</td>
                      <td className="px-4 py-3.5 text-right font-mono whitespace-nowrap">{fmt(site.labor_cost)}</td>
                      <td className="px-4 py-3.5 text-right font-mono whitespace-nowrap">{fmt(site.total_cost)}</td>
                      <td className={`px-4 py-3.5 text-right font-mono whitespace-nowrap font-medium ${site.gross_profit >= 0 ? "text-accent" : "text-red-500"}`}>
                        {fmt(site.gross_profit)}
                      </td>
                      <td className="px-4 py-3.5 text-center whitespace-nowrap">
                        <MarginBadge margin={site.gross_margin} />
                      </td>
                    </tr>
                  ))}
                  {/* 合計行 */}
                  <tr className="bg-muted font-semibold border-t-2 border-border">
                    <td className="px-4 py-3.5">合計</td>
                    <td className="px-4 py-3.5 text-right font-mono whitespace-nowrap">
                      {fmt(data.sites.reduce((s, r) => s + (r.contract_amount || 0), 0))}
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono whitespace-nowrap text-blue-600">{fmt(data.totalSales)}</td>
                    <td className="px-4 py-3.5 text-right font-mono whitespace-nowrap">
                      {fmt(data.sites.reduce((s, r) => s + r.invoice_cost, 0))}
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono whitespace-nowrap">
                      {fmt(data.sites.reduce((s, r) => s + r.labor_cost, 0))}
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono whitespace-nowrap">{fmt(data.totalCost)}</td>
                    <td className={`px-4 py-3.5 text-right font-mono whitespace-nowrap ${data.totalProfit >= 0 ? "text-accent" : "text-red-500"}`}>
                      {fmt(data.totalProfit)}
                    </td>
                    <td className="px-4 py-3.5 text-center whitespace-nowrap">
                      <MarginBadge margin={data.profitRate} />
                    </td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const style =
    status === "進行中"
      ? "bg-accent/10 text-accent"
      : status === "中止"
        ? "bg-red-50 text-red-500"
        : "bg-muted text-sub-text";
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full ${style} ml-1`}>{status}</span>
  );
}

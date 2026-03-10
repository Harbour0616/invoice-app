"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import {
  getProfitData,
  type ProfitSummary,
  type SiteProfit,
  type AlertStatus,
} from "./actions";
import "./koji-dashboard.css";

/* Chart.jsはSSR不可のためdynamic importでクライアントのみ読み込み */
const ProfitChart = dynamic(
  () => import("./profit-chart").then((m) => m.ProfitChart),
  {
    ssr: false,
    loading: () => (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#6B8399", fontSize: 13 }}>
        グラフ読み込み中...
      </div>
    ),
  }
);

/* ── Utility ── */
const fmt = (n: number) => "¥" + Math.round(Math.abs(n)).toLocaleString("ja-JP");
const pct = (s: number, c: number) => (s === 0 ? 0 : ((s - c) / s) * 100);
const clsRate = (r: number) => (r >= 30 ? "high" : r >= 20 ? "mid" : "low");

const ALERT_COLORS: Record<AlertStatus, string> = {
  赤字: "#B85450",
  危険: "#e07b39",
  要注意: "#d4a017",
  完工間近: "#7b5ea7",
  正常: "#1a7a4a",
};

/* ════════════════════════════════════════════
   Main Component
════════════════════════════════════════════ */
export function ProfitClient({ initialData }: { initialData: ProfitSummary }) {
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("all");
  const [alertFilter, setAlertFilter] = useState("all");

  const handleFilter = useCallback(
    async (newStatus?: string, newAlert?: string) => {
      setLoading(true);
      const result = await getProfitData(
        undefined,
        newStatus ?? status,
        newAlert ?? alertFilter
      );
      setData(result);
      setLoading(false);
    },
    [status, alertFilter]
  );

  const onStatusChange = (val: string) => {
    setStatus(val);
    handleFilter(val, alertFilter);
  };

  const onAlertFilterChange = (val: string) => {
    setAlertFilter(val);
    handleFilter(status, val);
  };

  const alertedSites = data.sites.filter((s) => s.alert_status !== "正常");

  return (
    <div className="koji-wrap" style={{ background: "#F4F7FB" }}>
      <FilterBar
        status={status}
        alertFilter={alertFilter}
        onStatusChange={onStatusChange}
        onAlertFilterChange={onAlertFilterChange}
      />

      {loading ? (
        <div className="koji-loading">
          <div className="koji-spinner" />
          読み込み中...
        </div>
      ) : (
        <>
          <KpiStrip data={data} />
          <AlertStrip counts={data.alertCounts} />
          {alertedSites.length > 0 && <AlertPanel sites={alertedSites} />}
          <ChartSection sites={data.sites} />
          <TableSection sites={data.sites} />
        </>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════
   Filter Bar
════════════════════════════════════════════ */
function FilterBar({
  status,
  alertFilter,
  onStatusChange,
  onAlertFilterChange,
}: {
  status: string;
  alertFilter: string;
  onStatusChange: (v: string) => void;
  onAlertFilterChange: (v: string) => void;
}) {
  return (
    <div className="koji-filter-section">
      <div className="koji-sec-label">フィルタ</div>
      <div className="koji-panel">
        <div className="koji-panel-body" style={{ padding: "14px 24px" }}>
          <div className="koji-filter-bar">
            <div className="koji-filter-stage">
              <div className="koji-filter-label">ステータス</div>
              <div className="koji-filter-select-wrap">
                <select
                  className={`koji-filter-select${status !== "all" ? " has-value" : ""}`}
                  value={status}
                  onChange={(e) => onStatusChange(e.target.value)}
                >
                  <option value="all">すべて</option>
                  <option value="進行中">進行中</option>
                  <option value="完了">完了</option>
                  <option value="中止">中止</option>
                </select>
              </div>
            </div>
            <div className="koji-filter-stage">
              <div className="koji-filter-arrow">&rsaquo;</div>
              <div className="koji-filter-label">判定</div>
              <div className="koji-filter-select-wrap">
                <select
                  className={`koji-filter-select${alertFilter !== "all" ? " has-value" : ""}`}
                  value={alertFilter}
                  onChange={(e) => onAlertFilterChange(e.target.value)}
                >
                  <option value="all">すべて</option>
                  <option value="要注意">要注意のみ</option>
                  <option value="危険">危険のみ</option>
                  <option value="赤字">赤字のみ</option>
                </select>
              </div>
            </div>
            {(status !== "all" || alertFilter !== "all") && (
              <>
                <div className="koji-filter-sep" />
                <div className="koji-filter-active-badge">フィルタ適用中</div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════
   KPI Strip
════════════════════════════════════════════ */
function KpiStrip({ data }: { data: ProfitSummary }) {
  const profitClass = data.totalProfit >= 0 ? "pos" : "neg";
  const marginClass =
    data.profitRate !== null
      ? data.profitRate >= 30 ? "green" : data.profitRate >= 20 ? "yellow" : "red"
      : "";

  return (
    <div className="koji-kpi-strip">
      <div className="koji-kpi">
        <div className="koji-kpi-label">売上合計</div>
        <div className="koji-kpi-val">{fmt(data.totalSales)}</div>
        <div className="koji-kpi-sub">案件数: {data.sites.length} 件</div>
      </div>
      <div className="koji-kpi">
        <div className="koji-kpi-label">原価合計</div>
        <div className="koji-kpi-val">{fmt(data.totalCost)}</div>
        <div className="koji-kpi-sub">
          売上比: {data.totalSales > 0 ? ((data.totalCost / data.totalSales) * 100).toFixed(1) : "0"}%
        </div>
      </div>
      <div className="koji-kpi">
        <div className="koji-kpi-label">粗利合計</div>
        <div className={`koji-kpi-val ${profitClass}`}>{fmt(data.totalProfit)}</div>
        <div className="koji-kpi-sub">前期比: —</div>
      </div>
      <div className="koji-kpi">
        <div className="koji-kpi-label">平均粗利率</div>
        <div className={`koji-kpi-val ${marginClass}`}>
          {data.profitRate !== null ? `${data.profitRate}%` : "——"}
        </div>
        <div className="koji-kpi-sub">
          {data.profitRate !== null && data.profitRate >= 20 ? "健全水準" : data.profitRate !== null ? "要改善" : "——"}
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════
   Alert Strip
════════════════════════════════════════════ */
function AlertStrip({ counts }: { counts: ProfitSummary["alertCounts"] }) {
  return (
    <div className="koji-alert-strip">
      <div className="koji-alert-card" style={{ borderTopColor: "#d4a017" }}>
        <div className="koji-alert-label">要注意</div>
        <div className="koji-alert-val">{counts.caution} 件</div>
      </div>
      <div className="koji-alert-card" style={{ borderTopColor: "#e07b39" }}>
        <div className="koji-alert-label">危険</div>
        <div className="koji-alert-val">{counts.danger} 件</div>
      </div>
      <div className="koji-alert-card" style={{ borderTopColor: "#B85450" }}>
        <div className="koji-alert-label">赤字</div>
        <div className="koji-alert-val">{counts.deficit} 件</div>
      </div>
      <div className="koji-alert-card" style={{ borderTopColor: "#7b5ea7" }}>
        <div className="koji-alert-label">完工間近</div>
        <div className="koji-alert-val">{counts.deadline} 件</div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════
   Alert Panel
════════════════════════════════════════════ */
function AlertPanel({ sites }: { sites: SiteProfit[] }) {
  return (
    <div className="alert-panel">
      <div className="alert-panel-title">⚠ 要確認現場</div>
      {sites.map((site) => {
        const rate = pct(site.sales, site.total_cost);
        return (
          <div key={site.id} className="alert-panel-row">
            <span className="alert-badge" style={{ background: ALERT_COLORS[site.alert_status] }}>
              {site.alert_status}
            </span>
            <span className="alert-panel-name">{site.name}</span>
            <span className="alert-panel-rate">{rate.toFixed(1)}%</span>
            <span className="alert-panel-tags">
              {site.alert_reasons.map((r) => (
                <span key={r} className="alert-reason-tag">{r}</span>
              ))}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ════════════════════════════════════════════
   Chart + Distribution (Split Layout)
════════════════════════════════════════════ */
function ChartSection({ sites }: { sites: SiteProfit[] }) {
  const total = sites.length;
  const high = sites.filter((s) => s.gross_margin !== null && s.gross_margin >= 30).length;
  const mid = sites.filter((s) => s.gross_margin !== null && s.gross_margin >= 20 && s.gross_margin < 30).length;
  const low = sites.filter((s) => s.gross_margin === null || s.gross_margin < 20).length;

  const highPct = total > 0 ? ((high / total) * 100).toFixed(1) : "0";
  const midPct = total > 0 ? ((mid / total) * 100).toFixed(1) : "0";
  const lowPct = total > 0 ? ((low / total) * 100).toFixed(1) : "0";

  const sorted = [...sites]
    .filter((s) => s.gross_margin !== null)
    .sort((a, b) => (b.gross_margin ?? 0) - (a.gross_margin ?? 0));
  const top3 = sorted.slice(0, 3);
  const low3 = sorted.slice(-3).reverse();

  return (
    <div className="koji-split">
      <div>
        <div className="koji-sec-label">工事別利益</div>
        <div className="koji-panel">
          <div className="koji-panel-body">
            <div className="koji-chart-wrap">
              {sites.length > 0 ? (
                <ProfitChart sites={sites} />
              ) : (
                <div className="koji-no-data">データがありません</div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div>
        <div className="koji-sec-label">粗利率分布</div>
        <div className="koji-panel">
          <div className="koji-panel-body">
            <div className="koji-dist-grid">
              <div className="koji-dist-item">
                <div className="koji-dist-count koji-d-high">{high}</div>
                <div className="koji-dist-pct koji-d-high">{highPct}%</div>
                <div className="koji-dist-label">優良<br />&ge;30%</div>
                <div className="koji-dist-bar">
                  <div className="koji-dist-fill" style={{ background: "#2D7A5F", width: total > 0 ? `${(high / total) * 100}%` : "0%" }} />
                </div>
              </div>
              <div className="koji-dist-item">
                <div className="koji-dist-count koji-d-mid">{mid}</div>
                <div className="koji-dist-pct koji-d-mid">{midPct}%</div>
                <div className="koji-dist-label">標準<br />20-30%</div>
                <div className="koji-dist-bar">
                  <div className="koji-dist-fill" style={{ background: "#6B8399", width: total > 0 ? `${(mid / total) * 100}%` : "0%" }} />
                </div>
              </div>
              <div className="koji-dist-item">
                <div className="koji-dist-count koji-d-low">{low}</div>
                <div className="koji-dist-pct koji-d-low">{lowPct}%</div>
                <div className="koji-dist-label">要改善<br />&lt;20%</div>
                <div className="koji-dist-bar">
                  <div className="koji-dist-fill" style={{ background: "#B85450", width: total > 0 ? `${(low / total) * 100}%` : "0%" }} />
                </div>
              </div>
            </div>

            <div className="koji-rank-section">
              <div className="koji-sec-label" style={{ fontSize: 9, marginBottom: 8 }}>TOP / LOW</div>
              <div className="koji-rank-area">
                {sorted.length === 0 ? (
                  <div style={{ color: "#5a7a94", fontSize: 11, fontWeight: 500 }}>データなし</div>
                ) : (
                  <>
                    {top3.map((s, i) => (
                      <div key={`top-${s.id}`} className="koji-rank-row">
                        <span className="koji-rank-idx">▲{i + 1}</span>
                        <span className="koji-rank-name">{s.name}</span>
                        <span className="koji-rank-rate koji-d-high">{s.gross_margin?.toFixed(1)}%</span>
                      </div>
                    ))}
                    {low3.length > 0 && <div style={{ borderTop: "1px solid #e8ecf0", margin: "6px 0" }} />}
                    {low3.map((s, i) => (
                      <div key={`low-${s.id}`} className="koji-rank-row">
                        <span className="koji-rank-idx">▼{i + 1}</span>
                        <span className="koji-rank-name">{s.name}</span>
                        <span className="koji-rank-rate koji-d-low">{s.gross_margin?.toFixed(1)}%</span>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════
   Table Section
════════════════════════════════════════════ */
function TableSection({ sites }: { sites: SiteProfit[] }) {
  return (
    <div>
      <div className="koji-sec-label">工事一覧</div>
      <div className="koji-panel">
        <div className="koji-panel-body" style={{ paddingBottom: 0 }}>
          <div className="koji-table-header">
            <div className="koji-table-meta">{sites.length} 件</div>
            <div className="koji-table-legend">
              <span className="koji-legend-item" style={{ color: "#2D7A5F" }}>
                <span className="koji-legend-dot" style={{ background: "#2D7A5F" }} />&ge;30%
              </span>
              <span className="koji-legend-item" style={{ color: "#6B8399" }}>
                <span className="koji-legend-dot" style={{ background: "#6B8399" }} />20–30%
              </span>
              <span className="koji-legend-item" style={{ color: "#B85450" }}>
                <span className="koji-legend-dot" style={{ background: "#B85450" }} />&lt;20%
              </span>
            </div>
          </div>
        </div>
        <div className="koji-tbl-wrap">
          <table className="koji-table" style={{ fontSize: 14 }}>
            <thead>
              <tr>
                <th style={{ fontSize: 13, padding: "10px 12px", whiteSpace: "nowrap" }}>#</th>
                <th style={{ fontSize: 13, padding: "10px 12px", whiteSpace: "nowrap" }}>現場コード</th>
                <th style={{ fontSize: 13, padding: "10px 12px", whiteSpace: "nowrap" }}>工事名</th>
                <th className="r" style={{ fontSize: 13, padding: "10px 12px", whiteSpace: "nowrap" }}>請負金額</th>
                <th className="r" style={{ fontSize: 13, padding: "10px 12px", whiteSpace: "nowrap" }}>原価合計</th>
                <th className="r" style={{ fontSize: 13, padding: "10px 12px", whiteSpace: "nowrap" }}>粗利</th>
                <th className="r" style={{ fontSize: 13, padding: "10px 12px", whiteSpace: "nowrap" }}>粗利率</th>
                <th style={{ fontSize: 13, padding: "10px 12px", whiteSpace: "nowrap" }}>判定</th>
                <th style={{ fontSize: 13, padding: "10px 12px", whiteSpace: "nowrap" }}>要注意理由</th>
              </tr>
            </thead>
            <tbody>
              {sites.length === 0 ? (
                <tr><td colSpan={9} className="koji-no-data">データがありません</td></tr>
              ) : (
                sites.map((site, idx) => {
                  const rate = pct(site.sales, site.total_cost);
                  const cls = clsRate(rate);
                  const barColor = cls === "high" ? "#2D7A5F" : cls === "mid" ? "#6B8399" : "#B85450";
                  return (
                    <tr key={site.id}>
                      <td>{idx + 1}</td>
                      <td><span className="koji-proj-id">{site.code}</span></td>
                      <td style={{ fontWeight: 600 }}>{site.name}</td>
                      <td className="mono">{site.contract_amount != null ? fmt(site.contract_amount) : "—"}</td>
                      <td className="mono">{fmt(site.total_cost)}</td>
                      <td className={`mono ${site.gross_profit >= 0 ? "koji-pos" : "koji-neg"}`}>
                        {site.gross_profit >= 0 ? "+" : "-"}{fmt(site.gross_profit)}
                      </td>
                      <td className="r" style={{ minWidth: 100 }}>
                        <span className={`koji-badge koji-b-${cls}`}>{rate.toFixed(1)}%</span>
                        <span className="koji-bar-wrap">
                          <span className="koji-bar-fill" style={{ width: `${Math.min(Math.max(rate, 0), 100)}%`, background: barColor }} />
                        </span>
                      </td>
                      <td>
                        <span className="alert-badge" style={{ background: ALERT_COLORS[site.alert_status] }}>
                          {site.alert_status}
                        </span>
                      </td>
                      <td>
                        {site.alert_reasons.map((r) => (
                          <span key={r} className="alert-reason-tag">{r}</span>
                        ))}
                      </td>
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

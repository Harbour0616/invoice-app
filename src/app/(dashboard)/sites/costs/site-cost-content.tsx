"use client";

import { useState, useMemo } from "react";
import { SiteCostChart } from "./site-cost-chart";

type SiteCost = { id: string; code: string; name: string; total: number };

type Props = {
  siteCosts: SiteCost[];
  chartData: Record<string, string | number>[];
  accountKeys: { key: string; name: string; color: string }[];
};

function formatNumber(n: number): string {
  return n.toLocaleString("ja-JP");
}

export function SiteCostContent({ siteCosts, chartData, accountKeys }: Props) {
  const allIds = useMemo(() => siteCosts.map((s) => s.id), [siteCosts]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set(allIds));
  const [open, setOpen] = useState(false);

  const allSelected = selectedIds.size === allIds.length;
  const noneSelected = selectedIds.size === 0;

  function toggleSite(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function selectAll() {
    setSelectedIds(new Set(allIds));
  }

  function deselectAll() {
    setSelectedIds(new Set());
  }

  const filteredSites = useMemo(
    () => siteCosts.filter((s) => selectedIds.has(s.id)),
    [siteCosts, selectedIds]
  );

  const filteredChartData = useMemo(
    () =>
      chartData.filter((row) =>
        filteredSites.some((s) => s.name === row.name)
      ),
    [chartData, filteredSites]
  );

  const grandTotal = filteredSites.reduce((sum, s) => sum + s.total, 0);

  return (
    <>
      {/* 現場フィルター */}
      <div
        className="rounded-[20px] border border-border bg-card mb-6"
        style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.03)" }}
      >
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="w-full px-6 py-3.5 flex items-center justify-between text-left"
        >
          <div className="flex items-center gap-2.5">
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              className="text-primary shrink-0"
            >
              <path
                d="M2 3h12M4 8h8M6 13h4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
            <span className="text-[13px] font-semibold text-foreground">
              現場フィルター
            </span>
            {!allSelected && (
              <span className="text-[11px] font-medium text-primary bg-mint px-2 py-0.5 rounded-full">
                {selectedIds.size} / {allIds.length}
              </span>
            )}
          </div>
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            className={`text-sub-text transition-transform ${open ? "rotate-180" : ""}`}
          >
            <path
              d="M4 6l4 4 4-4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        {open && (
          <div className="px-6 pb-4 border-t border-border">
            {/* 全選択/全解除 */}
            <div className="flex items-center gap-2 pt-3 pb-2">
              <button
                type="button"
                onClick={selectAll}
                disabled={allSelected}
                className="text-[11px] font-medium px-3 py-1 rounded-lg border border-border hover:bg-mint hover:text-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                全選択
              </button>
              <button
                type="button"
                onClick={deselectAll}
                disabled={noneSelected}
                className="text-[11px] font-medium px-3 py-1 rounded-lg border border-border hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                全解除
              </button>
            </div>

            {/* チェックボックスリスト */}
            <div className="flex flex-wrap gap-x-1 gap-y-1">
              {siteCosts.map((site) => {
                const checked = selectedIds.has(site.id);
                return (
                  <label
                    key={site.id}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg cursor-pointer transition-colors text-[12px] select-none ${
                      checked
                        ? "bg-mint text-primary font-medium"
                        : "bg-background text-sub-text hover:bg-gray-100"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleSite(site.id)}
                      className="sr-only"
                    />
                    <span
                      className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 transition-colors ${
                        checked
                          ? "bg-primary border-primary"
                          : "border-border bg-white"
                      }`}
                    >
                      {checked && (
                        <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                          <path
                            d="M1.5 4L3.2 5.7L6.5 2.3"
                            stroke="white"
                            strokeWidth="1.3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </span>
                    {site.name}
                  </label>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 合計金額ヒーロー */}
      <div
        className="rounded-[20px] border border-border mb-8 px-8 py-7"
        style={{
          background:
            "linear-gradient(135deg, #FFFFFF 0%, #F0F9F4 60%, #E6F5ED 100%)",
          boxShadow: "0 2px 12px rgba(47,158,119,0.07)",
        }}
      >
        <div className="text-[11px] font-semibold text-sub-text uppercase tracking-widest mb-2">
          税抜費用合計
        </div>
        <div className="text-[2.25rem] font-extrabold font-mono text-primary tracking-tight leading-none">
          ¥{formatNumber(grandTotal)}
        </div>
      </div>

      {/* 科目別積み上げ棒グラフ */}
      <SiteCostChart data={filteredChartData} accountKeys={accountKeys} />

      {/* 区切り */}
      <div className="h-px bg-border mb-6" />

      {/* 現場一覧セクション */}
      {filteredSites.length === 0 ? (
        <p className="text-sub-text text-sm">
          {noneSelected ? "現場を選択してください" : "データがありません"}
        </p>
      ) : (
        <>
          <div className="text-[11px] font-semibold text-sub-text uppercase tracking-widest mb-3">
            現場一覧
          </div>
          <div className="flex flex-col gap-2">
            {filteredSites.map((site, idx) => {
              const pct =
                grandTotal > 0 ? (site.total / grandTotal) * 100 : 0;
              return (
                <div
                  key={site.id}
                  className="group bg-card rounded-[16px] border border-border px-6 py-4 flex items-center justify-between transition-all hover:shadow-md hover:border-primary/20"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <span className="text-[11px] font-mono text-sub-text/60 w-5 shrink-0 text-right">
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-foreground truncate">
                        {site.name}
                      </div>
                      <div className="text-[11px] text-sub-text mt-0.5">
                        {site.code}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-baseline gap-3 shrink-0 ml-4">
                    <span className="text-[11px] font-medium text-sub-text/70 tabular-nums">
                      {pct.toFixed(1)}%
                    </span>
                    <span className="text-[15px] font-bold font-mono text-foreground tabular-nums">
                      ¥{formatNumber(site.total)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}

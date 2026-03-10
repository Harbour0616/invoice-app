"use client";

import { useState } from "react";
import { getSummary } from "./actions";

type SiteOption = { id: string; code: string; name: string };
type SummaryRow = { id: string; name: string; hours: number; cost: number };

export function SummaryTab({ sites }: { sites: SiteOption[] }) {
  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const [yearMonth, setYearMonth] = useState(defaultMonth);
  const [siteId, setSiteId] = useState("");
  const [bySite, setBySite] = useState<SummaryRow[]>([]);
  const [byEmployee, setByEmployee] = useState<SummaryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);

  const handleFetch = async () => {
    setLoading(true);
    const result = await getSummary(yearMonth, siteId || undefined);
    setBySite(result.bySite);
    setByEmployee(result.byEmployee);
    setFetched(true);
    setLoading(false);
  };

  const fmt = (n: number) => `¥${n.toLocaleString("ja-JP")}`;

  const siteTotalHours = bySite.reduce((s, r) => s + r.hours, 0);
  const siteTotalCost = bySite.reduce((s, r) => s + r.cost, 0);
  const empTotalHours = byEmployee.reduce((s, r) => s + r.hours, 0);
  const empTotalCost = byEmployee.reduce((s, r) => s + r.cost, 0);

  return (
    <div>
      {/* フィルター */}
      <div className="flex items-end gap-3 mb-6 flex-wrap">
        <div>
          <label className="label">対象月</label>
          <input
            type="month"
            value={yearMonth}
            onChange={(e) => setYearMonth(e.target.value)}
            className="input-bordered"
          />
        </div>
        <div>
          <label className="label">現場（任意）</label>
          <select
            value={siteId}
            onChange={(e) => setSiteId(e.target.value)}
            className="select-bordered"
          >
            <option value="">すべて</option>
            {sites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.code} - {s.name}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={handleFetch}
          disabled={loading}
          className="px-4 h-11 bg-primary text-white rounded-lg hover:bg-primary-hover disabled:opacity-50 text-sm cursor-pointer"
        >
          {loading ? "集計中..." : "集計"}
        </button>
      </div>

      {fetched && (
        <div className="space-y-6">
          {/* 現場別 */}
          <div>
            <h2 className="text-sm font-semibold mb-3">現場別労務費</h2>
            <div className="bg-card rounded-[10px] shadow-[0_2px_8px_rgba(0,0,0,0.04)] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-border">
                    <tr>
                      <th className="text-left px-4 py-3.5 text-xs text-sub-text font-semibold uppercase tracking-wider">現場</th>
                      <th className="text-right px-4 py-3.5 text-xs text-sub-text font-semibold uppercase tracking-wider">合計時間</th>
                      <th className="text-right px-4 py-3.5 text-xs text-sub-text font-semibold uppercase tracking-wider">合計労務費</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bySite.length === 0 ? (
                      <tr><td colSpan={3} className="px-4 py-8 text-center text-sub-text">データがありません</td></tr>
                    ) : (
                      <>
                        {bySite.map((row) => (
                          <tr key={row.id} className="border-b border-table-separator last:border-b-0 hover:bg-table-row-hover">
                            <td className="px-4 py-3.5">{row.name}</td>
                            <td className="px-4 py-3.5 text-right font-mono">{row.hours}h</td>
                            <td className="px-4 py-3.5 text-right font-mono">{fmt(row.cost)}</td>
                          </tr>
                        ))}
                        <tr className="bg-muted font-semibold">
                          <td className="px-4 py-3.5">合計</td>
                          <td className="px-4 py-3.5 text-right font-mono">{siteTotalHours}h</td>
                          <td className="px-4 py-3.5 text-right font-mono">{fmt(siteTotalCost)}</td>
                        </tr>
                      </>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* 従業員別 */}
          <div>
            <h2 className="text-sm font-semibold mb-3">従業員別内訳</h2>
            <div className="bg-card rounded-[10px] shadow-[0_2px_8px_rgba(0,0,0,0.04)] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-border">
                    <tr>
                      <th className="text-left px-4 py-3.5 text-xs text-sub-text font-semibold uppercase tracking-wider">従業員</th>
                      <th className="text-right px-4 py-3.5 text-xs text-sub-text font-semibold uppercase tracking-wider">合計時間</th>
                      <th className="text-right px-4 py-3.5 text-xs text-sub-text font-semibold uppercase tracking-wider">合計労務費</th>
                    </tr>
                  </thead>
                  <tbody>
                    {byEmployee.length === 0 ? (
                      <tr><td colSpan={3} className="px-4 py-8 text-center text-sub-text">データがありません</td></tr>
                    ) : (
                      <>
                        {byEmployee.map((row) => (
                          <tr key={row.id} className="border-b border-table-separator last:border-b-0 hover:bg-table-row-hover">
                            <td className="px-4 py-3.5">{row.name}</td>
                            <td className="px-4 py-3.5 text-right font-mono">{row.hours}h</td>
                            <td className="px-4 py-3.5 text-right font-mono">{fmt(row.cost)}</td>
                          </tr>
                        ))}
                        <tr className="bg-muted font-semibold">
                          <td className="px-4 py-3.5">合計</td>
                          <td className="px-4 py-3.5 text-right font-mono">{empTotalHours}h</td>
                          <td className="px-4 py-3.5 text-right font-mono">{fmt(empTotalCost)}</td>
                        </tr>
                      </>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

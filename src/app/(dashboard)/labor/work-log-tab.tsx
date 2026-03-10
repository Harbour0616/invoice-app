"use client";

import { useState } from "react";
import { getWorkLogs, saveWorkLog, deleteWorkLog } from "./actions";

type SiteOption = { id: string; code: string; name: string };
type EmployeeOption = { id: string; employee_code: string | null; employee_name: string; daily_wage: number };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function WorkLogTab({
  initialWorkLogs,
  employees,
  sites,
  defaultFrom,
  defaultTo,
}: {
  initialWorkLogs: any[];
  employees: EmployeeOption[];
  sites: SiteOption[];
  defaultFrom: string;
  defaultTo: string;
}) {
  const [workLogs, setWorkLogs] = useState(initialWorkLogs);
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Form state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [workDate, setWorkDate] = useState(new Date().toISOString().slice(0, 10));
  const [employeeId, setEmployeeId] = useState("");
  const [siteId, setSiteId] = useState("");
  const [hours, setHours] = useState(8);
  const [dailyWage, setDailyWage] = useState(0);
  const [laborCost, setLaborCost] = useState(0);
  const [notes, setNotes] = useState("");

  const calcCost = (wage: number, h: number) => Math.floor(wage / 8 * h);

  const resetForm = () => {
    setEditingId(null);
    setWorkDate(new Date().toISOString().slice(0, 10));
    setEmployeeId("");
    setSiteId("");
    setHours(8);
    setDailyWage(0);
    setLaborCost(0);
    setNotes("");
    setError("");
  };

  const handleEmployeeChange = (id: string) => {
    setEmployeeId(id);
    const emp = employees.find((e) => e.id === id);
    if (emp) {
      setDailyWage(emp.daily_wage);
      setLaborCost(calcCost(emp.daily_wage, hours));
    } else {
      setDailyWage(0);
      setLaborCost(0);
    }
  };

  const handleHoursChange = (h: number) => {
    setHours(h);
    setLaborCost(calcCost(dailyWage, h));
  };

  const handleFilter = async () => {
    setLoading(true);
    const data = await getWorkLogs(from, to);
    setWorkLogs(data);
    setLoading(false);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const openEdit = (log: any) => {
    setEditingId(log.id);
    setWorkDate(log.work_date);
    setEmployeeId(log.employee_id || "");
    setSiteId(log.site_id || "");
    setHours(Number(log.hours));
    setDailyWage(log.daily_wage);
    setLaborCost(log.labor_cost);
    setNotes(log.notes || "");
    setError("");
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError("");
    const result = await saveWorkLog({
      id: editingId || undefined,
      work_date: workDate,
      employee_id: employeeId || null,
      site_id: siteId || null,
      hours,
      daily_wage: dailyWage,
      labor_cost: laborCost,
      notes: notes || null,
    });
    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else {
      resetForm();
      const data = await getWorkLogs(from, to);
      setWorkLogs(data);
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("この日報を削除しますか？")) return;
    setError("");
    const result = await deleteWorkLog(id);
    if (result.error) {
      setError(result.error);
    } else {
      setWorkLogs(workLogs.filter((w: { id: string }) => w.id !== id));
    }
  };

  const fmt = (n: number) => `¥${n.toLocaleString("ja-JP")}`;

  return (
    <div>
      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>
      )}

      {/* 入力フォーム */}
      <div className="bg-card rounded-[10px] shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-4 mb-6">
        <h2 className="text-sm font-semibold mb-3">{editingId ? "日報を編集" : "日報入力"}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div>
            <label className="label">日付</label>
            <input
              type="date"
              value={workDate}
              onChange={(e) => setWorkDate(e.target.value)}
              className="input-bordered"
            />
          </div>
          <div>
            <label className="label">従業員</label>
            <select
              value={employeeId}
              onChange={(e) => handleEmployeeChange(e.target.value)}
              className="select-bordered"
            >
              <option value="">選択</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.employee_code ? `${e.employee_code} - ` : ""}{e.employee_name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">現場</label>
            <select
              value={siteId}
              onChange={(e) => setSiteId(e.target.value)}
              className="select-bordered"
            >
              <option value="">選択</option>
              {sites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.code} - {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">時間</label>
            <input
              type="number"
              min="0"
              max="24"
              step="0.5"
              value={hours}
              onChange={(e) => handleHoursChange(Number(e.target.value))}
              className="input-bordered text-right"
            />
          </div>
          <div>
            <label className="label">労務費</label>
            <input
              type="text"
              value={fmt(laborCost)}
              readOnly
              className="input-bordered bg-muted text-right"
            />
          </div>
          <div>
            <label className="label">備考</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="input-bordered"
              placeholder="メモ"
            />
          </div>
        </div>
        <div className="flex gap-2 mt-3">
          <button
            onClick={handleSubmit}
            disabled={loading || !workDate || !employeeId}
            className="px-4 h-9 bg-primary text-white rounded-lg hover:bg-primary-hover disabled:opacity-50 text-sm cursor-pointer"
          >
            {loading ? "保存中..." : editingId ? "更新" : "登録"}
          </button>
          {editingId && (
            <button
              onClick={resetForm}
              className="px-4 h-9 border border-border rounded-lg text-sm hover:bg-muted cursor-pointer"
            >
              キャンセル
            </button>
          )}
        </div>
      </div>

      {/* フィルター */}
      <div className="flex items-end gap-3 mb-4 flex-wrap">
        <div>
          <label className="label">開始日</label>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="input-bordered" />
        </div>
        <div>
          <label className="label">終了日</label>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="input-bordered" />
        </div>
        <button
          onClick={handleFilter}
          disabled={loading}
          className="px-4 h-11 bg-primary text-white rounded-lg hover:bg-primary-hover disabled:opacity-50 text-sm cursor-pointer"
        >
          表示
        </button>
      </div>

      {/* 一覧 */}
      <div className="bg-card rounded-[10px] shadow-[0_2px_8px_rgba(0,0,0,0.04)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border">
              <tr>
                <th className="text-left px-4 py-3.5 text-xs text-sub-text font-semibold uppercase tracking-wider whitespace-nowrap">日付</th>
                <th className="text-left px-4 py-3.5 text-xs text-sub-text font-semibold uppercase tracking-wider whitespace-nowrap">従業員</th>
                <th className="text-left px-4 py-3.5 text-xs text-sub-text font-semibold uppercase tracking-wider whitespace-nowrap">現場</th>
                <th className="text-right px-4 py-3.5 text-xs text-sub-text font-semibold uppercase tracking-wider whitespace-nowrap">時間</th>
                <th className="text-right px-4 py-3.5 text-xs text-sub-text font-semibold uppercase tracking-wider whitespace-nowrap">労務費</th>
                <th className="text-left px-4 py-3.5 text-xs text-sub-text font-semibold uppercase tracking-wider whitespace-nowrap">備考</th>
                <th className="text-right px-4 py-3.5 text-xs text-sub-text font-semibold uppercase tracking-wider whitespace-nowrap">操作</th>
              </tr>
            </thead>
            <tbody>
              {workLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sub-text">
                    日報がありません
                  </td>
                </tr>
              ) : (
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                workLogs.map((log: any) => (
                  <tr key={log.id} className="border-b border-table-separator last:border-b-0 hover:bg-table-row-hover">
                    <td className="px-4 py-3.5 whitespace-nowrap">{log.work_date}</td>
                    <td className="px-4 py-3.5 whitespace-nowrap">{log.employee?.employee_name || "—"}</td>
                    <td className="px-4 py-3.5 whitespace-nowrap">{log.site ? `${log.site.code} - ${log.site.name}` : "—"}</td>
                    <td className="px-4 py-3.5 text-right font-mono whitespace-nowrap">{Number(log.hours)}h</td>
                    <td className="px-4 py-3.5 text-right font-mono whitespace-nowrap">{fmt(log.labor_cost)}</td>
                    <td className="px-4 py-3.5 truncate max-w-[200px]">{log.notes || ""}</td>
                    <td className="px-4 py-3.5 text-right whitespace-nowrap space-x-2">
                      <button onClick={() => openEdit(log)} className="text-primary hover:underline cursor-pointer">編集</button>
                      <button onClick={() => handleDelete(log.id)} className="text-red-400 hover:text-red-600 cursor-pointer">削除</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

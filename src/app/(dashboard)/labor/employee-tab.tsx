"use client";

import { useState } from "react";
import { saveEmployee, deleteEmployee } from "./actions";
import type { Employee } from "@/types/database";

export function EmployeeTab({ initialEmployees }: { initialEmployees: Employee[] }) {
  const [employees, setEmployees] = useState(initialEmployees);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Form state
  const [employeeCode, setEmployeeCode] = useState("");
  const [employeeName, setEmployeeName] = useState("");
  const [dailyWage, setDailyWage] = useState(0);

  const resetForm = () => {
    setEmployeeCode("");
    setEmployeeName("");
    setDailyWage(0);
    setError("");
    setEditingEmployee(null);
  };

  const openCreate = () => {
    resetForm();
    setModalOpen(true);
  };

  const openEdit = (emp: Employee) => {
    setEditingEmployee(emp);
    setEmployeeCode(emp.employee_code || "");
    setEmployeeName(emp.employee_name);
    setDailyWage(emp.daily_wage);
    setError("");
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError("");
    const result = await saveEmployee({
      id: editingEmployee?.id,
      employee_code: employeeCode || null,
      employee_name: employeeName,
      daily_wage: dailyWage,
    });
    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else {
      setModalOpen(false);
      setLoading(false);
      window.location.reload();
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`「${name}」を削除しますか？`)) return;
    setError("");
    const result = await deleteEmployee(id);
    if (result.error) {
      setError(result.error);
    } else {
      setEmployees(employees.filter((e) => e.id !== id));
    }
  };

  const fmt = (n: number) => `¥${n.toLocaleString("ja-JP")}`;

  return (
    <div>
      {error && !modalOpen && (
        <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>
      )}

      <div className="mb-4">
        <button
          onClick={openCreate}
          className="px-4 h-11 bg-primary text-white rounded-lg hover:bg-primary-hover text-sm cursor-pointer"
        >
          ＋ 新規登録
        </button>
      </div>

      <div className="bg-card rounded-[10px] shadow-[0_2px_8px_rgba(0,0,0,0.04)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border">
              <tr>
                <th className="text-left px-4 py-3.5 text-xs text-sub-text font-semibold uppercase tracking-wider whitespace-nowrap">コード</th>
                <th className="text-left px-4 py-3.5 text-xs text-sub-text font-semibold uppercase tracking-wider whitespace-nowrap">氏名</th>
                <th className="text-right px-4 py-3.5 text-xs text-sub-text font-semibold uppercase tracking-wider whitespace-nowrap">日当</th>
                <th className="text-right px-4 py-3.5 text-xs text-sub-text font-semibold uppercase tracking-wider whitespace-nowrap">操作</th>
              </tr>
            </thead>
            <tbody>
              {employees.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-sub-text">
                    従業員が登録されていません
                  </td>
                </tr>
              ) : (
                employees.map((emp) => (
                  <tr key={emp.id} className="border-b border-table-separator last:border-b-0 hover:bg-table-row-hover">
                    <td className="px-4 py-3.5 font-mono whitespace-nowrap">{emp.employee_code || "—"}</td>
                    <td className="px-4 py-3.5">{emp.employee_name}</td>
                    <td className="px-4 py-3.5 text-right font-mono whitespace-nowrap">{fmt(emp.daily_wage)}</td>
                    <td className="px-4 py-3.5 text-right whitespace-nowrap space-x-2">
                      <button onClick={() => openEdit(emp)} className="text-primary hover:underline cursor-pointer">編集</button>
                      <button onClick={() => handleDelete(emp.id, emp.employee_name)} className="text-red-400 hover:text-red-600 cursor-pointer">削除</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => { setModalOpen(false); setError(""); }} />
          <div className="relative bg-card rounded-2xl shadow-lg w-full max-w-md mx-4 p-6">
            <h2 className="text-lg font-bold mb-4">
              {editingEmployee ? "従業員を編集" : "新規従業員登録"}
            </h2>

            {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>
            )}

            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="label">従業員コード</label>
                <input
                  value={employeeCode}
                  onChange={(e) => setEmployeeCode(e.target.value)}
                  className="input-bordered"
                  placeholder="例: E001"
                />
              </div>
              <div>
                <label className="label">氏名 <span className="text-red-500">*</span></label>
                <input
                  value={employeeName}
                  onChange={(e) => setEmployeeName(e.target.value)}
                  className="input-bordered"
                  placeholder="例: 山田太郎"
                />
              </div>
              <div>
                <label className="label">日当（円） <span className="text-red-500">*</span></label>
                <input
                  type="number"
                  min="0"
                  value={dailyWage || ""}
                  onChange={(e) => setDailyWage(Number(e.target.value) || 0)}
                  className="input-bordered text-right"
                  placeholder="例: 15000"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => { setModalOpen(false); setError(""); }}
                className="px-4 h-11 border border-border rounded-lg text-sm hover:bg-muted cursor-pointer"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading || !employeeName}
                className="px-4 h-11 bg-primary text-white rounded-lg hover:bg-primary-hover disabled:opacity-50 text-sm cursor-pointer"
              >
                {loading ? "保存中..." : editingEmployee ? "更新" : "登録"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

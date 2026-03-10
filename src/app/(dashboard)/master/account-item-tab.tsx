"use client";

import { useState } from "react";
import { saveAccountItem, deleteAccountItem } from "./account-item-actions";
import type { AccountItem } from "@/types/database";

const ACCOUNT_TYPES = ["売上", "原価", "経費", "その他"] as const;

export function AccountItemTab({ initialAccountItems }: { initialAccountItems: AccountItem[] }) {
  const [items, setItems] = useState(initialAccountItems);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<AccountItem | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Form state
  const [accountCode, setAccountCode] = useState("");
  const [accountName, setAccountName] = useState("");
  const [accountType, setAccountType] = useState<string>("原価");

  const resetForm = () => {
    setAccountCode("");
    setAccountName("");
    setAccountType("原価");
    setError("");
    setEditingItem(null);
  };

  const openCreate = () => {
    resetForm();
    setModalOpen(true);
  };

  const openEdit = (item: AccountItem) => {
    setEditingItem(item);
    setAccountCode(item.account_code || "");
    setAccountName(item.account_name);
    setAccountType(item.account_type);
    setError("");
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError("");
    const result = await saveAccountItem({
      id: editingItem?.id,
      account_code: accountCode || null,
      account_name: accountName,
      account_type: accountType,
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
    const result = await deleteAccountItem(id);
    if (result.error) {
      setError(result.error);
    } else {
      setItems(items.filter((i) => i.id !== id));
    }
  };

  const typeStyle = (t: string) => {
    switch (t) {
      case "売上": return "bg-blue-50 text-blue-600";
      case "原価": return "bg-accent/10 text-accent";
      case "経費": return "bg-orange-50 text-orange-600";
      default: return "bg-muted text-sub-text";
    }
  };

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
                <th className="text-left px-4 py-3.5 text-xs text-sub-text font-semibold uppercase tracking-wider whitespace-nowrap">科目名</th>
                <th className="text-left px-4 py-3.5 text-xs text-sub-text font-semibold uppercase tracking-wider whitespace-nowrap">種別</th>
                <th className="text-right px-4 py-3.5 text-xs text-sub-text font-semibold uppercase tracking-wider whitespace-nowrap">操作</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-sub-text">
                    勘定科目が登録されていません
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="border-b border-table-separator last:border-b-0 hover:bg-table-row-hover">
                    <td className="px-4 py-3.5 font-mono whitespace-nowrap">{item.account_code || "—"}</td>
                    <td className="px-4 py-3.5">{item.account_name}</td>
                    <td className="px-4 py-3.5">
                      <span className={`text-xs px-2 py-1 rounded-full ${typeStyle(item.account_type)}`}>
                        {item.account_type}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right whitespace-nowrap space-x-2">
                      <button onClick={() => openEdit(item)} className="text-primary hover:underline cursor-pointer">編集</button>
                      <button onClick={() => handleDelete(item.id, item.account_name)} className="text-red-400 hover:text-red-600 cursor-pointer">削除</button>
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
              {editingItem ? "勘定科目を編集" : "新規勘定科目登録"}
            </h2>

            {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>
            )}

            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="label">科目コード</label>
                <input
                  value={accountCode}
                  onChange={(e) => setAccountCode(e.target.value)}
                  className="input-bordered"
                  placeholder="例: 510"
                />
              </div>
              <div>
                <label className="label">科目名 <span className="text-red-500">*</span></label>
                <input
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  className="input-bordered"
                  placeholder="例: 材料費"
                />
              </div>
              <div>
                <label className="label">種別 <span className="text-red-500">*</span></label>
                <select
                  value={accountType}
                  onChange={(e) => setAccountType(e.target.value)}
                  className="select-bordered"
                >
                  {ACCOUNT_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
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
                disabled={loading || !accountName}
                className="px-4 h-11 bg-primary text-white rounded-lg hover:bg-primary-hover disabled:opacity-50 text-sm cursor-pointer"
              >
                {loading ? "保存中..." : editingItem ? "更新" : "登録"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

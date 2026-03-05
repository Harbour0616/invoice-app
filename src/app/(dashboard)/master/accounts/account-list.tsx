"use client";

import { useState } from "react";
import { createAccount, updateAccount, deleteAccount } from "./actions";
import type { Account } from "@/types/database";

export function AccountList({ initialAccounts }: { initialAccounts: Account[] }) {
  const [accounts, setAccounts] = useState(initialAccounts);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreate = async (formData: FormData) => {
    setLoading(true);
    setError("");
    const result = await createAccount(formData);
    if (result.error) {
      setError(result.error);
    } else {
      setShowForm(false);
      window.location.reload();
    }
    setLoading(false);
  };

  const handleUpdate = async (id: string, formData: FormData) => {
    setLoading(true);
    setError("");
    const result = await updateAccount(id, formData);
    if (result.error) {
      setError(result.error);
    } else {
      setEditingId(null);
      window.location.reload();
    }
    setLoading(false);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`「${name}」を削除しますか？`)) return;
    setError("");
    const result = await deleteAccount(id);
    if (result.error) {
      setError(result.error);
    } else {
      setAccounts(accounts.filter((a) => a.id !== id));
    }
  };

  return (
    <div>
      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="mb-4">
        <button
          onClick={() => {
            setShowForm(!showForm);
            setError("");
          }}
          className={`px-4 h-11 rounded-lg text-sm cursor-pointer ${
            showForm
              ? "border border-border text-foreground hover:bg-muted"
              : "bg-primary text-white hover:bg-primary-hover"
          }`}
        >
          {showForm ? "キャンセル" : "＋ 新規追加"}
        </button>
      </div>

      {showForm && (
        <form
          action={handleCreate}
          className="card mb-6"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="label">
                科目コード <span className="text-red-500">*</span>
              </label>
              <input
                name="code"
                required
                className="input-bordered"
                placeholder="例: 510"
              />
            </div>
            <div>
              <label className="label">
                科目名 <span className="text-red-500">*</span>
              </label>
              <input
                name="name"
                required
                className="input-bordered"
                placeholder="例: 材料費"
              />
            </div>
            <div>
              <label className="label">
                表示順
              </label>
              <input
                name="display_order"
                type="number"
                defaultValue={0}
                className="input-bordered"
              />
            </div>
          </div>
          <div className="mt-4">
            <button
              type="submit"
              disabled={loading}
              className="px-4 h-11 bg-primary text-white rounded-lg hover:bg-primary-hover disabled:opacity-50 text-sm cursor-pointer"
            >
              {loading ? "登録中..." : "登録"}
            </button>
          </div>
        </form>
      )}

      <div className="bg-card rounded-[10px] shadow-[0_2px_8px_rgba(0,0,0,0.04)] overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-border">
            <tr>
              <th className="text-left px-4 py-3.5 text-xs text-sub-text font-semibold uppercase tracking-wider">コード</th>
              <th className="text-left px-4 py-3.5 text-xs text-sub-text font-semibold uppercase tracking-wider">科目名</th>
              <th className="text-left px-4 py-3.5 text-xs text-sub-text font-semibold uppercase tracking-wider">表示順</th>
              <th className="text-left px-4 py-3.5 text-xs text-sub-text font-semibold uppercase tracking-wider">状態</th>
              <th className="text-right px-4 py-3.5 text-xs text-sub-text font-semibold uppercase tracking-wider">操作</th>
            </tr>
          </thead>
          <tbody>
            {accounts.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sub-text">
                  勘定科目が登録されていません
                </td>
              </tr>
            ) : (
              accounts.map((account) => (
                <tr key={account.id} className="border-b border-table-separator last:border-b-0 hover:bg-table-row-hover">
                  {editingId === account.id ? (
                    <EditRow
                      account={account}
                      onSave={handleUpdate}
                      onCancel={() => setEditingId(null)}
                      loading={loading}
                    />
                  ) : (
                    <>
                      <td className="px-4 py-3.5 font-mono">{account.code}</td>
                      <td className="px-4 py-3.5">{account.name}</td>
                      <td className="px-4 py-3.5 text-sub-text">{account.display_order}</td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${
                            account.is_active
                              ? "bg-accent/10 text-accent"
                              : "bg-muted text-sub-text"
                          }`}
                        >
                          {account.is_active ? "有効" : "無効"}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right space-x-2">
                        <button
                          onClick={() => {
                            setEditingId(account.id);
                            setError("");
                          }}
                          className="text-primary hover:underline cursor-pointer"
                        >
                          編集
                        </button>
                        <button
                          onClick={() => handleDelete(account.id, account.name)}
                          className="text-red-400 hover:text-red-600 cursor-pointer"
                        >
                          削除
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function EditRow({
  account,
  onSave,
  onCancel,
  loading,
}: {
  account: Account;
  onSave: (id: string, formData: FormData) => Promise<void>;
  onCancel: () => void;
  loading: boolean;
}) {
  const handleSubmit = async (formData: FormData) => {
    await onSave(account.id, formData);
  };

  return (
    <td colSpan={5} className="px-4 py-3.5">
      <form action={handleSubmit} className="flex items-center gap-3">
        <input
          name="code"
          defaultValue={account.code}
          required
          className="w-24 input-bordered"
        />
        <input
          name="name"
          defaultValue={account.name}
          required
          className="flex-1 input-bordered"
        />
        <input
          name="display_order"
          type="number"
          defaultValue={account.display_order}
          className="w-20 input-bordered"
        />
        <select
          name="is_active"
          defaultValue={account.is_active ? "true" : "false"}
          className="select-bordered w-20"
        >
          <option value="true">有効</option>
          <option value="false">無効</option>
        </select>
        <button
          type="submit"
          disabled={loading}
          className="px-3 py-1 bg-primary text-white rounded-lg text-sm hover:bg-primary-hover disabled:opacity-50 cursor-pointer"
        >
          保存
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1 border border-border rounded-lg text-sm hover:bg-muted cursor-pointer"
        >
          取消
        </button>
      </form>
    </td>
  );
}

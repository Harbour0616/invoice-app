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
        <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-md text-sm">
          {error}
        </div>
      )}

      <div className="mb-4">
        <button
          onClick={() => {
            setShowForm(!showForm);
            setError("");
          }}
          className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors text-sm cursor-pointer"
        >
          {showForm ? "キャンセル" : "＋ 新規追加"}
        </button>
      </div>

      {showForm && (
        <form
          action={handleCreate}
          className="mb-6 p-4 bg-white rounded-md shadow-sm border border-border"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                科目コード <span className="text-red-500">*</span>
              </label>
              <input
                name="code"
                required
                className="w-full px-3 py-2 border border-border rounded-md text-sm"
                placeholder="例: 510"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                科目名 <span className="text-red-500">*</span>
              </label>
              <input
                name="name"
                required
                className="w-full px-3 py-2 border border-border rounded-md text-sm"
                placeholder="例: 材料費"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                表示順
              </label>
              <input
                name="display_order"
                type="number"
                defaultValue={0}
                className="w-full px-3 py-2 border border-border rounded-md text-sm"
              />
            </div>
          </div>
          <div className="mt-4">
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark disabled:opacity-50 text-sm cursor-pointer"
            >
              {loading ? "登録中..." : "登録"}
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-md shadow-sm border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-border">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">コード</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">科目名</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">表示順</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">状態</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">操作</th>
            </tr>
          </thead>
          <tbody>
            {accounts.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                  勘定科目が登録されていません
                </td>
              </tr>
            ) : (
              accounts.map((account) => (
                <tr key={account.id} className="border-b border-border last:border-b-0 hover:bg-gray-50">
                  {editingId === account.id ? (
                    <EditRow
                      account={account}
                      onSave={handleUpdate}
                      onCancel={() => setEditingId(null)}
                      loading={loading}
                    />
                  ) : (
                    <>
                      <td className="px-4 py-3 font-mono">{account.code}</td>
                      <td className="px-4 py-3">{account.name}</td>
                      <td className="px-4 py-3 text-gray-500">{account.display_order}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${
                            account.is_active
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          {account.is_active ? "有効" : "無効"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right space-x-2">
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
                          className="text-red-500 hover:underline cursor-pointer"
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
    <td colSpan={5} className="px-4 py-3">
      <form action={handleSubmit} className="flex items-center gap-3">
        <input
          name="code"
          defaultValue={account.code}
          required
          className="w-24 px-2 py-1 border border-border rounded text-sm"
        />
        <input
          name="name"
          defaultValue={account.name}
          required
          className="flex-1 px-2 py-1 border border-border rounded text-sm"
        />
        <input
          name="display_order"
          type="number"
          defaultValue={account.display_order}
          className="w-20 px-2 py-1 border border-border rounded text-sm"
        />
        <select
          name="is_active"
          defaultValue={account.is_active ? "true" : "false"}
          className="px-2 py-1 border border-border rounded text-sm"
        >
          <option value="true">有効</option>
          <option value="false">無効</option>
        </select>
        <button
          type="submit"
          disabled={loading}
          className="px-3 py-1 bg-primary text-white rounded text-sm hover:bg-primary-dark disabled:opacity-50 cursor-pointer"
        >
          保存
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1 bg-gray-200 rounded text-sm hover:bg-gray-300 cursor-pointer"
        >
          取消
        </button>
      </form>
    </td>
  );
}

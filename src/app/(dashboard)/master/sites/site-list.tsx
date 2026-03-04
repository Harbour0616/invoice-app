"use client";

import { useState } from "react";
import { createSite, updateSite, deleteSite } from "./actions";
import type { Site } from "@/types/database";

export function SiteList({ initialSites }: { initialSites: Site[] }) {
  const [sites, setSites] = useState(initialSites);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreate = async (formData: FormData) => {
    setLoading(true);
    setError("");
    const result = await createSite(formData);
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
    const result = await updateSite(id, formData);
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
    const result = await deleteSite(id);
    if (result.error) {
      setError(result.error);
    } else {
      setSites(sites.filter((s) => s.id !== id));
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
                現場コード <span className="text-red-500">*</span>
              </label>
              <input
                name="code"
                required
                className="w-full px-3 py-2 border border-border rounded-md text-sm"
                placeholder="例: S001"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                現場名 <span className="text-red-500">*</span>
              </label>
              <input
                name="name"
                required
                className="w-full px-3 py-2 border border-border rounded-md text-sm"
                placeholder="例: ○○邸新築工事"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ステータス
              </label>
              <select
                name="status"
                defaultValue="active"
                className="w-full px-3 py-2 border border-border rounded-md text-sm"
              >
                <option value="active">進行中</option>
                <option value="completed">完了</option>
              </select>
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
              <th className="text-left px-4 py-3 font-medium text-gray-600">現場名</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">ステータス</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">操作</th>
            </tr>
          </thead>
          <tbody>
            {sites.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
                  現場が登録されていません
                </td>
              </tr>
            ) : (
              sites.map((site) => (
                <tr key={site.id} className="border-b border-border last:border-b-0 hover:bg-gray-50">
                  {editingId === site.id ? (
                    <EditRow
                      site={site}
                      onSave={handleUpdate}
                      onCancel={() => setEditingId(null)}
                      loading={loading}
                    />
                  ) : (
                    <>
                      <td className="px-4 py-3 font-mono">{site.code}</td>
                      <td className="px-4 py-3">{site.name}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${
                            site.status === "active"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          {site.status === "active" ? "進行中" : "完了"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right space-x-2">
                        <button
                          onClick={() => {
                            setEditingId(site.id);
                            setError("");
                          }}
                          className="text-primary hover:underline cursor-pointer"
                        >
                          編集
                        </button>
                        <button
                          onClick={() => handleDelete(site.id, site.name)}
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
  site,
  onSave,
  onCancel,
  loading,
}: {
  site: Site;
  onSave: (id: string, formData: FormData) => Promise<void>;
  onCancel: () => void;
  loading: boolean;
}) {
  const handleSubmit = async (formData: FormData) => {
    await onSave(site.id, formData);
  };

  return (
    <td colSpan={4} className="px-4 py-3">
      <form action={handleSubmit} className="flex items-center gap-3">
        <input
          name="code"
          defaultValue={site.code}
          required
          className="w-24 px-2 py-1 border border-border rounded text-sm"
        />
        <input
          name="name"
          defaultValue={site.name}
          required
          className="flex-1 px-2 py-1 border border-border rounded text-sm"
        />
        <select
          name="status"
          defaultValue={site.status}
          className="px-2 py-1 border border-border rounded text-sm"
        >
          <option value="active">進行中</option>
          <option value="completed">完了</option>
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

"use client";

import { useState } from "react";
import { createVendor, updateVendor, deleteVendor } from "./actions";
import type { Vendor } from "@/types/database";

export function VendorList({ initialVendors }: { initialVendors: Vendor[] }) {
  const [vendors, setVendors] = useState(initialVendors);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreate = async (formData: FormData) => {
    setLoading(true);
    setError("");
    const result = await createVendor(formData);
    if (result.error) {
      setError(result.error);
    } else {
      setShowForm(false);
      // ページをリロードして最新データを取得
      window.location.reload();
    }
    setLoading(false);
  };

  const handleUpdate = async (id: string, formData: FormData) => {
    setLoading(true);
    setError("");
    const result = await updateVendor(id, formData);
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
    const result = await deleteVendor(id);
    if (result.error) {
      setError(result.error);
    } else {
      setVendors(vendors.filter((v) => v.id !== id));
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
                取引先コード <span className="text-red-500">*</span>
              </label>
              <input
                name="code"
                required
                className="w-full px-3 py-2 border border-border rounded-md text-sm"
                placeholder="例: V001"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                取引先名 <span className="text-red-500">*</span>
              </label>
              <input
                name="name"
                required
                className="w-full px-3 py-2 border border-border rounded-md text-sm"
                placeholder="例: 山田建材株式会社"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                フリガナ
              </label>
              <input
                name="furigana"
                className="w-full px-3 py-2 border border-border rounded-md text-sm"
                placeholder="例: ヤマダケンザイ"
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
              <th className="text-left px-4 py-3 font-medium text-gray-600">取引先名</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">フリガナ</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">状態</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">操作</th>
            </tr>
          </thead>
          <tbody>
            {vendors.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                  取引先が登録されていません
                </td>
              </tr>
            ) : (
              vendors.map((vendor) => (
                <tr key={vendor.id} className="border-b border-border last:border-b-0 hover:bg-gray-50">
                  {editingId === vendor.id ? (
                    <EditRow
                      vendor={vendor}
                      onSave={handleUpdate}
                      onCancel={() => setEditingId(null)}
                      loading={loading}
                    />
                  ) : (
                    <>
                      <td className="px-4 py-3 font-mono">{vendor.code}</td>
                      <td className="px-4 py-3">{vendor.name}</td>
                      <td className="px-4 py-3 text-gray-500">{vendor.furigana || "—"}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${
                            vendor.is_active
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          {vendor.is_active ? "有効" : "無効"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right space-x-2">
                        <button
                          onClick={() => {
                            setEditingId(vendor.id);
                            setError("");
                          }}
                          className="text-primary hover:underline cursor-pointer"
                        >
                          編集
                        </button>
                        <button
                          onClick={() => handleDelete(vendor.id, vendor.name)}
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
  vendor,
  onSave,
  onCancel,
  loading,
}: {
  vendor: Vendor;
  onSave: (id: string, formData: FormData) => Promise<void>;
  onCancel: () => void;
  loading: boolean;
}) {
  const handleSubmit = async (formData: FormData) => {
    await onSave(vendor.id, formData);
  };

  return (
    <td colSpan={5} className="px-4 py-3">
      <form action={handleSubmit} className="flex items-center gap-3">
        <input
          name="code"
          defaultValue={vendor.code}
          required
          className="w-24 px-2 py-1 border border-border rounded text-sm"
        />
        <input
          name="name"
          defaultValue={vendor.name}
          required
          className="flex-1 px-2 py-1 border border-border rounded text-sm"
        />
        <input
          name="furigana"
          defaultValue={vendor.furigana || ""}
          className="flex-1 px-2 py-1 border border-border rounded text-sm"
        />
        <select
          name="is_active"
          defaultValue={vendor.is_active ? "true" : "false"}
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

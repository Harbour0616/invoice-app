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
                取引先コード <span className="text-red-500">*</span>
              </label>
              <input
                name="code"
                required
                className="input-bordered"
                placeholder="例: V001"
              />
            </div>
            <div>
              <label className="label">
                取引先名 <span className="text-red-500">*</span>
              </label>
              <input
                name="name"
                required
                className="input-bordered"
                placeholder="例: 山田建材株式会社"
              />
            </div>
            <div>
              <label className="label">
                フリガナ
              </label>
              <input
                name="furigana"
                className="input-bordered"
                placeholder="例: ヤマダケンザイ"
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
              <th className="text-left px-4 py-3.5 text-xs text-sub-text font-semibold uppercase tracking-wider">取引先名</th>
              <th className="text-left px-4 py-3.5 text-xs text-sub-text font-semibold uppercase tracking-wider">フリガナ</th>
              <th className="text-left px-4 py-3.5 text-xs text-sub-text font-semibold uppercase tracking-wider">状態</th>
              <th className="text-right px-4 py-3.5 text-xs text-sub-text font-semibold uppercase tracking-wider">操作</th>
            </tr>
          </thead>
          <tbody>
            {vendors.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sub-text">
                  取引先が登録されていません
                </td>
              </tr>
            ) : (
              vendors.map((vendor) => (
                <tr key={vendor.id} className="border-b border-table-separator last:border-b-0 hover:bg-table-row-hover">
                  {editingId === vendor.id ? (
                    <EditRow
                      vendor={vendor}
                      onSave={handleUpdate}
                      onCancel={() => setEditingId(null)}
                      loading={loading}
                    />
                  ) : (
                    <>
                      <td className="px-4 py-3.5 font-mono">{vendor.code}</td>
                      <td className="px-4 py-3.5">{vendor.name}</td>
                      <td className="px-4 py-3.5 text-sub-text">{vendor.furigana || "—"}</td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${
                            vendor.is_active
                              ? "bg-accent/10 text-accent"
                              : "bg-muted text-sub-text"
                          }`}
                        >
                          {vendor.is_active ? "有効" : "無効"}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right space-x-2">
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
    <td colSpan={5} className="px-4 py-3.5">
      <form action={handleSubmit} className="flex items-center gap-3">
        <input
          name="code"
          defaultValue={vendor.code}
          required
          className="w-24 input-bordered"
        />
        <input
          name="name"
          defaultValue={vendor.name}
          required
          className="flex-1 input-bordered"
        />
        <input
          name="furigana"
          defaultValue={vendor.furigana || ""}
          className="flex-1 input-bordered"
        />
        <select
          name="is_active"
          defaultValue={vendor.is_active ? "true" : "false"}
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

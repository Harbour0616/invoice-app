"use client";

import { useState } from "react";
import { createSite, updateSite, deleteSite } from "./actions";
import type { Site } from "@/types/database";

type StatusFilter = "all" | "進行中" | "完了" | "中止";

export function SiteManageClient({ initialSites }: { initialSites: Site[] }) {
  const [sites, setSites] = useState(initialSites);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSite, setEditingSite] = useState<Site | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const filteredSites =
    statusFilter === "all"
      ? sites
      : sites.filter((s) => s.status === statusFilter);

  const openCreate = () => {
    setEditingSite(null);
    setError("");
    setModalOpen(true);
  };

  const openEdit = (site: Site) => {
    setEditingSite(site);
    setError("");
    setModalOpen(true);
  };

  const handleSubmit = async (formData: FormData) => {
    setLoading(true);
    setError("");
    const result = editingSite
      ? await updateSite(editingSite.id, formData)
      : await createSite(formData);
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
    const result = await deleteSite(id);
    if (result.error) {
      setError(result.error);
    } else {
      setSites(sites.filter((s) => s.id !== id));
    }
  };

  const formatCurrency = (amount: number | null) => {
    if (amount == null) return "—";
    return `¥${amount.toLocaleString("ja-JP")}`;
  };

  const formatDate = (date: string | null) => {
    if (!date) return "—";
    return date;
  };

  const formatPeriod = (start: string | null, end: string | null) => {
    if (!start && !end) return "—";
    return `${start || "?"} ～ ${end || "?"}`;
  };

  return (
    <div>
      {error && !modalOpen && (
        <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* ヘッダー: フィルター + 新規登録ボタン */}
      <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          {(["all", "進行中", "完了", "中止"] as StatusFilter[]).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-full text-sm cursor-pointer transition-colors ${
                statusFilter === s
                  ? "bg-primary text-white"
                  : "bg-muted text-sub-text hover:text-foreground"
              }`}
            >
              {s === "all" ? "すべて" : s}
            </button>
          ))}
        </div>
        <button
          onClick={openCreate}
          className="px-4 h-11 bg-primary text-white rounded-lg hover:bg-primary-hover text-sm cursor-pointer"
        >
          ＋ 新規登録
        </button>
      </div>

      {/* テーブル */}
      <div className="bg-card rounded-[10px] shadow-[0_2px_8px_rgba(0,0,0,0.04)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border">
              <tr>
                <th className="text-left px-4 py-3.5 text-xs text-sub-text font-semibold uppercase tracking-wider whitespace-nowrap">
                  コード
                </th>
                <th className="text-left px-4 py-3.5 text-xs text-sub-text font-semibold uppercase tracking-wider whitespace-nowrap">
                  現場名
                </th>
                <th className="text-left px-4 py-3.5 text-xs text-sub-text font-semibold uppercase tracking-wider whitespace-nowrap">
                  発注者名
                </th>
                <th className="text-right px-4 py-3.5 text-xs text-sub-text font-semibold uppercase tracking-wider whitespace-nowrap">
                  請負金額
                </th>
                <th className="text-left px-4 py-3.5 text-xs text-sub-text font-semibold uppercase tracking-wider whitespace-nowrap">
                  工期
                </th>
                <th className="text-left px-4 py-3.5 text-xs text-sub-text font-semibold uppercase tracking-wider whitespace-nowrap">
                  ステータス
                </th>
                <th className="text-right px-4 py-3.5 text-xs text-sub-text font-semibold uppercase tracking-wider whitespace-nowrap">
                  操作
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredSites.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center text-sub-text"
                  >
                    {statusFilter === "all"
                      ? "現場が登録されていません"
                      : `「${statusFilter}」の現場はありません`}
                  </td>
                </tr>
              ) : (
                filteredSites.map((site) => (
                  <tr
                    key={site.id}
                    className="border-b border-table-separator last:border-b-0 hover:bg-table-row-hover"
                  >
                    <td className="px-4 py-3.5 font-mono whitespace-nowrap">
                      {site.code}
                    </td>
                    <td className="px-4 py-3.5">{site.name}</td>
                    <td className="px-4 py-3.5">{site.client_name || "—"}</td>
                    <td className="px-4 py-3.5 text-right font-mono whitespace-nowrap">
                      {formatCurrency(site.contract_amount)}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      {formatPeriod(site.start_date, site.end_date)}
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusBadge status={site.status} />
                    </td>
                    <td className="px-4 py-3.5 text-right space-x-2 whitespace-nowrap">
                      <button
                        onClick={() => openEdit(site)}
                        className="text-primary hover:underline cursor-pointer"
                      >
                        編集
                      </button>
                      <button
                        onClick={() => handleDelete(site.id, site.name)}
                        className="text-red-400 hover:text-red-600 cursor-pointer"
                      >
                        削除
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* モーダル */}
      {modalOpen && (
        <SiteFormModal
          site={editingSite}
          error={error}
          loading={loading}
          onSubmit={handleSubmit}
          onClose={() => {
            setModalOpen(false);
            setError("");
          }}
        />
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: Site["status"] }) {
  const style =
    status === "進行中"
      ? "bg-accent/10 text-accent"
      : status === "中止"
        ? "bg-red-50 text-red-500"
        : "bg-muted text-sub-text";

  return (
    <span className={`text-xs px-2 py-1 rounded-full ${style}`}>{status}</span>
  );
}

function SiteFormModal({
  site,
  error,
  loading,
  onSubmit,
  onClose,
}: {
  site: Site | null;
  error: string;
  loading: boolean;
  onSubmit: (formData: FormData) => Promise<void>;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* オーバーレイ */}
      <div
        className="absolute inset-0 bg-black/30"
        onClick={onClose}
      />
      {/* モーダル本体 */}
      <div className="relative bg-card rounded-2xl shadow-lg w-full max-w-lg mx-4 p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-bold mb-4">
          {site ? "現場を編集" : "新規現場登録"}
        </h2>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">
            {error}
          </div>
        )}

        <form action={onSubmit}>
          <div className="grid grid-cols-1 gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">
                  現場コード <span className="text-red-500">*</span>
                </label>
                <input
                  name="code"
                  required
                  defaultValue={site?.code ?? ""}
                  className="input-bordered"
                  placeholder="例: S001"
                />
              </div>
              <div>
                <label className="label">ステータス</label>
                <select
                  name="status"
                  defaultValue={site?.status ?? "進行中"}
                  className="select-bordered"
                >
                  <option value="進行中">進行中</option>
                  <option value="完了">完了</option>
                  <option value="中止">中止</option>
                </select>
              </div>
            </div>

            <div>
              <label className="label">
                現場名 <span className="text-red-500">*</span>
              </label>
              <input
                name="name"
                required
                defaultValue={site?.name ?? ""}
                className="input-bordered"
                placeholder="例: ○○邸新築工事"
              />
            </div>

            <div>
              <label className="label">発注者名</label>
              <input
                name="client_name"
                defaultValue={site?.client_name ?? ""}
                className="input-bordered"
                placeholder="例: 株式会社○○"
              />
            </div>

            <div>
              <label className="label">請負金額</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sub-text text-sm">
                  ¥
                </span>
                <input
                  name="contract_amount"
                  type="number"
                  min="0"
                  defaultValue={site?.contract_amount ?? ""}
                  className="input-bordered pl-7"
                  placeholder="例: 10000000"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">工期開始日</label>
                <input
                  name="start_date"
                  type="date"
                  defaultValue={site?.start_date ?? ""}
                  className="input-bordered"
                />
              </div>
              <div>
                <label className="label">工期終了日</label>
                <input
                  name="end_date"
                  type="date"
                  defaultValue={site?.end_date ?? ""}
                  className="input-bordered"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 h-11 border border-border rounded-lg text-sm hover:bg-muted cursor-pointer"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 h-11 bg-primary text-white rounded-lg hover:bg-primary-hover disabled:opacity-50 text-sm cursor-pointer"
            >
              {loading ? "保存中..." : site ? "更新" : "登録"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

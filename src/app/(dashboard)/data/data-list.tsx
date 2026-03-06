"use client";

import { useState, useMemo } from "react";
import type { InvoiceWithDetails } from "./actions";
import {
  deleteInvoice,
  createConfirmationRequestFromList,
  getInvoices,
  updateDisplayMonths,
} from "./actions";
import { generateCSV, downloadCSV } from "@/lib/csv-export";
import { generatePDF, downloadPDF } from "@/lib/pdf-export";
import { createClient } from "@/lib/supabase/client";

type Vendor = { id: string; code: string; name: string };
type Site = { id: string; code: string; name: string };

function formatNumber(n: number): string {
  return n.toLocaleString("ja-JP");
}

type Props = {
  initialInvoices: InvoiceWithDetails[];
  vendors: Vendor[];
  sites: Site[];
  userNames: Record<string, string>;
  defaultDateFrom: string;
  defaultDateTo: string;
  displayMonths: number;
  role: "owner" | "member";
};

export function DataList({
  initialInvoices,
  vendors,
  sites,
  userNames,
  defaultDateFrom,
  defaultDateTo,
  displayMonths,
  role,
}: Props) {
  const [invoices, setInvoices] = useState(initialInvoices);
  const [keyword, setKeyword] = useState("");
  const [dateFrom, setDateFrom] = useState(defaultDateFrom);
  const [dateTo, setDateTo] = useState(defaultDateTo);
  const [vendorFilter, setVendorFilter] = useState("");
  const [siteFilter, setSiteFilter] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsMonths, setSettingsMonths] = useState(displayMonths);
  const [settingsSaving, setSettingsSaving] = useState(false);

  // 日付が初期範囲外かどうか
  const isOutOfRange = dateFrom < defaultDateFrom || dateTo > defaultDateTo;

  const filtered = useMemo(() => {
    const result = invoices.filter((inv) => {
      if (dateFrom && inv.invoice_date < dateFrom) return false;
      if (dateTo && inv.invoice_date > dateTo) return false;
      if (vendorFilter && inv.vendor?.id !== vendorFilter) return false;
      if (siteFilter) {
        const hasSite = inv.invoice_lines.some(
          (l) => l.site?.id === siteFilter
        );
        if (!hasSite) return false;
      }
      if (keyword) {
        const kw = keyword.toLowerCase();
        const vendorMatch = inv.vendor?.name.toLowerCase().includes(kw);
        const siteMatch = inv.invoice_lines.some((l) =>
          l.site?.name.toLowerCase().includes(kw)
        );
        const noteMatch = inv.note?.toLowerCase().includes(kw);
        const descMatch = inv.invoice_lines.some((l) =>
          l.description?.toLowerCase().includes(kw)
        );
        if (!vendorMatch && !siteMatch && !noteMatch && !descMatch)
          return false;
      }
      return true;
    });

    // 未確認（site_id === null の明細を持つ）請求書を上にソート
    result.sort((a, b) => {
      const aHasUnknown = a.invoice_lines.some((l) => l.site_id === null);
      const bHasUnknown = b.invoice_lines.some((l) => l.site_id === null);
      if (aHasUnknown && !bHasUnknown) return -1;
      if (!aHasUnknown && bHasUnknown) return 1;
      return 0;
    });

    return result;
  }, [invoices, keyword, dateFrom, dateTo, vendorFilter, siteFilter]);

  const [pdfLoading, setPdfLoading] = useState(false);

  const handleExportCSV = () => {
    const csv = generateCSV(filtered);
    const date = new Date().toISOString().split("T")[0];
    downloadCSV(csv, `請求書データ_${date}.csv`);
  };

  const handleExportPDF = async () => {
    setPdfLoading(true);
    try {
      const doc = await generatePDF(filtered);
      const date = new Date().toISOString().split("T")[0];
      downloadPDF(doc, `支払請求書一覧_${date}.pdf`);
    } catch (e) {
      setError("PDF出力に失敗しました");
    } finally {
      setPdfLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("この請求書を削除しますか？")) return;
    setError("");
    const result = await deleteInvoice(id);
    if (result.error) {
      setError(result.error);
    } else {
      setInvoices(invoices.filter((i) => i.id !== id));
      if (expandedId === id) setExpandedId(null);
    }
  };

  const handleOpenFile = async (filePath: string) => {
    const supabase = createClient();
    const { data, error: signError } = await supabase.storage
      .from("invoices")
      .createSignedUrl(filePath, 300);
    if (signError || !data?.signedUrl) {
      setError("ファイルの取得に失敗しました");
      return;
    }
    window.open(data.signedUrl, "_blank");
  };

  const handleReSearch = async () => {
    setSearchLoading(true);
    setError("");
    try {
      const result = await getInvoices(dateFrom, dateTo);
      setInvoices(result.invoices);
    } catch {
      setError("データの取得に失敗しました");
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    setSettingsSaving(true);
    const result = await updateDisplayMonths(settingsMonths);
    setSettingsSaving(false);
    if (result.error) {
      setError(result.error);
    } else {
      setSettingsOpen(false);
    }
  };

  return (
    <div>
      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* 検索・フィルター */}
      <div className="card mb-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <div>
            <label className="label">キーワード</label>
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="取引先名・現場名・摘要"
              className="input-bordered"
            />
          </div>
          <div>
            <label className="label">開始日</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="input-bordered"
            />
          </div>
          <div>
            <label className="label">終了日</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="input-bordered"
            />
          </div>
          <div>
            <label className="label">取引先</label>
            <select
              value={vendorFilter}
              onChange={(e) => setVendorFilter(e.target.value)}
              className="select-bordered"
            >
              <option value="">すべて</option>
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">現場</label>
            <select
              value={siteFilter}
              onChange={(e) => setSiteFilter(e.target.value)}
              className="select-bordered"
            >
              <option value="">すべて</option>
              {sites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        {isOutOfRange && (
          <div className="mt-3 flex items-center gap-2">
            <p className="text-sm text-amber-600">
              表示期間が初期範囲外です。サーバーからデータを再取得してください。
            </p>
            <button
              onClick={handleReSearch}
              disabled={searchLoading}
              className="px-3 py-1.5 bg-primary text-white rounded-lg text-sm hover:bg-primary/90 disabled:opacity-50 cursor-pointer"
            >
              {searchLoading ? "検索中..." : "再検索"}
            </button>
          </div>
        )}
      </div>

      {/* アクションバー */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-sub-text">
          {filtered.length} 件表示{" "}
          {filtered.length !== invoices.length &&
            `（全 ${invoices.length} 件中）`}
        </p>
        <div className="flex items-center gap-2">
          {role === "owner" && (
            <div className="relative">
              <button
                onClick={() => setSettingsOpen(!settingsOpen)}
                className="p-2 border border-border text-sub-text hover:text-foreground hover:bg-muted rounded-lg cursor-pointer"
                title="表示期間設定"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </button>
              {settingsOpen && (
                <div className="absolute right-0 top-full mt-2 bg-card border border-border rounded-lg shadow-lg p-4 z-10 w-56">
                  <p className="text-sm font-medium mb-2">
                    デフォルト表示期間
                  </p>
                  <select
                    value={settingsMonths}
                    onChange={(e) =>
                      setSettingsMonths(parseInt(e.target.value, 10))
                    }
                    className="select-bordered w-full mb-3"
                  >
                    {[1, 2, 3, 4, 5, 6].map((n) => (
                      <option key={n} value={n}>
                        {n}ヶ月前から
                      </option>
                    ))}
                  </select>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSettingsOpen(false)}
                      className="flex-1 px-3 py-1.5 border border-border text-sm rounded-lg hover:bg-muted cursor-pointer"
                    >
                      キャンセル
                    </button>
                    <button
                      onClick={handleSaveSettings}
                      disabled={settingsSaving}
                      className="flex-1 px-3 py-1.5 bg-primary text-white text-sm rounded-lg hover:bg-primary/90 disabled:opacity-50 cursor-pointer"
                    >
                      {settingsSaving ? "保存中..." : "保存"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
          <button
            onClick={handleExportPDF}
            disabled={filtered.length === 0 || pdfLoading}
            className="px-4 py-2 border border-border text-foreground hover:bg-muted rounded-lg disabled:opacity-50 text-sm cursor-pointer"
          >
            {pdfLoading ? "生成中..." : "PDF出力"}
          </button>
          <button
            onClick={handleExportCSV}
            disabled={filtered.length === 0}
            className="px-4 py-2 border border-border text-foreground hover:bg-muted rounded-lg disabled:opacity-50 text-sm cursor-pointer"
          >
            CSV出力
          </button>
        </div>
      </div>

      {/* 一覧テーブル */}
      <div className="bg-card rounded-[10px] shadow-[0_2px_8px_rgba(0,0,0,0.04)] overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-border">
            <tr>
              <th className="text-left px-4 py-3.5 text-xs text-sub-text font-semibold uppercase tracking-wider">
                請求日
              </th>
              <th className="text-left px-4 py-3.5 text-xs text-sub-text font-semibold uppercase tracking-wider">
                取引先
              </th>
              <th className="text-left px-4 py-3.5 text-xs text-sub-text font-semibold uppercase tracking-wider">
                現場
              </th>
              <th className="text-left px-4 py-3.5 text-xs text-sub-text font-semibold uppercase tracking-wider">
                請求書番号
              </th>
              <th className="text-right px-4 py-3.5 text-xs text-sub-text font-semibold uppercase tracking-wider">
                税抜合計
              </th>
              <th className="text-right px-4 py-3.5 text-xs text-sub-text font-semibold uppercase tracking-wider">
                税込合計
              </th>
              <th className="text-left px-4 py-3.5 text-xs text-sub-text font-semibold uppercase tracking-wider">
                更新者
              </th>
              <th className="text-left px-4 py-3.5 text-xs text-sub-text font-semibold uppercase tracking-wider">
                更新日時
              </th>
              <th className="text-right px-4 py-3.5 text-xs text-sub-text font-semibold uppercase tracking-wider w-16">
                操作
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={9}
                  className="px-4 py-8 text-center text-sub-text"
                >
                  データがありません
                </td>
              </tr>
            ) : (
              filtered.map((inv) => (
                <InvoiceRow
                  key={inv.id}
                  invoice={inv}
                  isExpanded={expandedId === inv.id}
                  onToggle={() =>
                    setExpandedId(expandedId === inv.id ? null : inv.id)
                  }
                  onDelete={() => handleDelete(inv.id)}
                  onOpenFile={
                    inv.pdf_file_path
                      ? () => handleOpenFile(inv.pdf_file_path!)
                      : undefined
                  }
                  filePath={inv.pdf_file_path}
                  onError={setError}
                  userNames={userNames}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function isImagePath(path: string | null | undefined): boolean {
  if (!path) return false;
  return /\.(jpg|jpeg|png)$/i.test(path);
}

function InvoiceRow({
  invoice,
  isExpanded,
  onToggle,
  onDelete,
  onOpenFile,
  filePath,
  onError,
  userNames,
}: {
  invoice: InvoiceWithDetails;
  isExpanded: boolean;
  onToggle: () => void;
  onDelete: () => void;
  onOpenFile?: () => void;
  filePath?: string | null;
  onError: (msg: string) => void;
  userNames: Record<string, string>;
}) {
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [confirmUrl, setConfirmUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const hasUnknownSite = invoice.invoice_lines.some((l) => l.site_id === null);
  const pendingRequest = invoice.confirmation_requests?.find(
    (r) => r.status === "pending"
  );

  const siteNames = invoice.invoice_lines
    .map((l) => l.site?.name)
    .filter(Boolean);
  const uniqueSites = [...new Set(siteNames)];

  const handleCreateConfirmation = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmLoading(true);
    const result = await createConfirmationRequestFromList(invoice.id);
    setConfirmLoading(false);
    if (result.error) {
      onError(result.error);
    } else if (result.url) {
      setConfirmUrl(result.url);
    }
  };

  const handleCopyUrl = (e: React.MouseEvent, url: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getPendingUrl = () => {
    if (confirmUrl) return confirmUrl;
    if (pendingRequest) {
      return `https://invoice-app-chi-three.vercel.app/confirm/${pendingRequest.token}`;
    }
    return null;
  };

  return (
    <>
      <tr
        onClick={onToggle}
        className="border-b border-table-separator hover:bg-table-row-hover cursor-pointer"
      >
        <td className="px-4 py-3.5">{invoice.invoice_date}</td>
        <td className="px-4 py-3.5">{invoice.vendor?.name || "—"}</td>
        <td className="px-4 py-3.5">
          <div className="flex flex-wrap gap-1">
            {uniqueSites.map((name) => (
              <span
                key={name}
                className="inline-block text-xs bg-primary/8 text-primary/80 px-2 py-0.5 rounded-full"
              >
                {name}
              </span>
            ))}
            {hasUnknownSite && (
              <span className="inline-block text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">
                未確認あり
              </span>
            )}
          </div>
        </td>
        <td className="px-4 py-3.5 text-sub-text">
          {invoice.invoice_number || "—"}
        </td>
        <td className="px-4 py-3.5 text-right font-mono">
          {formatNumber(invoice.total_excl_tax)}
        </td>
        <td className="px-4 py-3.5 text-right font-mono font-bold">
          {formatNumber(invoice.total_incl_tax)}
        </td>
        <td className="px-4 py-3.5 text-sm">
          {invoice.updated_by ? (
            userNames[invoice.updated_by] || "—"
          ) : invoice.confirmation_requests?.some(
              (r) => r.status === "completed"
            ) ? (
            <span className="inline-block text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full">
              社長確認
            </span>
          ) : (
            "—"
          )}
        </td>
        <td className="px-4 py-3.5 text-sm text-sub-text">
          {invoice.updated_at
            ? (() => {
                const d = new Date(invoice.updated_at);
                return `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
              })()
            : "—"}
        </td>
        <td className="px-4 py-3.5 text-right">
          <div className="flex items-center justify-end gap-2">
            {/* 確認依頼ボタン */}
            {hasUnknownSite && (pendingRequest || confirmUrl) && (
              <button
                onClick={(e) => handleCopyUrl(e, getPendingUrl()!)}
                className="text-xs px-2 py-1 bg-amber-100 text-amber-700 rounded hover:bg-amber-200 cursor-pointer whitespace-nowrap"
                title="確認依頼URLをコピー"
              >
                {copied ? "コピー済" : "URLコピー"}
              </button>
            )}
            {hasUnknownSite && !pendingRequest && !confirmUrl && (
              <button
                onClick={handleCreateConfirmation}
                disabled={confirmLoading}
                className="text-xs px-2 py-1 bg-amber-100 text-amber-700 rounded hover:bg-amber-200 disabled:opacity-50 cursor-pointer whitespace-nowrap"
                title="確認依頼を作成"
              >
                {confirmLoading ? "..." : "確認依頼"}
              </button>
            )}
            {onOpenFile && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenFile();
                }}
                className="text-sub-text hover:text-primary cursor-pointer"
                title={isImagePath(filePath) ? "画像を開く" : "PDFを開く"}
              >
                {isImagePath(filePath) ? (
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z"
                    />
                  </svg>
                ) : (
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                    />
                  </svg>
                )}
              </button>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="text-red-400 hover:text-red-600 cursor-pointer text-xs"
            >
              削除
            </button>
          </div>
        </td>
      </tr>
      {isExpanded && (
        <tr className="bg-table-row-hover">
          <td colSpan={9} className="px-4 py-3">
            {invoice.note && (
              <p className="text-xs text-sub-text mb-2">
                摘要：{invoice.note}
              </p>
            )}
            <table className="w-full text-xs">
              <thead>
                <tr className="text-sub-text">
                  <th className="text-left py-1 pr-4">現場</th>
                  <th className="text-left py-1 pr-4">品名・摘要</th>
                  <th className="text-left py-1 pr-4">勘定科目</th>
                  <th className="text-right py-1 pr-4">税抜金額</th>
                  <th className="text-center py-1 pr-4">税率</th>
                  <th className="text-right py-1 pr-4">消費税額</th>
                  <th className="text-right py-1">税込金額</th>
                </tr>
              </thead>
              <tbody>
                {invoice.invoice_lines
                  .sort((a, b) => a.line_order - b.line_order)
                  .map((line) => (
                    <tr key={line.id}>
                      <td className="py-1 pr-4">
                        {line.site_id === null ? (
                          <span className="text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded text-xs">
                            現場不明
                          </span>
                        ) : (
                          line.site?.name || "—"
                        )}
                      </td>
                      <td className="py-1 pr-4 text-sub-text">
                        {line.description || "—"}
                      </td>
                      <td className="py-1 pr-4">
                        {line.account?.name || "—"}
                      </td>
                      <td className="py-1 pr-4 text-right font-mono">
                        {formatNumber(line.amount_excl_tax)}
                      </td>
                      <td className="py-1 pr-4 text-center">
                        {Math.round(Number(line.tax_rate) * 100)}%
                      </td>
                      <td className="py-1 pr-4 text-right font-mono">
                        {formatNumber(line.tax_amount)}
                      </td>
                      <td className="py-1 text-right font-mono">
                        {formatNumber(line.amount_incl_tax)}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </td>
        </tr>
      )}
    </>
  );
}

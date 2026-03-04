"use client";

import { useState, useMemo } from "react";
import type { InvoiceWithDetails } from "./actions";
import { deleteInvoice } from "./actions";
import { generateCSV, downloadCSV } from "@/lib/csv-export";

type Vendor = { id: string; code: string; name: string };
type Site = { id: string; code: string; name: string };

function formatNumber(n: number): string {
  return n.toLocaleString("ja-JP");
}

type Props = {
  initialInvoices: InvoiceWithDetails[];
  vendors: Vendor[];
  sites: Site[];
};

export function DataList({ initialInvoices, vendors, sites }: Props) {
  const [invoices, setInvoices] = useState(initialInvoices);
  const [keyword, setKeyword] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [vendorFilter, setVendorFilter] = useState("");
  const [siteFilter, setSiteFilter] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const filtered = useMemo(() => {
    return invoices.filter((inv) => {
      // 期間フィルター
      if (dateFrom && inv.invoice_date < dateFrom) return false;
      if (dateTo && inv.invoice_date > dateTo) return false;

      // 取引先フィルター
      if (vendorFilter && inv.vendor?.id !== vendorFilter) return false;

      // 現場フィルター
      if (siteFilter) {
        const hasSite = inv.invoice_lines.some(
          (l) => l.site?.id === siteFilter
        );
        if (!hasSite) return false;
      }

      // キーワード検索
      if (keyword) {
        const kw = keyword.toLowerCase();
        const vendorMatch = inv.vendor?.name.toLowerCase().includes(kw);
        const siteMatch = inv.invoice_lines.some((l) =>
          l.site?.name.toLowerCase().includes(kw)
        );
        const noteMatch = inv.note?.toLowerCase().includes(kw);
        if (!vendorMatch && !siteMatch && !noteMatch) return false;
      }

      return true;
    });
  }, [invoices, keyword, dateFrom, dateTo, vendorFilter, siteFilter]);

  const handleExportCSV = () => {
    const csv = generateCSV(filtered);
    const date = new Date().toISOString().split("T")[0];
    downloadCSV(csv, `請求書データ_${date}.csv`);
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

  return (
    <div>
      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-md text-sm">
          {error}
        </div>
      )}

      {/* 検索・フィルター */}
      <div className="bg-white rounded-md shadow-sm border border-border p-4 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">キーワード</label>
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="取引先名・現場名・摘要"
              className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">開始日</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">終了日</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">取引先</label>
            <select
              value={vendorFilter}
              onChange={(e) => setVendorFilter(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
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
            <label className="block text-xs text-gray-500 mb-1">現場</label>
            <select
              value={siteFilter}
              onChange={(e) => setSiteFilter(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
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
      </div>

      {/* アクションバー */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">
          {filtered.length} 件表示{" "}
          {filtered.length !== invoices.length &&
            `（全 ${invoices.length} 件中）`}
        </p>
        <button
          onClick={handleExportCSV}
          disabled={filtered.length === 0}
          className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark disabled:opacity-50 transition-colors text-sm cursor-pointer"
        >
          CSV出力
        </button>
      </div>

      {/* 一覧テーブル */}
      <div className="bg-white rounded-md shadow-sm border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-border">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">請求日</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">取引先</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">現場</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">請求書番号</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">税抜合計</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">税込合計</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600 w-16">操作</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
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
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function InvoiceRow({
  invoice,
  isExpanded,
  onToggle,
  onDelete,
}: {
  invoice: InvoiceWithDetails;
  isExpanded: boolean;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const siteNames = invoice.invoice_lines
    .map((l) => l.site?.name)
    .filter(Boolean);
  const uniqueSites = [...new Set(siteNames)];

  return (
    <>
      <tr
        onClick={onToggle}
        className="border-b border-border hover:bg-gray-50 cursor-pointer"
      >
        <td className="px-4 py-3">{invoice.invoice_date}</td>
        <td className="px-4 py-3">{invoice.vendor?.name || "—"}</td>
        <td className="px-4 py-3">
          <div className="flex flex-wrap gap-1">
            {uniqueSites.map((name) => (
              <span
                key={name}
                className="inline-block text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full"
              >
                {name}
              </span>
            ))}
          </div>
        </td>
        <td className="px-4 py-3 text-gray-500">
          {invoice.invoice_number || "—"}
        </td>
        <td className="px-4 py-3 text-right font-mono">
          {formatNumber(invoice.total_excl_tax)}
        </td>
        <td className="px-4 py-3 text-right font-mono font-bold">
          {formatNumber(invoice.total_incl_tax)}
        </td>
        <td className="px-4 py-3 text-right">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="text-red-400 hover:text-red-600 cursor-pointer text-xs"
          >
            削除
          </button>
        </td>
      </tr>
      {isExpanded && (
        <tr className="bg-gray-50">
          <td colSpan={7} className="px-4 py-3">
            {invoice.note && (
              <p className="text-xs text-gray-500 mb-2">摘要：{invoice.note}</p>
            )}
            <table className="w-full text-xs">
              <thead>
                <tr className="text-gray-500">
                  <th className="text-left py-1 pr-4">現場</th>
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
                      <td className="py-1 pr-4">{line.site?.name || "—"}</td>
                      <td className="py-1 pr-4">{line.account?.name || "—"}</td>
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

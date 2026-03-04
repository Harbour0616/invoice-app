"use client";

import { useState, useCallback } from "react";
import { createInvoice } from "./actions";
import { Combobox } from "@/components/combobox";

type Vendor = { id: string; code: string; name: string; furigana: string | null };
type Site = { id: string; code: string; name: string };
type Account = { id: string; code: string; name: string };

type InvoiceLine = {
  key: string;
  site_id: string;
  account_id: string;
  amount_excl_tax: string;
  tax_rate: string;
  tax_amount: string;
  amount_incl_tax: number;
};

function calcTax(amountExclTax: number, taxRate: number): number {
  return Math.floor(amountExclTax * taxRate);
}

function newLine(defaults?: { account_id?: string }): InvoiceLine {
  return {
    key: crypto.randomUUID(),
    site_id: "",
    account_id: defaults?.account_id || "",
    amount_excl_tax: "",
    tax_rate: "0.10",
    tax_amount: "",
    amount_incl_tax: 0,
  };
}

function formatNumber(n: number): string {
  return n.toLocaleString("ja-JP");
}

type Props = {
  vendors: Vendor[];
  sites: Site[];
  accounts: Account[];
};

export function InvoiceForm({ vendors, sites, accounts }: Props) {
  const today = new Date().toISOString().split("T")[0];

  const [invoiceDate, setInvoiceDate] = useState(today);
  const [vendorId, setVendorId] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [note, setNote] = useState("");
  const [lines, setLines] = useState<InvoiceLine[]>([newLine()]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  // 直前のデフォルト保持用
  const [lastVendorId, setLastVendorId] = useState("");
  const [lastAccountId, setLastAccountId] = useState("");

  const vendorOptions = vendors.map((v) => ({
    value: v.id,
    label: v.name,
    sublabel: v.code + (v.furigana ? ` ${v.furigana}` : ""),
  }));

  const siteOptions = sites.map((s) => ({
    value: s.id,
    label: s.name,
    sublabel: s.code,
  }));

  const accountOptions = accounts.map((a) => ({
    value: a.id,
    label: a.name,
    sublabel: a.code,
  }));

  const updateLine = useCallback(
    (key: string, field: keyof InvoiceLine, value: string) => {
      setLines((prev) =>
        prev.map((line) => {
          if (line.key !== key) return line;
          const updated = { ...line, [field]: value };

          // 税額自動計算
          if (field === "amount_excl_tax" || field === "tax_rate") {
            const excl = parseInt(
              field === "amount_excl_tax" ? value : updated.amount_excl_tax
            ) || 0;
            const rate = parseFloat(
              field === "tax_rate" ? value : updated.tax_rate
            ) || 0;
            const tax = calcTax(excl, rate);
            updated.tax_amount = tax.toString();
            updated.amount_incl_tax = excl + tax;
          }

          if (field === "tax_amount") {
            const excl = parseInt(updated.amount_excl_tax) || 0;
            const tax = parseInt(value) || 0;
            updated.amount_incl_tax = excl + tax;
          }

          return updated;
        })
      );
    },
    []
  );

  const addLine = () => {
    setLines((prev) => [...prev, newLine({ account_id: lastAccountId })]);
  };

  const removeLine = (key: string) => {
    if (lines.length <= 1) return;
    setLines((prev) => prev.filter((l) => l.key !== key));
  };

  // 合計
  const totalExclTax = lines.reduce(
    (sum, l) => sum + (parseInt(l.amount_excl_tax) || 0),
    0
  );
  const totalTax = lines.reduce(
    (sum, l) => sum + (parseInt(l.tax_amount) || 0),
    0
  );
  const totalInclTax = totalExclTax + totalTax;

  const handleSubmit = async () => {
    setError("");
    setSuccess("");

    // バリデーション
    if (!vendorId) {
      setError("取引先を選択してください");
      return;
    }
    if (!invoiceDate) {
      setError("請求日を入力してください");
      return;
    }
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line.site_id) {
        setError(`明細行 ${i + 1}: 現場を選択してください`);
        return;
      }
      if (!line.account_id) {
        setError(`明細行 ${i + 1}: 勘定科目を選択してください`);
        return;
      }
      if (!line.amount_excl_tax || parseInt(line.amount_excl_tax) === 0) {
        setError(`明細行 ${i + 1}: 税抜金額を入力してください`);
        return;
      }
    }

    setLoading(true);

    const result = await createInvoice({
      vendor_id: vendorId,
      invoice_date: invoiceDate,
      invoice_number: invoiceNumber,
      note,
      lines: lines.map((l, idx) => ({
        site_id: l.site_id,
        account_id: l.account_id,
        amount_excl_tax: parseInt(l.amount_excl_tax) || 0,
        tax_rate: parseFloat(l.tax_rate),
        tax_amount: parseInt(l.tax_amount) || 0,
        amount_incl_tax: l.amount_incl_tax,
        line_order: idx,
      })),
    });

    setLoading(false);

    if (result.error) {
      setError(result.error);
    } else {
      // 直前の値を保持
      setLastVendorId(vendorId);
      const lastLine = lines[lines.length - 1];
      if (lastLine?.account_id) {
        setLastAccountId(lastLine.account_id);
      }

      setSuccess("請求書を登録しました");
      // フォームリセット（直前のデフォルト適用）
      setVendorId(vendorId);
      setInvoiceNumber("");
      setNote("");
      setLines([newLine({ account_id: lastLine?.account_id })]);

      // 3秒後にメッセージを消す
      setTimeout(() => setSuccess(""), 3000);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.ctrlKey && e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div onKeyDown={handleKeyDown}>
      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-md text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-md text-sm">
          {success}
        </div>
      )}

      {/* ヘッダー部 */}
      <div className="bg-white rounded-md shadow-sm border border-border p-4 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              請求日 <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={invoiceDate}
              onChange={(e) => setInvoiceDate(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              取引先 <span className="text-red-500">*</span>
            </label>
            <Combobox
              options={vendorOptions}
              value={vendorId}
              onChange={setVendorId}
              placeholder="取引先を検索..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              請求書番号
            </label>
            <input
              type="text"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="任意"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              摘要
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="メモ"
            />
          </div>
        </div>
      </div>

      {/* 明細行 */}
      <div className="bg-white rounded-md shadow-sm border border-border overflow-hidden mb-4">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-border">
              <tr>
                <th className="text-left px-3 py-2 font-medium text-gray-600 w-8">#</th>
                <th className="text-left px-3 py-2 font-medium text-gray-600 min-w-[180px]">
                  現場名 <span className="text-red-500">*</span>
                </th>
                <th className="text-left px-3 py-2 font-medium text-gray-600 min-w-[140px]">
                  勘定科目 <span className="text-red-500">*</span>
                </th>
                <th className="text-right px-3 py-2 font-medium text-gray-600 min-w-[120px]">
                  税抜金額 <span className="text-red-500">*</span>
                </th>
                <th className="text-center px-3 py-2 font-medium text-gray-600 w-[100px]">
                  税率
                </th>
                <th className="text-right px-3 py-2 font-medium text-gray-600 min-w-[100px]">
                  消費税額
                </th>
                <th className="text-right px-3 py-2 font-medium text-gray-600 min-w-[120px]">
                  税込金額
                </th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line, idx) => (
                <tr key={line.key} className="border-b border-border last:border-b-0">
                  <td className="px-3 py-2 text-gray-400">{idx + 1}</td>
                  <td className="px-3 py-2">
                    <Combobox
                      options={siteOptions}
                      value={line.site_id}
                      onChange={(v) => updateLine(line.key, "site_id", v)}
                      placeholder="現場を検索..."
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Combobox
                      options={accountOptions}
                      value={line.account_id}
                      onChange={(v) => {
                        updateLine(line.key, "account_id", v);
                        setLastAccountId(v);
                      }}
                      placeholder="科目..."
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      value={line.amount_excl_tax}
                      onChange={(e) =>
                        updateLine(line.key, "amount_excl_tax", e.target.value)
                      }
                      className="w-full px-2 py-1.5 border border-border rounded text-sm text-right focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="0"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <select
                      value={line.tax_rate}
                      onChange={(e) =>
                        updateLine(line.key, "tax_rate", e.target.value)
                      }
                      className="w-full px-2 py-1.5 border border-border rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="0.10">10%</option>
                      <option value="0.08">8%（軽減）</option>
                      <option value="0.00">0%（非課税）</option>
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      value={line.tax_amount}
                      onChange={(e) =>
                        updateLine(line.key, "tax_amount", e.target.value)
                      }
                      className="w-full px-2 py-1.5 border border-border rounded text-sm text-right focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="0"
                    />
                  </td>
                  <td className="px-3 py-2 text-right font-mono">
                    {line.amount_incl_tax > 0
                      ? formatNumber(line.amount_incl_tax)
                      : "—"}
                  </td>
                  <td className="px-3 py-2">
                    {lines.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeLine(line.key)}
                        className="text-red-400 hover:text-red-600 cursor-pointer text-lg leading-none"
                        title="行を削除"
                      >
                        ×
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-4 py-3 border-t border-border">
          <button
            type="button"
            onClick={addLine}
            className="text-sm text-primary hover:text-primary-dark cursor-pointer"
          >
            ＋ 行を追加
          </button>
        </div>
      </div>

      {/* フッター（合計） */}
      <div className="bg-white rounded-md shadow-sm border border-border p-4 mb-4">
        <div className="flex justify-end gap-8 text-sm">
          <div>
            <span className="text-gray-500">税抜合計：</span>
            <span className="font-mono font-bold ml-2">
              {formatNumber(totalExclTax)}
            </span>
          </div>
          <div>
            <span className="text-gray-500">消費税合計：</span>
            <span className="font-mono font-bold ml-2">
              {formatNumber(totalTax)}
            </span>
          </div>
          <div className="text-base">
            <span className="text-gray-500">税込合計：</span>
            <span className="font-mono font-bold ml-2 text-primary">
              {formatNumber(totalInclTax)}
            </span>
          </div>
        </div>
      </div>

      {/* 登録ボタン */}
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading}
          className="px-8 py-3 bg-primary text-white rounded-md hover:bg-primary-dark disabled:opacity-50 transition-colors text-sm font-medium cursor-pointer"
        >
          {loading ? "登録中..." : "登録"}
        </button>
        <span className="text-xs text-gray-400">Ctrl + Enter でも登録できます</span>
      </div>
    </div>
  );
}

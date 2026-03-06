"use client";

import { useState, useCallback } from "react";
import { createInvoice, createConfirmationRequest } from "./actions";
import { createClient } from "@/lib/supabase/client";
import { Combobox } from "@/components/combobox";

type Vendor = { id: string; code: string; name: string; furigana: string | null };
type Site = { id: string; code: string; name: string };
type Account = { id: string; code: string; name: string };

type InvoiceLine = {
  key: string;
  site_id: string;
  site_unknown: boolean;
  description: string;
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
    site_unknown: false,
    description: "",
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

function formatInputNumber(value: string): string {
  const digits = value.replace(/[^\d]/g, "");
  if (!digits) return "";
  return parseInt(digits).toLocaleString("ja-JP");
}

function parseInputNumber(value: string): string {
  return value.replace(/[^\d]/g, "");
}

type Props = {
  vendors: Vendor[];
  sites: Site[];
  accounts: Account[];
  pdfFile?: File | null;
  organizationId: string;
  getMarkerImage?: () => Promise<Blob | null>;
};

export function InvoiceForm({ vendors, sites, accounts, pdfFile, organizationId, getMarkerImage }: Props) {
  const today = new Date().toISOString().split("T")[0];

  const [invoiceDate, setInvoiceDate] = useState(today);
  const [vendorId, setVendorId] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [note, setNote] = useState("");
  const [lines, setLines] = useState<InvoiceLine[]>([newLine()]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  // 確認依頼関連
  const [lastInvoiceId, setLastInvoiceId] = useState<string | null>(null);
  const [hasUnknownSites, setHasUnknownSites] = useState(false);
  const [confirmUrl, setConfirmUrl] = useState<string | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [copied, setCopied] = useState(false);

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

  const toggleSiteUnknown = (key: string) => {
    setLines((prev) =>
      prev.map((line) => {
        if (line.key !== key) return line;
        return { ...line, site_unknown: !line.site_unknown, site_id: "" };
      })
    );
  };

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
      if (!line.site_id && !line.site_unknown) {
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

    // ファイルがあればSupabase Storageにアップロード
    let pdfFilePath: string | undefined;
    if (pdfFile) {
      const supabase = createClient();
      const ext = pdfFile.name.split(".").pop()?.toLowerCase() || "pdf";
      const filePath = `${organizationId}/${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("invoices")
        .upload(filePath, pdfFile, { contentType: pdfFile.type });
      if (uploadError) {
        setError(`ファイルアップロードに失敗しました: ${uploadError.message}`);
        setLoading(false);
        return;
      }
      pdfFilePath = filePath;
    }

    const result = await createInvoice({
      vendor_id: vendorId,
      invoice_date: invoiceDate,
      invoice_number: invoiceNumber,
      note,
      pdf_file_path: pdfFilePath,
      lines: lines.map((l, idx) => ({
        site_id: l.site_unknown ? null : l.site_id,
        description: l.description || null,
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

      // 現場不明行があるかチェック
      const unknownExists = lines.some((l) => l.site_unknown);
      setHasUnknownSites(unknownExists);
      setLastInvoiceId(result.invoiceId || null);
      setConfirmUrl(null);
      setCopied(false);

      setSuccess("請求書を登録しました");
      // フォームリセット（直前のデフォルト適用）
      setVendorId(vendorId);
      setInvoiceNumber("");
      setNote("");
      setLines([newLine({ account_id: lastLine?.account_id })]);

      // unknown行がなければ3秒後にメッセージを消す
      if (!unknownExists) {
        setTimeout(() => setSuccess(""), 3000);
      }
    }
  };

  const handleCreateConfirmation = async () => {
    if (!lastInvoiceId) return;
    setConfirmLoading(true);

    // マーカー画像のアップロード
    let markerFilePath: string | undefined;
    try {
      const blob = await getMarkerImage?.();
      if (blob) {
        const supabase = createClient();
        const filePath = `${organizationId}/markers/${crypto.randomUUID()}.png`;
        const { error: uploadError } = await supabase.storage
          .from("invoices")
          .upload(filePath, blob, { contentType: "image/png" });
        if (!uploadError) {
          markerFilePath = filePath;
        }
      }
    } catch {
      // マーカー取得失敗は無視して続行
    }

    const result = await createConfirmationRequest(lastInvoiceId, markerFilePath);
    setConfirmLoading(false);
    if (result.error) {
      setError(result.error);
    } else if (result.url) {
      setConfirmUrl(result.url);
    }
  };

  const handleCopyUrl = () => {
    if (!confirmUrl) return;
    navigator.clipboard.writeText(confirmUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.ctrlKey && e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
      return;
    }
    // Enter → 次入力欄フォーカス
    if (e.key === "Enter" && !e.ctrlKey && !e.shiftKey) {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "SELECT") {
        e.preventDefault();
        const form = (target as HTMLElement).closest("[data-invoice-form]");
        if (!form) return;
        const focusable = Array.from(
          form.querySelectorAll<HTMLElement>(
            'input:not([type="hidden"]):not([type="checkbox"]):not([disabled]), select:not([disabled])'
          )
        );
        const idx = focusable.indexOf(target as HTMLElement);
        if (idx >= 0 && idx < focusable.length - 1) {
          focusable[idx + 1].focus();
        }
      }
    }
  };

  return (
    <div data-invoice-form onKeyDown={handleKeyDown}>
      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-lg text-sm">
          {success}
        </div>
      )}
      {hasUnknownSites && lastInvoiceId && (
        <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-sm text-amber-800 mb-3">
            現場不明の明細行があります。社長に確認依頼を送信できます。
          </p>
          {confirmUrl ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={confirmUrl}
                className="flex-1 px-3 py-2 border border-amber-300 rounded-lg text-sm bg-white"
              />
              <button
                type="button"
                onClick={handleCopyUrl}
                className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 text-sm cursor-pointer whitespace-nowrap"
              >
                {copied ? "コピー済み" : "URLコピー"}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleCreateConfirmation}
              disabled={confirmLoading}
              className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 text-sm cursor-pointer"
            >
              {confirmLoading ? "作成中..." : "確認依頼を作成"}
            </button>
          )}
        </div>
      )}

      {/* ヘッダー部 */}
      <div className="card mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
          <div>
            <label className="label">
              請求日 <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={invoiceDate}
              onChange={(e) => setInvoiceDate(e.target.value)}
              className="input-bordered"
            />
          </div>
          <div>
            <label className="label">
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
            <label className="label">
              請求書番号
            </label>
            <input
              type="text"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              className="input-bordered"
              placeholder="任意"
            />
          </div>
          <div>
            <label className="label">
              摘要
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="input-bordered"
              placeholder="メモ"
            />
          </div>
        </div>
      </div>

      {/* 明細行 */}
      <div className="card mb-6 !p-0">
        {/* 明細行ヘッダーラベル */}
        <div className="hidden md:flex items-end gap-4 px-6 pt-6 pb-2">
          <div className="min-w-[200px] flex-[2] text-xs text-sub-text font-semibold uppercase tracking-wider">現場名 *</div>
          <div className="w-10 text-xs text-sub-text font-semibold text-center">不明</div>
          <div className="min-w-[140px] flex-[1.2] text-xs text-sub-text font-semibold uppercase tracking-wider">品名・摘要</div>
          <div className="min-w-[160px] flex-[1.5] text-xs text-sub-text font-semibold uppercase tracking-wider">勘定科目 *</div>
          <div className="min-w-[120px] flex-1 text-xs text-sub-text font-semibold uppercase tracking-wider text-right">税抜金額 *</div>
          <div className="w-[90px] text-xs text-sub-text font-semibold text-center">税率</div>
          <div className="min-w-[110px] flex-1 text-xs text-sub-text font-semibold uppercase tracking-wider text-right">消費税額</div>
          <div className="min-w-[120px] flex-1 text-xs text-sub-text font-semibold uppercase tracking-wider text-right">税込金額</div>
          <div className="w-11"></div>
        </div>

        <div className="px-6 pb-6">
          {lines.map((line, idx) => (
            <div key={line.key} className={`flex items-end gap-4 py-4 px-2 hover:bg-table-row-hover rounded-lg ${idx < lines.length - 1 ? "border-b border-table-separator" : ""}`}>
              <div className="min-w-[200px] flex-[2]">
                <div className="md:hidden text-xs text-sub-text mb-1">現場名</div>
                {line.site_unknown ? (
                  <span className="text-sm text-amber-600 bg-amber-50 px-3 py-1.5 rounded block">
                    現場不明
                  </span>
                ) : (
                  <Combobox
                    options={siteOptions}
                    value={line.site_id}
                    onChange={(v) => updateLine(line.key, "site_id", v)}
                    placeholder="現場を検索..."
                  />
                )}
              </div>
              <div className="w-10 text-center pb-1">
                <input
                  type="checkbox"
                  checked={line.site_unknown}
                  onChange={() => toggleSiteUnknown(line.key)}
                  className="w-4 h-4 cursor-pointer accent-amber-500"
                  title="現場不明"
                />
              </div>
              <div className="min-w-[140px] flex-[1.2]">
                <div className="md:hidden text-xs text-sub-text mb-1">品名・摘要</div>
                <input
                  type="text"
                  value={line.description}
                  onChange={(e) => updateLine(line.key, "description", e.target.value)}
                  className="input-bordered"
                  placeholder="品名・摘要"
                />
              </div>
              <div className="min-w-[160px] flex-[1.5]">
                <div className="md:hidden text-xs text-sub-text mb-1">勘定科目</div>
                <Combobox
                  options={accountOptions}
                  value={line.account_id}
                  onChange={(v) => {
                    updateLine(line.key, "account_id", v);
                    setLastAccountId(v);
                  }}
                  placeholder="科目..."
                />
              </div>
              <div className="min-w-[120px] flex-1">
                <div className="md:hidden text-xs text-sub-text mb-1">税抜金額</div>
                <input
                  type="text"
                  inputMode="numeric"
                  value={formatInputNumber(line.amount_excl_tax)}
                  onChange={(e) =>
                    updateLine(line.key, "amount_excl_tax", parseInputNumber(e.target.value))
                  }
                  className="input-bordered text-right"
                  placeholder="0"
                />
              </div>
              <div className="w-[90px]">
                <div className="md:hidden text-xs text-sub-text mb-1">税率</div>
                <select
                  value={line.tax_rate}
                  onChange={(e) =>
                    updateLine(line.key, "tax_rate", e.target.value)
                  }
                  className="select-bordered"
                >
                  <option value="0.10">10%</option>
                  <option value="0.08">8%（軽減）</option>
                  <option value="0.00">0%（非課税）</option>
                </select>
              </div>
              <div className="min-w-[110px] flex-1">
                <div className="md:hidden text-xs text-sub-text mb-1">消費税額</div>
                <input
                  type="text"
                  inputMode="numeric"
                  value={formatInputNumber(line.tax_amount)}
                  onChange={(e) =>
                    updateLine(line.key, "tax_amount", parseInputNumber(e.target.value))
                  }
                  className="input-bordered text-right"
                  placeholder="0"
                />
              </div>
              <div className="min-w-[120px] flex-1 text-right font-mono pb-1">
                {line.amount_incl_tax > 0
                  ? formatNumber(line.amount_incl_tax)
                  : "—"}
              </div>
              <div className="w-11 shrink-0">
                {lines.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeLine(line.key)}
                    className="w-11 h-11 flex items-center justify-center rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                    title="行を削除"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          ))}

          {/* 行追加ボタン */}
          <button
            type="button"
            onClick={addLine}
            className="w-full mt-3 border border-dashed border-border text-sub-text hover:border-primary hover:text-primary rounded-lg py-3 text-center text-sm cursor-pointer"
          >
            ＋ 行を追加
          </button>
        </div>
      </div>

      {/* 合計 */}
      <div className="mt-6 flex justify-end gap-8 text-sm">
        <div>
          <span className="text-sub-text">税抜合計：</span>
          <span className="font-mono font-bold ml-2">
            {formatNumber(totalExclTax)}
          </span>
        </div>
        <div>
          <span className="text-sub-text">消費税合計：</span>
          <span className="font-mono font-bold ml-2">
            {formatNumber(totalTax)}
          </span>
        </div>
        <div>
          <span className="text-sub-text">税込合計：</span>
          <span className="font-mono text-2xl font-bold ml-2 text-primary">
            {formatNumber(totalInclTax)}
          </span>
        </div>
      </div>

      {/* 登録ボタン */}
      <div className="flex items-center gap-4 mt-8">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading}
          className="bg-primary text-white rounded-lg px-10 h-11 text-sm font-medium hover:bg-primary-hover disabled:opacity-50 cursor-pointer"
        >
          {loading ? "登録中..." : "登録"}
        </button>
        <span className="text-xs text-sub-text">Ctrl + Enter でも登録できます</span>
      </div>
    </div>
  );
}

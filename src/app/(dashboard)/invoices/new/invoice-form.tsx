"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createInvoice, createConfirmationRequest } from "./actions";
import { createClient } from "@/lib/supabase/client";
import { Combobox } from "@/components/combobox";
import { InvoiceLineBlock } from "./invoice-line-block";

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
  const router = useRouter();
  const today = new Date().toISOString().split("T")[0];

  const [invoiceDate, setInvoiceDate] = useState(today);
  const [vendorId, setVendorId] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [note, setNote] = useState("");
  const [lines, setLines] = useState<InvoiceLine[]>([newLine()]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState(false);

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

      setSuccess("登録しました");
      setRegistered(true);
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

  const handleNext = () => {
    setRegistered(false);
    setSuccess("");
    setHasUnknownSites(false);
    setLastInvoiceId(null);
    setConfirmUrl(null);
    setCopied(false);
    setVendorId(lastVendorId);
    setInvoiceNumber("");
    setNote("");
    setLines([newLine({ account_id: lastAccountId })]);
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
        <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-[14px] text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-[14px] text-sm">
          {success}
        </div>
      )}
      {hasUnknownSites && lastInvoiceId && (
        <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-[14px]">
          <p className="text-sm text-amber-800 mb-3">
            現場不明の明細行があります。社長に確認依頼を送信できます。
          </p>
          {confirmUrl ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={confirmUrl}
                className="flex-1 px-3 py-2 border border-amber-300 rounded-[14px] text-sm bg-white"
              />
              <button
                type="button"
                onClick={handleCopyUrl}
                className="px-4 py-2 bg-amber-600 text-white rounded-[14px] hover:bg-amber-700 text-sm cursor-pointer whitespace-nowrap"
              >
                {copied ? "コピー済み" : "URLコピー"}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleCreateConfirmation}
              disabled={confirmLoading}
              className="px-4 py-2 bg-amber-600 text-white rounded-[14px] hover:bg-amber-700 disabled:opacity-50 text-sm cursor-pointer"
            >
              {confirmLoading ? "作成中..." : "確認依頼を作成"}
            </button>
          )}
        </div>
      )}

      {/* 基本情報カード */}
      <div className="card mb-6">
        <h3 className="text-sm font-semibold text-foreground mb-5">基本情報</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
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

      {/* 明細入力カード */}
      <div className="card mb-6">
        <h3 className="text-sm font-semibold text-foreground mb-5">明細入力</h3>

        {lines.map((line, idx) => (
          <InvoiceLineBlock
            key={line.key}
            line={line}
            index={idx}
            siteOptions={siteOptions}
            accountOptions={accountOptions}
            canDelete={lines.length > 1}
            onUpdateLine={updateLine}
            onToggleSiteUnknown={toggleSiteUnknown}
            onRemoveLine={removeLine}
            onLastAccountChange={setLastAccountId}
          />
        ))}

        {/* 行追加ボタン */}
        <button
          type="button"
          onClick={addLine}
          className="w-full mt-2 bg-mint text-primary hover:bg-primary/10 rounded-[14px] py-3 text-center text-sm font-medium cursor-pointer"
        >
          ＋ 行を追加
        </button>
      </div>

      {/* 合計バー */}
      <div className="bg-card rounded-[16px] border border-border px-6 py-4 mb-6">
        <div className="flex justify-end items-center gap-8 text-sm">
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
      </div>

      {/* アクションエリア */}
      {registered ? (
        <div className="flex items-center gap-3 mb-8">
          <button
            type="button"
            onClick={handleNext}
            className="bg-primary text-white rounded-[14px] min-w-[180px] h-[50px] text-sm font-medium hover:bg-primary-hover cursor-pointer"
          >
            次へ（続けて登録する）
          </button>
          <button
            type="button"
            onClick={() => router.push("/data")}
            className="rounded-[14px] min-w-[140px] h-[50px] text-sm font-medium border border-border text-foreground hover:bg-background cursor-pointer bg-card"
          >
            一覧へ戻る
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-4 mb-8">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="bg-primary text-white rounded-[14px] min-w-[180px] h-[50px] text-sm font-medium hover:bg-primary-hover disabled:opacity-50 cursor-pointer"
          >
            {loading ? "登録中..." : "登録する"}
          </button>
          <span className="text-xs text-sub-text">Ctrl + Enter で登録できます</span>
        </div>
      )}
    </div>
  );
}

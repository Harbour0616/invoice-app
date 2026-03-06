"use client";

import { Combobox } from "@/components/combobox";

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

type ComboboxOption = {
  value: string;
  label: string;
  sublabel: string;
};

function formatInputNumber(value: string): string {
  const digits = value.replace(/[^\d]/g, "");
  if (!digits) return "";
  return parseInt(digits).toLocaleString("ja-JP");
}

function parseInputNumber(value: string): string {
  return value.replace(/[^\d]/g, "");
}

function formatNumber(n: number): string {
  return n.toLocaleString("ja-JP");
}

type Props = {
  line: InvoiceLine;
  index: number;
  siteOptions: ComboboxOption[];
  accountOptions: ComboboxOption[];
  canDelete: boolean;
  onUpdateLine: (key: string, field: keyof InvoiceLine, value: string) => void;
  onToggleSiteUnknown: (key: string) => void;
  onRemoveLine: (key: string) => void;
  onLastAccountChange: (value: string) => void;
};

export function InvoiceLineBlock({
  line,
  index,
  siteOptions,
  accountOptions,
  canDelete,
  onUpdateLine,
  onToggleSiteUnknown,
  onRemoveLine,
  onLastAccountChange,
}: Props) {
  return (
    <div className="rounded-[16px] border border-border p-4 mb-3">
      {/* Row 1: 現場名 + 品名・摘要 */}
      <div className="flex gap-4 mb-3">
        <div className="flex-1 min-w-0">
          <label className="label">現場名 <span className="text-red-500">*</span></label>
          <div className="flex items-center gap-2">
            <div className="flex-1 min-w-0">
              {line.site_unknown ? (
                <span className="text-sm text-amber-600 bg-amber-50 px-3 py-2.5 rounded-[12px] block h-[44px] flex items-center">
                  現場不明
                </span>
              ) : (
                <Combobox
                  options={siteOptions}
                  value={line.site_id}
                  onChange={(v) => onUpdateLine(line.key, "site_id", v)}
                  placeholder="現場を検索..."
                />
              )}
            </div>
            <label className="flex items-center gap-1.5 shrink-0 cursor-pointer pt-0.5">
              <input
                type="checkbox"
                checked={line.site_unknown}
                onChange={() => onToggleSiteUnknown(line.key)}
                className="w-4 h-4 cursor-pointer accent-amber-500"
              />
              <span className="text-xs text-sub-text">不明</span>
            </label>
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <label className="label">品名・摘要</label>
          <input
            type="text"
            value={line.description}
            onChange={(e) => onUpdateLine(line.key, "description", e.target.value)}
            className="input-bordered"
            placeholder="品名・摘要"
          />
        </div>
      </div>

      {/* Row 2: 勘定科目, 税抜金額, 税率, 消費税額, 不明, 削除 */}
      <div className="flex items-end gap-3">
        <div className="min-w-[140px] flex-[1.5]">
          <label className="label">勘定科目 <span className="text-red-500">*</span></label>
          <Combobox
            options={accountOptions}
            value={line.account_id}
            onChange={(v) => {
              onUpdateLine(line.key, "account_id", v);
              onLastAccountChange(v);
            }}
            placeholder="科目..."
          />
        </div>
        <div className="min-w-[100px] flex-1">
          <label className="label">税抜金額 <span className="text-red-500">*</span></label>
          <input
            type="text"
            inputMode="numeric"
            value={formatInputNumber(line.amount_excl_tax)}
            onChange={(e) =>
              onUpdateLine(line.key, "amount_excl_tax", parseInputNumber(e.target.value))
            }
            className="input-bordered text-right"
            placeholder="0"
          />
        </div>
        <div className="w-[100px]">
          <label className="label">税率</label>
          <select
            value={line.tax_rate}
            onChange={(e) => onUpdateLine(line.key, "tax_rate", e.target.value)}
            className="select-bordered"
          >
            <option value="0.10">10%</option>
            <option value="0.08">8%（軽減）</option>
            <option value="0.00">0%（非課税）</option>
          </select>
        </div>
        <div className="min-w-[100px] flex-1">
          <label className="label">消費税額</label>
          <input
            type="text"
            inputMode="numeric"
            value={formatInputNumber(line.tax_amount)}
            onChange={(e) =>
              onUpdateLine(line.key, "tax_amount", parseInputNumber(e.target.value))
            }
            className="input-bordered text-right"
            placeholder="0"
          />
        </div>
        <div className="min-w-[90px] flex-shrink-0 pb-1">
          <label className="label">税込金額</label>
          <div className="h-[44px] flex items-center justify-end font-mono text-sm font-semibold">
            {line.amount_incl_tax > 0 ? formatNumber(line.amount_incl_tax) : "—"}
          </div>
        </div>
        <div className="pb-1">
          <button
            type="button"
            onClick={() => onRemoveLine(line.key)}
            disabled={!canDelete}
            className="w-9 h-9 flex items-center justify-center rounded-full text-red-400 hover:bg-red-50 hover:text-red-500 disabled:opacity-30 disabled:cursor-default cursor-pointer text-lg"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  );
}

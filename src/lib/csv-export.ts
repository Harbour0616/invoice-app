import type { InvoiceWithDetails } from "@/app/(dashboard)/data/actions";

const HEADERS = [
  "請求日",
  "取引先コード",
  "取引先名",
  "請求書番号",
  "現場コード",
  "現場名",
  "品名・摘要",
  "勘定科目コード",
  "勘定科目名",
  "税抜金額",
  "税率",
  "消費税額",
  "税込金額",
  "摘要",
];

function escapeCSV(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

function taxRateLabel(rate: number): string {
  if (rate === 0.1) return "10%";
  if (rate === 0.08) return "8%";
  if (rate === 0) return "0%";
  return `${Math.round(rate * 100)}%`;
}

export function generateCSV(invoices: InvoiceWithDetails[]): string {
  const BOM = "\uFEFF";
  const lines: string[] = [];

  // ヘッダー行
  lines.push(HEADERS.map(escapeCSV).join(","));

  // 明細行単位で出力
  for (const inv of invoices) {
    for (const line of inv.invoice_lines) {
      const row = [
        inv.invoice_date,
        inv.vendor?.code || "",
        inv.vendor?.name || "",
        inv.invoice_number || "",
        line.site?.code || "",
        line.site?.name || "",
        line.description || "",
        line.account?.code || "",
        line.account?.name || "",
        line.amount_excl_tax.toString(),
        taxRateLabel(Number(line.tax_rate)),
        line.tax_amount.toString(),
        line.amount_incl_tax.toString(),
        inv.note || "",
      ];
      lines.push(row.map(escapeCSV).join(","));
    }
  }

  return BOM + lines.join("\r\n");
}

export function downloadCSV(csv: string, filename: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

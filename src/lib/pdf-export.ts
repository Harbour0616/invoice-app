import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { InvoiceWithDetails } from "@/app/(dashboard)/data/actions";

let fontBase64Cache: string | null = null;

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunks: string[] = [];
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    chunks.push(
      String.fromCharCode(...bytes.subarray(i, i + chunkSize))
    );
  }
  return btoa(chunks.join(""));
}

async function loadJapaneseFont(doc: jsPDF) {
  if (!fontBase64Cache) {
    const res = await fetch("/fonts/NotoSansJP-Regular.ttf");
    const buffer = await res.arrayBuffer();
    fontBase64Cache = arrayBufferToBase64(buffer);
  }
  doc.addFileToVFS("NotoSansJP-Regular.ttf", fontBase64Cache);
  doc.addFont("NotoSansJP-Regular.ttf", "NotoSansJP", "normal");
  doc.setFont("NotoSansJP");
}

function formatNumber(n: number): string {
  return n.toLocaleString("ja-JP");
}

function taxRateLabel(rate: number): string {
  if (rate === 0.1) return "10%";
  if (rate === 0.08) return "8%";
  if (rate === 0) return "0%";
  return `${Math.round(rate * 100)}%`;
}

export async function generatePDF(invoices: InvoiceWithDetails[]) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  await loadJapaneseFont(doc);

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const today = new Date();
  const dateStr = `${today.getFullYear()}/${String(today.getMonth() + 1).padStart(2, "0")}/${String(today.getDate()).padStart(2, "0")}`;

  // テーブルデータ構築（明細行単位）
  const body: string[][] = [];
  for (const inv of invoices) {
    const sortedLines = [...inv.invoice_lines].sort(
      (a, b) => a.line_order - b.line_order
    );
    for (const line of sortedLines) {
      body.push([
        inv.invoice_date,
        inv.vendor?.name || "",
        line.site?.name || "現場不明",
        line.description || "",
        line.account?.name || "",
        formatNumber(line.amount_excl_tax),
        formatNumber(line.tax_amount),
        formatNumber(line.amount_incl_tax),
        inv.note || "",
      ]);
    }
  }

  // 合計行
  const totalExcl = invoices.reduce((s, i) => s + i.total_excl_tax, 0);
  const totalTax = invoices.reduce((s, i) => s + i.total_tax, 0);
  const totalIncl = invoices.reduce((s, i) => s + i.total_incl_tax, 0);

  autoTable(doc, {
    head: [
      ["請求日", "取引先", "現場名", "品名・摘要", "勘定科目", "税抜金額", "消費税", "税込金額", "摘要"],
    ],
    body,
    foot: [
      ["", "", "", "", "合計", formatNumber(totalExcl), formatNumber(totalTax), formatNumber(totalIncl), ""],
    ],
    startY: 24,
    margin: { left: 10, right: 10 },
    styles: {
      font: "NotoSansJP",
      fontSize: 8,
      cellPadding: 2,
    },
    headStyles: {
      fillColor: [60, 60, 60],
      textColor: [255, 255, 255],
      fontStyle: "normal",
      fontSize: 8,
    },
    footStyles: {
      fillColor: [240, 240, 240],
      textColor: [0, 0, 0],
      fontStyle: "normal",
      fontSize: 8,
    },
    columnStyles: {
      0: { cellWidth: 22 },           // 請求日
      1: { cellWidth: 36 },           // 取引先
      2: { cellWidth: 30 },           // 現場名
      3: { cellWidth: 30 },           // 品名・摘要
      4: { cellWidth: 26 },           // 勘定科目
      5: { cellWidth: 24, halign: "right" }, // 税抜金額
      6: { cellWidth: 22, halign: "right" }, // 消費税
      7: { cellWidth: 26, halign: "right" }, // 税込金額
      8: { cellWidth: "auto" },        // 摘要
    },
    didDrawPage: (data) => {
      // ヘッダー
      doc.setFontSize(14);
      doc.text("支払請求書一覧", 10, 15);
      doc.setFontSize(9);
      doc.text(`出力日: ${dateStr}`, pageWidth - 10, 15, { align: "right" });

      // フッター（ページ番号）
      const pageNum = (doc as any).internal.getCurrentPageInfo().pageNumber;
      const totalPages = (doc as any).internal.getNumberOfPages();
      doc.setFontSize(8);
      doc.text(
        `${pageNum} / ${totalPages}`,
        pageWidth / 2,
        pageHeight - 8,
        { align: "center" }
      );
    },
  });

  // 全ページのフッターを再描画（総ページ数確定後）
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont("NotoSansJP");
    doc.setFontSize(8);
    // 前回描画分を白で塗りつぶし
    doc.setFillColor(255, 255, 255);
    doc.rect(0, pageHeight - 14, pageWidth, 14, "F");
    doc.setTextColor(0, 0, 0);
    doc.text(`${i} / ${totalPages}`, pageWidth / 2, pageHeight - 8, {
      align: "center",
    });
  }

  return doc;
}

export function downloadPDF(doc: jsPDF, filename: string) {
  doc.save(filename);
}

"use client";

import { useState } from "react";
import { submitConfirmation } from "./actions";

type Site = { id: string; code: string; name: string };

type InvoiceLine = {
  id: string;
  site_id: string | null;
  amount_excl_tax: number;
  tax_rate: number;
  tax_amount: number;
  amount_incl_tax: number;
  line_order: number;
  site: { id: string; code: string; name: string } | null;
  account: { id: string; code: string; name: string } | null;
};

type Invoice = {
  id: string;
  invoice_date: string;
  invoice_number: string | null;
  note: string | null;
  pdf_file_path: string | null;
  total_excl_tax: number;
  total_tax: number;
  total_incl_tax: number;
  vendor: { id: string; code: string; name: string } | null;
  invoice_lines: InvoiceLine[];
};

type ConfirmationRequest = {
  id: string;
  invoice_id: string;
  token: string;
  status: string;
  responses: Record<string, string> | null;
  completed_at: string | null;
};

type Props = {
  request: ConfirmationRequest;
  invoice: Invoice;
  sites: Site[];
  signedFileUrl: string | null;
  signedMarkerUrl: string | null;
};

function formatNumber(n: number): string {
  return n.toLocaleString("ja-JP");
}

function isImagePath(path: string | null | undefined): boolean {
  if (!path) return false;
  return /\.(jpg|jpeg|png)$/i.test(path);
}

export function ConfirmForm({ request, invoice, sites, signedFileUrl, signedMarkerUrl }: Props) {
  const isCompleted = request.status === "completed";
  const nullSiteLines = invoice.invoice_lines
    .filter((l) => l.site_id === null)
    .sort((a, b) => a.line_order - b.line_order);
  const knownSiteLines = invoice.invoice_lines
    .filter((l) => l.site_id !== null)
    .sort((a, b) => a.line_order - b.line_order);

  const [responses, setResponses] = useState<Record<string, string>>(() => {
    if (isCompleted && request.responses) {
      return request.responses;
    }
    const init: Record<string, string> = {};
    nullSiteLines.forEach((l) => {
      init[l.id] = "";
    });
    return init;
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  // 現場選択で開いている行
  const [expandedLine, setExpandedLine] = useState<string | null>(null);

  const allAnswered = nullSiteLines.every((l) => responses[l.id]);
  const showStickyButton = !isCompleted && !submitted && nullSiteLines.length > 0;

  const handleSubmit = async () => {
    if (!allAnswered) {
      setError("すべての現場不明行に現場を選択してください");
      return;
    }
    setError("");
    setLoading(true);
    const result = await submitConfirmation(request.token, responses);
    setLoading(false);
    if (result.error) {
      setError(result.error);
    } else {
      setSubmitted(true);
    }
  };

  const getSiteName = (siteId: string) => {
    const site = sites.find((s) => s.id === siteId);
    return site ? site.name : siteId;
  };

  return (
    <div className={showStickyButton ? "pb-24" : ""}>
      {/* 請求書情報 */}
      <div className="bg-card rounded-[10px] shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-4 mb-3">
        <div className="space-y-2 text-base">
          <div className="flex justify-between">
            <span className="text-sub-text">取引先</span>
            <span className="font-bold text-foreground">{invoice.vendor?.name || "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sub-text">税込合計</span>
            <span className="font-mono font-bold text-lg text-foreground">
              ¥{formatNumber(invoice.total_incl_tax)}
            </span>
          </div>
          <div className="flex justify-between text-sm text-sub-text">
            <span>請求日 {invoice.invoice_date}</span>
            {invoice.invoice_number && <span>No. {invoice.invoice_number}</span>}
          </div>
        </div>
        {invoice.note && (
          <p className="text-sm text-sub-text mt-2 pt-2 border-t border-border">
            摘要：{invoice.note}
          </p>
        )}
      </div>

      {/* PDF/画像表示 — 画面幅いっぱい、ピンチズーム可能 */}
      {signedFileUrl && (
        <div className="bg-card rounded-[10px] shadow-[0_2px_8px_rgba(0,0,0,0.04)] mb-3 overflow-hidden">
          <div className="px-4 py-2 border-b border-border">
            <h2 className="text-sm font-medium text-sub-text">添付ファイル</h2>
          </div>
          <div
            className="relative w-full overflow-auto"
            style={{ touchAction: "pinch-zoom" }}
          >
            {isImagePath(invoice.pdf_file_path) ? (
              <div className="relative">
                <img
                  src={signedFileUrl}
                  alt="請求書画像"
                  className="w-full h-auto block"
                />
                {signedMarkerUrl && (
                  <img
                    src={signedMarkerUrl}
                    alt=""
                    className="absolute inset-0 w-full h-full pointer-events-none"
                  />
                )}
              </div>
            ) : (
              <div className="relative">
                <iframe
                  src={signedFileUrl}
                  className="w-full h-[60vh] sm:h-[500px]"
                  title="請求書PDF"
                />
                {signedMarkerUrl && (
                  <img
                    src={signedMarkerUrl}
                    alt=""
                    className="absolute inset-0 w-full h-full pointer-events-none"
                  />
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ステータスメッセージ */}
      {(isCompleted || submitted) && (
        <div className="mb-3 p-4 bg-green-50 text-green-700 rounded-[10px] text-base font-medium text-center">
          回答済みです。ありがとうございました。
        </div>
      )}

      {error && (
        <div className="mb-3 p-4 bg-red-50 text-red-600 rounded-[10px] text-base">
          {error}
        </div>
      )}

      {/* 現場不明の明細行 — カード形式 */}
      {nullSiteLines.length > 0 && (
        <div className="mb-3">
          <div className="px-1 py-2">
            <h2 className="text-base font-bold text-amber-800">
              現場を選択してください（{nullSiteLines.length}件）
            </h2>
          </div>
          <div className="space-y-3">
            {nullSiteLines.map((line) => {
              const selected = responses[line.id];
              const isExpanded = expandedLine === line.id;
              const isDone = isCompleted || submitted;

              return (
                <div
                  key={line.id}
                  className={`bg-card rounded-[10px] shadow-[0_2px_8px_rgba(0,0,0,0.04)] border-2 ${
                    selected ? "border-amber-400" : "border-border"
                  }`}
                >
                  {/* 明細情報 */}
                  <div className="px-4 py-3 border-b border-border">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-base font-medium text-foreground">
                        {line.account?.name || "—"}
                      </span>
                      <span className="text-lg font-mono font-bold text-foreground shrink-0">
                        ¥{formatNumber(line.amount_incl_tax)}
                      </span>
                    </div>
                    <div className="text-sm text-sub-text mt-0.5">
                      明細 #{line.line_order + 1}　税率 {Math.round(Number(line.tax_rate) * 100)}%
                    </div>
                  </div>

                  {/* 現場選択 */}
                  <div className="px-4 py-3">
                    {isDone ? (
                      <div className="flex items-center gap-2">
                        <span className="text-green-600 text-lg">&#10003;</span>
                        <span className="text-base font-bold text-green-700">
                          {getSiteName(selected)}
                        </span>
                      </div>
                    ) : selected && !isExpanded ? (
                      <button
                        type="button"
                        onClick={() => setExpandedLine(line.id)}
                        className="w-full flex items-center justify-between py-2 cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-amber-600 text-lg">&#10003;</span>
                          <span className="text-base font-bold text-foreground">
                            {getSiteName(selected)}
                          </span>
                        </div>
                        <span className="text-sm text-amber-600">変更</span>
                      </button>
                    ) : (
                      <div className="space-y-2">
                        {sites.map((s) => (
                          <label
                            key={s.id}
                            className={`flex items-center gap-3 px-3 py-3 rounded-lg border-2 cursor-pointer ${
                              selected === s.id
                                ? "border-amber-500 bg-amber-50"
                                : "border-border active:bg-muted"
                            }`}
                          >
                            <input
                              type="radio"
                              name={`site-${line.id}`}
                              value={s.id}
                              checked={selected === s.id}
                              onChange={() => {
                                setResponses((prev) => ({
                                  ...prev,
                                  [line.id]: s.id,
                                }));
                                // 選択したら閉じる
                                setTimeout(() => setExpandedLine(null), 150);
                              }}
                              className="w-5 h-5 accent-amber-600 shrink-0"
                            />
                            <div className="min-w-0">
                              <div className="text-base font-medium text-foreground">{s.name}</div>
                              <div className="text-sm text-sub-text">{s.code}</div>
                            </div>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 現場確定済みの明細行 — 折りたたみ可能なシンプル表示 */}
      {knownSiteLines.length > 0 && (
        <details className="bg-card rounded-[10px] shadow-[0_2px_8px_rgba(0,0,0,0.04)] mb-3">
          <summary className="px-4 py-3 text-base font-medium text-sub-text cursor-pointer">
            確定済みの明細（{knownSiteLines.length}件）
          </summary>
          <div className="border-t border-border">
            {knownSiteLines.map((line) => (
              <div
                key={line.id}
                className="px-4 py-3 border-b border-table-separator last:border-b-0"
              >
                <div className="flex justify-between items-baseline">
                  <span className="text-base text-foreground">{line.site?.name || "—"}</span>
                  <span className="font-mono font-bold text-foreground">
                    ¥{formatNumber(line.amount_incl_tax)}
                  </span>
                </div>
                <div className="text-sm text-sub-text">
                  {line.account?.name || "—"}
                </div>
              </div>
            ))}
          </div>
        </details>
      )}

      {/* Sticky 回答ボタン */}
      {showStickyButton && (
        <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border px-4 py-3 shadow-[0_-2px_8px_rgba(0,0,0,0.08)]">
          <div className="max-w-3xl mx-auto">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading || !allAnswered}
              className={`w-full py-4 rounded-[10px] text-lg font-bold cursor-pointer ${
                allAnswered
                  ? "bg-amber-600 text-white active:bg-amber-700"
                  : "bg-muted text-sub-text"
              } disabled:opacity-50`}
            >
              {loading ? "送信中..." : allAnswered ? "回答を送信" : "すべての現場を選択してください"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

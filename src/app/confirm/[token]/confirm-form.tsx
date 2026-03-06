"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { submitConfirmation } from "./actions";

type Site = { id: string; code: string; name: string };

type InvoiceLine = {
  id: string;
  site_id: string | null;
  description: string | null;
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
    <div className={showStickyButton ? "pb-24" : ""} style={{ overscrollBehavior: 'none' }}>
      {/* 請求書情報 */}
      <div className="bg-card rounded-[10px] shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-4 mb-3">
        <div className="space-y-2 text-base">
          <div className="flex justify-between">
            <span className="text-sub-text">取引先</span>
            <span className="font-bold text-foreground">{invoice.vendor?.name || "—"}</span>
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
                    {line.description && (
                      <div className="text-sm text-sub-text mt-0.5">
                        {line.description}
                      </div>
                    )}
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

      {/* PDF/画像表示 */}
      {signedFileUrl && (
        <div className="bg-card rounded-[10px] shadow-[0_2px_8px_rgba(0,0,0,0.04)] mb-3 overflow-hidden">
          <div className="px-4 py-2 border-b border-border flex items-center justify-between">
            <h2 className="text-sm font-medium text-sub-text">添付ファイル</h2>
          </div>
          <ZoomableViewer
            src={signedFileUrl}
            isImage={isImagePath(invoice.pdf_file_path)}
          />
        </div>
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

function ZoomableViewer({ src, isImage }: { src: string; isImage: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // All mutable gesture state in a single ref to avoid stale closures
  const g = useRef({
    scale: 1,
    tx: 0,
    ty: 0,
    isDragging: false,
    isPinching: false,
    lastX: 0,
    lastY: 0,
    pinchDist0: 0,
    pinchScale0: 1,
    pinchMidX0: 0,
    pinchMidY0: 0,
    pinchTx0: 0,
    pinchTy0: 0,
    lastTapTime: 0,
    animating: false,
  });

  const apply = useCallback((animate = false) => {
    const el = contentRef.current;
    if (!el) return;
    const { scale, tx, ty } = g.current;
    el.style.transition = animate ? "transform 0.25s ease" : "none";
    el.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
    g.current.animating = animate;
  }, []);

  const clamp = useCallback(() => {
    const st = g.current;
    const el = containerRef.current;
    if (!el || st.scale <= 1) {
      st.tx = 0;
      st.ty = 0;
      return;
    }
    const w = el.clientWidth;
    const h = el.clientHeight;
    const maxX = (w * (st.scale - 1)) / 2;
    const maxY = (h * (st.scale - 1)) / 2;
    st.tx = Math.max(-maxX, Math.min(maxX, st.tx));
    st.ty = Math.max(-maxY, Math.min(maxY, st.ty));
  }, []);

  const reset = useCallback(() => {
    const st = g.current;
    st.scale = 1;
    st.tx = 0;
    st.ty = 0;
    apply(true);
  }, [apply]);

  const dist = (a: Touch, b: Touch) => {
    const dx = a.clientX - b.clientX;
    const dy = a.clientY - b.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onTouchStart = (e: TouchEvent) => {
      const st = g.current;
      if (e.touches.length === 2) {
        e.preventDefault();
        st.isPinching = true;
        st.isDragging = false;
        st.pinchDist0 = dist(e.touches[0], e.touches[1]);
        st.pinchScale0 = st.scale;
        st.pinchTx0 = st.tx;
        st.pinchTy0 = st.ty;
        const rect = el.getBoundingClientRect();
        st.pinchMidX0 = (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left - rect.width / 2;
        st.pinchMidY0 = (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top - rect.height / 2;
      } else if (e.touches.length === 1) {
        // Double-tap detection
        const now = Date.now();
        if (now - st.lastTapTime < 300) {
          e.preventDefault();
          if (st.scale > 1) {
            reset();
          } else {
            st.scale = 2.5;
            // Zoom toward tap point
            const rect = el.getBoundingClientRect();
            const tapX = e.touches[0].clientX - rect.left - rect.width / 2;
            const tapY = e.touches[0].clientY - rect.top - rect.height / 2;
            st.tx = -tapX * (st.scale - 1);
            st.ty = -tapY * (st.scale - 1);
            clamp();
            apply(true);
          }
          st.lastTapTime = 0;
          return;
        }
        st.lastTapTime = now;

        e.preventDefault();
        st.isDragging = true;
        st.lastX = e.touches[0].clientX;
        st.lastY = e.touches[0].clientY;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      const st = g.current;
      if (st.isPinching && e.touches.length === 2) {
        e.preventDefault();
        const d = dist(e.touches[0], e.touches[1]);
        const ratio = d / st.pinchDist0;
        st.scale = Math.max(1, Math.min(5, st.pinchScale0 * ratio));
        // Keep pinch midpoint stable
        st.tx = st.pinchTx0 * (st.scale / st.pinchScale0);
        st.ty = st.pinchTy0 * (st.scale / st.pinchScale0);
        clamp();
        apply();
      } else if (st.isDragging && e.touches.length === 1) {
        e.preventDefault();
        if (st.scale > 1) {
          const dx = e.touches[0].clientX - st.lastX;
          const dy = e.touches[0].clientY - st.lastY;
          st.tx += dx;
          st.ty += dy;
          clamp();
          apply();
        }
        st.lastX = e.touches[0].clientX;
        st.lastY = e.touches[0].clientY;
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      const st = g.current;
      if (e.touches.length < 2) st.isPinching = false;
      if (e.touches.length === 0) st.isDragging = false;
      // Snap back if scale is near 1
      if (e.touches.length === 0 && st.scale < 1.05) {
        reset();
      }
    };

    // Mouse: drag
    const onMouseDown = (e: MouseEvent) => {
      const st = g.current;
      if (st.scale <= 1) return;
      e.preventDefault();
      st.isDragging = true;
      st.lastX = e.clientX;
      st.lastY = e.clientY;
    };

    const onMouseMove = (e: MouseEvent) => {
      const st = g.current;
      if (!st.isDragging) return;
      e.preventDefault();
      st.tx += e.clientX - st.lastX;
      st.ty += e.clientY - st.lastY;
      st.lastX = e.clientX;
      st.lastY = e.clientY;
      clamp();
      apply();
    };

    const onMouseUp = () => {
      g.current.isDragging = false;
    };

    // Mouse: wheel zoom
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const st = g.current;
      const factor = e.deltaY > 0 ? 0.9 : 1.1;
      st.scale = Math.max(1, Math.min(5, st.scale * factor));
      clamp();
      apply();
    };

    el.addEventListener("touchstart", onTouchStart, { passive: false });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd);
    el.addEventListener("mousedown", onMouseDown);
    el.addEventListener("mousemove", onMouseMove);
    el.addEventListener("mouseup", onMouseUp);
    el.addEventListener("mouseleave", onMouseUp);
    el.addEventListener("wheel", onWheel, { passive: false });

    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("mousedown", onMouseDown);
      el.removeEventListener("mousemove", onMouseMove);
      el.removeEventListener("mouseup", onMouseUp);
      el.removeEventListener("mouseleave", onMouseUp);
      el.removeEventListener("wheel", onWheel);
    };
  }, [apply, clamp, reset]);

  return (
    <div
      ref={containerRef}
      style={{
        overflow: "hidden",
        touchAction: "none",
        cursor: "grab",
        position: "relative",
        userSelect: "none",
      }}
    >
      <div ref={contentRef} style={{ transformOrigin: "center center" }}>
        {isImage ? (
          <img
            src={src}
            style={{ width: "100%", height: "auto", display: "block" }}
            alt=""
            draggable={false}
          />
        ) : (
          <iframe
            src={src}
            style={{ width: "100%", height: "500px", border: "none", pointerEvents: "none" }}
          />
        )}
      </div>
    </div>
  );
}

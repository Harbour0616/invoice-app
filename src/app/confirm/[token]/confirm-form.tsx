"use client";

import { useState, useRef, useEffect } from "react";
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

const C = {
  green: "#2F9E77",
  greenDark: "#1F7A5C",
  mint: "#DDF5EC",
  bg: "#F7FBF9",
  white: "#FFFFFF",
  text: "#1F2D29",
  sub: "#7B8A86",
  border: "#D8E5E0",
};

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
  const [attachmentOpen, setAttachmentOpen] = useState(false);

  const allAnswered = nullSiteLines.every((l) => responses[l.id]);
  const showStickyButton = !isCompleted && !submitted && nullSiteLines.length > 0;
  const isDone = isCompleted || submitted;

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

  if (isDone) {
    return <CompletionScreen />;
  }

  return (
    <div style={{ overscrollBehavior: "none", paddingBottom: showStickyButton ? 100 : 24 }}>

      {error && (
        <div style={{
          background: "#FEF2F2",
          color: "#DC2626",
          borderRadius: 12,
          padding: "14px 16px",
          marginBottom: 16,
          fontSize: 15,
        }}>
          {error}
        </div>
      )}

      {/* ヘッダー */}
      {!isDone && (
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.sub, marginBottom: 4, letterSpacing: "0.04em" }}>
            現場確認
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: C.text, margin: "0 0 6px", lineHeight: 1.3 }}>
            この費用はどの現場ですか？
          </h2>
          <p style={{ fontSize: 14, color: C.sub, margin: 0, lineHeight: 1.5 }}>
            1件選ぶだけで完了します
          </p>
          <p style={{ fontSize: 13, color: C.sub, margin: "2px 0 0", lineHeight: 1.5 }}>
            迷った場合は下の請求書をご確認ください
          </p>
        </div>
      )}

      {/* 請求情報カード */}
      <div style={{
        background: C.white,
        borderRadius: 12,
        boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
        padding: 16,
        marginBottom: 16,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
          <span style={{ fontSize: 13, color: C.sub }}>取引先</span>
          <span style={{ fontSize: 16, fontWeight: 600, color: C.text }}>{invoice.vendor?.name || "—"}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <span style={{ fontSize: 13, color: C.sub }}>請求日</span>
          <span style={{ fontSize: 14, color: C.text }}>{invoice.invoice_date}</span>
        </div>
        {invoice.invoice_number && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 8 }}>
            <span style={{ fontSize: 13, color: C.sub }}>請求番号</span>
            <span style={{ fontSize: 14, color: C.text }}>{invoice.invoice_number}</span>
          </div>
        )}
        {invoice.note && (
          <div style={{ borderTop: `1px solid ${C.border}`, marginTop: 12, paddingTop: 12 }}>
            <span style={{ fontSize: 13, color: C.sub }}>摘要：</span>
            <span style={{ fontSize: 14, color: C.text }}>{invoice.note}</span>
          </div>
        )}
      </div>

      {/* 費用サマリー＋現場選択（各明細行ごと） */}
      {nullSiteLines.map((line) => {
        const selected = responses[line.id];

        return (
          <div key={line.id} style={{ marginBottom: 20 }}>
            {/* 費用サマリーカード */}
            <div style={{
              background: C.white,
              borderRadius: 12,
              boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
              padding: 16,
              marginBottom: 12,
              borderLeft: `4px solid ${C.green}`,
            }}>
              <div style={{ fontSize: 15, color: C.sub, marginBottom: 4 }}>
                {line.account?.name || "—"}
              </div>
              <div style={{ fontSize: 28, fontWeight: 700, color: C.text, fontFamily: "monospace", lineHeight: 1.2 }}>
                ¥{formatNumber(line.amount_incl_tax)}
              </div>
              <div style={{ fontSize: 13, color: C.sub, marginTop: 8 }}>
                明細 #{line.line_order + 1} ・ 税率 {Math.round(Number(line.tax_rate) * 100)}%
                {line.description && ` ・ ${line.description}`}
              </div>
            </div>

            {/* 現場選択エリア */}
            {isDone ? (
              <div style={{
                background: C.mint,
                borderRadius: 12,
                padding: "14px 16px",
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}>
                <span style={{ fontSize: 20, color: C.green }}>&#10003;</span>
                <span style={{ fontSize: 16, fontWeight: 600, color: C.greenDark }}>
                  {getSiteName(selected)}
                </span>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 10 }}>
                  この費用がかかった現場を1件選んでください
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {sites.map((s) => {
                    const isSelected = selected === s.id;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => {
                          setResponses((prev) => ({ ...prev, [line.id]: s.id }));
                        }}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          width: "100%",
                          padding: "14px 16px",
                          borderRadius: 10,
                          border: `2px solid ${isSelected ? C.green : C.border}`,
                          background: isSelected ? C.mint : C.white,
                          cursor: "pointer",
                          textAlign: "left",
                          transition: "background 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease",
                          boxShadow: isSelected ? `0 0 0 1px ${C.green}` : "none",
                        }}
                      >
                        <span style={{
                          width: 22,
                          height: 22,
                          borderRadius: "50%",
                          border: `2px solid ${isSelected ? C.green : "#C4CCC8"}`,
                          background: isSelected ? C.green : "transparent",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                          color: C.white,
                          fontSize: 13,
                          fontWeight: 700,
                          transition: "background 0.2s ease, border-color 0.2s ease",
                        }}>
                          {isSelected && "\u2713"}
                        </span>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 15, fontWeight: isSelected ? 600 : 500, color: C.text, transition: "font-weight 0.2s ease" }}>{s.name}</div>
                          <div style={{ fontSize: 13, color: C.sub }}>{s.code}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* 添付ファイルエリア（折りたたみ） */}
      {signedFileUrl && (
        <div style={{
          background: C.white,
          borderRadius: 12,
          boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
          marginBottom: 16,
          overflow: "hidden",
        }}>
          <button
            type="button"
            onClick={() => setAttachmentOpen(!attachmentOpen)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              width: "100%",
              padding: "14px 16px",
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: 15,
              fontWeight: 500,
              color: C.text,
            }}
          >
            <span>{attachmentOpen ? "請求書を閉じる" : "請求書を確認する"}</span>
            <span style={{
              fontSize: 11,
              color: C.sub,
              transition: "transform 0.2s ease",
              transform: attachmentOpen ? "rotate(180deg)" : "rotate(0deg)",
            }}>
              &#9660;
            </span>
          </button>
          {attachmentOpen && (
            <div style={{ borderTop: `1px solid ${C.border}` }}>
              <AttachmentViewer
                src={signedFileUrl}
                isImage={isImagePath(invoice.pdf_file_path)}
                maxHeight={showStickyButton ? "calc(100vh - 200px)" : "calc(100vh - 120px)"}
                markerUrl={signedMarkerUrl}
              />
            </div>
          )}
        </div>
      )}

      {/* 下部固定CTAボタン */}
      {showStickyButton && (
        <div style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          background: C.white,
          borderTop: `1px solid ${C.border}`,
          padding: "12px 16px",
          paddingBottom: "max(12px, env(safe-area-inset-bottom))",
          boxShadow: "0 -2px 12px rgba(0,0,0,0.08)",
          zIndex: 50,
        }}>
          <div style={{ maxWidth: 640, margin: "0 auto" }}>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading || !allAnswered}
              style={{
                width: "100%",
                padding: "16px 24px",
                borderRadius: 12,
                border: "none",
                fontSize: 17,
                fontWeight: 700,
                cursor: allAnswered ? "pointer" : "default",
                background: allAnswered ? C.green : "#E9EEEC",
                color: allAnswered ? C.white : "#A7B3AF",
                boxShadow: allAnswered ? "0 2px 8px rgba(47,158,119,0.3)" : "none",
                transition: "background 0.2s ease, color 0.2s ease, box-shadow 0.2s ease",
                opacity: loading ? 0.6 : 1,
              }}
            >
              {loading ? "送信中..." : allAnswered ? "回答を送信する" : "現場を1件選択してください"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function CompletionScreen() {
  return (
    <div style={{
      position: "fixed",
      inset: 0,
      background: C.bg,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "flex-start",
      padding: "0 24px",
      zIndex: 100,
      overflowY: "auto",
    }}>
      {/* 上部タイトル */}
      <div style={{
        paddingTop: 56,
        marginBottom: 40,
        textAlign: "center",
      }}>
        <span style={{
          fontSize: 13,
          fontWeight: 600,
          color: C.green,
          letterSpacing: "0.08em",
        }}>
          回答完了
        </span>
      </div>

      {/* キャラクター（小さめ） */}
      <div style={{ marginBottom: 28 }}>
        <svg width="100" height="112" viewBox="0 0 180 200" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* ヘルメット */}
          <ellipse cx="90" cy="52" rx="42" ry="18" fill="#F5A623" />
          <rect x="48" y="40" width="84" height="24" rx="4" fill="#F5A623" />
          <rect x="54" y="34" width="72" height="12" rx="6" fill="#E8971E" />
          <rect x="60" y="30" width="60" height="8" rx="4" fill="#F5A623" />
          <rect x="87" y="30" width="6" height="34" rx="3" fill="#E8971E" opacity="0.5" />

          {/* 頭 */}
          <rect x="52" y="60" width="76" height="60" rx="16" fill="#8FE3BF" />
          <rect x="52" y="60" width="76" height="60" rx="16" fill="url(#glowDone)" opacity="0.3" />
          {/* 目 */}
          <circle cx="74" cy="86" r="8" fill="#1F2D29" />
          <circle cx="106" cy="86" r="8" fill="#1F2D29" />
          <circle cx="76" cy="84" r="3" fill="#F7FBF9" />
          <circle cx="108" cy="84" r="3" fill="#F7FBF9" />
          {/* 口 */}
          <path d="M80 100 Q90 108 100 100" stroke="#1F2D29" strokeWidth="2.5" strokeLinecap="round" fill="none" />

          {/* 体 */}
          <rect x="58" y="122" width="64" height="44" rx="12" fill="#8FE3BF" />
          <rect x="58" y="122" width="64" height="44" rx="12" fill="url(#glowDone)" opacity="0.2" />
          <rect x="82" y="128" width="16" height="4" rx="2" fill="#1F2D29" opacity="0.12" />
          <rect x="82" y="136" width="16" height="4" rx="2" fill="#1F2D29" opacity="0.12" />

          {/* 左腕 */}
          <rect x="36" y="126" width="22" height="14" rx="7" fill="#8FE3BF" />
          {/* 右腕（手を上げ） */}
          <g transform="rotate(-30, 140, 120)">
            <rect x="122" y="112" width="28" height="14" rx="7" fill="#8FE3BF" />
          </g>
          <circle cx="148" cy="98" r="9" fill="#8FE3BF" />

          {/* 足 */}
          <rect x="68" y="166" width="18" height="18" rx="6" fill="#6DCAA3" />
          <rect x="94" y="166" width="18" height="18" rx="6" fill="#6DCAA3" />

          <defs>
            <radialGradient id="glowDone" cx="50%" cy="30%" r="60%">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
            </radialGradient>
          </defs>
        </svg>
      </div>

      {/* メインメッセージ */}
      <h2 style={{
        color: C.text,
        fontSize: 22,
        fontWeight: 700,
        textAlign: "center",
        margin: "0 0 16px",
        lineHeight: 1.4,
      }}>
        ご回答ありがとうございました
      </h2>

      {/* サブメッセージ */}
      <p style={{
        color: C.sub,
        fontSize: 15,
        textAlign: "center",
        margin: "0 0 6px",
        lineHeight: 1.6,
      }}>
        現場の回答を受け付けました
      </p>
      <p style={{
        color: C.sub,
        fontSize: 14,
        textAlign: "center",
        margin: "0 0 52px",
        lineHeight: 1.6,
      }}>
        この画面は閉じて大丈夫です
      </p>

      {/* 閉じるボタン */}
      <button
        type="button"
        onClick={() => {
          try { window.close(); } catch { history.back(); }
        }}
        style={{
          padding: "16px 48px",
          borderRadius: 14,
          border: "none",
          background: C.green,
          color: C.white,
          fontSize: 16,
          fontWeight: 600,
          cursor: "pointer",
          boxShadow: "0 2px 8px rgba(47,158,119,0.25)",
          transition: "background 0.2s ease",
          minWidth: 200,
        }}
      >
        閉じる
      </button>
    </div>
  );
}

function AttachmentViewer({
  src,
  isImage,
  maxHeight,
  markerUrl,
}: {
  src: string;
  isImage: boolean;
  maxHeight: string;
  markerUrl?: string | null;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const g = useRef({
    scale: 1, tx: 0, ty: 0,
    isDragging: false, isPinching: false,
    lastX: 0, lastY: 0,
    pinchDist0: 0, pinchScale0: 1,
    pinchTx0: 0, pinchTy0: 0,
    pinchMidX: 0, pinchMidY: 0,
    lastTapTime: 0,
  });

  const apply = (animate = false) => {
    const el = contentRef.current;
    if (!el) return;
    const { tx, ty, scale } = g.current;
    el.style.transition = animate ? "transform 0.25s ease" : "none";
    el.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
  };

  const reset = () => {
    g.current.scale = 1;
    g.current.tx = 0;
    g.current.ty = 0;
    apply(true);
  };

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const dist = (a: Touch, b: Touch) =>
      Math.sqrt((a.clientX - b.clientX) ** 2 + (a.clientY - b.clientY) ** 2);

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
        st.pinchMidX = (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left;
        st.pinchMidY = (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top;
      } else if (e.touches.length === 1) {
        const now = Date.now();
        if (now - st.lastTapTime < 300) {
          e.preventDefault();
          reset();
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
        const newScale = Math.max(0.5, Math.min(8, st.pinchScale0 * (d / st.pinchDist0)));
        const ratio = newScale / st.pinchScale0;
        st.tx = st.pinchMidX - ratio * (st.pinchMidX - st.pinchTx0);
        st.ty = st.pinchMidY - ratio * (st.pinchMidY - st.pinchTy0);
        st.scale = newScale;
        apply();
      } else if (st.isDragging && e.touches.length === 1) {
        e.preventDefault();
        st.tx += e.touches[0].clientX - st.lastX;
        st.ty += e.touches[0].clientY - st.lastY;
        st.lastX = e.touches[0].clientX;
        st.lastY = e.touches[0].clientY;
        apply();
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      const st = g.current;
      if (e.touches.length < 2) st.isPinching = false;
      if (e.touches.length === 0) st.isDragging = false;
    };

    const onMouseDown = (e: MouseEvent) => {
      e.preventDefault();
      const st = g.current;
      st.isDragging = true;
      st.lastX = e.clientX;
      st.lastY = e.clientY;
    };
    const onMouseMove = (e: MouseEvent) => {
      const st = g.current;
      if (!st.isDragging) return;
      st.tx += e.clientX - st.lastX;
      st.ty += e.clientY - st.lastY;
      st.lastX = e.clientX;
      st.lastY = e.clientY;
      apply();
    };
    const onMouseUp = () => { g.current.isDragging = false; };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const st = g.current;
      const factor = e.deltaY > 0 ? 0.9 : 1.1;
      const newScale = Math.max(0.5, Math.min(8, st.scale * factor));
      const rect = el.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const ratio = newScale / st.scale;
      st.tx = mx - ratio * (mx - st.tx);
      st.ty = my - ratio * (my - st.ty);
      st.scale = newScale;
      apply();
    };

    const onDblClick = () => reset();

    el.addEventListener("touchstart", onTouchStart, { passive: false });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd);
    el.addEventListener("mousedown", onMouseDown);
    el.addEventListener("mousemove", onMouseMove);
    el.addEventListener("mouseup", onMouseUp);
    el.addEventListener("mouseleave", onMouseUp);
    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("dblclick", onDblClick);

    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("mousedown", onMouseDown);
      el.removeEventListener("mousemove", onMouseMove);
      el.removeEventListener("mouseup", onMouseUp);
      el.removeEventListener("mouseleave", onMouseUp);
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("dblclick", onDblClick);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        overflow: "hidden",
        touchAction: "none",
        userSelect: "none",
        cursor: "grab",
        maxHeight,
      }}
    >
      <div ref={contentRef} style={{ transformOrigin: "0 0", position: "relative" }}>
        {isImage ? (
          <img
            src={src}
            style={{ width: "100%", height: "auto", display: "block" }}
            alt="添付ファイル"
            draggable={false}
          />
        ) : (
          <iframe
            src={src}
            style={{
              width: "250%",
              height: "80vh",
              minHeight: "500px",
              border: "none",
              display: "block",
              pointerEvents: "none",
            }}
          />
        )}
        {markerUrl && (
          <img
            src={markerUrl}
            alt=""
            draggable={false}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              pointerEvents: "none",
            }}
          />
        )}
      </div>
    </div>
  );
}

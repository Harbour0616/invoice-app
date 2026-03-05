"use client";

import { useState, useCallback, useRef, useEffect, forwardRef, useImperativeHandle } from "react";

const ZOOM_STEPS = [50, 75, 100, 125, 150, 200, 250, 300];
const ACCEPTED_TYPES = ["application/pdf", "image/jpeg", "image/png"];
const ACCEPT_STRING = "application/pdf,image/jpeg,image/png";
const MARKER_COLOR = "rgba(255, 255, 0, 0.18)";
const MARKER_GUIDE_COLOR = "rgba(255, 255, 0, 0.10)";
const MARKER_WIDTH = 14;

export type PdfViewerHandle = {
  getMarkerImage: () => Promise<Blob | null>;
};

type Props = {
  onFileChange?: (file: File | null) => void;
};

export const PdfViewer = forwardRef<PdfViewerHandle, Props>(function PdfViewer({ onFileChange }, ref) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [fileType, setFileType] = useState<"pdf" | "image" | null>(null);
  const [zoom, setZoom] = useState<"page-width" | number>("page-width");
  const [isDragging, setIsDragging] = useState(false);
  const [markerEnabled, setMarkerEnabled] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const guideCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDrawingRef = useRef(false);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);
  const hasDrawnRef = useRef(false);
  // Shift直線モード用
  const straightAnchorRef = useRef<{ x: number; y: number } | null>(null);

  useImperativeHandle(ref, () => ({
    getMarkerImage: () => {
      const canvas = canvasRef.current;
      if (!canvas || !hasDrawnRef.current) return Promise.resolve(null);
      return new Promise<Blob | null>((resolve) => {
        canvas.toBlob((blob) => resolve(blob), "image/png");
      });
    },
  }));

  // Canvas サイズをコンテナに同期
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    const guide = guideCanvasRef.current;
    if (!container || !canvas) return;

    const sync = () => {
      const w = container.offsetWidth;
      const h = container.offsetHeight;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      if (guide && (guide.width !== w || guide.height !== h)) {
        guide.width = w;
        guide.height = h;
      }
    };
    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(container);
    return () => observer.disconnect();
  }, [blobUrl, fileType]);

  // --- Drawing handlers ---
  const getPos = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const guide = guideCanvasRef.current;
      if (!guide) return null;
      const rect = guide.getBoundingClientRect();
      return {
        x: (e.clientX - rect.left) * (guide.width / rect.width),
        y: (e.clientY - rect.top) * (guide.height / rect.height),
      };
    },
    []
  );

  const clearGuide = useCallback(() => {
    const guide = guideCanvasRef.current;
    const ctx = guide?.getContext("2d");
    if (guide && ctx) ctx.clearRect(0, 0, guide.width, guide.height);
  }, []);

  const drawGuide = useCallback((from: { x: number; y: number }, to: { x: number; y: number }) => {
    const guide = guideCanvasRef.current;
    const ctx = guide?.getContext("2d");
    if (!guide || !ctx) return;
    ctx.clearRect(0, 0, guide.width, guide.height);
    ctx.strokeStyle = MARKER_GUIDE_COLOR;
    ctx.lineWidth = MARKER_WIDTH;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
  }, []);

  /** Shift押下時: 水平 or 垂直に制約する */
  const constrainPos = useCallback((anchor: { x: number; y: number }, pos: { x: number; y: number }) => {
    const dx = Math.abs(pos.x - anchor.x);
    const dy = Math.abs(pos.y - anchor.y);
    // 水平 or 垂直、移動量が大きい方にスナップ
    if (dx >= dy) {
      return { x: pos.x, y: anchor.y };
    } else {
      return { x: anchor.x, y: pos.y };
    }
  }, []);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      isDrawingRef.current = true;
      hasDrawnRef.current = true;
      const pos = getPos(e);
      lastPosRef.current = pos;
      straightAnchorRef.current = e.shiftKey && pos ? { ...pos } : null;
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    [getPos]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!isDrawingRef.current) return;
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!ctx) return;
      const rawPos = getPos(e);
      if (!rawPos || !lastPosRef.current) return;

      const isStraight = e.shiftKey;

      // Shift押された瞬間にアンカー設定
      if (isStraight && !straightAnchorRef.current) {
        straightAnchorRef.current = { ...lastPosRef.current };
      }
      // Shift離された瞬間にアンカー解除
      if (!isStraight && straightAnchorRef.current) {
        clearGuide();
        straightAnchorRef.current = null;
      }

      if (isStraight && straightAnchorRef.current) {
        // 直線モード: ガイドだけ描画、確定は onPointerUp で
        const snapped = constrainPos(straightAnchorRef.current, rawPos);
        drawGuide(straightAnchorRef.current, snapped);
      } else {
        // フリーハンドモード
        ctx.strokeStyle = MARKER_COLOR;
        ctx.lineWidth = MARKER_WIDTH;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.beginPath();
        ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
        ctx.lineTo(rawPos.x, rawPos.y);
        ctx.stroke();
        lastPosRef.current = rawPos;
      }
    },
    [getPos, constrainPos, drawGuide, clearGuide]
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (isDrawingRef.current && straightAnchorRef.current) {
        // 直線確定: ガイドをクリアしてメインキャンバスに描画
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");
        const rawPos = getPos(e);
        if (ctx && rawPos) {
          const snapped = constrainPos(straightAnchorRef.current, rawPos);
          ctx.strokeStyle = MARKER_COLOR;
          ctx.lineWidth = MARKER_WIDTH;
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.moveTo(straightAnchorRef.current.x, straightAnchorRef.current.y);
          ctx.lineTo(snapped.x, snapped.y);
          ctx.stroke();
        }
        clearGuide();
      }
      isDrawingRef.current = false;
      lastPosRef.current = null;
      straightAnchorRef.current = null;
    },
    [getPos, constrainPos, clearGuide]
  );

  const clearMarker = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    hasDrawnRef.current = false;
  }, []);

  const markerStyle = {
    pointerEvents: (markerEnabled ? "auto" : "none") as React.CSSProperties["pointerEvents"],
    cursor: markerEnabled ? "crosshair" : "default",
  };

  const markerLayers = (
    <>
      <canvas ref={canvasRef} className="absolute inset-0" style={{ pointerEvents: "none" }} />
      <canvas
        ref={guideCanvasRef}
        className="absolute inset-0"
        style={markerStyle}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      />
    </>
  );

  // --- File handlers ---
  const handleFile = useCallback(
    (file: File) => {
      if (!ACCEPTED_TYPES.includes(file.type)) return;
      setBlobUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(file);
      });
      setFileType(file.type === "application/pdf" ? "pdf" : "image");
      setZoom("page-width");
      setMarkerEnabled(false);
      onFileChange?.(file);
    },
    [onFileChange]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleClear = useCallback(() => {
    setBlobUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setFileType(null);
    setMarkerEnabled(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
    onFileChange?.(null);
  }, [onFileChange]);

  // --- Zoom handlers ---
  const zoomIn = useCallback(() => {
    setZoom((prev) => {
      const current = prev === "page-width" ? 100 : prev;
      return ZOOM_STEPS.find((s) => s > current) ?? current;
    });
  }, []);

  const zoomOut = useCallback(() => {
    setZoom((prev) => {
      const current = prev === "page-width" ? 100 : prev;
      return [...ZOOM_STEPS].reverse().find((s) => s < current) ?? current;
    });
  }, []);

  const fitWidth = useCallback(() => setZoom("page-width"), []);

  const zoomLabel = zoom === "page-width" ? "幅に合わせる" : `${zoom}%`;

  // --- Preview ---
  if (blobUrl && fileType) {
    const iframeSrc =
      fileType === "pdf"
        ? zoom === "page-width"
          ? `${blobUrl}#navpanes=0&view=FitH`
          : `${blobUrl}#navpanes=0&zoom=${zoom}`
        : null;

    return (
      <div className="h-full flex flex-col">
        {/* ツールバー */}
        <div className="flex items-center justify-between px-3 py-1.5 bg-card border-b border-border shrink-0">
          <div className="flex items-center gap-1">
            <button type="button" onClick={zoomOut} className="px-2 py-1 text-sm text-sub-text hover:bg-muted rounded cursor-pointer" title="縮小">−</button>
            <span className="text-xs text-sub-text w-20 text-center select-none">{zoomLabel}</span>
            <button type="button" onClick={zoomIn} className="px-2 py-1 text-sm text-sub-text hover:bg-muted rounded cursor-pointer" title="拡大">+</button>
            <button
              type="button"
              onClick={fitWidth}
              className={`ml-1 px-2 py-1 text-xs rounded cursor-pointer ${zoom === "page-width" ? "bg-primary/10 text-primary" : "text-sub-text hover:bg-muted"}`}
              title="幅に合わせる"
            >
              幅合わせ
            </button>

            {/* セパレータ */}
            <div className="mx-1.5 w-px h-4 bg-border" />

            <button
              type="button"
              onClick={() => setMarkerEnabled((v) => !v)}
              className={`px-2 py-1 text-xs rounded cursor-pointer ${markerEnabled ? "bg-yellow-200 text-yellow-800" : "text-sub-text hover:bg-muted"}`}
              title="マーカー"
            >
              マーカー
            </button>
            <button
              type="button"
              onClick={clearMarker}
              className="px-2 py-1 text-xs text-sub-text hover:bg-muted rounded cursor-pointer"
              title="マーカーをクリア"
            >
              マーカークリア
            </button>
          </div>
          <button type="button" onClick={handleClear} className="text-xs text-red-500 hover:text-red-700 cursor-pointer">
            クリア
          </button>
        </div>

        {/* コンテンツ */}
        {fileType === "pdf" ? (
          <div ref={containerRef} className="flex-1 relative min-h-0">
            <iframe src={iframeSrc!} className="absolute inset-0 w-full h-full" title="請求書PDF" />
            {markerLayers}
          </div>
        ) : (
          <div className="flex-1 overflow-auto bg-muted min-h-0">
            <div className="flex items-start justify-center p-4">
              <div
                ref={containerRef}
                className="relative"
                style={zoom === "page-width" ? { width: "100%" } : { width: `${zoom}%` }}
              >
                <img src={blobUrl} alt="請求書画像" className="block w-full h-auto" />
                {markerLayers}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // --- アップロード待ち ---
  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={() => fileInputRef.current?.click()}
      className={`h-full flex flex-col items-center justify-center cursor-pointer rounded-[10px] border-2 border-dashed bg-card ${
        isDragging ? "border-primary bg-primary/5" : "border-border hover:border-sub-text"
      }`}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPT_STRING}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
      <svg className="w-12 h-12 text-sub-text/40 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
      <p className="text-sm text-sub-text mb-1">請求書ファイルをここにドロップ</p>
      <p className="text-xs text-sub-text">PDF・JPG・PNG に対応</p>
    </div>
  );
});

"use client";

import { useState, useCallback, useRef, useEffect, type ReactNode } from "react";

type Props = {
  left: ReactNode;
  right: ReactNode;
  initialRatio?: number; // 0-1, 左パネルの比率
  minRatio?: number;
  maxRatio?: number;
};

export function ResizableSplit({
  left,
  right,
  initialRatio = 0.5,
  minRatio = 0.2,
  maxRatio = 0.8,
}: Props) {
  const [ratio, setRatio] = useState(initialRatio);
  const containerRef = useRef<HTMLDivElement>(null);
  const dividerRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

  const startDrag = useCallback(
    () => {
      draggingRef.current = true;
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    },
    []
  );

  // マウスによるドラッグ
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      startDrag();

      const onMouseMove = (ev: MouseEvent) => {
        if (!draggingRef.current || !containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const x = ev.clientX - rect.left;
        setRatio(Math.min(maxRatio, Math.max(minRatio, x / rect.width)));
      };

      const onMouseUp = () => {
        draggingRef.current = false;
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };

      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    },
    [startDrag, minRatio, maxRatio]
  );

  // タッチによるドラッグ — passive リスナーで登録し preventDefault() を使わない
  // divider に touch-action: none を設定済みなのでブラウザ側でスクロールは抑制される
  useEffect(() => {
    const divider = dividerRef.current;
    if (!divider) return;

    const onTouchStart = () => {
      startDrag();
    };

    const onTouchMove = (ev: TouchEvent) => {
      if (!draggingRef.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = ev.touches[0].clientX - rect.left;
      setRatio(Math.min(maxRatio, Math.max(minRatio, x / rect.width)));
    };

    const onTouchEnd = () => {
      draggingRef.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    // passive: true — preventDefault() を呼ばないのでブラウザに通知
    divider.addEventListener("touchstart", onTouchStart, { passive: true });
    divider.addEventListener("touchmove", onTouchMove, { passive: true });
    divider.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      divider.removeEventListener("touchstart", onTouchStart);
      divider.removeEventListener("touchmove", onTouchMove);
      divider.removeEventListener("touchend", onTouchEnd);
    };
  }, [startDrag, minRatio, maxRatio]);

  const leftPercent = `${ratio * 100}%`;
  const rightPercent = `${(1 - ratio) * 100}%`;

  return (
    <div ref={containerRef} className="flex h-full">
      <div style={{ width: leftPercent }} className="min-w-0 h-full overflow-hidden">
        {left}
      </div>
      <div
        ref={dividerRef}
        onMouseDown={handleMouseDown}
        className="w-3 shrink-0 cursor-col-resize flex items-stretch justify-center group"
        style={{ touchAction: "none" }}
      >
        <div className="w-px bg-border group-hover:bg-primary/40 group-active:bg-primary/40" />
      </div>
      <div style={{ width: rightPercent }} className="min-w-0 h-full overflow-y-auto overflow-x-hidden">
        {right}
      </div>
    </div>
  );
}

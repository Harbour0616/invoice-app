"use client";

import { useState, useCallback, useRef, type ReactNode } from "react";

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
  const draggingRef = useRef(false);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      draggingRef.current = true;

      const onMouseMove = (ev: MouseEvent) => {
        if (!draggingRef.current || !containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const x = ev.clientX - rect.left;
        const newRatio = Math.min(maxRatio, Math.max(minRatio, x / rect.width));
        setRatio(newRatio);
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
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    },
    [minRatio, maxRatio]
  );

  const leftPercent = `${ratio * 100}%`;
  const rightPercent = `${(1 - ratio) * 100}%`;

  return (
    <div ref={containerRef} className="flex h-full">
      <div style={{ width: leftPercent }} className="min-w-0 overflow-auto">
        {left}
      </div>
      <div
        onMouseDown={handleMouseDown}
        className="w-3 shrink-0 cursor-col-resize flex items-stretch justify-center group"
      >
        <div className="w-px bg-border group-hover:bg-primary/40 group-active:bg-primary/40" />
      </div>
      <div style={{ width: rightPercent }} className="min-w-0 overflow-auto">
        {right}
      </div>
    </div>
  );
}

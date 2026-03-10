"use client";

import dynamic from "next/dynamic";
import type { ProfitSummary } from "./actions";

const ProfitClient = dynamic(
  () => import("./profit-client").then((m) => m.ProfitClient),
  {
    ssr: false,
    loading: () => (
      <div style={{ textAlign: "center", padding: "80px 24px", color: "#6B8399" }}>
        <div
          style={{
            width: 36,
            height: 36,
            border: "3px solid #D0DDE8",
            borderTopColor: "#2E8B9A",
            borderRadius: "50%",
            animation: "koji-spin 0.7s linear infinite",
            margin: "0 auto 14px",
          }}
        />
        読み込み中...
      </div>
    ),
  }
);

export function ProfitWrapper({ initialData }: { initialData: ProfitSummary }) {
  return <ProfitClient initialData={initialData} />;
}

"use client";

import { useState } from "react";
import { WorkLogTab } from "./work-log-tab";
import { SummaryTab } from "./summary-tab";

type SiteOption = { id: string; code: string; name: string };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function LaborClient({
  initialEmployees,
  sites,
  initialWorkLogs,
  defaultFrom,
  defaultTo,
}: {
  initialEmployees: any[];
  sites: SiteOption[];
  initialWorkLogs: any[];
  defaultFrom: string;
  defaultTo: string;
}) {
  const [activeTab, setActiveTab] = useState<"worklog" | "summary">("worklog");

  return (
    <div>
      <h1 className="text-xl font-bold mb-6">労務管理</h1>

      {/* タブ */}
      <div className="flex gap-1 mb-6 border-b border-border">
        {([
          { key: "worklog", label: "日報入力" },
          { key: "summary", label: "集計" },
        ] as const).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-5 py-3 text-sm font-medium border-b-2 -mb-px cursor-pointer transition-colors ${
              activeTab === tab.key
                ? "text-primary border-primary"
                : "text-sub-text border-transparent hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "worklog" && (
        <WorkLogTab
          initialWorkLogs={initialWorkLogs}
          employees={initialEmployees}
          sites={sites}
          defaultFrom={defaultFrom}
          defaultTo={defaultTo}
        />
      )}
      {activeTab === "summary" && (
        <SummaryTab sites={sites} />
      )}
    </div>
  );
}

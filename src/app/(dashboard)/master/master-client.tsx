"use client";

import { useState } from "react";
import { SiteManageClient } from "../sites/manage/site-manage-client";
import { ClientList } from "../clients/client-list";
import { VendorList } from "./vendors/vendor-list";
import { EmployeeTab } from "../labor/employee-tab";
import type { Site, Client, Vendor, Employee } from "@/types/database";

export function MasterClient({
  sites,
  clients,
  vendors,
  employees,
}: {
  sites: Site[];
  clients: Client[];
  vendors: Vendor[];
  employees: Employee[];
}) {
  const [activeTab, setActiveTab] = useState<"sites" | "clients" | "vendors" | "employees">("sites");

  return (
    <div>
      <h1 className="text-xl font-bold mb-6">マスタ管理</h1>

      {/* タブ */}
      <div className="flex gap-1 mb-6 border-b border-border">
        {([
          { key: "sites", label: "現場" },
          { key: "clients", label: "売上先" },
          { key: "vendors", label: "支払先" },
          { key: "employees", label: "従業員" },
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

      {activeTab === "sites" && <SiteManageClient initialSites={sites} />}
      {activeTab === "clients" && <ClientList initialClients={clients} />}
      {activeTab === "vendors" && <VendorList initialVendors={vendors} />}
      {activeTab === "employees" && <EmployeeTab initialEmployees={employees} />}
    </div>
  );
}

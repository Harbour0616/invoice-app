"use client";

import { useState, useRef, useCallback } from "react";
import { EstimateTab } from "./estimate-tab";
import { SalesInvoiceTab } from "./sales-invoice-tab";

type SiteOption = { id: string; code: string; name: string; client_name: string | null };
type ClientOption = { id: string; client_code: string | null; client_name: string };

type PrefillData = {
  site_id: string | null;
  client_id: string | null;
  client_name: string;
  title: string;
  estimate_id: string;
  items: {
    item_name: string;
    quantity: number;
    unit: string | null;
    unit_price: number;
    amount: number;
  }[];
};

type PrintData = {
  type: "estimate" | "invoice";
  number: string;
  date: string;
  client_name: string;
  title: string;
  valid_until?: string | null;
  due_date?: string | null;
  notes: string | null;
  items: {
    item_name: string;
    quantity: number;
    unit: string | null;
    unit_price: number;
    amount: number;
  }[];
  subtotal: number;
  tax_amount: number;
  total_amount: number;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function SalesClient({
  initialEstimates,
  initialSalesInvoices,
  sites,
  clients,
}: {
  initialEstimates: any[];
  initialSalesInvoices: any[];
  sites: SiteOption[];
  clients: ClientOption[];
}) {
  const [activeTab, setActiveTab] = useState<"estimates" | "invoices">(
    "estimates"
  );
  const [prefillData, setPrefillData] = useState<PrefillData | null>(null);
  const [printData, setPrintData] = useState<PrintData | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const handleCreateInvoice = useCallback((data: PrefillData) => {
    setPrefillData(data);
    setActiveTab("invoices");
  }, []);

  const handlePrint = useCallback((data: PrintData) => {
    setPrintData(data);
    setTimeout(() => {
      window.print();
      setPrintData(null);
    }, 100);
  }, []);

  const fmt = (n: number) => `¥${n.toLocaleString("ja-JP")}`;

  return (
    <>
      {/* 通常表示 (印刷時非表示) */}
      <div className="no-print">
        <h1 className="text-xl font-bold mb-6">売上管理</h1>

        {/* タブ */}
        <div className="flex gap-1 mb-6 border-b border-border">
          {(
            [
              { key: "estimates", label: "見積書" },
              { key: "invoices", label: "売上請求書" },
            ] as const
          ).map((tab) => (
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

        {activeTab === "estimates" ? (
          <EstimateTab
            initialEstimates={initialEstimates}
            sites={sites}
            clients={clients}
            onCreateInvoice={handleCreateInvoice}
            onPrint={handlePrint}
          />
        ) : (
          <SalesInvoiceTab
            initialSalesInvoices={initialSalesInvoices}
            sites={sites}
            clients={clients}
            prefillData={prefillData}
            clearPrefill={() => setPrefillData(null)}
            onPrint={handlePrint}
          />
        )}
      </div>

      {/* 印刷用 (通常時非表示) */}
      {printData && (
        <div ref={printRef} className="print-area hidden">
          <div
            style={{
              fontFamily:
                "'Noto Sans JP', 'Hiragino Sans', sans-serif",
              fontSize: "11pt",
              color: "#1a1a1a",
            }}
          >
            {/* タイトル */}
            <h1
              style={{
                textAlign: "center",
                fontSize: "22pt",
                fontWeight: 700,
                letterSpacing: "0.3em",
                marginBottom: "30px",
                paddingBottom: "8px",
                borderBottom: "3px double #333",
              }}
            >
              {printData.type === "estimate" ? "見 積 書" : "請 求 書"}
            </h1>

            {/* ヘッダー情報 */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "30px",
              }}
            >
              <div>
                <p
                  style={{
                    fontSize: "14pt",
                    fontWeight: 700,
                    marginBottom: "4px",
                  }}
                >
                  {printData.client_name}{" "}
                  <span style={{ fontWeight: 400 }}>御中</span>
                </p>
                <p style={{ marginTop: "12px" }}>
                  工事名: {printData.title}
                </p>
              </div>
              <div style={{ textAlign: "right", fontSize: "10pt" }}>
                <p>
                  No. {printData.number}
                </p>
                <p>
                  {printData.type === "estimate" ? "見積日" : "請求日"}:{" "}
                  {printData.date}
                </p>
                {printData.type === "estimate" && printData.valid_until && (
                  <p>有効期限: {printData.valid_until}</p>
                )}
                {printData.type === "invoice" && printData.due_date && (
                  <p>お支払期限: {printData.due_date}</p>
                )}
              </div>
            </div>

            {/* 合計金額 */}
            <div
              style={{
                background: "#f5f5f5",
                padding: "12px 20px",
                marginBottom: "24px",
                borderRadius: "4px",
                textAlign: "center",
                fontSize: "16pt",
                fontWeight: 700,
              }}
            >
              合計金額: {fmt(printData.total_amount)}
              <span
                style={{
                  fontSize: "10pt",
                  fontWeight: 400,
                  marginLeft: "8px",
                }}
              >
                (税込)
              </span>
            </div>

            {/* 明細テーブル */}
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                marginBottom: "16px",
                fontSize: "10pt",
              }}
            >
              <thead>
                <tr
                  style={{
                    background: "#f0f0f0",
                    borderTop: "2px solid #333",
                    borderBottom: "1px solid #999",
                  }}
                >
                  <th style={{ padding: "8px 6px", textAlign: "center", width: "30px" }}>
                    #
                  </th>
                  <th style={{ padding: "8px 6px", textAlign: "left" }}>
                    項目名
                  </th>
                  <th style={{ padding: "8px 6px", textAlign: "right", width: "60px" }}>
                    数量
                  </th>
                  <th style={{ padding: "8px 6px", textAlign: "center", width: "40px" }}>
                    単位
                  </th>
                  <th style={{ padding: "8px 6px", textAlign: "right", width: "90px" }}>
                    単価
                  </th>
                  <th style={{ padding: "8px 6px", textAlign: "right", width: "100px" }}>
                    金額
                  </th>
                </tr>
              </thead>
              <tbody>
                {printData.items.map((item, i) => (
                  <tr
                    key={i}
                    style={{
                      borderBottom: "1px solid #ddd",
                    }}
                  >
                    <td style={{ padding: "7px 6px", textAlign: "center" }}>
                      {i + 1}
                    </td>
                    <td style={{ padding: "7px 6px" }}>{item.item_name}</td>
                    <td style={{ padding: "7px 6px", textAlign: "right" }}>
                      {item.quantity}
                    </td>
                    <td style={{ padding: "7px 6px", textAlign: "center" }}>
                      {item.unit || ""}
                    </td>
                    <td style={{ padding: "7px 6px", textAlign: "right" }}>
                      {fmt(item.unit_price)}
                    </td>
                    <td style={{ padding: "7px 6px", textAlign: "right" }}>
                      {fmt(item.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* 合計欄 */}
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                marginBottom: "30px",
              }}
            >
              <table style={{ borderCollapse: "collapse", fontSize: "10pt" }}>
                <tbody>
                  <tr style={{ borderBottom: "1px solid #ddd" }}>
                    <td style={{ padding: "6px 16px", textAlign: "right" }}>小計</td>
                    <td style={{ padding: "6px 16px", textAlign: "right", width: "120px" }}>
                      {fmt(printData.subtotal)}
                    </td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid #ddd" }}>
                    <td style={{ padding: "6px 16px", textAlign: "right" }}>
                      消費税 (10%)
                    </td>
                    <td style={{ padding: "6px 16px", textAlign: "right" }}>
                      {fmt(printData.tax_amount)}
                    </td>
                  </tr>
                  <tr
                    style={{
                      borderTop: "2px solid #333",
                      fontWeight: 700,
                    }}
                  >
                    <td style={{ padding: "8px 16px", textAlign: "right" }}>合計</td>
                    <td style={{ padding: "8px 16px", textAlign: "right", fontSize: "12pt" }}>
                      {fmt(printData.total_amount)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* 備考 */}
            {printData.notes && (
              <div
                style={{
                  borderTop: "1px solid #ccc",
                  paddingTop: "12px",
                  fontSize: "10pt",
                }}
              >
                <p style={{ fontWeight: 600, marginBottom: "4px" }}>備考</p>
                <p style={{ whiteSpace: "pre-wrap" }}>{printData.notes}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

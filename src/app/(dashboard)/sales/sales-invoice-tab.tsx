"use client";

import { useState, useEffect } from "react";
import {
  getSalesInvoiceWithItems,
  saveSalesInvoice,
  deleteSalesInvoice,
} from "./actions";

type SiteOption = { id: string; code: string; name: string; client_name: string | null };
type ClientOption = { id: string; client_code: string | null; client_name: string };

type ItemRow = {
  key: number;
  item_name: string;
  quantity: number;
  unit: string;
  unit_price: number;
  amount: number;
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
  items: { item_name: string; quantity: number; unit: string | null; unit_price: number; amount: number }[];
  subtotal: number;
  tax_amount: number;
  total_amount: number;
};

type PrefillData = {
  site_id: string | null;
  client_id: string | null;
  client_name: string;
  title: string;
  estimate_id: string;
  items: { item_name: string; quantity: number; unit: string | null; unit_price: number; amount: number }[];
} | null;

const STATUSES = ["すべて", "未送付", "送付済", "入金済"] as const;

let keyCounter = 1000;
function nextKey() { return ++keyCounter; }
function emptyItem(): ItemRow {
  return { key: nextKey(), item_name: "", quantity: 1, unit: "", unit_price: 0, amount: 0 };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function SalesInvoiceTab({
  initialSalesInvoices, sites, clients, prefillData, clearPrefill, onPrint,
}: {
  initialSalesInvoices: any[];
  sites: SiteOption[];
  clients: ClientOption[];
  prefillData: PrefillData;
  clearPrefill: () => void;
  onPrint: (data: PrintData) => void;
}) {
  const [invoices, setInvoices] = useState(initialSalesInvoices);
  const [statusFilter, setStatusFilter] = useState("すべて");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Form state
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [siteId, setSiteId] = useState("");
  const [estimateId, setEstimateId] = useState<string | null>(null);
  const [clientId, setClientId] = useState("");
  const [clientName, setClientName] = useState("");
  const [title, setTitle] = useState("");
  const [invoiceDate, setInvoiceDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<ItemRow[]>([emptyItem()]);

  const filtered = statusFilter === "すべて"
    ? invoices
    : invoices.filter((inv: { status: string }) => inv.status === statusFilter);

  const subtotal = items.reduce((s, i) => s + i.amount, 0);
  const taxAmount = Math.floor(subtotal * 0.1);
  const totalAmount = subtotal + taxAmount;

  // 見積書からの引き継ぎ
  useEffect(() => {
    if (prefillData) {
      setEditingId(null);
      setInvoiceNumber("");
      setSiteId(prefillData.site_id || "");
      setEstimateId(prefillData.estimate_id);
      setClientId(prefillData.client_id || "");
      setClientName(prefillData.client_name);
      setTitle(prefillData.title);
      setInvoiceDate(new Date().toISOString().slice(0, 10));
      setDueDate(""); setNotes("");
      setItems(
        prefillData.items.length > 0
          ? prefillData.items.map((i) => ({ key: nextKey(), item_name: i.item_name, quantity: i.quantity, unit: i.unit || "", unit_price: i.unit_price, amount: i.amount }))
          : [emptyItem()]
      );
      setError(""); setModalOpen(true); clearPrefill();
    }
  }, [prefillData, clearPrefill]);

  const resetForm = () => {
    setInvoiceNumber(""); setSiteId(""); setEstimateId(null);
    setClientId(""); setClientName(""); setTitle("");
    setInvoiceDate(new Date().toISOString().slice(0, 10));
    setDueDate(""); setNotes(""); setItems([emptyItem()]);
    setError(""); setEditingId(null);
  };

  const handleSiteChange = (newSiteId: string) => {
    setSiteId(newSiteId);
    const site = sites.find((s) => s.id === newSiteId);
    if (site) {
      setTitle(site.name);
      if (site.client_name) {
        setClientName(site.client_name);
        const match = clients.find((c) => c.client_name === site.client_name);
        setClientId(match ? match.id : "");
      }
    } else {
      setTitle("");
    }
  };

  const openCreate = () => { resetForm(); setModalOpen(true); };

  const openEdit = async (id: string) => {
    setLoading(true);
    const { invoice, items: dbItems } = await getSalesInvoiceWithItems(id);
    if (!invoice) { setError("請求書の取得に失敗しました"); setLoading(false); return; }
    setEditingId(id);
    setInvoiceNumber(invoice.invoice_number);
    setSiteId(invoice.site_id || "");
    setEstimateId(invoice.estimate_id || null);
    setClientId(invoice.client_id || "");
    setClientName(invoice.client_name);
    setTitle(invoice.title);
    setInvoiceDate(invoice.invoice_date);
    setDueDate(invoice.due_date || "");
    setNotes(invoice.notes || "");
    setItems(
      dbItems.length > 0
        ? dbItems.map((i) => ({ key: nextKey(), item_name: i.item_name, quantity: Number(i.quantity), unit: i.unit || "", unit_price: i.unit_price, amount: i.amount }))
        : [emptyItem()]
    );
    setError(""); setModalOpen(true); setLoading(false);
  };

  const handleSubmit = async () => {
    setLoading(true); setError("");
    const result = await saveSalesInvoice({
      id: editingId || undefined,
      invoice_number: invoiceNumber,
      site_id: siteId || null,
      estimate_id: estimateId,
      client_id: clientId || null,
      client_name: clientName,
      title,
      invoice_date: invoiceDate,
      due_date: dueDate || null,
      notes: notes || null,
      items: items.filter((i) => i.item_name.trim()).map((i, idx) => ({
        item_name: i.item_name, quantity: i.quantity, unit: i.unit || null,
        unit_price: i.unit_price, amount: i.amount, sort_order: idx,
      })),
    });
    if (result.error) { setError(result.error); setLoading(false); }
    else { setModalOpen(false); setLoading(false); window.location.reload(); }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`請求書「${name}」を削除しますか？`)) return;
    setError("");
    const result = await deleteSalesInvoice(id);
    if (result.error) setError(result.error);
    else setInvoices(invoices.filter((inv: { id: string }) => inv.id !== id));
  };

  const handlePrintCurrent = () => {
    onPrint({
      type: "invoice", number: invoiceNumber, date: invoiceDate,
      client_name: clientName, title,
      due_date: dueDate || null, notes: notes || null,
      items: items.filter((i) => i.item_name.trim()),
      subtotal, tax_amount: taxAmount, total_amount: totalAmount,
    });
  };

  const updateItem = (index: number, field: keyof ItemRow, value: string | number) => {
    setItems((prev) => {
      const next = [...prev];
      const item = { ...next[index] };
      if (field === "quantity") item.quantity = Number(value) || 0;
      else if (field === "unit_price") item.unit_price = Number(value) || 0;
      else if (field === "item_name") item.item_name = value as string;
      else if (field === "unit") item.unit = value as string;
      if (field === "quantity" || field === "unit_price") item.amount = Math.floor(item.quantity * item.unit_price);
      next[index] = item;
      return next;
    });
  };

  const fmt = (n: number) => `¥${n.toLocaleString("ja-JP")}`;

  const statusStyle = (s: string) => {
    switch (s) {
      case "未送付": return "bg-muted text-sub-text";
      case "送付済": return "bg-blue-50 text-blue-600";
      case "入金済": return "bg-accent/10 text-accent";
      default: return "bg-muted text-sub-text";
    }
  };

  return (
    <div>
      {error && !modalOpen && (
        <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>
      )}

      <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          {STATUSES.map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-full text-sm cursor-pointer transition-colors ${statusFilter === s ? "bg-primary text-white" : "bg-muted text-sub-text hover:text-foreground"}`}>
              {s}
            </button>
          ))}
        </div>
        <button onClick={openCreate} className="px-4 h-11 bg-primary text-white rounded-lg hover:bg-primary-hover text-sm cursor-pointer">
          ＋ 新規作成
        </button>
      </div>

      <div className="bg-card rounded-[10px] shadow-[0_2px_8px_rgba(0,0,0,0.04)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border">
              <tr>
                <th className="text-left px-4 py-3.5 text-xs text-sub-text font-semibold uppercase tracking-wider whitespace-nowrap">請求番号</th>
                <th className="text-left px-4 py-3.5 text-xs text-sub-text font-semibold uppercase tracking-wider whitespace-nowrap">工事名</th>
                <th className="text-left px-4 py-3.5 text-xs text-sub-text font-semibold uppercase tracking-wider whitespace-nowrap">宛先</th>
                <th className="text-right px-4 py-3.5 text-xs text-sub-text font-semibold uppercase tracking-wider whitespace-nowrap">金額</th>
                <th className="text-left px-4 py-3.5 text-xs text-sub-text font-semibold uppercase tracking-wider whitespace-nowrap">請求日</th>
                <th className="text-left px-4 py-3.5 text-xs text-sub-text font-semibold uppercase tracking-wider whitespace-nowrap">ステータス</th>
                <th className="text-right px-4 py-3.5 text-xs text-sub-text font-semibold uppercase tracking-wider whitespace-nowrap">操作</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-sub-text">売上請求書がありません</td></tr>
              ) : (
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                filtered.map((inv: any) => (
                  <tr key={inv.id} className="border-b border-table-separator last:border-b-0 hover:bg-table-row-hover">
                    <td className="px-4 py-3.5 font-mono whitespace-nowrap">{inv.invoice_number}</td>
                    <td className="px-4 py-3.5">{inv.title}</td>
                    <td className="px-4 py-3.5 whitespace-nowrap">{inv.client_name}</td>
                    <td className="px-4 py-3.5 text-right font-mono whitespace-nowrap">{fmt(inv.total_amount)}</td>
                    <td className="px-4 py-3.5 whitespace-nowrap">{inv.invoice_date}</td>
                    <td className="px-4 py-3.5">
                      <span className={`text-xs px-2 py-1 rounded-full ${statusStyle(inv.status)}`}>{inv.status}</span>
                    </td>
                    <td className="px-4 py-3.5 text-right whitespace-nowrap space-x-2">
                      <button onClick={() => openEdit(inv.id)} className="text-primary hover:underline cursor-pointer">編集</button>
                      <button onClick={() => handleDelete(inv.id, inv.invoice_number)} className="text-red-400 hover:text-red-600 cursor-pointer">削除</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-8 pb-8 overflow-y-auto">
          <div className="absolute inset-0 bg-black/30" onClick={() => { setModalOpen(false); setError(""); }} />
          <div className="relative bg-card rounded-2xl shadow-lg w-full max-w-3xl mx-4 p-6">
            <h2 className="text-lg font-bold mb-4">{editingId ? "売上請求書を編集" : "新規売上請求書"}</h2>
            {error && <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>}

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="label">請求番号 <span className="text-red-500">*</span></label>
                <input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} className="input-bordered" placeholder="例: INV-2026-001" />
              </div>
              <div>
                <label className="label">現場・工事名 <span className="text-red-500">*</span></label>
                <select value={siteId} onChange={(e) => handleSiteChange(e.target.value)} className="select-bordered">
                  <option value="">選択してください</option>
                  {sites.map((s) => (
                    <option key={s.id} value={s.id}>{s.code} - {s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">発注者名 <span className="text-red-500">*</span></label>
                <input value={clientName} onChange={(e) => { setClientName(e.target.value); setClientId(""); }} className="input-bordered" placeholder="現場を選択すると自動入力" />
              </div>
              <div>
                <label className="label">請求日 <span className="text-red-500">*</span></label>
                <input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} className="input-bordered" />
              </div>
              <div>
                <label className="label">支払期限</label>
                <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="input-bordered" />
              </div>
            </div>

            {/* 明細 */}
            <div className="mb-4">
              <label className="label">明細</label>
              <div className="overflow-x-auto border border-border rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs text-sub-text font-semibold">項目名</th>
                      <th className="px-3 py-2 text-right text-xs text-sub-text font-semibold w-20">数量</th>
                      <th className="px-3 py-2 text-left text-xs text-sub-text font-semibold w-16">単位</th>
                      <th className="px-3 py-2 text-right text-xs text-sub-text font-semibold w-28">単価</th>
                      <th className="px-3 py-2 text-right text-xs text-sub-text font-semibold w-28">金額</th>
                      <th className="w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, i) => (
                      <tr key={item.key} className="border-t border-table-separator">
                        <td className="px-2 py-1.5"><input value={item.item_name} onChange={(e) => updateItem(i, "item_name", e.target.value)} className="input-bordered" placeholder="項目名" /></td>
                        <td className="px-2 py-1.5"><input type="number" min="0" step="any" value={item.quantity || ""} onChange={(e) => updateItem(i, "quantity", e.target.value)} className="input-bordered text-right" /></td>
                        <td className="px-2 py-1.5"><input value={item.unit} onChange={(e) => updateItem(i, "unit", e.target.value)} className="input-bordered" placeholder="式" /></td>
                        <td className="px-2 py-1.5"><input type="number" min="0" value={item.unit_price || ""} onChange={(e) => updateItem(i, "unit_price", e.target.value)} className="input-bordered text-right" /></td>
                        <td className="px-2 py-1.5 text-right font-mono text-sm whitespace-nowrap pr-3">{fmt(item.amount)}</td>
                        <td className="px-2 py-1.5">
                          {items.length > 1 && (
                            <button type="button" onClick={() => setItems((prev) => prev.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600 cursor-pointer text-lg">×</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button type="button" onClick={() => setItems((prev) => [...prev, emptyItem()])} className="mt-2 px-3 py-1.5 text-sm text-primary hover:underline cursor-pointer">＋ 明細を追加</button>
            </div>

            {/* 合計 */}
            <div className="flex justify-end mb-4">
              <div className="w-64 text-sm">
                <div className="flex justify-between py-1.5 border-b border-table-separator"><span className="text-sub-text">小計</span><span className="font-mono">{fmt(subtotal)}</span></div>
                <div className="flex justify-between py-1.5 border-b border-table-separator"><span className="text-sub-text">消費税 (10%)</span><span className="font-mono">{fmt(taxAmount)}</span></div>
                <div className="flex justify-between py-2 font-bold"><span>合計</span><span className="font-mono">{fmt(totalAmount)}</span></div>
              </div>
            </div>

            <div className="mb-6">
              <label className="label">備考</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="input-bordered h-auto py-2" />
            </div>

            <div className="flex justify-between">
              <button type="button" onClick={handlePrintCurrent} className="px-4 h-11 border border-border rounded-lg text-sm hover:bg-muted cursor-pointer">PDF印刷</button>
              <div className="flex gap-3">
                <button type="button" onClick={() => { setModalOpen(false); setError(""); }} className="px-4 h-11 border border-border rounded-lg text-sm hover:bg-muted cursor-pointer">キャンセル</button>
                <button type="button" onClick={handleSubmit} disabled={loading || !invoiceNumber || !clientName.trim() || !siteId || !invoiceDate}
                  className="px-4 h-11 bg-primary text-white rounded-lg hover:bg-primary-hover disabled:opacity-50 text-sm cursor-pointer">
                  {loading ? "保存中..." : editingId ? "更新" : "登録"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

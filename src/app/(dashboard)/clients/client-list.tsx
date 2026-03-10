"use client";

import { useState } from "react";
import { saveClient, deleteClient } from "./actions";
import type { Client } from "@/types/database";

export function ClientList({ initialClients }: { initialClients: Client[] }) {
  const [clients, setClients] = useState(initialClients);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Form state
  const [clientCode, setClientCode] = useState("");
  const [clientName, setClientName] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [contactName, setContactName] = useState("");
  const [notes, setNotes] = useState("");

  const resetForm = () => {
    setClientCode("");
    setClientName("");
    setPostalCode("");
    setAddress("");
    setPhone("");
    setContactName("");
    setNotes("");
    setError("");
    setEditingClient(null);
  };

  const openCreate = () => {
    resetForm();
    setModalOpen(true);
  };

  const openEdit = (client: Client) => {
    setEditingClient(client);
    setClientCode(client.client_code || "");
    setClientName(client.client_name);
    setPostalCode(client.postal_code || "");
    setAddress(client.address || "");
    setPhone(client.phone || "");
    setContactName(client.contact_name || "");
    setNotes(client.notes || "");
    setError("");
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError("");
    const result = await saveClient({
      id: editingClient?.id,
      client_code: clientCode || null,
      client_name: clientName,
      postal_code: postalCode || null,
      address: address || null,
      phone: phone || null,
      contact_name: contactName || null,
      notes: notes || null,
    });
    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else {
      setModalOpen(false);
      setLoading(false);
      window.location.reload();
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`「${name}」を削除しますか？`)) return;
    setError("");
    const result = await deleteClient(id);
    if (result.error) {
      setError(result.error);
    } else {
      setClients(clients.filter((c) => c.id !== id));
    }
  };

  return (
    <div>
      {error && !modalOpen && (
        <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>
      )}

      <div className="mb-4">
        <button
          onClick={openCreate}
          className="px-4 h-11 bg-primary text-white rounded-lg hover:bg-primary-hover text-sm cursor-pointer"
        >
          ＋ 新規登録
        </button>
      </div>

      <div className="bg-card rounded-[10px] shadow-[0_2px_8px_rgba(0,0,0,0.04)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border">
              <tr>
                <th className="text-left px-4 py-3.5 text-xs text-sub-text font-semibold uppercase tracking-wider whitespace-nowrap">コード</th>
                <th className="text-left px-4 py-3.5 text-xs text-sub-text font-semibold uppercase tracking-wider whitespace-nowrap">取引先名</th>
                <th className="text-left px-4 py-3.5 text-xs text-sub-text font-semibold uppercase tracking-wider whitespace-nowrap">住所</th>
                <th className="text-left px-4 py-3.5 text-xs text-sub-text font-semibold uppercase tracking-wider whitespace-nowrap">電話番号</th>
                <th className="text-right px-4 py-3.5 text-xs text-sub-text font-semibold uppercase tracking-wider whitespace-nowrap">操作</th>
              </tr>
            </thead>
            <tbody>
              {clients.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sub-text">
                    売上先が登録されていません
                  </td>
                </tr>
              ) : (
                clients.map((client) => (
                  <tr key={client.id} className="border-b border-table-separator last:border-b-0 hover:bg-table-row-hover">
                    <td className="px-4 py-3.5 font-mono whitespace-nowrap">{client.client_code || "—"}</td>
                    <td className="px-4 py-3.5">{client.client_name}</td>
                    <td className="px-4 py-3.5">{client.address || "—"}</td>
                    <td className="px-4 py-3.5 whitespace-nowrap">{client.phone || "—"}</td>
                    <td className="px-4 py-3.5 text-right whitespace-nowrap space-x-2">
                      <button onClick={() => openEdit(client)} className="text-primary hover:underline cursor-pointer">編集</button>
                      <button onClick={() => handleDelete(client.id, client.client_name)} className="text-red-400 hover:text-red-600 cursor-pointer">削除</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => { setModalOpen(false); setError(""); }} />
          <div className="relative bg-card rounded-2xl shadow-lg w-full max-w-lg mx-4 p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold mb-4">
              {editingClient ? "売上先を編集" : "新規売上先登録"}
            </h2>

            {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>
            )}

            <div className="grid grid-cols-1 gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">取引先コード</label>
                  <input value={clientCode} onChange={(e) => setClientCode(e.target.value)} className="input-bordered" placeholder="例: C001" />
                </div>
                <div>
                  <label className="label">取引先名 <span className="text-red-500">*</span></label>
                  <input value={clientName} onChange={(e) => setClientName(e.target.value)} required className="input-bordered" placeholder="例: 株式会社○○" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">郵便番号</label>
                  <input value={postalCode} onChange={(e) => setPostalCode(e.target.value)} className="input-bordered" placeholder="例: 123-4567" />
                </div>
                <div>
                  <label className="label">電話番号</label>
                  <input value={phone} onChange={(e) => setPhone(e.target.value)} className="input-bordered" placeholder="例: 03-1234-5678" />
                </div>
              </div>
              <div>
                <label className="label">住所</label>
                <input value={address} onChange={(e) => setAddress(e.target.value)} className="input-bordered" placeholder="例: 東京都○○区..." />
              </div>
              <div>
                <label className="label">担当者名</label>
                <input value={contactName} onChange={(e) => setContactName(e.target.value)} className="input-bordered" placeholder="例: 山田太郎" />
              </div>
              <div>
                <label className="label">備考</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="input-bordered h-auto py-2" />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button type="button" onClick={() => { setModalOpen(false); setError(""); }} className="px-4 h-11 border border-border rounded-lg text-sm hover:bg-muted cursor-pointer">
                キャンセル
              </button>
              <button type="button" onClick={handleSubmit} disabled={loading || !clientName} className="px-4 h-11 bg-primary text-white rounded-lg hover:bg-primary-hover disabled:opacity-50 text-sm cursor-pointer">
                {loading ? "保存中..." : editingClient ? "更新" : "登録"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

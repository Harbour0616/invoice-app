"use server";

import { createClient } from "@/lib/supabase/server";
import { getOrganization } from "@/lib/get-organization";
import { revalidatePath } from "next/cache";

/* ---------- 共通 ---------- */

export async function getActiveSites() {
  const { organizationId } = await getOrganization();
  const supabase = await createClient();
  const { data } = await supabase
    .from("sites")
    .select("id, code, name")
    .eq("organization_id", organizationId)
    .eq("status", "進行中")
    .order("code");
  return data ?? [];
}

/* ---------- 見積書 ---------- */

export async function getEstimates() {
  const { organizationId } = await getOrganization();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("estimates")
    .select("*, site:sites(id, code, name)")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getEstimateWithItems(id: string) {
  const supabase = await createClient();
  const [{ data: estimate }, { data: items }] = await Promise.all([
    supabase.from("estimates").select("*").eq("id", id).single(),
    supabase
      .from("estimate_items")
      .select("*")
      .eq("estimate_id", id)
      .order("sort_order"),
  ]);
  return { estimate, items: items ?? [] };
}

type EstimateFormData = {
  id?: string;
  estimate_number: string;
  site_id: string | null;
  client_name: string;
  title: string;
  estimate_date: string;
  valid_until: string | null;
  notes: string | null;
  items: {
    item_name: string;
    quantity: number;
    unit: string | null;
    unit_price: number;
    amount: number;
    sort_order: number;
  }[];
};

export async function saveEstimate(data: EstimateFormData) {
  const { organizationId } = await getOrganization();
  const supabase = await createClient();

  const subtotal = data.items.reduce((sum, i) => sum + i.amount, 0);
  const tax_amount = Math.floor(subtotal * 0.1);
  const total_amount = subtotal + tax_amount;

  const record = {
    organization_id: organizationId,
    estimate_number: data.estimate_number,
    site_id: data.site_id || null,
    client_name: data.client_name,
    title: data.title,
    estimate_date: data.estimate_date,
    valid_until: data.valid_until || null,
    notes: data.notes || null,
    subtotal,
    tax_amount,
    total_amount,
  };

  let estimateId = data.id;

  if (data.id) {
    const { error } = await supabase
      .from("estimates")
      .update(record)
      .eq("id", data.id);
    if (error) return { error: error.message };

    await supabase
      .from("estimate_items")
      .delete()
      .eq("estimate_id", data.id);
  } else {
    const { data: inserted, error } = await supabase
      .from("estimates")
      .insert(record)
      .select("id")
      .single();
    if (error) return { error: error.message };
    estimateId = inserted.id;
  }

  if (data.items.length > 0) {
    const { error } = await supabase.from("estimate_items").insert(
      data.items.map((item) => ({
        estimate_id: estimateId,
        ...item,
      }))
    );
    if (error) return { error: error.message };
  }

  revalidatePath("/sales");
  return { error: null };
}

export async function updateEstimateStatus(id: string, status: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("estimates")
    .update({ status })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/sales");
  return { error: null };
}

export async function deleteEstimate(id: string) {
  const supabase = await createClient();

  const { count } = await supabase
    .from("sales_invoices")
    .select("id", { count: "exact", head: true })
    .eq("estimate_id", id);

  if (count && count > 0) {
    return { error: "この見積書から作成された売上請求書があります。先に請求書を削除してください。" };
  }

  const { error } = await supabase.from("estimates").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/sales");
  return { error: null };
}

/* ---------- 売上請求書 ---------- */

export async function getSalesInvoices() {
  const { organizationId } = await getOrganization();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sales_invoices")
    .select("*, site:sites(id, code, name)")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getSalesInvoiceWithItems(id: string) {
  const supabase = await createClient();
  const [{ data: invoice }, { data: items }] = await Promise.all([
    supabase.from("sales_invoices").select("*").eq("id", id).single(),
    supabase
      .from("sales_invoice_items")
      .select("*")
      .eq("sales_invoice_id", id)
      .order("sort_order"),
  ]);
  return { invoice, items: items ?? [] };
}

type SalesInvoiceFormData = {
  id?: string;
  invoice_number: string;
  site_id: string | null;
  estimate_id: string | null;
  client_name: string;
  title: string;
  invoice_date: string;
  due_date: string | null;
  notes: string | null;
  items: {
    item_name: string;
    quantity: number;
    unit: string | null;
    unit_price: number;
    amount: number;
    sort_order: number;
  }[];
};

export async function saveSalesInvoice(data: SalesInvoiceFormData) {
  const { organizationId } = await getOrganization();
  const supabase = await createClient();

  const subtotal = data.items.reduce((sum, i) => sum + i.amount, 0);
  const tax_amount = Math.floor(subtotal * 0.1);
  const total_amount = subtotal + tax_amount;

  const record = {
    organization_id: organizationId,
    invoice_number: data.invoice_number,
    site_id: data.site_id || null,
    estimate_id: data.estimate_id || null,
    client_name: data.client_name,
    title: data.title,
    invoice_date: data.invoice_date,
    due_date: data.due_date || null,
    notes: data.notes || null,
    subtotal,
    tax_amount,
    total_amount,
  };

  let invoiceId = data.id;

  if (data.id) {
    const { error } = await supabase
      .from("sales_invoices")
      .update(record)
      .eq("id", data.id);
    if (error) return { error: error.message };

    await supabase
      .from("sales_invoice_items")
      .delete()
      .eq("sales_invoice_id", data.id);
  } else {
    const { data: inserted, error } = await supabase
      .from("sales_invoices")
      .insert(record)
      .select("id")
      .single();
    if (error) return { error: error.message };
    invoiceId = inserted.id;
  }

  if (data.items.length > 0) {
    const { error } = await supabase.from("sales_invoice_items").insert(
      data.items.map((item) => ({
        sales_invoice_id: invoiceId,
        ...item,
      }))
    );
    if (error) return { error: error.message };
  }

  revalidatePath("/sales");
  return { error: null };
}

export async function updateSalesInvoiceStatus(id: string, status: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("sales_invoices")
    .update({ status })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/sales");
  return { error: null };
}

export async function deleteSalesInvoice(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("sales_invoices")
    .delete()
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/sales");
  return { error: null };
}

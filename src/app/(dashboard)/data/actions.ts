"use server";

import { createClient } from "@/lib/supabase/server";
import { getOrganization } from "@/lib/get-organization";

export type InvoiceWithDetails = {
  id: string;
  invoice_date: string;
  invoice_number: string | null;
  note: string | null;
  total_excl_tax: number;
  total_tax: number;
  total_incl_tax: number;
  created_at: string;
  vendor: { id: string; code: string; name: string } | null;
  invoice_lines: {
    id: string;
    amount_excl_tax: number;
    tax_rate: number;
    tax_amount: number;
    amount_incl_tax: number;
    line_order: number;
    site: { id: string; code: string; name: string } | null;
    account: { id: string; code: string; name: string } | null;
  }[];
};

export async function getInvoices() {
  const { organizationId } = await getOrganization();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("invoices")
    .select(
      `
      id, invoice_date, invoice_number, note,
      total_excl_tax, total_tax, total_incl_tax, created_at,
      vendor:vendors(id, code, name),
      invoice_lines(
        id, amount_excl_tax, tax_rate, tax_amount, amount_incl_tax, line_order,
        site:sites(id, code, name),
        account:accounts(id, code, name)
      )
    `
    )
    .eq("organization_id", organizationId)
    .order("invoice_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data || []) as unknown as InvoiceWithDetails[];
}

export async function getFilterOptions() {
  const { organizationId } = await getOrganization();
  const supabase = await createClient();

  const [vendors, sites] = await Promise.all([
    supabase
      .from("vendors")
      .select("id, code, name")
      .eq("organization_id", organizationId)
      .eq("is_active", true)
      .order("code"),
    supabase
      .from("sites")
      .select("id, code, name")
      .eq("organization_id", organizationId)
      .order("code"),
  ]);

  return {
    vendors: vendors.data || [],
    sites: sites.data || [],
  };
}

export async function deleteInvoice(id: string) {
  const supabase = await createClient();

  // invoice_lines は ON DELETE CASCADE で自動削除
  const { error } = await supabase.from("invoices").delete().eq("id", id);
  if (error) return { error: error.message };
  return { error: null };
}

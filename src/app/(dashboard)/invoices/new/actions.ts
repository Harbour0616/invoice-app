"use server";

import { createClient } from "@/lib/supabase/server";
import { getOrganization } from "@/lib/get-organization";
import { revalidatePath } from "next/cache";

export async function getMasterData() {
  const { organizationId } = await getOrganization();
  const supabase = await createClient();

  const [vendors, sites, accounts] = await Promise.all([
    supabase
      .from("vendors")
      .select("id, code, name, furigana")
      .eq("organization_id", organizationId)
      .eq("is_active", true)
      .order("code"),
    supabase
      .from("sites")
      .select("id, code, name, status")
      .eq("organization_id", organizationId)
      .eq("status", "active")
      .order("code"),
    supabase
      .from("accounts")
      .select("id, code, name, display_order")
      .eq("organization_id", organizationId)
      .eq("is_active", true)
      .order("display_order")
      .order("code"),
  ]);

  return {
    vendors: vendors.data || [],
    sites: sites.data || [],
    accounts: accounts.data || [],
  };
}

type InvoiceLine = {
  site_id: string;
  account_id: string;
  amount_excl_tax: number;
  tax_rate: number;
  tax_amount: number;
  amount_incl_tax: number;
  line_order: number;
};

type CreateInvoiceInput = {
  vendor_id: string;
  invoice_date: string;
  invoice_number: string;
  note: string;
  lines: InvoiceLine[];
};

export async function createInvoice(input: CreateInvoiceInput) {
  const { organizationId, userId } = await getOrganization();
  const supabase = await createClient();

  // 合計計算
  const totalExclTax = input.lines.reduce((sum, l) => sum + l.amount_excl_tax, 0);
  const totalTax = input.lines.reduce((sum, l) => sum + l.tax_amount, 0);
  const totalInclTax = totalExclTax + totalTax;

  // 請求書ヘッダー登録
  const { data: invoice, error: invoiceError } = await supabase
    .from("invoices")
    .insert({
      organization_id: organizationId,
      vendor_id: input.vendor_id,
      invoice_date: input.invoice_date,
      invoice_number: input.invoice_number || null,
      note: input.note || null,
      total_excl_tax: totalExclTax,
      total_tax: totalTax,
      total_incl_tax: totalInclTax,
      created_by: userId,
    })
    .select("id")
    .single();

  if (invoiceError) {
    return { error: invoiceError.message };
  }

  // 明細行登録
  const lines = input.lines.map((line, idx) => ({
    invoice_id: invoice.id,
    site_id: line.site_id,
    account_id: line.account_id,
    amount_excl_tax: line.amount_excl_tax,
    tax_rate: line.tax_rate,
    tax_amount: line.tax_amount,
    amount_incl_tax: line.amount_incl_tax,
    line_order: idx,
  }));

  const { error: linesError } = await supabase
    .from("invoice_lines")
    .insert(lines);

  if (linesError) {
    // ヘッダーをロールバック
    await supabase.from("invoices").delete().eq("id", invoice.id);
    return { error: linesError.message };
  }

  revalidatePath("/data");
  return { error: null, invoiceId: invoice.id };
}

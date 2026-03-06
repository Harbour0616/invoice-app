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
  pdf_file_path: string | null;
  created_at: string;
  created_by: string | null;
  updated_by: string | null;
  updated_at: string;
  vendor: { id: string; code: string; name: string } | null;
  invoice_lines: {
    id: string;
    site_id: string | null;
    description: string | null;
    amount_excl_tax: number;
    tax_rate: number;
    tax_amount: number;
    amount_incl_tax: number;
    line_order: number;
    site: { id: string; code: string; name: string } | null;
    account: { id: string; code: string; name: string } | null;
  }[];
  confirmation_requests: {
    id: string;
    token: string;
    status: string;
  }[];
};

export async function getDisplayMonths(): Promise<number> {
  const { organizationId } = await getOrganization();
  const supabase = await createClient();

  const { data } = await supabase
    .from("app_settings")
    .select("value")
    .eq("organization_id", organizationId)
    .eq("key", "invoice_display_months")
    .single();

  if (data) {
    const n = parseInt(data.value, 10);
    if (n >= 1 && n <= 6) return n;
  }
  return 1;
}

export async function updateDisplayMonths(months: number) {
  const { organizationId, role } = await getOrganization();
  if (role !== "owner") {
    return { error: "権限がありません" };
  }
  if (months < 1 || months > 6) {
    return { error: "1〜6の範囲で指定してください" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("app_settings")
    .upsert(
      {
        organization_id: organizationId,
        key: "invoice_display_months",
        value: String(months),
      },
      { onConflict: "organization_id,key" }
    );

  if (error) return { error: error.message };

  const { revalidatePath } = await import("next/cache");
  revalidatePath("/data");
  return { error: null };
}

export async function getInvoices(dateFrom?: string, dateTo?: string) {
  const { organizationId } = await getOrganization();
  const supabase = await createClient();

  let query = supabase
    .from("invoices")
    .select(
      `
      id, invoice_date, invoice_number, note,
      total_excl_tax, total_tax, total_incl_tax, pdf_file_path, created_at,
      created_by, updated_by, updated_at,
      vendor:vendors(id, code, name),
      invoice_lines(
        id, site_id, description, amount_excl_tax, tax_rate, tax_amount, amount_incl_tax, line_order,
        site:sites(id, code, name),
        account:accounts(id, code, name)
      ),
      confirmation_requests(id, token, status)
    `
    )
    .eq("organization_id", organizationId);

  if (dateFrom) {
    query = query.gte("invoice_date", dateFrom);
  }
  if (dateTo) {
    query = query.lte("invoice_date", dateTo);
  }

  const { data, error } = await query
    .order("invoice_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw error;

  const invoices = (data || []) as unknown as InvoiceWithDetails[];

  // ユーザー名マップ取得
  const userIds = [
    ...new Set(
      invoices.flatMap((d) => [d.created_by, d.updated_by]).filter(Boolean)
    ),
  ] as string[];

  const userNames: Record<string, string> = {};
  if (userIds.length > 0) {
    const { data: members } = await supabase
      .from("organization_members")
      .select("user_id, organization:organizations(name)")
      .in("user_id", userIds);
    members?.forEach((m) => {
      const org = m.organization as any;
      if (org?.name) userNames[m.user_id] = org.name;
    });
  }

  return { invoices, userNames };
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

export async function createConfirmationRequestFromList(invoiceId: string) {
  const { organizationId } = await getOrganization();
  const supabase = await createClient();

  // 請求書の所属組織を検証
  const { data: invoice } = await supabase
    .from("invoices")
    .select("id")
    .eq("id", invoiceId)
    .eq("organization_id", organizationId)
    .single();

  if (!invoice) {
    return { error: "請求書が見つかりません" };
  }

  // 既存の pending リクエストがあればそのURLを返す
  const { data: existing } = await supabase
    .from("confirmation_requests")
    .select("token")
    .eq("invoice_id", invoiceId)
    .eq("status", "pending")
    .single();

  if (existing) {
    return { error: null, url: `https://invoice-app-chi-three.vercel.app/confirm/${existing.token}` };
  }

  // 新規作成
  const { data: req, error } = await supabase
    .from("confirmation_requests")
    .insert({ invoice_id: invoiceId })
    .select("token")
    .single();

  if (error) {
    return { error: error.message };
  }

  return { error: null, url: `https://invoice-app-chi-three.vercel.app/confirm/${req.token}` };
}

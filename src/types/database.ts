// Supabase のテーブル型定義
// TODO: supabase gen types で自動生成に置き換え

export type Organization = {
  id: string;
  name: string;
  created_at: string;
};

export type OrganizationMember = {
  id: string;
  organization_id: string;
  user_id: string;
  role: "owner" | "member";
  created_at: string;
};

export type Vendor = {
  id: string;
  organization_id: string;
  code: string;
  name: string;
  furigana: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type Site = {
  id: string;
  organization_id: string;
  code: string;
  name: string;
  client_name: string | null;
  contract_amount: number | null;
  start_date: string | null;
  end_date: string | null;
  status: "進行中" | "完了" | "中止";
  created_at: string;
  updated_at: string;
};

export type Account = {
  id: string;
  organization_id: string;
  code: string;
  name: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type Invoice = {
  id: string;
  organization_id: string;
  vendor_id: string;
  invoice_date: string;
  invoice_number: string | null;
  note: string | null;
  total_excl_tax: number;
  total_tax: number;
  total_incl_tax: number;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type InvoiceLine = {
  id: string;
  invoice_id: string;
  site_id: string | null;
  account_id: string;
  description: string | null;
  amount_excl_tax: number;
  tax_rate: number;
  tax_amount: number;
  amount_incl_tax: number;
  line_order: number;
  created_at: string;
};

export type ConfirmationRequest = {
  id: string;
  invoice_id: string;
  token: string;
  status: "pending" | "completed";
  responses: Record<string, string> | null;
  created_at: string;
  completed_at: string | null;
};

export type AppSetting = {
  id: string;
  organization_id: string;
  key: string;
  value: string;
  created_at: string;
  updated_at: string;
};

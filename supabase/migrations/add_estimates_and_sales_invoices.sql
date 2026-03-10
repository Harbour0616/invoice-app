-- 見積書テーブル
CREATE TABLE estimates (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  estimate_number text NOT NULL,
  site_id uuid REFERENCES sites(id),
  client_name text NOT NULL,
  title text NOT NULL,
  estimate_date date NOT NULL,
  valid_until date,
  subtotal integer DEFAULT 0,
  tax_amount integer DEFAULT 0,
  total_amount integer DEFAULT 0,
  status text DEFAULT '作成中',
  notes text,
  created_at timestamp with time zone DEFAULT now()
);

-- 見積明細テーブル
CREATE TABLE estimate_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  estimate_id uuid REFERENCES estimates(id) ON DELETE CASCADE,
  sort_order integer DEFAULT 0,
  item_name text NOT NULL,
  quantity numeric DEFAULT 1,
  unit text,
  unit_price integer DEFAULT 0,
  amount integer DEFAULT 0
);

-- 売上請求書テーブル
CREATE TABLE sales_invoices (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_number text NOT NULL,
  site_id uuid REFERENCES sites(id),
  estimate_id uuid REFERENCES estimates(id),
  client_name text NOT NULL,
  title text NOT NULL,
  invoice_date date NOT NULL,
  due_date date,
  subtotal integer DEFAULT 0,
  tax_amount integer DEFAULT 0,
  total_amount integer DEFAULT 0,
  status text DEFAULT '未送付',
  notes text,
  created_at timestamp with time zone DEFAULT now()
);

-- 売上請求書明細テーブル
CREATE TABLE sales_invoice_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  sales_invoice_id uuid REFERENCES sales_invoices(id) ON DELETE CASCADE,
  sort_order integer DEFAULT 0,
  item_name text NOT NULL,
  quantity numeric DEFAULT 1,
  unit text,
  unit_price integer DEFAULT 0,
  amount integer DEFAULT 0
);

-- RLS設定
ALTER TABLE estimates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "認証ユーザーは全操作可能" ON estimates FOR ALL USING (auth.role() = 'authenticated');

ALTER TABLE estimate_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "認証ユーザーは全操作可能" ON estimate_items FOR ALL USING (auth.role() = 'authenticated');

ALTER TABLE sales_invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "認証ユーザーは全操作可能" ON sales_invoices FOR ALL USING (auth.role() = 'authenticated');

ALTER TABLE sales_invoice_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "認証ユーザーは全操作可能" ON sales_invoice_items FOR ALL USING (auth.role() = 'authenticated');

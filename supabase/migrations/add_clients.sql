CREATE TABLE clients (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  client_code text,
  client_name text NOT NULL,
  postal_code text,
  address text,
  phone text,
  contact_name text,
  notes text,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "認証ユーザーは全操作可能" ON clients
  FOR ALL USING (auth.role() = 'authenticated');

-- 見積書・売上請求書にclient_idを追加
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES clients(id);
ALTER TABLE sales_invoices ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES clients(id);

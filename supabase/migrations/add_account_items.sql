CREATE TABLE IF NOT EXISTS account_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  account_code text,
  account_name text NOT NULL,
  account_type text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE account_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "認証ユーザーは全操作可能" ON account_items
  FOR ALL USING (auth.role() = 'authenticated');

-- 建設業向け初期データ
INSERT INTO account_items (account_code, account_name, account_type) VALUES
  ('410', '完成工事高', '売上'),
  ('510', '完成工事原価', '原価'),
  ('511', '材料費', '原価'),
  ('512', '労務費', '原価'),
  ('513', '外注費', '原価'),
  ('514', '経費', '原価'),
  ('610', '販売費及び一般管理費', '経費');

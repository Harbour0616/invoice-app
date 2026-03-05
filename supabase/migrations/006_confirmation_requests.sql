-- 確認依頼テーブル
CREATE TABLE confirmation_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  token UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  status TEXT NOT NULL DEFAULT 'pending',  -- pending | completed
  responses JSONB,  -- { "line_id": "site_id", ... }
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_confirmation_requests_invoice ON confirmation_requests(invoice_id);
CREATE INDEX idx_confirmation_requests_token ON confirmation_requests(token);

ALTER TABLE confirmation_requests ENABLE ROW LEVEL SECURITY;

-- RLS: 組織メンバーのみ SELECT/INSERT/UPDATE（confirmページは admin client でバイパス）
CREATE POLICY "confirmation_requests_select"
  ON confirmation_requests FOR SELECT
  USING (
    invoice_id IN (
      SELECT id FROM invoices WHERE organization_id IN (SELECT get_user_org_ids())
    )
  );

CREATE POLICY "confirmation_requests_insert"
  ON confirmation_requests FOR INSERT
  WITH CHECK (
    invoice_id IN (
      SELECT id FROM invoices WHERE organization_id IN (SELECT get_user_org_ids())
    )
  );

CREATE POLICY "confirmation_requests_update"
  ON confirmation_requests FOR UPDATE
  USING (
    invoice_id IN (
      SELECT id FROM invoices WHERE organization_id IN (SELECT get_user_org_ids())
    )
  );

-- invoice_lines.site_id を nullable に変更
ALTER TABLE invoice_lines ALTER COLUMN site_id DROP NOT NULL;

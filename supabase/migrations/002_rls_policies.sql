-- ============================================
-- Row Level Security (RLS) ポリシー
-- ============================================

-- ユーザーの所属組織IDを取得するヘルパー関数
CREATE OR REPLACE FUNCTION get_user_org_ids()
RETURNS SETOF UUID AS $$
  SELECT organization_id
  FROM organization_members
  WHERE user_id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================
-- organizations
-- ============================================
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own organizations"
  ON organizations FOR SELECT
  USING (id IN (SELECT get_user_org_ids()));

-- ============================================
-- organization_members
-- ============================================
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org members"
  ON organization_members FOR SELECT
  USING (organization_id IN (SELECT get_user_org_ids()));

CREATE POLICY "Owners can insert org members"
  ON organization_members FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

CREATE POLICY "Owners can delete org members"
  ON organization_members FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- ============================================
-- vendors
-- ============================================
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org vendors"
  ON vendors FOR SELECT
  USING (organization_id IN (SELECT get_user_org_ids()));

CREATE POLICY "Users can insert own org vendors"
  ON vendors FOR INSERT
  WITH CHECK (organization_id IN (SELECT get_user_org_ids()));

CREATE POLICY "Users can update own org vendors"
  ON vendors FOR UPDATE
  USING (organization_id IN (SELECT get_user_org_ids()));

CREATE POLICY "Users can delete own org vendors"
  ON vendors FOR DELETE
  USING (organization_id IN (SELECT get_user_org_ids()));

-- ============================================
-- sites
-- ============================================
ALTER TABLE sites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org sites"
  ON sites FOR SELECT
  USING (organization_id IN (SELECT get_user_org_ids()));

CREATE POLICY "Users can insert own org sites"
  ON sites FOR INSERT
  WITH CHECK (organization_id IN (SELECT get_user_org_ids()));

CREATE POLICY "Users can update own org sites"
  ON sites FOR UPDATE
  USING (organization_id IN (SELECT get_user_org_ids()));

CREATE POLICY "Users can delete own org sites"
  ON sites FOR DELETE
  USING (organization_id IN (SELECT get_user_org_ids()));

-- ============================================
-- accounts
-- ============================================
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org accounts"
  ON accounts FOR SELECT
  USING (organization_id IN (SELECT get_user_org_ids()));

CREATE POLICY "Users can insert own org accounts"
  ON accounts FOR INSERT
  WITH CHECK (organization_id IN (SELECT get_user_org_ids()));

CREATE POLICY "Users can update own org accounts"
  ON accounts FOR UPDATE
  USING (organization_id IN (SELECT get_user_org_ids()));

CREATE POLICY "Users can delete own org accounts"
  ON accounts FOR DELETE
  USING (organization_id IN (SELECT get_user_org_ids()));

-- ============================================
-- invoices
-- ============================================
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org invoices"
  ON invoices FOR SELECT
  USING (organization_id IN (SELECT get_user_org_ids()));

CREATE POLICY "Users can insert own org invoices"
  ON invoices FOR INSERT
  WITH CHECK (organization_id IN (SELECT get_user_org_ids()));

CREATE POLICY "Users can update own org invoices"
  ON invoices FOR UPDATE
  USING (organization_id IN (SELECT get_user_org_ids()));

CREATE POLICY "Users can delete own org invoices"
  ON invoices FOR DELETE
  USING (organization_id IN (SELECT get_user_org_ids()));

-- ============================================
-- invoice_lines
-- ============================================
ALTER TABLE invoice_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org invoice lines"
  ON invoice_lines FOR SELECT
  USING (
    invoice_id IN (
      SELECT id FROM invoices
      WHERE organization_id IN (SELECT get_user_org_ids())
    )
  );

CREATE POLICY "Users can insert own org invoice lines"
  ON invoice_lines FOR INSERT
  WITH CHECK (
    invoice_id IN (
      SELECT id FROM invoices
      WHERE organization_id IN (SELECT get_user_org_ids())
    )
  );

CREATE POLICY "Users can update own org invoice lines"
  ON invoice_lines FOR UPDATE
  USING (
    invoice_id IN (
      SELECT id FROM invoices
      WHERE organization_id IN (SELECT get_user_org_ids())
    )
  );

CREATE POLICY "Users can delete own org invoice lines"
  ON invoice_lines FOR DELETE
  USING (
    invoice_id IN (
      SELECT id FROM invoices
      WHERE organization_id IN (SELECT get_user_org_ids())
    )
  );

-- 1. invoices テーブルに pdf_file_path カラム追加
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS pdf_file_path TEXT;

-- 2. invoices Storage バケット作成（private）
INSERT INTO storage.buckets (id, name, public)
VALUES ('invoices', 'invoices', false)
ON CONFLICT (id) DO NOTHING;

-- 3. Storage RLS: 同一組織のユーザーのみアップロード可能
CREATE POLICY "org_members_can_upload_invoices"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'invoices'
  AND (storage.foldername(name))[1] IN (
    SELECT om.organization_id::text
    FROM organization_members om
    WHERE om.user_id = auth.uid()
  )
);

-- 4. Storage RLS: 同一組織のユーザーのみ読み取り可能
CREATE POLICY "org_members_can_read_invoices"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'invoices'
  AND (storage.foldername(name))[1] IN (
    SELECT om.organization_id::text
    FROM organization_members om
    WHERE om.user_id = auth.uid()
  )
);

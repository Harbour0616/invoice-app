-- 既存の sites テーブルに新しいカラムを追加
ALTER TABLE sites
  ADD COLUMN IF NOT EXISTS client_name text,
  ADD COLUMN IF NOT EXISTS contract_amount integer,
  ADD COLUMN IF NOT EXISTS start_date date,
  ADD COLUMN IF NOT EXISTS end_date date;

-- 既存のステータス値を日本語に変更
UPDATE sites SET status = '進行中' WHERE status = 'active';
UPDATE sites SET status = '完了' WHERE status = 'completed';

-- デフォルト値を変更
ALTER TABLE sites ALTER COLUMN status SET DEFAULT '進行中';

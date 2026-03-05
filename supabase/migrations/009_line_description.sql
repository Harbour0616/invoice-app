-- 明細行に品名・摘要カラムを追加
ALTER TABLE invoice_lines ADD COLUMN description TEXT;

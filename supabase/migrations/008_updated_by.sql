-- Add updated_by column to track who last modified the invoice
ALTER TABLE invoices ADD COLUMN updated_by UUID REFERENCES auth.users(id);

-- Backfill existing rows: set updated_by to created_by
UPDATE invoices SET updated_by = created_by WHERE updated_by IS NULL;

-- Add sync_table column to activities
ALTER TABLE activities
ADD COLUMN IF NOT EXISTS sync_table text;

-- Migration to add process_number (sequential ID) to process_instances
ALTER TABLE process_instances ADD COLUMN IF NOT EXISTS process_number SERIAL;

-- Update existing records if any (SERIAL already handles this for existing rows in some Postgres versions, but let's be safe)
-- Sequence will be created automatically by the SERIAL type.

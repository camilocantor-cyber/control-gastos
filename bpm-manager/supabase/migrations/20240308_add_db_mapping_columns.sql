-- Add db mapping columns to activity_field_definitions
ALTER TABLE activity_field_definitions
ADD COLUMN IF NOT EXISTS db_column text,
ADD COLUMN IF NOT EXISTS db_type text,
ADD COLUMN IF NOT EXISTS db_nullable boolean,
ADD COLUMN IF NOT EXISTS db_is_primary_key boolean;

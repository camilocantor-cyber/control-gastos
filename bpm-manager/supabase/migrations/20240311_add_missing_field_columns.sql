-- Migration to add missing columns to activity_field_definitions
-- This ensures features like 'attachment_accept' and 'is_global_header' can be saved

ALTER TABLE activity_field_definitions ADD COLUMN IF NOT EXISTS attachment_accept text;
ALTER TABLE activity_field_definitions ADD COLUMN IF NOT EXISTS is_global_header boolean DEFAULT false;

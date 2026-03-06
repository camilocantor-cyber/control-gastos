-- Migration to add readonly and description columns to field definitions
ALTER TABLE activity_field_definitions ADD COLUMN IF NOT EXISTS is_readonly boolean DEFAULT false;
ALTER TABLE activity_field_definitions ADD COLUMN IF NOT EXISTS description text;

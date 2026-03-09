-- Migration to add rows column to activity_field_definitions
ALTER TABLE activity_field_definitions ADD COLUMN IF NOT EXISTS rows integer DEFAULT 4;

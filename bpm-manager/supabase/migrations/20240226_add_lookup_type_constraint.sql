-- First, identify the constraint. Supabase/PostgreSQL error mentioned: "activity_field_definitions_type_check"
-- We drop the constraint, and add a new one including the 'lookup' type.

ALTER TABLE activity_field_definitions DROP CONSTRAINT IF EXISTS activity_field_definitions_type_check;

ALTER TABLE activity_field_definitions ADD CONSTRAINT activity_field_definitions_type_check 
CHECK (type IN ('text', 'textarea', 'number', 'currency', 'date', 'select', 'boolean', 'email', 'phone', 'provider', 'lookup'));

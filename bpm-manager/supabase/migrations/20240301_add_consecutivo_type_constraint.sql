-- Migration to add 'consecutivo' type to activity_field_definitions
-- This drops the existing check constraint and adds it again including 'consecutivo'

ALTER TABLE activity_field_definitions DROP CONSTRAINT IF EXISTS activity_field_definitions_type_check;

ALTER TABLE activity_field_definitions ADD CONSTRAINT activity_field_definitions_type_check 
CHECK (type IN ('text', 'textarea', 'number', 'currency', 'date', 'select', 'boolean', 'email', 'phone', 'provider', 'grid', 'lookup', 'location', 'consecutivo'));

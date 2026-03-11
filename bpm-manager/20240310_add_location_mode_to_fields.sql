-- Add location_mode column to activity_field_definitions
ALTER TABLE activity_field_definitions 
ADD COLUMN IF NOT EXISTS location_mode TEXT DEFAULT 'coordinates';

-- Update existing records to have a default value
UPDATE activity_field_definitions 
SET location_mode = 'coordinates' 
WHERE location_mode IS NULL;

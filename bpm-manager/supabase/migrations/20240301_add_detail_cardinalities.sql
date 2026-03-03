-- Migration: Add detail_cardinalities to activities
ALTER TABLE activities ADD COLUMN IF NOT EXISTS detail_cardinalities jsonb DEFAULT '{}'::jsonb;

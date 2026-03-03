-- Migration to support Multi-Actions on Activities
ALTER TABLE activities ADD COLUMN IF NOT EXISTS actions jsonb DEFAULT '[]'::jsonb;
COMMENT ON COLUMN activities.actions IS 'Array of automated actions to execute when reaching this activity.';

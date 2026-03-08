-- Migration to ensure all necessary columns exist for Activities and Fields
-- This prevents data loss when saving the workflow model

-- 1. Enum Updates
DO $$ BEGIN
    ALTER TYPE process_status ADD VALUE 'waiting_subprocess';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Columns for activity_field_definitions
ALTER TABLE activity_field_definitions ADD COLUMN IF NOT EXISTS max_length integer;
ALTER TABLE activity_field_definitions ADD COLUMN IF NOT EXISTS default_value text;
ALTER TABLE activity_field_definitions ADD COLUMN IF NOT EXISTS consecutive_mask text;
ALTER TABLE activity_field_definitions ADD COLUMN IF NOT EXISTS grid_columns jsonb;
ALTER TABLE activity_field_definitions ADD COLUMN IF NOT EXISTS source_activity_id uuid REFERENCES activities(id) ON DELETE SET NULL;
ALTER TABLE activity_field_definitions ADD COLUMN IF NOT EXISTS source_field_name text;
ALTER TABLE activity_field_definitions ADD COLUMN IF NOT EXISTS order_index integer;
ALTER TABLE activity_field_definitions ADD COLUMN IF NOT EXISTS regex_pattern text;
ALTER TABLE activity_field_definitions ADD COLUMN IF NOT EXISTS visibility_condition text;
ALTER TABLE activity_field_definitions ADD COLUMN IF NOT EXISTS parent_accordion_id uuid;

-- 2. Columns for activities
ALTER TABLE activities ADD COLUMN IF NOT EXISTS assignment_type text DEFAULT 'manual';
ALTER TABLE activities ADD COLUMN IF NOT EXISTS assignment_strategy text DEFAULT 'manual';
ALTER TABLE activities ADD COLUMN IF NOT EXISTS assigned_user_id uuid REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS assigned_department_id uuid; -- Assuming departments might be handled differently
ALTER TABLE activities ADD COLUMN IF NOT EXISTS assigned_position_id uuid;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS actions jsonb DEFAULT '[]'::jsonb;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS subprocess_config jsonb DEFAULT NULL;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS wait_config jsonb DEFAULT NULL;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS associated_details uuid[] DEFAULT '{}';
ALTER TABLE activities ADD COLUMN IF NOT EXISTS detail_cardinalities jsonb DEFAULT '{}'::jsonb;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS form_columns integer DEFAULT 1;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS due_date_hours integer;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS sla_alert_hours integer;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS enable_supervisor_alerts boolean DEFAULT false;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS is_public boolean DEFAULT false;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS width integer;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS height integer;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS x_pos integer;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS y_pos integer;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS folder_completion_rule text DEFAULT 'none';
ALTER TABLE activities ADD COLUMN IF NOT EXISTS folder_completion_ids uuid[] DEFAULT '{}';
ALTER TABLE activities ADD COLUMN IF NOT EXISTS require_save_before_folders boolean DEFAULT false;

-- 1. Create consecutive_values table for named sequences
CREATE TABLE IF NOT EXISTS consecutive_values (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    sequence_id TEXT NOT NULL,
    current_value INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(organization_id, sequence_id)
);

-- Enable RLS
ALTER TABLE consecutive_values ENABLE ROW LEVEL SECURITY;

-- Simple RLS policies (adjust if needed based on existing patterns)
CREATE POLICY "Users can view their organization's sequences" 
ON consecutive_values FOR SELECT 
USING (organization_id IN (SELECT (user_metadata->>'organization_id')::uuid FROM auth.users() WHERE id = auth.uid()));

CREATE POLICY "Users can update their organization's sequences" 
ON consecutive_values FOR ALL 
USING (organization_id IN (SELECT (user_metadata->>'organization_id')::uuid FROM auth.users() WHERE id = auth.uid()));

-- 2. Create RPC for atomic increment
CREATE OR REPLACE FUNCTION get_next_consecutive_value(org_id UUID, seq_id TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    next_val INTEGER;
BEGIN
    INSERT INTO consecutive_values (organization_id, sequence_id, current_value)
    VALUES (org_id, seq_id, 1)
    ON CONFLICT (organization_id, sequence_id)
    DO UPDATE SET 
        current_value = consecutive_values.current_value + 1,
        updated_at = now()
    RETURNING current_value INTO next_val;
    
    RETURN next_val;
END;
$$;

-- 3. Add consecutive_id column to field definitions
ALTER TABLE activity_field_definitions ADD COLUMN IF NOT EXISTS consecutive_id TEXT;

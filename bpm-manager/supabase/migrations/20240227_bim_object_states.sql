-- Create a table to store BIM object states for process instances
CREATE TABLE IF NOT EXISTS process_bim_states (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    process_id UUID NOT NULL REFERENCES process_instances(id) ON DELETE CASCADE,
    express_id BIGINT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('completed', 'processing', 'delayed', 'pending')),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id),
    
    -- Ensure only one state per object per process induction
    UNIQUE(process_id, express_id)
);

-- Add RLS (Row Level Security)
ALTER TABLE process_bim_states ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read BIM states"
    ON process_bim_states FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow authenticated users to insert/update BIM states"
    ON process_bim_states FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

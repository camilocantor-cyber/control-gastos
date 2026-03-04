-- 1. Create the workflow_templates table
CREATE TABLE IF NOT EXISTS workflow_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Add Row Level Security (RLS) to the table
ALTER TABLE workflow_templates ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies for the table
-- Select policy: users can see templates from their organization
CREATE POLICY "Users can view workflow templates from their organization"
    ON workflow_templates FOR SELECT
    USING (organization_id IN (
        SELECT profiles.organization_id 
        FROM profiles 
        WHERE profiles.id = auth.uid()
    ));

-- Insert policy: users can add templates to their organization
CREATE POLICY "Users can insert workflow templates to their organization"
    ON workflow_templates FOR INSERT
    WITH CHECK (organization_id IN (
        SELECT profiles.organization_id 
        FROM profiles 
        WHERE profiles.id = auth.uid()
    ));

-- Delete policy: users can delete templates from their organization
CREATE POLICY "Users can delete workflow templates from their organization"
    ON workflow_templates FOR DELETE
    USING (organization_id IN (
        SELECT profiles.organization_id 
        FROM profiles 
        WHERE profiles.id = auth.uid()
    ));

-- Update policy: users can update templates from their organization
CREATE POLICY "Users can update workflow templates from their organization"
    ON workflow_templates FOR UPDATE
    USING (organization_id IN (
        SELECT profiles.organization_id 
        FROM profiles 
        WHERE profiles.id = auth.uid()
    ));

-- 4. Create Storage Bucket for Workflow Templates
DO $$
BEGIN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('workflow-templates', 'workflow-templates', false)
    ON CONFLICT (id) DO NOTHING;
END $$;

-- 5. Storage RLS Policies for the bucket
-- Note: 'workflow-templates' bucket policies
CREATE POLICY "Authenticated users can upload workflow templates"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'workflow-templates');

CREATE POLICY "Authenticated users can view workflow templates"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (bucket_id = 'workflow-templates');

CREATE POLICY "Authenticated users can delete workflow templates"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (bucket_id = 'workflow-templates');

CREATE POLICY "Authenticated users can update workflow templates"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (bucket_id = 'workflow-templates');

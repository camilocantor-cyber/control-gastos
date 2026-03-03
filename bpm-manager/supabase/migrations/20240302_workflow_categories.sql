CREATE TABLE IF NOT EXISTS workflow_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT DEFAULT '#3b82f6',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(organization_id, name)
);

ALTER TABLE workflows ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES workflow_categories(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE workflow_categories ENABLE ROW LEVEL SECURITY;

-- Add RLS Policies
CREATE POLICY "Users can view categories in their organization"
    ON workflow_categories FOR SELECT
    USING (organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid()
    ));

CREATE POLICY "Admins can insert categories"
    ON workflow_categories FOR INSERT
    WITH CHECK (organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid() AND role = 'admin'
    ));

CREATE POLICY "Admins can update categories"
    ON workflow_categories FOR UPDATE
    USING (organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid() AND role = 'admin'
    ));

CREATE POLICY "Admins can delete categories"
    ON workflow_categories FOR DELETE
    USING (organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid() AND role = 'admin'
    ));

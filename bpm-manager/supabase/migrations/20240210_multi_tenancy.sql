-- 1. Create table `organizations`
CREATE TABLE organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  plan text NOT NULL CHECK (plan IN ('free', 'pro', 'enterprise')) DEFAULT 'free',
  created_at timestamptz DEFAULT now()
);

-- 2. Insert Default Organization "Mi Empresa" (this will house all existing data)
INSERT INTO organizations (id, name, plan)
VALUES (gen_random_uuid(), 'Mi Empresa', 'pro');

DO $$
DECLARE
  default_org_id uuid;
BEGIN
  -- Get the ID of the organization we just created
  SELECT id INTO default_org_id FROM organizations WHERE name = 'Mi Empresa' LIMIT 1;

  -- 3. Add `organization_id` to `profiles`
  -- Check if column exists to avoid errors on rerun
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'organization_id') THEN
    ALTER TABLE profiles ADD COLUMN organization_id uuid REFERENCES organizations(id);
    -- Migrate existing profiles
    UPDATE profiles SET organization_id = default_org_id WHERE organization_id IS NULL;
    -- Make it NOT NULL after migration
    ALTER TABLE profiles ALTER COLUMN organization_id SET NOT NULL;
  END IF;

  -- 4. Add `organization_id` to `workflows`
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'workflows' AND column_name = 'organization_id') THEN
    ALTER TABLE workflows ADD COLUMN organization_id uuid REFERENCES organizations(id);
    -- Migrate existing workflows
    UPDATE workflows SET organization_id = default_org_id WHERE organization_id IS NULL;
    ALTER TABLE workflows ALTER COLUMN organization_id SET NOT NULL;
  END IF;

  -- 5. Add `organization_id` to `process_instances`
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'process_instances' AND column_name = 'organization_id') THEN
    ALTER TABLE process_instances ADD COLUMN organization_id uuid REFERENCES organizations(id);
    -- Migrate existing instances
    UPDATE process_instances SET organization_id = default_org_id WHERE organization_id IS NULL;
    ALTER TABLE process_instances ALTER COLUMN organization_id SET NOT NULL;
  END IF;

  -- NOTE: `activities` and `transitions` belong to `workflows`, so they are implicitly scoped by organization via workflow_id.
  
END $$;

-- 6. Enable Row Level Security (RLS) on `organizations`
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own organization
CREATE POLICY "Users can view own organization" ON organizations
  FOR SELECT USING (
    id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

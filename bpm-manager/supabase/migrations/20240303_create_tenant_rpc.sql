-- RPC Function to create a new organization (Tenant) and assign the initial admin user
-- This runs with SECURITY DEFINER to bypass RLS on organizations

CREATE OR REPLACE FUNCTION create_new_tenant(
  new_tenant_name text,
  admin_user_id uuid
) RETURNS json
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_org_id uuid;
BEGIN
  -- 1. Create Organization
  INSERT INTO organizations (name, plan) 
  VALUES (new_tenant_name, 'pro') 
  RETURNING id INTO v_org_id;

  -- 2. Update Profile's organization_id
  UPDATE profiles 
  SET organization_id = v_org_id
  WHERE id = admin_user_id;

  -- 3. Add to organization_members as admin
  -- First check if it exists just in case
  IF NOT EXISTS (
    SELECT 1 FROM organization_members 
    WHERE organization_id = v_org_id AND user_id = admin_user_id
  ) THEN
    INSERT INTO organization_members (organization_id, user_id, role)
    VALUES (v_org_id, admin_user_id, 'admin');
  END IF;

  RETURN json_build_object('success', true, 'organization_id', v_org_id);
END;
$$;

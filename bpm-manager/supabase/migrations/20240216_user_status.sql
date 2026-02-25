-- Add status column to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS status text CHECK (status IN ('active', 'pending', 'suspended')) DEFAULT 'active';

-- Update existing profiles to active
UPDATE profiles SET status = 'active' WHERE status IS NULL;

-- Allow authenticated users to view all profiles (important for System Accounts view)
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Authenticated users can view all profiles" ON profiles;
CREATE POLICY "Authenticated users can view all profiles" ON profiles
  FOR SELECT TO authenticated USING (true);

-- Ensure organization_members has RLS and correct policies
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;

-- Temporary permissive policy for debugging: ANY authenticated user can view members
-- (We will restrict this later once we confirm it works)
DROP POLICY IF EXISTS "Users can view members of their own organization" ON organization_members;
DROP POLICY IF EXISTS "Admins can manage organization members" ON organization_members;
DROP POLICY IF EXISTS "Debug: view all members" ON organization_members;

CREATE POLICY "Debug: view all members" ON organization_members
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage organization members" ON organization_members
  FOR ALL TO authenticated USING (
    auth.uid() IN (
      SELECT user_id FROM organization_members om WHERE om.role = 'admin'
    )
  );

-- Policies for positions and employee_positions
ALTER TABLE positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_positions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public positions viewable" ON positions;
CREATE POLICY "Public positions viewable" ON positions
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Public employee_positions viewable" ON employee_positions;
CREATE POLICY "Public employee_positions viewable" ON employee_positions
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins can manage positions" ON positions;
CREATE POLICY "Admins can manage positions" ON positions
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM organization_members 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can manage employee_positions" ON employee_positions;
CREATE POLICY "Admins can manage employee_positions" ON employee_positions
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM organization_members 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

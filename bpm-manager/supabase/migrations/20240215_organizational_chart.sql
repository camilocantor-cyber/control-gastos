-- Organizational Chart System for BPM Manager
-- This migration creates the structure for company organizational charts

-- 1. Create departments table
CREATE TABLE IF NOT EXISTS departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  parent_department_id uuid REFERENCES departments(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(organization_id, name)
);

-- 2. Create positions table (job titles/roles within the organization)
CREATE TABLE IF NOT EXISTS positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  department_id uuid REFERENCES departments(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  level integer DEFAULT 1, -- Hierarchical level (1 = top, higher = lower in hierarchy)
  reports_to_position_id uuid REFERENCES positions(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(organization_id, department_id, title)
);

-- 3. Create employee_positions table (assigns users to positions)
CREATE TABLE IF NOT EXISTS employee_positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  position_id uuid NOT NULL REFERENCES positions(id) ON DELETE CASCADE,
  is_primary boolean DEFAULT true, -- User can have multiple positions, one is primary
  start_date date DEFAULT CURRENT_DATE,
  end_date date,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, position_id)
);

-- 4. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_departments_org ON departments(organization_id);
CREATE INDEX IF NOT EXISTS idx_departments_parent ON departments(parent_department_id);
CREATE INDEX IF NOT EXISTS idx_positions_org ON positions(organization_id);
CREATE INDEX IF NOT EXISTS idx_positions_dept ON positions(department_id);
CREATE INDEX IF NOT EXISTS idx_positions_reports_to ON positions(reports_to_position_id);
CREATE INDEX IF NOT EXISTS idx_employee_positions_user ON employee_positions(user_id);
CREATE INDEX IF NOT EXISTS idx_employee_positions_position ON employee_positions(position_id);

-- 5. Enable Row Level Security
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_positions ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies for departments
CREATE POLICY "Users can view departments in their organization" ON departments
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can insert departments" ON departments
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT om.organization_id 
      FROM organization_members om 
      WHERE om.user_id = auth.uid() AND om.role = 'admin'
    )
  );

CREATE POLICY "Admins can update departments" ON departments
  FOR UPDATE USING (
    organization_id IN (
      SELECT om.organization_id 
      FROM organization_members om 
      WHERE om.user_id = auth.uid() AND om.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete departments" ON departments
  FOR DELETE USING (
    organization_id IN (
      SELECT om.organization_id 
      FROM organization_members om 
      WHERE om.user_id = auth.uid() AND om.role = 'admin'
    )
  );

-- 7. RLS Policies for positions
CREATE POLICY "Users can view positions in their organization" ON positions
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can insert positions" ON positions
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT om.organization_id 
      FROM organization_members om 
      WHERE om.user_id = auth.uid() AND om.role = 'admin'
    )
  );

CREATE POLICY "Admins can update positions" ON positions
  FOR UPDATE USING (
    organization_id IN (
      SELECT om.organization_id 
      FROM organization_members om 
      WHERE om.user_id = auth.uid() AND om.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete positions" ON positions
  FOR DELETE USING (
    organization_id IN (
      SELECT om.organization_id 
      FROM organization_members om 
      WHERE om.user_id = auth.uid() AND om.role = 'admin'
    )
  );

-- 8. RLS Policies for employee_positions
CREATE POLICY "Users can view employee positions in their organization" ON employee_positions
  FOR SELECT USING (
    position_id IN (
      SELECT p.id FROM positions p
      INNER JOIN profiles prof ON prof.organization_id = p.organization_id
      WHERE prof.id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage employee positions" ON employee_positions
  FOR ALL USING (
    position_id IN (
      SELECT p.id FROM positions p
      INNER JOIN organization_members om ON om.organization_id = p.organization_id
      WHERE om.user_id = auth.uid() AND om.role = 'admin'
    )
  );

-- 9. Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 10. Create triggers for updated_at
CREATE TRIGGER update_departments_updated_at BEFORE UPDATE ON departments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_positions_updated_at BEFORE UPDATE ON positions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 11. Add assignment rules to activities (for workflow task assignment)
ALTER TABLE activities ADD COLUMN IF NOT EXISTS assignment_type text CHECK (assignment_type IN ('manual', 'position', 'department', 'specific_user'));
ALTER TABLE activities ADD COLUMN IF NOT EXISTS assigned_position_id uuid REFERENCES positions(id) ON DELETE SET NULL;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS assigned_department_id uuid REFERENCES departments(id) ON DELETE SET NULL;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS assigned_user_id uuid REFERENCES profiles(id) ON DELETE SET NULL;

-- 12. Create view for organizational hierarchy
CREATE OR REPLACE VIEW org_hierarchy AS
WITH RECURSIVE dept_hierarchy AS (
  -- Base case: top-level departments
  SELECT 
    id,
    organization_id,
    name,
    parent_department_id,
    1 as level,
    ARRAY[name] as path
  FROM departments
  WHERE parent_department_id IS NULL
  
  UNION ALL
  
  -- Recursive case: child departments
  SELECT 
    d.id,
    d.organization_id,
    d.name,
    d.parent_department_id,
    dh.level + 1,
    dh.path || d.name
  FROM departments d
  INNER JOIN dept_hierarchy dh ON d.parent_department_id = dh.id
)
SELECT * FROM dept_hierarchy;

-- Migration to update assignment_type check constraint to include 'creator'
ALTER TABLE activities DROP CONSTRAINT IF EXISTS activities_assignment_type_check;
ALTER TABLE activities ADD CONSTRAINT activities_assignment_type_check CHECK (assignment_type IN ('manual', 'position', 'department', 'specific_user', 'creator'));

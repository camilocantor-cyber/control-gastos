ALTER TABLE process_instances
ADD COLUMN IF NOT EXISTS workflow_sequence INTEGER;

-- Function and trigger to auto-increment workflow_sequence on new inserts
CREATE OR REPLACE FUNCTION set_workflow_sequence()
RETURNS TRIGGER AS $$
BEGIN
  -- Get the next sequence number for this specific workflow
  SELECT COALESCE(MAX(workflow_sequence), 0) + 1
  INTO NEW.workflow_sequence
  FROM process_instances
  WHERE workflow_id = NEW.workflow_id
  AND organization_id = NEW.organization_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_workflow_sequence ON process_instances;

CREATE TRIGGER trigger_set_workflow_sequence
BEFORE INSERT ON process_instances
FOR EACH ROW
EXECUTE FUNCTION set_workflow_sequence();

-- Update existing rows to have a logical sequence
UPDATE process_instances pi
SET workflow_sequence = (
    SELECT COUNT(*) 
    FROM process_instances pi2 
    WHERE pi2.workflow_id = pi.workflow_id 
    AND pi2.organization_id = pi.organization_id
    AND pi2.created_at <= pi.created_at
)
WHERE workflow_sequence IS NULL;

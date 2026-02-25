-- Migration for Advanced Reporting and Integration Monitoring

-- 1. View for Integration Errors
-- This view filters history records that indicate a failure in automated actions
CREATE OR REPLACE VIEW vw_integration_errors AS
SELECT 
    h.id,
    h.process_id,
    p.name as process_name,
    p.workflow_id,
    w.name as workflow_name,
    h.activity_id,
    a.name as activity_name,
    h.comment as error_message,
    h.created_at as failed_at,
    p.status as current_process_status
FROM process_history h
JOIN process_instances p ON h.process_id = p.id
JOIN workflows w ON p.workflow_id = w.id
JOIN activities a ON h.activity_id = a.id
WHERE h.action = 'commented' 
AND h.comment LIKE '❌ Error en Acción Automática%';

-- 2. View for Power BI / Reporting (Flattened Data)
-- This view provides process metadata and all custom fields as a JSONB object
-- Power BI can easily expand this JSON object into columns
CREATE OR REPLACE VIEW vw_process_reporting AS
WITH flattened_data AS (
    SELECT 
        process_id,
        jsonb_object_agg(field_name, value) as data_fields
    FROM process_data
    GROUP BY process_id
)
SELECT 
    p.id as instance_id,
    p.organization_id,
    p.workflow_id,
    w.name as workflow_name,
    p.name as process_name,
    p.process_number,
    p.status,
    p.current_activity_id,
    act.name as current_activity_name,
    p.created_at,
    p.created_by,
    prof.full_name as creator_name,
    d.data_fields
FROM process_instances p
JOIN workflows w ON p.workflow_id = w.id
LEFT JOIN activities act ON p.current_activity_id = act.id
LEFT JOIN profiles prof ON p.created_by = prof.id
LEFT JOIN flattened_data d ON p.id = d.process_id;

-- 3. Function to retry an action (Placeholder for future use)
-- This could be called from the UI to trigger a manual re-run
COMMENT ON VIEW vw_integration_errors IS 'Logs of failed automated actions for monitoring.';
COMMENT ON VIEW vw_process_reporting IS 'Flattened process data for easy consumption by BI tools like Power BI.';

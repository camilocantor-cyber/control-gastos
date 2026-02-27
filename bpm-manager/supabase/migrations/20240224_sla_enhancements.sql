-- Migration to support Advanced SLAs and Supervisor Alerts
ALTER TABLE activities ADD COLUMN IF NOT EXISTS sla_alert_hours numeric DEFAULT 4;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS enable_supervisor_alerts boolean DEFAULT false;

COMMENT ON COLUMN activities.sla_alert_hours IS 'Horas después de las cuales se envía una alerta si la tarea no se completa (e.g. 4)';
COMMENT ON COLUMN activities.enable_supervisor_alerts IS 'Si se activa, notifica automáticamente al supervisor del área según el organigrama';

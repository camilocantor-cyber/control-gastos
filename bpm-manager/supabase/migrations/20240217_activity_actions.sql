-- Migration to support Service Tasks (Webhooks/Microservices)
ALTER TABLE activities ADD COLUMN IF NOT EXISTS action_type text DEFAULT 'none' CHECK (action_type IN ('none', 'webhook', 'soap'));
ALTER TABLE activities ADD COLUMN IF NOT EXISTS action_config jsonb DEFAULT null;

-- Description of action_config structure:
-- {
--   "url": "https://api.example.com/v1/update",
--   "method": "POST",
--   "headers": {"Content-Type": "application/json", "Authorization": "Bearer ..."},
--   "body": "{\"process_id\": \"{{process_id}}\", \"monto\": \"{{monto_total}}\"}"
-- }

-- Migration to add new statuses to the process_status enum
-- Required for Sub-processes and Wait activities

-- 1. Add 'waiting' and 'waiting_subprocess' to the enum
-- In PostgreSQL, we can add values to an existing enum type using ALTER TYPE
-- Note: These commands cannot run inside a transaction block in some Postgres versions, 
-- but Supabase usually handles this or you can run them individually.

ALTER TYPE process_status ADD VALUE IF NOT EXISTS 'waiting';
ALTER TYPE process_status ADD VALUE IF NOT EXISTS 'waiting_subprocess';

-- 2. Ensure columns for sub-processes and waits exist
ALTER TABLE process_instances ADD COLUMN IF NOT EXISTS parent_process_id uuid REFERENCES process_instances(id);
ALTER TABLE process_instances ADD COLUMN IF NOT EXISTS waiting_subprocess_id uuid REFERENCES process_instances(id);
ALTER TABLE process_instances ADD COLUMN IF NOT EXISTS wait_until timestamptz;
ALTER TABLE process_instances ADD COLUMN IF NOT EXISTS wait_condition text;

-- 3. If for some reason it's a CHECK constraint instead of an ENUM:
-- (Uncomment and run if the ALTER TYPE fails)
-- ALTER TABLE process_instances DROP CONSTRAINT IF EXISTS process_instances_status_check;
-- ALTER TABLE process_instances ADD CONSTRAINT process_instances_status_check 
-- CHECK (status IN ('active', 'completed', 'cancelled', 'waiting', 'waiting_subprocess'));

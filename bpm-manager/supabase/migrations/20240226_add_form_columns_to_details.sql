-- Migration to add form_columns to workflow_details table for configurable subform layout
ALTER TABLE public.workflow_details
ADD COLUMN IF NOT EXISTS form_columns INTEGER DEFAULT 1;

COMMENT ON COLUMN public.workflow_details.form_columns IS 'Configuration for the layout columns of the detail form fields (e.g., 1, 2, 3, or 4 columns).';

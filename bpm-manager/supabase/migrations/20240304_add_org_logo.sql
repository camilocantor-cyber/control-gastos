-- Add logo_url to organizations table
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS logo_url text;

-- Create storage bucket for logos if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('logos', 'logos', true)
ON CONFLICT (id) DO NOTHING;

-- Policy to allow public access to logos
CREATE POLICY "Public Access" ON storage.objects
  FOR SELECT USING (bucket_id = 'logos');

-- Policy to allow authenticated users to upload logos
-- (Simplifying to allow any authenticated user for now, 
-- in production you might want to restrict to org admins)
CREATE POLICY "Auth Upload Logo" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'logos' AND auth.role() = 'authenticated');

CREATE POLICY "Auth Update Logo" ON storage.objects
  FOR UPDATE WITH CHECK (bucket_id = 'logos' AND auth.role() = 'authenticated');

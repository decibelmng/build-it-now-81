
ALTER TABLE public.home_contacts
  ADD COLUMN IF NOT EXISTS website_url TEXT,
  ADD COLUMN IF NOT EXISTS is_preferred BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS share_to_directory BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE public.maintenance_logs
  ADD COLUMN IF NOT EXISTS contact_name_snapshot TEXT;

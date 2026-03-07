
-- Add is_default column
ALTER TABLE public.contractor_access_links ADD COLUMN is_default BOOLEAN NOT NULL DEFAULT false;

-- Backfill: create default links for existing properties that don't have one
INSERT INTO public.contractor_access_links (property_id, user_id, is_default, is_active, expires_at, label)
SELECT p.id, p.user_id, true, true, null, null
FROM public.properties p
WHERE NOT EXISTS (
  SELECT 1 FROM public.contractor_access_links cal
  WHERE cal.property_id = p.id AND cal.is_default = true
);

-- Ensure only one default link per property
CREATE UNIQUE INDEX one_default_per_property ON public.contractor_access_links (property_id) WHERE is_default = true;

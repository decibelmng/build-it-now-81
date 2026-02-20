
-- Add optional contact_id to maintenance_logs to link vendor/contact who performed the work
ALTER TABLE public.maintenance_logs
ADD COLUMN contact_id uuid REFERENCES public.home_contacts(id) ON DELETE SET NULL;

-- Index for efficient lookups
CREATE INDEX idx_maintenance_logs_contact_id ON public.maintenance_logs(contact_id);

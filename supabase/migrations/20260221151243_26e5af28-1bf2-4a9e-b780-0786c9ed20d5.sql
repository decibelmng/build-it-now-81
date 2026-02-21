
-- Add scope column to maintenance_logs
ALTER TABLE public.maintenance_logs
  ADD COLUMN scope TEXT NOT NULL DEFAULT 'routine';

-- Add comment for clarity
COMMENT ON COLUMN public.maintenance_logs.scope IS 'routine, major_repair, or improvement';

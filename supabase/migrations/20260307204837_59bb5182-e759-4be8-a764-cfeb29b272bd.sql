
ALTER TABLE public.home_items
  ADD COLUMN last_updated_from_log_id uuid REFERENCES public.maintenance_logs(id) ON DELETE SET NULL,
  ADD COLUMN last_updated_at timestamp with time zone,
  ADD COLUMN data_completeness integer NOT NULL DEFAULT 0;
